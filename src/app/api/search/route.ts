import { db } from "@/db";
import { lectures } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 60).replace(/[%_\\]/g, "");
  if (q.length < 2) return Response.json({ lectures: [] });
  try {
    const rows = await db.select({ id: lectures.id, title: lectures.title, free: lectures.freePreview })
      .from(lectures)
      .where(and(eq(lectures.published, true), or(ilike(lectures.title, `%${q}%`), ilike(lectures.description, `%${q}%`))))
      .limit(8);
    return Response.json({ lectures: rows });
  } catch {
    return Response.json({ lectures: [] });
  }
}
