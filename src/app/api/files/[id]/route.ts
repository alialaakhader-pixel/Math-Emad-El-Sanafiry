import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, lectures } from "@/db/schema";
import { canAccessGrade, getCurrentUser, jsonError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("يرجى تسجيل الدخول.", 401);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("ملف غير صالح.", 400);
  const [file] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!file) return jsonError("الملف غير موجود.", 404);
  let allowed = user.role === "teacher" || file.ownerId === user.id;
  if (!allowed && file.lectureId) {
    const [lecture] = await db.select({ gradeId: lectures.gradeId, published: lectures.published, freePreview: lectures.freePreview }).from(lectures).where(eq(lectures.id, file.lectureId)).limit(1);
    allowed = !!lecture?.published && (lecture.freePreview || await canAccessGrade(user, lecture.gradeId));
  }
  if (!allowed) return jsonError("ليس لديك صلاحية لفتح هذا الملف.", 403);
  const buffer = Buffer.from(file.data, "base64");
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });
  const range = request.headers.get("range");
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [startRaw, endRaw] = range.slice(6).split("-");
    const start = startRaw ? Number(startRaw) : 0;
    const end = endRaw ? Math.min(Number(endRaw), buffer.length - 1) : buffer.length - 1;
    if (start > end || start >= buffer.length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${buffer.length}` } });
    const part = buffer.subarray(start, end + 1);
    headers.set("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
    headers.set("Content-Length", String(part.length));
    return new Response(new Uint8Array(part), { status: 206, headers });
  }
  headers.set("Content-Length", String(buffer.length));
  return new Response(new Uint8Array(buffer), { headers });
}
