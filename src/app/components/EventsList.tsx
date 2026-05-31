import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, MapPin, Users, Calendar, Map as MapIcon, List, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NavigationBar from "./NavigationBar";
import LazyMap from "./LazyMap";
import FiltersModal from "./FiltersModal";
import SearchModal from "./SearchModal";
import { eventApi } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [dateFilter, setDateFilter] = useState("Все даты");
  const [attendeesFilter, setAttendeesFilter] = useState("Любое количество");
  const [searchQuery, setSearchQuery] = useState("");

  // Загрузка событий при монтировании
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventApi.getAll();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();

    try {
      const event = events.find(ev => ev.id === eventId);
      if (!event) return;

      const currentUserId = getCurrentUserId();
      if (event.isJoined) {
        await eventApi.leave(eventId, currentUserId);
      } else {
        await eventApi.join(eventId, currentUserId);
      }

      // Обновляем локальное состояние
      setEvents(events.map(ev =>
        ev.id === eventId
          ? { ...ev, isJoined: !ev.isJoined, attendees: ev.isJoined ? ev.attendees - 1 : ev.attendees + 1 }
          : ev
      ));
    } catch (error) {
      console.error("Error joining/leaving event:", error);
      alert("Ошибка при обновлении участия");
    }
  };

  const filteredEvents = events.filter(event => {
    // Поиск по названию
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Фильтры из модального окна
    if (selectedCategory !== "Все" && event.category !== selectedCategory) return false;
    if (dateFilter === "Сегодня") return event.date === "Сегодня";
    if (dateFilter === "На этой неделе") return true; // Упрощенная логика
    if (attendeesFilter === "Менее 15") return event.attendees < 15;
    if (attendeesFilter === "15-25") return event.attendees >= 15 && event.attendees <= 25;
    return true;
  });

  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedCategory("Все");
    setDateFilter("Все даты");
    setAttendeesFilter("Любое количество");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar
        title="Главная"
        rightButton={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(true)}
              className="text-[#34C759] p-1"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className="text-[#34C759] p-1"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Переключатель вида */}
      <div className="px-4 pt-3 pb-3">
        <div className="bg-white/70 backdrop-blur-2xl rounded-xl p-1 flex shadow-sm border border-white/20">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 py-2 rounded-lg text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === "list"
                ? "bg-[#34C759] text-white"
                : "text-[#3c3c43]/60"
            }`}
          >
            <List className="w-4 h-4" />
            Список
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 py-2 rounded-lg text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === "map"
                ? "bg-[#34C759] text-white"
                : "text-[#3c3c43]/60"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            Карта
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {/* Список событий */}
          <div className="px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[17px] text-[#3c3c43]/60">Событий не найдено</p>
              </div>
            ) : (
              filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/event/${event.id}`} className="block">
                  <div className="bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-lg border border-white/20">
                    {/* Изображение */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Бейдж категории */}
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-[13px] font-medium bg-white/90 backdrop-blur-sm text-black">
                          {event.category}
                        </span>
                      </div>

                      {/* Кнопка статуса */}
                      <div className="absolute top-3 right-3">
                        {event.isJoined ? (
                          <div className="px-4 py-1.5 rounded-full text-[15px] font-semibold backdrop-blur-md bg-white/90 text-[#34C759]">
                            Я в теме
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => handleJoin(event.id, e)}
                            className="px-4 py-1.5 rounded-full text-[15px] font-semibold backdrop-blur-md bg-[#34C759]/90 text-white"
                          >
                            Джойн
                          </motion.button>
                        )}
                      </div>

                      {/* Заголовок на изображении */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-[19px] font-bold text-white mb-1 line-clamp-2">
                          {event.title}
                        </h3>
                      </div>
                    </div>

                    {/* Информация */}
                    <div className="p-4">
                      <div className="space-y-2">
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

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#34C759]" />
                            <span className="text-[15px] text-[#3c3c43]">
                              {event.attendees}/{event.maxAttendees}
                            </span>
                          </div>

                          {/* Прогресс бар */}
                          <div className="flex-1 ml-3">
                            <div className="h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#34C759] to-[#30D158] rounded-full transition-all duration-500"
                                style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
              ))
            )}
          </div>
      </>
      ) : (
        /* Режим карты */
        <div className="h-[calc(100vh-180px)] px-4 pb-4">
          <LazyMap events={filteredEvents} />
        </div>
      )}

      {/* Модальное окно фильтров */}
      <AnimatePresence>
        {showFilters && (
          <FiltersModal
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            attendeesFilter={attendeesFilter}
            setAttendeesFilter={setAttendeesFilter}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        )}
      </AnimatePresence>

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
