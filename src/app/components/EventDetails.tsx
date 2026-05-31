import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, Clock, User, Share2, Heart, Edit, ChevronRight, MessageCircle, ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import ShareModal from "./ShareModal";
import ConfirmModal from "./ConfirmModal";
import { eventApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventChatId, setEventChatId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"join" | "leave" | null>(null);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await eventApi.get(id!);
      setEvent(data);

      // Получаем ID чата события
      const chatId = localStorage.getItem(`event:${id}:chatId`);
      setEventChatId(chatId);
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = async () => {
    if (!event) return;

    // Если заявка - ничего не делаем
    if (event.participationStatus === "pending") {
      alert("Ваша заявка ожидает одобрения организатора");
      return;
    }

    // Если отклонено - не даём подать снова
    if (event.participationStatus === "rejected") {
      alert("Ваша заявка была отклонена организатором");
      return;
    }

    // Если выходим - показываем подтверждение
    if (event.participationStatus === "joined") {
      setConfirmAction("leave");
      setShowConfirmModal(true);
    } else {
      // Присоединяемся без подтверждения
      try {
        const currentUserId = getCurrentUserId();
        const result = await eventApi.join(event.id, currentUserId);
        await loadEvent();

        if (result.requiresApproval) {
          alert("Заявка отправлена! Организатор рассмотрит её в ближайшее время.");
        } else {
          alert("Вы стали участником события!");
        }
      } catch (error) {
        console.error("Error joining event:", error);
        alert(error.message || "Ошибка при обновлении участия");
      }
    }
  };

  const handleConfirmedAction = async () => {
    if (!event || !confirmAction) return;

    try {
      const currentUserId = getCurrentUserId();

      if (confirmAction === "leave") {
        await eventApi.leave(event.id, currentUserId);
        await loadEvent();
        alert("Вы вышли из события");
      } else {
        const result = await eventApi.join(event.id, currentUserId);
        await loadEvent();

        if (result.requiresApproval) {
          alert("Заявка отправлена! Организатор рассмотрит её в ближайшее время.");
        } else {
          alert("Вы стали участником события!");
        }
      }
    } catch (error) {
      console.error("Error joining/leaving event:", error);
      alert(error.message || "Ошибка при обновлении участия");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-[17px] text-[#3c3c43]/60">Событие не найдено</p>
      </div>
    );
  }

  const handleViewAttendees = () => {
    const currentUserId = getCurrentUserId();
    // Проверяем права доступа к списку участников
    if (event.hideAttendees && event.organizerId !== currentUserId) {
      alert("Список участников скрыт организатором");
      return;
    }
    navigate(`/event/${id}/attendees`);
  };

  const handleAddToCalendar = () => {
    // Создаем .ics файл для календаря
    const eventDate = new Date(event.date);
    const [hours, minutes] = event.time.split(":");
    eventDate.setHours(parseInt(hours), parseInt(minutes));

    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2); // Добавляем 2 часа к длительности

    const formatDate = (date: Date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Networking Events//Event//EN
BEGIN:VEVENT
UID:${event.id}@networkingapp.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(eventDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    // Создаем blob и скачиваем файл
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <NavigationBar
        title=""
        showBack
        rightButton={
          event.organizerId === getCurrentUserId() ? (
            <Link to={`/edit-event/${event.id}`}>
              <button className="text-[#34C759] text-[17px] font-semibold">
                Редактировать
              </button>
            </Link>
          ) : (
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="p-1"
            >
              <Heart
                className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-[#34C759]'}`}
              />
            </button>
          )
        }
      />
      
      {/* Главное изображение */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={event.image} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Бейдж категории */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full text-[15px] font-semibold bg-white/90 backdrop-blur-sm text-black">
            {event.category}
          </span>
        </div>
        
        {/* Заголовок */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-[28px] font-bold text-white mb-1">
            {event.title}
          </h1>
        </div>
      </div>
      
      <div className={`px-4 py-4 space-y-3 ${
        event.participationStatus !== "joined" ? "pb-24" : ""
      }`}>
        {/* Основная информация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 space-y-3 shadow-lg border border-white/20"
        >
          <button
            onClick={handleAddToCalendar}
            className="w-full flex items-center gap-3 hover:bg-[#f2f2f7]/30 -mx-4 px-4 py-2 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-[#3c3c43]/60">Дата и время</p>
              <p className="text-[17px] font-semibold text-black">
                {event.date}, {event.time}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
          </button>
          
          <div className="h-px bg-[#c6c6c8]/30" />

          <button
            onClick={() => navigate(`/event/${id}/map`)}
            className="w-full flex items-center gap-3 hover:bg-[#f2f2f7]/30 -mx-4 px-4 py-2 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] text-[#3c3c43]/60">Место</p>
              <p className="text-[17px] font-semibold text-black">
                {event.location}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
          </button>
          
          <div className="h-px bg-[#c6c6c8]/30" />

          <button
            onClick={handleViewAttendees}
            className="w-full flex items-center gap-3 hover:bg-[#f2f2f7]/30 -mx-4 px-4 py-2 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34c759] to-[#30D158] flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-[#3c3c43]/60">Участники</p>
              <p className="text-[17px] font-semibold text-black">
                {event.attendees} из {event.maxAttendees}
              </p>
              <div className="mt-2 h-2 bg-[#e5e5ea] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-[#34c759] to-[#30D158] rounded-full"
                />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
          </button>
          
          <div className="h-px bg-[#c6c6c8]/30" />

          <button
            onClick={() => event.organizerId && navigate(`/user/${event.organizerId}`)}
            className="w-full flex items-center gap-3 hover:bg-[#f2f2f7]/30 -mx-4 px-4 py-2 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff9500] to-[#ffb340] flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-[#3c3c43]/60">Организатор</p>
              <p className="text-[17px] font-semibold text-black">{event.organizer}</p>
            </div>
            {event.organizerId && <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />}
          </button>
        </motion.div>

        {/* Описание */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20"
        >
          <h2 className="text-[19px] font-bold text-black mb-3">
            О мероприятии
          </h2>
          <p className="text-[17px] text-[#3c3c43] leading-relaxed">
            {event.description}
          </p>
        </motion.div>

        {/* Кнопка заявок для организатора */}
        {event.requiresApproval && event.organizerId === getCurrentUserId() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => navigate(`/event/${id}/requests`)}
              className="w-full bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20 flex items-center gap-3 hover:bg-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF9500] to-[#FFB340] flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[17px] font-semibold text-black">Заявки на событие</p>
                <p className="text-[13px] text-[#3c3c43]/60">
                  {event.pendingRequestsCount ? `${event.pendingRequestsCount} новых заявок` : "Нет новых заявок"}
                </p>
              </div>
              {event.pendingRequestsCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-[#ff3b30] flex items-center justify-center">
                  <span className="text-white text-[11px] font-bold">{event.pendingRequestsCount}</span>
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
            </button>
          </motion.div>
        )}

        {/* Чат события - только для одобренных участников */}
        {event.participationStatus === "joined" && eventChatId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => navigate(`/chat/${eventChatId}`)}
              className="w-full bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/20 flex items-center gap-3 hover:bg-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[17px] font-semibold text-black">Чат события</p>
                <p className="text-[13px] text-[#3c3c43]/60">Общайтесь с другими участниками</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#3c3c43]/40 flex-shrink-0" />
            </button>
          </motion.div>
        )}

        {/* Кнопка "Слив" для участников */}
        {event.participationStatus === "joined" && (
          <div className="flex gap-3 pb-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowShareModal(true)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-transparent border border-[#c6c6c8]/50 flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-[#34C759]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoinClick}
              className="flex-1 py-3.5 rounded-full text-[17px] font-bold bg-gradient-to-r from-[#ff3b30] to-[#ff453a] text-white"
            >
              Слив
            </motion.button>
          </div>
        )}
      </div>

      {/* Фиксированная кнопка "Джойн" внизу */}
      {event.participationStatus === "none" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowShareModal(true)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-transparent border border-[#c6c6c8]/50 flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-[#34C759]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoinClick}
              className="flex-1 py-3.5 rounded-full text-[17px] font-bold bg-gradient-to-r from-[#34C759] to-[#30D158] text-white"
            >
              Джойн
            </motion.button>
          </div>
        </div>
      )}

      {/* Кнопки для статусов pending/rejected */}
      {(event.participationStatus === "pending" || event.participationStatus === "rejected") && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowShareModal(true)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-transparent border border-[#c6c6c8]/50 flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-[#34C759]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoinClick}
              className={`flex-1 py-3.5 rounded-full text-[17px] font-bold ${
                event.participationStatus === "pending"
                  ? "bg-[#8e8e93] text-white"
                  : "bg-[#c6c6c8] text-[#3c3c43]/60"
              }`}
            >
              {event.participationStatus === "pending" ? "Заявка отправлена" : "Отказано"}
            </motion.button>
          </div>
        </div>
      )}

      {/* Модальное окно поделиться */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventId={event?.id || ""}
        eventTitle={event?.title || ""}
      />

      {/* Модальное окно подтверждения */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedAction}
        title="Выйти из события?"
        message="Вы уверены, что хотите выйти из этого события?"
        confirmText="Слив"
        confirmColor="red"
      />
    </div>
  );
}