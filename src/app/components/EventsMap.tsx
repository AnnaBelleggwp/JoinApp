import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Users } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Event } from "../data/mockData";

// Исправляем иконки Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

const defaultIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface EventsMapProps {
  events: Event[];
  center?: [number, number];
  zoom?: number;
}

export default function EventsMap({ events, center, zoom }: EventsMapProps) {
  if (!events || events.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#f2f2f7]" style={{ minHeight: "400px" }}>
        <p className="text-[15px] text-[#3c3c43]/60">Нет событий для отображения</p>
      </div>
    );
  }

  // Рассчитываем центр карты если не передан
  const mapCenter = center || [
    events.reduce((sum, e) => sum + e.latitude, 0) / events.length,
    events.reduce((sum, e) => sum + e.longitude, 0) / events.length,
  ] as [number, number];

  return (
    <div className="h-full w-full relative" style={{ minHeight: "400px" }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom || 12}
        style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={defaultIcon}
          >
            <Popup closeButton={false} maxWidth={240}>
              <div style={{ width: "240px" }}>
                <div className="relative h-32 overflow-hidden rounded-t-lg">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 bg-white">
                  <h3 className="text-[15px] font-semibold text-black mb-1">
                    {event.title}
                  </h3>
                  <p className="text-[13px] text-gray-600 mb-2">
                    {event.date} · {event.time}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[13px] text-gray-600">
                      <Users className="w-3 h-3" />
                      <span>
                        {event.attendees}/{event.maxAttendees}
                      </span>
                    </div>
                    <Link
                      to={`/event/${event.id}`}
                      className="text-[13px] font-semibold text-[#34C759]"
                    >
                      Подробнее →
                    </Link>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
