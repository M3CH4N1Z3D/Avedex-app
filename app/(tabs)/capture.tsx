import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAudioPlayer } from 'expo-audio';
import { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Volume2,
  Pause,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Info,
  Check,
  Dog,
  Car,
  Leaf,
  User,
  Search,
  Feather
} from 'lucide-react-native';
import { identifyBirdWithGemini, BirdIdentificationResult, BirdCandidate } from '../../services/geminiService';
import { getRecentSightings } from '../../services/api/ebird';
import { useAvedexStore } from '../../hooks/useAvedexStore';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

type CaptureStep = 1 | 2 | 3;

async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:image')) {
    return uri.split(',')[1];
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function AudioPreview({ audioUrl }: { audioUrl: string }) {
  const player = useAudioPlayer(audioUrl);

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
      className="flex-row items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 mt-2 self-start"
    >
      {player.playing ? (
        <Pause size={16} color="#2563eb" className="mr-2" />
      ) : (
        <Volume2 size={16} color="#2563eb" className="mr-2" />
      )}
      <Text className="text-xs font-semibold text-blue-700">
        {player.playing ? 'Pausar Canto' : 'Escuchar Canto (Xeno-Canto)'}
      </Text>
    </TouchableOpacity>
  );
}

const getNonBirdIcon = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('dog') || cat.includes('perro') || cat.includes('cat') || cat.includes('gatto') || cat.includes('pet') || cat.includes('mascota') || cat.includes('animal')) {
    return <Dog size={40} color="#d97706" />;
  }
  if (cat.includes('car') || cat.includes('auto') || cat.includes('vehic') || cat.includes('coche')) {
    return <Car size={40} color="#d97706" />;
  }
  if (cat.includes('plant') || cat.includes('planta') || cat.includes('flower') || cat.includes('flor') || cat.includes('leaf') || cat.includes('hoja') || cat.includes('tree') || cat.includes('arbol')) {
    return <Leaf size={40} color="#d97706" />;
  }
  if (cat.includes('human') || cat.includes('persona') || cat.includes('selfie') || cat.includes('people') || cat.includes('hombre') || cat.includes('mujer')) {
    return <User size={40} color="#d97706" />;
  }
  return <Search size={40} color="#d97706" />;
};

