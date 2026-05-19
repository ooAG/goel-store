import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.phone || !body.name || !body.address) {
       return NextResponse.json({ error: "Naam, phone aur address teenon zaroori hain." }, { status: 400 });
    }

    // Changed from update to upsert to fix the sync error for new customers
    const updatedCustomer = await prisma.customer.upsert({
       where: { phone: body.phone },
       update: { name: body.name, address: body.address },
       create: { phone: body.phone, name: body.name, address: body.address, dues: 0 }
    });

    return NextResponse.json(updatedCustomer);
  } catch(e) {
    return NextResponse.json({ error: "Profile update nahi ho paayi. Dobara try karein." }, { status: 500 });
  }
}
