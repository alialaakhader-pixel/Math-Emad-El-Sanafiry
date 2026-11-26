"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activationCodes,
  announcements,
  assignments,
  examAttempts,
  exams,
  grades,
  lectureProgress,
  lectures,
  modules,
  notifications,
  questions,
  submissions,
  subscriptions,
  users,
} from "@/db/schema";
import {
  createSession,
  destroyCurrentSession,
  generateActivationCode,
  getCurrentUser,
  hashPassword,
  logActivity,
  requireUser,
  revokeSession,
  sha256,
  verifyPassword,
} from "@/lib/auth";

/* ─────────────────────────── helpers ─────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(path: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  if (!qs) redirect(path);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${qs}`);
}



function readString(fd: FormData, key: string, max = 500): string {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return "كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل.";
  return null;
}

/* ─────────────────────────── auth actions ─────────────────────────── */

export async function registerAction(formData: FormData) {
  const fullName = readString(formData, "fullName", 120);
  const email = readString(formData, "email", 160).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const gradeRaw = readString(formData, "gradeId", 12);

  if (fullName.length < 3) back("/register", { error: "يرجى إدخال الاسم الثلاثي بشكل صحيح." });
  if (!EMAIL_RE.test(email)) back("/register", { error: "البريد الإلكتروني غير صالح." });
  const pwError = validatePassword(password);
  if (pwError) back("/register", { error: pwError });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) back("/register", { error: "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول." });

  const gradeId = gradeRaw ? Number(gradeRaw) : null;
  const [row] = await db
    .insert(users)
    .values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      role: "student",
      gradeId: Number.isFinite(gradeId) ? gradeId : null,
    })
    .returning({ id: users.id });

  await createSession(row.id);
  await logActivity(row.id, "auth.register", { email });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = readString(formData, "email", 160).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = readString(formData, "next", 200) || "/dashboard";

  if (!EMAIL_RE.test(email) || !password) back("/login", { error: "بيانات الدخول غير مكتملة." });

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await logActivity(user?.id ?? null, "auth.login_failed", { email });
    back("/login", { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
  }
  if (!user.isActive) back("/login", { error: "هذا الحساب موقوف. تواصل مع إدارة المنصة." });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await logActivity(user.id, "auth.login", { email });
  redirect(user.role === "teacher" ? "/admin" : nextPath.startsWith("/") ? nextPath : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) await logActivity(user.id, "auth.logout", null);
  redirect("/");
}

export async function revokeSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = readString(formData, "sessionId", 60);
  await revokeSession(sessionId, user.id);
  await logActivity(user.id, "session.revoke", { sessionId });
  back("/dashboard", { msg: "تم تسجيل الخروج من الجهاز المحدد." });
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const fullName = readString(formData, "fullName", 120);
  const phone = readString(formData, "phone", 30);
  const gradeRaw = readString(formData, "gradeId", 12);
  if (fullName.length < 3) back("/dashboard", { error: "الاسم غير صالح." });

  await db
    .update(users)
    .set({
      fullName,
      phone: phone || null,
      gradeId: gradeRaw ? Number(gradeRaw) : null,
    })
    .where(eq(users.id, user.id));
  await logActivity(user.id, "profile.update", { fullName });
  back("/dashboard", { msg: "تم حفظ بيانات الملف الشخصي." });
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const target = "/admin";

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row || !verifyPassword(current, row.passwordHash)) {
    back(target, { error: "كلمة المرور الحالية غير صحيحة." });
  }
  const pwError = validatePassword(next);
  if (pwError) back(target, { error: pwError });

  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, user.id));
  await logActivity(user.id, "auth.password_change", null);
  back(target, { msg: "تم تغيير كلمة المرور بنجاح." });
}

/* ─────────────────────────── subscriptions & codes ─────────────────────────── */

