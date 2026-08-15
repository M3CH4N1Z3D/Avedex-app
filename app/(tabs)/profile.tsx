import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAvedexStore } from '../../hooks/useAvedexStore';
import { scheduleMigratoryAlert } from '../../services/notificationService';
import { exportToEBird, exportBackup } from '../../services/exportService';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { alertsEnabled, setAlertsEnabled, userSightings, unlockedSpeciesIds, language, setLanguage, clearAllSightings } = useAvedexStore();

  const handleToggleAlerts = async (value: boolean) => {
    setAlertsEnabled(value);
    if (value) {
      const scheduled = await scheduleMigratoryAlert();
      if (scheduled) {
        Alert.alert(t('alerts_enabled'), t('alerts_enabled_desc'));
      } else {
        Alert.alert(t('error'), t('error_alerts'));
        setAlertsEnabled(false);
      }
    }
  };

  const handleExportEBird = async () => {
    const success = await exportToEBird(userSightings);
    if (success) {
      Alert.alert(t('success'), t('ebird_success'));
    } else {
      Alert.alert(t('error'), t('ebird_fail'));
    }
  };

  const handleBackup = async () => {
    const success = await exportBackup(userSightings, unlockedSpeciesIds);
    if (success) {
      Alert.alert(t('success'), t('backup_success'));
    } else {
      Alert.alert(t('error'), t('backup_fail'));
    }
  };

  const handleClearSightings = () => {
    Alert.alert(
      'Limpiar Avistamientos',
      '¿Deseas borrar todos los registros de avistamientos y reiniciar la base de datos local?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar Todo',
          style: 'destructive',
          onPress: () => {
            clearAllSightings();
            Alert.alert('Base de Datos Reiniciada', 'Todos los avistamientos han sido eliminados con éxito.');
          },
        },
      ]
    );
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{t('profile')}</Text>

      <Text style={styles.sectionHeader}>{t('language')}</Text>
      <View style={styles.languageContainer}>
        {['es', 'en', 'fr', 'pt'].map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.langButton, language === lang && styles.langButtonActive]}
            onPress={() => handleLanguageChange(lang)}
          >
            <Text style={[styles.langButtonText, language === lang && styles.langButtonTextActive]}>
              {t(lang)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionHeader}>{t('settings')}</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>{t('alerts')}</Text>
        <Switch value={alertsEnabled} onValueChange={handleToggleAlerts} />
      </View>

      <Text style={styles.sectionHeader}>{t('data_management')}</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleExportEBird}>
        <Text style={styles.buttonText}>{t('export_ebird')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleBackup}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>{t('backup_progress')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearSightings}>
        <Text style={[styles.buttonText, styles.dangerButtonText]}>Limpiar Avistamientos (Dev Cleanup)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 15,
    color: '#444',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  langButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  langButtonActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  langButtonText: {
    color: '#333',
    fontSize: 14,
  },
  langButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#208AEF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
});
