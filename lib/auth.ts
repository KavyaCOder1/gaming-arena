import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ── Lazy key getter — reads env at call-time, never at module load ──────────
function getKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set");
    }
    return new TextEncoder().encode(secret);
}

// ── Session payload shape ───────────────────────────────────────────────────
export interface SessionPayload {
    user: { id: string; username: string };
}

// ── Encrypt: create a signed JWT (7-day expiry set via jose, not in payload) ─
export async function encrypt(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ user: payload.user })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getKey());
}

// ── Decrypt: verify and return the typed payload ────────────────────────────
export async function decrypt(token: string): Promise<SessionPayload> {
    const { payload } = await jwtVerify(token, getKey(), {
        algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
}

// ── getSession: read cookie and decrypt ─────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) return null;
    try {
        return await decrypt(session.value);
    } catch {
        return null;
    }
}

// ── updateSession: slide the expiry window on each request ──────────────────
export async function updateSession(request: NextRequest): Promise<NextResponse | undefined> {
    const token = request.cookies.get("session")?.value;
    if (!token) return undefined;

    let session: SessionPayload;
    try {
        session = await decrypt(token);
    } catch {
        return undefined; // invalid / expired token — let the request continue without refreshing
    }

    // Re-issue a fresh token with only the user data (no stale exp/iat from old payload)
    const newToken = await encrypt({ user: session.user });
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = NextResponse.next();
    res.cookies.set("session", newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        expires,
    });
    return res;
}
