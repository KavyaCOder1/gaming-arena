import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth";
import { decrypt } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    const session = request.cookies.get("session")?.value;
    const { pathname } = request.nextUrl;

    // Protected routes
    const protectedRoutes = ["/dashboard", "/games"];
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

    if (isProtected) {
        if (!session) {
            return NextResponse.redirect(new URL("/auth/login", request.url));
        }

        try {
            await decrypt(session);
        } catch (error) {
            return NextResponse.redirect(new URL("/auth/login", request.url));
        }
    }

    // Update session expiry if valid
    return await updateSession(request);
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
