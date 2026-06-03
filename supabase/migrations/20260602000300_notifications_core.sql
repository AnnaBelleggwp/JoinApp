alter publication supabase_realtime add table public.notifications;

create or replace function public.realtime_publication_tables()
returns table (table_name text)
language sql
stable
security definer
set search_path = public
as $$
  select ppt.tablename::text
  from pg_catalog.pg_publication_tables ppt
  where ppt.pubname = 'supabase_realtime'
    and ppt.schemaname = 'public'
    and ppt.tablename in (
      'events',
      'event_locations',
      'messages',
      'conversations',
      'conversation_members',
      'event_requests',
      'event_attendees',
      'notifications'
    )
  order by ppt.tablename;
$$;

grant execute on function public.realtime_publication_tables() to authenticated;

create or replace function public.register_push_token(
  p_platform text,
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_token_id uuid;
  v_platform text := lower(trim(coalesce(p_platform, '')));
  v_token text := trim(coalesce(p_token, ''));
begin
  if v_platform not in ('ios', 'android', 'web') then
    raise exception 'unsupported push platform';
  end if;

  if char_length(v_token) < 8 then
    raise exception 'push token is too short';
  end if;

  insert into public.push_tokens (user_id, platform, token)
  values (v_user_id, v_platform, v_token)
  on conflict (token) do update
  set
    user_id = excluded.user_id,
    platform = excluded.platform,
    updated_at = now()
  returning id into v_token_id;

  return v_token_id;
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
begin
  delete from public.push_tokens
  where user_id = v_user_id and token = trim(coalesce(p_token, ''));

  return found;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = v_user_id;

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.require_current_profile();
  v_count integer;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = v_user_id and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.unread_notifications_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.notifications
  where user_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.register_push_token(text, text) from public;
revoke all on function public.unregister_push_token(text) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.unread_notifications_count() from public;

grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.unread_notifications_count() to authenticated;
