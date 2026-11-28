import { pool } from "@/db";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  const { rows } = await pool.query(
    `select n.id, n.title, n.body, n.created_at, (r.user_id is null) as unread
     from notifications n left join notification_reads r on r.notification_id=n.id and r.user_id=$1
     where n.user_id=$1 or n.user_id is null order by n.created_at desc limit 20`, [user.id]);
  const c = await pool.query(
    `select count(*)::int n from notifications n left join notification_reads r on r.notification_id=n.id and r.user_id=$1
     where (n.user_id=$1 or n.user_id is null) and r.user_id is null and n.created_at > now() - interval '60 days'`, [user.id]);
  return Response.json({ unread: c.rows[0].n, items: rows.map(r => ({ id: r.id, title: r.title, body: r.body, at: r.created_at, unread: r.unread })) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  const b = await request.json().catch(() => ({})) as { action?: string; id?: string };
  if (b.action === "readAll") {
    await pool.query(
      `insert into notification_reads(user_id,notification_id) select $1, n.id from notifications n
       where (n.user_id=$1 or n.user_id is null) and n.created_at > now() - interval '60 days' on conflict do nothing`, [user.id]);
    return Response.json({ ok: true });
  }
  if (b.action === "read" && typeof b.id === "string" && uuid.test(b.id)) {
    await pool.query(
      `insert into notification_reads(user_id,notification_id) select $1, n.id from notifications n
       where n.id=$2 and (n.user_id=$1 or n.user_id is null) on conflict do nothing`, [user.id, b.id]);
    return Response.json({ ok: true });
  }
  return jsonError("إجراء غير معروف.");
}
