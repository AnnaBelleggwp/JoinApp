export type ID = string;
export type ISODateTime = string;

export type EventVisibility = "public" | "private" | "unlisted";
export type EventStatus = "draft" | "published" | "cancelled";
export type AttendeeRole = "organizer" | "attendee";
export type EventRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ConversationType = "direct" | "event";
export type MessageKind = "text" | "image" | "system";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "profile" | "event" | "message";
export type NotificationType = "event_request" | "event_approved" | "event_rejected" | "message" | "system";

export type ParticipationStatus = "none" | "joined" | "pending" | "rejected";

export interface Profile {
  id: ID;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  birthYear?: number | null;
  phone?: string | null;
  availableForInvites: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime | null;
}

export interface EventSummary {
  id: ID;
  organizerId: ID;
  categoryId?: ID | null;
  title: string;
  description?: string | null;
  startsAt: ISODateTime;
  endsAt?: ISODateTime | null;
  visibility: EventVisibility;
  status: EventStatus;
  requiresApproval: boolean;
  hideAttendees: boolean;
  maxAttendees?: number | null;
  attendeesCount: number;
  pendingRequestsCount: number;
  coverImageUrl?: string | null;
  deletedAt?: ISODateTime | null;
}

export interface EventLocation {
  eventId: ID;
  locationName: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
}

export interface EventAttendee {
  eventId: ID;
  userId: ID;
  role: AttendeeRole;
  joinedAt: ISODateTime;
}

export interface EventRequest {
  id: ID;
  eventId: ID;
  userId: ID;
  status: EventRequestStatus;
  message?: string | null;
  decidedBy?: ID | null;
  decidedAt?: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Conversation {
  id: ID;
  type: ConversationType;
  eventId?: ID | null;
  title?: string | null;
  avatarUrl?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: ISODateTime | null;
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId?: ID | null;
  kind: MessageKind;
  body?: string | null;
  attachmentPath?: string | null;
  createdAt: ISODateTime;
  editedAt?: ISODateTime | null;
  deletedAt?: ISODateTime | null;
}