export async function activateCodeAction(formData: FormData) {
  const user = await requireUser("student");
  const code = readString(formData, "code", 40).toUpperCase();
  const target = "/dashboard";

  const [me] = await db
    .select({ codeAttempts: users.codeAttempts, lockedUntil: users.lockedUntil })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (me?.lockedUntil && me.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((me.lockedUntil.getTime() - Date.now()) / 60000);
    back(target, {
      error: `تم إيقاف محاولات التفعيل مؤقتاً للأمان. حاول بعد ${minutes} دقيقة.`,
    });
  }
  if (!/^SAN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    back(target, { error: "صيغة الكود غير صحيحة. النموذج: SAN-XXXX-XXXX-XXXX" });
  }

  const [found] = await db
    .select()
    .from(activationCodes)
    .where(eq(activationCodes.codeHash, sha256(code)))
    .limit(1);

  const failAttempt = async (message: string) => {
    const attempts = (me?.codeAttempts ?? 0) + 1;
    const locked = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db
      .update(users)
      .set({ codeAttempts: locked ? 0 : attempts, lockedUntil: locked })
      .where(eq(users.id, user.id));
    await logActivity(user.id, "code.failed_attempt", { attempts });
    back(target, { error: message });
  };

  if (!found) return failAttempt("هذا الكود غير مسجّل في المنصة.");
  if (found.status === "revoked") return failAttempt("تم إلغاء هذا الكود من إدارة المنصة.");
  if (found.status === "used") return failAttempt("هذا الكود تم استخدامه بالفعل.");
  if (found.expiresAt && found.expiresAt.getTime() < Date.now())
    return failAttempt("انتهت صلاحية هذا الكود.");

  const now = new Date();
  const endsAt = new Date(now.getTime() + found.durationDays * 24 * 60 * 60 * 1000);

  let taken = false;
  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(activationCodes)
        .set({ status: "used", usedByUserId: user.id, usedAt: now })
        .where(and(eq(activationCodes.id, found.id), eq(activationCodes.status, "active")))
        .returning({ id: activationCodes.id });
      if (updated.length === 0) throw new Error("CODE_TAKEN");

    await tx.insert(subscriptions).values({
      userId: user.id,
      gradeId: found.gradeId,
      source: "code",
      codeId: found.id,
      startsAt: now,
      endsAt,
      createdById: found.createdById,
      note: `تفعيل بكود ينتهي بـ ${found.codeLast4}`,
    });

    if (found.gradeId) {
      await tx.update(users).set({ gradeId: found.gradeId }).where(eq(users.id, user.id));
    }
    await tx
      .update(users)
      .set({ codeAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
      await tx.insert(notifications).values({
        userId: user.id,
        kind: "subscription",
        title: "تم تفعيل اشتراكك",
        body: `أصبح اشتراكك سارياً حتى ${endsAt.toLocaleDateString("ar-EG")}.`,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CODE_TAKEN") {
      taken = true;
    } else {
      throw error;
    }
  }
  if (taken) await failAttempt("تم استخدام هذا الكود في اللحظة الأخيرة.");

  await logActivity(user.id, "code.redeemed", { codeLast4: found.codeLast4 });
  revalidatePath("/dashboard");
  back(target, { msg: "تم تفعيل الاشتراك بنجاح — أهلاً بك!" });
}

export async function manualActivateAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const studentId = readString(formData, "studentId", 60);
  const gradeRaw = readString(formData, "gradeId", 12);
  const days = Math.max(1, Math.min(720, Number(readString(formData, "days", 6)) || 30));

  const [student] = await db
    .select({ id: users.id, fullName: users.fullName, gradeId: users.gradeId })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")))
    .limit(1);
  if (!student) back("/admin", { error: "لم يتم العثور على طالب بهذا المعرف." });

  const now = new Date();
  const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const gradeId = gradeRaw ? Number(gradeRaw) : student.gradeId;

  await db.insert(subscriptions).values({
    userId: student.id,
    gradeId: gradeId ?? null,
    source: "manual",
    startsAt: now,
    endsAt,
    createdById: teacher.id,
    note: "تفعيل يدوي من لوحة المدرس",
  });
  if (gradeId) await db.update(users).set({ gradeId }).where(eq(users.id, student.id));
  await db.insert(notifications).values({
    userId: student.id,
    kind: "subscription",
    title: "تم تفعيل اشتراكك يدوياً",
    body: `فعّل المدرس اشتراكك لمدة ${days} يوماً.`,
  });
  await logActivity(teacher.id, "subscription.manual_activate", { studentId, days });
  revalidatePath("/admin");
  back("/admin", { msg: `تم تفعيل اشتراك ${student.fullName} لمدة ${days} يوماً.` });
}

export async function generateCodesAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const count = Math.max(1, Math.min(50, Number(readString(formData, "count", 4)) || 1));
  const days = Math.max(1, Math.min(720, Number(readString(formData, "days", 6)) || 30));
  const gradeRaw = readString(formData, "gradeId", 12);
  const note = readString(formData, "note", 160);

  const plain: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const code = generateActivationCode();
    plain.push(code);
    await db.insert(activationCodes).values({
      codeHash: sha256(code),
      codeLast4: code.slice(-4),
      gradeId: gradeRaw ? Number(gradeRaw) : null,
      durationDays: days,
      note: note || null,
      createdById: teacher.id,
    });
  }
  await logActivity(teacher.id, "code.generate", { count, days });
  revalidatePath("/admin");
  redirect(`/admin?tab=codes&created=${encodeURIComponent(plain.join(" "))}`);
}

