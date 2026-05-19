import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'asc' }
    });
    
    const ledgers = await prisma.ledger.findMany({ orderBy: { createdAt: 'desc' } });

    let mapped = customers.map((c, i) => ({
       ...c,
       customId: `C${String(i + 1).padStart(4, '0')}`,
       ledgers: ledgers.filter(l => l.customerId === c.id)
    }));

    mapped.sort((a, b) => Math.abs(b.dues) - Math.abs(a.dues));
    return NextResponse.json(mapped);
  } catch(e) { return NextResponse.json({error: "Customers load nahi ho paaye."}, {status:500}); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, amount, type, reason } = body;
    const finalAmount = type === "CREDIT" ? Math.abs(amount) : -Math.abs(amount);

    await prisma.customer.update({
      where: { id: customerId },
      data: { dues: { increment: finalAmount } }
    });

    await prisma.ledger.create({
      data: { customerId, amount: finalAmount, reason: reason || "Manual Khata Adjustment" }
    });
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({error: "Khata entry save nahi ho paayi. Dobara try karein."}, {status:500}); }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { customerId, creditEnabled, creditLimit } = body;
    await prisma.customer.update({
      where: { id: customerId },
      data: { creditEnabled, creditLimit: parseFloat(creditLimit) || 0 }
    });
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({error: "Settings update nahi ho paayi."}, {status:500}); }
}
