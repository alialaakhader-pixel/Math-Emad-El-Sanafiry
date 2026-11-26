import { desc, eq, sql } from "drizzle-orm";
import {
  Activity,
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  KeyRound,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";
import { db } from "@/db";
import {
  activationCodes,
  activityLog,
  announcements,
  assignments,
  examAttempts,
  exams,
  grades,
  lectures,
  modules,
  questions,
  submissions,
  subscriptions,
  users,
} from "@/db/schema";
import AppHeader from "@/components/AppHeader";
import { FormMessage } from "@/components/AuthLayout";
import { EmptyPlate } from "@/components/landing/Sections";
import {
  addQuestionAction,
  changePasswordAction,
  createAssignmentAction,
  createExamAction,
  createLectureAction,
  createModuleAction,
  deleteAssignmentAction,
  deleteLectureAction,
  ensureDefaultGradesAction,
  generateCodesAction,
  gradeSubmissionAction,
  manualActivateAction,
  postAnnouncementAction,
  revokeCodeAction,
  sendNotificationAction,
  toggleAnnouncementAction,
  toggleLectureAction,
} from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AR = new Intl.NumberFormat("ar-EG");
const AR_TIME = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" });

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: <Activity size={18} /> },
  { key: "students", label: "الطلاب والاشتراكات", icon: <Users size={18} /> },
  { key: "content", label: "المحاضرات والوحدات", icon: <BookOpen size={18} /> },
  { key: "exams", label: "الاختبارات", icon: <ClipboardCheck size={18} /> },
  { key: "assignments", label: "الواجبات", icon: <FileText size={18} /> },
  { key: "codes", label: "أكواد التفعيل", icon: <KeyRound size={18} /> },
  { key: "notify", label: "الإشعارات والإعلانات", icon: <Bell size={18} /> },
  { key: "settings", label: "الأمان والإعدادات", icon: <ShieldCheck size={18} /> },
  { key: "logs", label: "سجل العمليات", icon: <Layers size={18} /> },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; msg?: string; created?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const tab = params.tab ?? "overview";

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader user={user} label="لوحة تحكم المدرس" backHref="/" />

      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="plate-label">TEACHER CONTROL PANEL</span>
            <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">إدارة المنصة</h1>
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-[2] text-ink-soft">
              كل عملية هنا تُنفَّذ على الخادم وتُسجَّل في سجل العمليات. الأكواد تُخزَّن مجزّأة وتظهر
              مرة واحدة فقط عند الإنشاء.
            </p>
          </div>
          <FormMessage error={params.error} msg={params.msg} />
        </div>

        {params.created ? (
          <div className="mt-8 rounded-2xl border border-[rgba(79,227,232,0.42)] bg-[rgba(79,227,232,0.1)] p-6">
            <p className="plate-label">ONE-TIME DISPLAY · انسخها الآن</p>
            <p className="mt-3 text-[0.92rem] leading-[1.95] text-ink">
              هذه هي الأكواد المُنشأة الآن، ولن تُعرض مرة أخرى:
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {params.created.split(" ").map((code) => (
                <code key={code} dir="ltr" className="tnum rounded-xl border border-line bg-[var(--surface-2)] px-4 py-2 text-accent">
                  {code}
                </code>
              ))}
            </div>
          </div>
        ) : null}

        {!user || user.role !== "teacher" ? (
          <div className="mt-10">
            <EmptyPlate
              icon={<ShieldCheck size={22} />}
              title="هذه الصفحة مخصّصة لحساب المدرس"
              body="سجّل الدخول بحساب المدرس للوصول إلى أدوات الإدارة. فحص الصلاحيات يتم على الخادم، وليس بإخفاء الأزرار فقط."
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map((item) => (
                <a
                  key={item.key}
                  href={`/admin?tab=${item.key}`}
                  className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    tab === item.key
                      ? "border-[rgba(79,227,232,0.42)] bg-[rgba(79,227,232,0.1)] text-accent"
                      : "border-line text-ink-soft hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </nav>

            <section>
              {tab === "overview" ? <OverviewTab /> : null}
              {tab === "students" ? <StudentsTab /> : null}
              {tab === "content" ? <ContentTab /> : null}
              {tab === "exams" ? <ExamsTab /> : null}
              {tab === "assignments" ? <AssignmentsTab /> : null}
              {tab === "codes" ? <CodesTab /> : null}
              {tab === "notify" ? <NotifyTab /> : null}
              {tab === "settings" ? <SettingsTab /> : null}
              {tab === "logs" ? <LogsTab /> : null}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────── shared bits ─────────────────────────── */

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass p-7">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {hint ? <p className="mt-2 text-[0.86rem] leading-[1.9] text-ink-soft">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm text-ink-soft">
      {children}
    </label>
  );
}

async function count(sqlQuery: string): Promise<number> {
  const rows = await db.execute(sql.raw(sqlQuery));
  return Number((rows.rows?.[0] as { n?: number } | undefined)?.n ?? 0);
}

/* ─────────────────────────── 01 overview ─────────────────────────── */

async function OverviewTab() {
  const [students, activeSubs, lecturesN, examsN, codesN, subsTotal] = await Promise.all([
    count("select count(*)::int as n from users where role = 'student'"),
    count("select count(*)::int as n from subscriptions where ends_at > now()"),
    count("select count(*)::int as n from lectures where is_published = true"),
    count("select count(*)::int as n from exams where is_published = true"),
    count("select count(*)::int as n from activation_codes where status = 'active'"),
    count("select count(*)::int as n from subscriptions"),
  ]);

  const recent = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      createdAt: activityLog.createdAt,
      meta: activityLog.meta,
    })
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(10);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "طالب مسجّل", value: students },
          { label: "اشتراك فعّال", value: activeSubs },
          { label: "إجمالي الاشتراكات", value: subsTotal },
          { label: "محاضرة منشورة", value: lecturesN },
          { label: "اختبار منشور", value: examsN },
          { label: "كود غير مستخدم", value: codesN },
        ].map((stat) => (
          <div key={stat.label} className="glass p-6">
            <p className="tnum text-3xl text-accent">{AR.format(stat.value)}</p>
            <p className="mt-2 text-[0.84rem] text-ink-soft">{stat.label}</p>
          </div>
        ))}
      </div>

      <Panel title="آخر العمليات الإدارية" hint="سجل زمني لكل ما تم تنفيذه على المنصة.">
        {recent.length === 0 ? (
          <EmptyPlate compact title="لا توجد عمليات بعد" body="كل إجراء تقوم به سيظهر هنا تلقائياً." />
        ) : (
          <ul className="grid gap-2">
            {recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                <span className="tnum text-sm text-accent">{row.action}</span>
                <span className="tnum text-xs text-ink-faint">{AR_TIME.format(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 02 students ─────────────────────────── */

async function StudentsTab() {
  const studentRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      gradeId: users.gradeId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`${users.role} = 'student'`)
    .orderBy(desc(users.createdAt));

  const subRows = await db.select().from(subscriptions).orderBy(desc(subscriptions.endsAt));
  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);

  return (
    <div className="grid gap-6">
      <Panel
        title="الطلاب المسجّلون"
        hint="التفعيل اليدوي بمعرّف الطالب: حدد المدة والصف ثم فعّل — دون الحاجة إلى كود."
      >
        {studentRows.length === 0 ? (
          <EmptyPlate compact title="لا يوجد طلاب مسجّلون" body="سيظهر جدول الطلاب هنا بمجرد إنشاء الحسابات." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-ink-faint">
                  <th className="py-3 pl-4 font-medium">الطالب</th>
                  <th className="py-3 pl-4 font-medium">المعرّف</th>
                  <th className="py-3 pl-4 font-medium">الاشتراك</th>
                  <th className="py-3 pl-4 font-medium">تفعيل يدوي</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((student) => {
                  const active = subRows.find((s) => s.userId === student.id && s.endsAt.getTime() > Date.now());
                  return (
                    <tr key={student.id} className="border-b border-line align-top">
                      <td className="py-4 pl-4">
                        <p className="text-[0.95rem] font-bold text-ink">{student.fullName}</p>
                        <p dir="ltr" className="mt-1 text-left text-[0.78rem] text-ink-faint">
                          {student.email}
                        </p>
                      </td>
                      <td className="tnum py-4 pl-4 text-[0.78rem] text-ink-faint">{student.id.slice(0, 8)}</td>
                      <td className="py-4 pl-4">
                        {active ? (
                          <span className="chip border-[rgba(79,227,165,0.4)] text-[var(--ok)]">
                            فعّال حتى {AR_TIME.format(active.endsAt)}
                          </span>
                        ) : (
                          <span className="chip border-[rgba(255,107,129,0.35)] text-[var(--danger)]">غير مشترك</span>
                        )}
                      </td>
                      <td className="py-4 pl-4">
                        <form action={manualActivateAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="studentId" value={student.id} />
                          <input
                            name="days"
                            type="number"
                            min={1}
                            max={720}
                            defaultValue={30}
                            className="field w-20 px-3 py-2 text-center"
                            aria-label="عدد الأيام"
                          />
                          <select
                            name="gradeId"
                            className="field w-40 px-3 py-2"
                            defaultValue={student.gradeId ? String(student.gradeId) : ""}
                            aria-label="الصف"
                          >
                            <option value="">نفس الصف</option>
                            {gradeRows.map((g) => (
                              <option key={g.id} value={String(g.id)}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn btn-primary px-4 py-2 text-sm">
                            تفعيل
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 03 content ─────────────────────────── */

async function ContentTab() {
  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);
  const moduleRows = await db
    .select({
      id: modules.id,
      title: modules.title,
      term: modules.term,
      gradeName: grades.name,
    })
    .from(modules)
    .leftJoin(grades, eq(modules.gradeId, grades.id))
    .orderBy(modules.sortOrder);
  const lectureRows = await db
    .select({
      id: lectures.id,
      title: lectures.title,
      isPublished: lectures.isPublished,
      durationMinutes: lectures.durationMinutes,
      moduleTitle: modules.title,
    })
    .from(lectures)
    .leftJoin(modules, eq(lectures.moduleId, modules.id))
    .orderBy(lectures.sortOrder);

  return (
    <div className="grid gap-6">
      <Panel title="الصفوف الدراسية" hint="الصفوف الأساسية للمنصة. جهّزها مرة واحدة، ثم اربط بكل صف وحداته ومحاضراته واختباراته.">
        <div className="flex flex-wrap items-center gap-3">
          {gradeRows.map((grade) => (
            <span key={grade.id} className="chip border-[rgba(79,227,232,0.28)] bg-[rgba(79,227,232,0.08)] text-accent">
              {grade.name}
            </span>
          ))}
          <form action={ensureDefaultGradesAction}>
            <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
              تجهيز الصفوف الثلاثة الأساسية
            </button>
          </form>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink-faint">العملية لا تكرر الصف الموجود بالفعل، ويمكنك تجهيزها مرة واحدة قبل إضافة المحتوى.</p>
      </Panel>

      <Panel title="إضافة وحدة تعليمية" hint="الوحدة تجمع دروساً داخل ترم محدد لصف دراسي.">
        <form action={createModuleAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="m-grade">الصف</Label>
            <select id="m-grade" name="gradeId" className="field" required>
              {gradeRows.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.stage} — {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="m-term">الترم</Label>
            <input id="m-term" name="term" className="field" placeholder="الترم الأول" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="m-title">عنوان الوحدة</Label>
            <input id="m-title" name="title" className="field" placeholder="مثال: الدوال والمتغيرات" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="m-desc">وصف مختصر</Label>
            <textarea id="m-desc" name="description" rows={2} className="field" />
          </div>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            إضافة الوحدة
          </button>
        </form>
      </Panel>

      <Panel title="إضافة محاضرة" hint="اربط الفيديو والمذكرة، وحدّد حالة النشر.">
        <form action={createLectureAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="l-module">الوحدة</Label>
            <select id="l-module" name="moduleId" className="field" required>
              {moduleRows.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.gradeName} · {m.term} · {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="l-duration">مدة المحاضرة (دقيقة)</Label>
            <input id="l-duration" name="durationMinutes" type="number" min={1} className="field" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="l-title">العنوان</Label>
            <input id="l-title" name="title" className="field" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="l-summary">الوصف</Label>
            <textarea id="l-summary" name="summary" rows={3} className="field" />
          </div>
          <div>
            <Label htmlFor="l-video">رابط الفيديو</Label>
            <input id="l-video" name="videoUrl" dir="ltr" className="field text-left" placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="l-pdf">رابط المذكرة (PDF)</Label>
            <input id="l-pdf" name="pdfUrl" dir="ltr" className="field text-left" placeholder="https://…" />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="isPublished" className="h-4 w-4 accent-[var(--accent)]" />
            نشر المحاضرة فوراً
          </label>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            حفظ المحاضرة
          </button>
        </form>
      </Panel>

      <Panel title="المحاضرات الحالية" hint="يمكنك النشر أو الإخفاء أو الحذف.">
        {lectureRows.length === 0 ? (
          <EmptyPlate compact title="لا توجد محاضرات" body="أضف أول محاضرة من النموذج أعلاه." />
        ) : (
          <ul className="grid gap-3">
            {lectureRows.map((lecture) => (
              <li key={lecture.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line p-5">
                <div>
                  <h3 className="text-[0.98rem] font-bold text-ink">{lecture.title}</h3>
                  <p className="mt-1 text-[0.8rem] text-ink-faint">
                    {lecture.moduleTitle}
                    {lecture.durationMinutes ? ` · ${AR.format(lecture.durationMinutes)} دقيقة` : ""}
                    {lecture.isPublished ? " · منشورة" : " · مسودة"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleLectureAction}>
                    <input type="hidden" name="lectureId" value={lecture.id} />
                    <button type="submit" className="btn btn-ghost px-4 py-2 text-sm">
                      {lecture.isPublished ? "إخفاء" : "نشر"}
                    </button>
                  </form>
                  <form action={deleteLectureAction}>
                    <input type="hidden" name="lectureId" value={lecture.id} />
                    <button type="submit" className="btn btn-ghost px-4 py-2 text-sm text-[var(--danger)]">
                      حذف
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 04 exams ─────────────────────────── */

async function ExamsTab() {
  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);
  const examRows = await db.select().from(exams).orderBy(desc(exams.createdAt));
  const questionRows = await db.select().from(questions).orderBy(questions.sortOrder);
  const attemptRows = await db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      score: examAttempts.score,
      maxScore: examAttempts.maxScore,
      userName: users.fullName,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .leftJoin(users, eq(examAttempts.userId, users.id))
    .orderBy(desc(examAttempts.startedAt))
    .limit(12);

  return (
    <div className="grid gap-6">
      <Panel title="إنشاء اختبار" hint="يُنشأ مع سؤال أول قابل للتعديل، ويمكنك إضافة المزيد أدناه.">
        <form action={createExamAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="e-title">عنوان الاختبار</Label>
            <input id="e-title" name="title" className="field" required />
          </div>
          <div>
            <Label htmlFor="e-grade">الصف</Label>
            <select id="e-grade" name="gradeId" className="field">
              <option value="">جميع الصفوف</option>
              {gradeRows.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="e-duration">المدة (دقيقة)</Label>
            <input id="e-duration" name="durationMinutes" type="number" min={5} defaultValue={45} className="field" />
          </div>
          <div>
            <Label htmlFor="e-attempts">عدد المحاولات</Label>
            <input id="e-attempts" name="maxAttempts" type="number" min={1} defaultValue={1} className="field" />
          </div>
          <div>
            <Label htmlFor="e-close">تاريخ الإغلاق</Label>
            <input id="e-close" name="closesAt" type="datetime-local" className="field" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="e-desc">وصف</Label>
            <textarea id="e-desc" name="description" rows={2} className="field" />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="allowReview" defaultChecked className="h-4 w-4 accent-[var(--accent)]" />
            السماح بمراجعة الإجابات
          </label>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="isPublished" className="h-4 w-4 accent-[var(--accent)]" />
            نشر الاختبار
          </label>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            إنشاء الاختبار
          </button>
        </form>
      </Panel>

      <Panel title="بنك الأسئلة" hint="أضف أسئلة اختيار من متعدد أو أسئلة مقالية تُصحَّح يدوياً.">
        <form action={addQuestionAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="q-exam">الاختبار</Label>
            <select id="q-exam" name="examId" className="field" required>
              {examRows.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="q-type">نوع السؤال</Label>
            <select id="q-type" name="type" className="field">
              <option value="mcq">اختيار من متعدد</option>
              <option value="essay">مقالي / مسألة</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="q-prompt">نص السؤال (يدعم LaTeX)</Label>
            <textarea id="q-prompt" name="prompt" rows={3} className="field" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="q-options">الخيارات (سطر لكل خيار — للأسئلة المقالية اتركها فارغة)</Label>
            <textarea id="q-options" name="options" rows={4} className="field" dir="ltr" />
          </div>
          <div>
            <Label htmlFor="q-answer">الإجابة الصحيحة</Label>
            <input id="q-answer" name="correctAnswer" className="field" />
          </div>
          <div>
            <Label htmlFor="q-marks">الدرجة</Label>
            <input id="q-marks" name="marks" type="number" min={1} defaultValue={1} className="field" />
          </div>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            إضافة السؤال
          </button>
        </form>
      </Panel>

      <Panel title="الاختبارات والمحاولات" hint="آخر المحاولات المرسلة من الطلاب.">
        {examRows.length === 0 ? (
          <EmptyPlate compact title="لا توجد اختبارات" body="أنشئ أول اختبار من النموذج أعلاه." />
        ) : (
          <div className="grid gap-4">
            {examRows.map((exam) => {
              const qs = questionRows.filter((q) => q.examId === exam.id);
              const attempts = attemptRows.filter((a) => a.examId === exam.id);
              return (
                <div key={exam.id} className="rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[0.98rem] font-bold text-ink">{exam.title}</h3>
                    <span className="chip">{exam.isPublished ? "منشور" : "مسودة"}</span>
                  </div>
                  <p className="mt-2 text-[0.82rem] text-ink-faint">
                    {AR.format(qs.length)} سؤال · {AR.format(exam.durationMinutes)} دقيقة ·{" "}
                    {AR.format(exam.maxAttempts)} محاولة
                  </p>
                  <ul className="mt-4 grid gap-2">
                    {qs.map((q) => (
                      <li key={q.id} className="rounded-xl bg-[color-mix(in_srgb,var(--surface-3)_34%,transparent)] px-4 py-3 text-[0.85rem] leading-[1.85] text-ink-soft">
                        <span className="chip ml-2">{q.type === "mcq" ? "اختيار" : "مقالي"}</span>
                        {q.prompt}
                      </li>
                    ))}
                  </ul>
                  {attempts.length > 0 ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="plate-label">RECENT ATTEMPTS</p>
                      <ul className="mt-3 grid gap-2">
                        {attempts.map((attempt) => (
                          <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 text-[0.85rem] text-ink-soft">
                            <span>{attempt.userName ?? "طالب"}</span>
                            <span className="tnum text-accent">
                              {attempt.score !== null ? `${AR.format(attempt.score)} / ${AR.format(attempt.maxScore ?? 0)}` : "بانتظار التصحيح"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 05 assignments ─────────────────────────── */

async function AssignmentsTab() {
  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);
  const assignmentRows = await db.select().from(assignments).orderBy(desc(assignments.createdAt));
  const submissionRows = await db
    .select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      body: submissions.body,
      fileUrl: submissions.fileUrl,
      grade: submissions.grade,
      feedback: submissions.feedback,
      userName: users.fullName,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .orderBy(desc(submissions.submittedAt));

  return (
    <div className="grid gap-6">
      <Panel title="إضافة واجب" hint="يظهر الواجب للطلاب فور تفعيل النشر.">
        <form action={createAssignmentAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="a-title">عنوان الواجب</Label>
            <input id="a-title" name="title" className="field" required />
          </div>
          <div>
            <Label htmlFor="a-grade">الصف</Label>
            <select id="a-grade" name="gradeId" className="field">
              <option value="">جميع الصفوف</option>
              {gradeRows.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="a-due">موعد التسليم</Label>
            <input id="a-due" name="dueAt" type="datetime-local" className="field" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="a-desc">وصف الواجب</Label>
            <textarea id="a-desc" name="description" rows={3} className="field" />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="isPublished" className="h-4 w-4 accent-[var(--accent)]" />
            نشر الواجب
          </label>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            حفظ الواجب
          </button>
        </form>
      </Panel>

      <Panel title="إجابات الطلاب" hint="صحّح الواجبات وأضف ملاحظاتك.">
        {submissionRows.length === 0 ? (
          <EmptyPlate compact title="لا توجد إجابات بعد" body="ستظهر إجابات الطلاب هنا فور إرسالها." />
        ) : (
          <ul className="grid gap-4">
            {submissionRows.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[0.95rem] font-bold text-ink">{s.userName ?? "طالب"}</h3>
                  {s.grade !== null ? (
                    <span className="chip border-[rgba(79,227,165,0.4)] text-[var(--ok)]">
                      التقييم: {AR.format(s.grade)}
                    </span>
                  ) : (
                    <span className="chip">غير مصحّح</span>
                  )}
                </div>
                {s.body ? <p className="mt-3 text-[0.87rem] leading-[1.95] text-ink-soft">{s.body}</p> : null}
                {s.fileUrl ? (
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[0.82rem] text-accent underline underline-offset-4">
                    ملف الإجابة
                  </a>
                ) : null}
                <form action={gradeSubmissionAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="submissionId" value={s.id} />
                  <div>
                    <Label htmlFor={`g-${s.id}`}>الدرجة</Label>
                    <input id={`g-${s.id}`} name="grade" type="number" min={0} defaultValue={s.grade ?? 0} className="field w-24" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`f-${s.id}`}>ملاحظات</Label>
                    <input id={`f-${s.id}`} name="feedback" defaultValue={s.feedback ?? ""} className="field" />
                  </div>
                  <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
                    حفظ
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="الواجبات المنشورة" hint="احذف الواجبات غير الحاجة إليها.">
        {assignmentRows.length === 0 ? (
          <EmptyPlate compact title="لا توجد واجبات" body="أنشئ أول واجب من النموذج أعلاه." />
        ) : (
          <ul className="grid gap-3">
            {assignmentRows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-5">
                <div>
                  <h3 className="text-[0.95rem] font-bold text-ink">{a.title}</h3>
                  <p className="mt-1 text-[0.8rem] text-ink-faint">
                    {a.isPublished ? "منشور" : "مسودة"}
                    {a.dueAt ? ` · التسليم ${AR_TIME.format(a.dueAt)}` : ""}
                  </p>
                </div>
                <form action={deleteAssignmentAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="btn btn-ghost px-4 py-2 text-sm text-[var(--danger)]">
                    حذف
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 06 codes ─────────────────────────── */

async function CodesTab() {
  const gradeRows = await db.select().from(grades).orderBy(grades.sortOrder);
  const codeRows = await db
    .select({
      id: activationCodes.id,
      codeLast4: activationCodes.codeLast4,
      status: activationCodes.status,
      durationDays: activationCodes.durationDays,
      note: activationCodes.note,
      createdAt: activationCodes.createdAt,
      usedAt: activationCodes.usedAt,
      usedByName: users.fullName,
    })
    .from(activationCodes)
    .leftJoin(users, eq(activationCodes.usedByUserId, users.id))
    .orderBy(desc(activationCodes.createdAt))
    .limit(40);

  return (
    <div className="grid gap-6">
      <Panel
        title="إنشاء أكواد تفعيل"
        hint="تُخزَّن الأكواد مجزّأة (hash) ولا تُعرض إلا مرة واحدة مباشرة بعد الإنشاء، وللطالب فقط عند إدخاله الكود بنفسه."
      >
        <form action={generateCodesAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-count">عدد الأكواد</Label>
            <input id="c-count" name="count" type="number" min={1} max={50} defaultValue={5} className="field" />
          </div>
          <div>
            <Label htmlFor="c-days">مدة الاشتراك (يوم)</Label>
            <input id="c-days" name="days" type="number" min={1} max={720} defaultValue={30} className="field" />
          </div>
          <div>
            <Label htmlFor="c-grade">الصف المرتبط</Label>
            <select id="c-grade" name="gradeId" className="field">
              <option value="">بدون تقييد</option>
              {gradeRows.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="c-note">ملاحظة داخلية</Label>
            <input id="c-note" name="note" className="field" placeholder="مثال: دفعة يناير" />
          </div>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            إنشاء الأكواد
          </button>
        </form>
      </Panel>

      <Panel title="سجل الأكواد" hint="تُعرض آخر ٤٠ كوداً بدون قيمتها الكاملة حمايةً من التسريب.">
        {codeRows.length === 0 ? (
          <EmptyPlate compact title="لا توجد أكواد" body="أنشئ أول مجموعة أكواد من النموذج أعلاه." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-ink-faint">
                  <th className="py-3 pl-4 font-medium">الكود</th>
                  <th className="py-3 pl-4 font-medium">المدة</th>
                  <th className="py-3 pl-4 font-medium">الحالة</th>
                  <th className="py-3 pl-4 font-medium">الاستخدام</th>
                  <th className="py-3 pl-4 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {codeRows.map((code) => (
                  <tr key={code.id} className="border-b border-line">
                    <td className="tnum py-4 pl-4 text-[0.85rem] text-ink-soft">SAN-••••-••••-{code.codeLast4}</td>
                    <td className="tnum py-4 pl-4 text-[0.85rem] text-ink-soft">{AR.format(code.durationDays)} يوم</td>
                    <td className="py-4 pl-4">
                      <span
                        className={`chip ${
                          code.status === "active"
                            ? "border-[rgba(79,227,165,0.4)] text-[var(--ok)]"
                            : code.status === "used"
                              ? "border-line text-ink-faint"
                              : "border-[rgba(255,107,129,0.35)] text-[var(--danger)]"
                        }`}
                      >
                        {code.status === "active" ? "غير مستخدم" : code.status === "used" ? "مستخدم" : "ملغى"}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-[0.82rem] text-ink-soft">
                      {code.usedByName ? `${code.usedByName} · ${AR_TIME.format(code.usedAt!)}` : "—"}
                    </td>
                    <td className="py-4 pl-4">
                      {code.status === "active" ? (
                        <form action={revokeCodeAction}>
                          <input type="hidden" name="codeId" value={code.id} />
                          <button type="submit" className="btn btn-ghost px-4 py-2 text-sm text-[var(--danger)]">
                            إلغاء
                          </button>
                        </form>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 07 notify ─────────────────────────── */

async function NotifyTab() {
  const announcementRows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  const studentRows = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(sql`${users.role} = 'student'`)
    .orderBy(desc(users.createdAt))
    .limit(50);

  return (
    <div className="grid gap-6">
      <Panel title="إرسال إشعار" hint="اختر جميع الطلاب أو طالباً بعينه.">
        <form action={sendNotificationAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="n-target">المستلم</Label>
            <select id="n-target" name="target" className="field">
              <option value="all">جميع الطلاب</option>
              {studentRows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="n-kind">النوع</Label>
            <select id="n-kind" name="kind" className="field">
              <option value="info">إشعار عام</option>
              <option value="lecture">محاضرة جديدة</option>
              <option value="exam">اختبار</option>
              <option value="announcement">إعلان</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="n-title">العنوان</Label>
            <input id="n-title" name="title" className="field" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="n-body">النص</Label>
            <textarea id="n-body" name="body" rows={3} className="field" required />
          </div>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            إرسال
          </button>
        </form>
      </Panel>

      <Panel title="إعلان الصفحة الرئيسية" hint="يظهر مباشرةً في قسم الإعلانات بالصفحة الرئيسية.">
        <form action={postAnnouncementAction} className="grid gap-4">
          <div>
            <Label htmlFor="an-title">عنوان الإعلان</Label>
            <input id="an-title" name="title" className="field" required />
          </div>
          <div>
            <Label htmlFor="an-body">نص الإعلان</Label>
            <textarea id="an-body" name="body" rows={3} className="field" required />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="isPinned" className="h-4 w-4 accent-[var(--accent)]" />
            تثبيت الإعلان في الأعلى
          </label>
          <button type="submit" className="btn btn-primary justify-self-start px-6">
            نشر الإعلان
          </button>
        </form>

        <ul className="mt-6 grid gap-3">
          {announcementRows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-5">
              <div>
                <h3 className="text-[0.95rem] font-bold text-ink">{a.title}</h3>
                <p className="mt-1 text-[0.82rem] text-ink-faint">
                  {a.isActive ? "ظاهر في الرئيسية" : "مخفي"} · {AR_TIME.format(a.createdAt)}
                </p>
              </div>
              <form action={toggleAnnouncementAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="btn btn-ghost px-4 py-2 text-sm">
                  {a.isActive ? "إخفاء" : "إظهار"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 08 settings ─────────────────────────── */

function SettingsTab() {
  return (
    <div className="grid gap-6">
      <Panel title="تغيير كلمة مرور المدرس" hint="تُتحقَّق من كلمة المرور الحالية قبل التغيير، وتُسجَّل العملية.">
        <form action={changePasswordAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="p-current">كلمة المرور الحالية</Label>
            <input id="p-current" name="currentPassword" type="password" dir="ltr" className="field text-left" required />
          </div>
          <div>
            <Label htmlFor="p-new">كلمة المرور الجديدة</Label>
            <input id="p-new" name="newPassword" type="password" dir="ltr" className="field text-left" required />
          </div>
          <button type="submit" className="btn btn-primary justify-self-start self-end px-6">
            تحديث كلمة المرور
          </button>
        </form>
      </Panel>

      <Panel title="متغيرات البيئة المطلوبة" hint="تُضبط على مستوى الخادم فقط، ولا تُشحن إلى المتصفح أبداً.">
        <ul className="grid gap-3 text-[0.88rem] leading-[1.95] text-ink-soft">
          <li className="rounded-xl border border-line px-4 py-3">
            <code dir="ltr" className="tnum text-accent">DATABASE_URL</code> — اتصال PostgreSQL.
          </li>
          <li className="rounded-xl border border-line px-4 py-3">
            <code dir="ltr" className="tnum text-accent">OPENAI_API_KEY</code> — لتفعيل المساعد الذكي للرياضيات (اختياري).
          </li>
          <li className="rounded-xl border border-line px-4 py-3">
            <code dir="ltr" className="tnum text-accent">GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET</code> — لتفعيل تسجيل الدخول عبر Google (اختياري).
          </li>
        </ul>
      </Panel>
    </div>
  );
}

/* ─────────────────────────── 09 logs ─────────────────────────── */

async function LogsTab() {
  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      meta: activityLog.meta,
      createdAt: activityLog.createdAt,
      userName: users.fullName,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(60);

  return (
    <Panel title="سجل العمليات الإدارية" hint="كل عملية حساسة تُسجَّل هنا مع المستخدم والتوقيت.">
      {rows.length === 0 ? (
        <EmptyPlate compact title="السجل فارغ" body="تبدأ العمليات بالظهور بمجرد تنفيذ أول إجراء إداري." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-right">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-ink-faint">
                <th className="py-3 pl-4 font-medium">العملية</th>
                <th className="py-3 pl-4 font-medium">المستخدم</th>
                <th className="py-3 pl-4 font-medium">التوقيت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="tnum py-3 pl-4 text-[0.85rem] text-accent">{row.action}</td>
                  <td className="py-3 pl-4 text-[0.85rem] text-ink-soft">{row.userName ?? "—"}</td>
                  <td className="tnum py-3 pl-4 text-[0.82rem] text-ink-faint">{AR_TIME.format(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