export async function revokeCodeAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const codeId = readString(formData, "codeId", 60);
  await db
    .update(activationCodes)
    .set({ status: "revoked" })
    .where(and(eq(activationCodes.id, codeId), eq(activationCodes.status, "active")));
  await logActivity(teacher.id, "code.revoke", { codeId });
  revalidatePath("/admin");
  back("/admin?tab=codes", { msg: "تم إلغاء الكود." });
}

/* ─────────────────────────── content management ─────────────────────────── */

export async function ensureDefaultGradesAction() {
  const teacher = await requireUser("teacher");
  const defaults = [
    { stage: "البكالوريا", name: "أولى بكالوريا", shortName: "أولى بكالوريا", sortOrder: 1 },
    { stage: "البكالوريا", name: "تانية بكالوريا", shortName: "تانية بكالوريا", sortOrder: 2 },
    { stage: "الثانوية العامة", name: "تالتة ثانوي", shortName: "تالتة ثانوي", sortOrder: 3 },
  ];

  for (const grade of defaults) {
    const existing = await db.select({ id: grades.id }).from(grades).where(eq(grades.name, grade.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(grades).values(grade);
    }
  }

  await logActivity(teacher.id, "grades.ensure_defaults", { grades: defaults.map((g) => g.name) });
  revalidatePath("/admin");
  revalidatePath("/register");
  revalidatePath("/");
  back("/admin?tab=content", { msg: "تم تجهيز الصفوف الدراسية الأساسية، ويمكنك الآن إضافة الوحدات والمحاضرات لكل صف." });
}

export async function createModuleAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const gradeId = Number(readString(formData, "gradeId", 12));
  const term = readString(formData, "term", 60);
  const title = readString(formData, "title", 160);
  const description = readString(formData, "description", 600);

  if (!Number.isFinite(gradeId) || !title || !term)
    back("/admin?tab=content", { error: "يرجى إدخال الصف والترم وعنوان الوحدة." });

  await db.insert(modules).values({ gradeId, term, title, description: description || null });
  await logActivity(teacher.id, "module.create", { gradeId, title });
  revalidatePath("/admin");
  back("/admin?tab=content", { msg: "تمت إضافة الوحدة." });
}

