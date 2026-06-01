# JoinApp Architecture Plan

## Goal

Build JoinApp as a reliable cross-platform product with native iOS and Android apps plus a production web version. The current Vite app is treated as a UX prototype and source of screen flows, not as the final application core.

## Product Surface

- Mobile apps: iOS and Android.
- Web app: authenticated user experience, event pages, profile pages, and future SEO-friendly public pages.
- Admin surface: moderation, reports, content operations, and support tools.

## Recommended Stack

### Mobile

- Expo + React Native.
- TypeScript.
- Expo Router or React Navigation, selected during the mobile scaffold stage.
- TanStack Query for server state, cache, retries, and optimistic updates.
- Zod for input and API contract validation.
- Expo Notifications for push notifications.

### Web

- Next.js + React + TypeScript.
- Server rendering for public event/profile pages where SEO or fast first load matters.
- TanStack Query for authenticated client data.
- Tailwind can remain for web UI if it keeps implementation speed high.

### Backend

- Supabase as the first production backend platform.
- PostgreSQL as the source of truth.
- PostGIS for location search and distance queries.
- Supabase Auth for authentication.
- Supabase Storage for avatars, event images, and chat attachments.
- Supabase Realtime for chats, requests, attendance changes, and notification-like updates.
- Edge Functions or Postgres RPC for business operations that must be atomic or protected.

### Repository

Move toward a monorepo:

```txt
apps/
  mobile/
  web/
  admin/

packages/
  core/
  api/
  db/
  validation/
  ui-tokens/
  config/
```

The current single Vite app should stay stable until the new apps can replace it screen by screen.

## Why PostgreSQL + PostGIS

JoinApp is relational by nature: users organize events, events have attendees, requests, chats, messages, media, visibility rules, and moderation states. PostgreSQL gives transactions, constraints, indexes, analytics, and a migration path away from any single backend provider if needed.

PostGIS is required because event discovery depends on geography:

- nearby events;
- map bounding box queries;
- radius search;
- sorting by distance;
- future city/region filtering.

Firebase/Firestore is not the first choice for the main database because the app needs relational integrity, geospatial querying, analytics, and complex authorization. It can be reconsidered only if offline-first realtime synchronization becomes the dominant product requirement.

## Domain Model

Initial production tables:

- `profiles`
- `user_settings`
- `events`
- `event_locations`
- `event_media`
- `event_attendees`
- `event_requests`
- `event_invites`
- `event_categories`
- `conversations`
- `conversation_members`
- `messages`
- `message_reads`
- `notifications`
- `push_tokens`
- `blocks`
- `reports`
- `audit_logs`

Core event fields:

- `id`
- `organizer_id`
- `title`
- `description`
- `starts_at`
- `ends_at`
- `visibility`
- `requires_approval`
- `max_attendees`
- `location_name`
- `geo_point`
- `status`
- `created_at`
- `updated_at`

Important indexes:

- `events.starts_at`
- `events.organizer_id`
- `events.geo_point` with a PostGIS GiST index
- `event_attendees.user_id`
- `event_attendees.event_id`
- `event_requests.event_id, status`
- `conversation_members.user_id`
- `messages.conversation_id, created_at`

## Business Logic Ownership

Business rules must not live inside React components.

Shared rules belong in `packages/core` where possible:

- whether a user can join an event;
- whether approval is required;
- whether attendees can be viewed;
- whether a user can edit or delete an event;
- whether a user can read or send messages in a conversation;
- how participation status is calculated.

Rules that require trusted state or atomic writes belong on the backend:

- create event;
- join event;
- leave event;
- approve or reject request;
- create event chat;
- send message;
- update read state;
- delete or cancel event.

## API Strategy

Start with Supabase client for simple reads where Row Level Security is enough.

Use RPC or Edge Functions for commands:

- `create_event`
- `update_event`
- `delete_event`
- `join_event`
- `leave_event`
- `approve_event_request`
- `reject_event_request`
- `send_message`
- `mark_conversation_read`

The frontend should call typed APIs from `packages/api`, not hand-written Supabase queries scattered across screens.

## Security Model

Required from the first production database migration:

- Row Level Security enabled on user-owned tables.
- Storage policies for avatars, event media, and attachments.
- Service role key only in backend functions.
- User blocks and reports represented in the data model.
- Audit logs for sensitive organizer/admin actions.
- Rate limiting for registration, messaging, joins, requests, and media uploads.
- Soft delete for events, messages, and profiles where business history matters.

## Performance Requirements

- Cursor pagination for feeds, chats, and history.
- Optimistic updates for join/leave/request actions.
- Cached reads with TanStack Query.
- Image resizing and CDN-backed delivery.
- Lazy map loading.
- Bounding box and radius geospatial queries.
- Precomputed or transactionally maintained counters for attendees and unread messages.
- Avoid loading full attendee/message lists when only counts or previews are needed.

## Migration Plan

### Phase 0: Stabilize Current Prototype

- Add TypeScript project config.
- Add package manager consistency.
- Add architecture documentation.
- Keep the current Vite app running while backend and monorepo foundations are designed.

### Phase 1: Data Model

- Create database migrations.
- Define RLS policies.
- Generate database types.
- Move current localStorage interfaces into shared domain types.
- Define Zod schemas for input validation.

### Phase 2: Backend Commands

- Implement event, request, profile, and chat commands.
- Add tests for authorization-sensitive operations.
- Replace localStorage API with typed backend API behind the same feature surface.

### Phase 3: Mobile App

- Scaffold Expo app.
- Port screens from the prototype.
- Connect auth, profile, events, map, requests, and chats.
- Add push notifications.

### Phase 4: Web App

- Scaffold Next.js app.
- Build authenticated web app.
- Add public event/profile pages where useful.
- Add server rendering for public pages.

### Phase 5: Admin and Operations

- Add admin app.
- Add moderation queues, reports, audit logs, and support workflows.
- Add monitoring, error tracking, and analytics.

## First Engineering Principles

- Keep UI separate from domain rules.
- Keep database constraints stronger than frontend assumptions.
- Prefer typed contracts over ad hoc JSON.
- Make security policies testable.
- Optimize query shape before optimizing UI rendering.
- Keep the prototype usable until the replacement path is proven.
