import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "Customer ID missing hai." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
        where: { id: String(id).trim() },
        include: { 
          orders: {
            where: { NOT: { orderStatus: "CANCELLED" } },
            orderBy: { createdAt: "desc" },
            include: { items: { include: { product: true } } }
          },
          ledger: { 
            orderBy: { createdAt: "desc" } 
          } 
        }
      });

    if (!customer) {
      return NextResponse.json({ error: "Customer nahi mila." }, { status: 404 });
    }

    let upiVpa = ""; 
    let storeName = "Goel Store";
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'details.json');
      if (fs.existsSync(filePath)) {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (config?.upiAccounts?.length > 0) {
          const activeAccount = config.upiAccounts[Math.floor(Math.random() * config.upiAccounts.length)];
          upiVpa = activeAccount.vpa || "";
          storeName = activeAccount.name || storeName;
        }
      }
    } catch(e) {}

    if (!upiVpa) {
      upiVpa = process.env.NEXT_PUBLIC_DEFAULT_UPI || "";
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 850]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = 800;
    const drawText = (text: string, x: number, size: number, isBold = false, color = rgb(0.1, 0.1, 0.1)) => {
        const safeText = String(text || "").replace(/[^\x20-\x7E]/g, ""); 
        page.drawText(safeText, { x, y, size, font: isBold ? boldFont : font, color });
    };

    // --- REPORT HEADER ---
    drawText("GOEL STORE", 50, 26, true, rgb(0.02, 0.59, 0.41));
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB') + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    drawText(`Ledger as on ${formattedDate}`, 380, 10, false, rgb(0.4, 0.4, 0.4));
    
    y -= 40;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1.5, color: rgb(0.02, 0.59, 0.41) });
    
    // --- CUSTOMER INFORMATION GRID ---
    y -= 30;
    drawText("CUSTOMER DETAILS", 50, 11, true, rgb(0.4, 0.4, 0.4));
    y -= 20;
    
    const finalDisplayName = (!customer.name || customer.name === "TEMP" || customer.name === "TEMP_USER") ? "Registered Customer" : customer.name;
    drawText(`Customer Name: ${finalDisplayName}`, 50, 12, true);
    
    const allCustomers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    const idx = allCustomers.findIndex(c => c.id === customer.id);
    const customId = `C${String(idx + 1).padStart(4, '0')}`;
    
    drawText(`Cust ID: ${customId}`, 350, 12, true);
    
    y -= 18;
    drawText(`Phone Number: +91 ${customer.phone}`, 50, 11);
    drawText(`Address: ${customer.address || "N/A"}`, 350, 11);
    
    y -= 30;
    
    // --- SUMMARY BADGE ---
    const currentDues = customer.dues || 0;
    
    let badgeBgColor = rgb(0.95, 0.96, 0.98); 
    let badgeBorderColor = rgb(0.9, 0.9, 0.9);
    let textDisplayColor = rgb(0.2, 0.3, 0.4);
    let totalDuesText = `NO DUES: Rs 0`;

    if (currentDues < 0) {
      badgeBgColor = rgb(0.99, 0.95, 0.95); 
      badgeBorderColor = rgb(1, 0.9, 0.9);
      textDisplayColor = rgb(0.88, 0.11, 0.28);
      totalDuesText = `TO PAY (UDHAAR): Rs ${Math.abs(currentDues)}`;
    } else if (currentDues > 0) {
      badgeBgColor = rgb(0.95, 0.99, 0.96); 
      badgeBorderColor = rgb(0.9, 1, 0.9);
      textDisplayColor = rgb(0.02, 0.59, 0.41);
      totalDuesText = `STORE CREDIT: Rs ${Math.abs(currentDues)}`;
    }

    page.drawRectangle({
      x: 50,
      y: y - 15,
      width: 500,
      height: 40,
      color: badgeBgColor,
      borderColor: badgeBorderColor,
      borderWidth: 1,
    });
    
    y -= 2;
    drawText("ACCOUNT STATEMENT NET DUES:", 65, 10, true, rgb(0.4, 0.4, 0.4));
    page.drawText(totalDuesText, { x: 340, y, size: 14, font: boldFont, color: textDisplayColor });
    
    // --- TABLE STRUCTURE ---
    y -= 50;
    page.drawRectangle({ x: 50, y: y - 5, width: 500, height: 25, color: rgb(0.95, 0.96, 0.98) });
    drawText("Date & Time", 55, 10, true, rgb(0.3, 0.4, 0.5));
    drawText("Order ID / Particulars", 155, 10, true, rgb(0.3, 0.4, 0.5));
    drawText("Items Purchased", 255, 10, true, rgb(0.3, 0.4, 0.5));
    drawText("Status", 425, 10, true, rgb(0.3, 0.4, 0.5));
    drawText("Amount", 510, 10, true, rgb(0.3, 0.4, 0.5));
    
    y -= 20;

    const combinedTimeline: any[] = [];

    if (customer.orders) {
      customer.orders.forEach((o: any) => {
        let orderLabelStatus = "PAYMENT PENDING";
        
        if (o.paymentStatus === "PAID") {
          orderLabelStatus = "PAID";
        } else if (o.paymentStatus === "DUES_ADDED" || o.paymentMode === "UDHAAR") {
          orderLabelStatus = "UDHAAR SALE";
        }

        let displayAmount = o.totalAmount;
        if (o.assignedQr && o.assignedQr.includes("VPA_CLAIMED:")) {
          const parts = o.assignedQr.split("VPA_CLAIMED:");
          const claimedVal = parseFloat(parts[1]?.trim());
          if (!isNaN(claimedVal)) {
            displayAmount = claimedVal;
          }
        }

        const baseItemsList = o.items.map((i: any) => `${i.product?.name || i.customName || 'Item'} (x${i.quantity})`).join(", ");
        const enhancedDescriptionStr = `${baseItemsList} (Order Total: Rs ${o.totalAmount})`;

        const rawIdStr = o.id.startsWith('#') ? o.id : `#${o.id}`;
        const cleanDisplayId = rawIdStr.length > 13 ? rawIdStr.substring(0, 13) + "..." : rawIdStr;

        combinedTimeline.push({
          date: new Date(o.createdAt),
          id: cleanDisplayId,
          particulars: "Store Order",
          details: enhancedDescriptionStr,
          status: orderLabelStatus,
          isOrder: true,
          amount: displayAmount
        });
      });
    }

    if (customer.ledger) {
      customer.ledger.forEach((l: any) => {
        if (l.reason.includes("Order #")) return;

        combinedTimeline.push({
          date: new Date(l.createdAt),
          id: "MANUAL",
          particulars: l.amount > 0 ? "Payment Received" : "Udhaar Given",
          details: l.reason || "Manual Khata Adjustment",
          status: l.amount > 0 ? "PAYMENT RECEIVED" : "MANUAL KHATA",
          isOrder: false,
          amount: Math.abs(l.amount)
        });
      });
    }

    combinedTimeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    if (combinedTimeline.length === 0) {
      drawText("No recorded transactions found for this period.", 160, 11, false, rgb(0.5, 0.5, 0.5));
    }

    for (const row of combinedTimeline) {
      if (y < 260) break; 
      
      page.drawLine({ start: { x: 50, y: y + 12 }, end: { x: 550, y: y + 12 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });

      const rowDate = row.date.toLocaleDateString('en-GB') + " " + row.date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      page.drawText(rowDate, { x: 55, y, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });
      
      page.drawText(row.particulars === "Store Order" ? row.id : row.particulars, { x: 155, y, size: 9.5, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      
      const wrapText = (str: string, maxChars: number) => {
        const words = str.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
          if ((currentLine + word).length > maxChars) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          } else {
            currentLine += word + ' ';
          }
        });
        if (currentLine) lines.push(currentLine.trim());
        return lines;
      };

      const wrappedLines = wrapText(row.details, 26);
      let localY = y;
      
      wrappedLines.forEach((lineStr, lineIdx) => {
         page.drawText(lineStr, { x: 255, y: localY, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
         if (lineIdx < wrappedLines.length - 1) {
            localY -= 12;
          }
      });
      
      let statusColor = rgb(0.88, 0.11, 0.28); 
      if (row.status === "PAID" || row.status === "PAYMENT RECEIVED") {
        statusColor = rgb(0.02, 0.59, 0.41); 
      } else if (row.status === "UDHAAR SALE" || row.status === "MANUAL KHATA") {
        statusColor = rgb(0.85, 0.45, 0.0); 
      }
      
      page.drawText(row.status, { x: 425, y, size: 7.5, font: boldFont, color: statusColor });
      
      const prefix = (row.status === "PAYMENT RECEIVED") ? "-" : "";
      page.drawText(`${prefix}Rs ${row.amount}`, { x: 510, y, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      
      const rowHeightCost = Math.max(26, wrappedLines.length * 12 + 6);
      y -= rowHeightCost;
    }

    if (currentDues < 0 && upiVpa) {
      y = 160; 
      page.drawRectangle({ x: 50, y: y - 110, width: 500, height: 125, color: rgb(244/255, 245/255, 247/255) });

      const upiLink = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(storeName)}&am=${Math.abs(currentDues)}&cu=INR`;
      
      try {
         const qrPngBuffer = await QRCode.toBuffer(upiLink, { type: 'png', width: 200, margin: 1 });
         const qrImage = await pdfDoc.embedPng(qrPngBuffer);
         page.drawImage(qrImage, { x: 70, y: y - 100, width: 105, height: 105 });
      } catch(e) {}

      page.drawText("PAY NOW TO CLEAR DUES", { x: 195, y: y - 25, size: 14, font: boldFont, color: rgb(0.02, 0.59, 0.41) });
      page.drawText(`Scan this custom QR using GPay, PhonePe, Paytm or any UPI App`, { x: 195, y: y - 45, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`Net Outstanding Amount: Rs ${Math.abs(currentDues)}`, { x: 195, y: y - 68, size: 11, font: boldFont, color: rgb(0.88, 0.11, 0.28) });
      page.drawText(`Merchant UPI ID: ${upiVpa} (${storeName})`, { x: 195, y: y - 88, size: 8.5, font, color: rgb(0.5, 0.5, 0.5) });
    }

    y = 35;
    page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 550, y: y + 10 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    drawText("Thank you for your business! For queries or verifications, contact support.", 100, 8, false, rgb(0.5, 0.5, 0.5));

    const pdfBytes = await pdfDoc.save();
    
    // 🔥 FIXED: Calculated continuous local hours-minutes-seconds digits layer strings 🔥
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStampStr = `${hours}${minutes}${seconds}`;

    const cleanCustName = customer.name ? customer.name.replace(/\s+/g, '_') : "Customer";

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            // 🔥 FIXED: Injected dynamic time stamp inside attachment name token variables safely 🔥
            "Content-Disposition": `attachment; filename="Khata_Ledger_${cleanCustName}_${timeStampStr}.pdf"`,
            "Cache-Control": "no-store, max-age=0, must-revalidate"
        }
    });

  } catch (e) {
    return NextResponse.json({ error: "PDF banana mein dikkat aayi. Dobara try karein." }, { status: 500 });
  }
}
