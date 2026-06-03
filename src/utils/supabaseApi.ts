import type { Database, Tables } from "@join/db";
import type {
  Chat,
  Event,
  EventAttendee,
  EventDiscoveryParams,
  EventRequest,
  Message,
  Notification,
  ProfilePrivacy,
  PushPlatform,
  User,
  UserSettings,
} from "./localStorageApi";
import { getJoinApi, getSupabaseClient } from "./supabaseClient";
import { createChatAttachmentUrl } from "./storage";

const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventCardRow = Tables<"event_cards">;
type NearbyEventRow = EventCardRow & { distance_meters: number | null };
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type EventRequestRow = Database["public"]["Tables"]["event_requests"]["Row"];
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type EventAttendeeRow = Database["public"]["Tables"]["event_attendees"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const supabase = getSupabaseClient();
const joinApi = getJoinApi();

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Supabase auth session is required");
  return data.user.id;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateInput(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function formatTimeInput(value: string): string {
  return new Date(value).toISOString().slice(11, 16);
}

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.display_name,
    username: row.username,
    avatar: row.avatar_url || DEFAULT_AVATAR,
    bio: row.bio || "",
    birthYear: row.birth_year || new Date().getFullYear() - 25,
    phone: row.phone || "",
    availableForInvites: row.available_for_invites,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettings(row: UserSettingsRow): UserSettings {
  return {
    hideEvents: row.hide_events,
    allowDirectMessages: row.allow_direct_messages,
    allowPushNotifications: row.allow_push_notifications,
  };
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data || {}) as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function getParticipation(eventId: string, userId: string) {
  const [{ data: attendee }, { data: request }] = await Promise.all([
    supabase.from("event_attendees").select("user_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("event_requests")
      .select("id,status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const isJoined = Boolean(attendee);
  const requestStatus = request?.status;

  return {
    isJoined,
    participationStatus: isJoined
      ? "joined"
      : requestStatus === "pending"
        ? "pending"
        : requestStatus === "rejected"
          ? "rejected"
          : "none",
  } as const;
}

async function mapEventCard(row: EventCardRow | NearbyEventRow, currentUserId: string): Promise<Event> {
  const participation = await getParticipation(row.id, currentUserId);
  const distanceMeters = "distance_meters" in row ? row.distance_meters : null;

  return {
    id: row.id,
    title: row.title,
    date: formatDate(row.starts_at),
    time: formatTime(row.starts_at),
    dateValue: formatDateInput(row.starts_at),
    timeValue: formatTimeInput(row.starts_at),
    startsAt: row.starts_at,
    location: row.location_name || row.city || "",
    attendees: row.attendees_count,
    maxAttendees: row.max_attendees || 0,
    isJoined: participation.isJoined,
    participationStatus: participation.participationStatus,
    description: row.description || "",
    organizer: row.organizer_name,
    organizerId: row.organizer_id,
    image: row.cover_image_url || DEFAULT_EVENT_IMAGE,
    category: row.category_name,
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    distanceMeters,
    isPrivate: row.visibility !== "public",
    requiresApproval: row.requires_approval,
    hideAttendees: row.hide_attendees,
    pendingRequestsCount: row.pending_requests_count,
    createdAt: row.created_at,
  };
}

function toIsoDateTime(date: string, time: string): string {
  const parsed = Date.parse(`${date} ${time}`);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function mapConversation(row: ConversationRow, unread = 0): Chat {
  return {
    id: row.id,
    name: row.title || "Без названия",
    avatar: row.avatar_url || "",
    lastMessage: row.last_message_preview || "",
    time: row.last_message_at ? formatTime(row.last_message_at) : "",
    unread,
    isEventChat: row.type === "event",
    eventId: row.event_id || undefined,
  };
}

async function mapConversationForCurrentUser(row: ConversationRow, unread = 0): Promise<Chat> {
  if (row.type !== "direct") {
    return mapConversation(row, unread);
  }

  const { data, error } = await supabase.rpc("direct_conversation_peer", { p_conversation_id: row.id });
  if (error) throw error;

  const peer = data?.[0];
  return {
    ...mapConversation(row, unread),
    peerUserId: peer?.user_id,
    name: peer?.display_name || "Пользователь",
    avatar: peer?.avatar_url || DEFAULT_AVATAR,
  };
}

async function mapMessage(row: MessageRow, currentUserId: string, sender?: string): Promise<Message> {
  const attachmentUrl =
    row.kind === "image" && row.attachment_path ? await createChatAttachmentUrl(row.attachment_path) : undefined;

  return {
    id: row.id,
    text: row.body || "",
    time: formatTime(row.created_at),
    isMine: row.sender_id === currentUserId,
    kind: row.kind,
    attachmentPath: row.attachment_path || undefined,
    attachmentUrl,
    sender,
    userId: row.sender_id || undefined,
    createdAt: row.created_at,
  };
}

export const userApi = {
  search: async (query: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${query}%`)
      .is("deleted_at", null)
      .limit(10);

    if (error) throw error;
    return (data || []).map(mapProfile);
  },

  checkUsername: async (username: string) => {
    const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (error) throw error;
    return { available: !data, exists: Boolean(data) };
  },

  create: async (user: Omit<User, "createdAt" | "updatedAt">) => {
    const authUserId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: authUserId,
        username: user.username,
        display_name: user.name,
        avatar_url: user.avatar || null,
        bio: user.bio || null,
        birth_year: user.birthYear,
        phone: user.phone || null,
        available_for_invites: user.availableForInvites,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(data);
  },

  get: async (id: string): Promise<User> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) throw error;
    return mapProfile(data);
  },

  update: async (id: string, data: Partial<User>) => {
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        username: data.username,
        display_name: data.name,
        avatar_url: data.avatar,
        bio: data.bio,
        birth_year: data.birthYear,
        phone: data.phone,
        available_for_invites: data.availableForInvites,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(updated);
  },
};

export const settingsApi = {
  get: async (userId: string): Promise<UserSettings> => {
    const authUserId = await getAuthenticatedUserId();
    if (authUserId !== userId) throw new Error("Cannot read another user's settings");

    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ user_id: authUserId }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) throw error;
    return mapSettings(data);
  },

  update: async (userId: string, settings: Partial<UserSettings>): Promise<UserSettings> => {
    const authUserId = await getAuthenticatedUserId();
    if (authUserId !== userId) throw new Error("Cannot update another user's settings");

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: authUserId,
          hide_events: settings.hideEvents,
          allow_direct_messages: settings.allowDirectMessages,
          allow_push_notifications: settings.allowPushNotifications,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error) throw error;
    return mapSettings(data);
  },

  getProfilePrivacy: async (userId: string): Promise<ProfilePrivacy> => {
    const { data, error } = await supabase.rpc("profile_hide_events", { p_user_id: userId });
    if (error) throw error;
    return { hideEvents: data };
  },
};

export const notificationApi = {
  getAll: async (userId: string): Promise<Notification[]> => {
    const authUserId = await getAuthenticatedUserId();
    if (authUserId !== userId) throw new Error("Cannot read another user's notifications");

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []).map(mapNotification);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const authUserId = await getAuthenticatedUserId();
    if (authUserId !== userId) throw new Error("Cannot read another user's notification count");

    const { data, error } = await supabase.rpc("unread_notifications_count");
    if (error) throw error;
    return data || 0;
  },

  markRead: async (notificationId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });

    if (error) throw error;
    return Boolean(data);
  },

  markAllRead: async (_userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc("mark_all_notifications_read");
    if (error) throw error;
    return data || 0;
  },
};

export const pushTokenApi = {
  register: async (platform: PushPlatform, token: string): Promise<string> => {
    const { data, error } = await supabase.rpc("register_push_token", {
      p_platform: platform,
      p_token: token,
    });

    if (error) throw error;
    if (!data) throw new Error("Push token was not registered");
    return data;
  },

  unregister: async (token: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("unregister_push_token", {
      p_token: token,
    });

    if (error) throw error;
    return Boolean(data);
  },
};

export const eventApi = {
  getAll: async (): Promise<Event[]> => {
    return eventApi.discover();
  },

  discover: async (params: EventDiscoveryParams = {}): Promise<Event[]> => {
    const currentUserId = await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc("nearby_events", {
      p_latitude: params.latitude,
      p_longitude: params.longitude,
      p_radius_meters: params.radiusMeters,
      p_starts_after: params.startsAfter,
      p_starts_before: params.startsBefore,
      p_category_id: params.categoryId || null,
      p_category_name: params.categoryName || null,
      p_query: params.query,
      p_min_attendees: params.minAttendees,
      p_max_attendees_count: params.maxAttendeesCount,
      p_has_available_seats: params.hasAvailableSeats,
      p_limit: params.limit,
    });

    if (error) throw error;
    return Promise.all((data || []).map((row) => mapEventCard(row, currentUserId)));
  },

  get: async (id: string): Promise<Event> => {
    const currentUserId = await getAuthenticatedUserId();
    const { data, error } = await supabase.from("event_cards").select("*").eq("id", id).single();
    if (error) throw error;
    return mapEventCard(data, currentUserId);
  },

  create: async (event: Omit<Event, "id" | "createdAt" | "attendees" | "isJoined" | "participationStatus" | "pendingRequestsCount">) => {
    const id = await joinApi.events.create({
      title: event.title,
      startsAt: toIsoDateTime(event.date, event.time),
      locationName: event.location,
      latitude: event.latitude,
      longitude: event.longitude,
      description: event.description,
      visibility: event.isPrivate ? "private" : "public",
      requiresApproval: event.requiresApproval,
      hideAttendees: event.hideAttendees,
      maxAttendees: event.maxAttendees || null,
      coverImageUrl: event.image,
    });

    return eventApi.get(id);
  },

  update: async (id: string, data: Partial<Event>, userId: string) => {
    const currentUserId = await getAuthenticatedUserId();
    if (currentUserId !== userId) throw new Error("Cannot update another user's event");

    const startsAt = data.date && data.time ? toIsoDateTime(data.date, data.time) : undefined;
    const { error } = await supabase.rpc("update_event", {
      p_event_id: id,
      p_title: data.title,
      p_starts_at: startsAt,
      p_location_name: data.location,
      p_latitude: data.latitude,
      p_longitude: data.longitude,
      p_description: data.description,
      p_visibility: data.isPrivate == null ? undefined : data.isPrivate ? "private" : "public",
      p_requires_approval: data.requiresApproval,
      p_hide_attendees: data.hideAttendees,
      p_max_attendees: data.maxAttendees,
      p_cover_image_url: data.image,
    });
    if (error) throw error;
    return eventApi.get(id);
  },

  delete: async (id: string, userId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organizer_id", userId);

    if (error) throw error;
    return { success: true };
  },

  join: async (eventId: string, _userId?: string) => {
    const result = await joinApi.events.join({ eventId });
    return { success: true, requiresApproval: result.participationStatus === "pending" };
  },

  leave: async (eventId: string, _userId?: string) => {
    await joinApi.events.leave(eventId);
    return { success: true };
  },
};

export const chatApi = {
  get: async (chatId: string): Promise<Chat | null> => {
    const { data, error } = await supabase.from("conversations").select("*").eq("id", chatId).maybeSingle();
    if (error) throw error;
    return data ? mapConversationForCurrentUser(data) : null;
  },

  create: async (chat: Chat) => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        id: chat.id,
        type: chat.isEventChat ? "event" : "direct",
        event_id: chat.eventId || null,
        title: chat.name,
        avatar_url: chat.avatar || null,
        last_message_preview: chat.lastMessage || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapConversation(data);
  },

  getOrCreateDirect: async (otherUserId: string): Promise<Chat> => {
    const { data: conversationId, error } = await supabase.rpc("get_or_create_direct_conversation", {
      p_other_user_id: otherUserId,
    });

    if (error) throw error;
    if (!conversationId) throw new Error("Direct conversation was not created");

    const chat = await chatApi.get(conversationId);
    if (!chat) throw new Error("Direct conversation was not found after creation");
    return chat;
  },

  getForEvent: async (eventId: string): Promise<Chat | null> => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("type", "event")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapConversationForCurrentUser(data) : null;
  },

  getAll: async (_userId?: string): Promise<Chat[]> => {
    const currentUserId = await getAuthenticatedUserId();
    const { data: memberships, error: membershipError } = await supabase
      .from("conversation_members")
      .select("conversation_id,last_read_at")
      .eq("user_id", currentUserId);

    if (membershipError) throw membershipError;
    const conversationIds = (memberships || []).map((item) => item.conversation_id);
    if (conversationIds.length === 0) return [];

    const { data, error } = await supabase.from("conversations").select("*").in("id", conversationIds);
    if (error) throw error;

    return Promise.all((data || []).map((row) => mapConversationForCurrentUser(row)));
  },

  getMessages: async (chatId: string, _userId?: string): Promise<Message[]> => {
    const currentUserId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", chatId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) throw error;
    await joinApi.messages.markConversationRead({ conversationId: chatId });
    return Promise.all((data || []).map((row) => mapMessage(row, currentUserId)));
  },

  sendMessage: async (chatId: string, message: Omit<Message, "id" | "time" | "createdAt">, _userId?: string) => {
    const messageId = await joinApi.messages.send({
      conversationId: chatId,
      body: message.text,
      kind: message.kind || "text",
      attachmentPath: message.attachmentPath,
    });

    const { data, error } = await supabase.from("messages").select("*").eq("id", messageId).single();
    if (error) throw error;

    const currentUserId = await getAuthenticatedUserId();
    return mapMessage(data, currentUserId, message.sender);
  },
};

function mapEventRequest(row: EventRequestRow, user: User): EventRequest & { user: User } {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status === "cancelled" ? "rejected" : row.status,
    createdAt: row.created_at,
    user,
  };
}

function mapEventAttendee(row: EventAttendeeRow, user: User): EventAttendee {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    user,
  };
}

export const requestApi = {
  getForEvent: async (eventId: string): Promise<Array<EventRequest & { user: User }>> => {
    const { data, error } = await supabase.from("event_requests").select("*").eq("event_id", eventId);
    if (error) throw error;

    return Promise.all(
      (data || []).map(async (request) => {
        const user = await userApi.get(request.user_id);
        return mapEventRequest(request, user);
      }),
    );
  },

  approve: async (requestId: string) => {
    await joinApi.events.approveRequest({ requestId });
    return { success: true };
  },

  reject: async (requestId: string) => {
    await joinApi.events.rejectRequest({ requestId });
    return { success: true };
  },

  delete: async (requestId: string) => {
    const { error } = await supabase.from("event_requests").update({ status: "cancelled" }).eq("id", requestId);
    if (error) throw error;
    return { success: true };
  },
};

export const attendeeApi = {
  getForEvent: async (eventId: string): Promise<EventAttendee[]> => {
    const { data, error } = await supabase
      .from("event_attendees")
      .select("*")
      .eq("event_id", eventId)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    return Promise.all(
      (data || []).map(async (attendee) => {
        const user = await userApi.get(attendee.user_id);
        return mapEventAttendee(attendee, user);
      }),
    );
  },
};
