import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import {
  Appbar,
  Avatar,
  Button,
  Card,
  Divider,
  List,
  Menu,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useUser, UserProfileData } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

// We keep the local mapping for UI state, but UserContext will handle DB mapping
// const profileTypeToSupabase = (type: 'common' | 'company'): 'usuario' | 'organizacion' => {
//     return type === 'company' ? 'organizacion' : 'usuario';
// };

export default function ConfiguracionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const IMG_BB_API_KEY = 'fe710239ec2669c60deafe46f166c86d'; // Consider moving to env vars

  // 1. Get data from contexts
  const {
    username,
    profileImage,
    profileType, // This represents 'common' or 'company' from UserContext
    updateProfile,
    loadingProfile,
    nombre,
    apellido,
    isOrganization, // Get the boolean value from context
  } = useUser();

  const { signOut } = useAuth();

  // 2. Local states initialized from context
  const [localUsername, setLocalUsername] = useState(username);
  const [localNombre, setLocalNombre] = useState(nombre || '');
  const [localApellido, setLocalApellido] = useState(apellido || '');
  const [localProfileType, setLocalProfileType] = useState(profileType); // Still 'common' or 'company'

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Sync local states with context changes
  useEffect(() => {
    setLocalUsername(username);
    setLocalProfileType(profileType);
    setLocalNombre(nombre || '');
    setLocalApellido(apellido || '');
  }, [username, profileType, nombre, apellido]);

  // 3. Save changes function - includes esOrganizacion
  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Include all fields that might be updated, including esOrganizacion
    const updates: Partial<UserProfileData> = {
      usuario: localUsername,
      nombre: localNombre,
      apellido: localApellido,
      // Pass the boolean directly based on the local UI selection
      esOrganizacion: localProfileType === 'company',
      // We don't need tipo_perfil here if esOrganizacion is the source of truth
    };

    // Logic to send only changed updates
    const changedUpdates: Partial<UserProfileData> = {};
    Object.keys(updates).forEach((key) => {
        const typedKey = key as keyof UserProfileData;
        let originalValue: any;
        switch(typedKey) {
            case 'usuario': originalValue = username; break;
            case 'nombre': originalValue = nombre; break;
            case 'apellido': originalValue = apellido; break;
            // Compare the new boolean with the one from context
            case 'esOrganizacion': originalValue = isOrganization; break;
            default: break;
        }
        // Use === for comparison, especially important for booleans
        if (updates[typedKey] !== originalValue) {
            changedUpdates[typedKey] = updates[typedKey];
        }
    });


    if (Object.keys(changedUpdates).length > 0) {
        console.log("Sending updates to Supabase:", changedUpdates);
        // updateProfile now handles mapping 'esOrganizacion' correctly
        const success = await updateProfile(changedUpdates);

        if (success) {
            Alert.alert("Éxito", "Los cambios se han guardado correctamente.");
            router.back();
        } else {
            Alert.alert("Error", "No se pudieron guardar los cambios. Intenta de nuevo.");
        }
    } else {
         Alert.alert("Información", "No hay cambios para guardar.");
         router.back(); // Go back even if no changes
    }

    setIsSaving(false);
  };

  // 4. Logout (no changes)
  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, cerrar sesión", onPress: async () => {
          await signOut();
          // Reset navigation stack to prevent going back to authenticated screens
          router.replace('/login');
      }, style: 'destructive'}
    ]);
  };

  // 5. Image selection (no changes)
  const handleSelectImage = async (source: 'gallery' | 'camera') => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    try {
      if (source === 'gallery') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      } else {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("ImagePicker Error:", error);
      Alert.alert("Error", "No se pudo acceder a las imágenes.");
    }
  };

  // 6. Image upload and profile update (only updates avatar_url) - no changes
  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    const formData = new FormData();
    const fileType = uri.split('.').pop();
    const fileName = uri.split('/').pop();

    formData.append('image', {
        uri: uri,
        type: `image/${fileType || 'jpeg'}`,
        name: fileName || 'profile.jpg',
    } as any);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_BB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        const json = await response.json();
        if (json.data && json.data.url) {
            const imageUrl = json.data.url;
            // Call updateProfile only with avatar_url
            const success = await updateProfile({ avatar_url: imageUrl });
            if (success) {
                Alert.alert("Éxito", "La foto de perfil se actualizó correctamente.");
            } else {
                 throw new Error("No se pudo guardar la URL de la imagen en el perfil.");
            }
        } else {
            throw new Error(json.error?.message || "Error desconocido al subir la imagen a ImgBB.");
        }
    } catch (error: any) {
        console.error("Upload/Update Image Error:", error);
        Alert.alert("Error", `No se pudo actualizar la foto de perfil: ${error.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  // 7. Show image options (no changes)
  const showImageOptions = () => {
    Alert.alert(
      "Cambiar foto de perfil",
      "Elige una opción",
      [
        { text: "Abrir cámara", onPress: () => handleSelectImage('camera') },
        { text: "Elegir de la galería", onPress: () => handleSelectImage('gallery') },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  // Initial loading indicator
  if (loadingProfile && !username) {
     return (
        <SafeAreaView style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
             <ActivityIndicator size="large" />
        </SafeAreaView>
     );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Configuración" titleStyle={{ color: '#fff' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <Card style={styles.card}>
          <Card.Title title="Perfil" left={(props) => <List.Icon {...props} icon="account-outline" />} />
          <Card.Content>
            <View style={styles.avatarContainer}>
              {isUploading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{height: 80}} />
              ) : (
                <Avatar.Image size={80} source={{ uri: profileImage || 'https://avatar.iran.liara.run/public/47' }} />
              )}
              <Button icon="camera" mode="contained-tonal" onPress={showImageOptions} style={styles.changePhotoButton} disabled={isUploading || isSaving}>
                Cambiar foto
              </Button>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.label}>Tipo de perfil</Text>
            {/* Menu still controls localProfileType ('common' or 'company') */}
            <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={
                <Button mode="outlined" onPress={() => setMenuVisible(true)} icon={localProfileType === 'common' ? 'account-outline' : 'office-building-outline'} contentStyle={styles.dropdownButtonContent} style={styles.dropdownButton} labelStyle={{ color: theme.colors.onSurface }}>
                  {localProfileType === 'common' ? 'Usuario común' : 'Organización'}
                </Button>
            }>
              <Menu.Item onPress={() => { setLocalProfileType('common'); setMenuVisible(false); }} title="Usuario común" leadingIcon="account-outline"/>
              <Menu.Item onPress={() => { setLocalProfileType('company'); setMenuVisible(false); }} title="Organización" leadingIcon="office-building-outline"/>
            </Menu>
            <Divider style={styles.divider} />
            <Text style={styles.label}>Información personal</Text>
            <TextInput label="Nombre de usuario (público)" value={localUsername} onChangeText={setLocalUsername} mode="outlined" style={styles.input} />
            <TextInput label="Nombre real" value={localNombre} onChangeText={setLocalNombre} mode="outlined" style={styles.input} />
            <TextInput label="Apellido" value={localApellido} onChangeText={setLocalApellido} mode="outlined" style={styles.input} />
          </Card.Content>
        </Card>

        {/* Privacy Section (no changes needed here) */}
        <Card style={styles.card}>
            <Card.Title title="Privacidad y Seguridad" left={(props) => <List.Icon {...props} icon="lock-outline" />} />
            <Card.Content>
                <Text style={styles.label}>Cambiar contraseña (Funcionalidad pendiente)</Text>
                <TextInput label="Contraseña actual" mode="outlined" secureTextEntry style={styles.input} disabled />
                <TextInput label="Nueva contraseña" mode="outlined" secureTextEntry style={styles.input} disabled />
                <TextInput label="Confirmar nueva contraseña" mode="outlined" secureTextEntry style={styles.input} disabled />
                <Button mode="contained-tonal" onPress={() => {}} style={{ marginTop: 10 }} disabled>Actualizar contraseña</Button>
            </Card.Content>
        </Card>

      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <Button icon="content-save" mode="contained" onPress={handleSaveChanges} style={styles.footerButton} disabled={isSaving || isUploading || loadingProfile} loading={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button icon="logout" onPress={handleLogout} textColor={theme.colors.error} style={styles.footerButton} disabled={isSaving || isUploading}>
          Cerrar sesión
        </Button>
      </View>
    </SafeAreaView>
  );
}

// Styles (no changes)
const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContainer: { padding: 16, paddingBottom: 32 },
    card: { marginBottom: 16, backgroundColor: 'white' },
    avatarContainer: { alignItems: 'center', marginBottom: 16 },
    changePhotoButton: { marginTop: 12 },
    divider: { marginVertical: 16 },
    label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: '500' },
    input: { marginBottom: 12 },
    footer: {
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    footerButton: { marginBottom: 8 },
    dropdownButton: { backgroundColor: 'white', height: 56, justifyContent: 'center', borderColor: '#79747E' },
    dropdownButtonContent: { justifyContent: 'flex-start' },
});
