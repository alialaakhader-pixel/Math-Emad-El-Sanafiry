-- Optional hardening for deployments using a dedicated, non-owner PostgreSQL role.
-- NOT enabled by default: every DB transaction must first SET LOCAL app.session_hash
-- to the SHA-256 hash of the verified HttpOnly session token. The table owner/service
-- role is reserved for trusted server operations (signup, redemption, grading).
-- Never expose the database connection string to the browser.

create schema if not exists app_security;
create or replace function app_security.actor_id() returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select s.user_id from public.sessions s
  where s.token_hash = nullif(current_setting('app.session_hash', true), '')
    and s.expires_at > now() limit 1
$$;
create or replace function app_security.is_teacher() returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.users u where u.id = app_security.actor_id() and u.role = 'teacher')
$$;
create or replace function app_security.has_grade(g uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.subscriptions s where s.user_id = app_security.actor_id() and s.grade_id = g and s.starts_at <= now() and s.ends_at > now())
$$;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.password_resets enable row level security;
alter table public.auth_attempts enable row level security;
alter table public.grades enable row level security;
alter table public.terms enable row level security;
alter table public.units enable row level security;
alter table public.lectures enable row level security;
alter table public.assets enable row level security;
alter table public.lecture_progress enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.activation_codes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.site_settings enable row level security;
alter table public.lab_saves enable row level security;
alter table public.admin_logs enable row level security;

-- Drop/recreate for repeatable review and deployment.
drop policy if exists users_self on public.users;
create policy users_self on public.users for select using (id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists users_teacher on public.users;
create policy users_teacher on public.users for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists sessions_self on public.sessions;
create policy sessions_self on public.sessions for select using (user_id = app_security.actor_id());
drop policy if exists sessions_revoke on public.sessions;
create policy sessions_revoke on public.sessions for delete using (user_id = app_security.actor_id());
-- password_resets and auth_attempts intentionally have no client policies.

drop policy if exists grades_visible on public.grades;
create policy grades_visible on public.grades for select using (published or app_security.is_teacher());
drop policy if exists grades_teacher on public.grades;
create policy grades_teacher on public.grades for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists terms_visible on public.terms;
create policy terms_visible on public.terms for select using (app_security.is_teacher() or exists(select 1 from public.grades g where g.id = grade_id and g.published));
drop policy if exists terms_teacher on public.terms;
create policy terms_teacher on public.terms for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists units_visible on public.units;
create policy units_visible on public.units for select using (app_security.is_teacher() or exists(select 1 from public.terms t join public.grades g on g.id = t.grade_id where t.id = term_id and g.published));
drop policy if exists units_teacher on public.units;
create policy units_teacher on public.units for all using (app_security.is_teacher()) with check (app_security.is_teacher());

drop policy if exists lectures_access on public.lectures;
create policy lectures_access on public.lectures for select using (app_security.is_teacher() or (published and (free_preview or app_security.has_grade(grade_id))));
drop policy if exists lectures_teacher on public.lectures;
create policy lectures_teacher on public.lectures for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists assets_access on public.assets;
create policy assets_access on public.assets for select using (app_security.is_teacher() or owner_id = app_security.actor_id() or exists(select 1 from public.lectures l where l.id = lecture_id and l.published and (l.free_preview or app_security.has_grade(l.grade_id))));
drop policy if exists assets_teacher on public.assets;
create policy assets_teacher on public.assets for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists progress_owner on public.lecture_progress;
create policy progress_owner on public.lecture_progress for select using (user_id = app_security.actor_id() or app_security.is_teacher());

drop policy if exists exams_access on public.exams;
create policy exams_access on public.exams for select using (app_security.is_teacher() or (published and app_security.has_grade(grade_id)));
drop policy if exists exams_teacher on public.exams;
create policy exams_teacher on public.exams for all using (app_security.is_teacher()) with check (app_security.is_teacher());
-- Questions contain correct_index: NEVER grant students direct SELECT on this table.
-- Server routes provide a projection without answers during an attempt.
drop policy if exists questions_teacher on public.questions;
create policy questions_teacher on public.questions for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists attempts_owner on public.exam_attempts;
create policy attempts_owner on public.exam_attempts for select using (user_id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists answers_owner on public.attempt_answers;
create policy answers_owner on public.attempt_answers for select using (app_security.is_teacher() or exists(select 1 from public.exam_attempts a where a.id = attempt_id and a.user_id = app_security.actor_id()));

drop policy if exists codes_teacher on public.activation_codes;
create policy codes_teacher on public.activation_codes for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists subs_owner on public.subscriptions;
create policy subs_owner on public.subscriptions for select using (user_id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists subs_teacher on public.subscriptions;
create policy subs_teacher on public.subscriptions for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists announcements_public on public.announcements;
create policy announcements_public on public.announcements for select using (published or app_security.is_teacher());
drop policy if exists announcements_teacher on public.announcements;
create policy announcements_teacher on public.announcements for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications for select using (user_id is null or user_id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists notifications_teacher on public.notifications;
create policy notifications_teacher on public.notifications for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists reads_owner on public.notification_reads;
create policy reads_owner on public.notification_reads for select using (user_id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists settings_public on public.site_settings;
create policy settings_public on public.site_settings for select using (true);
drop policy if exists settings_teacher on public.site_settings;
create policy settings_teacher on public.site_settings for all using (app_security.is_teacher()) with check (app_security.is_teacher());
drop policy if exists lab_owner on public.lab_saves;
create policy lab_owner on public.lab_saves for select using (user_id = app_security.actor_id() or app_security.is_teacher());
drop policy if exists logs_teacher on public.admin_logs;
create policy logs_teacher on public.admin_logs for select using (app_security.is_teacher());
-- Trusted server routes must still verify permissions. RLS is defense in depth.
