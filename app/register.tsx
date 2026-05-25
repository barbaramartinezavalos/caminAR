import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// 1. Actualizamos el tipo del formulario para incluir todos los campos
type RegisterFormInputs = {
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const IMG_BB_API_KEY = 'fe710239ec2669c60deafe46f166c86d';
  const { control, handleSubmit, formState: { errors }, getValues } = useForm<RegisterFormInputs>();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para la imagen de perfil (funcionalidad restaurada)
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Lógica para seleccionar y subir la imagen ---
  const handleSelectImage = async (source: 'gallery' | 'camera') => {
    let result;
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    try {
      if (source === 'gallery') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      } else {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      }
      if (!result.canceled) {
        setProfileImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo acceder a las imágenes.");
    }
  };

  const showImageOptions = () => Alert.alert("Foto de Perfil", "Elige una opción", [{ text: "Abrir cámara", onPress: () => handleSelectImage('camera') }, { text: "Elegir de la galería", onPress: () => handleSelectImage('gallery') }, { text: "Cancelar", style: "cancel" }]);

  const uploadImageToImgBB = async (uri: string): Promise<string | null> => {
    console.log('Subiendo imagen a ImgBB...');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', { uri, type: 'image/jpeg', name: 'profile.jpg' } as any);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_BB_API_KEY}`, { method: 'POST', body: formData });
      const json = await response.json();
      if (json.data?.url) {
        console.log('Imagen subida con éxito:', json.data.url);
        return json.data.url;
      }
      throw new Error(json.error?.message || "Error desconocido al subir la imagen.");
    } catch (error: any) {
      console.error("Error de ImgBB:", error.message);
      Alert.alert("Error de Imagen", `No se pudo subir la imagen: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // --- LÓGICA DE REGISTRO DIRECTA Y CON LOGS ---
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setLoading(true);
    let avatar_url: string | null = null;

    if (profileImageUri) {
      avatar_url = await uploadImageToImgBB(profileImageUri);
      if (!avatar_url) {
        setLoading(false);
        return;
      }
    }

    console.log('Paso 1: Intentando registrar usuario en Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      console.error('Error en Supabase Auth:', authError.message);
      Alert.alert('Error en el registro', authError.message);
      setLoading(false);
      return;
    }
    if (!authData.user) {
        console.error('Error: Supabase Auth no devolvió un usuario.');
        Alert.alert('Error', 'No se pudo crear el usuario.');
        setLoading(false);
        return;
    }

    console.log('Paso 2: Usuario creado en Auth. Intentando insertar perfil...');

    // 2. Insertamos los datos en tu tabla 'usuarios'.
    const { error: insertError } = await supabase.from('usuarios').insert({
      auth_user_id: authData.user.id, // <-- ¡ESTA ES LA LÍNEA QUE CORRIGE TODO!
      usuario: data.username,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      tipo_perfil: 'usuario',
      avatar_url: avatar_url,
    });

    if (insertError) {
      console.error('Error al insertar perfil en tabla "usuarios":', insertError.message);
      Alert.alert('Error', `Tu cuenta fue creada pero no se pudieron guardar los datos del perfil: ${insertError.message}`);
    } else {
      console.log('Paso 3: Perfil insertado con éxito.');
      Alert.alert('¡Registro Exitoso!', 'Ahora te mostraremos cómo funciona la app.');
      router.replace('/tutorial/tutorial1');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.card}>
            <View style={styles.header}>
              <TouchableOpacity onPress={showImageOptions} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="large" style={styles.avatarPlaceholder} /> : <Image source={profileImageUri ? { uri: profileImageUri } : require('../assets/images/icon.png')} style={styles.logoImage} resizeMode="cover"/>}
              </TouchableOpacity>
              <Text style={styles.uploadText}>Añadir foto de perfil</Text>
            </View>

            <View style={styles.loginSection}><Text style={styles.loginTitle}>Registrarse</Text><Text style={styles.loginSubtitle}>Crea tu cuenta para continuar</Text></View>

            <View style={styles.formContainer}>
              <Controller control={control} rules={{ required: 'El nombre es requerido.' }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} />)} name="nombre" />
              {errors.nombre && <Text style={styles.errorText}>{errors.nombre.message}</Text>}
              <Controller control={control} rules={{ required: 'El apellido es requerido.' }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.input} placeholder="Apellido" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} />)} name="apellido" />
              {errors.apellido && <Text style={styles.errorText}>{errors.apellido.message}</Text>}
              <Controller control={control} rules={{ required: 'El nombre de usuario es requerido.' }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.input} placeholder="Nombre de usuario" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} autoCapitalize="none"/>)} name="username"/>
              {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
              <Controller control={control} rules={{ required: 'El correo es requerido.', pattern: { value: /^\S+@\S+$/i, message: 'Email inválido.' } }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.input} placeholder="Correo electrónico" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} keyboardType="email-address" autoCapitalize="none"/>)} name="email"/>
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              <View style={styles.inputContainer}><Controller control={control} rules={{ required: 'La contraseña es requerida.', minLength: { value: 6, message: 'Mínimo 6 caracteres.' } }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.inputWithIcon} placeholder="Contraseña" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} secureTextEntry={!passwordVisible} />)} name="password" /><TouchableOpacity style={styles.icon} onPress={() => setPasswordVisible(!passwordVisible)}><Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="#A0AEC0" /></TouchableOpacity></View>
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
              <View style={styles.inputContainer}><Controller control={control} rules={{ required: 'Confirma tu contraseña.', validate: (value) => value === getValues('password') || 'Las contraseñas no coinciden.' }} render={({ field: { onChange, onBlur, value } }) => (<TextInput style={styles.inputWithIcon} placeholder="Confirmar contraseña" placeholderTextColor="#A0AEC0" onBlur={onBlur} onChangeText={onChange} value={value} secureTextEntry={!passwordConfirmVisible} />)} name="passwordConfirm" /><TouchableOpacity style={styles.icon} onPress={() => setPasswordConfirmVisible(!passwordConfirmVisible)}><Ionicons name={passwordConfirmVisible ? 'eye-off' : 'eye'} size={24} color="#A0AEC0" /></TouchableOpacity></View>
              {errors.passwordConfirm && <Text style={styles.errorText}>{errors.passwordConfirm.message}</Text>}
              <TouchableOpacity style={styles.loginButton} onPress={handleSubmit(onSubmit)} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Registrarse</Text>}</TouchableOpacity>
            </View>
            <Link href="/login" asChild><TouchableOpacity style={styles.registerButton}><Text style={styles.registerButtonText}>¿Ya tienes una cuenta? Inicia sesión</Text></TouchableOpacity></Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: '#deee87' },
  container: { flex: 1 },
  scrollContentContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  header: { alignItems: 'center', marginBottom: 16 },
  logoImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#2F855A', fontWeight: '700', marginTop: 8 },
  loginSection: { alignItems: 'center' },
  loginTitle: { fontSize: 20, fontWeight: '700', color: '#2F855A' },
  loginSubtitle: { color: '#718096', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  formContainer: { width: '100%', gap: 8 },
  input: { width: '100%', padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF' },
  inputWithIcon: { flex: 1, padding: 16, color: '#000' },
  icon: { padding: 10 },
  errorText: { color: '#E53E3E', fontSize: 12, marginTop: -4, marginBottom: 4},
  loginButton: { width: '100%', backgroundColor: '#2F855A', padding: 16, borderRadius: 12, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  loginButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  registerButton: { width: '100%', marginTop: 16, alignItems: 'center' },
  registerButtonText: { color: '#2F855A', fontWeight: '700', fontSize: 16 },
});

