import { MOCK_BIRDS } from '../constants/mockBirds';
import { BirdSpecies } from '../types';

export interface IdentificationResult {
  species: BirdSpecies;
  confidence: number;
}

export const identifyBird = async (imageUri: string): Promise<IdentificationResult[]> => {
  // Simulate network/processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Shuffle mock birds to get random candidates
  const shuffled = [...MOCK_BIRDS].sort(() => 0.5 - Math.random());
  
  // Select top 3
  const top3 = shuffled.slice(0, 3);

  // Assign mock confidences
  const mockConfidences = [94, 85, 60];

  return top3.map((species, index) => ({
    species,
    confidence: mockConfidences[index],
  }));
};
