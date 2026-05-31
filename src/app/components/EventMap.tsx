import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import { eventApi } from "../../utils/api";
import LazyMap from "./LazyMap";

export default function EventMap() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventData = await eventApi.get(id!);
      setEvent(eventData);
    } catch (error) {
      console.error("Error loading event:", error);
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

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-[17px] text-[#3c3c43]/60">Событие не найдено</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      <NavigationBar title="Место проведения" showBack />

      <div className="flex-1 relative min-h-[500px]">
        <LazyMap events={[event]} center={[event.latitude, event.longitude]} zoom={15} />
      </div>

      {/* Информация о месте */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl border border-white/20 pointer-events-auto">
          <h3 className="text-[19px] font-bold text-black mb-2">{event.title}</h3>
          <p className="text-[17px] text-[#3c3c43] mb-3">{event.location}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#34C759] to-[#30D158] text-white text-[17px] font-bold text-center"
          >
            Открыть в Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
