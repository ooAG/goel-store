import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 1. FETCH LIVE CHANNELS FOR ADMIN FEEDS
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          include: {
            ledger: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(orders);
  } catch (e) {
    return NextResponse.json({ error: "Orders load nahi ho paaye, thodi der baad try karein." }, { status: 500 });
  }
}

// 2. CHECKOUT ENGINE — SERVER-SIDE PRICE VERIFICATION + CREDIT LIMIT CHECKS
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, items: clientItems, paymentMode, name, address, clientCartTotal, clientDues, assignedQr } = body;

    if (!phone || !clientItems || clientItems.length === 0) {
      return NextResponse.json({ error: "Phone number aur items dono zaroori hain." }, { status: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findUnique({
        where: { phone: String(phone).trim() }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            phone: String(phone).trim(),
            name: name?.trim() || "Customer",
            address: address?.trim() || ""
          }
        });
      }

      if (Number(customer.dues) !== Number(clientDues)) {
        throw new Error("Aapka khata balance abhi update hua hai. Page refresh karein aur dobara try karein.");
      }

      let serverCartTotal = 0;
      const verifiedItemsPayload = [];

      for (const item of clientItems) {
        // Quantity validation — prevent negative, zero, or absurd values
        if (!item.quantity || item.quantity < 1 || item.quantity > 999 || !Number.isInteger(item.quantity)) {
          throw new Error("Item ki quantity galat hai. Sahi quantity daalein (1 se 999 tak).");
        }

        const dbProduct = await tx.product.findUnique({
          where: { id: item.id }
        });

        if (!dbProduct) {
          throw new Error("Kuch products ab available nahi hain. Page refresh karein.");
        }

        const exactItemCost = dbProduct.sellingPrice * item.quantity;
        serverCartTotal += exactItemCost;

        verifiedItemsPayload.push({
          productId: dbProduct.id,
          quantity: item.quantity,
          sellingPrice: dbProduct.sellingPrice,
          customName: dbProduct.name
        });
      }

      if (Number(serverCartTotal) !== Number(clientCartTotal)) {
        throw new Error("Kuch products ki keemat badal gayi hai. Page refresh karein taaki latest prices dikhen.");
      }

      const storeCredit = customer.dues > 0 ? Number(customer.dues) : 0;
      const currentDebt = customer.dues < 0 ? Math.abs(Number(customer.dues)) : 0;
      
      const calculatedEffectiveTotal = Math.max(0, serverCartTotal - storeCredit) + currentDebt;
      const creditUsedCalculated = Math.min(serverCartTotal, storeCredit);

      const finalResolvedMode = calculatedEffectiveTotal === 0 ? "STORE_CREDIT" : paymentMode;

      let finalTotalAmount = serverCartTotal;
      let finalAppliedBalance = 0;

      if (finalResolvedMode === "UDHAAR") {
          if (!customer.creditEnabled) {
            throw new Error("Aapke account par udhaar facility band hai. Dukan se contact karein.");
          }
          const allowedLimit = Number((customer as any).creditLimit || 0);
          const predictedNewDues = customer.dues - serverCartTotal;
          if (predictedNewDues < -allowedLimit) {
            throw new Error(`Udhaar limit exceeded! Aapki max limit ₹${allowedLimit} hai. Current dues: ₹${Math.abs(customer.dues)}, Naya order: ₹${serverCartTotal}. Pehle purana hisab clear karein.`);
          }
          finalTotalAmount = serverCartTotal;
          finalAppliedBalance = 0;
          await tx.customer.update({
              where: { id: customer.id },
              data: { dues: { decrement: serverCartTotal } }
          });
      } else {
          finalTotalAmount = serverCartTotal - creditUsedCalculated;
          finalAppliedBalance = creditUsedCalculated;
          if (creditUsedCalculated > 0) {
              await tx.customer.update({
                  where: { id: customer.id },
                  data: { dues: { decrement: creditUsedCalculated } }
              });
          }
      }

      // Order ID: MMMDD + 5 random chars = ~60M combinations per day (collision-safe)
      const createdOrder = await tx.order.create({
        data: {
          id: `${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][new Date().getMonth()]}${String(new Date().getDate()).padStart(2, '0')}${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          customerId: customer.id,
          originalAmount: serverCartTotal,
          totalAmount: finalTotalAmount,
          appliedBalance: finalAppliedBalance,
          paymentMode: finalResolvedMode,
          paymentStatus: (finalResolvedMode === "PAID" || finalResolvedMode === "STORE_CREDIT") ? "PAID" : "PENDING",
          orderStatus: "NEW",
          assignedQr: assignedQr || "CASH",
          items: {
            create: verifiedItemsPayload.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              sellingPrice: i.sellingPrice,
              customName: i.customName
            }))
          }
        }
      });

      if (finalResolvedMode === "UDHAAR" || finalResolvedMode === "STORE_CREDIT" || creditUsedCalculated > 0) {
        let postLogReason = `📒 Order #${createdOrder.id} — ₹${serverCartTotal} udhaar khate mein joda gaya`;
        if (finalResolvedMode === "STORE_CREDIT") {
          postLogReason = `🎁 Order #${createdOrder.id} — ₹${creditUsedCalculated} Store Credit se pay hua`;
        } else if (creditUsedCalculated > 0 && finalResolvedMode !== "UDHAAR") {
          postLogReason = `🎁 Order #${createdOrder.id} — ₹${creditUsedCalculated} Store Credit use hua`;
        }

        await tx.ledger.create({
          data: {
            customerId: customer.id,
            amount: finalResolvedMode === "UDHAAR" ? -serverCartTotal : -creditUsedCalculated,
            reason: postLogReason
          }
        });
      }

      return NextResponse.json({ success: true, id: createdOrder.id });
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Order place karne mein dikkat aayi. Dobara try karein.",
      refreshNeeded: true 
    }, { status: 409 });
  }
}

