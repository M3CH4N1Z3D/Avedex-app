import { Excursion, Sighting, UserProfile } from '../types';
import { MOCK_BIRDS } from './mockBirds';

export const MOCK_USER: UserProfile = {
  id: 'user-1',
  username: 'birder_mauricio',
  joinedDate: '2025-01-15T00:00:00Z',
  stats: {
    totalSightings: 42,
    uniqueSpecies: 28,
    excursionsJoined: 3
  }
};

export const MOCK_SIGHTINGS: Sighting[] = [
  {
    id: 'sighting-1',
    speciesId: MOCK_BIRDS[0].id, // Tangara Multicolor
    userId: MOCK_USER.id,
    date: '2026-07-20T08:30:00Z',
    coordinates: {
      latitude: 4.6097, // Example near Bogota
      longitude: -74.0817
    },
    photoUrl: 'https://images.unsplash.com/photo-1552728089-57168b64ff1c?auto=format&fit=crop&w=400&q=80',
    notes: 'Beautiful male seen early morning near the trail.'
  },
  {
    id: 'sighting-2',
    speciesId: MOCK_BIRDS[4].id, // Cock-of-the-rock
    userId: MOCK_USER.id,
    date: '2026-07-15T06:15:00Z',
    coordinates: {
      latitude: 5.5,
      longitude: -75.5
    },
    photoUrl: 'https://images.unsplash.com/photo-1605335133644-b04040a4005b?auto=format&fit=crop&w=400&q=80',
    notes: 'Observed at a lek.'
  }
];

export const MOCK_EXCURSIONS: Excursion[] = [
  {
    id: 'excursion-1',
    name: 'Andean Cloud Forest Expedition',
    location: 'Chicaque Natural Park',
    coordinates: {
      latitude: 4.5681,
      longitude: -74.3013
    },
    date: '2026-08-15T05:00:00Z',
    maxParticipants: 10,
    targetSpecies: [MOCK_BIRDS[0].id, MOCK_BIRDS[7].id], // Tangara and Cauca Guan
    createdBy: 'admin_guide'
  },
  {
    id: 'excursion-2',
    name: 'Paramo Condor Watch',
    location: 'Chingaza National Park',
    coordinates: {
      latitude: 4.6191,
      longitude: -73.7441
    },
    date: '2026-09-01T04:30:00Z',
    maxParticipants: 6,
    targetSpecies: [MOCK_BIRDS[1].id, MOCK_BIRDS[2].id], // Condor and Sword-billed Hummer
    createdBy: 'paramo_expert'
  }
];
