import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Laptop,
  LogOut,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { db } from "@/db";
import {
  assignments,
  examAttempts,
  exams,
  grades,
  lectureProgress,
  lectures,
  modules,
  notifications,
  sessions,
  submissions,
  subscriptions,
  users,
} from "@/db/schema";
import AppHeader from "@/components/AppHeader";
import { FormMessage } from "@/components/AuthLayout";
import { EmptyPlate } from "@/components/landing/Sections";
import {
  activateCodeAction,
  logoutAction,
  markLectureCompleteAction,
  markNotificationsReadAction,
  revokeSessionAction,
  submitAssignmentAction,
  updateProfileAction,
} from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AR = new Intl.NumberFormat("ar-EG");
const AR_DATE = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" });
const AR_TIME = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" });

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user)
    redirect(`/login?error=${encodeURIComponent("يرجى تسجيل الدخول للوصول إلى لوحة الطالب.")}`);
  if (user.role === "teacher") redirect("/admin");

  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);

  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.endsAt));
  const activeSub = subs.find((s) => s.endsAt.getTime() > Date.now()) ?? null;
  const gradeId = activeSub?.gradeId ?? user.gradeId ?? null;

  const moduleRows = gradeId
    ? await db
        .select()
        .from(modules)
        .where(eq(modules.gradeId, gradeId))
        .orderBy(modules.sortOrder)
    : [];

  const moduleIds = moduleRows.map((m) => m.id);
  const lectureRows = moduleIds.length
    ? await db
        .select()
        .from(lectures)
        .where(and(inArray(lectures.moduleId, moduleIds), eq(lectures.isPublished, true)))
        .orderBy(lectures.sortOrder)
    : [];

  const progressRows = await db
    .select()
    .from(lectureProgress)
    .where(eq(lectureProgress.userId, user.id));
  const completedIds = new Set(
    progressRows.filter((p) => p.completedAt).map((p) => p.lectureId)
  );
  const totalLectures = lectureRows.length;
  const completed = lectureRows.filter((l) => completedIds.has(l.id)).length;
  const percent = totalLectures > 0 ? Math.round((completed / totalLectures) * 100) : 0;

  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.isPublished, true), sql`${exams.gradeId} is null or ${exams.gradeId} = ${gradeId ?? -1}`))
    .orderBy(desc(exams.createdAt));

  const attemptRows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.userId, user.id))
    .orderBy(desc(examAttempts.startedAt));
  const attemptsByExam = new Map<string, number>();
  for (const a of attemptRows) attemptsByExam.set(a.examId, (attemptsByExam.get(a.examId) ?? 0) + 1);

  const assignmentRows = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.isPublished, true), sql`${assignments.gradeId} is null or ${assignments.gradeId} = ${gradeId ?? -1}`))
    .orderBy(desc(assignments.createdAt));

  const submissionRows = assignmentRows.length
    ? await db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.userId, user.id),
            inArray(
              submissions.assignmentId,
              assignmentRows.map((a) => a.id)
            )
          )
        )
    : [];
  const submissionByAssignment = new Map(submissionRows.map((s) => [s.assignmentId, s]));

  const notifRows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(12);
  const unread = notifRows.filter((n) => !n.isRead).length;

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), isNotNull(sessions.createdAt)))
    .orderBy(desc(sessions.lastSeenAt));

  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader user={user} label="لوحة الطالب" backHref="/" />

      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="plate-label">STUDENT DASHBOARD</span>
            <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
              أهلاً {user.fullName.split(" ")[0]} 👋
            </h1>
            <p className="mt-3 text-[0.95rem] leading-[2] text-ink-soft">
              كل ما تحتاجه في مكان واحد: المحاضرات، الواجبات، الاختبارات، واشتراكك.
            </p>
          </div>
          <FormMessage error={params.error} msg={params.msg} />
        </div>

        {/* ── overview ── */}
        <section className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="glass p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="plate-label">PROGRESS</span>
                <h2 className="mt-2 text-xl font-bold text-ink">تقدّمك في المنهج</h2>
              </div>
              <span className="tnum text-3xl text-accent">{AR.format(percent)}٪</span>
            </div>
            <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#4fe3e8] to-[#6d4aff] transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-8">
              <Stat label="محاضرة مكتملة" value={AR.format(completed)} />
              <Stat label="إجمالي المحاضرات المتاحة" value={totalLectures > 0 ? AR.format(totalLectures) : "—"} />
              <Stat label="اختبارات متاحة" value={examRows.length > 0 ? AR.format(examRows.length) : "—"} />
            </div>
          </div>

          <div
            className={`rounded-[22px] border p-8 ${
              activeSub
                ? "border-[rgba(79,227,165,0.35)] bg-[rgba(79,227,165,0.08)]"
                : "border-[rgba(255,107,129,0.32)] bg-[rgba(255,107,129,0.08)]"
            }`}
          >
            <span className="plate-label">SUBSCRIPTION</span>
            {activeSub ? (
              <>
                <h2 className="mt-3 text-xl font-bold text-ink">اشتراكك فعّال</h2>
                <p className="mt-3 text-[0.92rem] leading-[1.95] text-ink-soft">
                  ينتهي في <span className="tnum text-ink">{AR_DATE.format(activeSub.endsAt)}</span>
                </p>
                <p className="mt-2 text-[0.82rem] text-ink-faint">
                  مصدر التفعيل: {activeSub.source === "code" ? "كود تفعيل" : "تفعيل يدوي من المدرس"}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-xl font-bold text-ink">لا يوجد اشتراك فعّال</h2>
                <p className="mt-3 text-[0.92rem] leading-[1.95] text-ink-soft">
                  أدخل كود التفعيل للوصول إلى محتوى صفّك، أو تواصل مع المدرس للتفعيل المباشر بمعرّفك.
                </p>
                <p className="mt-3 text-[0.82rem] text-ink-faint">
                  معرّف الطالب الخاص بك: <span className="tnum text-accent">{user.id.slice(0, 8)}</span>
                </p>
              </>
            )}

            <form action={activateCodeAction} className="mt-6 flex flex-wrap gap-3">
              <input
                name="code"
                dir="ltr"
                placeholder="SAN-XXXX-XXXX-XXXX"
                className="field flex-1 text-left"
                aria-label="كود التفعيل"
                required
              />
              <button type="submit" className="btn btn-primary px-6">
                <KeyRound size={17} />
                تفعيل
              </button>
            </form>
          </div>
        </section>

        {/* ── lectures ── */}
        <section id="lectures" className="mt-14">
          <SectionTitle icon={<BookOpen size={20} />} title="المحاضرات" hint="مرتبة حسب الوحدة والترم" />
          {lectureRows.length === 0 ? (
            <EmptyPlate
              icon={<PlayCircle size={22} />}
              title="لا توجد محاضرات متاحة لك حالياً"
              body="يظهر المحتوى هنا فور نشر المدرس محاضرات لصفّك. تأكد من اختيار الصف الصحيح في ملفك الشخصي، أو فعّل اشتراكك."
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {moduleRows.map((mod) => {
                const items = lectureRows.filter((l) => l.moduleId === mod.id);
                if (items.length === 0) return null;
                return (
                  <div key={mod.id} className="glass overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
                      <h3 className="text-lg font-bold text-ink">{mod.title}</h3>
                      <span className="chip">{mod.term}</span>
                    </div>
                    <ul className="divide-y divide-[var(--line)]">
                      {items.map((lecture) => {
                        const done = completedIds.has(lecture.id);
                        return (
                          <li key={lecture.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
                            <div className="flex items-start gap-4">
                              <span
                                className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                                  done
                                    ? "border-[rgba(79,227,165,0.5)] text-[var(--ok)]"
                                    : "border-line text-ink-faint"
                                }`}
                              >
                                {done ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                              </span>
                              <div>
                                <h4 className="text-base font-bold text-ink">{lecture.title}</h4>
                                {lecture.summary ? (
                                  <p className="mt-1 max-w-2xl text-[0.86rem] leading-[1.9] text-ink-soft">
                                    {lecture.summary}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.78rem] text-ink-faint">
                                  {lecture.durationMinutes ? (
                                    <span className="tnum">{AR.format(lecture.durationMinutes)} دقيقة</span>
                                  ) : null}
                                  {lecture.pdfUrl ? (
                                    <a
                                      href={lecture.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-accent underline underline-offset-4"
                                    >
                                      المذكرة (PDF)
                                    </a>
                                  ) : null}
                                  {lecture.videoUrl && activeSub ? (
                                    <a
                                      href={lecture.videoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-accent underline underline-offset-4"
                                    >
                                      مشاهدة المحاضرة
                                    </a>
                                  ) : null}
                                  {lecture.videoUrl && !activeSub ? (
                                    <span className="text-[var(--danger)]">يتطلب اشتراكاً فعّالاً</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <form action={markLectureCompleteAction}>
                              <input type="hidden" name="lectureId" value={lecture.id} />
                              <button
                                type="submit"
                                disabled={done}
                                className={`btn px-5 py-2.5 text-sm ${done ? "btn-ghost" : "btn-primary"}`}
                              >
                                {done ? "مكتملة ✓" : "تعليم كمكتملة"}
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── assignments & exams ── */}
        <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle icon={<ClipboardCheck size={20} />} title="الواجبات" hint="أرسل إجابتك وتابع تقييم المدرس" />
            {assignmentRows.length === 0 ? (
              <EmptyPlate
                compact
                icon={<ClipboardCheck size={22} />}
                title="لا توجد واجبات منشورة"
                body="عندما يضيف المدرس واجباً جديداً سيظهر هنا مع موعد التسليم."
              />
            ) : (
              <div className="mt-6 grid gap-4">
                {assignmentRows.map((assignment) => {
                  const mine = submissionByAssignment.get(assignment.id);
                  return (
                    <article key={assignment.id} className="glass p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-ink">{assignment.title}</h3>
                        {assignment.dueAt ? (
                          <span className="tnum text-xs text-ink-faint">
                            التسليم قبل {AR_DATE.format(assignment.dueAt)}
                          </span>
                        ) : null}
                      </div>
                      {assignment.description ? (
                        <p className="mt-3 text-[0.88rem] leading-[1.95] text-ink-soft">
                          {assignment.description}
                        </p>
                      ) : null}

                      {mine ? (
                        <div className="mt-5 rounded-2xl border border-line p-4 text-[0.85rem] leading-[1.9] text-ink-soft">
                          <p>تم إرسال إجابتك في {AR_TIME.format(mine.submittedAt)}.</p>
                          {mine.grade !== null ? (
                            <p className="mt-2 text-ink">
                              التقييم: <span className="tnum text-accent">{AR.format(mine.grade)}</span>
                              {mine.feedback ? ` — ${mine.feedback}` : ""}
                            </p>
                          ) : (
                            <p className="mt-2 text-ink-faint">بانتظار التصحيح من المدرس.</p>
                          )}
                        </div>
                      ) : null}

                      <form action={submitAssignmentAction} className="mt-5 grid gap-3">
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <textarea
                          name="body"
                          rows={3}
                          className="field"
                          placeholder="اكتب إجابتك هنا (تدعم المعادلات المكتوبة بـ LaTeX)"
                          defaultValue={mine?.body ?? ""}
                        />
                        <input
                          name="fileUrl"
                          dir="ltr"
                          className="field text-left"
                          placeholder="رابط ملف الإجابة (اختياري)"
                          defaultValue={mine?.fileUrl ?? ""}
                        />
                        <button type="submit" className="btn btn-primary justify-self-start px-6 py-2.5 text-sm">
                          {mine ? "تحديث الإجابة" : "إرسال الإجابة"}
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={<ClipboardCheck size={20} />} title="الاختبارات" hint="تصحيح آلي فوري للاختيار من متعدد" />
            {examRows.length === 0 ? (
              <EmptyPlate
                compact
                icon={<ClipboardCheck size={22} />}
                title="لا توجد اختبارات متاحة"
                body="تظهر الاختبارات هنا فور نشرها من لوحة المدرس، مع عدد المحاولات المسموح بها."
              />
            ) : (
              <div className="mt-6 grid gap-4">
                {examRows.map((exam) => {
                  const used = attemptsByExam.get(exam.id) ?? 0;
                  const latest = attemptRows.find((a) => a.examId === exam.id);
                  return (
                    <article key={exam.id} className="glass p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-ink">{exam.title}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.78rem] text-ink-faint">
                            <span className="tnum">{AR.format(exam.durationMinutes)} دقيقة</span>
                            <span>
                              المحاولات:{" "}
                              <span className="tnum">
                                {AR.format(used)} / {AR.format(exam.maxAttempts)}
                              </span>
                            </span>
                            {exam.closesAt ? <span>يغلق {AR_DATE.format(exam.closesAt)}</span> : null}
                          </div>
                        </div>
                        {latest?.score !== undefined && latest.score !== null ? (
                          <div className="text-left">
                            <span className="plate-label">LAST SCORE</span>
                            <p className="tnum text-xl text-accent">
                              {AR.format(latest.score)} / {AR.format(latest.maxScore ?? 0)}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <Link
                        href={`/exam/${exam.id}`}
                        className={`btn mt-5 w-full py-3 ${used >= exam.maxAttempts ? "btn-ghost" : "btn-primary"}`}
                      >
                        {used >= exam.maxAttempts ? "مراجعة المحاولات" : "بدء الاختبار"}
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── notifications ── */}
        <section className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionTitle icon={<Bell size={20} />} title="الإشعارات" hint={unread > 0 ? `${AR.format(unread)} غير مقروء` : "لا توجد إشعارات جديدة"} />
            <form action={markNotificationsReadAction}>
              <button type="submit" className="btn btn-ghost px-5 py-2.5 text-sm">
                تعليم الكل كمقروء
              </button>
            </form>
          </div>
          {notifRows.length === 0 ? (
            <EmptyPlate
              compact
              icon={<Bell size={22} />}
              title="لا توجد إشعارات بعد"
              body="ستصلك هنا إشعارات المحاضرات الجديدة، الاختبارات، وتنبيهات انتهاء الاشتراك."
            />
          ) : (
            <ul className="mt-6 grid gap-3">
              {notifRows.map((notif) => (
                <li
                  key={notif.id}
                  className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-5 ${
                    notif.isRead ? "border-line bg-transparent" : "border-[rgba(79,227,232,0.32)] bg-[rgba(79,227,232,0.07)]"
                  }`}
                >
                  <div>
                    <h3 className="text-[0.98rem] font-bold text-ink">{notif.title}</h3>
                    <p className="mt-1 text-[0.87rem] leading-[1.9] text-ink-soft">{notif.body}</p>
                  </div>
                  <span className="tnum text-xs text-ink-faint">{AR_TIME.format(notif.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── profile & sessions ── */}
        <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle icon={<UserRound size={20} />} title="الملف الشخصي" hint="حدّث بياناتك وصفّك الدراسي" />
            <form action={updateProfileAction} className="glass mt-6 grid gap-5 p-7">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm text-ink-soft">
                  الاسم الكامل
                </label>
                <input id="fullName" name="fullName" className="field" defaultValue={me?.fullName ?? user.fullName} required />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm text-ink-soft">
                  رقم الهاتف (اختياري)
                </label>
                <input id="phone" name="phone" dir="ltr" className="field text-left" defaultValue={me?.phone ?? ""} />
              </div>
              <div>
                <label htmlFor="gradeId" className="mb-2 block text-sm text-ink-soft">
                  الصف الدراسي
                </label>
                <select id="gradeId" name="gradeId" className="field" defaultValue={gradeId ? String(gradeId) : ""}>
                  <option value="">لم أحدد بعد</option>
                  {gradeRows.map((grade) => (
                    <option key={grade.id} value={String(grade.id)}>
                      {grade.stage} — {grade.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary justify-self-start px-6">
                حفظ التغييرات
              </button>
            </form>
          </div>

          <div>
            <SectionTitle icon={<Laptop size={20} />} title="الأجهزة والجلسات" hint="أنهِ أي جلسة لا تعرفها" />
            <ul className="mt-6 grid gap-3">
              {sessionRows.map((row) => (
                <li key={row.id} className="glass flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-[0.95rem] font-bold text-ink">{row.deviceLabel ?? "جهاز غير معروف"}</p>
                    <p className="mt-1 text-[0.8rem] text-ink-faint">
                      آخر نشاط: <span className="tnum">{AR_TIME.format(row.lastSeenAt)}</span>
                      {row.revokedAt ? " · جلسة منتهية" : ""}
                    </p>
                  </div>
                  {row.revokedAt ? (
                    <span className="chip">منتهية</span>
                  ) : (
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="sessionId" value={row.id} />
                      <button type="submit" className="btn btn-ghost px-5 py-2 text-sm">
                        <LogOut size={16} />
                        تسجيل الخروج
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-line-strong p-5 text-[0.85rem] leading-[1.95] text-ink-faint">
              <AlertTriangle size={18} className="mt-1 shrink-0 text-[var(--danger)]" />
              <p>
                لأسباب أمنية، حدّد المدرس الحد الأقصى للأجهزة المسموح بها من لوحة التحكم. في حال رأيت
                جلسة غريبة أنهها فوراً وغيّر كلمة مرورك.
              </p>
            </div>

            <form action={logoutAction} className="mt-6">
              <button type="submit" className="btn btn-ghost w-full py-3">
                تسجيل الخروج من هذا الجهاز
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tnum text-2xl text-ink">{value}</p>
      <p className="mt-1 text-[0.82rem] text-ink-faint">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-accent">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="text-[0.82rem] text-ink-faint">{hint}</p>
      </div>
    </div>
  );
}
