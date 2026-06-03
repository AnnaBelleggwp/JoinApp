import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, MapPin, Users, Calendar, Map as MapIcon, List, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NavigationBar from "./NavigationBar";
import LazyMap from "./LazyMap";
import FiltersModal from "./FiltersModal";
import SearchModal from "./SearchModal";
import NotificationBell from "./NotificationBell";
import { eventApi, type Event } from "../../utils/api";
import { getCurrentUserId } from "../../utils/auth";
import {
  DISCOVERY_LOCATIONS,
  DISCOVERY_RADIUS_OPTIONS,
  getDiscoveryLocation,
  readDiscoveryLocationState,
  writeDiscoveryLocationState,
} from "../../utils/discoveryLocation";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningEventIds, setJoiningEventIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [dateFilter, setDateFilter] = useState("Все даты");
  const [attendeesFilter, setAttendeesFilter] = useState("Любое количество");
  const [searchQuery, setSearchQuery] = useState("");
  const [discoveryLocation, setDiscoveryLocation] = useState(readDiscoveryLocationState);

  const selectedDiscoveryLocation = getDiscoveryLocation(discoveryLocation.locationId);
  const hasGeoFilter =
    selectedDiscoveryLocation.latitude != null && selectedDiscoveryLocation.longitude != null;

  const discoveryParams = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const params: Parameters<typeof eventApi.discover>[0] = {
      limit: 50,
      query: searchQuery.trim() || undefined,
      categoryName: selectedCategory === "Все" ? null : selectedCategory,
      startsAfter: now.toISOString(),
    };

    if (selectedDiscoveryLocation.latitude != null && selectedDiscoveryLocation.longitude != null) {
      params.latitude = selectedDiscoveryLocation.latitude;
      params.longitude = selectedDiscoveryLocation.longitude;
      params.radiusMeters = discoveryLocation.radiusMeters;
    }

    if (dateFilter === "Сегодня") {
      params.startsAfter = todayStart.toISOString();
      params.startsBefore = addDays(todayStart, 1).toISOString();
    } else if (dateFilter === "На этой неделе") {
      params.startsBefore = addDays(todayStart, 7).toISOString();
    } else if (dateFilter === "В этом месяце") {
      params.startsBefore = startOfNextMonth(now).toISOString();
    }

    if (attendeesFilter === "Менее 15") {
      params.maxAttendeesCount = 14;
    } else if (attendeesFilter === "15-25") {
      params.minAttendees = 15;
      params.maxAttendeesCount = 25;
    } else if (attendeesFilter === "Более 25") {
      params.minAttendees = 26;
    }

    return params;
  }, [attendeesFilter, dateFilter, discoveryLocation.radiusMeters, searchQuery, selectedCategory, selectedDiscoveryLocation]);

  useEffect(() => {
    writeDiscoveryLocationState(discoveryLocation);
  }, [discoveryLocation]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventApi.discover(discoveryParams);
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, [discoveryParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, searchQuery ? 250 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents, searchQuery]);

  const handleJoin = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const event = events.find(ev => ev.id === eventId);
      if (!event || event.participationStatus !== "none" || joiningEventIds.has(eventId)) return;

      setJoiningEventIds((current) => new Set(current).add(eventId));
      const currentUserId = getCurrentUserId();
      await eventApi.join(eventId, currentUserId);
      await loadEvents();
    } catch (error) {
      console.error("Error joining/leaving event:", error);
      alert("Ошибка при обновлении участия");
    } finally {
      setJoiningEventIds((current) => {
        const next = new Set(current);
        next.delete(eventId);
        return next;
      });
    }
  };

  const eventStatusLabel = (event: Event) => {
    if (joiningEventIds.has(event.id)) return "...";
    if (event.participationStatus === "joined") return "Я в теме";
    if (event.participationStatus === "pending") return "Заявка";
    if (event.participationStatus === "rejected") return "Отказано";
    return "Джойн";
  };

  const eventStatusClassName = (event: Event) => {
    if (event.participationStatus === "joined") return "bg-white/90 text-[#34C759]";
    if (event.participationStatus === "pending") return "bg-white/90 text-[#8e8e93]";
    if (event.participationStatus === "rejected") return "bg-white/90 text-[#ff3b30]";
    return "bg-[#34C759]/90 text-white";
  };

  const formatDistance = (distanceMeters?: number | null) => {
    if (distanceMeters == null) return null;
    if (distanceMeters < 1000) return `${Math.round(distanceMeters)} м`;
    return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} км`;
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedCategory("Все");
    setDateFilter("Все даты");
    setAttendeesFilter("Любое количество");
  };

  const mapCenter =
    selectedDiscoveryLocation.latitude != null && selectedDiscoveryLocation.longitude != null
      ? ([selectedDiscoveryLocation.latitude, selectedDiscoveryLocation.longitude] as [number, number])
      : undefined;

  const mapZoom = discoveryLocation.radiusMeters <= 5000 ? 12 : discoveryLocation.radiusMeters <= 25000 ? 10 : 9;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f2f7] to-white">
      <NavigationBar
        title="Главная"
        rightButton={
          <div className="flex items-center gap-3">
            <NotificationBell />
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

      {/* Выбор области */}
      <div className="px-4 pb-3">
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-3 shadow-sm border border-white/20">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <label className="min-w-0">
              <span className="text-[13px] text-[#3c3c43]/60 mb-1 block">Область поиска</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#34C759] flex-shrink-0" />
                <select
                  value={discoveryLocation.locationId}
                  onChange={(event) =>
                    setDiscoveryLocation((current) => ({ ...current, locationId: event.target.value }))
                  }
                  className="w-full text-[16px] text-black bg-transparent border-none outline-none"
                >
                  {DISCOVERY_LOCATIONS.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={`${hasGeoFilter ? "" : "opacity-40"}`}>
              <span className="text-[13px] text-[#3c3c43]/60 mb-1 block">Радиус</span>
              <select
                value={discoveryLocation.radiusMeters}
                onChange={(event) =>
                  setDiscoveryLocation((current) => ({ ...current, radiusMeters: Number(event.target.value) }))
                }
                disabled={!hasGeoFilter}
                className="text-[16px] text-black bg-transparent border-none outline-none"
              >
                {DISCOVERY_RADIUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[17px] text-[#3c3c43]/60">Событий не найдено</p>
              </div>
            ) : (
              events.map((event, index) => (
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
                        {event.participationStatus === "none" ? (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => handleJoin(event.id, e)}
                            disabled={joiningEventIds.has(event.id)}
                            className={`px-4 py-1.5 rounded-full text-[15px] font-semibold backdrop-blur-md ${eventStatusClassName(event)}`}
                          >
                            {eventStatusLabel(event)}
                          </motion.button>
                        ) : (
                          <div className={`px-4 py-1.5 rounded-full text-[15px] font-semibold backdrop-blur-md ${eventStatusClassName(event)}`}>
                            {eventStatusLabel(event)}
                          </div>
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
                          {formatDistance(event.distanceMeters) && (
                            <span className="text-[#3c3c43]/50 whitespace-nowrap">
                              {formatDistance(event.distanceMeters)}
                            </span>
                          )}
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
                                style={{ width: `${event.maxAttendees ? Math.min((event.attendees / event.maxAttendees) * 100, 100) : 0}%` }}
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
          <LazyMap events={events} center={mapCenter} zoom={mapZoom} />
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
