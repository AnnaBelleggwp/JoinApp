import type { EventRequestStatus, EventSummary, ID, ParticipationStatus } from "./types";

export interface EventMembershipSnapshot {
  isAttendee: boolean;
  requestStatus?: EventRequestStatus | null;
}

export function getParticipationStatus(snapshot: EventMembershipSnapshot): ParticipationStatus {
  if (snapshot.isAttendee) return "joined";
  if (snapshot.requestStatus === "pending") return "pending";
  if (snapshot.requestStatus === "rejected") return "rejected";
  return "none";
}

export function isEventFull(event: Pick<EventSummary, "maxAttendees" | "attendeesCount">): boolean {
  return event.maxAttendees != null && event.attendeesCount >= event.maxAttendees;
}

export function canEditEvent(event: Pick<EventSummary, "organizerId" | "status" | "deletedAt">, userId: ID): boolean {
  return event.organizerId === userId && event.status !== "cancelled" && event.deletedAt == null;
}

export function canCancelEvent(event: Pick<EventSummary, "organizerId" | "status" | "deletedAt">, userId: ID): boolean {
  return event.organizerId === userId && event.status !== "cancelled" && event.deletedAt == null;
}

export function canRequestToJoinEvent(
  event: Pick<EventSummary, "organizerId" | "status" | "requiresApproval" | "deletedAt" | "maxAttendees" | "attendeesCount">,
  userId: ID,
  snapshot: EventMembershipSnapshot,
): boolean {
  if (event.organizerId === userId) return false;
  if (event.status !== "published" || event.deletedAt != null) return false;
  if (!event.requiresApproval) return false;
  if (snapshot.isAttendee || snapshot.requestStatus === "pending") return false;
  return !isEventFull(event);
}

export function canJoinEventDirectly(
  event: Pick<EventSummary, "organizerId" | "status" | "requiresApproval" | "deletedAt" | "maxAttendees" | "attendeesCount">,
  userId: ID,
  snapshot: EventMembershipSnapshot,
): boolean {
  if (event.organizerId === userId) return false;
  if (event.status !== "published" || event.deletedAt != null) return false;
  if (event.requiresApproval) return false;
  if (snapshot.isAttendee) return false;
  return !isEventFull(event);
}

export function canLeaveEvent(userId: ID, attendee: { userId: ID; role: "organizer" | "attendee" } | null): boolean {
  return attendee != null && attendee.userId === userId && attendee.role !== "organizer";
}

export function canViewAttendees(
  event: Pick<EventSummary, "organizerId" | "hideAttendees">,
  userId: ID,
  snapshot: EventMembershipSnapshot,
): boolean {
  return event.organizerId === userId || !event.hideAttendees || snapshot.isAttendee;
}
