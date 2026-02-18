import { hash, compare } from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 12);
}

export async function verifyPassword(
    plain: string,
    hashed: string
): Promise<boolean> {
    return await compare(plain, hashed);
}
