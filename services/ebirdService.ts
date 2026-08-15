import { API_CONFIG } from '../config/api';
import {
  getRecentNotableObservations as getRecentNotableObservationsApi,
  EbirdObservation,
  EbirdHotspot,
  getNearbyHotspots,
  getRecentSightings,
  getHotspotSpecies,
} from './api/ebird';

export type { EbirdObservation, EbirdHotspot };
export { getNearbyHotspots, getRecentSightings, getHotspotSpecies };

/**
 * Queries eBird API for recent notable observations near specified coordinates.
 * ${EBIRD_BASE_URL}/v2/data/obs/GEO/recent/notable?lat=${lat}&lng=${lng}&dist=${distKm}&back=7
 * Header 'X-eBirdApiToken': EXPO_PUBLIC_EBIRD_API_KEY
 */
export const getRecentNotableObservations = async (
  lat: number,
  lng: number,
  distKm: number = 25
): Promise<EbirdObservation[]> => {
  try {
    return await getRecentNotableObservationsApi(lat, lng, distKm);
  } catch (error) {
    console.error('Error fetching recent notable observations in ebirdService:', error);
    return [];
  }
};
