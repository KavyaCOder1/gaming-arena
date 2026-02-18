import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    const response = NextResponse.json({ success: true });
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
}
