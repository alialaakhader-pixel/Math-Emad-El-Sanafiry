import { pool } from "@/db";
let ready: Promise<unknown> | null = null;
const ensure = () => (ready ??= pool.query("create table if not exists ai_cache(key text primary key, body text not null, created_at timestamptz not null default now())").catch(e => { ready = null; throw e; }));
export async function cacheGet(key: string, maxAgeHours = 24 * 365) {
  await ensure();
  const r = await pool.query("select body from ai_cache where key=$1 and created_at > now() - ($2 || ' hours')::interval", [key, String(maxAgeHours)]);
  return (r.rows[0]?.body as string) || null;
}
export async function cacheSet(key: string, body: string) {
  await ensure();
  await pool.query("insert into ai_cache(key,body) values ($1,$2) on conflict (key) do update set body=excluded.body, created_at=now()", [key, body]);
}
