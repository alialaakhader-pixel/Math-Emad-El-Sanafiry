import { randomBytes } from "node:crypto";
import { pool } from "@/db";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Returns the student's read-only parent report link, creating it only if none exists (never replaces the student's own link).
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("غير مصرح.", 403);
  const b = await request.json().catch(() => ({})) as { id?: string };
  if (typeof b.id !== "string" || !/^[0-9a-f-]{36}$/i.test(b.id)) return jsonError("طالب غير صالح.");
  const s = await pool.query("select 1 from users where id=$1 and role='student'", [b.id]);
  if (!s.rows[0]) return jsonError("الطالب مش موجود.", 404);
  await pool.query("insert into user_stats(user_id) values ($1) on conflict do nothing", [b.id]);
  const cur = await pool.query("select parent_token from user_stats where user_id=$1", [b.id]);
  let token = cur.rows[0]?.parent_token as string | null;
  if (!token) { token = randomBytes(18).toString("base64url"); await pool.query("update user_stats set parent_token=$2 where user_id=$1", [b.id, token]); }
  return Response.json({ token });
}
