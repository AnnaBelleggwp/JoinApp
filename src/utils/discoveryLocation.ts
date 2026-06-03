export interface DiscoveryLocation {
  id: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

export interface DiscoveryLocationState {
  locationId: string;
  radiusMeters: number;
}

const STORAGE_KEY = "join_discovery_location";

export const DISCOVERY_LOCATIONS: DiscoveryLocation[] = [
  { id: "all", label: "Вся лента" },
  { id: "moscow", label: "Москва", latitude: 55.7558, longitude: 37.6173 },
  { id: "spb", label: "Санкт-Петербург", latitude: 59.9343, longitude: 30.3351 },
  { id: "kazan", label: "Казань", latitude: 55.7961, longitude: 49.1064 },
  { id: "ekaterinburg", label: "Екатеринбург", latitude: 56.8389, longitude: 60.6057 },
  { id: "novosibirsk", label: "Новосибирск", latitude: 55.0084, longitude: 82.9357 },
];

export const DISCOVERY_RADIUS_OPTIONS = [
  { label: "1 км", value: 1000 },
  { label: "5 км", value: 5000 },
  { label: "10 км", value: 10000 },
  { label: "25 км", value: 25000 },
  { label: "50 км", value: 50000 },
];

export const DEFAULT_DISCOVERY_LOCATION_STATE: DiscoveryLocationState = {
  locationId: "all",
  radiusMeters: 10000,
};

export function getDiscoveryLocation(locationId: string): DiscoveryLocation {
  return DISCOVERY_LOCATIONS.find((location) => location.id === locationId) || DISCOVERY_LOCATIONS[0];
}

export function readDiscoveryLocationState(): DiscoveryLocationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DISCOVERY_LOCATION_STATE;

    const parsed = JSON.parse(raw) as Partial<DiscoveryLocationState>;
    const location = getDiscoveryLocation(parsed.locationId || DEFAULT_DISCOVERY_LOCATION_STATE.locationId);
    const radius = DISCOVERY_RADIUS_OPTIONS.some((option) => option.value === parsed.radiusMeters)
      ? parsed.radiusMeters!
      : DEFAULT_DISCOVERY_LOCATION_STATE.radiusMeters;

    return {
      locationId: location.id,
      radiusMeters: radius,
    };
  } catch {
    return DEFAULT_DISCOVERY_LOCATION_STATE;
  }
}

export function writeDiscoveryLocationState(state: DiscoveryLocationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
