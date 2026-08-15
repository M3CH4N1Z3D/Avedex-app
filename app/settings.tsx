import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  FileSpreadsheet,
  WifiOff,
  Fingerprint,
  Globe,
  Database,
  ChevronRight,
  Download,
  ShieldCheck,
} from 'lucide-react-native';
import { useAvedexStore } from '../hooks/useAvedexStore';
import { scheduleMigratoryAlert } from '../services/notificationService';
import { exportToEBird, exportBackup } from '../services/exportService';

export default function SettingsScreen() {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const {
    alertsEnabled,
    setAlertsEnabled,
    userSightings,
    unlockedSpeciesIds,
    language,
    setLanguage,
  } = useAvedexStore();

  const [offlineSync, setOfflineSync] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleToggleAlerts = async (value: boolean) => {
    setAlertsEnabled(value);
    if (value) {
      const scheduled = await scheduleMigratoryAlert();
      if (scheduled) {
        Alert.alert('Notificaciones Activadas', 'Recibirás alertas de aves migratorias en tu zona.');
      } else {
        Alert.alert('Aviso', 'No se pudieron programar las alertas. Revisa los permisos de notificación.');
        setAlertsEnabled(false);
      }
    }
  };

  const handleToggleOfflineSync = (value: boolean) => {
    setOfflineSync(value);
    if (value) {
      Alert.alert('Modo Offline', 'Sincronización automática de datos offline habilitada.');
    } else {
      Alert.alert('Modo Offline', 'Sincronización automática pausada.');
    }
  };

  const handleToggleBiometrics = (value: boolean) => {
    setBiometricsEnabled(value);
    if (value) {
      Alert.alert('Biometría Activada', 'Se ha habilitado la autenticación biométrica (Huella / Face ID).');
    } else {
      Alert.alert('Biometría Desactivada', 'Autenticación biométrica desactivada.');
    }
  };

  const handleExportEBird = async () => {
    setExporting(true);
    try {
      const success = await exportToEBird(userSightings);
      if (success) {
        Alert.alert('Exportación Exitosa', 'El archivo CSV para eBird ha sido generado y compartido correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo completar la exportación a eBird.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado al exportar.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const success = await exportBackup(userSightings, unlockedSpeciesIds);
      if (success) {
        Alert.alert('Copia de Seguridad', 'Respaldo generado con éxito.');
      } else {
        Alert.alert('Error', 'No se pudo generar la copia de seguridad.');
      }
    } catch {
      Alert.alert('Error', 'Error al procesar la copia de seguridad.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" style={{ flex: 1 }}>
      {/* Navigation Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={handleGoBack}
          className="p-2 -ml-2 rounded-full active:bg-slate-100 flex-row items-center"
          accessibilityLabel="Volver a perfil"
        >
          <ArrowLeft size={22} color="#0f172a" />
          <Text className="ml-1 text-slate-800 font-medium text-base">Perfil</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Configuración</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Preference Section: Notificaciones */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Notificaciones y Alertas
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl bg-amber-50 justify-center items-center mr-3">
                  <Bell size={20} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-base">Alertas Migratorias</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Notificaciones sobre avistamientos relevantes y temporadas de migración.
                  </Text>
                </View>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={handleToggleAlerts}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Preference Section: Seguridad / Biometría */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Seguridad y Acceso
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl bg-indigo-50 justify-center items-center mr-3">
                  <Fingerprint size={20} color="#4f46e5" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-base">Autenticación Biométrica</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Utiliza Face ID o huella dactilar para acceder a la app rápidamente.
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Preference Section: Modo Offline / Sincronización */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Almacenamiento y Red
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 justify-center items-center mr-3">
                  <WifiOff size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-base">Sincronización Offline</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Guarda datos en el dispositivo sin conexión y sincroniza al reconectar.
                  </Text>
                </View>
              </View>
              <Switch
                value={offlineSync}
                onValueChange={handleToggleOfflineSync}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Preference Section: Exportación de Datos */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Exportación y Datos
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <TouchableOpacity
              onPress={handleExportEBird}
              disabled={exporting}
              className="flex-row items-center justify-between py-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 justify-center items-center mr-3">
                  <FileSpreadsheet size={20} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-base">Exportar CSV a eBird</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Genera tu lista de avistamientos con formato estándar eBird.
                  </Text>
                </View>
              </View>
              <Download size={18} color="#64748b" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 my-1" />

            <TouchableOpacity
              onPress={handleExportBackup}
              className="flex-row items-center justify-between py-2 active:opacity-70"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-purple-50 justify-center items-center mr-3">
                  <Database size={20} color="#7c3aed" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-base">Copia de Seguridad (JSON)</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Respalda todo tu progreso de Avedex localmente.
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Idioma de la Aplicación */}
        <View className="mb-10">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Idioma de la Aplicación
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-cyan-50 justify-center items-center mr-3">
                <Globe size={20} color="#0891b2" />
              </View>
              <View>
                <Text className="text-slate-900 font-semibold text-base">Idioma Preferido</Text>
                <Text className="text-slate-500 text-xs">Selecciona la lengua para la interfaz.</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2 pt-2">
              {[
                { code: 'es', label: 'Español' },
                { code: 'en', label: 'English' },
                { code: 'fr', label: 'Français' },
                { code: 'pt', label: 'Português' },
              ].map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setLanguage(lang.code)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      isActive
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
