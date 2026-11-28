import { pool } from "@/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import { ensureChat, ensureSubmissions } from "@/lib/notify";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("غير مصرح.", 403);
  await Promise.all([ensureChat(), ensureSubmissions()]);
  const [f, s, p] = await Promise.all([
    pool.query("select count(*)::int n from chat_messages m where exists(select 1 from chat_flags f where f.message_id=m.id)"),
    pool.query("select count(*)::int n from homework_submissions where status='submitted'"),
    pool.query("select count(*)::int n from attempt_answers aa join exam_attempts a on a.id=aa.attempt_id join questions q on q.id=aa.question_id where q.kind='text' and aa.awarded is null and a.status='pending_review'"),
  ]);
  const items = [
    { href: "/admin/chat", title: "رسائل شات مبلّغ عنها", n: f.rows[0].n },
    { href: "/admin#subs", title: "تسليمات واجبات مستنية مراجعة", n: s.rows[0].n },
    { href: "/admin#exams", title: "إجابات مقالية مستنية تصحيح", n: p.rows[0].n },
  ].filter(i => i.n > 0);
  return Response.json({ total: items.reduce((a, i) => a + i.n, 0), items });
}
