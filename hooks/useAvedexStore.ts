import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sighting, Excursion } from '../types';
import { MOCK_BIRDS } from '../constants/mockBirds';
import { supabase } from '../lib/supabase';

interface AvedexState {
  unlockedSpeciesIds: string[];
  userSightings: Sighting[];
  joinedExcursionIds: string[];
  userExcursions: Excursion[];
  excursions: Excursion[];
  alertsEnabled: boolean;
  language: string;
  fetchUserSightings: (userId: string) => Promise<void>;
  resetSightings: () => void;
  addSighting: (sighting: Sighting) => Promise<void>;
  clearAllSightings: () => void;
  getSightingBySpeciesId: (speciesId: string) => Sighting[];
  getCompletionPercentage: () => number;
  toggleJoinExcursion: (id: string) => void;
  addExcursion: (excursion: Excursion) => void;
  createExcursion: (excursionData: Omit<Excursion, 'id'>) => void;
  joinExcursion: (id: string) => void;
  cancelExcursion: (id: string) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
}

export const useAvedexStore = create<AvedexState>()(
  persist(
    (set, get) => ({
      unlockedSpeciesIds: [],
      userSightings: [],
      joinedExcursionIds: [],
      userExcursions: [],
      excursions: [],
      alertsEnabled: false,
      language: 'es',
      fetchUserSightings: async (userId: string) => {
        if (!userId) return;
        try {
          const { data, error } = await supabase
            .from('user_sightings')
            .select('*')
            .eq('user_id', userId);

          if (error) {
            console.warn('Error fetching user sightings from Supabase:', error.message);
            return;
          }

          if (data) {
            const fetchedSightings: Sighting[] = data.map((row: any) => ({
              id: row.id,
              speciesId: row.species_id || row.speciesId || '',
              commonName: row.common_name || row.commonName,
              scientificName: row.scientific_name || row.scientificName,
              userPhotoUri: row.user_photo_uri || row.userPhotoUri,
              defaultPhotoUrl: row.default_photo_url || row.defaultPhotoUrl,
              audioUrl: row.audio_url || row.audioUrl,
              description: row.description,
              habitat: row.habitat,
              rarity: row.rarity,
              conservationStatus: row.conservation_status || row.conservationStatus,
              timestamp: row.timestamp,
              coordinates: typeof row.coordinates === 'string' ? JSON.parse(row.coordinates) : row.coordinates,
              userId: row.user_id || row.userId,
              date: row.date,
              photoUrl: row.photo_url || row.photoUrl,
              notes: row.notes,
            }));

            const unlockedSpeciesIds = Array.from(
              new Set(fetchedSightings.map((s) => s.speciesId).filter(Boolean))
            );

            set({
              userSightings: fetchedSightings,
              unlockedSpeciesIds,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch user sightings:', err);
        }
      },
      resetSightings: () => {
        set({ userSightings: [], unlockedSpeciesIds: [] });
      },
      addSighting: async (sighting: Sighting) => {
        set((state) => {
          const isNewSpecies = !state.unlockedSpeciesIds.includes(sighting.speciesId);
          return {
            userSightings: [...state.userSightings, sighting],
            unlockedSpeciesIds: isNewSpecies
              ? [...state.unlockedSpeciesIds, sighting.speciesId]
              : state.unlockedSpeciesIds,
          };
        });

        try {
          let targetUserId = sighting.userId;
          if (!targetUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            targetUserId = session?.user?.id;
          }

          if (targetUserId) {
            const payload = {
              id: sighting.id,
              user_id: targetUserId,
              species_id: sighting.speciesId,
              common_name: sighting.commonName,
              scientific_name: sighting.scientificName,
              user_photo_uri: sighting.userPhotoUri,
              default_photo_url: sighting.defaultPhotoUrl,
              audio_url: sighting.audioUrl,
              description: sighting.description,
              habitat: sighting.habitat,
              rarity: sighting.rarity,
              conservation_status: sighting.conservationStatus,
              timestamp: sighting.timestamp || new Date().toISOString(),
              coordinates: sighting.coordinates,
              date: sighting.date,
              photo_url: sighting.photoUrl,
              notes: sighting.notes,
            };

            const { error } = await supabase
              .from('user_sightings')
              .insert([payload]);

            if (error) {
              console.warn('Error syncing sighting to Supabase:', error.message);
            }
          }
        } catch (err) {
          console.warn('Failed to insert sighting into Supabase:', err);
        }
      },
      clearAllSightings: () => {
        set({ userSightings: [], unlockedSpeciesIds: [] });
        AsyncStorage.removeItem('avedex-storage').catch(() => {});
        if (useAvedexStore?.persist?.clearStorage) {
          useAvedexStore.persist.clearStorage();
        }
      },
      getSightingBySpeciesId: (speciesId: string) => {
        return get().userSightings.filter((s) => s.speciesId === speciesId);
      },
      getCompletionPercentage: () => {
        const totalBirds = MOCK_BIRDS.length;
        if (totalBirds === 0) return 0;
        const unlockedCount = get().unlockedSpeciesIds.length;
        return Math.round((unlockedCount / totalBirds) * 100);
      },
      toggleJoinExcursion: (id: string) => {
        set((state) => {
          const isJoined = state.joinedExcursionIds.includes(id);
          const nextJoinedIds = isJoined
            ? state.joinedExcursionIds.filter((eId) => eId !== id)
            : [...state.joinedExcursionIds, id];
          const updatedExcursions = state.excursions.map((exc) => {
            if (exc.id === id) {
              const newJoined = !isJoined;
              const curCount = exc.participantsCount ?? 0;
              return {
                ...exc,
                isJoined: newJoined,
                participantsCount: newJoined ? curCount + 1 : Math.max(0, curCount - 1),
              };
            }
            return exc;
          });
          return {
            joinedExcursionIds: nextJoinedIds,
            excursions: updatedExcursions,
          };
        });
      },
      addExcursion: (excursion: Excursion) => {
        set((state) => ({
          userExcursions: [...state.userExcursions, excursion],
          excursions: [excursion, ...state.excursions],
        }));
      },
      createExcursion: (excursionData: Omit<Excursion, 'id'>) => {
        const newExcursion: Excursion = {
          ...excursionData,
          id: `exc-${Date.now()}`,
          isJoined: true,
          participantsCount: (excursionData.participantsCount ?? 0) + 1,
        };
        set((state) => ({
          excursions: [newExcursion, ...state.excursions],
          userExcursions: [newExcursion, ...state.userExcursions],
          joinedExcursionIds: [...state.joinedExcursionIds, newExcursion.id],
        }));
      },
      joinExcursion: (id: string) => {
        set((state) => {
          const joinedExcursionIds = state.joinedExcursionIds.includes(id)
            ? state.joinedExcursionIds
            : [...state.joinedExcursionIds, id];
          const excursions = state.excursions.map((exc) => {
            if (exc.id === id) {
              return {
                ...exc,
                isJoined: true,
                participantsCount: exc.isJoined ? exc.participantsCount : (exc.participantsCount ?? 0) + 1,
              };
            }
            return exc;
          });
          return { joinedExcursionIds, excursions };
        });
      },
      cancelExcursion: (id: string) => {
        set((state) => {
          const joinedExcursionIds = state.joinedExcursionIds.filter((eId) => eId !== id);
          const excursions = state.excursions.map((exc) => {
            if (exc.id === id) {
              return {
                ...exc,
                isJoined: false,
                participantsCount: exc.isJoined
                  ? Math.max(0, (exc.participantsCount ?? 1) - 1)
                  : exc.participantsCount,
              };
            }
            return exc;
          });
          return { joinedExcursionIds, excursions };
        });
      },
      setAlertsEnabled: (enabled: boolean) => {
        set({ alertsEnabled: enabled });
      },
      setLanguage: (lang: string) => {
        set({ language: lang });
      }
    }),
    {
      name: 'avedex-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
