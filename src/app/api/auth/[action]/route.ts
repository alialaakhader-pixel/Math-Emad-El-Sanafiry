import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminLogs, grades, passwordResets, sessions, users } from "@/db/schema";
import { allowAttempt, createSession, digest, emailPattern, endSession, getCurrentUser, hashPassword, jsonError, makeToken, sameOrigin, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
const safeText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  if (Number(request.headers.get("content-length") || 0) > 12000) return jsonError("الطلب كبير جداً.", 413);
  const { action } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("بيانات الطلب غير صالحة."); }
  const email = safeText(body.email, 320).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  try {
    if (action === "register") {
      if (!await allowAttempt(`register:${ip}`, 10, 60 * 60 * 1000)) return jsonError("يرجى المحاولة لاحقاً.", 429);
      const name = safeText(body.name, 120);
      if (!emailPattern.test(email) || name.length < 2 || name.length > 120 || password.length < 10 || password.length > 200) return jsonError("تحقق من الاسم والبريد وكلمة المرور (10 أحرف على الأقل).");
      const gradeId = safeText(body.gradeId, 36) || null;
      if (gradeId && !(await db.select({ id: grades.id }).from(grades).where(and(eq(grades.id, gradeId), eq(grades.published, true))).limit(1))[0]) return jsonError("الصف المختار غير متاح.");
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) return jsonError("هذا البريد مستخدم بالفعل.", 409);
      const [user] = await db.insert(users).values({ email, name, passwordHash: await hashPassword(password), gradeId }).returning({ id: users.id });
      await createSession(user.id, request.headers.get("user-agent"));
      return Response.json({ ok: true, redirect: "/dashboard" });
    }
    if (action === "login") {
      if (!await allowAttempt(`login:${ip}:${email}`, 8)) return jsonError("محاولات كثيرة. يرجى الانتظار قليلاً.", 429);
      if (!emailPattern.test(email) || !password) return jsonError("أدخل البريد الإلكتروني وكلمة المرور.");
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !await verifyPassword(password, user.passwordHash)) return jsonError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401);
      await createSession(user.id, request.headers.get("user-agent"));
      return Response.json({ ok: true, redirect: user.role === "teacher" ? "/admin" : "/dashboard" });
    }
    if (action === "logout") {
      await endSession();
      return Response.json({ ok: true, redirect: "/" });
    }
    if (action === "change-password") {
      const current = await getCurrentUser();
      if (!current) return jsonError("يرجى تسجيل الدخول.", 401);
      if (password.length < 10 || password.length > 200) return jsonError("كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل.");
      const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, current.id)).limit(1);
      if (account.passwordHash && !await verifyPassword(safeText(body.oldPassword, 200), account.passwordHash)) return jsonError("كلمة المرور الحالية غير صحيحة.", 401);
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, current.id));
      await db.delete(sessions).where(eq(sessions.userId, current.id));
      await createSession(current.id, request.headers.get("user-agent"));
      if (current.role === "teacher") await db.insert(adminLogs).values({ actorId: current.id, action: "change_password" });
      return Response.json({ ok: true, message: "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى." });
    }
    if (action === "recover") {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return jsonError("استعادة كلمة المرور غير متاحة حالياً. يرجى التواصل مع إدارة المنصة.", 503);
      if (!emailPattern.test(email)) return jsonError("أدخل بريداً إلكترونياً صحيحاً.");
      if (!await allowAttempt(`recover:${ip}:${email}`, 4, 60 * 60 * 1000)) return jsonError("يرجى المحاولة لاحقاً.", 429);
      const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (account) {
        const token = makeToken();
        await db.insert(passwordResets).values({ tokenHash: digest(token), userId: account.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
        const link = `${process.env.APP_URL || new URL(request.url).origin}/auth?mode=reset&token=${encodeURIComponent(token)}`;
        const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [email], subject: "استعادة كلمة المرور | منصة مستر عماد السنافيري", text: `لاستعادة كلمة المرور افتح الرابط التالي خلال 30 دقيقة:\n${link}\nإذا لم تطلب هذا التغيير فتجاهل الرسالة.` }) });
        if (!sent.ok) return jsonError("تعذر إرسال الرسالة الآن. حاول لاحقاً.", 503);
      }
      return Response.json({ ok: true, message: "إذا كان البريد مسجلاً، ستصلك رسالة الاستعادة." });
    }
    if (action === "reset") {
      const token = safeText(body.token, 100);
      if (!token || password.length < 10 || password.length > 200) return jsonError("الرابط أو كلمة المرور غير صالحين.");
      const [record] = await db.update(passwordResets).set({ usedAt: new Date() }).where(and(eq(passwordResets.tokenHash, digest(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()))).returning({ userId: passwordResets.userId });
      if (!record) return jsonError("انتهت صلاحية رابط الاستعادة أو استُخدم مسبقاً.");
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, record.userId));
      await db.delete(sessions).where(eq(sessions.userId, record.userId));
      return Response.json({ ok: true, message: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.", redirect: "/auth?mode=login" });
    }
    if (action === "bootstrap") {
      const secret = process.env.TEACHER_SETUP_SECRET;
      const supplied = request.headers.get("x-setup-secret") || "";
      if (!secret || secret.length < 20 || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return jsonError("غير مصرح.", 403);
      if (!emailPattern.test(email) || safeText(body.name, 120).length < 2 || password.length < 12) return jsonError("يلزم اسم وبريد وكلمة مرور لا تقل عن 12 حرفاً.");
      const existingTeacher = await db.select({ id: users.id }).from(users).where(eq(users.role, "teacher")).limit(1);
      if (existingTeacher.length) return jsonError("تم إعداد حساب المدرس بالفعل.", 409);
      const [teacher] = await db.insert(users).values({ email, name: safeText(body.name, 120), role: "teacher", passwordHash: await hashPassword(password) }).returning({ id: users.id });
      await db.insert(adminLogs).values({ actorId: teacher.id, action: "bootstrap_teacher" });
      return Response.json({ ok: true, message: "تم إنشاء حساب المدرس. احذف مفتاح الإعداد من البيئة بعد ذلك." });
    }
    return jsonError("المسار غير موجود.", 404);
  } catch (error) {
    console.error("Auth request failed", error);
    return jsonError("تعذر إتمام العملية. حاول مرة أخرى.", 500);
  }
}

