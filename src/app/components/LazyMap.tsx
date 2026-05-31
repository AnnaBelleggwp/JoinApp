import EventsMap from "./EventsMap";

interface LazyMapProps {
  events: any[];
  center?: [number, number];
  zoom?: number;
}

export default function LazyMap({ events, center, zoom }: LazyMapProps) {
  return <EventsMap events={events} center={center} zoom={zoom} />;
}
