import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { activationCodes, adminLogs, announcements, assets, attemptAnswers, attempts, exams, grades, lectures, notifications, questions, siteSettings, subscriptions, terms, units, users } from "@/db/schema";
import { digest, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const idOk = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const txt = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const pos = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
const bool = (value: unknown) => value === true || value === "true";
const dateOrNull = (value: unknown) => value && !Number.isNaN(new Date(String(value)).getTime()) ? new Date(String(value)) : null;
const fail = (message: string) => { throw new Error(message); };
async function log(actorId: string, action: string, details = "") { await db.insert(adminLogs).values({ actorId, action, details: details.slice(0, 500) }); }

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("غير مصرح.", 403);
  try {
    const [allGrades, allTerms, allUnits, allLectures, allExams, allQuestions, students, allSubscriptions, codes, allAnnouncements, allNotifications, settings, allAssets, pending, logs] = await Promise.all([
      db.select().from(grades).orderBy(grades.sortOrder),
      db.select().from(terms).orderBy(terms.sortOrder),
      db.select().from(units).orderBy(units.sortOrder),
      db.select().from(lectures).orderBy(desc(lectures.createdAt)),
      db.select().from(exams).orderBy(desc(exams.createdAt)),
      db.select().from(questions).orderBy(questions.sortOrder),
      db.select({ id: users.id, name: users.name, email: users.email, gradeId: users.gradeId, createdAt: users.createdAt }).from(users).where(eq(users.role, "student")).orderBy(desc(users.createdAt)),
      db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)),
      db.select({ id: activationCodes.id, gradeId: activationCodes.gradeId, durationDays: activationCodes.durationDays, expiresAt: activationCodes.expiresAt, usedAt: activationCodes.usedAt, usedBy: activationCodes.usedBy, revokedAt: activationCodes.revokedAt, createdAt: activationCodes.createdAt }).from(activationCodes).orderBy(desc(activationCodes.createdAt)),
      db.select().from(announcements).orderBy(desc(announcements.createdAt)),
      db.select().from(notifications).orderBy(desc(notifications.createdAt)),
      db.select().from(siteSettings),
      db.select({ id: assets.id, lectureId: assets.lectureId, ownerId: assets.ownerId, fileName: assets.fileName, mimeType: assets.mimeType, size: assets.size, createdAt: assets.createdAt }).from(assets).orderBy(desc(assets.createdAt)),
      db.select({ id: attemptAnswers.id, attemptId: attemptAnswers.attemptId, questionId: attemptAnswers.questionId, value: attemptAnswers.value, prompt: questions.prompt, points: questions.points, studentName: users.name, examTitle: exams.title }).from(attemptAnswers).innerJoin(questions, eq(attemptAnswers.questionId, questions.id)).innerJoin(attempts, eq(attemptAnswers.attemptId, attempts.id)).innerJoin(users, eq(attempts.userId, users.id)).innerJoin(exams, eq(attempts.examId, exams.id)).where(and(eq(questions.kind, "text"), isNull(attemptAnswers.awarded))),
      db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(50),
    ]);
    return Response.json({ grades: allGrades, terms: allTerms, units: allUnits, lectures: allLectures, exams: allExams, questions: allQuestions, students, subscriptions: allSubscriptions, codes, announcements: allAnnouncements, notifications: allNotifications, settings, assets: allAssets, pending, logs });
  } catch (error) { console.error("Admin load failed", error); return jsonError("تعذر تحميل البيانات.", 500); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("غير مصرح.", 403);
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      if (form.get("action") !== "uploadAsset") return jsonError("إجراء غير معروف.");
      const lectureId = form.get("lectureId");
      const file = form.get("file");
      if (!idOk(lectureId) || !(file instanceof File)) return jsonError("اختر محاضرة وملفاً صالحاً.");
      if (!(["application/pdf", "video/mp4", "video/webm"] as string[]).includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) return jsonError("يُسمح بملفات PDF وMP4 وWebM بحجم حتى 4 ميجابايت.");
      const [lecture] = await db.select({ id: lectures.id }).from(lectures).where(eq(lectures.id, lectureId)).limit(1);
      if (!lecture) return jsonError("المحاضرة غير موجودة.");
      await db.insert(assets).values({ lectureId, fileName: file.name.slice(0, 255), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()).toString("base64") });
      await log(user.id, "upload_asset", lectureId);
      return Response.json({ ok: true, message: "تم رفع الملف." });
    }
    if (Number(request.headers.get("content-length") || 0) > 20000) return jsonError("الطلب كبير جداً.", 413);
    const b = await request.json() as Record<string, unknown>;
    const action = txt(b.action, 60);
    const id = b.id;
    let message = "تم حفظ التغييرات.";
    let extra: Record<string, unknown> = {};
    switch (action) {
      case "createGrade": {
        if (!txt(b.title, 120)) return jsonError("اكتب اسم الصف.");
        await db.insert(grades).values({ title: txt(b.title, 120), stage: txt(b.stage, 120), sortOrder: pos(b.sortOrder), published: true });
        break;
      }
      case "updateGrade": {
        if (!idOk(id) || !txt(b.title, 120)) return jsonError("بيانات الصف غير صالحة.");
        await db.update(grades).set({ title: txt(b.title, 120), stage: txt(b.stage, 120), sortOrder: pos(b.sortOrder), published: bool(b.published) }).where(eq(grades.id, id));
        break;
      }
      case "deleteGrade": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        const [linked] = await db.select({ id: lectures.id }).from(lectures).where(eq(lectures.gradeId, id)).limit(1);
        if (linked) return jsonError("احذف محاضرات هذا الصف أولاً.");
        await db.delete(grades).where(eq(grades.id, id));
        break;
      }
      case "createTerm": {
        if (!idOk(b.gradeId) || !txt(b.title, 120)) return jsonError("حدد الصف واكتب اسم الترم.");
        await db.insert(terms).values({ gradeId: b.gradeId, title: txt(b.title, 120), sortOrder: pos(b.sortOrder) });
        break;
      }
      case "deleteTerm": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(terms).where(eq(terms.id, id));
        break;
      }
      case "createUnit": {
        if (!idOk(b.termId) || !txt(b.title, 160)) return jsonError("حدد الترم واكتب اسم الوحدة.");
        await db.insert(units).values({ termId: b.termId, title: txt(b.title, 160), sortOrder: pos(b.sortOrder) });
        break;
      }
      case "deleteUnit": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(units).where(eq(units.id, id));
        break;
      }
      case "createLecture":
      case "updateLecture": {
        if (!idOk(b.gradeId) || !txt(b.title, 200)) return jsonError("حدد الصف واكتب عنوان المحاضرة.");
        const termId = idOk(b.termId) ? b.termId : null;
        const unitId = idOk(b.unitId) ? b.unitId : null;
        if (termId && !(await db.select({ id: terms.id }).from(terms).where(and(eq(terms.id, termId), eq(terms.gradeId, b.gradeId))).limit(1))[0]) return jsonError("الترم لا يتبع هذا الصف.");
        if (unitId && (!termId || !(await db.select({ id: units.id }).from(units).where(and(eq(units.id, unitId), eq(units.termId, termId))).limit(1))[0])) return jsonError("الوحدة لا تتبع هذا الترم.");
        const videoUrl = txt(b.videoUrl, 1000);
        if (videoUrl && (!videoUrl.startsWith("https://") || !/^https:\/\//.test(videoUrl))) return jsonError("رابط الفيديو يجب أن يبدأ بـ HTTPS.");
        const value = { gradeId: b.gradeId, termId, unitId, title: txt(b.title, 200), description: txt(b.description, 5000), videoUrl: videoUrl || null, sortOrder: pos(b.sortOrder), published: bool(b.published), freePreview: bool(b.freePreview) };
        let newlyPublished = false;
        if (action === "createLecture") { await db.insert(lectures).values(value); newlyPublished = value.published; }
        else { if (!idOk(id)) return jsonError("معرّف غير صالح."); const [before] = await db.select({ published: lectures.published }).from(lectures).where(eq(lectures.id, id)).limit(1); await db.update(lectures).set(value).where(eq(lectures.id, id)); newlyPublished = value.published && !before?.published; }
        if (newlyPublished) {
          const recipients = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "student"), eq(users.gradeId, value.gradeId)));
          if (recipients.length) await db.insert(notifications).values(recipients.map(student => ({ userId: student.id, title: "محاضرة جديدة في صفك", body: `أُضيفت محاضرة «${value.title}» إلى محتوى صفك.` })));
        }
        break;
      }
      case "deleteLecture": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(lectures).where(eq(lectures.id, id));
        break;
      }
      case "deleteAsset": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(assets).where(eq(assets.id, id));
        break;
      }
      case "createExam":
      case "updateExam": {
        if (!idOk(b.gradeId) || !txt(b.title, 200)) return jsonError("حدد الصف واكتب عنوان التقييم.");
        const value = { gradeId: b.gradeId, title: txt(b.title, 200), description: txt(b.description, 5000), kind: b.kind === "homework" ? "homework" as const : "exam" as const, durationMinutes: Math.min(300, Math.max(1, pos(b.durationMinutes, 30))), maxAttempts: Math.min(20, Math.max(1, pos(b.maxAttempts, 1))), startsAt: dateOrNull(b.startsAt), endsAt: dateOrNull(b.endsAt), published: bool(b.published), showReview: bool(b.showReview) };
        if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) return jsonError("تاريخ النهاية يجب أن يكون بعد البداية.");
        if (action === "createExam") await db.insert(exams).values(value);
        else { if (!idOk(id)) return jsonError("معرّف غير صالح."); await db.update(exams).set(value).where(eq(exams.id, id)); }
        break;
      }
      case "deleteExam": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(exams).where(eq(exams.id, id));
        break;
      }
      case "createQuestion": {
        if (!idOk(b.examId) || !txt(b.prompt, 3000)) return jsonError("حدد التقييم واكتب السؤال.");
        const kind = b.kind === "text" ? "text" as const : "mcq" as const;
        const options = Array.isArray(b.options) ? b.options.map((o) => txt(o, 500)).filter(Boolean).slice(0, 6) : [];
        const correctIndex = pos(b.correctIndex);
        if (kind === "mcq" && (options.length < 2 || correctIndex >= options.length)) return jsonError("أضف خيارين على الأقل وحدد الإجابة الصحيحة.");
        await db.insert(questions).values({ examId: b.examId, prompt: txt(b.prompt, 3000), kind, options: kind === "mcq" ? options : [], correctIndex: kind === "mcq" ? correctIndex : null, points: Math.min(100, Math.max(1, pos(b.points, 1))), sortOrder: pos(b.sortOrder) });
        break;
      }
      case "deleteQuestion": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(questions).where(eq(questions.id, id));
        break;
      }
      case "gradeAnswer": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        const [answer] = await db.select({ attemptId: attemptAnswers.attemptId, points: questions.points }).from(attemptAnswers).innerJoin(questions, eq(attemptAnswers.questionId, questions.id)).where(and(eq(attemptAnswers.id, id), eq(questions.kind, "text"))).limit(1);
        if (!answer) return jsonError("الإجابة غير موجودة.");
        const awarded = pos(b.awarded);
        if (awarded > answer.points) return jsonError("الدرجة أعلى من درجة السؤال.");
        await db.update(attemptAnswers).set({ awarded, feedback: txt(b.feedback, 1000) }).where(eq(attemptAnswers.id, id));
        const all = await db.select({ awarded: attemptAnswers.awarded }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, answer.attemptId));
        await db.update(attempts).set({ score: all.reduce((sum, a) => sum + (a.awarded || 0), 0), status: all.every(a => a.awarded !== null) ? "graded" : "pending_review" }).where(eq(attempts.id, answer.attemptId));
        break;
      }
      case "createCode": {
        if (!idOk(b.gradeId)) return jsonError("حدد الصف.");
        const durationDays = pos(b.durationDays);
        if (durationDays < 1 || durationDays > 730) return jsonError("المدة من يوم واحد إلى 730 يوماً.");
        const raw = `EMAD-${randomBytes(12).toString("hex").toUpperCase().match(/.{1,4}/g)!.join("-")}`;
        await db.insert(activationCodes).values({ codeHash: digest(raw), gradeId: b.gradeId, durationDays, expiresAt: dateOrNull(b.expiresAt), createdBy: user.id });
        extra = { code: raw };
        message = "تم إنشاء الكود. انسخه الآن؛ لن يُعرض مرة أخرى.";
        break;
      }
      case "revokeCode": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.update(activationCodes).set({ revokedAt: new Date() }).where(and(eq(activationCodes.id, id), isNull(activationCodes.usedAt)));
        break;
      }
      case "manualActivate": {
        if (!idOk(b.studentId) || !idOk(b.gradeId)) return jsonError("حدد الطالب والصف.");
        const days = pos(b.durationDays);
        if (days < 1 || days > 730) return jsonError("المدة من يوم واحد إلى 730 يوماً.");
        const result = await db.transaction(async (tx) => {
          const [student] = await tx.select({ id: users.id }).from(users)
            .where(and(eq(users.id, b.studentId), eq(users.role, "student"))).limit(1).for("update");
          if (!student) return { error: "الطالب غير موجود." as const };
          const [grade] = await tx.select({ id: grades.id }).from(grades)
            .where(eq(grades.id, b.gradeId)).limit(1);
          if (!grade) return { error: "الصف المحدد غير موجود." as const };
          const now = new Date();
          const [active] = await tx.select({ endsAt: subscriptions.endsAt }).from(subscriptions)
            .where(and(eq(subscriptions.userId, student.id), eq(subscriptions.gradeId, b.gradeId), sql`${subscriptions.endsAt} > ${now}`))
            .orderBy(desc(subscriptions.endsAt)).limit(1);
          // Preserve any remaining time: the new period starts when the current one ends.
          const startsAt = active && active.endsAt > now ? active.endsAt : now;
          const endsAt = new Date(startsAt.getTime() + days * 86400000);
          await tx.insert(subscriptions).values({ userId: student.id, gradeId: b.gradeId, startsAt, endsAt, source: "manual" });
          await tx.update(users).set({ gradeId: b.gradeId }).where(eq(users.id, student.id));
          return { endsAt };
        });
        if ("error" in result) return jsonError(result.error, 404);
        extra = { endsAt: result.endsAt };
        message = "تم تفعيل اشتراك الطالب مع الحفاظ على المدة المتبقية من اشتراكه السابق.";
        break;
      }
      case "createAnnouncement": {
        if (!txt(b.title, 200) || !txt(b.body, 3000)) return jsonError("اكتب عنوان الإعلان ومحتواه.");
        await db.insert(announcements).values({ title: txt(b.title, 200), body: txt(b.body, 3000), published: bool(b.published) });
        break;
      }
      case "deleteAnnouncement": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(announcements).where(eq(announcements.id, id));
        break;
      }
      case "createNotification": {
        if (!txt(b.title, 200) || !txt(b.body, 3000)) return jsonError("اكتب عنوان الإشعار ومحتواه.");
        if (b.userId && !idOk(b.userId)) return jsonError("معرّف الطالب غير صالح.");
        await db.insert(notifications).values({ title: txt(b.title, 200), body: txt(b.body, 3000), userId: idOk(b.userId) ? b.userId : null });
        break;
      }
      case "deleteNotification": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(notifications).where(eq(notifications.id, id));
        break;
      }
      case "updateSettings": {
        const allowed = ["teacher_bio", "contact_email", "contact_url"] as const;
        if (!allowed.includes(b.key as typeof allowed[number])) return jsonError("إعداد غير معروف.");
        const value = txt(b.value, b.key === "teacher_bio" ? 2000 : 500);
        if (b.key === "contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return jsonError("البريد الإلكتروني غير صالح.");
        if (b.key === "contact_url" && value && !value.startsWith("https://")) return jsonError("الرابط يجب أن يبدأ بـ HTTPS.");
        await db.insert(siteSettings).values({ key: String(b.key), value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
        break;
      }
      case "deleteStudent": {
        if (!idOk(id)) return jsonError("معرّف غير صالح.");
        await db.delete(users).where(and(eq(users.id, id), eq(users.role, "student")));
        break;
      }
      default: return jsonError("إجراء غير معروف.", 404);
    }
    await log(user.id, action, idOk(id) ? id : idOk(b.studentId) ? b.studentId : "");
    return Response.json({ ok: true, message, ...extra });
  } catch (error) {
    console.error("Admin operation failed", error);
    const message = error instanceof Error && !/violates|invalid input|duplicate|syntax|relation/i.test(error.message) && error.message.length < 150 ? error.message : "تعذر إتمام العملية. تحقق من البيانات والارتباطات.";
    return jsonError(message, 400);
  }
}
