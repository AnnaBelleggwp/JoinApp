// Используем локальное хранилище вместо Supabase
import * as localApi from "./localStorageApi";

// Экспортируем типы
export type { User, Event, Chat, Message } from "./localStorageApi";

// Экспортируем API (используем локальное хранилище)
export const userApi = localApi.userApi;
export const eventApi = localApi.eventApi;
export const chatApi = localApi.chatApi;
