import type {
  CreateEventCommand,
  EventRequestDecisionCommand,
  ID,
  JoinEventCommand,
  JoinEventResult,
  MarkConversationReadCommand,
  SendMessageCommand,
} from "@join/core";
import type { JoinSupabaseClient } from "./client";
import { JoinApiError, toJoinApiError } from "./errors";

type RpcResult<T> = {
  data: T | null;
  error: unknown;
};

export interface JoinApi {
  events: {
    create(command: CreateEventCommand): Promise<ID>;
    join(command: JoinEventCommand): Promise<JoinEventResult>;
    leave(eventId: ID): Promise<boolean>;
    approveRequest(command: EventRequestDecisionCommand): Promise<boolean>;
    rejectRequest(command: EventRequestDecisionCommand): Promise<boolean>;
  };
  messages: {
    send(command: SendMessageCommand): Promise<ID>;
    markConversationRead(command: MarkConversationReadCommand): Promise<boolean>;
  };
}

export function createJoinApi(client: JoinSupabaseClient): JoinApi {
  return {
    events: {
      create: (command) => createEvent(client, command),
      join: (command) => joinEvent(client, command),
      leave: (eventId) => leaveEvent(client, eventId),
      approveRequest: (command) => approveEventRequest(client, command),
      rejectRequest: (command) => rejectEventRequest(client, command),
    },
    messages: {
      send: (command) => sendMessage(client, command),
      markConversationRead: (command) => markConversationRead(client, command),
    },
  };
}

async function unwrapRpc<T>(request: PromiseLike<RpcResult<T>>, emptyMessage: string): Promise<T> {
  const { data, error } = await request;

  if (error) {
    throw toJoinApiError(error);
  }

  if (data == null) {
    throw new JoinApiError(emptyMessage);
  }

  return data;
}

async function createEvent(client: JoinSupabaseClient, command: CreateEventCommand): Promise<ID> {
  return unwrapRpc(
    client.rpc("create_event", {
      p_title: command.title,
      p_starts_at: command.startsAt,
      p_location_name: command.locationName,
      p_latitude: command.latitude,
      p_longitude: command.longitude,
      p_description: command.description ?? undefined,
      p_ends_at: command.endsAt ?? undefined,
      p_category_id: command.categoryId ?? undefined,
      p_visibility: command.visibility ?? "public",
      p_status: command.status ?? "published",
      p_requires_approval: command.requiresApproval ?? false,
      p_hide_attendees: command.hideAttendees ?? false,
      p_max_attendees: command.maxAttendees ?? undefined,
      p_address: command.address ?? undefined,
      p_city: command.city ?? undefined,
      p_country: command.country ?? undefined,
      p_cover_image_url: command.coverImageUrl ?? undefined,
    }),
    "Event was not created",
  );
}

async function joinEvent(client: JoinSupabaseClient, command: JoinEventCommand): Promise<JoinEventResult> {
  const rows = await unwrapRpc(
    client.rpc("join_event", {
      p_event_id: command.eventId,
      p_message: command.message ?? undefined,
    }),
    "Join event returned no result",
  );

  const row = rows[0];
  if (!row) {
    throw new JoinApiError("Join event returned no result");
  }
  if (row.participation_status !== "joined" && row.participation_status !== "pending") {
    throw new JoinApiError(`Unexpected join status: ${row.participation_status}`);
  }

  return {
    participationStatus: row.participation_status,
    requestId: row.request_id,
  };
}

async function leaveEvent(client: JoinSupabaseClient, eventId: ID): Promise<boolean> {
  return unwrapRpc(
    client.rpc("leave_event", {
      p_event_id: eventId,
    }),
    "Leave event returned no result",
  );
}

async function approveEventRequest(client: JoinSupabaseClient, command: EventRequestDecisionCommand): Promise<boolean> {
  return unwrapRpc(
    client.rpc("approve_event_request", {
      p_request_id: command.requestId,
    }),
    "Approve request returned no result",
  );
}

async function rejectEventRequest(client: JoinSupabaseClient, command: EventRequestDecisionCommand): Promise<boolean> {
  return unwrapRpc(
    client.rpc("reject_event_request", {
      p_request_id: command.requestId,
    }),
    "Reject request returned no result",
  );
}

async function sendMessage(client: JoinSupabaseClient, command: SendMessageCommand): Promise<ID> {
  return unwrapRpc(
    client.rpc("send_message", {
      p_conversation_id: command.conversationId,
      p_body: command.body ?? "",
      p_kind: command.kind ?? "text",
      p_attachment_path: command.attachmentPath ?? undefined,
    }),
    "Message was not sent",
  );
}

async function markConversationRead(client: JoinSupabaseClient, command: MarkConversationReadCommand): Promise<boolean> {
  return unwrapRpc(
    client.rpc("mark_conversation_read", {
      p_conversation_id: command.conversationId,
    }),
    "Mark conversation read returned no result",
  );
}
