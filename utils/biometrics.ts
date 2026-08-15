import { Platform } from 'react-native';

let LocalAuthentication: typeof import('expo-local-authentication') | null = null;

try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  console.warn('ExpoLocalAuthentication module is not available in this build environment.');
}

export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS === 'web' || !LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
}

export async function authenticateWithBiometrics(
  promptMessage = 'Inicia sesión en Avedex'
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return { success: false, error: 'Biometría no disponible en este dispositivo.' };
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      error: result.error ? `Error: ${result.error}` : undefined,
    };
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error?.message || 'Error durante la autenticación biométrica.',
    };
  }
}
