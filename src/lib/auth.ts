import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "sanafyry_session";
const SESSION_TTL_DAYS = 30;

/* ── password hashing (scrypt, no external dependency) ── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/* ── session handling ── */

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: "teacher" | "student";
  gradeId: number | null;
};

function deviceLabelFrom(ua: string | null): string {
  if (!ua) return "جهاز غير معروف";
  const s = ua.toLowerCase();
  const os = s.includes("android")
    ? "Android"
    : s.includes("iphone") || s.includes("ipad")
      ? "iOS"
      : s.includes("mac")
        ? "macOS"
        : s.includes("win")
          ? "Windows"
          : s.includes("linux")
            ? "Linux"
            : "نظام غير معروف";
  const browser = s.includes("edg")
    ? "Edge"
    : s.includes("chrome")
      ? "Chrome"
      : s.includes("firefox")
        ? "Firefox"
        : s.includes("safari")
          ? "Safari"
          : "متصفح";
  return `${browser} · ${os}`;
}

export async function createSession(userId: string): Promise<void> {
  const headerStore = await headers();
  const ua = headerStore.get("user-agent");
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    userAgent: ua,
    deviceLabel: deviceLabelFrom(ua),
    ipAddress: ip,
    lastSeenAt: new Date(),
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, sha256(token)));
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await db
    .update(sessions)
      .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      gradeId: users.gradeId,
      isActive: users.isActive,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), isNull(sessions.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;

  void db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.tokenHash, sha256(token)))
    .catch(() => undefined);

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    gradeId: row.gradeId,
  };
}

export async function requireUser(role?: "teacher" | "student"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("يجب تسجيل الدخول أولاً", 401);
  if (role && user.role !== role) throw new AuthError("لا تملك صلاحية الوصول إلى هذا المورد", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* ── audit trail ── */

export async function logActivity(
  userId: string | null,
  action: string,
  meta?: Record<string, unknown> | null
): Promise<void> {
  await db
    .insert(activityLog)
    .values({ userId, action, meta: meta ?? null })
    .catch(() => undefined);
}

/** Strong, human readable activation code: SAN-XXXX-XXXX-XXXX */
export function generateActivationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join("");
  return `SAN-${block()}-${block()}-${block()}`;
}
