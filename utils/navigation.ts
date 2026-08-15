import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { getNearestAirportIATA } from '../services/geminiService';

export type NavigationMode = 'walk' | 'bicycling' | 'driving' | 'motorcycle' | 'flight';

export interface UserLocation {
  lat: number;
  lng: number;
}

export const FALLBACK_LOCATION: UserLocation = {
  lat: 4.6581122,
  lng: -74.1357403,
};

/**
 * Dynamically obtains the precise user position using expo-location.
 * Fallback to Bogotá/Modelia coordinates { lat: 4.6581122, lng: -74.1357403 } on error or permission rejection.
 */
export const getCurrentUserLocation = async (): Promise<UserLocation> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return FALLBACK_LOCATION;
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (location?.coords) {
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    }
    return FALLBACK_LOCATION;
  } catch (error) {
    console.error('Error fetching user location:', error);
    return FALLBACK_LOCATION;
  }
};

export interface OpenDirectionsParams {
  originLat?: number;
  originLng?: number;
  destLat: number;
  destLng: number;
  destName?: string;
  mode?: NavigationMode;
}

const COUNTRIES_TO_IGNORE = new Set([
  'colombia',
  'co',
  'ecuador',
  'peru',
  'perú',
  'venezuela',
  'panama',
  'panamá',
  'brasil',
  'brazil',
  'chile',
  'argentina',
  'bolivia',
  'mexico',
  'méxico',
  'united states',
  'usa',
  'us',
]);

const TAGS_TO_REMOVE = [
  /Santuario\s+de\s+Flora\s+(?:y|&)\s+Fauna(?:\s+de)?/gi,
  /Parque\s+Nacional\s+Natural(?:\s+de)?/gi,
  /Parque\s+Nacional(?:\s+de)?/gi,
  /Parque\s+Natural(?:\s+de)?/gi,
  /Reserva\s+Ecológica(?:\s+de)?/gi,
  /Reserva\s+Ecologica(?:\s+de)?/gi,
  /Reserva\s+Natural(?:\s+de)?/gi,
  /Área\s+Natural\s+Protegida(?:\s+de)?/gi,
  /Area\s+Natural\s+Protegida(?:\s+de)?/gi,
  /Área\s+Protegida(?:\s+de)?/gi,
  /Area\s+Protegida(?:\s+de)?/gi,
  /Bosque\s+Protector(?:\s+de)?/gi,
  /Archipiélago\s+de/gi,
  /Archipielago\s+de/gi,
  /Archipiélago/gi,
  /Archipielago/gi,
  /Refugio\s+de\s+Vida\s+Silvestre(?:\s+de)?/gi,
  /Vía\s+Parque(?:\s+de)?/gi,
  /Via\s+Parque(?:\s+de)?/gi,
  /Humedal\s+de/gi,
  /Laguna\s+de/gi,
  /Santuario\s+de/gi,
  /Reserva\s+de/gi,
  /\bPNN\b/gi,
  /\bSFF\b/gi,
  /\bHumedal\b/gi,
  /\bReserva\b/gi,
  /\bHotspot\b/gi,
  /\bParque\b/gi,
  /\bLaguna\b/gi,
  /\bBosque\b/gi,
  /\bSantuario\b/gi,
];

/**
 * Sanitizes destination names for flight searches on Google Flights.
 */
export const getCleanFlightDestination = (
  destName?: string,
  lat?: number,
  lng?: number
): string => {
  if (!destName || !destName.trim()) {
    if (lat !== undefined && lng !== undefined) {
      return `${lat},${lng}`;
    }
    return '';
  }

  const rawName = destName.trim();

  // If the name is just coordinates (e.g. "4.57, -74.29"), return coordinates
  if (/^[\d.,\s-]+$/.test(rawName)) {
    return rawName;
  }

  // Helper to strip tags from a text string
  const cleanTags = (str: string): string => {
    let result = str;
    for (const tagPattern of TAGS_TO_REMOVE) {
      result = result.replace(tagPattern, ' ');
    }
    // Clean up multiple spaces, leading prepositions (de/del), and outer punctuation
    result = result
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[\s\-_,:]+/, '')
      .replace(/[\s\-_,:]+$/, '')
      .replace(/^(?:de|del)\s+/i, '')
      .trim();
    return result;
  };

  // Check if comma-separated city/region info exists
  if (rawName.includes(',')) {
    const parts = rawName
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Look from right to left for a valid city/region part (skipping country names)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (COUNTRIES_TO_IGNORE.has(part.toLowerCase())) {
        continue;
      }
      const cleaned = cleanTags(part);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }

  // If no comma or no valid part found from comma split, clean the full destName
  const cleanedFull = cleanTags(rawName);
  if (cleanedFull.length > 0) {
    return cleanedFull;
  }

  if (lat !== undefined && lng !== undefined) {
    return `${lat},${lng}`;
  }

  return rawName;
};

/**
 * Fetches city/region name from lat/lng using Nominatim OpenStreetMap API.
 */
