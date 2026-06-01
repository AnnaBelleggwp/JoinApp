-- Atomic backend commands for JoinApp.
-- Clients should prefer these RPC functions for writes that affect multiple tables.

create or replace function public.require_current_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id and p.deleted_at is null
  ) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_user_id;
end;
$$;

create or replace function public.create_event(
  p_title text,
  p_starts_at timestamptz,
  p_location_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_description text default null,
  p_ends_at timestamptz default null,
  p_category_id uuid default null,
  p_visibility public.event_visibility default 'public',
  p_status public.event_status default 'published',
  p_requires_approval boolean default false,
  p_hide_attendees boolean default false,
  p_max_attendees integer default null,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_cover_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_event_id uuid;
  v_conversation_id uuid;
begin
  if char_length(trim(coalesce(p_title, ''))) < 2 then
    raise exception 'Event title is too short' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_location_name, ''))) < 2 then
    raise exception 'Location name is too short' using errcode = '22023';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'Event end must be after start' using errcode = '22023';
  end if;

  if p_status = 'cancelled' then
    raise exception 'New event cannot be cancelled' using errcode = '22023';
  end if;

  if p_max_attendees is not null and p_max_attendees < 1 then
    raise exception 'Max attendees must be positive' using errcode = '22023';
  end if;

  insert into public.events (
    organizer_id,
    category_id,
    title,
    description,
    starts_at,
    ends_at,
    visibility,
    status,
    requires_approval,
    hide_attendees,
    max_attendees,
    cover_image_url
  )
  values (
    v_user_id,
    p_category_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_starts_at,
    p_ends_at,
    p_visibility,
    p_status,
    p_requires_approval,
    p_hide_attendees,
    p_max_attendees,
    p_cover_image_url
  )
  returning id into v_event_id;

  insert into public.event_locations (
    event_id,
    location_name,
    address,
    city,
    country,
    geo_point
  )
  values (
    v_event_id,
    trim(p_location_name),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_country, '')), ''),
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
  );

  insert into public.event_attendees (event_id, user_id, role)
  values (v_event_id, v_user_id, 'organizer');

  insert into public.conversations (type, event_id, title, avatar_url)
  values ('event', v_event_id, trim(p_title), p_cover_image_url)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_user_id);

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (v_user_id, 'event.create', 'event', v_event_id);

  return v_event_id;
end;
$$;

