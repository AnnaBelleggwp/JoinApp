// Локальное хранилище данных (fallback для Supabase)
import { getCurrentUserId } from "./auth";

// Хелперы для localStorage
function getFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getAllByPrefix<T>(prefix: string): T[] {
  const results: T[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const item = getFromStorage<T>(key);
        if (item && typeof item === 'object') {
          results.push(item);
        }
      }
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error);
  }
  return results;
}

// ============ ПОЛЬЗОВАТЕЛИ ============

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  birthYear: number;
  phone: string;
  availableForInvites: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const userApi = {
  search: async (query: string): Promise<User[]> => {
    const users = getAllByPrefix<User>("user:");
    return users.filter(u =>
      u && u.username && u.username.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  },

  checkUsername: async (username: string) => {
    const existingUserId = getFromStorage<string>(`username:${username}`);
    return { available: !existingUserId, exists: !!existingUserId };
  },

  create: async (user: Omit<User, "createdAt" | "updatedAt">) => {
    const existingUserId = getFromStorage<string>(`username:${user.username}`);
    if (existingUserId && existingUserId !== user.id) {
      throw new Error("Username already taken");
    }

    const newUser = { ...user, createdAt: new Date().toISOString() };
    setToStorage(`user:${user.id}`, newUser);
    setToStorage(`username:${user.username}`, user.id);
    return newUser;
  },

  get: async (id: string): Promise<User> => {
    const user = getFromStorage<User>(`user:${id}`);
    if (!user) throw new Error("User not found");
    return user;
  },

  update: async (id: string, data: Partial<User>) => {
    const user = getFromStorage<User>(`user:${id}`);
    if (!user) throw new Error("User not found");

    if (data.username && data.username !== user.username) {
      const existingUserId = getFromStorage<string>(`username:${data.username}`);
      if (existingUserId && existingUserId !== id) {
        throw new Error("Username already taken");
      }
      localStorage.removeItem(`username:${user.username}`);
      setToStorage(`username:${data.username}`, id);
    }

    const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() };
    setToStorage(`user:${id}`, updatedUser);
    return updatedUser;
  },
};

// ============ СОБЫТИЯ ============

export type ParticipationStatus = "none" | "joined" | "pending" | "rejected";

export interface EventRequest {
  id: string;
  eventId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  isJoined: boolean;
  participationStatus: ParticipationStatus;
  description: string;
  organizer: string;
  organizerId?: string;
  image: string;
  category: string;
  latitude: number;
  longitude: number;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  hideAttendees?: boolean;
  pendingRequestsCount?: number;
  createdAt?: string;
}