export async function createLectureAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const moduleId = Number(readString(formData, "moduleId", 12));
  const title = readString(formData, "title", 160);
  const summary = readString(formData, "summary", 800);
  const videoUrl = readString(formData, "videoUrl", 600);
  const pdfUrl = readString(formData, "pdfUrl", 600);
  const duration = Number(readString(formData, "durationMinutes", 6)) || null;
  const isPublished = formData.get("isPublished") === "on";

  if (!Number.isFinite(moduleId) || !title)
    back("/admin?tab=content", { error: "يرجى اختيار الوحدة وإدخال عنوان المحاضرة." });

  await db.insert(lectures).values({
    moduleId,
    title,
    summary: summary || null,
    videoUrl: videoUrl || null,
    pdfUrl: pdfUrl || null,
    durationMinutes: duration,
    isPublished,
  });
  await logActivity(teacher.id, "lecture.create", { moduleId, title });
  revalidatePath("/admin");
  revalidatePath("/");
  back("/admin?tab=content", { msg: "تمت إضافة المحاضرة." });
}

export async function toggleLectureAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const lectureId = readString(formData, "lectureId", 60);
  const [row] = await db
    .select({ isPublished: lectures.isPublished })
    .from(lectures)
    .where(eq(lectures.id, lectureId))
    .limit(1);
  if (row) {
    await db
      .update(lectures)
      .set({ isPublished: !row.isPublished })
      .where(eq(lectures.id, lectureId));
    await logActivity(teacher.id, "lecture.toggle_publish", { lectureId });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  back("/admin?tab=content", { msg: "تم تحديث حالة النشر." });
}

export async function deleteLectureAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const lectureId = readString(formData, "lectureId", 60);
  await db.delete(lectures).where(eq(lectures.id, lectureId));
  await logActivity(teacher.id, "lecture.delete", { lectureId });
  revalidatePath("/admin");
  revalidatePath("/");
  back("/admin?tab=content", { msg: "تم حذف المحاضرة." });
}

/* ─────────────────────────── exams & assignments ─────────────────────────── */

export async function createExamAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const title = readString(formData, "title", 160);
  const description = readString(formData, "description", 800);
  const gradeRaw = readString(formData, "gradeId", 12);
  const duration = Math.max(5, Math.min(240, Number(readString(formData, "durationMinutes", 6)) || 45));
  const maxAttempts = Math.max(1, Math.min(10, Number(readString(formData, "maxAttempts", 4)) || 1));
  const allowReview = formData.get("allowReview") === "on";
  const isPublished = formData.get("isPublished") === "on";
  const closesRaw = readString(formData, "closesAt", 40);

  if (!title) back("/admin?tab=exams", { error: "يرجى إدخال عنوان الاختبار." });

  const [exam] = await db
    .insert(exams)
    .values({
      title,
      description: description || null,
      gradeId: gradeRaw ? Number(gradeRaw) : null,
      durationMinutes: duration,
      maxAttempts,
      allowReview,
      isPublished,
      opensAt: new Date(),
      closesAt: closesRaw ? new Date(closesRaw) : null,
    })
    .returning({ id: exams.id });

  // one starter MCQ so the exam is immediately usable and extendable
  await db.insert(questions).values({
    examId: exam.id,
    type: "mcq",
    prompt: "سؤال تجريبي: ما ناتج ٢ + ٢ × ٢ ؟",
    options: ["٦", "٨", "٤", "١٠"],
    correctAnswer: "٦",
    marks: 1,
    sortOrder: 1,
  });

  await logActivity(teacher.id, "exam.create", { examId: exam.id, title });
  revalidatePath("/admin");
  back("/admin?tab=exams", { msg: "تم إنشاء الاختبار مع سؤال أول يمكنك تعديله." });
}

export async function addQuestionAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const examId = readString(formData, "examId", 60);
  const type = readString(formData, "type", 12) === "essay" ? "essay" : "mcq";
  const prompt = readString(formData, "prompt", 1200);
  const marks = Math.max(1, Math.min(20, Number(readString(formData, "marks", 4)) || 1));
  const correctAnswer = readString(formData, "correctAnswer", 400);
  const optionsRaw = readString(formData, "options", 1200);

  if (!examId || !prompt) back("/admin?tab=exams", { error: "يرجى إدخال نص السؤال." });

  const options = optionsRaw
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (type === "mcq" && options.length < 2)
    back("/admin?tab=exams", { error: "سؤال الاختيار من متعدد يحتاج خيارين على الأقل." });

  await db.insert(questions).values({
    examId,
    type,
    prompt,
    options: type === "mcq" ? options : null,
    correctAnswer: correctAnswer || null,
    marks,
    sortOrder: options.length + 2,
  });
  await logActivity(teacher.id, "question.create", { examId });
  revalidatePath("/admin");
  back("/admin?tab=exams", { msg: "تمت إضافة السؤال." });
}