export default function CaptureScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<CaptureStep>(1);
  const [image, setImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    latitude?: number;
    longitude?: number;
    dateTaken?: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BirdIdentificationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<BirdCandidate | null>(null);
  const [notes, setNotes] = useState('');

  const { addSighting } = useAvedexStore();

  const extractGPS = (exif: any) => {
    if (!exif) return null;

    let latitude = exif.GPSLatitude;
    let longitude = exif.GPSLongitude;
    const latRef = exif.GPSLatitudeRef;
    const lonRef = exif.GPSLongitudeRef;

    if (latitude !== undefined && latRef === 'S') latitude = -latitude;
    if (longitude !== undefined && lonRef === 'W') longitude = -longitude;

    const dateTaken = exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime;

    return {
      latitude: typeof latitude === 'number' ? latitude : undefined,
      longitude: typeof longitude === 'number' ? longitude : undefined,
      dateTaken: typeof dateTaken === 'string' ? dateTaken : undefined,
    };
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: true,
      base64: true,
    });

    handleImageResult(result);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'Se requieren permisos de cámara para continuar.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: true,
      base64: true,
    });

    handleImageResult(result);
  };

  const processAndIdentify = async (assetUri: string, extractedGps: { latitude?: number; longitude?: number } | null) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        assetUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setImage(manipResult.uri);

      let base64Image = manipResult.base64;
      if (!base64Image) {
        base64Image = await uriToBase64(manipResult.uri);
      }

      const gpsCoords = extractedGps?.latitude !== undefined && extractedGps?.longitude !== undefined
        ? { lat: extractedGps.latitude, lng: extractedGps.longitude }
        : undefined;

      let candidateContext: string[] = [];
      if (gpsCoords) {
        try {
          const sightings = await getRecentSightings(gpsCoords.lat, gpsCoords.lng);
          candidateContext = sightings.slice(0, 15).map((s) => s.comName);
        } catch (e) {
          console.warn('Error fetching nearby eBird context', e);
        }
      }

      const result = await identifyBirdWithGemini(base64Image, gpsCoords, candidateContext);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Error in bird identification flow:', err);
      setAnalysisError(err?.message || 'Error al identificar el ave con Gemini Vision AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const extracted = extractGPS(asset.exif);
      setMetadata(extracted || {});

      setStep(2);
      await processAndIdentify(asset.uri, extracted);
    }
  };

  const handleRetry = async () => {
    if (!image) return;
    const extractedGps = metadata ? { latitude: metadata.latitude, longitude: metadata.longitude } : null;
    await processAndIdentify(image, extractedGps);
  };

  const handleSelectCandidate = (candidate: BirdCandidate) => {
    setSelectedCandidate(candidate);
    setStep(3);
  };

  const confirmAndSave = () => {
    if (!selectedCandidate) return;

    const apiSpeciesData = selectedCandidate.enrichedData;
    const xenoCantoAudioUrl = apiSpeciesData?.audioUrl;
    const capturedImageUri = image || '';
    const userCoords = (metadata?.latitude !== undefined && metadata?.longitude !== undefined)
      ? { lat: metadata.latitude, lng: metadata.longitude }
      : { lat: 0, lng: 0 };

    const sightingPayload = {
      id: Date.now().toString(),
      speciesId: selectedCandidate.scientificName,
      commonName: selectedCandidate.commonName,
      scientificName: selectedCandidate.scientificName,
      userPhotoUri: capturedImageUri,
      defaultPhotoUrl: apiSpeciesData?.defaultPhotoUrl || apiSpeciesData?.imageUrl || selectedCandidate.photoUrl,
      audioUrl: xenoCantoAudioUrl,
      description: selectedCandidate.reasoning || notes,
      habitat: apiSpeciesData?.habitat || 'Observado en campo',
      rarity: selectedCandidate.rarity || 'Común',
      conservationStatus: apiSpeciesData?.conservationStatus || selectedCandidate.conservationStatus || 'Preocupación menor (LC)',
      timestamp: new Date().toISOString(),
      coordinates: userCoords || { lat: 0, lng: 0 },
      // Backward compatibility properties
      photoUrl: capturedImageUri,
      date: metadata?.dateTaken || new Date().toISOString(),
      notes,
    };

    addSighting(sightingPayload);

    Alert.alert('¡Éxito!', '¡Observación registrada en Avedex!');
    resetState();
    router.push('/(tabs)');
  };

  const resetState = () => {
    setStep(1);
    setImage(null);
    setMetadata(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSelectedCandidate(null);
    setNotes('');
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-800', bar: 'bg-emerald-500' };
    if (confidence >= 50) return { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500' };
    return { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-500' };
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-gray-50 p-4">
      {step === 1 && (
        <View className="flex-1 justify-center items-center py-8">
          <View className="bg-emerald-100 p-4 rounded-full mb-4">
            <Camera size={40} color="#059669" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
            {t('capture_analyze') || 'Registrar e Identificar Ave'}
          </Text>
          <Text className="text-gray-500 text-center px-6 mb-8">
            Capture una fotografía o seleccione una de su galería para analizarla con Gemini Vision AI.
          </Text>

          <View className="w-full max-w-md flex-row justify-center space-x-4 mb-8 gap-4 px-2">
            <TouchableOpacity
              className="bg-emerald-600 py-4 px-6 rounded-2xl flex-1 items-center justify-center shadow-md flex-row"
              onPress={takePhoto}
            >
              <Camera size={22} color="#ffffff" className="mr-2" />
              <Text className="text-white text-base font-bold ml-2">
                {t('take_photo') || 'Tomar Foto'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-600 py-4 px-6 rounded-2xl flex-1 items-center justify-center shadow-md flex-row"
              onPress={pickImage}
            >
              <ImageIcon size={22} color="#ffffff" className="mr-2" />
              <Text className="text-white text-base font-bold ml-2">
                {t('pick_image') || 'Galería'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="items-center justify-center py-16 px-6 bg-white rounded-2xl w-full max-w-md border border-dashed border-gray-300 shadow-sm">
            <Sparkles size={36} color="#9ca3af" className="mb-3" />
            <Text className="text-gray-600 font-semibold text-center text-base mb-1">
              {t('no_image_selected') || 'Sin imagen seleccionada'}
            </Text>
            <Text className="text-gray-400 text-center text-sm">
              {t('take_photo_desc') || 'La IA identificará las especies más probables y la información de la zona.'}
            </Text>
          </View>
        </View>
      )}

      {step === 2 && image && (
        <View className="flex-1 w-full lg:flex-row lg:items-start lg:gap-6">
          {/* Main Photo Column */}
          <View className="w-full lg:w-1/2 mb-6">
            <View className="relative bg-black rounded-2xl overflow-hidden shadow-md">
              <Image source={{ uri: image }} className="w-full h-80 rounded-2xl" resizeMode="cover" />
              {metadata?.latitude !== undefined && metadata?.longitude !== undefined && (
                <View className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-full flex-row items-center">
                  <MapPin size={14} color="#ffffff" className="mr-1" />
                  <Text className="text-white text-xs font-medium ml-1">
                    {metadata.latitude.toFixed(4)}, {metadata.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              className="mt-4 p-3.5 bg-gray-200 rounded-xl items-center flex-row justify-center"
              onPress={resetState}
            >
              <ArrowLeft size={18} color="#374151" className="mr-2" />
              <Text className="text-gray-700 font-semibold ml-2">Seleccionar otra imagen</Text>
            </TouchableOpacity>
          </View>

          {/* Identification Results Column */}
          <View className="w-full lg:w-1/2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <Sparkles size={22} color="#2563eb" className="mr-2" />
              <Text className="text-xl font-bold text-gray-800 ml-2">
                {t('identification_results') || 'Análisis de Gemini Vision'}
              </Text>
            </View>

            {/* Loading State */}
            {isAnalyzing && (
              <View className="py-12 items-center justify-center bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                <ActivityIndicator size="large" color="#2563eb" className="mb-4" />
                <Text className="text-gray-800 font-bold text-base mb-1">Analizando imagen y características...</Text>
                <Text className="text-gray-500 text-xs text-center">
                  Consultando plumaje, marcas visuales y contexto ornitológico.
                </Text>
              </View>
            )}

            {/* Error State */}
            {!isAnalyzing && analysisError && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <View className="flex-row items-start">
                  <AlertCircle size={24} color="#dc2626" className="mr-2 mt-0.5" />
                  <View className="flex-1 ml-2">
                    <Text className="font-bold text-red-800 text-base mb-1">Error de Identificación</Text>
                    <Text className="text-red-700 text-xs leading-relaxed mb-3">{analysisError}</Text>
                    <TouchableOpacity
                      className="bg-red-600 px-4 py-2 rounded-lg flex-row items-center self-start"
                      onPress={handleRetry}
                    >
                      <RefreshCw size={14} color="#ffffff" className="mr-1.5" />
                      <Text className="text-white text-xs font-bold ml-1">Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Non-Bird Friendly Empty State Card */}
            {!isAnalyzing && !analysisError && analysisResult && analysisResult.isBird === false && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-6 items-center justify-center shadow-xs">
                <View className="bg-amber-100 p-4 rounded-full mb-4 items-center justify-center">
                  {getNonBirdIcon(analysisResult.nonBirdCategory)}
                </View>
                <Text className="text-lg font-bold text-amber-950 mb-2 text-center">
                  ¡Sin ave detectada!
                </Text>
                <Text className="text-amber-900 text-sm text-center leading-relaxed mb-6 px-2">
                  {analysisResult.friendlyMessage || '¡Parece que esta foto no contiene un ave! Nuestro Avedex solo registra animales con plumas.'}
                </Text>
                <TouchableOpacity
                  className="bg-emerald-600 py-3.5 px-6 rounded-xl flex-row items-center justify-center shadow-sm w-full"
                  onPress={resetState}
                >
                  <RefreshCw size={18} color="#ffffff" className="mr-2" />
                  <Text className="text-white text-base font-bold ml-1">
                    Intentar con otra foto
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Candidates List */}
            {!isAnalyzing && !analysisError && analysisResult && analysisResult.isBird !== false && (analysisResult.candidates || []).length > 0 && (
              <View className="gap-4">
                <Text className="text-xs text-gray-500 font-medium">
                  Se detectaron las siguientes 3 especies candidatas principales:
                </Text>

                {analysisResult.candidates.map((c, index) => {
                  const badgeColors = getConfidenceBadgeColor(c.confidence);
                  const displayPhoto = c.enrichedData?.imageUrl || 'https://via.placeholder.com/150?text=Sin+Imagen';

                  return (
                    <View
                      key={c.scientificName + index}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-xs"
                    >
                      {/* Top Header Row */}
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-row items-center flex-1 pr-2">
                          <Image
                            source={{ uri: displayPhoto }}
                            className="w-14 h-14 rounded-xl mr-3 bg-gray-200 border border-gray-300"
                          />
                          <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-base">{c.commonName}</Text>
                            <Text className="text-gray-500 text-xs italic font-serif">{c.scientificName}</Text>
                          </View>
                        </View>

                        <View className={`px-2.5 py-1 rounded-full ${badgeColors.bg} border border-emerald-200/50`}>
                          <Text className={`font-extrabold text-xs ${badgeColors.text}`}>
                            {c.confidence}%
                          </Text>
                        </View>
                      </View>

                      {/* Confidence Progress Bar */}
                      <View className="w-full bg-gray-200 rounded-full h-2 my-2 overflow-hidden">
                        <View
                          className={`h-2 rounded-full ${badgeColors.bar}`}
                          style={{ width: `${Math.min(100, Math.max(0, c.confidence))}%` }}
                        />
                      </View>

                      {/* Reasoning Box */}
                      {c.reasoning ? (
                        <View className="bg-white p-2.5 rounded-xl border border-gray-200/80 my-2">
                          <View className="flex-row items-center mb-1">
                            <Info size={13} color="#4b5563" className="mr-1" />
                            <Text className="text-xs font-semibold text-gray-700 ml-1">Marcas Visuales Detectadas:</Text>
                          </View>
                          <Text className="text-gray-600 text-xs leading-relaxed">{c.reasoning}</Text>
                        </View>
                      ) : null}

                      {/* Audio Preview if Enriched Audio Available */}
                      {c.enrichedData?.audioUrl ? (
                        <AudioPreview audioUrl={c.enrichedData.audioUrl} />
                      ) : null}

                      {/* Action Button */}
                      <TouchableOpacity
                        className="mt-3 bg-emerald-600 py-2.5 px-4 rounded-xl flex-row items-center justify-center shadow-xs"
                        onPress={() => handleSelectCandidate(c)}
                      >
                        <Check size={16} color="#ffffff" className="mr-1" />
                        <Text className="text-white text-xs font-bold ml-1">Seleccionar esta especie</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {!isAnalyzing && !analysisError && analysisResult && analysisResult.isBird !== false && (analysisResult.candidates || []).length === 0 && (
              <View className="py-8 items-center">
                <Text className="text-gray-500 text-sm">No se generaron resultados de candidatos.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {step === 3 && image && selectedCandidate && (
        <View className="flex-1 w-full lg:flex-row lg:items-start lg:gap-6">
          <View className="w-full lg:w-1/2 mb-6">
            <Image source={{ uri: image }} className="w-full h-72 rounded-2xl bg-gray-200 mb-4" resizeMode="cover" />
            <TouchableOpacity
              className="p-3 bg-gray-200 rounded-xl items-center flex-row justify-center"
              onPress={() => setStep(2)}
            >
              <ArrowLeft size={18} color="#374151" className="mr-2" />
              <Text className="text-gray-700 font-semibold ml-1">Volver a los candidatos</Text>
            </TouchableOpacity>
          </View>

          <View className="w-full lg:w-1/2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <Text className="text-2xl font-bold text-gray-800 mb-4">Confirmar Observación</Text>

            <View className="flex-row items-center p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-6">
              <Image
                source={{
                  uri: selectedCandidate.enrichedData?.imageUrl || 'https://via.placeholder.com/150?text=Sin+Imagen',
                }}
                className="w-16 h-16 rounded-xl mr-4 bg-gray-200"
              />
              <View className="flex-1">
                <Text className="font-bold text-emerald-950 text-lg">{selectedCandidate.commonName}</Text>
                <Text className="text-emerald-800 text-sm italic font-serif">{selectedCandidate.scientificName}</Text>
                <View className="flex-row items-center mt-1">
                  <CheckCircle2 size={14} color="#059669" className="mr-1" />
                  <Text className="text-xs text-emerald-700 font-semibold ml-1">
                    Confianza AI: {selectedCandidate.confidence}%
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 gap-2">
              <Text className="text-gray-800 font-bold text-sm mb-1">Metadatos Registrados:</Text>
              <View className="flex-row items-center">
                <MapPin size={16} color="#6b7280" className="mr-2" />
                {metadata?.latitude !== undefined && metadata?.longitude !== undefined ? (
                  <Text className="text-gray-700 text-xs ml-1">
                    Ubicación: {metadata.latitude.toFixed(6)}, {metadata.longitude.toFixed(6)}
                  </Text>
                ) : (
                  <Text className="text-amber-700 text-xs ml-1">Ubicación: No detectada en EXIF</Text>
                )}
              </View>

              <View className="flex-row items-center">
                <Calendar size={16} color="#6b7280" className="mr-2" />
                <Text className="text-gray-700 text-xs ml-1">
                  Fecha: {metadata?.dateTaken || new Date().toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Notas / Comentarios de Observación:</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl p-3 h-24 text-gray-800 text-sm"
                placeholder="Escriba notas sobre el hábitat, comportamiento o parvada..."
                multiline
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              className="bg-emerald-600 py-4 px-6 rounded-xl items-center justify-center shadow-md flex-row"
              onPress={confirmAndSave}
            >
              <CheckCircle2 size={20} color="#ffffff" className="mr-2" />
              <Text className="text-white text-base font-bold ml-2">Confirmar y Guardar en Avedex</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
