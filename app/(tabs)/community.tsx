import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  ChevronRight,
  MapPin,
  Users,
  Plus,
  X,
  FileText,
} from 'lucide-react-native';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAvedexStore } from '../../hooks/useAvedexStore';
import { getRecentNotableObservations, EbirdObservation } from '../../services/ebirdService';
import { getCurrentUserLocation } from '../../utils/navigation';
import { useTranslation } from 'react-i18next';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { excursions, createExcursion, joinExcursion, cancelExcursion } = useAvedexStore();

  // Notable Observations / Alerts state
  const [notableObs, setNotableObs] = useState<EbirdObservation[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);

  // Modal form state
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('07:00 AM');
  const [maxParticipants, setMaxParticipants] = useState<string>('10');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function fetchAlerts() {
      setLoadingAlerts(true);
      try {
        const userLoc = await getCurrentUserLocation();
        const obs = await getRecentNotableObservations(userLoc.lat, userLoc.lng, 25);
        if (isMounted) {
          setNotableObs(obs);
        }
      } catch (err) {
        console.error('Error fetching notable observations:', err);
        if (isMounted) setNotableObs([]);
      } finally {
        if (isMounted) setLoadingAlerts(false);
      }
    }

    fetchAlerts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = () => {
    if (!title.trim() || !destination.trim()) return;

    const parsedMax = parseInt(maxParticipants, 10) || 10;

    createExcursion({
      title: title.trim(),
      destination: destination.trim(),
      name: title.trim(),
      location: destination.trim(),
      date: date || new Date().toISOString().split('T')[0],
      time: time || '07:00 AM',
      maxParticipants: parsedMax,
      participantsCount: 1,
      notes: notes.trim() || 'Sin notas adicionales',
      isJoined: true,
      createdBy: 'currentUser',
    });

    setIsFormVisible(false);
    setTitle('');
    setDestination('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('07:00 AM');
    setMaxParticipants('10');
    setNotes('');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {/* Header */}
      <View className="pt-8 mb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-bold text-gray-800">{t('community') || 'Comunidad'}</Text>
          <Text className="text-gray-500 mt-1">
            {t('connect_birdwatchers') || 'Conéctate con otros observadores de aves'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsFormVisible(true)}
          className="bg-green-600 p-2.5 rounded-full shadow-md"
        >
          <Plus color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Migratory / Notable Sighting Alerts Banner */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-sm">
        <View className="flex-row items-center mb-3">
          <View className="bg-amber-100 p-2 rounded-full mr-3">
            <AlertTriangle color="#d97706" size={22} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-amber-900">
              Alerta Migratoria / Avistamiento Notable
            </Text>
          </View>
        </View>

        {loadingAlerts ? (
          <View className="py-4 items-center flex-row justify-center">
            <ActivityIndicator size="small" color="#d97706" />
            <Text className="text-amber-800 text-sm ml-2 font-medium">
              Consultando avisos en tu ubicación...
            </Text>
          </View>
        ) : notableObs.length > 0 ? (
          <View className="space-y-2.5">
            {notableObs.slice(0, 5).map((obs, index) => (
              <View
                key={`${obs.speciesCode}-${index}`}
                className="bg-white rounded-xl p-3 border border-amber-100 shadow-xs"
              >
                <Text className="font-bold text-gray-900 text-base">
                  {obs.comName}{' '}
                  {obs.sciName ? (
                    <Text className="font-normal italic text-xs text-gray-500">
                      ({obs.sciName})
                    </Text>
                  ) : null}
                </Text>
                <View className="flex-row items-center mt-1">
                  <MapPin size={14} color="#78350f" />
                  <Text className="text-amber-900 text-xs ml-1 font-medium">{obs.locName}</Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Clock size={14} color="#78350f" />
                  <Text className="text-amber-800 text-xs ml-1">{obs.obsDt}</Text>
                  {obs.howMany ? (
                    <Text className="text-amber-800 text-xs ml-2 font-bold">
                      • Cantidad: {obs.howMany}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-amber-800 text-sm italic mt-1">
            Sin alertas de aves raras o migratorias en tu zona en los últimos 7 días.
          </Text>
        )}
      </View>

      {/* Excursions Section */}
      <View className="mb-4 flex-row justify-between items-center">
        <Text className="text-xl font-bold text-gray-800">
          {t('upcoming_excursions') || 'Próximas Excursiones'}
        </Text>
        <TouchableOpacity
          onPress={() => setIsFormVisible(true)}
          className="bg-green-600 px-3 py-1.5 rounded-xl flex-row items-center"
        >
          <Plus color="white" size={16} />
          <Text className="text-white font-semibold text-sm ml-1">Crear Excursión</Text>
        </TouchableOpacity>
      </View>

      {excursions.length === 0 ? (
        <View className="bg-white rounded-2xl p-6 items-center justify-center border border-gray-100">
          <Users size={32} color="#9ca3af" />
          <Text className="text-gray-500 font-medium mt-2 text-center">
            No hay excursiones programadas. ¡Sé el primero en crear una salida de campo!
          </Text>
          <TouchableOpacity
            onPress={() => setIsFormVisible(true)}
            className="mt-4 bg-green-600 px-4 py-2.5 rounded-xl flex-row items-center"
          >
            <Plus color="white" size={16} />
            <Text className="text-white font-bold ml-1.5">Crear Excursión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        excursions.map((excursion) => {
          const excursionTitle = excursion.title || excursion.name || 'Excursión de Avistamiento';
          const excursionDest = excursion.destination || excursion.location || 'Reserva Natural';
          const isJoined = !!excursion.isJoined;
          const participantCount = excursion.participantsCount ?? (isJoined ? 1 : 0);

          return (
            <View
              key={excursion.id}
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-lg font-bold text-gray-800 flex-1">{excursionTitle}</Text>
                <View className="bg-green-100 px-2.5 py-1 rounded-full ml-2 flex-row items-center">
                  <Users size={12} color="#166534" />
                  <Text className="text-green-800 text-xs font-bold ml-1">
                    {participantCount}/{excursion.maxParticipants}
                  </Text>
                </View>
              </View>

              <View className="space-y-1.5 mb-3">
                <View className="flex-row items-center">
                  <MapPin size={16} color="#6b7280" />
                  <Text className="text-gray-600 ml-2 font-medium">{excursionDest}</Text>
                </View>
                <View className="flex-row items-center">
                  <Calendar size={16} color="#6b7280" />
                  <Text className="text-gray-600 ml-2">
                    {excursion.date} {excursion.time ? `• ${excursion.time}` : ''}
                  </Text>
                </View>
                {excursion.notes ? (
                  <View className="flex-row items-start mt-1">
                    <FileText size={16} color="#6b7280" />
                    <Text className="text-gray-500 text-xs ml-2 flex-1 italic">
                      {excursion.notes}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => (isJoined ? cancelExcursion(excursion.id) : joinExcursion(excursion.id))}
                className={`mt-2 flex-row justify-center items-center py-3 rounded-xl ${
                  isJoined ? 'bg-red-500' : 'bg-green-600'
                }`}
              >
                <Text className="text-white font-bold mr-2">
                  {isJoined
                    ? t('leave_excursion') || 'Salir de Excursión'
                    : t('join_excursion') || 'Unirme a Excursión'}
                </Text>
                {isJoined ? <X size={18} color="white" /> : <ChevronRight size={18} color="white" />}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <View className="h-24" />

      {/* Create Excursion Modal */}
      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                {t('create_excursion') || 'Crear Excursión'}
              </Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)} className="p-1">
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-bold mb-1">{t('title') || 'Título'}</Text>
              <TextInput
                className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                placeholder="Ej. Avistamiento Matutino de Tangaras"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-bold mb-1">
                {t('location') || 'Destino / Hotspot'}
              </Text>
              <TextInput
                className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                placeholder="Ej. Parque Chicaque"
                value={destination}
                onChangeText={setDestination}
              />
            </View>

            <View className="flex-row space-x-3 mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-700 font-bold mb-1">Fecha</Text>
                <TextInput
                  className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-bold mb-1">Hora</Text>
                <TextInput
                  className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                  placeholder="07:00 AM"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-bold mb-1">Máximo de Participantes</Text>
              <TextInput
                className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                placeholder="10"
                keyboardType="numeric"
                value={maxParticipants}
                onChangeText={setMaxParticipants}
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-bold mb-1">Notas / Recomendaciones</Text>
              <TextInput
                className="bg-gray-100 p-3.5 rounded-xl text-gray-800"
                placeholder="Llevar cámara, binoculares e hidratación..."
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              className="bg-green-600 py-4 rounded-xl items-center mb-8"
            >
              <Text className="text-white font-bold text-lg">Guardar Excursión</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
