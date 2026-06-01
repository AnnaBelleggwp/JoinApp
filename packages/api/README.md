# @join/api

Typed client wrapper for JoinApp Supabase RPC commands.

```ts
import { createJoinApi, createJoinSupabaseClient, readSupabaseConfig } from "@join/api";

const supabase = createJoinSupabaseClient(readSupabaseConfig(import.meta.env));
const joinApi = createJoinApi(supabase);

const eventId = await joinApi.events.create({
  title: "Founders Breakfast",
  startsAt: new Date().toISOString(),
  locationName: "Moscow",
  latitude: 55.7558,
  longitude: 37.6173,
});
```

This package should stay framework-agnostic. React, Expo, and Next.js integrations belong in app-specific packages or app code.
