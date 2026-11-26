import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, grades, lectureUnlocks, lectures, notifications, users } from "@/db/schema";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { lockMap } from "@/lib/gating";

export const dynamic = "force-dynamic";
const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const codeOk = (v: unknown): v is string => typeof v === "string" && /^\d{4,12}$/.test(v.trim());

async function requireTeam() {
  const user = await getCurrentUser();
  return user && (user.role === "teacher" || user.role === "staff") ? user : null;
}

/** GET ?q=<student code | name | email> -> matching students; ?code=<id> -> that student with lecture lock states. */
export async function GET(request: Request) {
  const user = await requireTeam();
  if (!user) return jsonError("غير مصرح.", 403);
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  try {
    if (code) {
      if (!codeOk(code)) return jsonError("رقم الطالب غير صالح.");
      const [s] = await db.select({ id: users.id, name: users.name, email: users.email, studentCode: users.studentCode, gradeId: users.gradeId }).from(users).where(and(eq(users.studentCode, code), eq(users.role, "student"))).limit(1);
      if (!s) return jsonError("لا يوجد طالب بهذا الرقم.", 404);
      const [locks, gl] = await Promise.all([
        lockMap(s.id, s.gradeId),
        s.gradeId ? db.select({ id: lectures.id, title: lectures.title }).from(lectures).where(and(eq(lectures.gradeId, s.gradeId), eq(lectures.published, true))).orderBy(lectures.sortOrder, lectures.createdAt) : Promise.resolve([]),
      ]);
      const [grade] = s.gradeId ? await db.select({ title: grades.title }).from(grades).where(eq(grades.id, s.gradeId)).limit(1) : [];
      return Response.json({ student: { name: s.name, email: s.email, studentCode: s.studentCode, grade: grade?.title || null }, lectures: gl.map(l => ({ id: l.id, title: l.title, locked: !!locks[l.id]?.locked, reason: locks[l.id]?.reason || null, best: locks[l.id]?.bestPercent ?? null })) });
    }
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);
    const rows = await db.select({ name: users.name, email: users.email, studentCode: users.studentCode }).from(users)
      .where(and(eq(users.role, "student"), q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.studentCode, `%${q}%`)) : undefined))
      .orderBy(desc(users.createdAt)).limit(40);
    return Response.json({ students: rows });
  } catch (error) { console.error("Team load failed", error); return jsonError("تعذر التحميل.", 500); }
}

/** POST { code, lectureId } -> unlock that lecture for the student. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await requireTeam();
  if (!user) return jsonError("غير مصرح.", 403);
  try {
    const b = await request.json() as { code?: unknown; lectureId?: unknown };
    if (!codeOk(b.code) || !idOk(b.lectureId)) return jsonError("اكتب رقم الطالب واختر المحاضرة.");
    const [s] = await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.studentCode, (b.code as string).trim()), eq(users.role, "student"))).limit(1);
    if (!s) return jsonError("لا يوجد طالب بهذا الرقم.", 404);
    const [lec] = await db.select({ id: lectures.id, title: lectures.title }).from(lectures).where(eq(lectures.id, b.lectureId as string)).limit(1);
    if (!lec) return jsonError("المحاضرة غير موجودة.", 404);
    await db.insert(lectureUnlocks).values({ userId: s.id, lectureId: lec.id, grantedBy: user.id }).onConflictDoNothing();
    await db.insert(notifications).values({ userId: s.id, title: "تم فتح محاضرة لك", body: `فتح فريق المدرس محاضرة «${lec.title}» لك.` });
    await db.insert(adminLogs).values({ actorId: user.id, action: "unlock_lecture", details: `${s.name} (${(b.code as string).trim()}) ← ${lec.title}`.slice(0, 500) });
    return Response.json({ ok: true, message: `تم فتح «${lec.title}» للطالب ${s.name}.` });
  } catch (error) { console.error("Unlock failed", error); return jsonError("تعذر فتح المحاضرة.", 500); }
}
