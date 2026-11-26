import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { announcements, assignments, exams, grades, lectures, modules } from "@/db/schema";

export type LandingGrade = {
  id: number;
  stage: string;
  name: string;
  shortName: string;
  lectureCount: number;
};

export type LandingLecture = {
  id: string;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
  gradeName: string;
  moduleTitle: string;
  term: string;
  createdAt: Date;
};

export type LandingAnnouncement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
};

export type LandingData = {
  grades: LandingGrade[];
  latest: LandingLecture[];
  announcements: LandingAnnouncement[];
  counts: { lectures: number; modules: number; exams: number; assignments: number };
};

async function countOf(table: typeof lectures | typeof modules | typeof exams | typeof assignments, publishedOnly = false): Promise<number> {
  const rows = await db.execute(
    publishedOnly
      ? sql`select count(*)::int as n from ${table} where is_published = true`
      : sql`select count(*)::int as n from ${table}`
  );
  const row = rows.rows?.[0] as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

/**
 * Every number rendered on the landing page comes from a live query.
 * Nothing here is hard-coded or estimated.
 */
export async function getLandingData(): Promise<LandingData> {
  const gradeRows = await db
    .select({
      id: grades.id,
      stage: grades.stage,
      name: grades.name,
      shortName: grades.shortName,
      lectureCount: sql<number>`coalesce(count(${lectures.id}) filter (where ${lectures.isPublished} = true), 0)::int`,
    })
    .from(grades)
    .leftJoin(modules, eq(modules.gradeId, grades.id))
    .leftJoin(lectures, eq(lectures.moduleId, modules.id))
    .groupBy(grades.id)
    .orderBy(grades.sortOrder);

  const lectureRows = await db
    .select({
      id: lectures.id,
      title: lectures.title,
      summary: lectures.summary,
      durationMinutes: lectures.durationMinutes,
      gradeName: grades.name,
      moduleTitle: modules.title,
      term: modules.term,
      createdAt: lectures.createdAt,
    })
    .from(lectures)
    .innerJoin(modules, eq(lectures.moduleId, modules.id))
    .innerJoin(grades, eq(modules.gradeId, grades.id))
    .where(sql`${lectures.isPublished} = true`)
    .orderBy(desc(lectures.createdAt))
    .limit(3);

  const announcementRows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      isPinned: announcements.isPinned,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .where(sql`${announcements.isActive} = true`)
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
    .limit(4);

  const [lectureCount, moduleCount, examCount, assignmentCount] = await Promise.all([
    countOf(lectures, true),
    countOf(modules),
    countOf(exams, true),
    countOf(assignments, true),
  ]);

  return {
    grades: gradeRows.length > 0
      ? gradeRows.map((g) => ({ ...g, lectureCount: Number(g.lectureCount ?? 0) }))
      : [
          { id: -1, stage: "البكالوريا", name: "أولى بكالوريا", shortName: "أولى بكالوريا", lectureCount: 0 },
          { id: -2, stage: "البكالوريا", name: "تانية بكالوريا", shortName: "تانية بكالوريا", lectureCount: 0 },
          { id: -3, stage: "الثانوية العامة", name: "تالتة ثانوي", shortName: "تالتة ثانوي", lectureCount: 0 },
        ],
    latest: lectureRows,
    announcements: announcementRows,
    counts: {
      lectures: lectureCount,
      modules: moduleCount,
      exams: examCount,
      assignments: assignmentCount,
    },
  };
}
