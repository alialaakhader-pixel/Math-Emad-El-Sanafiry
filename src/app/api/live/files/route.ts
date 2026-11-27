import { canAccessGrade, getCurrentUser, jsonError, sameOrigin, allowAttempt } from "@/lib/auth";
import { liveConfigured, patchMeta, roomState, studentUploadsOn, validId } from "@/lib/live";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
const MAX = 4 * 1024 * 1024; // Vercel functions accept request bodies up to ~4.5 MB
const MAX_FILES = 20;
const TYPES: Record<string, (b: Buffer) => boolean> = {
  "application/pdf": b => b.subarray(0, 5).toString() === "%PDF-",
  "image/png": b => b.subarray(1, 4).toString() === "PNG",
  "image/jpeg": b => b[0] === 0xff && b[1] === 0xd8,
  "image/webp": b => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
  "image/gif": b => b.subarray(0, 3).toString() === "GIF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b => b[0] === 0x50 && b[1] === 0x4b,
};
const EXT: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

async function authorize(gradeId: string) {
  const user = await getCurrentUser();
  if (!user) return { err: jsonError("سجّل الدخول أولاً.", 401) };
  if (user.role !== "teacher" && (user.role !== "student" || !(await canAccessGrade(user, gradeId)))) return { err: jsonError("ملفات الحصة لمشتركي هذا الصف فقط.", 403) };
  return { user };
}

export async function GET(request: Request) {
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const gradeId = new URL(request.url).searchParams.get("gradeId");
  if (!validId(gradeId)) return jsonError("حدد الصف.");
  const a = await authorize(gradeId); if (a.err) return a.err;
  try {
    const st = await roomState(gradeId);
    if (!st.live && a.user!.role !== "teacher") return Response.json({ files: [], studentUploads: false });
    const { rows } = await pool.query("select id, name, mime, size, uploader_name, created_at from live_files where grade_id = $1 order by created_at desc limit $2", [gradeId, MAX_FILES]);
    return Response.json({ files: rows.map(r => ({ id: r.id, name: r.name, mime: r.mime, size: r.size, by: r.uploader_name, at: r.created_at })), studentUploads: await studentUploadsOn(gradeId) });
  } catch (e) { console.error("live files list", e); return jsonError("تعذر عرض الملفات.", 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) { // teacher toggles student uploads
      const { gradeId, allowStudents } = await request.json().catch(() => ({}));
      if (!validId(gradeId)) return jsonError("حدد الصف.");
      const user = await getCurrentUser();
      if (!user || user.role !== "teacher") return jsonError("للمدرس فقط.", 403);
      if (!(await roomState(gradeId)).live) return jsonError("ابدأ الحصة أولاً.", 409);
      await patchMeta(gradeId, { studentUploads: !!allowStudents });
      return Response.json({ ok: true, studentUploads: !!allowStudents });
    }
    const form = await request.formData().catch(() => null);
    const gradeId = form?.get("gradeId"); const file = form?.get("file");
    if (!validId(gradeId) || !(file instanceof File)) return jsonError("اختر ملفاً.");
    const a = await authorize(gradeId); if (a.err) return a.err;
    const user = a.user!;
    if (!(await roomState(gradeId)).live) return jsonError("الحصة لم تبدأ.", 409);
    if (user.role !== "teacher" && !(await studentUploadsOn(gradeId))) return jsonError("رفع الملفات للمدرس فقط حالياً.", 403);
    if (!await allowAttempt(`livefile:${user.id}`, 30, 60 * 60 * 1000)) return jsonError("رفعت ملفات كثيرة. حاول لاحقاً.", 429);
    if (file.size > MAX) return jsonError("الحد الأقصى لحجم الملف 4 ميجا.", 413);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const mime = EXT[ext];
    const buf = Buffer.from(await file.arrayBuffer());
    if (!mime || !TYPES[mime](buf)) return jsonError("المسموح: PDF أو صورة (PNG/JPG/WEBP/GIF) أو Word (docx).");
    const cnt = await pool.query("select count(*)::int c from live_files where grade_id = $1", [gradeId]);
    if (cnt.rows[0].c >= MAX_FILES) return jsonError("وصلت للحد الأقصى (20 ملف). احذف ملفات قديمة.", 409);
    const name = file.name.replace(/[\u0000-\u001f\\/<>:"|?*]/g, "_").slice(0, 150) || `file.${ext}`;
    const { rows } = await pool.query("insert into live_files (grade_id, name, mime, size, data, uploaded_by, uploader_name) values ($1,$2,$3,$4,$5,$6,$7) returning id", [gradeId, name, mime, buf.length, buf.toString("base64"), user.id, user.name.slice(0, 120)]);
    return Response.json({ ok: true, id: rows[0].id });
  } catch (e) { console.error("live files post", e); return jsonError("تعذر رفع الملف.", 503); }
}
