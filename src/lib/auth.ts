import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts, sessions, subscriptions, users } from "@/db/schema";

const scrypt = promisify(scryptCallback);
const COOKIE = "emad_session";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const makeToken = () => randomBytes(32).toString("base64url");
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || hash.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function endSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token)));
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, gradeId: users.gradeId, tokenHash: sessions.tokenHash })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return rows[0] ?? null;
}
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function canAccessGrade(user: CurrentUser, gradeId: string) {
  if (user.role === "teacher") return true;
  const rows = await db.select({ id: subscriptions.id }).from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.gradeId, gradeId), gt(subscriptions.endsAt, new Date()))).limit(1);
  return rows.length > 0;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function allowAttempt(rawKey: string, max: number, windowMs = 15 * 60 * 1000) {
  const key = digest(rawKey);
  const now = new Date();
  const rows = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).limit(1);
  if (!rows[0]) {
    await db.insert(authAttempts).values({ key, attempts: 1, windowStartedAt: now }).onConflictDoNothing();
    return true;
  }
  if (now.getTime() - rows[0].windowStartedAt.getTime() > windowMs) {
    await db.update(authAttempts).set({ attempts: 1, windowStartedAt: now }).where(eq(authAttempts.key, key));
    return true;
  }
  if (rows[0].attempts >= max) return false;
  await db.update(authAttempts).set({ attempts: sql`${authAttempts.attempts} + 1` }).where(eq(authAttempts.key, key));
  return true;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
