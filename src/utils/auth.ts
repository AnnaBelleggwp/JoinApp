// Простая система идентификации пользователя для демо
// В реальном приложении здесь была бы интеграция с Supabase Auth

const USER_ID_KEY = "current_user_id";

export function getCurrentUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Генерируем уникальный ID для этого пользователя
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function clearCurrentUser(): void {
  localStorage.removeItem(USER_ID_KEY);
}
