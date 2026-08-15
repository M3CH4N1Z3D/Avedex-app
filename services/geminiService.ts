import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, API_CONFIG } from '../config/api';
import { getUnifiedBirdData, UnifiedBirdSpecies } from './birdDataService';

export interface BirdCandidate {
  commonName: string;
  scientificName: string;
  confidence: number;
  reasoning: string;
  rarity?: string;
  conservationStatus?: string;
  photoUrl?: string;
  enrichedData?: UnifiedBirdSpecies | null;
}

export interface BirdIdentificationResult {
  isBird?: boolean;
  nonBirdCategory?: string;
  friendlyMessage?: string | null;
  candidates: BirdCandidate[];
}

export const identifyBirdWithGemini = async (
  imageBase64: string,
  gpsCoords?: { lat: number; lng: number },
  candidateContext?: string[]
): Promise<BirdIdentificationResult> => {
  const apiKey = GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is missing or invalid. Please configure EXPO_PUBLIC_GEMINI_API_KEY in .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'You are an expert ornithologist AI for a gamified birdwatching app. Analyze provided images to determine if they contain birds and identify species accurately.',
  });

  let prompt = `You are an expert ornithologist AI for a gamified birdwatching app.
Analyze the provided image.

First, determine if there is a clearly visible bird in the photo.
`;

  if (gpsCoords) {
    prompt += `Geographic location context: Latitude ${gpsCoords.lat}, Longitude ${gpsCoords.lng}.\n`;
  }

  if (candidateContext && candidateContext.length > 0) {
    prompt += `Candidate species reported nearby in this region: ${candidateContext.join(', ')}.\n`;
  }

  prompt += `Return strictly a JSON object with this structure:
{
  "isBird": boolean,
  "nonBirdCategory": string (e.g. "dog", "car", "plant", "human", "unknown" - only if isBird is false),
  "friendlyMessage": string (A friendly, humorous message in Spanish explaining that no bird was found in the image. e.g. "¡Eso parece ser un lindo perrito! Pero nuestro Avedex solo registra animales con plumas. 🐶✨"),
  "candidates": [
    {
      "commonName": "Nombre común en español",
      "scientificName": "Scientific name",
      "confidence": 95,
      "reasoning": "Explicación de marcas visuales..."
    }
  ]
}

If isBird is false, keep candidates as an empty array [].
If isBird is true, populate candidates with the top 3 matches and set friendlyMessage to null.
Do not include any text, markdown formatting, or HTML outside the JSON object.`;

  // Remove potential data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();

  let isBird = true;
  let nonBirdCategory: string | undefined = undefined;
  let friendlyMessage: string | null = null;
  let rawList: any[] = [];

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = result.response.text();

    // Fallback JSON parsing for clean object extraction
    try {
      const cleanedText = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const jsonResult = JSON.parse(cleanedText);

      if (Array.isArray(jsonResult)) {
        rawList = jsonResult;
        isBird = rawList.length > 0;
        friendlyMessage = isBird ? null : '¡No pudimos detectar ningún ave en la imagen!';
      } else if (typeof jsonResult === 'object' && jsonResult !== null) {
        rawList = Array.isArray(jsonResult.candidates)
          ? jsonResult.candidates
          : Array.isArray(jsonResult.results)
          ? jsonResult.results
          : Array.isArray(jsonResult.birds)
          ? jsonResult.birds
          : [];

        if (typeof jsonResult.isBird === 'boolean') {
          isBird = jsonResult.isBird;
        } else {
          isBird = rawList.length > 0;
        }

        nonBirdCategory = jsonResult.nonBirdCategory || undefined;
        friendlyMessage = jsonResult.friendlyMessage !== undefined ? jsonResult.friendlyMessage : (isBird ? null : '¡No pudimos detectar ningún ave en la imagen!');
      } else {
        throw new Error('Parsed response does not contain a valid object or array.');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText, parseError);
      throw new Error('Failed to parse identification response from AI service. Malformed JSON format.');
    }

  } catch (error: any) {
    console.error('Error identifying bird with Gemini:', error);

    if (error.message?.includes('GEMINI_API_KEY') || error.message?.includes('Malformed JSON') || error.message?.includes('identification response')) {
      throw error;
    }

    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later or check your API plan.');
    } else if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('NETWORK_ERROR')) {
      throw new Error('Network error while connecting to Gemini API. Please check your internet connection.');
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  // Enrich returned candidates if isBird is true
  let enrichedCandidates: BirdCandidate[] = [];

  if (isBird && rawList.length > 0) {
    enrichedCandidates = await Promise.all(
      rawList.map(async (item) => {
        let enrichedData: UnifiedBirdSpecies | null = null;
        try {
          const queryName = item.scientificName || item.commonName;
          if (queryName) {
            enrichedData = await getUnifiedBirdData(queryName, gpsCoords);
          }
        } catch (e) {
          console.warn(`Failed to enrich data for ${item.scientificName || item.commonName}:`, e);
        }

        return {
          commonName: item.commonName || 'Especie desconocida',
          scientificName: item.scientificName || 'Unknown species',
          confidence: typeof item.confidence === 'number' ? item.confidence : 80,
          reasoning: item.reasoning || '',
          enrichedData,
        };
      })
    );
  }

  return {
    isBird,
    nonBirdCategory,
    friendlyMessage,
    candidates: enrichedCandidates,
  };
};

export const getNearestAirportIATA = async (
  hotspotName: string,
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const apiKey = GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return 'BOG';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `Location: "${hotspotName}" at coordinates (${lat}, ${lng}). What is the 3-letter IATA airport code for the nearest commercial airport with passenger flights? Respond strictly with ONLY the 3-letter IATA code (e.g. BOG, MDE, BGA, MIA, YOW). No punctuation, no explanation.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanCode = responseText.toUpperCase().replace(/[^A-Z]/g, '').trim();

    if (cleanCode.length === 3) {
      return cleanCode;
    }

    return 'BOG';
  } catch (error) {
    console.error('Error fetching nearest airport IATA code:', error);
    return 'BOG';
  }
};
