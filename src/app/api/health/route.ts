import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      service: "emad-el-sanafyry-math-academy",
      time: new Date().toISOString(),
      database: "up",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "emad-el-sanafyry-math-academy",
        time: new Date().toISOString(),
        database: "down",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 }
    );
  }
}
