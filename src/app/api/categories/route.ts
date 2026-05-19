import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 🔥 PURE GLOBAL CATEGORY RENAME ENGINE
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { oldCategory, newCategory } = body;

    if (!oldCategory || !newCategory || oldCategory.trim() === "" || newCategory.trim() === "") {
      return NextResponse.json({ error: "Purani aur nayi dono category ka naam dena zaroori hai." }, { status: 400 });
    }

    const srcName = oldCategory.trim();
    const destName = newCategory.trim();

    if (srcName === destName) return NextResponse.json({ success: true });

    // Direct structural updates across main products data rows rows
    await prisma.product.updateMany({
      where: { category: srcName },
      data: { category: destName }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Category rename nahi ho paayi." }, { status: 500 });
  }
}
