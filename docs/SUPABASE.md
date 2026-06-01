# Supabase Setup

This project is moving from a localStorage prototype to a Supabase-backed production system.

## Required Tools

- Supabase CLI.
- Docker for local Supabase.
- `pnpm`.

This repository has a local Supabase config in `supabase/config.toml`.

## Local Database

Start local Supabase:

```sh
supabase start
```

In this repo, local analytics is disabled in `supabase/config.toml`. On Colima/macOS this avoids the optional `supabase_vector` container mounting the Docker socket, which is not needed for the app core.

Apply migrations:

```sh
supabase db reset
```

Generate TypeScript database types after migrations are applied:

```sh
supabase gen types typescript --local > packages/db/src/index.ts
```

## Remote Database

Link a remote project:

```sh
supabase link --project-ref <project-ref>
```

Push migrations:

```sh
supabase db push
```

Generate remote TypeScript database types:

```sh
supabase gen types typescript --project-id <project-ref> > packages/db/src/index.ts
```

## Migrations

- `20260601000100_initial_schema.sql`: production schema, indexes, RLS, counters, and baseline policies.
- `20260601000200_core_commands.sql`: trusted RPC commands for atomic writes.
- `20260601000300_read_models.sql`: `event_cards` read model for mobile/web event lists and details.
- `20260601000400_storage_buckets.sql`: Storage buckets and owner/conversation-scoped object policies for avatars, event covers, and chat attachments.
- `20260601000500_nearby_events.sql`: PostGIS-powered event discovery RPC with optional origin/radius filtering.

## Event Discovery

Event discovery is served by `nearby_events`. The function supports both normal feeds and geo-aware feeds:

- without coordinates, it returns upcoming published events ordered by start time;
- with `latitude`/`longitude`, it filters by radius and sorts by distance;
- radius is clamped between 100 m and 100 km;
- limit is clamped between 1 and 100;
- results include `distance_meters` when an origin is provided.

This keeps GPS optional. Clients can call the same function with:

- no coordinates for a default feed;
- coordinates from system geolocation after user consent;
- coordinates from a manually selected city or map point.

The Vite adapter exposes this through `eventApi.discover(params)`. Existing `eventApi.getAll()` is now a compatibility wrapper around discovery without coordinates.

## Storage

Supabase Storage is used for user-uploaded media. Database rows store URLs only, not base64 payloads.

Buckets:

- `avatars`: public read, 5 MB max, JPG/PNG/WebP.
- `event-covers`: public read, 10 MB max, JPG/PNG/WebP.
- `chat-attachments`: private read, 10 MB max, JPG/PNG/WebP.

Object paths start with the authenticated user id:

```text
<user-id>/avatar-<random>.jpg
<user-id>/event-cover-<random>.webp
<user-id>/<conversation-id>/chat-image-<random>.png
```

Storage policies allow authenticated users to insert/update/delete only objects under their own user-id folder. Public reads are allowed for profile avatars and event covers because those are public product surfaces. Chat attachments are private: only members of the conversation encoded in the second path segment can read or upload files for that conversation.

The Vite prototype uses `src/utils/storage.ts` as the upload boundary. In local mode it returns a data URL for prototype compatibility. In Supabase mode it uploads to Storage and returns:

- public URLs for `profiles.avatar_url`, `events.cover_image_url`, and event chat avatars;
- private Storage paths for `messages.attachment_path`, which are rendered with signed URLs for conversation members.

When a public avatar or event cover is replaced, the client attempts to delete the previous Supabase Storage object after the database update succeeds. External fallback images are ignored.

## Client Write API

Mobile and web clients should call typed wrappers around these RPC functions instead of writing multi-table workflows directly:

- `create_event`
- `update_event`
- `join_event`
- `leave_event`
- `approve_event_request`
- `reject_event_request`
- `send_message`
- `mark_conversation_read`
- `get_or_create_direct_conversation`
- `direct_conversation_peer`
- `profile_hide_events`
- `nearby_events`

