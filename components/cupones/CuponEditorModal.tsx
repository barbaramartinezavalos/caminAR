import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Platform } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, TextInput, ActivityIndicator, IconButton, Switch } from 'react-native-paper';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../lib/storage';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import RNDateTimePicker from '@react-native-community/datetimepicker';

interface CuponFormInputs {
  titulo: string;
  descripcion: string;
  puntos_necesarios: string;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  max_canjeos: string;
  disponible: boolean;
}

interface MisCupones {
  id: number;
  titulo: string;
  descripcion: string | null;
  puntos_necesarios: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  codigo_cupon: string;
  disponible: boolean;
  canjeos_actuales: number;
  max_canjeos: number | null;
  imagen_url: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface Props {
  visible: boolean;
  onClose: (refresh: boolean) => void;
  cupon: MisCupones | null;
  userId: number;
}

export const CuponEditorModal = ({ visible, onClose, cupon, userId }: Props) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const [imagenUri, setImagenUri] = useState<string | null>(cupon?.imagen_url || null);

  const [location, setLocation] = useState<{ latitud: number, longitud: number } | null>(
    cupon && cupon.latitud && cupon.longitud ? { latitud: cupon.latitud, longitud: cupon.longitud } : null
  );
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  const [showInicioPicker, setShowInicioPicker] = useState(false);
  const [showFinPicker, setShowFinPicker] = useState(false);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CuponFormInputs>({
    defaultValues: {
      titulo: cupon?.titulo || '',
      descripcion: cupon?.descripcion || '',
      puntos_necesarios: cupon?.puntos_necesarios?.toString() || '',
      fecha_inicio: cupon?.fecha_inicio ? new Date(cupon.fecha_inicio) : new Date(),
      fecha_fin: cupon?.fecha_fin ? new Date(cupon.fecha_fin) : null,
      max_canjeos: cupon?.max_canjeos?.toString() || '',
      disponible: cupon?.disponible ?? true,
    }
  });

  const fechaInicioVal = watch('fecha_inicio');
  const fechaFinVal = watch('fecha_fin');
  const disponibleVal = watch('disponible');

