import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { PhotoDetailModal } from './PhotoDetailModal';
import { useUser } from '../../context/UserContext';

interface Photo {
  id: number;
  url_foto: string;
  descripcion?: string;
  fecha_subida: string;
}

interface Props {
  userId: number;
}

const numColumns = 3;
const { width } = Dimensions.get('window');
// Estilo Instagram: espacio mínimo (1px) entre fotos
const gap = 1;
const itemSize = (width - (gap * (numColumns - 1))) / numColumns;

export const PhotosGrid = ({ userId }: Props) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const theme = useTheme();

  // Obtenemos info básica para pasar al modal si es necesario (opcional)
  // En un caso real, idealmente pasarías el perfil completo del usuario dueño de la foto

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('fotos_participaciones')
          .select('id, url_foto, descripcion, fecha_subida') // Traemos más datos para el detalle
          .eq('usuario_id', userId)
          .order('fecha_subida', { ascending: false });

        if (error) throw error;
        setPhotos(data || []);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png' }}
                style={{ width: 40, height: 40, tintColor: theme.colors.primary, opacity: 0.8 }}
            />
        </View>
        <Text variant="titleMedium" style={{ marginTop: 16, fontWeight: 'bold', color: theme.colors.onSurface }}>
            Sin fotos aún
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Cuando completes retos, tus fotos aparecerán aquí.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        scrollEnabled={false} // El scroll lo maneja el padre (Perfil)

        // Ajuste para los espacios entre columnas
        columnWrapperStyle={{ gap: gap }}
        // Ajuste para el espacio entre filas
        contentContainerStyle={{ gap: gap, paddingBottom: 20 }}

        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedPhoto(item)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.url_foto }}
              style={{
                  width: itemSize,
                  height: itemSize,
                  backgroundColor: theme.colors.surfaceVariant, // Placeholder color mientras carga
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />

      {selectedPhoto && (
          <PhotoDetailModal
            visible={!!selectedPhoto}
            onDismiss={() => setSelectedPhoto(null)}
            photoUrl={selectedPhoto.url_foto}
            photoId={selectedPhoto.id}
            photoOwnerId={userId}
            description={selectedPhoto.descripcion} // Pasamos la descripción
            date={selectedPhoto.fecha_subida} // Pasamos la fecha
          />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 2, // Pequeño margen superior
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8
  }
});