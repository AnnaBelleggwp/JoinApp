alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_locations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.event_requests;
alter publication supabase_realtime add table public.event_attendees;

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
      'event_attendees'
    )
  order by ppt.tablename;
$$;

revoke all on function public.realtime_publication_tables() from public;
grant execute on function public.realtime_publication_tables() to authenticated;
