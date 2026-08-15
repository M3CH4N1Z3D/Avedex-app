import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

export interface BirdCardData {
  id: string;
  commonName: string;
  scientificName: string;
  userPhotoUri?: string;
  defaultPhotoUrl?: string;
  imageUrl?: string;
  sightingDate?: string;
  rarity?: string;
  conservationStatus?: string;
  habitat?: string;
}

export interface BirdCardProps {
  item: BirdCardData;
  onPress?: () => void;
  className?: string;
}

export const BirdCard: React.FC<BirdCardProps> = ({ item, onPress, className = '' }) => {
  const displayImage =
    item.userPhotoUri ||
    item.defaultPhotoUrl ||
    item.imageUrl ||
    'https://via.placeholder.com/300?text=Sin+Imagen';

  const hasUserPhoto = Boolean(item.userPhotoUri);

  const formattedDate = item.sightingDate
    ? new Date(item.sightingDate).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null;

  return (
    <Pressable
      onPress={onPress}
      className={`w-full max-w-[240px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:opacity-90 ${className}`}
    >
      {/* Contenedor de Imagen de Ave con aspecto fijo */}
      <View className="h-48 w-full relative bg-slate-100 dark:bg-slate-900 overflow-hidden items-center justify-center">
        <ExpoImage
          source={{ uri: displayImage }}
          contentFit="contain"
          contentPosition="center"
          className="w-full h-full"
        />
        {/* Badge "📸 Tu Foto" en la esquina superior derecha */}
        {hasUserPhoto && (
          <View className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 z-10 shadow-sm">
            <Text className="text-[10px] text-white font-semibold">📸 Tu Foto</Text>
          </View>
        )}
      </View>

      {/* Pie de tarjeta / Panel inferior compacto estilo Pokédex */}
      <View className="p-3">
        <Text className="font-bold text-gray-900 text-sm leading-tight" numberOfLines={1}>
          {item.commonName}
        </Text>
        <Text className="text-xs text-gray-500 italic mt-0.5" numberOfLines={1}>
          {item.scientificName}
        </Text>

        {/* Detalles secundarios Pokédex (Rareza y Fecha / Hábitat) */}
        {(item.rarity || formattedDate || item.habitat) && (
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
            {item.rarity ? (
              <View className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                <Text className="text-[10px] font-semibold text-blue-700" numberOfLines={1}>
                  {item.rarity}
                </Text>
              </View>
            ) : item.habitat ? (
              <Text className="text-[10px] text-gray-400 font-medium" numberOfLines={1}>
                {item.habitat}
              </Text>
            ) : null}

            {formattedDate && (
              <Text className="text-[10px] text-gray-400 font-medium ml-auto">
                {formattedDate}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default BirdCard;
