import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Calendar, MapPin, MessageCircle } from "lucide-react";
import NavigationBar from "./NavigationBar";
import { userApi, eventApi, chatApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideEvents, setHideEvents] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUserId = getCurrentUserId();

      // Загружаем данные пользователя
      const userData = await userApi.get(userId!);
      setUser(userData);

      // Проверяем настройку скрытия событий
      const hideEventsSetting = localStorage.getItem(`user:${userId}:hideEvents`) === "true";
      setHideEvents(hideEventsSetting);

      // Если события не скрыты или это текущий пользователь, показываем события
      if (!hideEventsSetting || userId === currentUserId) {
        const allEvents = await eventApi.getAll();
        const userEvents = allEvents.filter(
          (e) => e.organizerId === userId && new Date(e.date) < new Date()
        );
        setEvents(userEvents);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-[17px] text-[#3c3c43]/60">Пользователь не найден</p>
      </div>
    );
  }

  const currentUserId = getCurrentUserId();
  const isOwnProfile = userId === currentUserId;
  const showEvents = !hideEvents || isOwnProfile;

  const handleStartChat = async () => {
    try {
      // Создаем ID чата на основе ID двух пользователей (сортируем чтобы всегда получался один и тот же ID)
      const chatId = [currentUserId, userId].sort().join("_");
      console.log("Creating/finding chat with ID:", chatId);

      // Проверяем, существует ли уже чат
      let chat = await chatApi.get(chatId);
      console.log("Existing chat:", chat);

      // Если чата нет, создаем его
      if (!chat) {
        console.log("Chat not found, creating new chat");
        chat = await chatApi.create({
          id: chatId,
          name: user.name,
          avatar: user.avatar,
          lastMessage: "",
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          isEventChat: false,
        });
        console.log("Created chat:", chat);
      }

      // Переходим в чат
      console.log("Navigating to chat:", `/chat/${chatId}`);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert(`Ошибка создания чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar title="Профиль" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Информация о пользователе */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-lg border border-white/20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[#34C759]/20">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-[24px] font-bold text-black mb-1">
              {user.name}
            </h1>
            <p className="text-[17px] text-[#3c3c43]/60 mb-3">
              @{user.username}
            </p>
            {user.bio && (
              <p className="text-[15px] text-[#3c3c43] leading-relaxed mb-4">
                {user.bio}
              </p>
            )}

            {/* Кнопка "Начать чат" для чужих профилей */}
            {!isOwnProfile && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartChat}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#34C759] to-[#30D158] text-white text-[17px] font-semibold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Начать чат
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Прошедшие события как организатор */}
        {showEvents && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20"
          >
            <h2 className="text-[19px] font-bold text-black mb-4">
              Прошедшие события ({events.length})
            </h2>

            {events.length === 0 ? (
              <p className="text-[15px] text-[#3c3c43]/60 text-center py-8">
                Нет прошедших событий
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <Link key={event.id} to={`/event/${event.id}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex gap-3 p-3 rounded-xl bg-[#f2f2f7]/50 hover:bg-[#f2f2f7] transition-colors"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[17px] font-semibold text-black line-clamp-1">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[13px] text-[#3c3c43]/60 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-[#3c3c43]/60 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!showEvents && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-lg border border-white/20"
          >
            <p className="text-[15px] text-[#3c3c43]/60 text-center">
              Пользователь скрыл свои события
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
