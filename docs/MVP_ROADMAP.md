# JoinApp Mobile MVP Roadmap

## Target

Ship a production-ready mobile MVP for iPhone and Android while keeping the current Vite prototype usable as the UX reference and fallback comparison app.

The MVP is not a Figma prototype rewrite. It is a new Expo mobile app backed by the existing Supabase database, RPC commands, RLS policies, Storage buckets, and Realtime publication.

## Current Baseline

- The Vite prototype supports `local` and `supabase` data sources.
- Supabase migrations cover schema, RLS, Storage, Realtime, discovery, notifications, and core commands.
- `pnpm smoke:supabase` passes against the configured Supabase environment.
- Shared contracts already exist in `packages/core`, `packages/db`, and `packages/api`.

## Product MVP Scope

The first shippable mobile app must support:

- email/password authentication;
- registration and onboarding;
- profile view and edit;
- event discovery feed with server-side filters;
- event details;
- create and edit event;
- join, leave, request approval, approve, and reject requests;
- attendee list with privacy rules;
- direct chats and event chats;
- image uploads for avatars, event covers, and chat attachments;
- in-app notification list and unread badge;
- push-token registration contract for iOS and Android;
- basic settings for privacy and notification preferences.

Out of scope for the first MVP:

- admin app;
- public SEO web pages;
- external push delivery worker;
- complex moderation queues;
- offline-first sync;
- payments.

## Technical Plan

### 1. Mobile App Foundation

- Add `apps/mobile` as an Expo SDK 56 app.
- Use the React Native New Architecture by default.
- Keep mobile app code separate from the Vite prototype.
- Reuse `@join/core`, `@join/api`, and `@join/db`.
- Add mobile-specific API/session adapters only where React Native needs different platform storage or file handling.

### 2. Auth And Bootstrap

- Implement Supabase email/password auth with React Native session persistence.
- Reuse the existing bootstrap model:
  - no auth session: auth screen;
  - session without profile: registration screen;
  - profile without onboarding completion: onboarding screen;
  - completed profile: main app tabs.
- Keep profile creation tied to the Supabase Auth user id.

### 3. MVP Navigation

- Main tabs:
  - Events;
  - Map;
  - Chats;
  - My Events;
  - Profile.
- Modal or stack screens:
  - event details;
  - create/edit event;
  - event requests;
  - attendees;
  - chat;
  - notifications;
  - settings.

### 4. Data And Realtime

- Start with reload-after-event subscriptions, matching the Vite adapter.
- Move repeated Supabase mapping logic into shared mobile-ready helpers as soon as duplication appears.
- Keep business commands in RPC wrappers.
- Add cursor pagination before expanding feeds and chats beyond MVP test volume.

### 5. Media

- Use Supabase Storage for all uploaded media.
- Store public URLs for avatars and event covers.
- Store private Storage paths for chat attachments and resolve them with signed URLs.
- Add image compression/resizing before production beta if upload size becomes inconsistent.

### 6. Notifications

- Implement in-app notification list and unread badge first.
- Register iOS/Android push tokens through existing RPC.
- Add APNs/FCM delivery later as an Edge Function or worker that reads `notifications` and `push_tokens`.

### 7. Release Readiness

- Add EAS project config.
- Add production/staging env handling.
- Add smoke checks for Supabase.
- Add `expo-doctor` and platform build checks.
- Validate RLS-sensitive flows with two users before TestFlight/Play internal testing.

## Milestones

### Milestone A: App Shell

Done when Expo starts, reads public env vars, and can render auth/bootstrap states without touching the Vite prototype.

### Milestone B: Account And Profile

Done when a new user can sign up, create a profile, complete onboarding, edit profile/settings, and persist state across app restarts.

### Milestone C: Events

Done when users can discover, create, edit, join/leave, request approval, and manage requests from mobile.

### Milestone D: Chats

Done when direct and event chats work with text messages, images, read marking, and realtime refresh.

### Milestone E: Beta

Done when EAS builds succeed for iOS and Android, critical flows pass with two real accounts, and app configuration is ready for TestFlight and Play internal testing.

## Immediate Next Step

Build the Expo app foundation in `apps/mobile`, then wire the mobile auth/bootstrap flow to the existing Supabase contracts.
