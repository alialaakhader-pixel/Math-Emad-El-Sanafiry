import { RoomServiceClient } from "livekit-server-sdk";
import crypto from "crypto";

export const liveConfigured = () => !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
export const roomFor = (gradeId: string) => `live-${gradeId}`;
export const validId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const roomClient = () => new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
type Invite = { n: string; exp: number };
export type RoomInfo = { live: boolean; teacherPresent: boolean; count: number; names: { identity: string; name: string }[]; invites: Invite[] };
export async function roomState(gradeId: string): Promise<RoomInfo> {
  const name = roomFor(gradeId);
  const rooms = await roomClient().listRooms([name]);
  const room = rooms.find(r => r.name === name);
  if (!room) return { live: false, teacherPresent: false, count: 0, names: [], invites: [] };
  const parts = await roomClient().listParticipants(name);
  let invites: Invite[] = [];
  try { invites = (JSON.parse(room.metadata || "{}").invites || []).filter((i: Invite) => i && typeof i.n === "string" && i.exp > Date.now()); } catch { /* none */ }
  const teacherPresent = parts.some(p => p.identity.startsWith("t-"));
  return { live: teacherPresent, teacherPresent, count: parts.length, names: parts.map(p => ({ identity: p.identity, name: p.name || p.identity })), invites };
}
async function readMeta(gradeId: string): Promise<{ invites?: Invite[]; studentUploads?: boolean }> {
  const name = roomFor(gradeId);
  const room = (await roomClient().listRooms([name])).find(r => r.name === name);
  try { return JSON.parse(room?.metadata || "{}"); } catch { return {}; }
}
export async function patchMeta(gradeId: string, patch: { invites?: Invite[]; studentUploads?: boolean }) {
  const cur = await readMeta(gradeId);
  await roomClient().updateRoomMetadata(roomFor(gradeId), JSON.stringify({ ...cur, ...patch }));
}
export const setInvites = (gradeId: string, invites: Invite[]) => patchMeta(gradeId, { invites });
export async function studentUploadsOn(gradeId: string) { return !!(await readMeta(gradeId)).studentUploads; }
// Signed guest invite: base64url(gradeId.nonce.exp).hmac. Valid only while its nonce is listed in the live room's metadata, so revoking removes it at once.
const sig = (body: string) => crypto.createHmac("sha256", process.env.LIVEKIT_API_SECRET!).update("guest-invite:" + body).digest("base64url").slice(0, 22);
export function makeInviteCode(gradeId: string, nonce: string, exp: number) {
  const body = Buffer.from(`${gradeId}.${nonce}.${exp}`).toString("base64url");
  return `${body}.${sig(body)}`;
}
export function readInviteCode(code: unknown): { gradeId: string; nonce: string; exp: number } | null {
  if (typeof code !== "string" || code.length > 200) return null;
  const [body, mac] = code.split(".");
  if (!body || !mac) return null;
  const want = sig(body);
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const [gradeId, nonce, exp] = Buffer.from(body, "base64url").toString().split(".");
  if (!validId(gradeId) || !/^[a-f0-9]{16}$/.test(nonce || "") || !Number(exp)) return null;
  return { gradeId, nonce, exp: Number(exp) };
}
