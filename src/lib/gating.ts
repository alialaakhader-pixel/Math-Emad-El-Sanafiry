import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { attempts, exams, lectureUnlocks, lectures, users } from "@/db/schema";

export const PASS_PERCENT = 50;

export async function ensureStudentCode(userId: string): Promise<string> {
  const [row] = await db.select({ code: users.studentCode }).from(users).where(eq(users.id, userId)).limit(1);
  if (row?.code) return row.code;
  for (let i = 0; i < 12; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      const done = await db.update(users).set({ studentCode: code }).where(eq(users.id, userId)).returning({ c: users.studentCode });
      if (done[0]?.c) return done[0].c;
    } catch { /* duplicate code, retry */ }
  }
  throw new Error("تعذر إنشاء رقم الطالب.");
}

export type LockInfo = { locked: boolean; reason?: "homework" | "below"; homeworkId?: string; homeworkTitle?: string; bestPercent?: number | null };

/** For one student: lock state of each lecture (published, same grade, ordered). A lecture is locked until the previous lecture's homework is passed (>= 50%) or staff unlocked it. */
export async function lockMap(userId: string, gradeId: string | null): Promise<Record<string, LockInfo>> {
  const out: Record<string, LockInfo> = {};
  if (!gradeId) return out;
  const list = await db.select({ id: lectures.id, homeworkId: lectures.homeworkId }).from(lectures)
    .where(and(eq(lectures.gradeId, gradeId), eq(lectures.published, true))).orderBy(lectures.sortOrder, lectures.createdAt);
  const hwIds = list.map(l => l.homeworkId).filter((x): x is string => !!x);
  const [unlocks, tries, hws] = await Promise.all([
    db.select({ lectureId: lectureUnlocks.lectureId }).from(lectureUnlocks).where(eq(lectureUnlocks.userId, userId)),
    hwIds.length ? db.select({ examId: attempts.examId, score: attempts.score, maxScore: attempts.maxScore }).from(attempts).where(and(eq(attempts.userId, userId), inArray(attempts.examId, hwIds), eq(attempts.status, "graded"), isNotNull(attempts.score))) : Promise.resolve([]),
    hwIds.length ? db.select({ id: exams.id, title: exams.title }).from(exams).where(inArray(exams.id, hwIds)) : Promise.resolve([]),
  ]);
  const unlocked = new Set(unlocks.map(u => u.lectureId));
  const best = new Map<string, number>();
  for (const t of tries) { const pct = t.maxScore ? Math.round((Number(t.score) / t.maxScore) * 100) : 0; best.set(t.examId, Math.max(best.get(t.examId) ?? -1, pct)); }
  const title = new Map(hws.map(h => [h.id, h.title]));
  list.forEach((lec, i) => {
    const prev = i > 0 ? list[i - 1] : null;
    if (!prev?.homeworkId || unlocked.has(lec.id)) { out[lec.id] = { locked: false }; return; }
    const pct = best.get(prev.homeworkId);
    if (pct !== undefined && pct >= PASS_PERCENT) out[lec.id] = { locked: false, bestPercent: pct };
    else out[lec.id] = { locked: true, reason: pct === undefined ? "homework" : "below", homeworkId: prev.homeworkId, homeworkTitle: title.get(prev.homeworkId), bestPercent: pct ?? null };
  });
  return out;
}
