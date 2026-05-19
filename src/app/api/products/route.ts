import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 1. LIVE FETCH (GET)
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" }
    });
    
    return new NextResponse(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache"
      }
    });
  } catch (e) {
    return NextResponse.json({ error: "Products load nahi ho paaye." }, { status: 500 });
  }
}

// 2. SHARED MUTATION CORE (Handles Add and Edit dynamically)
async function handleInventoryMutation(req: Request) {
  try {
    const body = await req.json();
    const { id, name, category, mrp, sellingPrice, unit, image, isActive } = body;

    // A. IF ID EXISTS -> UPDATE EXISTING ITEM (EDIT FLOW)
    if (id) {
      const updatedProduct = await prisma.product.update({
        where: { id: String(id).trim() },
        data: {
          ...(name !== undefined && { name: String(name).trim() }),
          ...(category !== undefined && { category: String(category).trim() }),
          ...(mrp !== undefined && { mrp: Number(mrp) }),
          ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
          ...(unit !== undefined && { unit: unit ? String(unit).trim() : null }),
          ...(image !== undefined && { image: image ? String(image).trim() : null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) })
        }
      });
      
      return NextResponse.json({ success: true, product: updatedProduct });
    } 
    
    // B. IF NO ID -> CREATE NEW ITEM (ADD FLOW)
    else {
      const newProduct = await prisma.product.create({
        data: {
          name: String(name || "New Product").trim(),
          category: String(category || "General").trim(),
          mrp: Number(mrp || 0),
          sellingPrice: Number(sellingPrice || 0),
          unit: unit ? String(unit).trim() : null,
          image: image ? String(image).trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true
        }
      });
      
      return NextResponse.json({ success: true, product: newProduct });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Product save nahi ho paaya." }, { status: 500 });
  }
}

// 3. SECURE INTERCEPTOR METHODS
export async function POST(req: Request) { return handleInventoryMutation(req); }
export async function PUT(req: Request) { return handleInventoryMutation(req); }
export async function PATCH(req: Request) { return handleInventoryMutation(req); }

// 4. HARD DELETE HANDLER
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Product ID missing hai." }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: String(id).trim() }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Product delete nahi ho paaya." }, { status: 500 });
  }
}
