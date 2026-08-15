import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithBiometrics, isBiometricSupported } from '../../utils/biometrics';
import { supabase } from '../../lib/supabase';

const BIOMETRICS_KEY = '@avedex_biometrics_enabled';
const BIOMETRICS_SESSION_KEY = '@avedex_biometrics_session';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    if (Platform.OS === 'web') {
      setBiometricsAvailable(false);
      return;
    }
    try {
      const supported = await isBiometricSupported();
      const enabled = await AsyncStorage.getItem(BIOMETRICS_KEY);
      setBiometricsAvailable(supported && enabled === 'true');
    } catch {
      setBiometricsAvailable(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setErrorMsg(
            'Tu correo electrónico aún no ha sido confirmado. Por favor revisa tu bandeja de entrada y confirma tu cuenta antes de iniciar sesión.'
          );
        } else {
          setErrorMsg(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authenticateWithBiometrics('Inicia sesión en Avedex');
      if (res.success) {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const storedSessionStr = await AsyncStorage.getItem(BIOMETRICS_SESSION_KEY);
          if (storedSessionStr) {
            try {
              const { access_token, refresh_token } = JSON.parse(storedSessionStr);
              if (access_token && refresh_token) {
                const restored = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                session = restored.data.session;
              }
            } catch {
              // Ignore parse or setSession errors
            }
          }
        }

        if (!session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed.session;
        }

        if (session) {
          router.replace('/(tabs)');
        } else {
          setErrorMsg(
            'No hay una sesión guardada válida. Por favor, inicia sesión con tu correo y contraseña.'
          );
        }
      } else {
        if (res.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error durante la autenticación biométrica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full mx-auto">
            <Text className="text-3xl font-bold text-slate-900 text-center mb-2">
              Avedex 🦜
            </Text>
            <Text className="text-slate-600 text-center text-sm mb-8">
              Inicia sesión para continuar tu aventura
            </Text>

            {errorMsg ? (
              <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
                <Text className="text-red-700 text-xs text-center font-medium">
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-slate-700 text-xs font-semibold mb-1.5 ml-1 uppercase tracking-wider">
                CORREO ELECTRÓNICO
              </Text>
              <TextInput
                className="bg-slate-50 text-slate-900 px-4 py-3.5 rounded-xl border border-slate-300 focus:border-emerald-500 font-medium placeholder:text-slate-400"
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-700 text-xs font-semibold mb-1.5 ml-1 uppercase tracking-wider">
                CONTRASEÑA
              </Text>
              <TextInput
                className="bg-slate-50 text-slate-900 px-4 py-3.5 rounded-xl border border-slate-300 focus:border-emerald-500 font-medium placeholder:text-slate-400"
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-emerald-600 py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 mb-4"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Iniciar Sesión
                </Text>
              )}
            </TouchableOpacity>

            {biometricsAvailable && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={loading}
                className="flex-row items-center justify-center bg-indigo-50 border border-indigo-200 py-3.5 px-4 rounded-xl mb-6 active:opacity-80"
              >
                <Fingerprint size={20} color="#4f46e5" />
                <Text className="text-indigo-700 font-semibold text-sm ml-2">
                  Iniciar sesión con Biometría / Huella
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row justify-center items-center">
              <Text className="text-slate-600 text-sm">
                ¿No tienes cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text className="text-emerald-700 font-bold text-sm underline">
                  Regístrate
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
