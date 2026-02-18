import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();

    if (!session) {
        const response = NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
        response.headers.set("Cache-Control", "private, no-cache");
        return response;
    }

    const response = NextResponse.json({
        success: true,
        user: session.user,
    });
    response.headers.set("Cache-Control", "private, max-age=300");
    return response;
}
