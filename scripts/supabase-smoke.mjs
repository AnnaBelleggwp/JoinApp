import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readEnv() {
  loadEnvFile(resolve(process.cwd(), ".env"));
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  return process.env;
}

function readSupabaseConfig(env) {
  return {
    url: env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey:
      env.VITE_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

function logStep(message) {
  console.log(`[supabase-smoke] ${message}`);
}

function randomSuffix() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SMOKE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function createSupabaseClient() {
  const config = readSupabaseConfig(readEnv());
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function uploadSmokeImage(client, bucket, userId, name, options = {}) {
  const path = options.path || `${userId}/${name}-${randomSuffix()}.png`;
  const bytes = Buffer.from(SMOKE_PNG_BASE64, "base64");
  const { error } = await client.storage.from(bucket).upload(path, bytes, {
    contentType: "image/png",
    upsert: false,
  });

  if (error) throw error;

  if (options.private) {
    const { data, error: signedUrlError } = await client.storage.from(bucket).createSignedUrl(path, 60);
    if (signedUrlError) throw signedUrlError;
    if (!data.signedUrl) throw new Error(`Storage did not return a signed URL for ${bucket}/${path}`);

    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error(`Storage signed URL returned ${response.status} for ${bucket}/${path}`);
    }

    return path;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error(`Storage did not return a public URL for ${bucket}/${path}`);

  const response = await fetch(data.publicUrl);
  if (!response.ok) {
    throw new Error(`Storage public URL returned ${response.status} for ${bucket}/${path}`);
  }

  return data.publicUrl;
}

async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  if (data == null) throw new Error(`${fn} returned no data`);
  return data;
}

async function createEmailProfile(role) {
  const client = createSupabaseClient();
  const suffix = randomSuffix();
  const { data: authData, error: authError } = await client.auth.signUp({
    email: `smoke_${role}_${suffix}@example.com`,
    password: `Smoke-${suffix}-12345`,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Email sign-up did not return a user");

  const profile = {
    id: authData.user.id,
    username: `smoke_${role}_${suffix}`.slice(0, 32),
    display_name: `Smoke ${role}`,
    bio: "Automated smoke-test profile",
    available_for_invites: true,
  };

  const { error: profileError } = await client.from("profiles").insert(profile);
  if (profileError) throw profileError;

  return { client, profile, userId: authData.user.id };
}

async function main() {
  const env = readEnv();
  const config = readSupabaseConfig(env);
  const required = process.argv.includes("--required");

  if (!config.url || !config.anonKey) {
    const message = "missing Supabase env vars; set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY";
    if (required) throw new Error(message);
    logStep(`${message}; skipping`);
    return;
  }

  logStep("creating email/password organizer profile");
  const organizer = await createEmailProfile("organizer");

  logStep("uploading organizer avatar");
  const organizerAvatarUrl = await uploadSmokeImage(organizer.client, "avatars", organizer.userId, "avatar");

  logStep("updating organizer profile and settings");
  const { data: updatedProfile, error: profileUpdateError } = await organizer.client
    .from("profiles")
    .update({ available_for_invites: false, avatar_url: organizerAvatarUrl })
    .eq("id", organizer.userId)
    .select("available_for_invites,avatar_url")
    .single();

  if (profileUpdateError) throw profileUpdateError;
  if (updatedProfile.available_for_invites !== false) {
    throw new Error("Organizer profile update did not persist");
  }
  if (updatedProfile.avatar_url !== organizerAvatarUrl) {
    throw new Error("Organizer avatar URL did not persist");
  }

  const { data: updatedSettings, error: settingsUpdateError } = await organizer.client
    .from("user_settings")
    .upsert({ user_id: organizer.userId, hide_events: true }, { onConflict: "user_id" })
    .select("hide_events")
    .single();

  if (settingsUpdateError) throw settingsUpdateError;
  if (updatedSettings.hide_events !== true) {
    throw new Error("Organizer settings update did not persist");
  }

  logStep("uploading event cover");
  const eventCoverUrl = await uploadSmokeImage(organizer.client, "event-covers", organizer.userId, "event-cover");

  logStep("creating approval-required event");
  const eventId = await rpc(organizer.client, "create_event", {
    p_title: `Smoke Event ${randomSuffix()}`,
    p_starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    p_location_name: "Smoke Test Location",
    p_latitude: 55.7558,
    p_longitude: 37.6173,
    p_description: "Automated smoke-test event",
    p_requires_approval: true,
    p_max_attendees: 5,
    p_cover_image_url: eventCoverUrl,
  });

  logStep("updating event details");
  await rpc(organizer.client, "update_event", {
    p_event_id: eventId,
    p_title: `Updated Smoke Event ${randomSuffix()}`,
    p_location_name: "Updated Smoke Test Location",
    p_latitude: 55.756,
    p_longitude: 37.618,
    p_max_attendees: 6,
  });

  logStep("reading nearby events");
  const nearbyRows = await rpc(organizer.client, "nearby_events", {
    p_latitude: 55.756,
    p_longitude: 37.618,
    p_radius_meters: 500,
    p_limit: 10,
  });
  const nearbyEvent = nearbyRows.find((row) => row.id === eventId);
  if (!nearbyEvent) {
    throw new Error("Updated smoke event was not returned by nearby_events");
  }
  if (typeof nearbyEvent.distance_meters !== "number" || nearbyEvent.distance_meters > 1) {
    throw new Error(`Expected nearby event distance close to 0, got ${nearbyEvent.distance_meters}`);
  }

  logStep("creating email/password attendee profile");
  const attendee = await createEmailProfile("attendee");

  logStep("reading organizer public privacy as attendee");
  const privacy = await rpc(attendee.client, "profile_hide_events", {
    p_user_id: organizer.userId,
  });
  if (privacy !== true) {
    throw new Error(`Expected organizer hide_events=true, got ${privacy}`);
  }

  logStep("creating direct conversation");
  const directConversationId = await rpc(organizer.client, "get_or_create_direct_conversation", {
    p_other_user_id: attendee.userId,
  });

  const directPeerRows = await rpc(attendee.client, "direct_conversation_peer", {
    p_conversation_id: directConversationId,
  });
  const directPeer = directPeerRows[0];
  if (directPeer?.user_id !== organizer.userId) {
    throw new Error(`Expected organizer as direct peer, got ${JSON.stringify(directPeer)}`);
  }

  logStep("sending direct message");
  await rpc(organizer.client, "send_message", {
    p_conversation_id: directConversationId,
    p_body: "Smoke-test direct message",
    p_kind: "text",
  });

  logStep("uploading and sending direct image attachment");
  const directAttachmentPath = await uploadSmokeImage(organizer.client, "chat-attachments", organizer.userId, "chat-image", {
    path: `${organizer.userId}/${directConversationId}/chat-image-${randomSuffix()}.png`,
    private: true,
  });
  await rpc(organizer.client, "send_message", {
    p_conversation_id: directConversationId,
    p_body: "",
    p_kind: "image",
    p_attachment_path: directAttachmentPath,
  });

  logStep("submitting join request");
  const joinRows = await rpc(attendee.client, "join_event", {
    p_event_id: eventId,
    p_message: "Smoke-test join request",
  });
  const joinResult = joinRows[0];

  if (joinResult?.participation_status !== "pending" || !joinResult.request_id) {
    throw new Error(`Expected pending request, got ${JSON.stringify(joinResult)}`);
  }

  logStep("approving join request");
  await rpc(organizer.client, "approve_event_request", {
    p_request_id: joinResult.request_id,
  });

  const { data: attendeeRow, error: attendeeError } = await organizer.client
    .from("event_attendees")
    .select("event_id,user_id,role")
    .eq("event_id", eventId)
    .eq("user_id", attendee.userId)
    .single();

  if (attendeeError) throw attendeeError;
  if (!attendeeRow || attendeeRow.role !== "attendee") {
    throw new Error("Approved attendee was not added to event_attendees");
  }

  logStep("reading event attendees");
  const { data: attendeeRows, error: attendeeRowsError } = await attendee.client
    .from("event_attendees")
    .select("event_id,user_id,role")
    .eq("event_id", eventId);

  if (attendeeRowsError) throw attendeeRowsError;
  if (!attendeeRows?.some((row) => row.user_id === organizer.userId && row.role === "organizer")) {
    throw new Error("Organizer was not visible in event attendee list");
  }
  if (!attendeeRows.some((row) => row.user_id === attendee.userId && row.role === "attendee")) {
    throw new Error("Approved attendee was not visible in event attendee list");
  }

  logStep("finding event conversation");
  const { data: conversation, error: conversationError } = await organizer.client
    .from("conversations")
    .select("id")
    .eq("event_id", eventId)
    .eq("type", "event")
    .single();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Event conversation was not created");

  logStep("sending attendee message");
  const messageId = await rpc(attendee.client, "send_message", {
    p_conversation_id: conversation.id,
    p_body: "Smoke-test message",
    p_kind: "text",
  });

  logStep("marking conversation read");
  await rpc(attendee.client, "mark_conversation_read", {
    p_conversation_id: conversation.id,
  });

  logStep("soft-deleting smoke event");
  const { error: cleanupError } = await organizer.client
    .from("events")
    .update({ status: "cancelled", deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (cleanupError) throw cleanupError;

  logStep(`ok event=${eventId} request=${joinResult.request_id} message=${messageId}`);
}

main().catch((error) => {
  console.error("[supabase-smoke] failed");
  console.error(error);
  process.exitCode = 1;
});
