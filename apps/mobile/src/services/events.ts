import type { Database } from "@join/db";
import { createJoinApi } from "@join/api";
import { getSupabaseClient } from "./supabase";

type NearbyEventRow = Database["public"]["Functions"]["nearby_events"]["Returns"][number];
type EventCardRow = Database["public"]["Views"]["event_cards"]["Row"];

export type ParticipationStatus = "none" | "joined" | "pending" | "rejected";

export interface MobileEventCard {
  id: string;
  organizerId: string;
  isOrganizer: boolean;
  title: string;
  description: string;
  startsAt: string;
  locationName: string;
  city: string;
  organizerName: string;
  categoryName: string;
  attendeesCount: number;
  pendingRequestsCount: number;
  maxAttendees: number | null;
  requiresApproval: boolean;
  hideAttendees: boolean;
  participationStatus: ParticipationStatus;
  pendingRequestId: string | null;
  distanceMeters: number | null;
  coverImageUrl: string | null;
}

export async function discoverEvents(): Promise<MobileEventCard[]> {
  const supabase = getSupabaseClient();
  const [{ data, error }, currentUserId] = await Promise.all([
    supabase.rpc("nearby_events", {
      p_limit: 30,
    }),
    getCurrentUserId(),
  ]);

  if (error) throw error;
  const rows = data ?? [];
  const participation = await getParticipationMap(
    rows.map((row) => row.id).filter(Boolean),
    currentUserId,
  );

  return rows.map((row) => mapNearbyEvent(row, currentUserId, participation));
}

export async function getEventDetails(eventId: string): Promise<MobileEventCard> {
  const supabase = getSupabaseClient();
  const [{ data, error }, currentUserId] = await Promise.all([
    supabase.from("event_cards").select("*").eq("id", eventId).single(),
    getCurrentUserId(),
  ]);

  if (error) throw error;
  const participation = await getParticipationMap([eventId], currentUserId);
  return mapEventCard(data, currentUserId, participation);
}

export async function joinEvent(eventId: string) {
  const joinApi = createJoinApi(getSupabaseClient());
  return joinApi.events.join({ eventId });
}

export async function leaveEvent(eventId: string) {
  const joinApi = createJoinApi(getSupabaseClient());
  return joinApi.events.leave(eventId);
}

export async function cancelJoinRequest(eventId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Auth session is required");
  }

  const { error } = await supabase
    .from("event_requests")
    .update({ status: "cancelled" })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) throw error;
}

function mapNearbyEvent(
  row: NearbyEventRow,
  currentUserId: string | null,
  participation: Map<string, ParticipationInfo>,
): MobileEventCard {
  return mapEventCard(row, currentUserId, participation);
}

function mapEventCard(
  row: NearbyEventRow | EventCardRow,
  currentUserId: string | null,
  participation: Map<string, ParticipationInfo>,
): MobileEventCard {
  if (!row.id) {
    throw new Error("Event card is missing id");
  }

  const participationInfo = participation.get(row.id) ?? { status: "none", requestId: null };

  return {
    id: row.id,
    organizerId: row.organizer_id ?? "",
    isOrganizer: Boolean(currentUserId && row.organizer_id === currentUserId),
    title: row.title ?? "Без названия",
    description: row.description ?? "",
    startsAt: row.starts_at ?? new Date().toISOString(),
    locationName: row.location_name ?? "",
    city: row.city ?? "",
    organizerName: row.organizer_name ?? "",
    categoryName: row.category_name ?? "",
    attendeesCount: row.attendees_count ?? 0,
    pendingRequestsCount: row.pending_requests_count ?? 0,
    maxAttendees: row.max_attendees ?? null,
    requiresApproval: row.requires_approval ?? false,
    hideAttendees: row.hide_attendees ?? false,
    participationStatus: participationInfo.status,
    pendingRequestId: participationInfo.requestId,
    distanceMeters: "distance_meters" in row ? row.distance_meters ?? null : null,
    coverImageUrl: row.cover_image_url ?? null,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  return userData.user?.id ?? null;
}

interface ParticipationInfo {
  status: ParticipationStatus;
  requestId: string | null;
}

async function getParticipationMap(eventIds: string[], userId: string | null): Promise<Map<string, ParticipationInfo>> {
  const participation = new Map<string, ParticipationInfo>();
  const uniqueEventIds = Array.from(new Set(eventIds));

  if (!userId || uniqueEventIds.length === 0) return participation;

  const supabase = getSupabaseClient();
  const [{ data: attendees, error: attendeeError }, { data: requests, error: requestError }] = await Promise.all([
    supabase.from("event_attendees").select("event_id").eq("user_id", userId).in("event_id", uniqueEventIds),
    supabase
      .from("event_requests")
      .select("id,event_id,status,created_at")
      .eq("user_id", userId)
      .in("event_id", uniqueEventIds)
      .order("created_at", { ascending: false }),
  ]);

  if (attendeeError) throw attendeeError;
  if (requestError) throw requestError;

  for (const request of requests ?? []) {
    if (!participation.has(request.event_id)) {
      participation.set(request.event_id, {
        status: request.status === "pending" || request.status === "rejected" ? request.status : "none",
        requestId: request.status === "pending" ? request.id : null,
      });
    }
  }

  for (const attendee of attendees ?? []) {
    participation.set(attendee.event_id, { status: "joined", requestId: null });
  }

  return participation;
}

export function formatEventDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
