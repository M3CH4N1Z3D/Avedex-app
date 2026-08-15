import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  LogOut,
  Trophy,
  Binoculars,
  Compass,
  ChevronRight,
  Mail,
  Award,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAvedexStore } from '../../hooks/useAvedexStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { userSightings, unlockedSpeciesIds, userExcursions, joinedExcursionIds } =
    useAvedexStore();

  const [loggingOut, setLoggingOut] = useState(false);

  // User details fallback
  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Observador de Aves';
  const email = user?.email || profile?.email || 'Sin correo asociado';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  // Get initial letter for avatar placeholder
  const initial = fullName ? fullName.charAt(0).toUpperCase() : 'A';

  // Stats calculation
  const sightingsCount = userSightings?.length || unlockedSpeciesIds?.length || 0;
  const excursionsCount =
    (userExcursions?.length || 0) + (joinedExcursionIds?.length || 0);

  // Dynamic Level / Rank based on sightings count
  const getRank = (count: number) => {
    if (count >= 30) return { title: 'Ornitólogo Experto', level: 'Nivel 4' };
    if (count >= 15) return { title: 'Observador Avanzado', level: 'Nivel 3' };
    if (count >= 5) return { title: 'Explorador de Campo', level: 'Nivel 2' };
    return { title: 'Observador Novato', level: 'Nivel 1' };
  };

  const userRank = getRank(sightingsCount);

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              const { error } = await signOut();
              if (error) {
                Alert.alert('Error', error.message || 'Error al cerrar sesión.');
              } else {
                router.replace('/(auth)/login' as any);
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Error al cerrar sesión.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        {/* Top Title Header */}
        <View className="mb-6 flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-slate-900">Perfil</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            className="p-2 bg-white border border-slate-200 rounded-full shadow-sm active:bg-slate-100"
            accessibilityLabel="Ir a configuración"
          >
            <Settings size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm items-center mb-6">
          <View className="relative mb-4">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-24 h-24 rounded-full border-4 border-emerald-500"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-emerald-600 justify-center items-center border-4 border-emerald-100 shadow-md">
                <Text className="text-white text-3xl font-bold">{initial}</Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full border-2 border-white">
              <Sparkles size={14} color="#ffffff" />
            </View>
          </View>

          <Text className="text-xl font-bold text-slate-900 text-center">{fullName}</Text>

          <View className="flex-row items-center mt-1">
            <Mail size={14} color="#64748b" className="mr-1" />
            <Text className="text-slate-500 text-sm ml-1">{email}</Text>
          </View>

          <View className="mt-4 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full flex-row items-center">
            <Award size={14} color="#059669" />
            <Text className="text-emerald-700 text-xs font-semibold ml-1.5">
              {userRank.level} • {userRank.title}
            </Text>
          </View>
        </View>

        {/* Quick Stats Summary Card */}
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
          Resumen de Estadísticas
        </Text>
        <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
          <View className="flex-row justify-between items-center divide-x divide-slate-100">
            {/* Stat 1: Level / Rank */}
            <View className="flex-1 items-center px-2">
              <View className="w-10 h-10 rounded-2xl bg-amber-50 justify-center items-center mb-2">
                <Trophy size={20} color="#d97706" />
              </View>
              <Text className="text-slate-900 font-bold text-base">{userRank.level}</Text>
              <Text className="text-slate-500 text-xs text-center mt-0.5" numberOfLines={1}>
                {userRank.title}
              </Text>
            </View>

            {/* Stat 2: Sightings Count */}
            <View className="flex-1 items-center px-2">
              <View className="w-10 h-10 rounded-2xl bg-emerald-50 justify-center items-center mb-2">
                <Binoculars size={20} color="#059669" />
              </View>
              <Text className="text-slate-900 font-bold text-base">{sightingsCount}</Text>
              <Text className="text-slate-500 text-xs text-center mt-0.5">Avistamientos</Text>
            </View>

            {/* Stat 3: Excursions */}
            <View className="flex-1 items-center px-2">
              <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mb-2">
                <Compass size={20} color="#2563eb" />
              </View>
              <Text className="text-slate-900 font-bold text-base">{excursionsCount}</Text>
              <Text className="text-slate-500 text-xs text-center mt-0.5">Excursiones</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Section */}
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
          Opciones de Cuenta
        </Text>

        <View className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          {/* Settings Button */}
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-slate-100 justify-center items-center mr-3">
                <Settings size={20} color="#334155" />
              </View>
              <View>
                <Text className="text-slate-900 font-semibold text-base">
                  Configuración de la Aplicación
                </Text>
                <Text className="text-slate-500 text-xs">
                  Notificaciones, exportaciones, modo offline e idioma.
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={loggingOut}
            className="flex-row items-center justify-between p-4 bg-red-50/50 active:bg-red-100/50"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-red-100 justify-center items-center mr-3">
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <LogOut size={20} color="#dc2626" />
                )}
              </View>
              <View>
                <Text className="text-red-700 font-bold text-base">Cerrar Sesión</Text>
                <Text className="text-red-500 text-xs">
                  Salir de la cuenta de usuario de Avedex.
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
