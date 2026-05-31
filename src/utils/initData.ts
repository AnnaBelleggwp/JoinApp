import { userApi, eventApi, chatApi } from "./api";
import { events as mockEvents, chats as mockChats, messages as mockMessages } from "../app/data/mockData";
import { getCurrentUserId } from "./auth";

// Инициализация базовых данных при первом запуске
export async function initializeData(force = false) {
  const STORAGE_KEY = "app_initialized_v3"; // Изменена версия ключа для переинициализации

  // Проверяем, были ли данные уже инициализированы
  if (!force && localStorage.getItem(STORAGE_KEY)) {
    console.log("Data already initialized");
    return;
  }

  try {
    console.log("Initializing data...");

    const currentUserId = getCurrentUserId();

    // Проверяем, зарегистрирован ли пользователь
    const isRegistered = localStorage.getItem("user_registered") === "true";

    // Создаем пользователя только если он не зарегистрировался через форму
    if (!isRegistered) {
      const defaultUser = {
        id: currentUserId,
        name: "Иван Петров",
        username: "ivan_petrov",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        bio: "Основатель стартапа | Люблю нетворкинг",
        phone: "+7 (999) 123-45-67",
        birthYear: 1995,
        availableForInvites: true,
      };

      try {
        await userApi.create(defaultUser);
        console.log("Default user created");
      } catch (error) {
        console.log("User already exists, skipping creation");
      }
    } else {
      console.log("User registered via form, skipping default user creation");
    }

    // Создаем дополнительных пользователей для чатов
    const otherUsers = [
      {
        id: "user2",
        name: "Александр Иванов",
        username: "alex_ivanov",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
        bio: "Предприниматель",
        phone: "+7 (999) 111-11-11",
        birthYear: 1990,
        availableForInvites: true,
      },
      {
        id: "user3",
        name: "Мария Петрова",
        username: "maria_petrova",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
        bio: "IT специалист",
        phone: "+7 (999) 222-22-22",
        birthYear: 1992,
        availableForInvites: true,
      },
    ];

    for (const user of otherUsers) {
      try {
        await userApi.create(user);
        console.log(`User created: ${user.name}`);
      } catch (error) {
        console.log(`User ${user.name} already exists, skipping`);
      }
    }

    // Создаем события из mockData
    for (const event of mockEvents) {
      const createdEvent = await eventApi.create({
        ...event,
        organizerId: currentUserId,
      });

      // Если событие было помечено как isJoined, присоединяемся к нему
      if (event.isJoined) {
        await eventApi.join(createdEvent.id, currentUserId);
      }

      console.log(`Event created: ${event.title}${event.isJoined ? ' (joined)' : ''}`);
    }

    // Создаем чаты из mockData
    for (const chat of mockChats) {
      await chatApi.create(chat);
      console.log(`Chat created: ${chat.name}`);
    }

    // Добавляем начальные сообщения в первый чат
    if (mockChats.length > 0) {
      for (const message of mockMessages) {
        const userId = message.isMine ? currentUserId : "user2"; // Используем другого пользователя для чужих сообщений
        await chatApi.sendMessage(mockChats[0].id, message, userId);
      }
      console.log("Initial messages created");
    }

    // Помечаем как инициализированное
    localStorage.setItem(STORAGE_KEY, "true");
    console.log("Data initialization complete!");

  } catch (error) {
    console.error("Error initializing data:", error);
    // Не блокируем приложение при ошибке инициализации
  }
}
