import { ensureChat, purgeOldChatImages } from "@/lib/notify";

export const dynamic = "force-dynamic";
// Daily Vercel cron. Idempotent: only clears image bytes older than 30 days.
export async function GET() {
  await ensureChat();
  const n = await purgeOldChatImages(true);
  return Response.json({ cleared: n });
}
