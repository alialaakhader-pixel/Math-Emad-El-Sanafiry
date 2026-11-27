import { getCurrentUser, jsonError } from "@/lib/auth";
import { getStats, topicBreakdown, weakest } from "@/lib/xp";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً.", 401);
  const [stats, topics] = await Promise.all([getStats(user.id), topicBreakdown(user.id)]);
  return Response.json({ stats, topics, weak: weakest(topics) });
}
