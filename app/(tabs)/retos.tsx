import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, StatusBar, TouchableOpacity, Dimensions, Image, ActivityIndicator as RNActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, Modal, Portal, Button, IconButton, TextInput, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, Reto } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const screenHeight = Dimensions.get('window').height;

// --- Componente Skeleton para Carga ---
const ChallengeSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
    </View>
  </View>
);

// --- Tarjeta de Reto Moderna ---
const RetoCard = ({ reto, onPress, isCompleted }: { reto: Reto, onPress: () => void, isCompleted: boolean }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.cardContainer}
    >
      <Surface style={styles.card} elevation={2}>
        {/* Imagen de portada con Badge de Puntos */}
        <View style={styles.imageContainer}>
          <Image
            // Usamos 800/600 para simular 4:3 en los placeholders
            source={{ uri: `https://picsum.photos/seed/${reto.id}/800/600` }}
            style={styles.cardImage}
          />
          {/* Gradiente sutil en la parte inferior de la imagen para leer texto si lo hubiera */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.imageGradient}
          />

          <View style={[styles.pointsBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon name="star" size={14} color={theme.colors.onPrimaryContainer} />
            <Text style={[styles.pointsText, { color: theme.colors.onPrimaryContainer }]}>
              +{reto.puntos_otorgados}
            </Text>
          </View>

          {isCompleted && (
            <View style={styles.completedOverlay}>
              <View style={styles.completedBadge}>
                <Icon name="check" size={20} color="white" />
                <Text style={styles.completedText}>Completado</Text>
              </View>
            </View>
          )}
        </View>

        {/* Contenido de la tarjeta */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>{reto.titulo}</Text>
            {reto.latitud && (
               <Icon name="map-marker" size={18} color={theme.colors.tertiary} />
            )}
          </View>
          <Text variant="bodySmall" style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {reto.descripcion}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

export default function RetosScreen() {
  const { challenges, loadingChallenges, completeChallenge, completedChallengeIds, loadingCompletedChallenges } = useUser();
  const { user } = useAuth();
  const theme = useTheme();

  const [selectedReto, setSelectedReto] = useState<Reto | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const shot = useRef<ViewShot>(null);

  // --- Acciones ---

  const showModal = (reto: Reto) => {
    setSelectedReto(reto);
    setIsModalVisible(true);
    setPhoto(null);
    setDescription('');
    setIsCompleting(false);
  };

  const hideModal = () => {
    if (!isCompleting) {
        setIsModalVisible(false);
        // Pequeño delay para limpiar estado visual
        setTimeout(() => {
            setSelectedReto(null);
            setPhoto(null);
        }, 300);
    }
  };

  const handleTomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Mantenemos 4:3 para la cámara
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleConfirmar = async () => {
     if (!selectedReto || !photo || !user) return;
     setIsCompleting(true);
     try {
         const result = await completeChallenge(selectedReto, photo, description);
         if (result.success) {
             Alert.alert("¡Fantástico!", `Has ganado ${selectedReto.puntos_otorgados} puntos.`);
             // No cerramos modal inmediatamente si queremos que compartan, o podemos cerrarlo:
             // hideModal();
         } else {
             Alert.alert("Ups", result.message || "Error al completar.");
         }
     } catch (error: any) {
         Alert.alert("Error", error.message);
     } finally {
         setIsCompleting(false);
     }
  };

  const handleShare = async () => {
    if (!shot.current) return;
    try {
        const uri = await shot.current.capture?.();
        if (uri) {
            await Sharing.shareAsync(uri);
        }
    } catch (e) {
        console.log(e);
    }
  };

  // --- Renderizado ---

  const isLoading = loadingChallenges || loadingCompletedChallenges;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* ESTILO HOME: StatusBar con iconos oscuros sobre fondo claro */}
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* ESTILO HOME: Header limpio con elevación sutil */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface, elevation: 2, zIndex: 1 }}>
        <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Desafíos</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                Supera retos y gana puntos eco
            </Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
            // Mostrar 3 esqueletos mientras carga
            <>
                <ChallengeSkeleton />
                <ChallengeSkeleton />
                <ChallengeSkeleton />
            </>
        ) : challenges.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Icon name="trophy-broken" size={60} color={theme.colors.outline} />
                <Text style={{ marginTop: 10, color: theme.colors.outline }}>No hay desafíos disponibles.</Text>
            </View>
        ) : (
            // Ordenar: No completados primero
            [...challenges]
                .sort((a, b) => {
                    const aComp = completedChallengeIds.has(a.id);
                    const bComp = completedChallengeIds.has(b.id);
                    return aComp === bComp ? 0 : aComp ? 1 : -1;
                })
                .map((reto) => (
                    <RetoCard
                        key={reto.id}
                        reto={reto}
                        onPress={() => showModal(reto)}
                        isCompleted={completedChallengeIds.has(reto.id)}
                    />
                ))
        )}
      </ScrollView>

      {/* --- Modal de Detalle --- */}
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer}
        >
            {/* Botón Cerrar Flotante */}
            <TouchableOpacity style={styles.closeButton} onPress={hideModal} disabled={isCompleting}>
                <Icon name="close" size={20} color="#333" />
            </TouchableOpacity>

            <ViewShot ref={shot} options={{ format: 'jpg', quality: 0.9 }} style={{backgroundColor: 'white'}}>
                <ScrollView>
                    {selectedReto && (
                        <>
                            <Image
                                // Placeholder también en 4:3
                                source={{ uri: photo || `https://picsum.photos/seed/${selectedReto.id}/800/600` }}
                                style={styles.modalImage}
                            />
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeaderRow}>
                                    <Text variant="headlineSmall" style={styles.modalTitle}>{selectedReto.titulo}</Text>
                                    <View style={[styles.pointsBadge, { backgroundColor: theme.colors.secondaryContainer, top: 0, right: 0, position: 'relative' }]}>
                                        <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
                                            +{selectedReto.puntos_otorgados}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.modalDesc, { color: theme.colors.onSurfaceVariant }]}>
                                    {selectedReto.descripcion}
                                </Text>

                                {completedChallengeIds.has(selectedReto.id) ? (
                                    <Surface style={styles.completedBanner} elevation={0}>
                                        <Icon name="trophy" size={24} color={theme.colors.primary} />
                                        <Text style={{ marginLeft: 10, color: theme.colors.primary, fontWeight: 'bold' }}>
                                            ¡Desafío Completado!
                                        </Text>
                                    </Surface>
                                ) : (
                                    <>
                                        {/* Input condicional si hay foto */}
                                        {photo && !isCompleting && (
                                            <TextInput
                                                label="Comentario (opcional)"
                                                value={description}
                                                onChangeText={setDescription}
                                                mode="outlined"
                                                style={{ marginVertical: 10, backgroundColor: 'white' }}
                                                multiline
                                            />
                                        )}
                                    </>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            </ViewShot>

            {/* Footer de Acciones */}
            {selectedReto && !completedChallengeIds.has(selectedReto.id) && (
                <View style={styles.modalFooter}>
                    {isCompleting ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                            <RNActivityIndicator color={theme.colors.primary} style={{ marginRight: 10 }} />
                            <Text>Validando...</Text>
                        </View>
                    ) : !photo ? (
                        <Button
                            mode="contained"
                            onPress={handleTomarFoto}
                            icon="camera"
                            style={styles.actionBtn}
                            contentStyle={{ height: 50 }}
                        >
                            Tomar Evidencia
                        </Button>
                    ) : (
                        <View style={styles.confirmActions}>
                            <Button onPress={() => setPhoto(null)} style={{ flex: 1, marginRight: 8 }}>Reintentar</Button>
                            <Button
                                mode="contained"
                                onPress={handleConfirmar}
                                style={{ flex: 2 }}
                                contentStyle={{ height: 50 }}
                            >
                                Confirmar
                            </Button>
                        </View>
                    )}
                </View>
            )}

            {/* Footer si está completado (Compartir) */}
            {selectedReto && completedChallengeIds.has(selectedReto.id) && (
                 <View style={styles.modalFooter}>
                    <Button
                        mode="outlined"
                        onPress={handleShare}
                        icon="share-variant"
                        style={styles.actionBtn}
                    >
                        Compartir Logro
                    </Button>
                 </View>
            )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  // --- Estilos Tarjeta ---
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden', // Para que la imagen respete el borde
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 60,
  },
  pointsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 8,
  },
  completedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  // --- Estilos Modal ---
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 4 / 3, // Relación de aspecto 4:3 forzada
    resizeMode: 'cover',
  },
  modalContent: {
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'white',
  },
  actionBtn: {
    borderRadius: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  completedBanner: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  // --- Estilos Skeleton ---
  skeletonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
  },
  skeletonImage: {
    height: 160,
    backgroundColor: '#E0E0E0',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
    borderRadius: 4,
  },
  skeletonText: {
    height: 14,
    width: '90%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  }
});