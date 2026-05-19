import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });

    const logs = await prisma.ledger.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}
