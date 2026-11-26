import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { assets, grades, lectures, progress, terms, units } from "@/db/schema";
import { canAccessGrade, getCurrentUser } from "@/lib/auth";
import LectureClient from "@/components/LectureClient";

export const metadata: Metadata = { title: "المحاضرة", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [lecture] = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1);
  if (!lecture) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (!lecture.published && user.role !== "teacher") notFound();
  const allowed = user.role === "teacher" || lecture.freePreview || await canAccessGrade(user, lecture.gradeId);
  const [[grade], [term], [unit], roadmap, files, [saved]] = await Promise.all([
    db.select({ title: grades.title }).from(grades).where(eq(grades.id, lecture.gradeId)).limit(1),
    lecture.termId ? db.select({ title: terms.title }).from(terms).where(eq(terms.id, lecture.termId)).limit(1) : Promise.resolve([]),
    lecture.unitId ? db.select({ title: units.title }).from(units).where(eq(units.id, lecture.unitId)).limit(1) : Promise.resolve([]),
    db.select({ id: lectures.id, title: lectures.title, freePreview: lectures.freePreview }).from(lectures).where(and(eq(lectures.gradeId, lecture.gradeId), eq(lectures.published, true))).orderBy(lectures.sortOrder),
    allowed ? db.select({ id: assets.id, fileName: assets.fileName, mimeType: assets.mimeType, size: assets.size }).from(assets).where(eq(assets.lectureId, lecture.id)) : Promise.resolve([]),
    user.role === "student" ? db.select({ seconds: progress.seconds, completed: progress.completed }).from(progress).where(and(eq(progress.userId, user.id), eq(progress.lectureId, lecture.id))).limit(1) : Promise.resolve([]),
  ]);
  return <LectureClient user={{ name: user.name, role: user.role }} lecture={{ id: lecture.id, title: lecture.title, description: lecture.description, videoUrl: allowed ? lecture.videoUrl : null, freePreview: lecture.freePreview, gradeTitle: grade?.title || "الرياضيات", termTitle: term?.title || null, unitTitle: unit?.title || null }} allowed={allowed} files={files} roadmap={roadmap} saved={saved || null}/>;
}
