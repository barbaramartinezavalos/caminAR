import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase'; // 1. Importamos el cliente de Supabase

type LoginFormInputs = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const [loading, setLoading] = useState(false); // Estado para mostrar un indicador de carga

  // --- LÓGICA DE INICIO DE SESIÓN CON SUPABASE ---
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true);
    console.log('Paso 1: Intentando iniciar sesión con Supabase...');

    // 2. Llamamos a la función de Supabase para iniciar sesión con email y contraseña
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      // Si hay un error (ej. contraseña incorrecta), lo mostramos en una alerta.
      console.error('Error de inicio de sesión:', error.message);
      Alert.alert('Error al iniciar sesión', error.message);
    } else {
      console.log('Inicio de sesión exitoso. Redirigiendo...');
      // Si el inicio de sesión es exitoso, no necesitamos hacer nada más.
      // El `AuthContext` que creamos detectará el cambio de sesión automáticamente
      // y el `RootLayout` se encargará de redirigir al usuario a la pantalla principal (`/tabs`).
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.welcomeTitle}>¡Bienvenido de vuelta!</Text>
              <Text style={styles.welcomeText}>Inicia sesión en tu cuenta de CaminAR</Text>
            </View>

            <View style={styles.formContainer}>
              <Controller
                control={control}
                rules={{
                  required: 'El correo electrónico es requerido.',
                  pattern: { value: /^\S+@\S+$/i, message: 'Formato de correo inválido.' },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#A0AEC0"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
                name="email"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

              <Controller
                control={control}
                rules={{ required: 'La contraseña es requerida.' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#A0AEC0"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry
                  />
                )}
                name="password"
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

              {/* 3. El botón ahora muestra un indicador de carga si está procesando */}
              <TouchableOpacity style={styles.loginButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Iniciar Sesión</Text>}
              </TouchableOpacity>
            </View>

            <Link href="/register" asChild>
              <TouchableOpacity style={styles.registerButton}>
                <Text style={styles.registerButtonText}>¿No tienes una cuenta? Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Tus estilos originales se mantienen exactamente igual
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#deee87',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#276749',
    textAlign: 'center',
  },
  welcomeText: {
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    gap: 16,
  },
  input: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: -8, // Ajuste para que el error esté más cerca del input
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#2F855A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50, // Asegura una altura mínima para el botón
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  registerButton: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#2F855A',
    fontWeight: '700',
  },
  missionText: {
    color: '#A0AEC0',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});

