import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sighting, Excursion } from '../types';
import { MOCK_BIRDS } from '../constants/mockBirds';

interface AvedexState {
  unlockedSpeciesIds: string[];
  userSightings: Sighting[];
  joinedExcursionIds: string[];
  userExcursions: Excursion[];
  excursions: Excursion[];
  alertsEnabled: boolean;
  language: string;
  addSighting: (sighting: Sighting) => void;
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
      addSighting: (sighting: Sighting) => {
        set((state) => {
          const isNewSpecies = !state.unlockedSpeciesIds.includes(sighting.speciesId);
          return {
            userSightings: [...state.userSightings, sighting],
            unlockedSpeciesIds: isNewSpecies 
              ? [...state.unlockedSpeciesIds, sighting.speciesId]
              : state.unlockedSpeciesIds,
          };
        });
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
