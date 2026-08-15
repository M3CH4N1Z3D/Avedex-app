export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | string;

export interface BirdSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  rarity: Rarity;
  habitat: string;
  altitudeRange?: string;
  imageUrl?: string;
  defaultPhotoUrl?: string;
  audioUrl?: string;
  audioPlaceholder?: string;
  description?: string;
  conservationStatus?: string;
}

export interface Coordinates {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

export interface Sighting {
  id: string;
  speciesId: string;
  commonName?: string;
  scientificName?: string;
  userPhotoUri?: string;
  defaultPhotoUrl?: string;
  audioUrl?: string;
  description?: string;
  habitat?: string;
  rarity?: Rarity;
  conservationStatus?: string;
  timestamp?: string;
  coordinates?: { lat: number; lng: number } | Coordinates;
  userId?: string;
  date?: string;
  photoUrl?: string;
  notes?: string;
}

export interface Excursion {
  id: string;
  title?: string;
  destination?: string;
  name?: string;
  location?: string;
  coordinates?: Coordinates;
  date: string;
  time?: string;
  maxParticipants: number;
  participantsCount?: number;
  notes?: string;
  isJoined?: boolean;
  targetSpecies?: string[];
  createdBy?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  joinedDate: string;
  stats: {
    totalSightings: number;
    uniqueSpecies: number;
    excursionsJoined: number;
  };
}
