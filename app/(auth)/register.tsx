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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (error) {
        setErrorMsg(error.message || 'Error al registrar la cuenta.');
      } else {
        setShowConfirmationModal(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setShowConfirmationModal(false);
    router.replace('/(auth)/login' as any);
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
              Crear Cuenta 🦜
            </Text>
            <Text className="text-slate-600 text-center text-sm mb-8">
              Únete a la comunidad Avedex
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
                NOMBRE COMPLETO
              </Text>
              <TextInput
                className="bg-slate-50 text-slate-900 px-4 py-3.5 rounded-xl border border-slate-300 focus:border-emerald-500 font-medium placeholder:text-slate-400"
                placeholder="Juan Pérez"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

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
              onPress={handleSignUp}
              disabled={loading}
              className="bg-emerald-600 py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 mb-6"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Registrarse
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center items-center">
              <Text className="text-slate-600 text-sm">
                ¿Ya tienes una cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                <Text className="text-emerald-700 font-bold text-sm underline">
                  Inicia Sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleGoToLogin}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white border border-slate-200 p-6 rounded-3xl w-full max-w-md shadow-2xl items-center">
            <View className="w-16 h-16 bg-emerald-100 rounded-full justify-center items-center mb-4">
              <MailCheck size={36} color="#059669" />
            </View>

            <Text className="text-2xl font-bold text-slate-900 text-center mb-3">
              ¡Cuenta Creada Exitosamente!
            </Text>

            <Text className="text-slate-600 text-center text-sm mb-6 leading-relaxed">
              Hemos enviado un enlace de confirmación a{' '}
              <Text className="font-bold text-slate-900">{email}</Text>. Por favor revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.
            </Text>

            <TouchableOpacity
              onPress={handleGoToLogin}
              className="w-full bg-emerald-600 py-4 rounded-xl items-center justify-center shadow-md active:opacity-90"
            >
              <Text className="text-white font-semibold text-base">
                Ir a Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
