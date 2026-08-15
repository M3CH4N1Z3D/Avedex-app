import {
  FlatList,
  Text,
  useWindowDimensions,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from 'expo-audio';
import { Image as ExpoImage } from 'expo-image';
import { MOCK_BIRDS } from '../../constants/mockBirds';
import { BirdSpecies, Sighting } from '../../types';
import { useAvedexStore } from '../../hooks/useAvedexStore';
import { getUnifiedBirdData, UnifiedBirdSpecies } from '../../services/birdDataService';
import BirdCard from '../../components/BirdCard';

interface UnlockedCardItem {
  id: string;
  speciesId: string;
  commonName: string;
  scientificName: string;
  userPhotoUri?: string;
  defaultPhotoUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  habitat?: string;
  rarity?: string;
  conservationStatus?: string;
  description?: string;
  sighting?: Sighting;
  allSightings: Sighting[];
  species?: BirdSpecies;
  sightingDate?: string;
}

function AudioPlayer({ audioUrl }: { audioUrl?: string }) {
  const player = useAudioPlayer(audioUrl);

  if (!audioUrl) {
    return (
      <View className="px-3 py-2 bg-gray-100 rounded-full border border-gray-200">
        <Text className="text-gray-400 text-xs font-medium">Sin canto disponible</Text>
      </View>
    );
  }

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <TouchableOpacity
      onPress={togglePlayback}
      className={`px-4 py-2.5 rounded-full flex-row items-center justify-center shadow-xs active:opacity-80 ${
        player.playing ? 'bg-red-500' : 'bg-blue-600'
      }`}
    >
      <Text className="text-white font-bold text-xs">
        {player.playing ? '⏸ Pausar Canto' : '▶ Escuchar Canto'}
      </Text>
    </TouchableOpacity>
  );
}

