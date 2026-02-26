import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/hash";
import { encrypt } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = loginSchema.parse(body);
        const normalizedUsername = username.toLowerCase();

        const user = await db.user.findUnique({
            where: { username: normalizedUsername },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Update last login
        await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Create session
        const token = await encrypt({ user: { id: user.id, username: user.username } });
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username },
        });

        response.cookies.set("session", token, {
            expires,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        });

        return response;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
