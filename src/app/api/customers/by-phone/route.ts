import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.length !== 10) {
      return NextResponse.json({ error: "Sahi 10-digit phone number daalein." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: { items: { include: { product: true } } }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Is number se koi customer nahi mila." }, { status: 404 });
    }

    // Force strict no-cache control headers in HTTP response layer
    return new NextResponse(JSON.stringify(customer), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (e) {
    return NextResponse.json({ error: "Customer data load nahi ho paaya." }, { status: 500 });
  }
}
