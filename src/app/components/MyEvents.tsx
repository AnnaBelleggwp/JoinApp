import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, Plus, Crown, Bell, Search } from "lucide-react";
import { motion } from "motion/react";
import NavigationBar from "./NavigationBar";
import SearchModal from "./SearchModal";
import { eventApi, type Event } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import { subscribeToMyEvents } from "../../utils/realtime";

type FilterType = "all" | "organizer" | "participant" | "pending" | "rejected";

export default function MyEvents() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMyEvents = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const allEvents = await eventApi.getAll();
      const currentUserId = getCurrentUserId();

      // Фильтруем события где я участник, организатор, или подал заявку
      const relevantEvents = allEvents.filter(event =>
        event.organizerId === currentUserId ||
        event.participationStatus === "joined" ||
        event.participationStatus === "pending" ||
        event.participationStatus === "rejected"
      );

      setMyEvents(relevantEvents);
    } catch (error) {
      console.error("Error loading my events:", error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMyEvents();
  }, [loadMyEvents]);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    let unsubscribe: (() => void) | undefined;
    let active = true;

    subscribeToMyEvents(currentUserId, () => {
      if (active) void loadMyEvents(false);
    }).then((cleanup) => {
      if (active) {
        unsubscribe = cleanup;
      } else {
        cleanup();
      }
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [loadMyEvents]);

  const currentUserId = getCurrentUserId();

  // Применяем поиск
  let filteredEvents = myEvents.filter(event => {
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Применяем фильтры
  if (filter === "organizer") {
    filteredEvents = filteredEvents.filter(e => e.organizerId === currentUserId);
  } else if (filter === "participant") {
    filteredEvents = filteredEvents.filter(e => e.participationStatus === "joined" && e.organizerId !== currentUserId);
  } else if (filter === "pending") {
    filteredEvents = filteredEvents.filter(e => e.participationStatus === "pending");
  } else if (filter === "rejected") {
    filteredEvents = filteredEvents.filter(e => e.participationStatus === "rejected");
  }

  // Сортируем: отказанные в конец
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (a.participationStatus === "rejected" && b.participationStatus !== "rejected") return 1;
    if (a.participationStatus !== "rejected" && b.participationStatus === "rejected") return -1;
    return 0;
  });

  // Все события пользователя считаем предстоящими
  const upcomingEvents = sortedEvents;
  const pastEvents: typeof myEvents = []; // Пустой список для демо

  const displayEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const getStatusBadge = (event: Event) => {
    const isOrganizer = event.organizerId === currentUserId;

    if (isOrganizer) {
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[13px] font-semibold bg-gradient-to-r from-[#FF9500] to-[#FFB340] text-white flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Организатор
          </span>
          {event.pendingRequestsCount > 0 && event.requiresApproval && (
            <span className="px-2 py-1 rounded-full bg-[#ff3b30] text-white text-[11px] font-bold flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {event.pendingRequestsCount}
            </span>
          )}
        </div>
      );
    }

    switch (event.participationStatus) {
      case "joined":
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-semibold bg-[#34c759] text-white">
            ✓ Участвую
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-semibold bg-[#8e8e93] text-white">
            Заявка
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-semibold bg-[#c6c6c8] text-[#3c3c43]">
            Отказано
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar
        title="Мои события"
        rightButton={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(true)}
              className="text-[#34C759] p-1"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/create-event")}
              className="text-[#34C759] p-1"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        }
      />

      {/* Segmented Control */}
      <div className="px-4 py-3">
        <div className="bg-white/70 backdrop-blur-2xl rounded-xl p-1 flex shadow-sm border border-white/20">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 rounded-lg text-[15px] font-semibold transition-all ${
              activeTab === "upcoming"
                ? "bg-[#34C759] text-white shadow-lg"
                : "text-[#3c3c43]/60"
            }`}
          >
            Предстоящие
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 rounded-lg text-[15px] font-semibold transition-all ${
              activeTab === "past"
                ? "bg-[#34C759] text-white shadow-lg"
                : "text-[#3c3c43]/60"
            }`}
          >
            Прошедшие
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2">
          {[
            { value: "all" as FilterType, label: "Все" },
            { value: "organizer" as FilterType, label: "Мои события" },
            { value: "participant" as FilterType, label: "Участвую" },
            { value: "pending" as FilterType, label: "Заявки" },
            { value: "rejected" as FilterType, label: "Отказано" },
          ].map((f) => (
            <motion.button
              key={f.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-[15px] font-medium whitespace-nowrap transition-all ${
                f.value === filter
                  ? "bg-[#34C759] text-white shadow-lg"
                  : "bg-white/90 backdrop-blur-xl text-[#3c3c43] border border-white/30"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Список событий */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayEvents.length > 0 ? (
        <div className="px-4 pb-4 space-y-3">
          {displayEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/event/${event.id}`} className="block">
                <div className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Статус */}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(event)}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-[17px] font-bold text-white line-clamp-2">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[15px]">
                      <Calendar className="w-4 h-4 text-[#34C759]" />
                      <span className="text-[#3c3c43]">
                        {event.date} · {event.time}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-[15px]">
                      <MapPin className="w-4 h-4 text-[#34C759] mt-0.5 flex-shrink-0" />
                      <span className="text-[#3c3c43]/80 line-clamp-1">
                        {event.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Users className="w-4 h-4 text-[#34C759]" />
                      <span className="text-[15px] text-[#3c3c43]">
                        {event.attendees}/{event.maxAttendees} участников
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-8"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#34C759]/10 to-[#30D158]/10 flex items-center justify-center mb-4">
            <Calendar className="w-12 h-12 text-[#34C759]/40" />
          </div>
          <p className="text-[19px] font-semibold text-black mb-2">
            Пока пусто
          </p>
          <p className="text-[15px] text-[#3c3c43]/60 text-center">
            {activeTab === "upcoming"
              ? "Запишитесь на событие, чтобы увидеть его здесь"
              : "Здесь будут отображаться завершённые события"
            }
          </p>
        </motion.div>
      )}

      {/* Модальное окно поиска */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
}
