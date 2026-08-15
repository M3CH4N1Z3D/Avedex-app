import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Sighting } from '../types';
import { MOCK_BIRDS } from '../constants/mockBirds';

export const exportToEBird = async (sightings: Sighting[]) => {
  try {
    let csvContent = 'Species Name,Scientific Name,Latitude,Longitude,Date,Time,Comments\n';
    
    for (const sighting of sightings) {
      const bird = MOCK_BIRDS.find(b => b.id === sighting.speciesId);
      if (!bird) continue;

      const dateStr = sighting.date || sighting.timestamp || '';
      const date = dateStr ? new Date(dateStr) : new Date();
      const dateString = date.toLocaleDateString();
      const timeString = date.toLocaleTimeString();

      const coords = sighting.coordinates as any;
      const lat = coords?.latitude ?? coords?.lat ?? 0;
      const lng = coords?.longitude ?? coords?.lng ?? 0;

      const row = `"${bird.commonName}","${bird.scientificName}",${lat},${lng},"${dateString}","${timeString}","${sighting.notes || ''}"\n`;
      csvContent += row;
    }

    const file = new File(Paths.document, 'ebird_export.csv');
    await file.write(csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export to eBird',
      });
    }
    return true;
  } catch (error) {
    console.error('Error exporting to eBird:', error);
    return false;
  }
};

export const exportBackup = async (sightings: Sighting[], unlockedIds: string[]) => {
  try {
    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        sightings,
        unlockedIds,
      }
    };
    
    const jsonContent = JSON.stringify(backupData, null, 2);
    const file = new File(Paths.document, 'avedex_backup.json');
    await file.write(jsonContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Backup Avedex Data',
      });
    }
    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
};
