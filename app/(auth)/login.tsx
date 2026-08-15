import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
          setErrorMsg('Tu correo electrónico aún no ha sido confirmado. Por favor revisa tu bandeja de entrada y confirma tu cuenta antes de iniciar sesión.');
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
              className="bg-emerald-600 py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 mb-6"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Iniciar Sesión
                </Text>
              )}
            </TouchableOpacity>

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
