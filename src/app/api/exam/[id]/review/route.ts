import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attemptAnswers, attempts, exams, questions } from "@/db/schema";
import { getCurrentUser, jsonError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError("غير مصرح.", 403);
  const { id } = await params;
  const attemptId = new URL(request.url).searchParams.get("attempt") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(attemptId)) return jsonError("معرّف غير صالح.");
  const [record] = await db.select({ status: attempts.status, showReview: exams.showReview }).from(attempts).innerJoin(exams, eq(attempts.examId, exams.id))
    .where(and(eq(attempts.id, attemptId), eq(attempts.examId, id), eq(attempts.userId, user.id))).limit(1);
  if (!record || !record.showReview || record.status !== "graded") return jsonError("مراجعة هذه المحاولة غير متاحة.", 403);
  const answers = await db.select({ prompt: questions.prompt, kind: questions.kind, options: questions.options, correctIndex: questions.correctIndex, points: questions.points, value: attemptAnswers.value, awarded: attemptAnswers.awarded, feedback: attemptAnswers.feedback })
    .from(attemptAnswers).innerJoin(questions, eq(attemptAnswers.questionId, questions.id)).where(eq(attemptAnswers.attemptId, attemptId)).orderBy(questions.sortOrder);
  return Response.json({ answers });
}
