import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const normalizedInput = (username || "").trim().toLowerCase();
    const userWithoutDomain = normalizedInput.split("@")[0];
    
    const isCorrectUser = userWithoutDomain === "serkangunacti";
    const isCorrectPass = password === "Trabzon61!";

    if (isCorrectUser && isCorrectPass) {
      const response = NextResponse.json({ success: true });
      
      // Set HTTP-Only, Secure cookie from Server Side
      response.cookies.set("uptexx_auth", "true", {
        path: "/",
        maxAge: 60 * 60, // 1 hour
        httpOnly: false, // Middleware needs to read it
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json({ success: false, error: "Hatalı bilgiler" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
