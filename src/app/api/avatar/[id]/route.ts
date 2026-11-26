import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser(); if (!me) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const [r] = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, id)).limit(1);
  const m = r?.avatar?.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[1], "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}
