-- JoinApp production schema foundation.
-- This migration targets Supabase Postgres and assumes Supabase Auth owns auth.users.

create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.event_visibility as enum ('public', 'private', 'unlisted');
create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.attendee_role as enum ('organizer', 'attendee');
create type public.event_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.conversation_type as enum ('direct', 'event');
create type public.message_kind as enum ('text', 'image', 'system');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target_type as enum ('profile', 'event', 'message');
create type public.notification_type as enum ('event_request', 'event_approved', 'event_rejected', 'message', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  birth_year integer,
  phone text,
  available_for_invites boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$'),
  constraint profiles_birth_year_reasonable check (birth_year is null or birth_year between 1900 and 2100)
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hide_events boolean not null default false,
  allow_direct_messages boolean not null default true,
  allow_push_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_categories_slug_format check (slug ~ '^[a-z0-9-]{2,64}$')
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  category_id uuid references public.event_categories(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  visibility public.event_visibility not null default 'public',
  status public.event_status not null default 'draft',
  requires_approval boolean not null default false,
  hide_attendees boolean not null default false,
  max_attendees integer,
  attendees_count integer not null default 0,
  pending_requests_count integer not null default 0,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint events_title_length check (char_length(trim(title)) between 2 and 140),
  constraint events_ends_after_starts check (ends_at is null or ends_at > starts_at),
  constraint events_max_attendees_positive check (max_attendees is null or max_attendees > 0),
  constraint events_attendees_count_nonnegative check (attendees_count >= 0),
  constraint events_pending_requests_count_nonnegative check (pending_requests_count >= 0)
);

create table public.event_locations (
  event_id uuid primary key references public.events(id) on delete cascade,
  location_name text not null,
  address text,
  city text,
  country text,
  geo_point geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.attendee_role not null default 'attendee',
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.event_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.event_request_status not null default 'pending',
  message text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  unique (event_id, invitee_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  event_id uuid references public.events(id) on delete cascade,
  title text,
  avatar_url text,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint conversations_event_type_requires_event check (
    (type = 'event' and event_id is not null) or (type = 'direct' and event_id is null)
  )
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public.message_kind not null default 'text',
  body text,
  attachment_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_content_required check (
    (kind = 'text' and body is not null and char_length(trim(body)) > 0)
    or (kind = 'image' and attachment_path is not null)
    or kind = 'system'
  )
);

create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_platform_known check (platform in ('ios', 'android', 'web'))
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_locations_set_updated_at
before update on public.event_locations
for each row execute function public.set_updated_at();

create trigger event_requests_set_updated_at
before update on public.event_requests
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.sync_event_attendees_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.events
    set attendees_count = attendees_count + 1
    where id = new.event_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.events
    set attendees_count = greatest(attendees_count - 1, 0)
    where id = old.event_id;
    return old;
  end if;

  return null;
end;
$$;

create trigger event_attendees_sync_count
after insert or delete on public.event_attendees
for each row execute function public.sync_event_attendees_count();

create or replace function public.sync_event_pending_requests_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      update public.events
      set pending_requests_count = pending_requests_count + 1
      where id = new.event_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status <> 'pending' then
      update public.events
      set pending_requests_count = greatest(pending_requests_count - 1, 0)
      where id = new.event_id;
    elsif old.status <> 'pending' and new.status = 'pending' then
      update public.events
      set pending_requests_count = pending_requests_count + 1
      where id = new.event_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'pending' then
      update public.events
      set pending_requests_count = greatest(pending_requests_count - 1, 0)
      where id = old.event_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

create trigger event_requests_sync_pending_count
after insert or update or delete on public.event_requests
for each row execute function public.sync_event_pending_requests_count();

create index profiles_username_idx on public.profiles (username);
create index events_starts_at_idx on public.events (starts_at);
create index events_organizer_id_idx on public.events (organizer_id);
create index events_status_visibility_idx on public.events (status, visibility);
create index event_locations_geo_point_idx on public.event_locations using gist (geo_point);
create index event_attendees_user_id_idx on public.event_attendees (user_id);
create index event_requests_event_status_idx on public.event_requests (event_id, status);
create index event_requests_user_id_idx on public.event_requests (user_id);
create index conversations_event_id_idx on public.conversations (event_id);
create index conversation_members_user_id_idx on public.conversation_members (user_id);
create index messages_conversation_created_at_idx on public.messages (conversation_id, created_at desc);
create index notifications_user_created_at_idx on public.notifications (user_id, created_at desc);
create index reports_status_created_at_idx on public.reports (status, created_at);
create index audit_logs_actor_created_at_idx on public.audit_logs (actor_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.event_categories enable row level security;
alter table public.events enable row level security;
alter table public.event_locations enable row level security;
alter table public.event_media enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_requests enable row level security;
alter table public.event_invites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (deleted_at is null);

create policy "users insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "users manage their settings"
on public.user_settings for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "categories are readable"
on public.event_categories for select
to authenticated
using (true);

create policy "published public events are readable"
on public.events for select
to authenticated
using (
  organizer_id = auth.uid()
  or (
    deleted_at is null
    and visibility = 'public'
    and status = 'published'
  )
);

create policy "organizers insert events"
on public.events for insert
to authenticated
with check (
  organizer_id = auth.uid()
  and attendees_count = 0
  and pending_requests_count = 0
);

create policy "organizers update events"
on public.events for update
to authenticated
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

create policy "event locations follow event visibility"
on public.event_locations for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_locations.event_id
      and e.deleted_at is null
      and (
        e.visibility = 'public'
        or e.organizer_id = auth.uid()
      )
  )
);

create policy "organizers manage event locations"
on public.event_locations for all
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_locations.event_id and e.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_locations.event_id and e.organizer_id = auth.uid()
  )
);

