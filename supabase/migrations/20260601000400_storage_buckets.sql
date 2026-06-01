insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-covers', 'event-covers', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "event covers are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'event-covers');

create policy "authenticated users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can upload own event covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can update own event covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can delete own event covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "conversation members can read chat attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.user_id = auth.uid()
      and cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and c.deleted_at is null
  )
);

create policy "conversation members can upload own chat attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.user_id = auth.uid()
      and cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and c.deleted_at is null
  )
);

create policy "conversation members can update own chat attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.user_id = auth.uid()
      and cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and c.deleted_at is null
  )
);

create policy "conversation members can delete own chat attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
