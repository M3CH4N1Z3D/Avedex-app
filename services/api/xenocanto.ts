import { API_CONFIG } from '../../config/api';

export const getBirdAudio = async (scientificName: string): Promise<string | null> => {
  try {
    const formattedQuery = scientificName.includes(' ')
      ? `gen:${scientificName.split(' ')[0]} sp:${scientificName.split(' ').slice(1).join(' ')}`
      : `q:"${scientificName}"`;
      
    const url = `${API_CONFIG.XENO_CANTO_BASE_URL}?query=${encodeURIComponent(formattedQuery)}&key=${API_CONFIG.XENO_CANTO_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Xeno-Canto API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.recordings && data.recordings.length > 0) {
      let fileUrl = data.recordings[0].file;
      if (fileUrl && fileUrl.startsWith('//')) {
        fileUrl = `https:${fileUrl}`;
      }
      return fileUrl;
    }
    return null;
  } catch (error) {
    console.error('Error fetching from Xeno-Canto:', error);
    throw error;
  }
};