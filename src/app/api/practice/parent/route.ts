import { randomBytes } from "node:crypto";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { pool } from "@/db";
import { getStats } from "@/lib/xp";

export const dynamic = "force-dynamic";
// Creates the read-only parent link, or replaces it (which revokes the old one).
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً.", 401);
  const b = await request.json().catch(() => ({})) as { regenerate?: boolean; revoke?: boolean };
  const s = await getStats(user.id);
  if (b.revoke) { await pool.query("update user_stats set parent_token=null where user_id=$1", [user.id]); return Response.json({ token: null }); }
  if (s.parentToken && !b.regenerate) return Response.json({ token: s.parentToken });
  const token = randomBytes(18).toString("base64url");
  await pool.query("update user_stats set parent_token=$2 where user_id=$1", [user.id, token]);
  return Response.json({ token });
}
