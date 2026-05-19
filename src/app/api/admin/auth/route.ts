import { NextResponse } from "next/server";

async function generateWebSHA256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputPassword = body.password || "";

    const masterPassword = process.env.ADMIN_PASSWORD || "jeetu@31";

    if (inputPassword !== masterPassword) {
      return NextResponse.json({ error: "Galat password. Sahi password daalein." }, { status: 401 });
    }

    // Generate session token matching middleware
    const sessionToken = await generateWebSHA256(masterPassword + "-goel-store-admin-session");

    const response = NextResponse.json({ success: true });
    
    response.cookies.set("admin_token", sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Login karne mein dikkat aayi. Dobara try karein." }, { status: 500 });
  }
}
