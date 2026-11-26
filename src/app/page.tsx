import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements, grades, lectures, siteSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [allGrades, newestLectures, latestAnnouncements, settingsRows, user] = await Promise.all([
    db.select({ id: grades.id, title: grades.title, stage: grades.stage }).from(grades).where(eq(grades.published, true)).orderBy(grades.sortOrder),
    db.select({ id: lectures.id, title: lectures.title, description: lectures.description, gradeId: lectures.gradeId, createdAt: lectures.createdAt }).from(lectures).where(eq(lectures.published, true)).orderBy(desc(lectures.createdAt)).limit(3),
    db.select({ id: announcements.id, title: announcements.title, body: announcements.body, createdAt: announcements.createdAt }).from(announcements).where(eq(announcements.published, true)).orderBy(desc(announcements.createdAt)).limit(3),
    db.select().from(siteSettings),
    getCurrentUser(),
  ]);
  return <Landing grades={allGrades} lectures={newestLectures} announcements={latestAnnouncements} settings={Object.fromEntries(settingsRows.map(s => [s.key, s.value]))} user={user ? { name: user.name, role: user.role } : null}/>;
}
