import { API_CONFIG } from '../../config/api';
import { MOCK_BIRDS } from '../../constants/mockBirds';

export interface iNatTaxon {
  id: number;
  name: string;
  preferred_common_name: string;
  default_photo?: {
    medium_url: string;
  };
}

// In-memory species image URL cache
const speciesImageCache = new Map<string, string>();

// Pre-seed cache with mock birds
MOCK_BIRDS.forEach((bird) => {
  if (bird.scientificName && bird.imageUrl) {
    speciesImageCache.set(bird.scientificName.trim().toLowerCase(), bird.imageUrl);
  }
  if (bird.commonName && bird.imageUrl) {
    speciesImageCache.set(bird.commonName.trim().toLowerCase(), bird.imageUrl);
  }
});

export const getCachedSpeciesImage = (key: string): string | undefined => {
  if (!key) return undefined;
  return speciesImageCache.get(key.trim().toLowerCase());
};

export const cacheSpeciesImage = (key: string, url: string): void => {
  if (!key || !url) return;
  speciesImageCache.set(key.trim().toLowerCase(), url);
};

export const searchSpecies = async (query: string, lat?: number, lng?: number): Promise<iNatTaxon[]> => {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return [];

  // Check cache before firing network request to iNaturalist
  const cachedUrl = getCachedSpeciesImage(normalizedQuery);
  if (cachedUrl) {
    return [
      {
        id: 0,
        name: query,
        preferred_common_name: query,
        default_photo: {
          medium_url: cachedUrl,
        },
      },
    ];
  }

  try {
    let url = `${API_CONFIG.INATURALIST_BASE_URL}/taxa?q=${encodeURIComponent(query)}&iconic_taxa=Aves&per_page=5`;
    if (lat && lng) {
      url += `&lat=${lat}&lng=${lng}&radius=50`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`iNaturalist API error: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    const results: iNatTaxon[] = data.results || [];

    const photoUrl = results[0]?.default_photo?.medium_url;
    if (photoUrl) {
      cacheSpeciesImage(normalizedQuery, photoUrl);
      if (results[0].name) {
        cacheSpeciesImage(results[0].name, photoUrl);
      }
      if (results[0].preferred_common_name) {
        cacheSpeciesImage(results[0].preferred_common_name, photoUrl);
      }
    }

    return results;
  } catch (error) {
    console.warn('Warning fetching from iNaturalist:', error);
    return [];
  }
};
