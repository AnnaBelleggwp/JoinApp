import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-e0339c59/health", (c) => {
  return c.json({ status: "ok" });
});

// ============ ПОЛЬЗОВАТЕЛИ ============

// Проверка уникальности username
app.get("/make-server-e0339c59/users/check-username/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const existingUserId = await kv.get(`username:${username}`);

    return c.json({
      available: !existingUserId,
      exists: !!existingUserId
    });
  } catch (error) {
    console.log("Error checking username:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Создание пользователя
app.post("/make-server-e0339c59/users", async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, username, avatar, bio, birthYear, phone, availableForInvites } = body;

    // Проверка уникальности username
    const existingUserId = await kv.get(`username:${username}`);
    if (existingUserId && existingUserId !== id) {
      return c.json({ error: "Username already taken" }, 400);
    }

    const user = {
      id,
      name,
      username,
      avatar,
      bio,
      birthYear,
      phone,
      availableForInvites: availableForInvites ?? true,
      createdAt: new Date().toISOString(),
    };

    // Сохраняем пользователя и маппинг username
    await kv.set(`user:${id}`, user);
    await kv.set(`username:${username}`, id);

    return c.json(user);
  } catch (error) {
    console.log("Error creating user:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Поиск пользователей по username
app.get("/make-server-e0339c59/users/search/:query", async (c) => {
  try {
    const query = c.req.param("query").toLowerCase();

    if (query.length < 2) {
      return c.json([]);
    }

    const allUsers = await kv.getByPrefix("user:");
    const matchedUsers = allUsers.filter(user =>
      user && user.username && user.username.toLowerCase().includes(query)
    );

    return c.json(matchedUsers.slice(0, 10)); // Лимит 10 результатов
  } catch (error) {
    console.log("Error searching users:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Получение профиля пользователя
app.get("/make-server-e0339c59/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await kv.get(`user:${id}`);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.log("Error getting user:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Обновление профиля пользователя
app.put("/make-server-e0339c59/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existingUser = await kv.get(`user:${id}`);

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Если username изменился, проверяем уникальность
    if (body.username && body.username !== existingUser.username) {
      const existingUserId = await kv.get(`username:${body.username}`);
      if (existingUserId && existingUserId !== id) {
        return c.json({ error: "Username already taken" }, 400);
      }

      // Удаляем старый маппинг username
      await kv.del(`username:${existingUser.username}`);
      await kv.set(`username:${body.username}`, id);
    }

    const updatedUser = {
      ...existingUser,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${id}`, updatedUser);
    return c.json(updatedUser);
  } catch (error) {
    console.log("Error updating user:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============ СОБЫТИЯ ============

// Получение всех событий
app.get("/make-server-e0339c59/events", async (c) => {
  try {
    const events = await kv.getByPrefix("event:");
    // Фильтруем служебные ключи (attendees)
    const filteredEvents = events.filter(e => e && e.id && !e.isAttendeesList);
    return c.json(filteredEvents);
  } catch (error) {
    console.log("Error getting events:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Получение события по ID
app.get("/make-server-e0339c59/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`event:${id}`);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Получаем список участников
    const attendees = await kv.get(`event:${id}:attendees`) || [];

    return c.json({ ...event, attendees });
  } catch (error) {
    console.log("Error getting event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Создание события
app.post("/make-server-e0339c59/events", async (c) => {
  try {
    const body = await c.req.json();

    // Проверяем на дубликаты: событие с таким же названием, местом, датой и временем
    const allEvents = await kv.getByPrefix("event:");
    const duplicate = allEvents.find(e =>
      e && e.id && !e.isAttendeesList &&
      e.title === body.title &&
      e.location === body.location &&
      e.date === body.date &&
      e.time === body.time
    );

    // Если дубликат найден, возвращаем существующее событие вместо создания нового
    if (duplicate) {
      console.log(`Duplicate event found: ${duplicate.id}, skipping creation`);
      return c.json(duplicate);
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const event = {
      ...body,
      id: eventId,
      attendees: 1, // Создатель автоматически участник
      isJoined: true,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`event:${eventId}`, event);

    // Создатель - первый участник
    const organizerId = body.organizerId || "me";
    await kv.set(`event:${eventId}:attendees`, [organizerId]);

    // Автоматически создаём чат события
    const chatId = `event_chat_${eventId}`;
    const eventChat = {
      id: chatId,
      name: `💬 ${body.title}`,
      avatar: body.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop",
      lastMessage: "Чат создан",
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isEventChat: true,
      eventId: eventId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`chat:${chatId}`, eventChat);
    await kv.set(`chat:${chatId}:messages`, []);
    await kv.set(`event:${eventId}:chatId`, chatId);

    console.log(`Event chat created: ${chatId} for event ${eventId}`);

    return c.json(event);
  } catch (error) {
    console.log("Error creating event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Обновление события (только для создателя)
app.put("/make-server-e0339c59/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { userId, ...updateData } = body;

    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Проверяем, что пользователь - создатель
    if (event.organizerId !== userId) {
      return c.json({ error: "Only organizer can edit event" }, 403);
    }

    const updatedEvent = {
      ...event,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`event:${id}`, updatedEvent);

    // Обновляем название чата события
    const chatId = await kv.get(`event:${id}:chatId`);
    if (chatId) {
      const chat = await kv.get(`chat:${chatId}`);
      if (chat && updateData.title) {
        chat.name = `💬 ${updateData.title}`;
        await kv.set(`chat:${chatId}`, chat);
      }
    }

    return c.json(updatedEvent);
  } catch (error) {
    console.log("Error updating event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Удаление события (только для создателя)
app.delete("/make-server-e0339c59/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { userId } = body;

    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Проверяем, что пользователь - создатель
    if (event.organizerId !== userId) {
      return c.json({ error: "Only organizer can delete event" }, 403);
    }

    // Удаляем событие и связанные данные
    await kv.del(`event:${id}`);
    await kv.del(`event:${id}:attendees`);

    // Удаляем чат события
    const chatId = await kv.get(`event:${id}:chatId`);
    if (chatId) {
      await kv.del(`chat:${chatId}`);
      await kv.del(`chat:${chatId}:messages`);
      await kv.del(`event:${id}:chatId`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Присоединиться к событию
app.post("/make-server-e0339c59/events/:id/join", async (c) => {
  try {
    const id = c.req.param("id");
    const { userId } = await c.req.json();

    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    let attendees = await kv.get(`event:${id}:attendees`) || [];

    // Проверяем, не присоединился ли уже
    if (!attendees.includes(userId)) {
      attendees.push(userId);
      event.attendees = attendees.length;

      await kv.set(`event:${id}`, event);
      await kv.set(`event:${id}:attendees`, attendees);
    }

    return c.json(event);
  } catch (error) {
    console.log("Error joining event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Покинуть событие
app.post("/make-server-e0339c59/events/:id/leave", async (c) => {
  try {
    const id = c.req.param("id");
    const { userId } = await c.req.json();

    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    let attendees = await kv.get(`event:${id}:attendees`) || [];
    attendees = attendees.filter(uid => uid !== userId);
    event.attendees = attendees.length;

    await kv.set(`event:${id}`, event);
    await kv.set(`event:${id}:attendees`, attendees);

    return c.json(event);
  } catch (error) {
    console.log("Error leaving event:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============ ЧАТЫ ============

// Создание чата
app.post("/make-server-e0339c59/chats", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chat = {
      ...body,
      id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`chat:${id}`, chat);

    // Инициализируем пустой массив сообщений
    await kv.set(`chat:${id}:messages`, []);

    return c.json(chat);
  } catch (error) {
    console.log("Error creating chat:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Получение всех чатов (включая чаты событий для участников)
app.get("/make-server-e0339c59/chats/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const allChats = await kv.getByPrefix("chat:");

    // Получаем события, в которых пользователь участвует
    const allEvents = await kv.getByPrefix("event:");
    const validEvents = allEvents.filter(e => e && e.id && !e.isAttendeesList);

    const userEventIds: string[] = [];
    for (const event of validEvents) {
      const attendees = await kv.get(`event:${event.id}:attendees`) || [];
      if (attendees.includes(userId)) {
        userEventIds.push(event.id);
      }
    }

    // Фильтруем чаты
    const filteredChats = allChats.filter(ch => {
      if (!ch || !ch.id) return false;

      // Обычные чаты показываем всегда
      if (!ch.isEventChat) return true;

      // Чаты событий показываем только участникам
      return userEventIds.includes(ch.eventId);
    });

    // Добавляем непрочитанные для каждого чата
    const chatsWithUnread = await Promise.all(filteredChats.map(async (chat) => {
      const messages = await kv.get(`chat:${chat.id}:messages`) || [];
      const lastReadKey = `chat:${chat.id}:lastRead:${userId}`;
      const lastReadTime = await kv.get(lastReadKey) || 0;

      const unreadCount = messages.filter(m =>
        !m.isMine && new Date(m.createdAt || 0).getTime() > lastReadTime
      ).length;

      return { ...chat, unread: unreadCount };
    }));

    return c.json(chatsWithUnread);
  } catch (error) {
    console.log("Error getting chats:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Получение сообщений чата
app.get("/make-server-e0339c59/chats/:id/messages", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId");

    const messages = await kv.get(`chat:${id}:messages`) || [];

    // Обновляем время последнего прочтения
    if (userId) {
      const lastReadKey = `chat:${id}:lastRead:${userId}`;
      await kv.set(lastReadKey, Date.now());
    }

    return c.json(messages);
  } catch (error) {
    console.log("Error getting messages:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Отправка сообщения
app.post("/make-server-e0339c59/chats/:id/messages", async (c) => {
  try {
    const chatId = c.req.param("id");
    const body = await c.req.json();

    const messages = await kv.get(`chat:${chatId}:messages`) || [];

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    await kv.set(`chat:${chatId}:messages`, messages);

    // Обновляем последнее сообщение в чате
    const chat = await kv.get(`chat:${chatId}`);
    if (chat) {
      chat.lastMessage = body.text;
      chat.time = newMessage.time;
      await kv.set(`chat:${chatId}`, chat);
    }

    return c.json(newMessage);
  } catch (error) {
    console.log("Error sending message:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============ ADMIN / УТИЛИТЫ ============

// Очистка дубликатов событий
app.post("/make-server-e0339c59/admin/cleanup-duplicates", async (c) => {
  try {
    const allEvents = await kv.getByPrefix("event:");
    const validEvents = allEvents.filter(e => e && e.id && !e.isAttendeesList);

    // Группируем по уникальному ключу (title + location + date + time)
    const eventGroups = new Map<string, any[]>();

    for (const event of validEvents) {
      const key = `${event.title}|${event.location}|${event.date}|${event.time}`;
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      eventGroups.get(key)!.push(event);
    }

    let deletedCount = 0;
    const keptEvents: string[] = [];
    const deletedEvents: string[] = [];

    // Для каждой группы дубликатов оставляем самое старое событие (по createdAt)
    for (const [key, events] of eventGroups) {
      if (events.length > 1) {
        // Сортируем по дате создания
        events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Оставляем первое (самое старое), удаляем остальные
        const toKeep = events[0];
        const toDelete = events.slice(1);

        keptEvents.push(toKeep.id);

        for (const event of toDelete) {
          await kv.del(`event:${event.id}`);
          await kv.del(`event:${event.id}:attendees`);

          // Удаляем связанный чат события
          const chatId = await kv.get(`event:${event.id}:chatId`);
          if (chatId) {
            await kv.del(`chat:${chatId}`);
            await kv.del(`chat:${chatId}:messages`);
            await kv.del(`event:${event.id}:chatId`);
          }

          deletedEvents.push(event.id);
          deletedCount++;
        }
      }
    }

    return c.json({
      success: true,
      deletedCount,
      totalGroups: eventGroups.size,
      keptEvents,
      deletedEvents,
    });
  } catch (error) {
    console.log("Error cleaning up duplicates:", error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
