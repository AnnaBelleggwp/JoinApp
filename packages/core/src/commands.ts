import type { EventStatus, EventVisibility, ID, ISODateTime, MessageKind } from "./types";

export interface CreateEventCommand {
  title: string;
  startsAt: ISODateTime;
  locationName: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  endsAt?: ISODateTime | null;
  categoryId?: ID | null;
  visibility?: EventVisibility;
  status?: Exclude<EventStatus, "cancelled">;
  requiresApproval?: boolean;
  hideAttendees?: boolean;
  maxAttendees?: number | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  coverImageUrl?: string | null;
}

export interface JoinEventCommand {
  eventId: ID;
  message?: string | null;
}

export interface JoinEventResult {
  participationStatus: "joined" | "pending";
  requestId?: ID | null;
}

export interface EventRequestDecisionCommand {
  requestId: ID;
}

export interface SendMessageCommand {
  conversationId: ID;
  body?: string | null;
  kind?: MessageKind;
  attachmentPath?: string | null;
}

export interface MarkConversationReadCommand {
  conversationId: ID;
}
