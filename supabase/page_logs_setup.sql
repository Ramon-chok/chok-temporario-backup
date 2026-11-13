-- =============================================
-- PAGE LOGS TRACKING
-- =============================================

create table if not exists public.page_logs (
  id bigint generated always as identity primary key,
  user_id text,
  user_email text,
  page_path text not null,
  page_name text not null,
  session_id text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

-- Indexes for analytics queries
create index if not exists idx_page_logs_created_at on public.page_logs (created_at desc);
create index if not exists idx_page_logs_page_path on public.page_logs (page_path);
create index if not exists idx_page_logs_user_id on public.page_logs (user_id);

-- Enable RLS
alter table public.page_logs enable row level security;

-- Remove old policies safely
drop policy if exists "page_logs_insert_authenticated" on public.page_logs;
drop policy if exists "page_logs_select_admin" on public.page_logs;
drop policy if exists "page_logs_delete_admin" on public.page_logs;

-- INSERT: any authenticated user can insert
create policy "page_logs_insert_authenticated"
on public.page_logs
for insert
to authenticated
with check (true);

-- SELECT: only admin users
create policy "page_logs_select_admin"
on public.page_logs
for select
to authenticated
using (
  coalesce(auth.jwt() ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'perfil', '') = 'admin'
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

-- DELETE: only admin users
create policy "page_logs_delete_admin"
on public.page_logs
for delete
to authenticated
using (
  coalesce(auth.jwt() ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'perfil', '') = 'admin'
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