export const eventApi = {
  getAll: async (): Promise<Event[]> => {
    const events = getAllByPrefix<Event>("event:");
    const currentUserId = getCurrentUserId();

    return events
      .filter(event => event && event.id)
      .map(event => {
        const attendees = getFromStorage<string[]>(`event:${event.id}:attendees`) || [];
        const requests = getAllByPrefix<EventRequest>(`request:event:${event.id}:`);
        const myRequest = requests.find(r => r.userId === currentUserId);
        const pendingRequests = requests.filter(r => r.status === "pending");

        let participationStatus: ParticipationStatus = "none";
        if (attendees.includes(currentUserId)) {
          participationStatus = "joined";
        } else if (myRequest) {
          participationStatus = myRequest.status === "pending" ? "pending" : "rejected";
        }

        return {
          ...event,
          attendees: attendees.length,
          isJoined: attendees.includes(currentUserId),
          participationStatus,
          pendingRequestsCount: pendingRequests.length,
        };
      });
  },

  get: async (id: string): Promise<Event> => {
    const event = getFromStorage<Event>(`event:${id}`);
    if (!event) throw new Error("Event not found");

    const attendees = getFromStorage<string[]>(`event:${id}:attendees`) || [];
    const currentUserId = getCurrentUserId();
    const requests = getAllByPrefix<EventRequest>(`request:event:${id}:`);
    const myRequest = requests.find(r => r.userId === currentUserId);
    const pendingRequests = requests.filter(r => r.status === "pending");

    let participationStatus: ParticipationStatus = "none";
    if (attendees.includes(currentUserId)) {
      participationStatus = "joined";
    } else if (myRequest) {
      participationStatus = myRequest.status === "pending" ? "pending" : "rejected";
    }

    return {
      ...event,
      attendees: attendees.length,
      isJoined: attendees.includes(currentUserId),
      participationStatus,
      pendingRequestsCount: pendingRequests.length,
    };
  },

  create: async (event: Omit<Event, "id" | "createdAt" | "attendees" | "isJoined">) => {
    // Проверка на дубликаты
    const allEvents = getAllByPrefix<Event>("event:");
    const duplicate = allEvents.find(e =>
      e && e.id &&
      e.title === event.title &&
      e.location === event.location &&
      e.date === event.date &&
      e.time === event.time
    );

    if (duplicate) {
      console.log("Duplicate event found, returning existing");

      // Проверяем, есть ли чат для этого события
      const existingChatId = getFromStorage<string>(`event:${duplicate.id}:chatId`);
      if (!existingChatId) {
        // Создаём чат если его нет
        const chatId = `event_chat_${duplicate.id}`;
        const eventChat = {
          id: chatId,
          name: `💬 ${duplicate.title || "Без названия"}`,
          avatar: duplicate.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop",
          lastMessage: "Чат создан",
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          isEventChat: true,
          eventId: duplicate.id,
          createdAt: new Date().toISOString(),
        };
        setToStorage(`chat:${chatId}`, eventChat);
        setToStorage(`chat:${chatId}:messages`, []);
        setToStorage(`event:${duplicate.id}:chatId`, chatId);
      }

      return duplicate;
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEvent = {
      ...event,
      title: event.title || "Без названия",
      location: event.location || "",
      description: event.description || "",
      id: eventId,
      attendees: 1,
      isJoined: true,
      createdAt: new Date().toISOString(),
    };

    setToStorage(`event:${eventId}`, newEvent);
    setToStorage(`event:${eventId}:attendees`, [event.organizerId || getCurrentUserId()]);

    // Создаём чат события
    const chatId = `event_chat_${eventId}`;
    const eventChat = {
      id: chatId,
      name: `💬 ${event.title || "Без названия"}`,
      avatar: event.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop",
      lastMessage: "Чат создан",
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isEventChat: true,
      eventId: eventId,
      createdAt: new Date().toISOString(),
    };

    setToStorage(`chat:${chatId}`, eventChat);
    setToStorage(`chat:${chatId}:messages`, []);
    setToStorage(`event:${eventId}:chatId`, chatId);

    return newEvent;
  },

  update: async (id: string, data: Partial<Event>, userId: string) => {
    const event = getFromStorage<Event>(`event:${id}`);
    if (!event) throw new Error("Event not found");
    if (event.organizerId !== userId) throw new Error("Only organizer can edit event");

    const updatedEvent = { ...event, ...data, updatedAt: new Date().toISOString() };
    setToStorage(`event:${id}`, updatedEvent);

    // Обновляем название чата
    const chatId = getFromStorage<string>(`event:${id}:chatId`);
    if (chatId && data.title) {
      const chat = getFromStorage<any>(`chat:${chatId}`);
      if (chat) {
        chat.name = `💬 ${data.title}`;
        setToStorage(`chat:${chatId}`, chat);
      }
    }

    return updatedEvent;
  },

  delete: async (id: string, userId: string) => {
    const event = getFromStorage<Event>(`event:${id}`);
    if (!event) throw new Error("Event not found");
    if (event.organizerId !== userId) throw new Error("Only organizer can delete event");

    localStorage.removeItem(`event:${id}`);
    localStorage.removeItem(`event:${id}:attendees`);

    const chatId = getFromStorage<string>(`event:${id}:chatId`);
    if (chatId) {
      localStorage.removeItem(`chat:${chatId}`);
      localStorage.removeItem(`chat:${chatId}:messages`);
      localStorage.removeItem(`event:${id}:chatId`);
    }

    return { success: true };
  },

  join: async (eventId: string, userId: string) => {
    const event = getFromStorage<Event>(`event:${eventId}`);
    if (!event) throw new Error("Event not found");

    // Если требуется одобрение - создаём заявку
    if (event.requiresApproval) {
      const requestId = `request:event:${eventId}:${userId}`;
      const existingRequest = getFromStorage<EventRequest>(requestId);

      if (existingRequest) {
        throw new Error("Request already exists");
      }

      const newRequest: EventRequest = {
        id: requestId,
        eventId,
        userId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      setToStorage(requestId, newRequest);
      return { success: true, requiresApproval: true };
    }

    // Иначе просто добавляем в участники
    const attendees = getFromStorage<string[]>(`event:${eventId}:attendees`) || [];
    if (!attendees.includes(userId)) {
      attendees.push(userId);
      setToStorage(`event:${eventId}:attendees`, attendees);
    }
    return { success: true, requiresApproval: false };
  },

  leave: async (eventId: string, userId: string) => {
    const attendees = getFromStorage<string[]>(`event:${eventId}:attendees`) || [];
    const filtered = attendees.filter(id => id !== userId);
    setToStorage(`event:${eventId}:attendees`, filtered);
    return { success: true };
  },
};

// ============ ЧАТЫ ============

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isEventChat?: boolean;
  eventId?: string;
}

export interface Message {
  id: string;
  text: string;
  time: string;
  isMine: boolean;
  sender?: string;
  userId?: string;
  createdAt?: string;
}

export const chatApi = {
  get: async (chatId: string): Promise<Chat | null> => {
    const chat = getFromStorage<Chat>(`chat:${chatId}`);
    return chat;
  },

  create: async (chat: Chat) => {
    if (!chat || !chat.id || !chat.name) {
      console.error("Invalid chat data:", chat);
      throw new Error("Chat must have id and name");
    }
    const chatWithDefaults = {
      ...chat,
      name: chat.name || "Без названия",
      avatar: chat.avatar || "",
      lastMessage: chat.lastMessage || "",
      time: chat.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: chat.unread || 0,
      createdAt: new Date().toISOString(),
    };
    setToStorage(`chat:${chat.id}`, chatWithDefaults);
    setToStorage(`chat:${chat.id}:messages`, []);
    return chatWithDefaults;
  },

  getAll: async (userId: string): Promise<Chat[]> => {
    const allChats = getAllByPrefix<Chat>("chat:");

    // Получаем события пользователя
    const allEvents = getAllByPrefix<Event>("event:");
    const userEventIds: string[] = [];

    for (const event of allEvents) {
      if (!event || !event.id) continue;
      const attendees = getFromStorage<string[]>(`event:${event.id}:attendees`) || [];
      if (attendees.includes(userId)) {
        userEventIds.push(event.id);
      }
    }

    const filteredChats = allChats.filter(ch => {
      if (!ch || !ch.id) return false;
      if (!ch.isEventChat) return true;
      return userEventIds.includes(ch.eventId || "");
    });

    // Добавляем непрочитанные
    return filteredChats.map(chat => {
      const messages = getFromStorage<Message[]>(`chat:${chat.id}:messages`) || [];
      const lastReadTime = getFromStorage<number>(`chat:${chat.id}:lastRead:${userId}`) || 0;
      const unreadCount = messages.filter(m =>
        m && !m.isMine && new Date(m.createdAt || 0).getTime() > lastReadTime
      ).length;

      return { ...chat, unread: unreadCount };
    });
  },

  getMessages: async (chatId: string, userId: string): Promise<Message[]> => {
    const messages = getFromStorage<Message[]>(`chat:${chatId}:messages`) || [];

    // Обновляем время последнего прочтения
    setToStorage(`chat:${chatId}:lastRead:${userId}`, Date.now());

    return messages;
  },

  sendMessage: async (chatId: string, message: Omit<Message, "id" | "time" | "createdAt">, userId?: string) => {
    const messages = getFromStorage<Message[]>(`chat:${chatId}:messages`) || [];

    // Получаем информацию о пользователе
    let senderName = message.sender;
    if (userId && !senderName) {
      try {
        const user = await userApi.get(userId);
        senderName = user.name;
      } catch (error) {
        console.error("Error getting user for message:", error);
      }
    }

    const newMessage = {
      ...message,
      text: message.text || "",
      userId: userId || getCurrentUserId(),
      sender: senderName,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    setToStorage(`chat:${chatId}:messages`, messages);

    // Обновляем последнее сообщение в чате
    const chat = getFromStorage<Chat>(`chat:${chatId}`);
    if (chat) {
      chat.lastMessage = newMessage.text || "";
      chat.time = newMessage.time;
      setToStorage(`chat:${chatId}`, chat);
    }

    return newMessage;
  },
};

// ============ ЗАЯВКИ НА СОБЫТИЯ ============

export const requestApi = {
  getForEvent: async (eventId: string): Promise<Array<EventRequest & { user: User }>> => {
    const requests = getAllByPrefix<EventRequest>(`request:event:${eventId}:`);

    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        try {
          const user = await userApi.get(request.userId);
          return { ...request, user };
        } catch (error) {
          console.error("Error loading user for request:", error);
          return null;
        }
      })
    );

    return requestsWithUsers.filter((r): r is EventRequest & { user: User } => r !== null);
  },

  approve: async (requestId: string, eventId: string) => {
    const request = getFromStorage<EventRequest>(requestId);
    if (!request) throw new Error("Request not found");

    // Обновляем статус заявки
    request.status = "approved";
    setToStorage(requestId, request);

    // Добавляем пользователя в участники
    const attendees = getFromStorage<string[]>(`event:${eventId}:attendees`) || [];
    if (!attendees.includes(request.userId)) {
      attendees.push(request.userId);
      setToStorage(`event:${eventId}:attendees`, attendees);
    }

    return { success: true };
  },

  reject: async (requestId: string) => {
    const request = getFromStorage<EventRequest>(requestId);
    if (!request) throw new Error("Request not found");

    // Обновляем статус заявки
    request.status = "rejected";
    setToStorage(requestId, request);

    return { success: true };
  },

  delete: async (requestId: string) => {
    localStorage.removeItem(requestId);
    return { success: true };
  },
};
