import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, View, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker, Region } from "react-native-maps";
import { Appbar, Button, Card, Dialog, Portal, Text, TextInput, useTheme, IconButton } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser, Reto } from '../context/UserContext';
import { useAuth } from "../context/AuthContext";

export default function MapaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat: string, lon: string, title: string }>();

  const [region, setRegion] = useState<Region | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Reto | null>(null);
  const [description, setDescription] = useState('');
  const { challenges, loadingChallenges, completeChallenge, completedChallengeIds, loadingCompletedChallenges } = useUser();
  const { user } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      let initialRegion: Region;
      const { lat, lon } = params;

      if (lat && lon) {
        console.log(`[MapaScreen] Centrando en cupón: ${lat}, ${lon}`);
        initialRegion = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso requerido", "Necesitamos tu ubicación para mostrarte puntos cercanos.");
          initialRegion = {
            latitude: -31.394,
            longitude: -58.018,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
        } else {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            initialRegion = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
          } catch (error) {
            console.error("Error getting current location:", error);
            Alert.alert("Error de Ubicación", "No se pudo obtener tu ubicación actual. Mostrando ubicación por defecto.");
            initialRegion = {
              latitude: -31.394,
              longitude: -58.018,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
          }
        }
      }
      setRegion(initialRegion);
    })();
  }, [params]);

  const openCamera = async () => {
     const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
     if (!cameraPermission.granted) {
       Alert.alert("Cámara", "Necesitamos permisos de cámara para subir evidencia.");
       return;
     }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Mantenemos 4:3
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
      setDescription('');
    }
  };

  const confirmEvidence = async () => {
    if (!selectedChallenge || !photo || !user) {
        Alert.alert("Error", "Faltan datos para completar el reto.");
        return;
    }

    setIsCompleting(true);
    try {
        console.log(`[MapaScreen] Intentando completar reto ${selectedChallenge.id} con foto ${photo} y descripción "${description}"`);
        const result = await completeChallenge(selectedChallenge, photo, description);

        if (result.success) {
            Alert.alert(
                "¡Reto Completado!",
                `Has ganado ${selectedChallenge.puntos_otorgados} puntos por completar "${selectedChallenge.titulo}".`
            );
            setPhoto(null);
            setSelectedChallenge(null);
            setDescription('');
        } else {
            Alert.alert("Error al completar", result.message || "No se pudo completar el reto. Revisa tu conexión e inténtalo de nuevo.");
        }
    } catch (error: any) {
        console.error("[MapaScreen] Error en confirmEvidence:", error);
        Alert.alert("Error Inesperado", `Ocurrió un problema: ${error.message}`);
    } finally {
        setIsCompleting(false);
    }
  };

   const getPinColor = (challenge: Reto) => {
     if (completedChallengeIds.has(challenge.id)) {
        return theme.colors.backdrop;
     }
     if (challenge.puntos_otorgados >= 200) return theme.colors.error;
     if (challenge.puntos_otorgados >= 100) return theme.colors.primary;
     return theme.colors.secondary;
   };

  if (!region || loadingChallenges || loadingCompletedChallenges) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color={theme.colors.primary}/>
        <Text style={{ marginTop: 16 }}>
            { !region ? "Obteniendo ubicación..." : "Cargando datos..." }
        </Text>
      </View>
    );
  }

  const challengesWithLocation = challenges.filter(c => c.latitud != null && c.longitud != null);

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff"/>
        <Appbar.Content title="Mapa Interactivo" titleStyle={{ color: '#fff' }}/>
      </Appbar.Header>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        {challengesWithLocation.map((challenge) => (
          <Marker
            key={challenge.id}
            coordinate={{ latitude: challenge.latitud!, longitude: challenge.longitud! }}
            title={challenge.titulo}
            description={
                completedChallengeIds.has(challenge.id)
                ? '¡Ya completado!'
                : `${challenge.puntos_otorgados} pts`
            }
            pinColor={getPinColor(challenge)}
            onPress={() => {
                if (!completedChallengeIds.has(challenge.id)) {
                    setSelectedChallenge(challenge);
                    setPhoto(null);
                    setDescription('');
                } else {
                    Alert.alert("Reto Completado", "Ya has completado este reto.");
                }
            }}
          />
        ))}

         {!params.lat && (
            <Marker coordinate={region} pinColor="blue" title="Tu Ubicación" />
         )}

        {params.lat && params.lon && (
          <Marker
            coordinate={{ latitude: parseFloat(params.lat as string), longitude: parseFloat(params.lon as string) }}
            pinColor="gold"
            title={params.title as string || 'Ubicación del Cupón'}
            zIndex={10}
          />
        )}
      </MapView>

      {selectedChallenge && !photo && (
        <Card style={styles.bottomCard}>
          <Card.Title
            title={`¿Estás en "${selectedChallenge.titulo}"?`}
            titleVariant="titleMedium"
            subtitle={`${selectedChallenge.puntos_otorgados} Puntos`}
            right={(props) => <IconButton {...props} icon="close-circle" onPress={() => setSelectedChallenge(null)} />}
           />
          <Card.Content>
            <Text variant="bodyMedium">
              Toma una foto como evidencia para completar el reto.
            </Text>
            {selectedChallenge.direccion && (
                 <Text variant="bodySmall" style={{color: theme.colors.backdrop, marginTop: 4 }}>
                     📍 {selectedChallenge.direccion}
                 </Text>
            )}
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={openCamera} icon="camera" style={{flex: 1}} labelStyle={{fontSize: 16}}>
                Tomar Foto
            </Button>
          </Card.Actions>
        </Card>
      )}

      <Portal>
        <Dialog visible={!!photo} onDismiss={() => { if (!isCompleting) setPhoto(null); }}>
            <Dialog.Title>Confirmar evidencia</Dialog.Title>
            <Dialog.Content>
                {photo && <Image source={{ uri: photo }} style={styles.modalImage} />}
                <TextInput
                    label="Añadir comentario (opcional)"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    style={styles.descriptionInput}
                    multiline
                    numberOfLines={2}
                    disabled={isCompleting}
                />
                {isCompleting && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{marginTop: 10}}>Completando reto...</Text>
                    </View>
                )}
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setPhoto(null)} disabled={isCompleting}>Cancelar</Button>
                <Button mode="contained" onPress={confirmEvidence} disabled={isCompleting} loading={isCompleting}>
                    {isCompleting ? 'Enviando...' : 'Confirmar'}
                </Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    elevation: 8,
    borderRadius: 15,
    backgroundColor: 'white',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 4 / 3, // Relación 4:3 forzada
    borderRadius: 8,
    resizeMode: 'contain', // O 'cover' si prefieres llenar el espacio
    marginBottom: 10,
  },
  descriptionInput: {
      marginTop: 10,
      marginBottom: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  }
});