export async function createAssignmentAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const title = readString(formData, "title", 160);
  const description = readString(formData, "description", 1200);
  const gradeRaw = readString(formData, "gradeId", 12);
  const dueRaw = readString(formData, "dueAt", 40);
  const isPublished = formData.get("isPublished") === "on";
  if (!title) back("/admin?tab=assignments", { error: "يرجى إدخال عنوان الواجب." });

  await db.insert(assignments).values({
    title,
    description: description || null,
    gradeId: gradeRaw ? Number(gradeRaw) : null,
    dueAt: dueRaw ? new Date(dueRaw) : null,
    isPublished,
  });
  await logActivity(teacher.id, "assignment.create", { title });
  revalidatePath("/admin");
  back("/admin?tab=assignments", { msg: "تمت إضافة الواجب." });
}

export async function gradeSubmissionAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const submissionId = readString(formData, "submissionId", 60);
  const grade = Number(readString(formData, "grade", 6));
  const feedback = readString(formData, "feedback", 1200);
  if (!Number.isFinite(grade)) back("/admin?tab=assignments", { error: "يرجى إدخال درجة صحيحة." });

  await db
    .update(submissions)
    .set({ grade, feedback: feedback || null })
    .where(eq(submissions.id, submissionId));
  await logActivity(teacher.id, "submission.grade", { submissionId, grade });
  revalidatePath("/admin");
  back("/admin?tab=assignments", { msg: "تم حفظ التقييم." });
}

/* ─────────────────────────── messaging ─────────────────────────── */

export async function sendNotificationAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const target = readString(formData, "target", 200);
  const title = readString(formData, "title", 160);
  const body = readString(formData, "body", 1200);
  const kind = readString(formData, "kind", 20) as "info" | "announcement" | "lecture" | "exam";
  if (!title || !body) back("/admin?tab=notify", { error: "يرجى إدخال العنوان والنص." });

  if (target === "all") {
    const all = await db.select({ id: users.id }).from(users).where(eq(users.role, "student"));
    if (all.length === 0) {
      back("/admin?tab=notify", { error: "لا يوجد طلاب مسجّلون لإرسال الإشعار إليهم." });
    }
    await db.insert(
      notifications
    ).values(all.map((u) => ({ userId: u.id, kind, title, body })));
    await logActivity(teacher.id, "notification.broadcast", { count: all.length });
  } else {
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, target), eq(users.role, "student")))
      .limit(1);
    if (!student) back("/admin?tab=notify", { error: "لم يتم العثور على طالب بهذا المعرف." });
    await db.insert(notifications).values({ userId: student.id, kind, title, body });
    await logActivity(teacher.id, "notification.send", { target });
  }
  revalidatePath("/admin");
  back("/admin?tab=notify", { msg: "تم إرسال الإشعار." });
}

export async function postAnnouncementAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const title = readString(formData, "title", 160);
  const body = readString(formData, "body", 1200);
  const isPinned = formData.get("isPinned") === "on";
  if (!title || !body) back("/admin?tab=notify", { error: "يرجى إدخال عنوان الإعلان ونصه." });

  await db.insert(announcements).values({ title, body, isPinned });
  await logActivity(teacher.id, "announcement.create", { title });
  revalidatePath("/");
  revalidatePath("/admin");
  back("/admin?tab=notify", { msg: "تم نشر الإعلان في الصفحة الرئيسية." });
}

export async function toggleAnnouncementAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const id = readString(formData, "id", 60);
  const [row] = await db
    .select({ isActive: announcements.isActive })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (row) await db.update(announcements).set({ isActive: !row.isActive }).where(eq(announcements.id, id));
  await logActivity(teacher.id, "announcement.toggle", { id });
  revalidatePath("/");
  back("/admin?tab=notify", { msg: "تم تحديث حالة الإعلان." });
}