export const getCityFromCoordinates = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'AvedexApp/1.0',
        },
      }
    );
    if (!response.ok) return '';
    const data = await response.json();
    const address = data?.address || {};
    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      address.country ||
      ''
    );
  } catch (error) {
    console.error('Error fetching city from coordinates:', error);
    return '';
  }
};

/**
 * Opens Google Flights with Gemini-resolved nearest airport IATA code.
 */
export function openGoogleFlights(
  hotspotName: string,
  lat: number,
  lng: number
): Promise<void>;
export function openGoogleFlights(
  destLat: number,
  destLng: number,
  hotspotName: string
): Promise<void>;
export async function openGoogleFlights(
  arg1: string | number,
  arg2: number,
  arg3: string | number
): Promise<void> {
  let hotspotName: string;
  let lat: number;
  let lng: number;

  if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'number') {
    hotspotName = arg1;
    lat = arg2;
    lng = arg3;
  } else if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'string') {
    lat = arg1;
    lng = arg2;
    hotspotName = arg3;
  } else {
    hotspotName = String(arg1 || arg3 || '');
    lat = Number(typeof arg1 === 'number' ? arg1 : arg2);
    lng = Number(typeof arg3 === 'number' ? arg3 : arg2);
  }

  try {
    const iataCode = await getNearestAirportIATA(hotspotName, lat, lng);
    const flightsUrl = `https://www.google.com/travel/flights?q=vuelos+a+${iataCode}`;
    await Linking.openURL(flightsUrl);
  } catch (error) {
    console.error('Error opening Google Flights URL:', error);
    try {
      await Linking.openURL('https://www.google.com/travel/flights');
    } catch (fallbackError) {
      console.error('Error opening fallback Google Flights URL:', fallbackError);
    }
  }
}

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @returns Distance in kilometers
 */
export const getDistanceKm = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TRAVEL_MODE_MAP: Record<NavigationMode, string> = {
  walk: 'walking',
  bicycling: 'bicycling',
  driving: 'driving',
  motorcycle: 'two-wheeler',
  flight: 'flight',
};

/**
 * Opens Google Maps directions with fresh origin coordinates.
 */
export const openGoogleMapsDirections = async ({
  originLat,
  originLng,
  destLat,
  destLng,
  mode = 'driving',
}: OpenDirectionsParams): Promise<void> => {
  let lat = originLat;
  let lng = originLng;
  if (lat === undefined || lng === undefined) {
    const userLoc = await getCurrentUserLocation();
    lat = userLoc.lat;
    lng = userLoc.lng;
  }
  const travelMode = TRAVEL_MODE_MAP[mode] || 'driving';
  const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;
  await Linking.openURL(url);
};

/**
 * Opens Apple Maps directions with fresh origin coordinates.
 */
export const openAppleMaps = async ({
  originLat,
  originLng,
  destLat,
  destLng,
  mode = 'driving',
}: OpenDirectionsParams): Promise<void> => {
  let lat = originLat;
  let lng = originLng;
  if (lat === undefined || lng === undefined) {
    const userLoc = await getCurrentUserLocation();
    lat = userLoc.lat;
    lng = userLoc.lng;
  }
  const appleModeMap: Record<NavigationMode, string> = {
    walk: 'w',
    bicycling: 'r',
    driving: 'd',
    motorcycle: 'd',
    flight: 'd',
  };
  const dirflg = appleModeMap[mode] || 'd';
  const url = `http://maps.apple.com/?saddr=${lat},${lng}&daddr=${destLat},${destLng}&dirflg=${dirflg}`;
  await Linking.openURL(url);
};

/**
 * Opens Waze navigation.
 */
export const openWaze = async ({
  destLat,
  destLng,
}: Pick<OpenDirectionsParams, 'destLat' | 'destLng'>): Promise<void> => {
  await getCurrentUserLocation();
  const url = `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
  await Linking.openURL(url);
};

/**
 * Opens maps or flights directions for the target destination.
 * Dynamically fetches fresh GPS coordinates via getCurrentUserLocation() if origin is not provided or when launching.
 */
export const openDirections = async ({
  originLat,
  originLng,
  destLat,
  destLng,
  destName,
  mode = 'driving',
}: OpenDirectionsParams): Promise<void> => {
  if (mode === 'flight') {
    await openGoogleFlights(destLat, destLng, destName || '');
    return;
  }

  let lat = originLat;
  let lng = originLng;
  if (lat === undefined || lng === undefined) {
    const userLoc = await getCurrentUserLocation();
    lat = userLoc.lat;
    lng = userLoc.lng;
  }

  const travelMode = TRAVEL_MODE_MAP[mode] || 'driving';
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;

  if (Platform.OS === 'ios') {
    const canOpenGoogle = await Linking.canOpenURL(mapUrl);
    if (!canOpenGoogle) {
      await openAppleMaps({ originLat: lat, originLng: lng, destLat, destLng, mode });
      return;
    }
  }

  await Linking.openURL(mapUrl);
};
