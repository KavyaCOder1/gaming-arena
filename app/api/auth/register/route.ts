import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { encrypt } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = registerSchema.parse(body);

        const existingUser = await db.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Username already taken" },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const user = await db.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        // Create session
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const session = await encrypt({
            user: { id: user.id, username: user.username },
            expires,
        });

        const response = NextResponse.json(
            {
                success: true,
                user: { id: user.id, username: user.username },
            },
            { status: 201 }
        );

        response.headers.set("Cache-Control", "private, no-cache");
        response.cookies.set("session", session, {
            expires,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
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
