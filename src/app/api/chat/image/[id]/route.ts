import { pool } from "@/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import { ensureChat } from "@/lib/notify";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("غير صالح.", 400);
  await ensureChat();
  const { rows } = await pool.query("select image, grade_id from chat_messages where id=$1 and image is not null and created_at > now() - interval '30 days'", [id]);
  const r = rows[0];
  if (!r) return jsonError("مش موجودة.", 404);
  if (!(user.role === "teacher" || (user.role === "student" && user.gradeId === r.grade_id))) return jsonError("غير مسموح.", 403);
  return new Response(new Uint8Array(r.image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
