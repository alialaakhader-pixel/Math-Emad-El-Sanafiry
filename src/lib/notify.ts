import "server-only";
import { pool } from "@/db";

export async function notifyGrade(gradeId: string, title: string, body: string) {
  await pool.query(
    "insert into notifications(user_id,title,body) select id,$2,$3 from users where role='student' and grade_id=$1",
    [gradeId, title.slice(0, 200), body.slice(0, 1000)],
  );
}
export async function notifyUser(userId: string, title: string, body: string) {
  await pool.query("insert into notifications(user_id,title,body) values ($1,$2,$3)", [userId, title.slice(0, 200), body.slice(0, 1000)]);
}

let ready: Promise<unknown> | null = null;
export function ensureSubmissions() {
  ready ??= pool.query(`create table if not exists homework_submissions(
    id uuid primary key default gen_random_uuid(),
    exam_id uuid not null references exams(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    body text not null default '',
    asset_id uuid references assets(id) on delete set null,
    status text not null default 'submitted',
    comment text not null default '',
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(exam_id,user_id));
    create index if not exists hs_status_idx on homework_submissions(status, updated_at desc)`).catch(e => { ready = null; throw e; });
  return ready;
}

let chatReady: Promise<unknown> | null = null;
export function ensureChat() {
  chatReady ??= pool.query(`create table if not exists chat_messages(
    id uuid primary key default gen_random_uuid(),
    grade_id uuid not null references grades(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now());
    create index if not exists chat_grade_idx on chat_messages(grade_id, created_at desc);
    create table if not exists chat_flags(
    message_id uuid not null references chat_messages(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key(message_id,user_id));
    alter table chat_messages add column if not exists image bytea;
    create table if not exists chat_mutes(user_id uuid primary key references users(id) on delete cascade, until timestamptz not null)`).catch(e => { chatReady = null; throw e; });
  return chatReady;
}

let qtReady: Promise<unknown> | null = null;
export function ensureQuestionTopic() {
  qtReady ??= pool.query("alter table questions add column if not exists topic text").catch(e => { qtReady = null; throw e; });
  return qtReady;
}