create policy "event media follows event visibility"
on public.event_media for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_media.event_id
      and e.deleted_at is null
      and (
        e.visibility = 'public'
        or e.organizer_id = auth.uid()
      )
  )
);

create policy "organizers manage event media"
on public.event_media for all
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_media.event_id and e.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_media.event_id and e.organizer_id = auth.uid()
  )
);

create policy "attendees are visible when allowed"
on public.event_attendees for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.events e
    where e.id = event_attendees.event_id
      and (
        e.organizer_id = auth.uid()
        or e.hide_attendees = false
      )
  )
);

create policy "users can join non-approval events"
on public.event_attendees for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'attendee'
  and exists (
    select 1 from public.events e
    where e.id = event_attendees.event_id
      and e.status = 'published'
      and e.deleted_at is null
      and e.requires_approval = false
      and (e.max_attendees is null or e.attendees_count < e.max_attendees)
  )
);

create policy "users can leave events"
on public.event_attendees for delete
to authenticated
using (user_id = auth.uid() and role <> 'organizer');

create policy "requests are visible to requester or organizer"
on public.event_requests for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.events e
    where e.id = event_requests.event_id and e.organizer_id = auth.uid()
  )
);

create policy "users create their own requests"
on public.event_requests for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

create policy "users cancel their own pending requests"
on public.event_requests for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'cancelled');

create policy "organizers decide event requests"
on public.event_requests for update
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_requests.event_id and e.organizer_id = auth.uid()
  )
)
with check (
  status in ('approved', 'rejected')
  and decided_by = auth.uid()
  and decided_at is not null
  and exists (
    select 1 from public.events e
    where e.id = event_requests.event_id and e.organizer_id = auth.uid()
  )
);

create policy "invites are visible to involved users"
on public.event_invites for select
to authenticated
using (
  inviter_id = auth.uid()
  or invitee_id = auth.uid()
  or exists (
    select 1 from public.events e
    where e.id = event_invites.event_id and e.organizer_id = auth.uid()
  )
);

create policy "event members can read conversations"
on public.conversations for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id and cm.user_id = auth.uid()
  )
);

create policy "members read conversation membership"
on public.conversation_members for select
to authenticated
using (user_id = auth.uid());

create policy "members read messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
  )
);

create policy "members send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
  )
);

create policy "users manage their read receipts"
on public.message_reads for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users read their notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "users update their notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users manage their push tokens"
on public.push_tokens for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users manage their blocks"
on public.blocks for all
to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());

create policy "users create reports"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "users read their own reports"
on public.reports for select
to authenticated
using (reporter_id = auth.uid());

-- No client policies for audit_logs. It should be written through trusted backend code.