// 3. MASTER PATCH HANDLER — ORDER ACTIONS
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, amountReceived, items, assignedQr } = body;

    if (!id) return NextResponse.json({ error: "Order ID missing hai." }, { status: 400 });

    return await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: String(id).trim() },
        include: { customer: true }
      });

      if (!currentOrder) throw new Error("Ye order nahi mila. Galat Order ID hai.");

      // ─── MARK_FULFILLED: Dispatch order ───
      if (action === "MARK_FULFILLED") {
        const updated = await tx.order.update({
          where: { id: currentOrder.id },
          data: { orderStatus: "FULFILLED" }
        });
        return NextResponse.json({ success: true, order: updated });
      }

      // ─── SETTLE_PAYMENT: Record payment with exact math ───
      if (action === "SETTLE_PAYMENT") {
        // Idempotency check — prevent double-settlement
        if (currentOrder.paymentStatus === "PAID" && currentOrder.orderStatus === "DELIVERED") {
          throw new Error("Is order ka payment pehle se ho chuka hai. Dobara settle nahi ho sakta.");
        }

        const received = Number(amountReceived);
        if (isNaN(received) || received < 0) throw new Error("Payment amount galat hai. Sahi amount daalein.");

        const diff = received - currentOrder.totalAmount;

        const updatedOrder = await tx.order.update({
          where: { id: currentOrder.id },
          data: { paymentStatus: "PAID", orderStatus: "DELIVERED" }
        });

        if (currentOrder.paymentMode === "UDHAAR") {
             await tx.customer.update({
                 where: { id: currentOrder.customerId },
                 data: { dues: { increment: received } }
             });
             await tx.ledger.create({
                data: { customerId: currentOrder.customerId, amount: received, reason: `💰 Order #${currentOrder.id} — Udhaar ka ₹${received} payment mila` }
             });
        } else {
             if (diff !== 0) {
                 await tx.customer.update({
                     where: { id: currentOrder.customerId },
                     data: { dues: { increment: diff } }
                 });
             }
             let formattedSettleReason = `💰 Order #${currentOrder.id} — ₹${received} payment mila (bill ₹${currentOrder.totalAmount})`;
             if (diff < 0) {
                 formattedSettleReason = `⚠️ Order #${currentOrder.id} — Kam payment: ₹${received} mile, ₹${Math.abs(diff)} udhaar mein gaya`;
             } else if (diff > 0) {
                 formattedSettleReason = `🎁 Order #${currentOrder.id} — Extra payment: ₹${received} mile, ₹${diff} advance credit mein joda`;
             }

             await tx.ledger.create({
                 data: {
                     customerId: currentOrder.customerId,
                     amount: received,
                     reason: formattedSettleReason
                 }
             });
        }

        return NextResponse.json({ success: true, order: updatedOrder });
      }

      // ─── MARK_DUES: Convert pending order to udhaar ───
      if (action === "MARK_DUES") {
        const duesChange = (currentOrder.appliedBalance || 0) - (currentOrder.originalAmount ?? 0);
        await tx.customer.update({
            where: { id: currentOrder.customerId },
            data: { dues: { increment: duesChange } }
        });
        const updatedOrder = await tx.order.update({
            where: { id: currentOrder.id },
            data: { 
               paymentStatus: "PENDING", 
               paymentMode: "UDHAAR",
               totalAmount: (currentOrder.originalAmount ?? 0),
               appliedBalance: 0
            }
        });

        await tx.ledger.create({
          data: {
            customerId: currentOrder.customerId,
            amount: duesChange,
            reason: `📒 Order #${currentOrder.id} — ₹${currentOrder.originalAmount} udhaar khate mein likha gaya`
          }
        });

        return NextResponse.json({ success: true, order: updatedOrder });
      }

      // ─── REVISE_ORDER: Update items + recalculate with ledger ───
      if (action === "REVISE_ORDER") {
        await tx.orderItem.deleteMany({ where: { orderId: currentOrder.id } });
        
        let newTotal = 0;
        if (items && items.length > 0) {
          for (const it of items) {
            // Validate revised quantities
            if (!it.quantity || it.quantity < 1 || it.quantity > 999) {
              throw new Error("Revised item ki quantity galat hai.");
            }
            newTotal += Number(it.sellingPrice) * Number(it.quantity);
            await tx.orderItem.create({
              data: {
                orderId: currentOrder.id,
                productId: it.productId,
                quantity: Number(it.quantity),
                sellingPrice: Number(it.sellingPrice),
                customName: it.customName
              }
            });
          }
        }

        let newTotalAmount = currentOrder.totalAmount;
        let newAppliedBalance = currentOrder.appliedBalance || 0;

        if (currentOrder.paymentStatus !== "PENDING" || currentOrder.paymentMode === "UDHAAR" || currentOrder.paymentMode === "STORE_CREDIT") {
            const delta = (currentOrder.originalAmount ?? 0) - newTotal;
            if (delta !== 0) {
                await tx.customer.update({
                    where: { id: currentOrder.customerId },
                    data: { dues: { increment: delta } }
                });
                // Ledger entry for revision adjustment
                await tx.ledger.create({
                  data: {
                    customerId: currentOrder.customerId,
                    amount: delta,
                    reason: `📝 Order #${currentOrder.id} revise hua — ₹${Math.abs(delta)} ${delta > 0 ? 'credit mein wapas aaya' : 'extra udhaar mein gaya'}`
                  }
                });
            }
            if (currentOrder.paymentMode === "UDHAAR") {
                newTotalAmount = newTotal;
            }
        } else {
            if (newTotal < (currentOrder.appliedBalance || 0)) {
                const refund = (currentOrder.appliedBalance || 0) - newTotal;
                newAppliedBalance = newTotal;
                await tx.customer.update({
                    where: { id: currentOrder.customerId },
                    data: { dues: { increment: refund } }
                });
                // Ledger entry for credit refund on revision
                await tx.ledger.create({
                  data: {
                    customerId: currentOrder.customerId,
                    amount: refund,
                    reason: `🎁 Order #${currentOrder.id} revise hua — ₹${refund} extra credit wapas diya gaya`
                  }
                });
            }
            newTotalAmount = newTotal - newAppliedBalance;
        }

        const updatedOrder = await tx.order.update({
            where: { id: currentOrder.id },
            data: {
                originalAmount: newTotal,
                totalAmount: newTotalAmount,
                appliedBalance: newAppliedBalance,
                orderStatus: newTotal === 0 ? "CANCELLED" : currentOrder.orderStatus
            }
        });

        return NextResponse.json({ success: true, order: updatedOrder });
      }

      if (action === "CONVERT_TO_COD") {
        const updatedOrder = await tx.order.update({
          where: { id: currentOrder.id },
          data: { paymentMode: "CASH" }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
      }

      // ─── CANCEL_ORDER: Refund credit/udhaar ───
      if (action === "CANCEL_ORDER") {
        if (currentOrder.orderStatus === "CANCELLED") return NextResponse.json({ success: true });

        let refundAmount = 0;
        if (currentOrder.paymentStatus !== "PENDING" || currentOrder.paymentMode === "UDHAAR" || currentOrder.paymentMode === "STORE_CREDIT") {
            refundAmount = (currentOrder.originalAmount ?? 0);
        } else {
            refundAmount = currentOrder.appliedBalance || 0;
        }

        if (refundAmount > 0) {
            await tx.customer.update({
                where: { id: currentOrder.customerId },
                data: { dues: { increment: refundAmount } }
            });

            await tx.ledger.create({
              data: {
                customerId: currentOrder.customerId,
                amount: refundAmount,
                reason: `❌ Order #${currentOrder.id} cancel hua — ₹${refundAmount} khata balance mein wapas aaya`
              }
            });
        }

        const updatedOrder = await tx.order.update({
          where: { id: currentOrder.id },
          data: { orderStatus: "CANCELLED" }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
      }

      if (action === "CHANGE_QR") {
        const updatedOrder = await tx.order.update({
          where: { id: currentOrder.id },
          data: { assignedQr: String(assignedQr).trim() }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
      }

      throw new Error("Galat action. Ye kaam nahi ho sakta.");
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Order update karne mein dikkat aayi." }, { status: 400 });
  }
}
