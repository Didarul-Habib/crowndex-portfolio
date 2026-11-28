-- CrownDEX Contact Inbox — additive migration
-- Run once in Supabase Dashboard > SQL Editor.
-- Does not alter existing portfolio, profile, CMS, auth, or storage records.
-- Public visitors cannot read or directly insert inbox rows. The public form
-- submits through the protected submit-contact Edge Function using Turnstile.

begin;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  project_type text not null default 'Project enquiry',
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz,
  ip_hash text
);

alter table public.contact_messages
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists ip_hash text;

alter table public.contact_messages enable row level security;

-- No browser role can insert a message directly. The Edge Function uses the
-- server-side service role after verifying Turnstile and validating the input.
revoke all on table public.contact_messages from anon, authenticated;
grant select (id, name, email, project_type, message, created_at, read_at, archived_at)
  on table public.contact_messages to authenticated;
grant delete on table public.contact_messages to authenticated;
grant update (read_at, archived_at) on table public.contact_messages to authenticated;
grant all on table public.contact_messages to service_role;

drop policy if exists "CrownDEX admins read contact messages" on public.contact_messages;
create policy "CrownDEX admins read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

drop policy if exists "CrownDEX admins update contact message state" on public.contact_messages;
create policy "CrownDEX admins update contact message state"
  on public.contact_messages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

drop policy if exists "CrownDEX admins delete contact messages" on public.contact_messages;
create policy "CrownDEX admins delete contact messages"
  on public.contact_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_unread_idx
  on public.contact_messages (created_at desc)
  where read_at is null and archived_at is null;

create index if not exists contact_messages_ip_created_idx
  on public.contact_messages (ip_hash, created_at desc)
  where ip_hash is not null;

-- Enable live inbox updates when the Supabase Realtime publication is present.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contact_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.contact_messages';
  end if;
end
$$;

comment on table public.contact_messages is
  'Private CrownDEX website enquiries. Admin-only access; public writes go through the Turnstile-verified submit-contact Edge Function.';

commit;