export default function AvedexScreen() {
  const { width } = useWindowDimensions();
  const { userSightings, unlockedSpeciesIds } = useAvedexStore();
  const router = useRouter();
  const { t } = useTranslation();

  // Number of columns based on screen width: Mobile (2), Tablet (3), Desktop/Web (4 or 5)
  const numColumns = useMemo(() => {
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  }, [width]);

  const [selectedCard, setSelectedCard] = useState<UnlockedCardItem | null>(null);
  const [enrichedData, setEnrichedData] = useState<UnifiedBirdSpecies | null>(null);
  const [isLoadingEnriched, setIsLoadingEnriched] = useState(false);

  // Map unlocked species and userSightings to unified card items
  const unlockedCards = useMemo(() => {
    const itemsMap = new Map<string, UnlockedCardItem>();

    // Process all userSightings
    userSightings.forEach((sighting) => {
      const mockBird = MOCK_BIRDS.find(
        (b) =>
          b.id === sighting.speciesId ||
          b.scientificName === sighting.speciesId ||
          b.scientificName === sighting.scientificName
      );

      const canonicalId = mockBird?.id || sighting.speciesId || sighting.id;

      const commonName =
        sighting.commonName ||
        mockBird?.commonName ||
        (sighting.speciesId && !/^\d+$/.test(sighting.speciesId) && sighting.speciesId !== '9183'
          ? sighting.speciesId
          : 'Ave Observada');

      const scientificName =
        sighting.scientificName || mockBird?.scientificName || 'Nombre científico no especificado';

      const userPhotoUri = sighting.userPhotoUri || sighting.photoUrl;
      const defaultPhotoUrl = sighting.defaultPhotoUrl;
      const imageUrl = mockBird?.imageUrl;

      const matchingSightings = userSightings.filter(
        (s) =>
          s.speciesId === sighting.speciesId ||
          (sighting.scientificName && s.scientificName === sighting.scientificName) ||
          (mockBird && (s.speciesId === mockBird.id || s.speciesId === mockBird.scientificName))
      );

      if (!itemsMap.has(canonicalId)) {
        itemsMap.set(canonicalId, {
          id: canonicalId,
          speciesId: canonicalId,
          commonName,
          scientificName,
          userPhotoUri,
          defaultPhotoUrl,
          imageUrl,
          audioUrl: sighting.audioUrl || mockBird?.audioUrl,
          habitat: sighting.habitat || mockBird?.habitat,
          rarity: sighting.rarity || mockBird?.rarity,
          conservationStatus: sighting.conservationStatus || mockBird?.conservationStatus,
          description: sighting.description || mockBird?.description,
          sighting,
          allSightings: matchingSightings,
          species: mockBird,
          sightingDate: sighting.date || sighting.timestamp,
        });
      } else {
        const existing = itemsMap.get(canonicalId)!;
        if (!existing.userPhotoUri && userPhotoUri) existing.userPhotoUri = userPhotoUri;
        if (!existing.defaultPhotoUrl && defaultPhotoUrl) existing.defaultPhotoUrl = defaultPhotoUrl;
        if (!existing.description && sighting.description) existing.description = sighting.description;
        if (!existing.audioUrl && sighting.audioUrl) existing.audioUrl = sighting.audioUrl;
      }
    });

    // Process unlockedSpeciesIds from store that might be in MOCK_BIRDS without a userSighting yet
    unlockedSpeciesIds.forEach((speciesId) => {
      const mockBird = MOCK_BIRDS.find((b) => b.id === speciesId || b.scientificName === speciesId);
      if (mockBird) {
        const canonicalId = mockBird.id;
        if (!itemsMap.has(canonicalId)) {
          itemsMap.set(canonicalId, {
            id: canonicalId,
            speciesId: canonicalId,
            commonName: mockBird.commonName,
            scientificName: mockBird.scientificName,
            imageUrl: mockBird.imageUrl,
            audioUrl: mockBird.audioUrl,
            habitat: mockBird.habitat,
            rarity: mockBird.rarity,
            conservationStatus: mockBird.conservationStatus,
            description: mockBird.description,
            allSightings: [],
            species: mockBird,
          });
        }
      }
    });

    return Array.from(itemsMap.values());
  }, [unlockedSpeciesIds, userSightings]);

  useEffect(() => {
    async function loadEnrichedData() {
      if (selectedCard && selectedCard.scientificName) {
        setIsLoadingEnriched(true);
        try {
          const data = await getUnifiedBirdData(selectedCard.scientificName);
          setEnrichedData(data);
        } catch (error) {
          console.error('Error fetching enriched data:', error);
        } finally {
          setIsLoadingEnriched(false);
        }
      } else {
        setEnrichedData(null);
      }
    }
    loadEnrichedData();
  }, [selectedCard]);

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const renderBirdCard = ({ item }: { item: UnlockedCardItem }) => {
    return (
      <View className="flex-1 p-2 items-center justify-center">
        <BirdCard
          item={{
            id: item.id,
            commonName: item.commonName,
            scientificName: item.scientificName,
            userPhotoUri: item.userPhotoUri,
            defaultPhotoUrl: item.defaultPhotoUrl,
            imageUrl: item.imageUrl,
            sightingDate: item.sightingDate,
            rarity: item.rarity,
            conservationStatus: item.conservationStatus,
            habitat: item.habitat,
          }}
          onPress={() => setSelectedCard(item)}
        />
      </View>
    );
  };

  // Condition A: Zero sightings / empty state
  if (userSightings.length === 0 && unlockedSpeciesIds.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md items-center">
          <Text className="text-lg font-bold text-gray-800 mb-6 text-center leading-relaxed">
            ¡Bienvenido a Avedex! Aún no tienes aves en tu biblioteca. ¡Empieza tu aventura!
          </Text>

          <TouchableOpacity
            className="bg-blue-600 px-6 py-3.5 rounded-full mb-3 w-full items-center active:opacity-80 shadow-sm"
            onPress={() => router.push('/capture')}
          >
            <Text className="text-white font-bold text-base">Subir una foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 px-6 py-3.5 rounded-full w-full items-center active:opacity-80 shadow-sm"
            onPress={() => router.push('/community')}
          >
            <Text className="text-white font-bold text-base">Armar una excursión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Condition B: User has registered sightings or unlocked species
  const headerPhoto =
    selectedCard?.userPhotoUri ||
    selectedCard?.defaultPhotoUrl ||
    selectedCard?.imageUrl ||
    enrichedData?.imageUrl ||
    'https://via.placeholder.com/600?text=Sin+Imagen';

  const audioUrlToPlay =
    selectedCard?.sighting?.audioUrl || selectedCard?.audioUrl || enrichedData?.audioUrl;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="w-full max-w-7xl mx-auto flex-1 px-2 sm:px-4">
        {/* Header Section */}
        <View className="px-3 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">{t('my_library')}</Text>
          <Text className="text-gray-500">
            Mi colección de especies ({unlockedCards.length})
          </Text>
        </View>

        {/* Responsive Grid List */}
        <FlatList
          key={numColumns}
          data={unlockedCards}
          renderItem={renderBirdCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bird Details Modal */}
      {selectedCard && (
        <Modal
          visible={!!selectedCard}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseModal}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white h-5/6 rounded-t-3xl overflow-hidden max-w-2xl w-full mx-auto">
              <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* User Photo / Top Image Banner */}
                <View className="relative w-full h-72 bg-slate-100 dark:bg-slate-900 overflow-hidden items-center justify-center">
                  <ExpoImage
                    source={{ uri: headerPhoto }}
                    contentFit="contain"
                    contentPosition="center"
                    className="w-full h-full"
                  />
                  {selectedCard.userPhotoUri ? (
                    <View className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 z-10">
                      <Text className="text-white text-xs font-semibold">📸 Tu Fotografía Capturada</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleCloseModal}
                    className="absolute top-4 right-4 bg-black/50 rounded-full w-9 h-9 items-center justify-center z-10"
                  >
                    <Text className="text-white font-bold text-xl leading-5">×</Text>
                  </TouchableOpacity>
                </View>

                <View className="p-6">
                  {/* Title and Audio Player Row */}
                  <View className="flex-row justify-between items-start mb-6">
                    <View className="flex-1 pr-3">
                      <Text className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedCard.commonName}
                      </Text>
                      <Text className="text-base text-gray-500 italic font-serif">
                        {selectedCard.scientificName}
                      </Text>
                    </View>

                    <View className="items-center justify-center">
                      {isLoadingEnriched ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <AudioPlayer audioUrl={audioUrlToPlay} />
                      )}
                    </View>
                  </View>

                  {/* Taxonomy & Details Grid */}
                  <View className="bg-blue-50/80 rounded-2xl p-4 mb-6 flex-row flex-wrap gap-y-4">
                    <View className="w-[50%] pr-2">
                      <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Nombre Común</Text>
                      <Text className="text-gray-800 text-sm font-medium">{selectedCard.commonName}</Text>
                    </View>

                    <View className="w-[50%] pl-2">
                      <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Nombre Científico</Text>
                      <Text className="text-gray-800 text-sm italic font-medium">{selectedCard.scientificName}</Text>
                    </View>

                    <View className="w-[50%] pr-2">
                      <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Hábitat</Text>
                      <Text className="text-gray-800 text-sm">{selectedCard.habitat || enrichedData?.habitat || 'Hábitat no especificado'}</Text>
                    </View>

                    <View className="w-[50%] pl-2">
                      <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Estado de Conservación</Text>
                      <Text className="text-gray-800 text-sm">{selectedCard.conservationStatus || enrichedData?.conservationStatus || 'No evaluado (IUCN)'}</Text>
                    </View>

                    <View className="w-[50%] pr-2">
                      <Text className="text-xs text-blue-600 font-bold uppercase mb-1">Rareza</Text>
                      <Text className="text-gray-800 text-sm">{selectedCard.rarity || 'Común'}</Text>
                    </View>
                  </View>

                  {/* Gemini AI Reasoning / Description */}
                  <View className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                    <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Análisis y Razonamiento (Gemini AI)
                    </Text>
                    <Text className="text-gray-700 text-sm leading-relaxed">
                      {selectedCard.sighting?.description ||
                        selectedCard.description ||
                        selectedCard.sighting?.notes ||
                        'Sin descripción disponible para esta especie.'}
                    </Text>
                  </View>

                  {/* Sighting Log Section */}
                  <View className="mb-6">
                    <Text className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                      Historial de Avistamientos ({selectedCard.allSightings.length})
                    </Text>

                    {selectedCard.allSightings.length > 0 ? (
                      selectedCard.allSightings.map((sighting, idx) => {
                        const dateStr = sighting.date || sighting.timestamp;
                        const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : 'N/A';
                        const coords = sighting.coordinates;
                        const lat =
                          coords && 'lat' in coords
                            ? coords.lat
                            : coords && 'latitude' in coords
                            ? coords.latitude
                            : 0;
                        const lng =
                          coords && 'lng' in coords
                            ? coords.lng
                            : coords && 'longitude' in coords
                            ? coords.longitude
                            : 0;

                        return (
                          <View
                            key={sighting.id || idx}
                            className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100"
                          >
                            <Text className="text-gray-700 text-xs mb-1">
                              <Text className="font-bold">Fecha / Hora: </Text>
                              {formattedDate}
                            </Text>
                            <Text className="text-gray-700 text-xs mb-1">
                              <Text className="font-bold">Coordenadas GPS: </Text>
                              {typeof lat === 'number' ? lat.toFixed(6) : 0},{' '}
                              {typeof lng === 'number' ? lng.toFixed(6) : 0}
                            </Text>
                            {sighting.notes ? (
                              <Text className="text-gray-600 text-xs mt-2 italic bg-white p-2 rounded border border-gray-100">
                                "{sighting.notes}"
                              </Text>
                            ) : null}
                          </View>
                        );
                      })
                    ) : (
                      <View className="bg-gray-50 rounded-xl p-4 border border-gray-200 border-dashed">
                        <Text className="text-center text-gray-500 text-xs font-medium">
                          Especie desbloqueada sin avistamiento de foto registrado.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
