import { searchSpecies } from './api/inaturalist';
import { getBirdAudio } from './api/xenocanto';
import { getRecentSightings } from './api/ebird';
import { getCachedData, setCachedData } from './cacheService';
import { MOCK_BIRDS } from '../constants/mockBirds';
import { BirdSpecies } from '../types';

export interface UnifiedBirdSpecies {
  id: string;
  name: string;
  scientificName: string;
  imageUrl?: string;
  defaultPhotoUrl?: string;
  audioUrl?: string;
  recentSightings?: number;
  habitat?: string;
  conservationStatus?: string;
}

export const getUnifiedBirdData = async (
  scientificNameOrQuery: string,
  userCoords?: { lat: number; lng: number }
): Promise<UnifiedBirdSpecies | null> => {
  const cacheKey = `bird_data_${scientificNameOrQuery.toLowerCase()}`;
  const cached = await getCachedData<UnifiedBirdSpecies>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const [iNatResult, audioResult, eBirdResult] = await Promise.allSettled([
      searchSpecies(scientificNameOrQuery, userCoords?.lat, userCoords?.lng),
      getBirdAudio(scientificNameOrQuery),
      userCoords ? getRecentSightings(userCoords.lat, userCoords.lng) : Promise.resolve([])
    ]);

    if (iNatResult.status === 'rejected') {
      console.error('iNaturalist API call failed:', iNatResult.reason);
    }
    if (audioResult.status === 'rejected') {
      console.error('Xeno-Canto API call failed:', audioResult.reason);
    }
    if (eBirdResult.status === 'rejected') {
      console.error('eBird API call failed:', eBirdResult.reason);
    }

    const iNatData = iNatResult.status === 'fulfilled' ? iNatResult.value[0] : null;
    const audioUrl = audioResult.status === 'fulfilled' ? audioResult.value : null;
    const sightings = eBirdResult.status === 'fulfilled' ? eBirdResult.value : [];
    
    // Find matching mock bird just in case API fails
    const fallbackBird = MOCK_BIRDS.find(
      (b: BirdSpecies) => b.commonName.toLowerCase().includes(scientificNameOrQuery.toLowerCase()) ||
           b.scientificName.toLowerCase().includes(scientificNameOrQuery.toLowerCase())
    );

    if (!iNatData && !fallbackBird) {
      return null;
    }

    const unifiedData: UnifiedBirdSpecies = {
      id: iNatData ? iNatData.id.toString() : fallbackBird!.id,
      name: iNatData ? iNatData.preferred_common_name : fallbackBird!.commonName,
      scientificName: iNatData ? iNatData.name : fallbackBird!.scientificName,
      imageUrl: iNatData?.default_photo?.medium_url || fallbackBird?.imageUrl,
      audioUrl: audioUrl || undefined,
      recentSightings: sightings.filter(s => s.sciName.toLowerCase() === scientificNameOrQuery.toLowerCase() || s.comName.toLowerCase() === scientificNameOrQuery.toLowerCase()).length
    };

    await setCachedData(cacheKey, unifiedData);
    return unifiedData;

  } catch (error) {
    console.error('Error fetching unified bird data:', error);
    
    // Fallback to mock data
    const fallbackBird = MOCK_BIRDS.find(
      (b: BirdSpecies) => b.commonName.toLowerCase().includes(scientificNameOrQuery.toLowerCase()) ||
           b.scientificName.toLowerCase().includes(scientificNameOrQuery.toLowerCase())
    );
    
    if (fallbackBird) {
      return {
        id: fallbackBird.id,
        name: fallbackBird.commonName,
        scientificName: fallbackBird.scientificName,
        imageUrl: fallbackBird.imageUrl,
        recentSightings: 0
      };
    }
    
    return null;
  }
};