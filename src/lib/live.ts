import { RoomServiceClient } from "livekit-server-sdk";

export const liveConfigured = () => !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
export const roomFor = (gradeId: string) => `live-${gradeId}`;
export const validId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const roomClient = () => new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
export async function roomState(gradeId: string) {
  const name = roomFor(gradeId);
  const rooms = await roomClient().listRooms([name]);
  const room = rooms.find(r => r.name === name);
  if (!room) return { live: false, count: 0, names: [] as { identity: string; name: string }[] };
  const parts = await roomClient().listParticipants(name);
  return { live: true, count: parts.length, names: parts.map(p => ({ identity: p.identity, name: p.name || p.identity })) };
}
