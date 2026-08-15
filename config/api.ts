export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const API_CONFIG = {
  INATURALIST_BASE_URL: process.env.EXPO_PUBLIC_INATURALIST_BASE_URL || 'https://api.inaturalist.org/v1',
  EBIRD_BASE_URL: process.env.EXPO_PUBLIC_EBIRD_BASE_URL || 'https://api.ebird.org/v2',
  EBIRD_API_KEY: process.env.EXPO_PUBLIC_EBIRD_API_KEY || '',
  XENO_CANTO_BASE_URL: process.env.EXPO_PUBLIC_XENO_CANTO_BASE_URL || 'https://xeno-canto.org/api/3/recordings',
  XENO_CANTO_API_KEY: process.env.EXPO_PUBLIC_XENO_CANTO_API_KEY || '',
  GEMINI_API_KEY,
};
