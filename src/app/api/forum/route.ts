import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumPosts, forumReplies, lectures, users } from "@/db/schema";
import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const isMod = (role: string) => role === "teacher" || role === "staff";

export async function GET(request: Request) {
  const user = await getCurrentUser(); if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  const url = new URL(request.url); const postId = url.searchParams.get("post");
  const who = { id: users.id, name: users.name, role: users.role };
  if (postId) {
    if (!idOk(postId)) return jsonError("منشور غير صالح.");
    const [post] = await db.select({ id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, pinned: forumPosts.pinned, createdAt: forumPosts.createdAt, lectureId: forumPosts.lectureId, authorId: users.id, authorName: users.name, authorRole: users.role })
      .from(forumPosts).innerJoin(users, eq(forumPosts.userId, users.id)).where(eq(forumPosts.id, postId)).limit(1);
    if (!post) return jsonError("المنشور غير موجود.", 404);
    const replies = await db.select({ id: forumReplies.id, body: forumReplies.body, createdAt: forumReplies.createdAt, authorId: who.id, authorName: who.name, authorRole: who.role })
      .from(forumReplies).innerJoin(users, eq(forumReplies.userId, users.id)).where(eq(forumReplies.postId, postId)).orderBy(asc(forumReplies.createdAt)).limit(300);
    return Response.json({ me: { id: user.id, role: user.role }, post, replies });
  }
  const lectureFilter = url.searchParams.get("lecture");
  const rows = await db.select({ id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, pinned: forumPosts.pinned, createdAt: forumPosts.createdAt, lectureId: forumPosts.lectureId, authorId: users.id, authorName: users.name, authorRole: users.role })
    .from(forumPosts).innerJoin(users, eq(forumPosts.userId, users.id))
    .where(idOk(lectureFilter) ? eq(forumPosts.lectureId, lectureFilter) : undefined)
    .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt)).limit(100);
  const ids = rows.map(r => r.id);
  const counts = ids.length ? await db.select({ postId: forumReplies.postId, n: sql<number>`count(*)::int` }).from(forumReplies).where(inArray(forumReplies.postId, ids)).groupBy(forumReplies.postId) : [];
  const cm = new Map(counts.map(c => [c.postId, c.n]));
  const lecs = await db.select({ id: lectures.id, title: lectures.title, gradeId: lectures.gradeId }).from(lectures)
    .where(isMod(user.role) || !user.gradeId ? eq(lectures.published, true) : and(eq(lectures.published, true), eq(lectures.gradeId, user.gradeId))).orderBy(asc(lectures.sortOrder)).limit(200);
  const lt = new Map(lecs.map(l => [l.id, l.title]));
  return Response.json({ me: { id: user.id, role: user.role }, lectures: lecs.map(l => ({ id: l.id, title: l.title })),
    posts: rows.map(r => ({ ...r, body: r.body.slice(0, 220), replies: cm.get(r.id) || 0, lectureTitle: r.lectureId ? lt.get(r.lectureId) || null : null })) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser(); if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  if (Number(request.headers.get("content-length") || 0) > 12000) return jsonError("الطلب كبير جداً.", 413);
  const b = await request.json().catch(() => null) as Record<string, unknown> | null; if (!b) return jsonError("بيانات غير صالحة.");
  try {
    switch (b.action) {
      case "createPost": {
        if (!await allowAttempt(`forum:${user.id}`, 20, 60 * 60 * 1000)) return jsonError("منشورات كثيرة، حاول لاحقاً.", 429);
        const title = text(b.title, 200), body = text(b.body, 5000); if (title.length < 3 || body.length < 3) return jsonError("اكتب عنواناً ونصاً للمنشور.");
        let lectureId: string | null = null; if (idOk(b.lectureId)) { const [l] = await db.select({ id: lectures.id }).from(lectures).where(and(eq(lectures.id, b.lectureId), eq(lectures.published, true))).limit(1); lectureId = l?.id ?? null; }
        const [p] = await db.insert(forumPosts).values({ userId: user.id, title, body, lectureId }).returning({ id: forumPosts.id });
        return Response.json({ ok: true, id: p.id, message: "تم نشر المنشور." });
      }
      case "reply": {
        if (!await allowAttempt(`forumr:${user.id}`, 60, 60 * 60 * 1000)) return jsonError("ردود كثيرة، حاول لاحقاً.", 429);
        const body = text(b.body, 3000); if (!idOk(b.postId) || body.length < 1) return jsonError("اكتب الرد.");
        const [p] = await db.select({ id: forumPosts.id }).from(forumPosts).where(eq(forumPosts.id, b.postId)).limit(1); if (!p) return jsonError("المنشور غير موجود.", 404);
        await db.insert(forumReplies).values({ postId: b.postId, userId: user.id, body });
        return Response.json({ ok: true, message: "تم إضافة الرد." });
      }
      case "deletePost": {
        if (!idOk(b.id)) return jsonError("غير صالح.");
        const [p] = await db.select({ userId: forumPosts.userId }).from(forumPosts).where(eq(forumPosts.id, b.id)).limit(1); if (!p) return jsonError("غير موجود.", 404);
        if (p.userId !== user.id && !isMod(user.role)) return jsonError("غير مسموح.", 403);
        await db.delete(forumPosts).where(eq(forumPosts.id, b.id)); return Response.json({ ok: true, message: "تم حذف المنشور." });
      }
      case "deleteReply": {
        if (!idOk(b.id)) return jsonError("غير صالح.");
        const [r] = await db.select({ userId: forumReplies.userId }).from(forumReplies).where(eq(forumReplies.id, b.id)).limit(1); if (!r) return jsonError("غير موجود.", 404);
        if (r.userId !== user.id && !isMod(user.role)) return jsonError("غير مسموح.", 403);
        await db.delete(forumReplies).where(eq(forumReplies.id, b.id)); return Response.json({ ok: true, message: "تم حذف الرد." });
      }
      case "pin": {
        if (!isMod(user.role)) return jsonError("غير مسموح.", 403); if (!idOk(b.id)) return jsonError("غير صالح.");
        await db.update(forumPosts).set({ pinned: b.pinned === true }).where(eq(forumPosts.id, b.id)); return Response.json({ ok: true, message: b.pinned === true ? "تم التثبيت." : "تم إلغاء التثبيت." });
      }
      default: return jsonError("طلب غير معروف.", 404);
    }
  } catch (e) { console.error("forum", e); return jsonError("تعذر تنفيذ الطلب.", 500); }
}