export async function GET(request: NextRequest, context: Context) {
  const { action } = await context.params;
  const base = process.env.APP_URL || new URL(request.url).origin;
  if (action === "google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL("/auth?error=google_unavailable", base));
    const state = makeToken();
    const verifier = makeToken();
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const jar = await cookies();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 600, path: "/" };
    jar.set("emad_oauth_state", state, options);
    jar.set("emad_oauth_verifier", verifier, options);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: `${base}/api/auth/google-callback`, response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
    return NextResponse.redirect(url);
  }
  if (action === "google-callback") {
    const jar = await cookies();
    const state = jar.get("emad_oauth_state")?.value;
    const verifier = jar.get("emad_oauth_verifier")?.value;
    jar.delete("emad_oauth_state"); jar.delete("emad_oauth_verifier");
    if (!state || !verifier || state !== request.nextUrl.searchParams.get("state") || !request.nextUrl.searchParams.get("code") || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL("/auth?error=google_failed", base));
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: request.nextUrl.searchParams.get("code")!, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: `${base}/api/auth/google-callback`, grant_type: "authorization_code", code_verifier: verifier }) });
      if (!response.ok) throw new Error("Google token exchange failed");
      const token = await response.json();
      const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
      if (!infoResponse.ok) throw new Error("Google userinfo failed");
      const info = await infoResponse.json();
      if (!info.email_verified || !emailPattern.test(info.email) || !info.sub) throw new Error("Google email not verified");
      const email = String(info.email).toLowerCase();
      let [account] = await db.select().from(users).where(eq(users.googleId, String(info.sub))).limit(1);
      if (!account) [account] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (account?.role === "teacher" && !account.googleId) throw new Error("Teacher Google linking requires explicit setup");
      if (account) {
        if (!account.googleId) await db.update(users).set({ googleId: String(info.sub) }).where(eq(users.id, account.id));
      } else {
        [account] = await db.insert(users).values({ email, name: safeText(info.name, 120) || email.split("@")[0], googleId: String(info.sub) }).returning();
      }
      await createSession(account.id, request.headers.get("user-agent"));
      return NextResponse.redirect(new URL(account.role === "teacher" ? "/admin" : "/dashboard", base));
    } catch (error) {
      console.error("Google OAuth failed", error);
      return NextResponse.redirect(new URL("/auth?error=google_failed", base));
    }
  }
  return jsonError("المسار غير موجود.", 404);
}