create or replace function public.update_event(
  p_event_id uuid,
  p_title text default null,
  p_starts_at timestamptz default null,
  p_location_name text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_description text default null,
  p_ends_at timestamptz default null,
  p_category_id uuid default null,
  p_visibility public.event_visibility default null,
  p_status public.event_status default null,
  p_requires_approval boolean default null,
  p_hide_attendees boolean default null,
  p_max_attendees integer default null,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_cover_image_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_event public.events%rowtype;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or v_event.deleted_at is not null then
    raise exception 'event not found';
  end if;

  if v_event.organizer_id <> v_user_id then
    raise exception 'only organizer can update event';
  end if;

  if p_title is not null and char_length(trim(p_title)) < 2 then
    raise exception 'Event title is too short' using errcode = '22023';
  end if;

  if p_starts_at is not null and p_starts_at < now() - interval '1 day' then
    raise exception 'Event start date is in the past' using errcode = '22023';
  end if;

  if p_ends_at is not null and p_ends_at <= coalesce(p_starts_at, v_event.starts_at) then
    raise exception 'Event end date must be after start date' using errcode = '22023';
  end if;

  if p_max_attendees is not null and p_max_attendees < v_event.attendees_count then
    raise exception 'Max attendees cannot be lower than current attendees count' using errcode = '22023';
  end if;

  update public.events
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    description = case when p_description is null then description else nullif(trim(p_description), '') end,
    starts_at = coalesce(p_starts_at, starts_at),
    ends_at = case when p_ends_at is null then ends_at else p_ends_at end,
    category_id = case when p_category_id is null then category_id else p_category_id end,
    visibility = coalesce(p_visibility, visibility),
    status = coalesce(p_status, status),
    requires_approval = coalesce(p_requires_approval, requires_approval),
    hide_attendees = coalesce(p_hide_attendees, hide_attendees),
    max_attendees = case when p_max_attendees is null then max_attendees else p_max_attendees end,
    cover_image_url = case when p_cover_image_url is null then cover_image_url else nullif(trim(p_cover_image_url), '') end
  where id = p_event_id;

  update public.event_locations
  set
    location_name = coalesce(nullif(trim(p_location_name), ''), location_name),
    address = case when p_address is null then address else nullif(trim(p_address), '') end,
    city = case when p_city is null then city else nullif(trim(p_city), '') end,
    country = case when p_country is null then country else nullif(trim(p_country), '') end,
    geo_point = case
      when p_latitude is not null and p_longitude is not null then st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
      else geo_point
    end
  where event_id = p_event_id;

  update public.conversations
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    avatar_url = case when p_cover_image_url is null then avatar_url else nullif(trim(p_cover_image_url), '') end
  where type = 'event' and event_id = p_event_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (v_user_id, 'event.update', 'event', p_event_id);

  return true;
end;
$$;

create or replace function public.join_event(p_event_id uuid, p_message text default null)
returns table(participation_status text, request_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_event public.events%rowtype;
  v_request public.event_requests%rowtype;
  v_conversation_id uuid;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or v_event.deleted_at is not null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if v_event.status <> 'published' then
    raise exception 'Event is not published' using errcode = '22023';
  end if;

  if v_event.organizer_id = v_user_id then
    return query select 'joined'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1 from public.event_attendees ea
    where ea.event_id = p_event_id and ea.user_id = v_user_id
  ) then
    return query select 'joined'::text, null::uuid;
    return;
  end if;

  if v_event.max_attendees is not null and v_event.attendees_count >= v_event.max_attendees then
    raise exception 'Event is full' using errcode = '22023';
  end if;

  if v_event.requires_approval then
    select *
    into v_request
    from public.event_requests
    where event_id = p_event_id and user_id = v_user_id
    for update;

    if found and v_request.status = 'pending' then
      return query select 'pending'::text, v_request.id;
      return;
    end if;

    if found and v_request.status = 'approved' then
      insert into public.event_attendees (event_id, user_id, role)
      values (p_event_id, v_user_id, 'attendee')
      on conflict (event_id, user_id) do nothing;

      select c.id
      into v_conversation_id
      from public.conversations c
      where c.type = 'event' and c.event_id = p_event_id and c.deleted_at is null
      limit 1;

      if v_conversation_id is not null then
        insert into public.conversation_members (conversation_id, user_id)
        values (v_conversation_id, v_user_id)
        on conflict (conversation_id, user_id) do nothing;
      end if;

      return query select 'joined'::text, v_request.id;
      return;
    end if;

    if found then
      update public.event_requests
      set
        status = 'pending',
        message = nullif(trim(coalesce(p_message, '')), ''),
        decided_by = null,
        decided_at = null
      where id = v_request.id
      returning * into v_request;
    else
      insert into public.event_requests (event_id, user_id, message)
      values (p_event_id, v_user_id, nullif(trim(coalesce(p_message, '')), ''))
      returning * into v_request;
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_event.organizer_id,
      'event_request',
      'New event request',
      null,
      jsonb_build_object('eventId', p_event_id, 'requestId', v_request.id, 'userId', v_user_id)
    );

    return query select 'pending'::text, v_request.id;
    return;
  end if;

  insert into public.event_attendees (event_id, user_id, role)
  values (p_event_id, v_user_id, 'attendee')
  on conflict (event_id, user_id) do nothing;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.type = 'event' and c.event_id = p_event_id and c.deleted_at is null
  limit 1;

  if v_conversation_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return query select 'joined'::text, null::uuid;
end;
$$;

create or replace function public.leave_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_attendee public.event_attendees%rowtype;
begin
  select *
  into v_attendee
  from public.event_attendees
  where event_id = p_event_id and user_id = v_user_id
  for update;

  if not found then
    return false;
  end if;

  if v_attendee.role = 'organizer' then
    raise exception 'Organizer cannot leave own event' using errcode = '22023';
  end if;

  delete from public.event_attendees
  where event_id = p_event_id and user_id = v_user_id;

  delete from public.conversation_members cm
  using public.conversations c
  where cm.conversation_id = c.id
    and c.type = 'event'
    and c.event_id = p_event_id
    and cm.user_id = v_user_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (v_user_id, 'event.leave', 'event', p_event_id);

  return true;
end;
$$;

create or replace function public.approve_event_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_request public.event_requests%rowtype;
  v_event public.events%rowtype;
  v_conversation_id uuid;
begin
  select *
  into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  select *
  into v_event
  from public.events
  where id = v_request.event_id
  for update;

  if not found or v_event.organizer_id <> v_user_id then
    raise exception 'Only organizer can approve request' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = '22023';
  end if;

  if v_event.max_attendees is not null and v_event.attendees_count >= v_event.max_attendees then
    raise exception 'Event is full' using errcode = '22023';
  end if;

  update public.event_requests
  set status = 'approved', decided_by = v_user_id, decided_at = now()
  where id = p_request_id;

  insert into public.event_attendees (event_id, user_id, role)
  values (v_request.event_id, v_request.user_id, 'attendee')
  on conflict (event_id, user_id) do nothing;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.type = 'event' and c.event_id = v_request.event_id and c.deleted_at is null
  limit 1;

  if v_conversation_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_request.user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_request.user_id,
    'event_approved',
    'Event request approved',
    null,
    jsonb_build_object('eventId', v_request.event_id, 'requestId', p_request_id)
  );

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (v_user_id, 'event_request.approve', 'event_request', p_request_id);

  return true;
end;
$$;

create or replace function public.reject_event_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_request public.event_requests%rowtype;
  v_event public.events%rowtype;
