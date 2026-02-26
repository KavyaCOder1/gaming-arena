import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { encrypt } from "@/lib/auth";
import { generateUserId } from "@/lib/game-utils";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = registerSchema.parse(body);
    const normalizedUsername = username.toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const id = await generateUserId();

    // Create user + UserLevel (rank=ROOKIE, xp=0) in one transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { id, username: normalizedUsername, password: hashedPassword },
      });
      await tx.userLevel.create({
        data: { userId: newUser.id, xp: 0, rank: "ROOKIE" },
      });
      return newUser;
    });

    const token = await encrypt({ user: { id: user.id, username: user.username } });
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const response = NextResponse.json(
      { success: true, user: { id: user.id, username: user.username } },
      { status: 201 }
    );
    response.cookies.set("session", token, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
