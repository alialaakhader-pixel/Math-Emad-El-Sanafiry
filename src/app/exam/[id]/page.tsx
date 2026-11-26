import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { attempts, exams, grades } from "@/db/schema";
import { canAccessGrade, getCurrentUser } from "@/lib/auth";
import ExamClient from "@/components/ExamClient";

export const metadata: Metadata = { title: "الاختبار", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "teacher") redirect("/admin");
  const [exam] = await db.select().from(exams).where(and(eq(exams.id, id), eq(exams.published, true))).limit(1);
  if (!exam) notFound();
  const allowed = await canAccessGrade(user, exam.gradeId);
  const [[grade], previous] = await Promise.all([
    db.select({ title: grades.title }).from(grades).where(eq(grades.id, exam.gradeId)).limit(1),
    db.select({ id: attempts.id, status: attempts.status, score: attempts.score, maxScore: attempts.maxScore, submittedAt: attempts.submittedAt }).from(attempts).where(and(eq(attempts.examId, id), eq(attempts.userId, user.id))).orderBy(desc(attempts.startedAt)),
  ]);
  return <ExamClient user={{ name: user.name, role: user.role }} exam={{ id: exam.id, title: exam.title, description: exam.description, kind: exam.kind, durationMinutes: exam.durationMinutes, maxAttempts: exam.maxAttempts, startsAt: exam.startsAt, endsAt: exam.endsAt, showReview: exam.showReview, gradeTitle: grade?.title || "الرياضيات" }} allowed={allowed} previous={previous}/>;
}
