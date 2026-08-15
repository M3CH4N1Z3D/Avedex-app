import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAvedexStore } from '../hooks/useAvedexStore';
import i18n from '../config/i18n';
import '../global.css';

export default function RootLayout() {
  const language = useAvedexStore((state) => state.language);

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}