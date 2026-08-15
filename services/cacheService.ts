import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    if (!itemStr) return null;
    
    const item: CacheItem<T> = JSON.parse(itemStr);
    if (Date.now() - item.timestamp > TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    return item.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

export const setCachedData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Cache write error:', error);
  }
};