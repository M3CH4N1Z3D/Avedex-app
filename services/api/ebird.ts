import { API_CONFIG } from '../../config/api';
import { MOCK_BIRDS } from '../../constants/mockBirds';
import { searchSpecies, getCachedSpeciesImage, cacheSpeciesImage } from './inaturalist';

export interface EbirdHotspot {
  locId: string;
  locName: string;
  lat: number;
  lng: number;
}

export interface EbirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId?: string;
  locName: string;
  obsDt: string;
  howMany?: number;
  lat?: number;
  lng?: number;
  imageUrl?: string;
}

const fetchEbird = async (endpoint: string) => {
  const url = `${API_CONFIG.EBIRD_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-eBirdApiToken': API_CONFIG.EBIRD_API_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`eBird API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const getNearbyHotspots = async (lat: number, lng: number): Promise<EbirdHotspot[]> => {
  try {
    return await fetchEbird(`/ref/hotspot/geo?lat=${lat}&lng=${lng}&fmt=json&dist=25`);
  } catch (error) {
    console.error('Error fetching eBird hotspots:', error);
    throw error;
  }
};

export const getRecentSightings = async (
  lat: number,
  lng: number,
  back: number = 14
): Promise<EbirdObservation[]> => {
  try {
    return await fetchEbird(`/data/obs/geo/recent?lat=${lat}&lng=${lng}&back=${back}`);
  } catch (error) {
    console.error('Error fetching eBird sightings:', error);
    throw error;
  }
};

export const getRecentNotableObservations = async (
  lat: number,
  lng: number,
  distKm: number = 25
): Promise<EbirdObservation[]> => {
  try {
    const baseUrl = API_CONFIG.EBIRD_BASE_URL.replace(/\/v2\/?$/, '');
    const url = `${baseUrl}/v2/data/obs/GEO/recent/notable?lat=${lat}&lng=${lng}&dist=${distKm}&back=7`;
    const apiKey = API_CONFIG.EBIRD_API_KEY || process.env.EXPO_PUBLIC_EBIRD_API_KEY || '';
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`eBird API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        speciesCode: item.speciesCode || '',
        comName: item.comName || '',
        sciName: item.sciName || '',
        locId: item.locId || '',
        locName: item.locName || '',
        obsDt: item.obsDt || '',
        howMany: item.howMany,
        lat: item.lat,
        lng: item.lng,
      }));
    }
    return [];
  } catch (error) {
    console.warn('Error fetching recent notable eBird observations:', error);
    return [];
  }
};

const getFallbackMockSpecies = (locId?: string): EbirdObservation[] => {
  return MOCK_BIRDS.slice(0, 6).map((bird) => {
    if (bird.scientificName && bird.imageUrl) {
      cacheSpeciesImage(bird.scientificName, bird.imageUrl);
    }
    if (bird.commonName && bird.imageUrl) {
      cacheSpeciesImage(bird.commonName, bird.imageUrl);
    }
    return {
      speciesCode: bird.id,
      comName: bird.commonName,
      sciName: bird.scientificName,
      locId: locId || 'mock-loc',
      locName: 'Punto de Avistamiento',
      obsDt: new Date().toISOString().split('T')[0],
      imageUrl: bird.imageUrl,
    };
  });
};

const enrichObservationWithImage = async (
  obs: EbirdObservation,
  lat?: number,
  lng?: number
): Promise<EbirdObservation> => {
  if (obs.imageUrl) return obs;

  // 1. Check in-memory image cache
  const cachedSci = obs.sciName ? getCachedSpeciesImage(obs.sciName) : undefined;
  if (cachedSci) {
    return { ...obs, imageUrl: cachedSci };
  }
  const cachedCom = obs.comName ? getCachedSpeciesImage(obs.comName) : undefined;
  if (cachedCom) {
    return { ...obs, imageUrl: cachedCom };
  }

  // 2. Check static mock birds
  const matchedMock = MOCK_BIRDS.find(
    (b) =>
      (obs.sciName && b.scientificName.toLowerCase() === obs.sciName.toLowerCase()) ||
      (obs.comName && b.commonName.toLowerCase() === obs.comName.toLowerCase())
  );
  if (matchedMock?.imageUrl) {
    if (obs.sciName) cacheSpeciesImage(obs.sciName, matchedMock.imageUrl);
    if (obs.comName) cacheSpeciesImage(obs.comName, matchedMock.imageUrl);
    return { ...obs, imageUrl: matchedMock.imageUrl };
  }

  // 3. Search iNaturalist (checks its own cache before network request)
  const query = obs.sciName || obs.comName;
  if (query) {
    try {
      const results = await searchSpecies(query, obs.lat ?? lat, obs.lng ?? lng);
      const photoUrl = results?.[0]?.default_photo?.medium_url;
      if (photoUrl) {
        if (obs.sciName) cacheSpeciesImage(obs.sciName, photoUrl);
        if (obs.comName) cacheSpeciesImage(obs.comName, photoUrl);
        return { ...obs, imageUrl: photoUrl };
      }
    } catch (e) {
      // Ignore iNaturalist lookup failure
    }
  }

  const defaultFallback =
    MOCK_BIRDS[0]?.imageUrl ||
    'https://images.unsplash.com/photo-1552728089-57168b64ff1c?auto=format&fit=crop&w=800&q=80';

  if (obs.sciName) cacheSpeciesImage(obs.sciName, defaultFallback);
  if (obs.comName) cacheSpeciesImage(obs.comName, defaultFallback);

  return {
    ...obs,
    imageUrl: defaultFallback,
  };
};

export const getHotspotSpecies = async (
  locId: string,
  lat?: number,
  lng?: number
): Promise<EbirdObservation[]> => {
  let observations: EbirdObservation[] = [];

  try {
    const data = await fetchEbird(`/data/obs/loc/recent/${locId}?back=14&maxResults=10`);
    if (Array.isArray(data) && data.length > 0) {
      observations = data.map((item: any) => ({
        speciesCode: item.speciesCode || '',
        comName: item.comName || '',
        sciName: item.sciName || '',
        locId: item.locId || locId,
        locName: item.locName || '',
        obsDt: item.obsDt || '',
        howMany: item.howMany,
        lat: item.lat,
        lng: item.lng,
      }));
    } else if (lat !== undefined && lng !== undefined) {
      observations = await getRecentSightings(lat, lng);
    }
  } catch (error) {
    console.warn(`Warning fetching eBird species for location ${locId}:`, error);
    if (lat !== undefined && lng !== undefined) {
      try {
        observations = await getRecentSightings(lat, lng);
      } catch (fallbackError) {
        console.warn('Warning fetching recent geo sightings fallback:', fallbackError);
      }
    }
  }

  let isFallback = false;
  if (!observations || observations.length === 0) {
    observations = getFallbackMockSpecies(locId);
    isFallback = true;
  }

  const limitedObservations = observations.slice(0, 5);

  // When returning fallback/mock species, bypass external iNaturalist network requests completely
  if (isFallback) {
    return limitedObservations;
  }

  const enriched: EbirdObservation[] = [];

  for (const obs of limitedObservations) {
    if (obs.imageUrl) {
      enriched.push(obs);
      continue;
    }

    try {
      const enrichedObs = await enrichObservationWithImage(obs, lat, lng);
      enriched.push(enrichedObs);
    } catch (enrichError) {
      console.warn('Warning enriching species image:', enrichError);
      enriched.push({
        ...obs,
        imageUrl:
          obs.imageUrl ||
          MOCK_BIRDS[0]?.imageUrl ||
          'https://images.unsplash.com/photo-1552728089-57168b64ff1c?auto=format&fit=crop&w=800&q=80',
      });
    }
  }

  return enriched;
};