begin
  select *
  into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  select *
  into v_event
  from public.events
  where id = v_request.event_id;

  if not found or v_event.organizer_id <> v_user_id then
    raise exception 'Only organizer can reject request' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = '22023';
  end if;

  update public.event_requests
  set status = 'rejected', decided_by = v_user_id, decided_at = now()
  where id = p_request_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_request.user_id,
    'event_rejected',
    'Event request rejected',
    null,
    jsonb_build_object('eventId', v_request.event_id, 'requestId', p_request_id)
  );

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (v_user_id, 'event_request.reject', 'event_request', p_request_id);

  return true;
end;
$$;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_kind public.message_kind default 'text',
  p_attachment_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_message_id uuid;
  v_preview text;
begin
  if not exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_user_id
      and c.deleted_at is null
  ) then
    raise exception 'Conversation not found' using errcode = 'P0002';
  end if;

  insert into public.messages (conversation_id, sender_id, kind, body, attachment_path)
  values (
    p_conversation_id,
    v_user_id,
    p_kind,
    nullif(trim(coalesce(p_body, '')), ''),
    nullif(trim(coalesce(p_attachment_path, '')), '')
  )
  returning id into v_message_id;

  v_preview := case
    when p_kind = 'text' then left(trim(coalesce(p_body, '')), 160)
    when p_kind = 'image' then 'Image'
    else 'System message'
  end;

  update public.conversations
  set last_message_preview = v_preview, last_message_at = now()
  where id = p_conversation_id;

  return v_message_id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = v_user_id;

  return found;
end;
$$;

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_conversation_id uuid;
  v_lock_key bigint;
begin
  if p_other_user_id = v_user_id then
    raise exception 'cannot create direct conversation with self';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_other_user_id and p.deleted_at is null) then
    raise exception 'profile not found';
  end if;

  if exists (
    select 1
    from public.user_settings us
    where us.user_id = p_other_user_id and us.allow_direct_messages = false
  ) then
    raise exception 'direct messages are disabled for this profile';
  end if;

  v_lock_key := hashtextextended(
    least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text),
    0
  );
  perform pg_advisory_xact_lock(v_lock_key);

  select c.id
  into v_conversation_id
  from public.conversations c
  join public.conversation_members cm_current
    on cm_current.conversation_id = c.id and cm_current.user_id = v_user_id
  join public.conversation_members cm_other
    on cm_other.conversation_id = c.id and cm_other.user_id = p_other_user_id
  where c.type = 'direct' and c.deleted_at is null
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (type)
    values ('direct')
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values
      (v_conversation_id, v_user_id),
      (v_conversation_id, p_other_user_id);
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.direct_conversation_peer(p_conversation_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
begin
  if not exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_user_id
      and c.type = 'direct'
      and c.deleted_at is null
  ) then
    raise exception 'direct conversation not found';
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = p_conversation_id
    and cm.user_id <> v_user_id
    and p.deleted_at is null
  limit 1;
end;
$$;

create or replace function public.profile_hide_events(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_current_profile();

  return coalesce(
    (
      select us.hide_events
      from public.user_settings us
      join public.profiles p on p.id = us.user_id
      where us.user_id = p_user_id and p.deleted_at is null
    ),
    false
  );
end;
$$;

revoke all on function public.require_current_profile() from public;
revoke all on function public.create_event(
  text,
  timestamptz,
  text,
  double precision,
  double precision,
  text,
  timestamptz,
  uuid,
  public.event_visibility,
  public.event_status,
  boolean,
  boolean,
  integer,
  text,
  text,
  text,
  text
) from public;
revoke all on function public.update_event(
  uuid,
  text,
  timestamptz,
  text,
  double precision,
  double precision,
  text,
  timestamptz,
  uuid,
  public.event_visibility,
  public.event_status,
  boolean,
  boolean,
  integer,
  text,
  text,
  text,
  text
) from public;
revoke all on function public.join_event(uuid, text) from public;
revoke all on function public.leave_event(uuid) from public;
revoke all on function public.approve_event_request(uuid) from public;
revoke all on function public.reject_event_request(uuid) from public;
revoke all on function public.send_message(uuid, text, public.message_kind, text) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
revoke all on function public.direct_conversation_peer(uuid) from public;
revoke all on function public.profile_hide_events(uuid) from public;

grant execute on function public.require_current_profile() to authenticated;
grant execute on function public.create_event(
  text,
  timestamptz,
  text,
  double precision,
  double precision,
  text,
  timestamptz,
  uuid,
  public.event_visibility,
  public.event_status,
  boolean,
  boolean,
  integer,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.update_event(
  uuid,
  text,
  timestamptz,
  text,
  double precision,
  double precision,
  text,
  timestamptz,
  uuid,
  public.event_visibility,
  public.event_status,
  boolean,
  boolean,
  integer,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.join_event(uuid, text) to authenticated;
grant execute on function public.leave_event(uuid) to authenticated;
grant execute on function public.approve_event_request(uuid) to authenticated;
grant execute on function public.reject_event_request(uuid) to authenticated;
grant execute on function public.send_message(uuid, text, public.message_kind, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.direct_conversation_peer(uuid) to authenticated;
grant execute on function public.profile_hide_events(uuid) to authenticated;
