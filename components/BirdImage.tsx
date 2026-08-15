import React, { useState, useEffect } from 'react';
import { Image, View, ImageProps } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1552728089-57168b64ff1c?auto=format&fit=crop&w=800&q=80';

export interface BirdImageProps extends Omit<ImageProps, 'source'> {
  source?: { uri?: string | null } | number;
  fallbackUri?: string;
  className?: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export function BirdImage({
  source,
  fallbackUri = DEFAULT_FALLBACK_IMAGE,
  className,
  style,
  resizeMode = 'cover',
  ...props
}: BirdImageProps) {
  const [hasError, setHasError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const uri = typeof source === 'object' && source?.uri ? source.uri : null;

  useEffect(() => {
    setHasError(false);
    setFallbackError(false);
  }, [uri, fallbackUri]);

  if (typeof source === 'number') {
    return (
      <Image
        {...props}
        source={source}
        className={className}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  if (!uri || hasError) {
    if (!fallbackError && fallbackUri && fallbackUri !== uri) {
      return (
        <Image
          {...props}
          source={{ uri: fallbackUri }}
          className={className}
          style={style}
          resizeMode={resizeMode}
          onError={() => setFallbackError(true)}
        />
      );
    }

    return (
      <View
        className={`bg-emerald-950/20 items-center justify-center border border-emerald-500/20 rounded-lg ${className || ''}`}
        style={style}
      >
        <ImageIcon size={28} color="#059669" />
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri }}
      className={className}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  );
}

export default BirdImage;
