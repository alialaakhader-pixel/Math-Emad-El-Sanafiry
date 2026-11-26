import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  const u = await getCurrentUser();
  if (!u) return Response.json({ user: null });
  const [r] = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, u.id)).limit(1);
  return Response.json({ user: { id: u.id, name: u.name, role: u.role, hasAvatar: !!r?.avatar } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const u = await getCurrentUser(); if (!u) return jsonError("سجّل الدخول أولاً.", 401);
  if (Number(request.headers.get("content-length") || 0) > 40000) return jsonError("الطلب كبير جداً.", 413);
  const b = await request.json().catch(() => ({})) as { avatar?: unknown };
  const a = typeof b.avatar === "string" ? b.avatar : "";
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(a) || a.length > 28000) return jsonError("الصورة غير صالحة أو كبيرة.");
  await db.update(users).set({ avatar: a }).where(eq(users.id, u.id));
  return Response.json({ ok: true, message: "تم حفظ الصورة." });
}
