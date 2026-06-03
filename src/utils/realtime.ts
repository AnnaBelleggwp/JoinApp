import { getJoinDataSource } from "./dataSource";

export type RealtimeUnsubscribe = () => void;

function noopUnsubscribe(): RealtimeUnsubscribe {
  return () => {};
}

function scheduleReload(callback: () => void) {
  window.setTimeout(callback, 0);
}

export async function subscribeToChatMessages(
  conversationId: string,
  onChange: () => void,
): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`chat-messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToChatList(userId: string, onChange: () => void): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`chat-list:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversation_members",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToEventActivity(
  eventId: string,
  onChange: () => void,
): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`event-activity:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "events",
        filter: `id=eq.${eventId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_locations",
        filter: `event_id=eq.${eventId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_requests",
        filter: `event_id=eq.${eventId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_attendees",
        filter: `event_id=eq.${eventId}`,
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToEventRequests(
  eventId: string,
  onChange: () => void,
): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`event-requests:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_requests",
        filter: `event_id=eq.${eventId}`,
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToMyEvents(userId: string, onChange: () => void): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`my-events:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "events",
        filter: `organizer_id=eq.${userId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleReload(onChange),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_attendees",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToNotifications(userId: string, onChange: () => void): Promise<RealtimeUnsubscribe> {
  if (getJoinDataSource() !== "supabase") return noopUnsubscribe();

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleReload(onChange),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
