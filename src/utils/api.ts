import * as localApi from "./localStorageApi";
import { getJoinDataSource } from "./dataSource";

export type {
  User,
  UserSettings,
  ProfilePrivacy,
  Notification,
  PushPlatform,
  Event,
  EventDiscoveryParams,
  EventAttendee,
  Chat,
  Message,
  EventRequest,
} from "./localStorageApi";

type SupabaseApiModule = typeof import("./supabaseApi");

async function getSelectedApi(): Promise<typeof localApi | SupabaseApiModule> {
  if (getJoinDataSource() === "supabase") {
    return import("./supabaseApi");
  }

  return localApi;
}

export const userApi = {
  search: async (query: string) => {
    const api = await getSelectedApi();
    return api.userApi.search(query);
  },

  checkUsername: async (username: string) => {
    const api = await getSelectedApi();
    return api.userApi.checkUsername(username);
  },

  create: async (user: Parameters<typeof localApi.userApi.create>[0]) => {
    const api = await getSelectedApi();
    return api.userApi.create(user);
  },

  get: async (id: string) => {
    const api = await getSelectedApi();
    return api.userApi.get(id);
  },

  update: async (id: string, data: Parameters<typeof localApi.userApi.update>[1]) => {
    const api = await getSelectedApi();
    return api.userApi.update(id, data);
  },
};

export const settingsApi = {
  get: async (userId: string) => {
    const api = await getSelectedApi();
    return api.settingsApi.get(userId);
  },

  update: async (userId: string, data: Parameters<typeof localApi.settingsApi.update>[1]) => {
    const api = await getSelectedApi();
    return api.settingsApi.update(userId, data);
  },

  getProfilePrivacy: async (userId: string) => {
    const api = await getSelectedApi();
    return api.settingsApi.getProfilePrivacy(userId);
  },
};

export const notificationApi = {
  getAll: async (userId: string) => {
    const api = await getSelectedApi();
    return api.notificationApi.getAll(userId);
  },

  getUnreadCount: async (userId: string) => {
    const api = await getSelectedApi();
    return api.notificationApi.getUnreadCount(userId);
  },

  markRead: async (notificationId: string) => {
    const api = await getSelectedApi();
    return api.notificationApi.markRead(notificationId);
  },

  markAllRead: async (userId: string) => {
    const api = await getSelectedApi();
    return api.notificationApi.markAllRead(userId);
  },
};

export const pushTokenApi = {
  register: async (platform: localApi.PushPlatform, token: string) => {
    const api = await getSelectedApi();
    return api.pushTokenApi.register(platform, token);
  },

  unregister: async (token: string) => {
    const api = await getSelectedApi();
    return api.pushTokenApi.unregister(token);
  },
};

export const eventApi = {
  getAll: async () => {
    const api = await getSelectedApi();
    return api.eventApi.getAll();
  },

  discover: async (params?: localApi.EventDiscoveryParams) => {
    const api = await getSelectedApi();
    return api.eventApi.discover(params);
  },

  get: async (id: string) => {
    const api = await getSelectedApi();
    return api.eventApi.get(id);
  },

  create: async (event: Parameters<typeof localApi.eventApi.create>[0]) => {
    const api = await getSelectedApi();
    return api.eventApi.create(event);
  },

  update: async (id: string, data: Parameters<typeof localApi.eventApi.update>[1], userId: string) => {
    const api = await getSelectedApi();
    return api.eventApi.update(id, data, userId);
  },

  delete: async (id: string, userId: string) => {
    const api = await getSelectedApi();
    return api.eventApi.delete(id, userId);
  },

  join: async (eventId: string, userId: string) => {
    const api = await getSelectedApi();
    return api.eventApi.join(eventId, userId);
  },

  leave: async (eventId: string, userId: string) => {
    const api = await getSelectedApi();
    return api.eventApi.leave(eventId, userId);
  },
};

export const chatApi = {
  get: async (chatId: string) => {
    const api = await getSelectedApi();
    return api.chatApi.get(chatId);
  },

  create: async (chat: Parameters<typeof localApi.chatApi.create>[0]) => {
    const api = await getSelectedApi();
    return api.chatApi.create(chat);
  },

  getOrCreateDirect: async (otherUserId: string) => {
    const api = await getSelectedApi();
    return api.chatApi.getOrCreateDirect(otherUserId);
  },

  getForEvent: async (eventId: string) => {
    const api = await getSelectedApi();
    return api.chatApi.getForEvent(eventId);
  },

  getAll: async (userId: string) => {
    const api = await getSelectedApi();
    return api.chatApi.getAll(userId);
  },

  getMessages: async (chatId: string, userId: string) => {
    const api = await getSelectedApi();
    return api.chatApi.getMessages(chatId, userId);
  },

  sendMessage: async (chatId: string, message: Parameters<typeof localApi.chatApi.sendMessage>[1], userId?: string) => {
    const api = await getSelectedApi();
    return api.chatApi.sendMessage(chatId, message, userId);
  },
};

export const requestApi = {
  getForEvent: async (eventId: string) => {
    const api = await getSelectedApi();
    return api.requestApi.getForEvent(eventId);
  },

  approve: async (requestId: string, eventId: string) => {
    const api = await getSelectedApi();
    return api.requestApi.approve(requestId, eventId);
  },

  reject: async (requestId: string) => {
    const api = await getSelectedApi();
    return api.requestApi.reject(requestId);
  },

  delete: async (requestId: string) => {
    const api = await getSelectedApi();
    return api.requestApi.delete(requestId);
  },
};

export const attendeeApi = {
  getForEvent: async (eventId: string) => {
    const api = await getSelectedApi();
    return api.attendeeApi.getForEvent(eventId);
  },
};