`profile_hide_events` is a read-oriented RPC for public profile privacy. It exposes only whether a user's events are hidden, without granting broad read access to `user_settings`.

`get_or_create_direct_conversation` atomically creates or returns a one-to-one conversation for two profiles. `direct_conversation_peer` exposes the peer profile needed to render a direct chat title/avatar without making `conversation_members` broadly readable.

The TypeScript wrapper package is `@join/api`. It exposes:

- `createJoinSupabaseClient`
- `readSupabaseConfig`
- `createJoinApi`
- `JoinApiError`

Environment variables are documented in `.env.example`. The wrapper can read Vite, Expo, and Next.js public variable names:

- `VITE_JOIN_DATA_SOURCE`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For the current Vite prototype, data source selection is controlled by:

```sh
VITE_JOIN_DATA_SOURCE=local
```

Use `local` by default. Switch to `supabase` only after migrations are applied and Supabase Auth is wired, because the Supabase adapter expects an authenticated user session.

## Auth Bootstrap

The current prototype uses Supabase email/password Auth when `VITE_JOIN_DATA_SOURCE=supabase`.

The boot sequence is:

1. `AuthScreen` creates or restores a Supabase Auth session with email/password.
2. `Registration` creates the `profiles` row for the authenticated user.
3. `Onboarding` sets `profiles.onboarding_completed = true`.

`ensureCurrentUserId()` no longer creates anonymous users in Supabase mode. It requires an existing Supabase session and returns the authenticated user's id.

For local development, email confirmations are disabled in `supabase/config.toml`, so sign-up returns an active session immediately. Production can enable confirmations, phone, OAuth, or account linking without changing the domain/RPC layer.

At app startup, `getAppBootstrapStatus()` is used instead of trusting only localStorage flags:

- local mode checks the existing local registration and onboarding flags;
- Supabase mode checks `auth.getUser()`;
- Supabase mode then verifies that a matching `profiles` row exists;
- Supabase mode reads onboarding state from `profiles.onboarding_completed`;
- if session is missing, the auth screen is shown;
- if session exists but profile is missing, the registration screen is shown.

When onboarding is completed in Supabase mode, `markOnboardingComplete()` updates `profiles.onboarding_completed = true`. This keeps onboarding state consistent across web, iOS, and Android clients.

Simple reads may use Supabase queries when RLS is sufficient. Complex reads should become views or RPC functions once query shape stabilizes.

## Verification Checklist

After applying migrations, verify:

- RLS is enabled on all user-owned tables.
- A user cannot create or update another user's profile.
- A non-organizer cannot update an event.
- A user cannot approve their own event request unless they are the organizer of that event.
- Direct join increments `events.attendees_count`.
- Pending request creation increments `events.pending_requests_count`.
- Approving or rejecting a request decrements `events.pending_requests_count`.
- Approving a request adds the user to `event_attendees` and the event conversation.
- Leaving an event removes the user from `event_attendees` and the event conversation.
- Sending a message updates `conversations.last_message_preview` and `last_message_at`.

## Smoke Check

After migrations are applied, run:

```sh
pnpm smoke:supabase
```

The script loads `.env` and `.env.local`, then checks:

- email/password organizer auth;
- profile creation;
- avatar Storage upload and public read;
- profile/settings update;
- event cover Storage upload and public read;
- approval-required event creation;
- event detail/location update;
- nearby event discovery with distance calculation;
- email/password attendee auth;
- public profile privacy read;
- direct conversation creation;
- direct conversation peer read;
- direct message sending;
- private direct image attachment upload, signed read, and message sending;
- join request creation;
- organizer approval;
- attendee membership;
- attendee list read;
- event conversation creation;
- message sending;
- conversation read marking;
- organizer soft delete of the smoke event.

Without Supabase env vars the script exits successfully with a skip message. Use `--required` when CI should fail if env vars are missing:

```sh
pnpm smoke:supabase -- --required
```
