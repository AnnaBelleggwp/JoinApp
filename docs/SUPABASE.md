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
- `20260602000100_realtime_core.sql`: Supabase Realtime publication entries for events, chats, requests, and attendee tables.
- `20260602000200_discovery_filters.sql`: expands `nearby_events` with server-side search, date, category, attendee, and availability filters.
- `20260602000300_notifications_core.sql`: push-token RPCs, notification read RPCs, unread count RPC, and realtime publication for notifications.

## Event Discovery

Event discovery is served by `nearby_events`. The function supports both normal feeds and geo-aware feeds:

- without coordinates, it returns upcoming published events ordered by start time;
- with `latitude`/`longitude`, it filters by radius and sorts by distance;
- radius is clamped between 100 m and 100 km;
- limit is clamped between 1 and 100;
- results include `distance_meters` when an origin is provided.

Discovery filters run on the server:

- `query`: searches title, description, location name, address, and city;
- `categoryId` or `categoryName`;
- `startsAfter` and `startsBefore`;
- `minAttendees` and `maxAttendeesCount`;
- `hasAvailableSeats`.

This keeps GPS optional. Clients can call the same function with:

- no coordinates for a default feed;
- coordinates from system geolocation after user consent;
- coordinates from a manually selected city or map point.

The Vite adapter exposes this through `eventApi.discover(params)`. Existing `eventApi.getAll()` is now a compatibility wrapper around discovery without coordinates. `EventsList` uses `discover(params)` directly, so search, category, date, and attendee filters no longer require loading all events into the client first.

The current UI supports manual discovery location without requesting GPS:

- `Вся лента`: no coordinates, default upcoming feed;
- preset cities: coordinates plus radius are sent to `nearby_events`;
- selected city/radius are stored locally on the client and can be changed without account-level location tracking.

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

## Realtime

The first realtime layer publishes:

- `messages`
- `conversations`
- `conversation_members`
- `events`
- `event_locations`
- `event_requests`
- `event_attendees`
- `notifications`

The Vite client currently uses `src/utils/realtime.ts` as the realtime boundary:

- `ChatScreen` subscribes to `messages` for the active conversation and reloads messages through the normal RLS-protected API after changes.
- `ChatsList` subscribes to the current user's `conversation_members` rows and to `conversations` updates, so message previews and new memberships refresh without manual reload.
- `EventDetails` subscribes to event, location, request, and attendee changes for the active event, so counters and participation state refresh.
- `EventRequests` subscribes to request changes for the active event, so organizers see pending requests update.
- `MyEvents` subscribes to organizer event changes plus the current user's request/attendee rows, so badges and participation statuses refresh.
- `NotificationBell` and `NotificationsScreen` subscribe to current-user notification rows.

Reload-after-event is intentionally conservative for this stage. It avoids duplicating message mapping, signed attachment URL generation, and direct-chat peer resolution inside realtime payload handlers. Later we can optimize this with incremental payload mapping if profiling shows a need.

## Notifications

The current notification layer is push-ready but does not send external push yet.

Backend contracts:

- `register_push_token(platform, token)` stores or reassigns a token for `ios`, `android`, or `web`.
- `unregister_push_token(token)` deletes the current user's token.
- `unread_notifications_count()` returns the current user's unread count.
- `mark_notification_read(notification_id)` marks one notification as read.
- `mark_all_notifications_read()` marks all current-user notifications as read.

In-app notifications are already created by core event RPCs:

- `join_event` creates `event_request` for the organizer when approval is required.
- `approve_event_request` creates `event_approved` for the attendee.
- `reject_event_request` creates `event_rejected` for the attendee.

The UI exposes a realtime notification badge and a notifications screen. External APNs/FCM/Web Push delivery should be added as a later worker/edge-function layer that reads `notifications` and `push_tokens`; the product clients already have the token registration contract.

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
- realtime publication coverage;
- push token registration and notification read-state RPCs;
- avatar Storage upload and public read;
- profile/settings update;
- event cover Storage upload and public read;
- approval-required event creation;
- event detail/location update;
- nearby event discovery with distance calculation;
- server-side discovery filters;
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
