import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops, users } from "@/db/schema";

const COOKIE_NAME = "bookslot_session";
const DEV_ONLY_SECRET = "dev-secret-change-in-production-min-32-chars!!";

let cachedSecret: Uint8Array | null = null;

// Resolved lazily so builds don't need the variable, but a production server
// without AUTH_SECRET refuses to sign or verify sessions instead of silently
// using a public fallback that would let anyone forge a login.
function getSecret() {
  if (cachedSecret) return cachedSecret;

  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  cachedSecret = new TextEncoder().encode(value || DEV_ONLY_SECRET);
  return cachedSecret;
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getUserShop(userId: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.userId, userId))
    .limit(1);
  return shop ?? null;
}

export async function requireUserShop(userId: string) {
  const shop = await getUserShop(userId);
  if (!shop) {
    throw new Error("NO_SHOP");
  }
  return shop;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}
