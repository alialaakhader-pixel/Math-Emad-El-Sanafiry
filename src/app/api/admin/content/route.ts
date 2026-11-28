import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { adminLogs, exams, grades, lectures, questions } from "@/db/schema";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { parseBulk } from "@/lib/practice-parse";

export const dynamic = "force-dynamic";
const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const txt = (v: unknown, max = 500) => typeof v === "string" ? v.trim().slice(0, max) : "";
const num = (v: unknown, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : d));
async function teacher() { const u = await getCurrentUser(); return u && u.role === "teacher" ? u : null; }
async function gradeOk(id: unknown) { return idOk(id) && !!(await db.select({ id: grades.id }).from(grades).where(eq(grades.id, id)).limit(1))[0]; }
async function log(actorId: string, action: string, details: string) { await db.insert(adminLogs).values({ actorId, action, details: details.slice(0, 500) }); }

// Topics available in the practice bank for a grade (grade-specific plus general questions).
export async function GET(request: Request) {
  if (!await teacher()) return jsonError("غير مصرح.", 403);
  const gradeId = new URL(request.url).searchParams.get("gradeId");
  if (!idOk(gradeId)) return jsonError("اختر الصف.");
  const { rows } = await pool.query("select topic, count(*)::int n from practice_questions where grade_id is null or grade_id=$1 group by topic order by topic", [gradeId]);
  return Response.json({ topics: rows });
}

type LectureRow = { title: string; videoUrl: string | null; description: string };
function parseLectures(raw: string) {
  const ok: LectureRow[] = []; const errors: { line: number; text: string; error: string }[] = [];
  raw.replace(/\r/g, "").split("\n").forEach((line, i) => {
    const l = line.trim(); if (!l) return;
    const [title = "", url = "", ...rest] = l.split("|").map(x => x.trim());
    if (title.length < 2) { errors.push({ line: i + 1, text: l.slice(0, 50), error: "العنوان ناقص." }); return; }
    if (url && !/^https:\/\/\S+$/.test(url)) { errors.push({ line: i + 1, text: title, error: "رابط الفيديو لازم يبدأ بـ https://" }); return; }
    ok.push({ title: title.slice(0, 200), videoUrl: url || null, description: rest.join(" | ").slice(0, 5000) });
  });
  return { ok, errors };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await teacher(); if (!user) return jsonError("غير مصرح.", 403);
  if (Number(request.headers.get("content-length") || 0) > 200000) return jsonError("الطلب كبير جداً.", 413);
  const b = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return jsonError("بيانات غير صالحة.");
  const action = txt(b.action, 40);
  try {
    if (!await gradeOk(b.gradeId)) return jsonError("اختر الصف الأول.");
    const gradeId = b.gradeId as string;
    const published = b.published === true;
    if (action === "quickLecture" || action === "bulkLectures") {
      const parsed = action === "quickLecture"
        ? parseLectures([txt(b.title, 200), txt(b.videoUrl, 1000), txt(b.description, 5000).replace(/\n/g, " ")].join(" | "))
        : parseLectures(txt(b.text, 150000));
      if (b.dryRun === true) return Response.json({ ok: true, count: parsed.ok.length, items: parsed.ok.slice(0, 60), errors: parsed.errors });
      if (parsed.errors.length || !parsed.ok.length) return Response.json({ error: parsed.errors[0]?.error || "مفيش محاضرات.", errors: parsed.errors }, { status: 400 });
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${lectures.sortOrder}), 0)` }).from(lectures).where(eq(lectures.gradeId, gradeId));
      const rows = await db.insert(lectures).values(parsed.ok.map((l, i) => ({ gradeId, title: l.title, description: l.description, videoUrl: l.videoUrl, published, sortOrder: Number(max) + i + 1 }))).returning({ id: lectures.id });
      await log(user.id, "quick_lectures", `${rows.length} lectures`);
      return Response.json({ ok: true, ids: rows.map(r => r.id), message: `تمت إضافة ${rows.length} محاضرة${published ? " ومنشورة" : " كمسودة"}.` });
    }
    const kind = b.kind === "homework" ? "homework" as const : "exam" as const;
    const title = txt(b.title, 200);
    if (title.length < 2) return jsonError("اكتب عنوان الامتحان.");
    const base = { gradeId, title, kind, durationMinutes: num(b.durationMinutes, 30, 1, 300), maxAttempts: num(b.maxAttempts, 1, 1, 20), published, showReview: true, description: txt(b.description, 5000) };
    if (action === "bulkExam") {
      const parsed = parseBulk(txt(b.text, 150000));
      if (b.dryRun === true) return Response.json({ ok: true, count: parsed.ok.length, items: parsed.ok.slice(0, 60).map(p => ({ q: p.q, options: p.options, correct: p.correct })), errors: parsed.errors });
      if (parsed.errors.length || !parsed.ok.length) return Response.json({ error: parsed.errors[0] ? `سؤال ${parsed.errors[0].block}: ${parsed.errors[0].error}` : "مفيش أسئلة.", errors: parsed.errors }, { status: 400 });
      if (parsed.ok.length > 200) return jsonError("الحد الأقصى 200 سؤال في الامتحان.");
      const examId = await db.transaction(async tx => {
        const [e] = await tx.insert(exams).values(base).returning({ id: exams.id });
        await tx.insert(questions).values(parsed.ok.map((p, i) => ({ examId: e.id, prompt: p.q, kind: "mcq" as const, options: p.options, correctIndex: p.correct, points: 1, sortOrder: i })));
        return e.id;
      });
      await log(user.id, "bulk_exam", `${parsed.ok.length} questions`);
      return Response.json({ ok: true, examId, message: `تم إنشاء الامتحان بـ ${parsed.ok.length} سؤال${published ? " ومنشور" : " كمسودة"}.` });
    }
    if (action === "autoExam") {
      const topics = Array.isArray(b.topics) ? b.topics.map(t => txt(t, 120)).filter(Boolean).slice(0, 40) : [];
      const count = num(b.count, 10, 1, 60);
      const { rows } = await pool.query("select q, options, correct from practice_questions where (grade_id is null or grade_id=$1) and ($2::text[] = '{}' or topic = any($2)) order by random() limit $3", [gradeId, topics, count]);
      if (b.dryRun === true) return Response.json({ ok: true, count: rows.length, items: rows.map(r => ({ q: r.q, options: r.options, correct: r.correct })) });
      if (!rows.length) return jsonError("مفيش أسئلة في بنك التدريب للمواضيع دي.");
      const examId = await db.transaction(async tx => {
        const [e] = await tx.insert(exams).values(base).returning({ id: exams.id });
        await tx.insert(questions).values(rows.map((r, i) => ({ examId: e.id, prompt: r.q as string, kind: "mcq" as const, options: r.options as string[], correctIndex: r.correct as number, points: 1, sortOrder: i })));
        return e.id;
      });
      await log(user.id, "auto_exam", `${rows.length} questions`);
      return Response.json({ ok: true, examId, message: `تم تجميع امتحان من ${rows.length} سؤال${rows.length < count ? ` (البنك فيه ${rows.length} بس للمواضيع دي)` : ""}${published ? " ومنشور" : " كمسودة"}. تقدر تعدله من «الاختبارات والواجبات».` });
    }
    return jsonError("إجراء غير معروف.", 404);
  } catch (e) { console.error("content op failed", e); return jsonError("تعذر التنفيذ. راجع البيانات وحاول تاني.", 500); }
}