/* ─────────────────────────── student learning ─────────────────────────── */

export async function markLectureCompleteAction(formData: FormData) {
  const user = await requireUser("student");
  const lectureId = readString(formData, "lectureId", 60);
  const now = new Date();

  await db
    .insert(lectureProgress)
    .values({ userId: user.id, lectureId, watchedSeconds: 0, completedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [lectureProgress.userId, lectureProgress.lectureId],
      set: { completedAt: now, updatedAt: now },
    });
  await logActivity(user.id, "lecture.complete", { lectureId });
  revalidatePath("/dashboard");
  back("/dashboard", { msg: "تم تسجيل المحاضرة كمكتملة." });
}

export async function submitAssignmentAction(formData: FormData) {
  const user = await requireUser("student");
  const assignmentId = readString(formData, "assignmentId", 60);
  const body = readString(formData, "body", 4000);
  const fileUrl = readString(formData, "fileUrl", 600);
  if (!body && !fileUrl) back("/dashboard", { error: "اكتب إجابتك أو أضف رابط الملف." });

  await db
    .insert(submissions)
    .values({ assignmentId, userId: user.id, body: body || null, fileUrl: fileUrl || null })
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.userId],
      set: { body: body || null, fileUrl: fileUrl || null, submittedAt: new Date(), grade: null, feedback: null },
    });
  await logActivity(user.id, "assignment.submit", { assignmentId });
  back("/dashboard", { msg: "تم إرسال إجابة الواجب." });
}

export async function submitExamAction(formData: FormData) {
  const user = await requireUser("student");
  const examId = readString(formData, "examId", 60);

  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam || !exam.isPublished) back("/dashboard", { error: "هذا الاختبار غير متاح." });
  if (exam.closesAt && exam.closesAt.getTime() < Date.now())
    back("/dashboard", { error: "انتهى وقت الاختبار." });

  const attempts = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, user.id)));
  if (attempts.length >= exam.maxAttempts)
    back("/dashboard", { error: "استنفدت عدد المحاولات المسموح بها لهذا الاختبار." });

  const bank = await db.select().from(questions).where(eq(questions.examId, examId));
  if (bank.length === 0) back("/dashboard", { error: "لا توجد أسئلة في هذا الاختبار بعد." });

  const answers: Record<string, string> = {};
  for (const q of bank) {
    const value = formData.get(`q_${q.id}`);
    if (typeof value === "string") answers[q.id] = value.trim().slice(0, 2000);
  }

  let score = 0;
  let maxScore = 0;
  let needsManual = false;
  for (const q of bank) {
    if (q.type === "mcq") {
      maxScore += q.marks;
      const given = answers[q.id] ?? "";
      if (q.correctAnswer && given && given === q.correctAnswer) score += q.marks;
    } else {
      maxScore += q.marks;
      needsManual = true;
    }
  }

  const [attempt] = await db
    .insert(examAttempts)
    .values({
      examId,
      userId: user.id,
      answers,
      score,
      maxScore,
      submittedAt: new Date(),
      isGraded: !needsManual,
    })
    .returning({ id: examAttempts.id });

  await logActivity(user.id, "exam.submit", { examId, attemptId: attempt.id, score });
  revalidatePath("/dashboard");
  redirect(`/exam/${examId}?result=${attempt.id}`);
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.isRead)));
  revalidatePath("/dashboard");
  back("/dashboard", { msg: "تم تعليم جميع الإشعارات كمقروءة." });
}

export async function deleteAssignmentAction(formData: FormData) {
  const teacher = await requireUser("teacher");
  const id = readString(formData, "id", 60);
  await db.delete(assignments).where(eq(assignments.id, id));
  await logActivity(teacher.id, "assignment.delete", { id });
  revalidatePath("/admin");
  back("/admin?tab=assignments", { msg: "تم حذف الواجب." });
}


