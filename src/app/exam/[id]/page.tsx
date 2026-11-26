import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Clock, ListChecks, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { examAttempts, exams, questions } from "@/db/schema";
import AppHeader from "@/components/AppHeader";
import { FormMessage } from "@/components/AuthLayout";
import { submitExamAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AR = new Intl.NumberFormat("ar-EG");

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; result?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent("يرجى تسجيل الدخول لبدء الاختبار.")}`);

  const [exam] = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  if (!exam) {
    return (
      <div className="min-h-screen bg-surface">
        <AppHeader user={user} label="الاختبارات" backHref="/dashboard" />
        <main className="mx-auto max-w-[820px] px-5 py-24 text-center">
          <h1 className="text-2xl font-extrabold text-ink">هذا الاختبار غير موجود</h1>
          <p className="mt-4 text-ink-soft">ربما تم حذفه أو تغيير رابطه.</p>
          <Link href="/dashboard" className="btn btn-primary mt-8 px-6">
            العودة إلى لوحة الطالب
          </Link>
        </main>
      </div>
    );
  }

  const attempts = await db
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id)))
    .orderBy(desc(examAttempts.startedAt));

  const bank = await db
    .select({
      id: questions.id,
      type: questions.type,
      prompt: questions.prompt,
      options: questions.options,
      marks: questions.marks,
      correctAnswer: questions.correctAnswer,
    })
    .from(questions)
    .where(eq(questions.examId, id))
    .orderBy(questions.sortOrder);

  const resultAttempt = sp.result ? attempts.find((a) => a.id === sp.result) : null;
  const used = attempts.length;
  const canStart = exam.isPublished && used < exam.maxAttempts && (!exam.closesAt || exam.closesAt.getTime() > Date.now());

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader user={user} label="اختبار" backHref="/dashboard" />

      <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-8">
        <FormMessage error={sp.error} />

        <header className="glass p-8">
          <span className="plate-label">EXAM</span>
          <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">{exam.title}</h1>
          {exam.description ? (
            <p className="mt-4 text-[0.95rem] leading-[2] text-ink-soft">{exam.description}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-6">
            <Fact icon={<Clock size={18} />} label="المدة" value={`${AR.format(exam.durationMinutes)} دقيقة`} />
            <Fact icon={<ListChecks size={18} />} label="عدد الأسئلة" value={AR.format(bank.length)} />
            <Fact
              icon={<ShieldCheck size={18} />}
              label="المحاولات"
              value={`${AR.format(used)} من ${AR.format(exam.maxAttempts)}`}
            />
          </div>
        </header>

        {/* result view */}
        {resultAttempt ? (
          <section className="glass mt-8 p-8">
            <span className="plate-label">RESULT</span>
            <h2 className="mt-3 text-xl font-bold text-ink">نتيجة محاولتك</h2>
            <div className="mt-6 flex flex-wrap items-center gap-8">
              <div>
                <p className="tnum text-4xl text-accent">
                  {resultAttempt.score !== null ? AR.format(resultAttempt.score) : "—"}
                  <span className="text-xl text-ink-faint"> / {AR.format(resultAttempt.maxScore ?? 0)}</span>
                </p>
                <p className="mt-2 text-[0.84rem] text-ink-faint">
                  {resultAttempt.isGraded ? "تم التصحيح آلياً" : "بعض الأسئلة بانتظار التصحيح اليدوي"}
                </p>
              </div>
              {resultAttempt.maxScore ? (
                <div>
                  <p className="tnum text-4xl text-ink">
                    {AR.format(
                      Math.round(((resultAttempt.score ?? 0) / Math.max(resultAttempt.maxScore, 1)) * 100)
                    )}
                    ٪
                  </p>
                  <p className="mt-2 text-[0.84rem] text-ink-faint">النسبة المحققة</p>
                </div>
              ) : null}
            </div>

            {exam.allowReview ? (
              <div className="mt-8 border-t border-line pt-6">
                <h3 className="text-lg font-bold text-ink">مراجعة الإجابات</h3>
                <ul className="mt-5 grid gap-4">
                  {bank.map((question, index) => {
                    const given = resultAttempt.answers?.[question.id] ?? "";
                    const correct = question.type === "mcq" && given === question.correctAnswer;
                    return (
                      <li key={question.id} className="rounded-2xl border border-line p-5">
                        <p className="text-[0.95rem] leading-[1.95] text-ink">
                          <span className="tnum text-accent">{AR.format(index + 1)}.</span> {question.prompt}
                        </p>
                        <p className="mt-3 text-[0.85rem] text-ink-soft">
                          إجابتك: <span className={correct ? "text-[var(--ok)]" : "text-[var(--danger)]"}>{given || "لم تُجب"}</span>
                        </p>
                        {!correct && question.correctAnswer ? (
                          <p className="mt-2 text-[0.85rem] text-ink-soft">
                            الإجابة الصحيحة: <span className="text-[var(--ok)]">{question.correctAnswer}</span>
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-8 border-t border-line pt-6 text-[0.88rem] text-ink-faint">
                المدرس لا يسمح بمراجعة الإجابات بعد التسليم.
              </p>
            )}

            <Link href="/dashboard" className="btn btn-primary mt-8 px-6">
              العودة إلى لوحة الطالب
              <ArrowLeft size={17} />
            </Link>
          </section>
        ) : canStart ? (
          <form action={submitExamAction} className="glass mt-8 p-8">
            <input type="hidden" name="examId" value={exam.id} />
            <ol className="grid gap-6">
              {bank.map((question, index) => (
                <li key={question.id} className="rounded-2xl border border-line p-6">
                  <p className="text-[0.98rem] leading-[2] text-ink">
                    <span className="tnum text-accent">{AR.format(index + 1)}.</span> {question.prompt}
                    <span className="mr-3 text-[0.78rem] text-ink-faint">
                      ({AR.format(question.marks)} {question.marks === 1 ? "درجة" : "درجات"})
                    </span>
                  </p>

                  {question.type === "mcq" && Array.isArray(question.options) ? (
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-[0.92rem] text-ink-soft transition hover:border-accent hover:text-ink"
                        >
                          <input
                            type="radio"
                            name={`q_${question.id}`}
                            value={option}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      name={`q_${question.id}`}
                      rows={4}
                      className="field mt-4"
                      placeholder="اكتب إجابتك هنا (يمكنك استخدام رموز LaTeX)"
                    />
                  )}
                </li>
              ))}
            </ol>

            <button type="submit" className="btn btn-primary mt-8 w-full py-4">
              تسليم الإجابات
            </button>
            <p className="mt-4 text-[0.8rem] leading-[1.9] text-ink-faint">
              يتم تصحيح أسئلة الاختيار من متعدد آلياً فور التسليم، أما الأسئلة المقالية فتُصحَّح يدوياً
              من المدرس.
            </p>
          </form>
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-line-strong p-10 text-center">
            <h2 className="text-xl font-bold text-ink">
              {!exam.isPublished
                ? "هذا الاختبار غير منشور بعد"
                : used >= exam.maxAttempts
                  ? "استنفدت جميع المحاولات المسموح بها"
                  : "انتهى وقت هذا الاختبار"}
            </h2>
            <p className="mt-4 text-[0.92rem] leading-[2] text-ink-soft">
              {used > 0
                ? "يمكنك مراجعة آخر نتيجة من لوحة الطالب، أو التواصل مع المدرس لطلب محاولة إضافية."
                : "عند نشر الاختبار وفتح باب المحاولات سيصبح متاحاً من هنا."}
            </p>
            <Link href="/dashboard" className="btn btn-ghost mt-8 px-6">
              العودة إلى لوحة الطالب
            </Link>
          </section>
        )}

        {!resultAttempt && attempts.length > 0 ? (
          <section className="mt-8">
            <h2 className="plate-label">PREVIOUS ATTEMPTS</h2>
            <ul className="mt-4 grid gap-3">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-5">
                  <span className="text-[0.9rem] text-ink-soft">
                    محاولة في {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(attempt.startedAt)}
                  </span>
                  <span className="tnum text-accent">
                    {attempt.score !== null
                      ? `${AR.format(attempt.score)} / ${AR.format(attempt.maxScore ?? 0)}`
                      : "بانتظار التصحيح"}
                  </span>
                  {exam.allowReview ? (
                    <Link href={`/exam/${exam.id}?result=${attempt.id}`} className="btn btn-ghost px-4 py-2 text-sm">
                      مراجعة
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-accent">
        {icon}
      </span>
      <div>
        <p className="text-[0.78rem] text-ink-faint">{label}</p>
        <p className="tnum text-[0.95rem] text-ink">{value}</p>
      </div>
    </div>
  );
}
