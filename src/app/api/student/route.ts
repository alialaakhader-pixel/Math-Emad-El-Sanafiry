import { normalizePhone } from "@/lib/phone";
import { ensureStudentCode, lockMap } from "@/lib/gating";
import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activationCodes, announcements, assets, attemptAnswers, attempts, exams, grades, labSaves, lectures, notificationReads, notifications, progress, questions, sessions, subscriptions, users } from "@/db/schema";
import { allowAttempt, canAccessGrade, digest, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const idOk = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("يرجى تسجيل الدخول.", 401);
  if (user.role !== "student") return jsonError("لوحة المدرس متاحة من قسم الإدارة.", 403);
  try {
    const [allGrades, mySubscriptions, myProgress, allLectures, allExams, myAttempts, myNotifications, myReads, publicAnnouncements, mySessions, mySaves] = await Promise.all([
      db.select({ id: grades.id, title: grades.title, stage: grades.stage }).from(grades).where(eq(grades.published, true)).orderBy(grades.sortOrder),
      db.select({ id: subscriptions.id, gradeId: subscriptions.gradeId, startsAt: subscriptions.startsAt, endsAt: subscriptions.endsAt, source: subscriptions.source }).from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.endsAt)),
      db.select().from(progress).where(eq(progress.userId, user.id)),
      user.gradeId ? db.select({ id: lectures.id, title: lectures.title, description: lectures.description, gradeId: lectures.gradeId, termId: lectures.termId, unitId: lectures.unitId, freePreview: lectures.freePreview, createdAt: lectures.createdAt }).from(lectures).where(and(eq(lectures.gradeId, user.gradeId), eq(lectures.published, true))).orderBy(lectures.sortOrder) : Promise.resolve([]),
      user.gradeId ? db.select({ id: exams.id, title: exams.title, description: exams.description, gradeId: exams.gradeId, kind: exams.kind, durationMinutes: exams.durationMinutes, startsAt: exams.startsAt, endsAt: exams.endsAt, createdAt: exams.createdAt }).from(exams).where(and(eq(exams.gradeId, user.gradeId), eq(exams.published, true))).orderBy(desc(exams.createdAt)) : Promise.resolve([]),
      db.select({ id: attempts.id, examId: attempts.examId, startedAt: attempts.startedAt, submittedAt: attempts.submittedAt, status: attempts.status, score: attempts.score, maxScore: attempts.maxScore }).from(attempts).where(eq(attempts.userId, user.id)).orderBy(desc(attempts.startedAt)),
      db.select({ id: notifications.id, title: notifications.title, body: notifications.body, createdAt: notifications.createdAt }).from(notifications).where(or(eq(notifications.userId, user.id), isNull(notifications.userId))).orderBy(desc(notifications.createdAt)).limit(30),
      db.select({ notificationId: notificationReads.notificationId }).from(notificationReads).where(eq(notificationReads.userId, user.id)),
      db.select().from(announcements).where(eq(announcements.published, true)).orderBy(desc(announcements.createdAt)).limit(10),
      db.select({ tokenHash: sessions.tokenHash, userAgent: sessions.userAgent, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt }).from(sessions).where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.createdAt)),
      db.select().from(labSaves).where(eq(labSaves.userId, user.id)).orderBy(desc(labSaves.updatedAt)),
    ]);
    const [studentCode, locks] = await Promise.all([ensureStudentCode(user.id), lockMap(user.id, user.gradeId)]);
    const lecturesOut = allLectures.map(l => ({ ...l, lock: locks[l.id] || { locked: false } }));
    return Response.json({ user: { id: user.id, studentCode, ...(await db.select({ avatar: users.avatar, parentPhone: users.parentPhone }).from(users).where(eq(users.id, user.id)).limit(1))[0], name: user.name, email: user.email, gradeId: user.gradeId, currentSession: user.tokenHash }, grades: allGrades, subscriptions: mySubscriptions, progress: myProgress, lectures: lecturesOut, exams: allExams, attempts: myAttempts, notifications: myNotifications, readIds: myReads.map(r => r.notificationId), announcements: publicAnnouncements, sessions: mySessions, saves: mySaves });
  } catch (error) { console.error("Student load failed", error); return jsonError("تعذر تحميل بيانات حسابك.", 500); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError("يرجى تسجيل الدخول كطالب.", 401);
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (form.get("action") !== "uploadAnswer" || !(file instanceof File)) return jsonError("اختر ملفاً صالحاً.");
      if (!(["application/pdf", "image/png", "image/jpeg"] as string[]).includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) return jsonError("يُسمح بملف PDF أو صورة حتى 4 ميجابايت.");
      const [saved] = await db.insert(assets).values({ ownerId: user.id, fileName: file.name.slice(0, 255), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()).toString("base64") }).returning({ id: assets.id });
      return Response.json({ ok: true, assetId: saved.id, message: "تم رفع الملف." });
    }
    if (Number(request.headers.get("content-length") || 0) > 30000) return jsonError("الطلب كبير جداً.", 413);
    const b = await request.json() as Record<string, unknown>;
    switch (b.action) {
      case "setAvatar": {
        const a = typeof b.avatar === "string" ? b.avatar : "";
        if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(a) || a.length > 28000) return jsonError("الصورة غير صالحة أو كبيرة.");
        await db.update(users).set({ avatar: a }).where(eq(users.id, user.id));
        return Response.json({ ok: true, message: "تم حفظ الصورة." });
      }
      case "setParentPhone": {
        const ph = normalizePhone(b.phone);
        if (!ph) return jsonError("رقم غير صحيح (مثال: 01012345678).");
        await db.update(users).set({ parentPhone: ph }).where(eq(users.id, user.id));
        return Response.json({ ok: true, message: "تم حفظ رقم ولي الأمر." });
      }
      case "updateProfile": {
        const name = text(b.name, 120);
        if (name.length < 2) return jsonError("الاسم يجب أن يتكون من حرفين على الأقل.");
        const gradeId = b.gradeId === "" ? null : b.gradeId;
        if (gradeId && (!idOk(gradeId) || !(await db.select({ id: grades.id }).from(grades).where(and(eq(grades.id, gradeId), eq(grades.published, true))).limit(1))[0])) return jsonError("الصف غير متاح.");
        await db.update(users).set({ name, gradeId: gradeId as string | null }).where(eq(users.id, user.id));
        return Response.json({ ok: true, message: "تم تحديث بياناتك." });
      }
      case "redeemCode": {
        if (!await allowAttempt(`code:${user.id}`, 8)) return jsonError("محاولات كثيرة. حاول لاحقاً.", 429);
        const code = text(b.code, 80).toUpperCase();
        if (!/^EMAD-([0-9A-F]{4}-){5}[0-9A-F]{4}$/.test(code)) return jsonError("الكود غير صالح أو انتهت صلاحيته.");
        const result = await db.transaction(async (tx) => {
          const [record] = await tx.update(activationCodes).set({ usedAt: new Date(), usedBy: user.id })
            .where(and(eq(activationCodes.codeHash, digest(code)), isNull(activationCodes.usedAt), isNull(activationCodes.revokedAt), or(isNull(activationCodes.expiresAt), gt(activationCodes.expiresAt, new Date()))))
            .returning({ id: activationCodes.id, gradeId: activationCodes.gradeId, durationDays: activationCodes.durationDays });
          if (!record) return null;
          const [existing] = await tx.select({ endsAt: subscriptions.endsAt }).from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.gradeId, record.gradeId), gt(subscriptions.endsAt, new Date()))).orderBy(desc(subscriptions.endsAt)).limit(1);
          const startsAt = existing?.endsAt || new Date();
          const endsAt = new Date(startsAt.getTime() + record.durationDays * 86400000);
          await tx.insert(subscriptions).values({ userId: user.id, gradeId: record.gradeId, startsAt, endsAt, source: "code", codeId: record.id });
          await tx.update(users).set({ gradeId: record.gradeId }).where(eq(users.id, user.id));
          return endsAt;
        });
        if (!result) return jsonError("الكود غير صالح أو انتهت صلاحيته.");
        return Response.json({ ok: true, message: "تم تفعيل الاشتراك بنجاح.", endsAt: result });
      }
      case "updateProgress": {
        if (!idOk(b.lectureId)) return jsonError("المحاضرة غير صالحة.");
        const [lecture] = await db.select({ gradeId: lectures.gradeId, published: lectures.published, freePreview: lectures.freePreview }).from(lectures).where(eq(lectures.id, b.lectureId)).limit(1);
        if (!lecture?.published || (!lecture.freePreview && !await canAccessGrade(user, lecture.gradeId))) return jsonError("ليس لديك صلاحية لهذه المحاضرة.", 403);
        if ((await lockMap(user.id, lecture.gradeId))[b.lectureId]?.locked) return jsonError("المحاضرة مقفولة. حل واجب المحاضرة السابقة وحقق ٥٠٪ على الأقل.", 403);
        const seconds = Math.min(86400, Math.max(0, Math.floor(Number(b.seconds) || 0)));
        const completed = b.completed === true;
        await db.insert(progress).values({ userId: user.id, lectureId: b.lectureId, seconds, completed }).onConflictDoUpdate({ target: [progress.userId, progress.lectureId], set: { seconds: sql`greatest(${progress.seconds}, ${seconds})`, completed: sql`${progress.completed} or ${completed}`, updatedAt: new Date() } });
        return Response.json({ ok: true, message: "تم حفظ التقدم." });
      }
      case "startExam": {
        if (!idOk(b.examId)) return jsonError("التقييم غير صالح.");
        const [exam] = await db.select().from(exams).where(and(eq(exams.id, b.examId), eq(exams.published, true))).limit(1);
        if (!exam || !await canAccessGrade(user, exam.gradeId)) return jsonError("التقييم غير متاح لاشتراكك.", 403);
        const now = new Date();
        if ((exam.startsAt && now < exam.startsAt) || (exam.endsAt && now > exam.endsAt)) return jsonError("التقييم خارج موعد الإتاحة.");
        const allQuestions = await db.select({ id: questions.id, prompt: questions.prompt, kind: questions.kind, options: questions.options, points: questions.points }).from(questions).where(eq(questions.examId, exam.id)).orderBy(questions.sortOrder);
        if (!allQuestions.length) return jsonError("لم تُضف أسئلة لهذا التقييم بعد.");
        const previous = await db.select().from(attempts).where(and(eq(attempts.examId, exam.id), eq(attempts.userId, user.id))).orderBy(desc(attempts.startedAt));
        const active = previous.find(a => a.status === "in_progress" && now.getTime() < a.startedAt.getTime() + exam.durationMinutes * 60000);
        if (active) return Response.json({ ok: true, attemptId: active.id, startedAt: active.startedAt, durationMinutes: exam.durationMinutes, questions: allQuestions });
        for (const expired of previous.filter(a => a.status === "in_progress")) await db.update(attempts).set({ status: "graded", submittedAt: now, score: 0, maxScore: allQuestions.reduce((s, q) => s + q.points, 0) }).where(eq(attempts.id, expired.id));
        if (previous.length >= exam.maxAttempts) return jsonError("استُنفدت المحاولات المتاحة لهذا التقييم.");
        const [attempt] = await db.insert(attempts).values({ examId: exam.id, userId: user.id }).returning();
        return Response.json({ ok: true, attemptId: attempt.id, startedAt: attempt.startedAt, durationMinutes: exam.durationMinutes, questions: allQuestions });
      }
      case "submitExam": {
        if (!idOk(b.attemptId) || !Array.isArray(b.answers) || b.answers.length > 100) return jsonError("الإجابات غير صالحة.");
        const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, b.attemptId), eq(attempts.userId, user.id))).limit(1);
        if (!attempt || attempt.status !== "in_progress") return jsonError("هذه المحاولة غير متاحة.");
        const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
        if (!exam) return jsonError("التقييم غير موجود.");
        const allQuestions = await db.select().from(questions).where(eq(questions.examId, exam.id));
        const maxScore = allQuestions.reduce((s, q) => s + q.points, 0);
        if (Date.now() > attempt.startedAt.getTime() + exam.durationMinutes * 60000 + 30000) {
          await db.update(attempts).set({ status: "graded", submittedAt: new Date(), score: 0, maxScore }).where(eq(attempts.id, attempt.id));
          return jsonError("انتهى وقت التقييم. تم إغلاق المحاولة.");
        }
        const answers = b.answers as Array<{ questionId?: unknown; value?: unknown }>;
        const answerMap = new Map(answers.filter(a => idOk(a.questionId)).map(a => [a.questionId as string, text(a.value, 5000)]));
        const hasText = allQuestions.some(q => q.kind === "text");
        let score = 0;
        await db.transaction(async (tx) => {
          for (const q of allQuestions) {
            const value = answerMap.get(q.id) || "";
            if (q.kind === "text" && value.startsWith("file:")) {
              const fileId = value.slice(5);
              if (!idOk(fileId) || !(await tx.select({ id: assets.id }).from(assets).where(and(eq(assets.id, fileId), eq(assets.ownerId, user.id))).limit(1))[0]) throw new Error("ملف الإجابة غير صالح.");
            }
            const awarded = q.kind === "mcq" ? (value !== "" && Number(value) === q.correctIndex ? q.points : 0) : null;
            score += awarded || 0;
            await tx.insert(attemptAnswers).values({ attemptId: attempt.id, questionId: q.id, value, awarded });
          }
          await tx.update(attempts).set({ submittedAt: new Date(), status: hasText ? "pending_review" : "graded", score, maxScore }).where(and(eq(attempts.id, attempt.id), eq(attempts.status, "in_progress")));
        });
        return Response.json({ ok: true, message: hasText ? "تم التسليم. ستظهر الدرجة النهائية بعد مراجعة الإجابات المقالية." : "تم تسليم التقييم وتصحيحه.", status: hasText ? "pending_review" : "graded", score: hasText ? null : score, maxScore });
      }
      case "markRead": {
        if (!idOk(b.id)) return jsonError("الإشعار غير صالح.");
        const [notification] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.id, b.id), or(eq(notifications.userId, user.id), isNull(notifications.userId)))).limit(1);
        if (!notification) return jsonError("الإشعار غير موجود.");
        await db.insert(notificationReads).values({ userId: user.id, notificationId: b.id }).onConflictDoNothing();
        return Response.json({ ok: true });
      }
      case "revokeSession": {
        if (typeof b.tokenHash !== "string" || !/^[0-9a-f]{64}$/.test(b.tokenHash)) return jsonError("الجلسة غير صالحة.");
        await db.delete(sessions).where(and(eq(sessions.tokenHash, b.tokenHash), eq(sessions.userId, user.id)));
        return Response.json({ ok: true, message: "تم تسجيل الخروج من الجهاز." });
      }
      case "revokeOthers": {
        await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, user.tokenHash)));
        return Response.json({ ok: true, message: "تم تسجيل الخروج من جميع الأجهزة الأخرى." });
      }
      case "saveLab": {
        const name = text(b.name, 120);
        const data = b.data;
        if (!name || !data || JSON.stringify(data).length > 20000) return jsonError("أدخل اسماً أو قلل حجم الرسم.");
        if (idOk(b.id)) {
          await db.update(labSaves).set({ name, data, updatedAt: new Date() }).where(and(eq(labSaves.id, b.id), eq(labSaves.userId, user.id)));
        } else await db.insert(labSaves).values({ userId: user.id, name, data });
        return Response.json({ ok: true, message: "تم حفظ عملك في المعمل." });
      }
      case "deleteLab": {
        if (!idOk(b.id)) return jsonError("العمل غير صالح.");
        await db.delete(labSaves).where(and(eq(labSaves.id, b.id), eq(labSaves.userId, user.id)));
        return Response.json({ ok: true, message: "تم حذف العمل." });
      }
      default: return jsonError("إجراء غير معروف.", 404);
    }
  } catch (error) { console.error("Student operation failed", error); return jsonError(error instanceof Error && error.message === "ملف الإجابة غير صالح." ? error.message : "تعذر تنفيذ العملية. تحقق من البيانات وحاول مرة أخرى.", 400); }
}