  // --- Lógica de Imagen ---
  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso denegado", "Se necesita acceso a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Cambiado a 4:3 para consistencia
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImagenUri(result.assets[0].uri);
    }
  };

  const openMap = async () => {
    let region: Region;
    if (location) {
      region = { ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permiso denegado", "Se necesita acceso a la ubicación.");
        region = { latitude: -31.394, longitude: -58.018, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      } else {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        } catch (e) {
          region = { latitude: -31.394, longitude: -58.018, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        }
      }
    }
    setMapRegion(region);
    setMapVisible(true);
  };

  const onMapRegionChange = (region: Region) => {
    setMapRegion(region);
  };

  const confirmLocation = () => {
    if (mapRegion) {
      setLocation({ latitud: mapRegion.latitude, longitud: mapRegion.longitude });
    }
    setMapVisible(false);
  };

  const onSubmit: SubmitHandler<CuponFormInputs> = async (data) => {
    setLoading(true);
    let finalImageUrl = cupon?.imagen_url || null;

    try {
      if (imagenUri && imagenUri !== cupon?.imagen_url) {
        setIsUploading(true);
        const uploadedUrl = await uploadImage(imagenUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          throw new Error("No se pudo subir la imagen.");
        }
        setIsUploading(false);
      }

      const codigo_cupon = cupon?.codigo_cupon || `CAM${Date.now().toString(36).substr(2, 9).toUpperCase()}`;

      const cuponData = {
        titulo: data.titulo,
        descripcion: data.descripcion,
        puntos_necesarios: parseInt(data.puntos_necesarios, 10),
        fecha_inicio: data.fecha_inicio.toISOString().split('T')[0],
        fecha_fin: data.fecha_fin ? data.fecha_fin.toISOString().split('T')[0] : null,
        max_canjeos: data.max_canjeos ? parseInt(data.max_canjeos, 10) : null,
        disponible: data.disponible,
        imagen_url: finalImageUrl,
        latitud: location?.latitud || null,
        longitud: location?.longitud || null,
        usuario_creador_id: userId,
        codigo_cupon: codigo_cupon,
      };

      let error = null;
      if (cupon) {
        const { error: updateError } = await supabase
          .from('cupones')
          .update(cuponData)
          .eq('id', cupon.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cupones')
          .insert(cuponData);
        error = insertError;
      }

      if (error) throw error;

      Alert.alert("Éxito", `Cupón ${cupon ? 'actualizado' : 'creado'} correctamente.`);
      onClose(true);

    } catch (error: any) {
      console.error("Error al guardar cupón:", error.message);
      Alert.alert("Error", `No se pudo guardar el cupón: ${error.message}`);
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={() => onClose(false)} contentContainerStyle={styles.modalContainer}>
        <ScrollView>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
            <Text variant="headlineSmall" style={{ color: '#fff' }}>
              {cupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
            </Text>
            <IconButton icon="close" iconColor="#fff" onPress={() => onClose(false)} />
          </View>

          <View style={styles.formContent}>

            <Controller
              control={control}
              rules={{ required: 'El título es requerido' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Título del Cupón"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.titulo}
                  style={styles.input}
                />
              )}
              name="titulo"
            />
            {errors.titulo && <Text style={styles.errorText}>{errors.titulo.message}</Text>}

            <Controller
              control={control}
              rules={{ required: 'La descripción es requerida' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Descripción"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.descripcion}
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />
              )}
              name="descripcion"
            />
            {errors.descripcion && <Text style={styles.errorText}>{errors.descripcion.message}</Text>}

            <Controller
              control={control}
              rules={{ required: 'Los puntos son requeridos', pattern: { value: /^[0-9]+$/, message: 'Solo números' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Puntos Necesarios"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.puntos_necesarios}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              )}
              name="puntos_necesarios"
            />
            {errors.puntos_necesarios && <Text style={styles.errorText}>{errors.puntos_necesarios.message}</Text>}

            <Controller
              control={control}
              rules={{ pattern: { value: /^[0-9]*$/, message: 'Solo números' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Máx. Canjeos (0 o vacío para ilimitado)"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.max_canjeos}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              )}
              name="max_canjeos"
            />
            {errors.max_canjeos && <Text style={styles.errorText}>{errors.max_canjeos.message}</Text>}

            <TouchableOpacity onPress={() => setShowInicioPicker(true)}>
              <TextInput
                label="Fecha de Inicio"
                mode="outlined"
                value={fechaInicioVal.toLocaleDateString()}
                editable={false}
                style={styles.input}
              />
            </TouchableOpacity>
            {showInicioPicker && (
              <RNDateTimePicker
                value={fechaInicioVal}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowInicioPicker(false);
                  if (date) setValue('fecha_inicio', date);
                }}
              />
            )}

            <TouchableOpacity onPress={() => setShowFinPicker(true)}>
              <TextInput
                label="Fecha de Fin (Opcional)"
                mode="outlined"
                value={fechaFinVal ? fechaFinVal.toLocaleDateString() : 'Sin fecha límite'}
                editable={false}
                style={styles.input}
                right={<TextInput.Icon icon="close" onPress={() => setValue('fecha_fin', null)} />}
              />
            </TouchableOpacity>
            {showFinPicker && (
              <RNDateTimePicker
                value={fechaFinVal || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowFinPicker(false);
                  if (date) setValue('fecha_fin', date);
                }}
              />
            )}

            <View style={styles.switchContainer}>
              <Text variant="bodyLarge">Disponible para canjear</Text>
              <Switch value={disponibleVal} onValueChange={(val) => setValue('disponible', val)} />
            </View>

            <Text variant="bodyLarge" style={{marginBottom: 8, marginTop: 16}}>Imagen del Cupón</Text>
            <TouchableOpacity onPress={handleSelectImage}>
              {isUploading ? (
                <ActivityIndicator style={styles.imagePreview} />
              ) : (
                <Image
                  source={{ uri: imagenUri || 'https://placehold.co/800x600/e0e0e0/777?text=Toca+para+subir+imagen' }} // Placeholder 4:3
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>

            <Text variant="bodyLarge" style={{marginBottom: 8, marginTop: 16}}>Ubicación (Opcional)</Text>
            <Button icon="map-marker" mode="outlined" onPress={openMap}>
              {location ? `Lat: ${location.latitud.toFixed(4)}, Lon: ${location.longitud.toFixed(4)}` : 'Seleccionar Ubicación en Mapa'}
            </Button>
            {location && (
               <Button icon="map-marker-off" mode="text" onPress={() => setLocation(null)} textColor={theme.colors.error}>
                 Quitar Ubicación
               </Button>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading || isUploading}
              style={styles.saveButton}
            >
              {loading ? 'Guardando...' : (cupon ? 'Actualizar Cupón' : 'Crear Cupón')}
            </Button>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={mapVisible} onDismiss={() => setMapVisible(false)} contentContainerStyle={styles.mapModal}>
        <View style={{ flex: 1 }}>
          {mapRegion ? (
            <>
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                onRegionChangeComplete={onMapRegionChange}
              />
              <View style={styles.mapMarkerContainer}>
                <Image source={require('../../assets/images/1.png')} style={styles.mapMarker} resizeMode="contain" />
              </View>
              <Button mode="contained" onPress={confirmLocation} style={styles.mapConfirmButton}>
                Confirmar Ubicación
              </Button>
              <IconButton icon="close" style={styles.mapCloseButton} iconColor="#fff" containerColor={theme.colors.primary} onPress={() => setMapVisible(false)} />
            </>
          ) : (
            <ActivityIndicator style={{flex: 1}} />
          )}
        </View>
      </Modal>

    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 15,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  formContent: {
    padding: 20,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: '#B00020',
    marginTop: -8,
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3, // Relación 4:3 forzada
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  mapModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarkerContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -25 }, { translateY: -50 }],
  },
  mapMarker: {
    width: 50,
    height: 50,
  },
  mapConfirmButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  mapCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  }
});