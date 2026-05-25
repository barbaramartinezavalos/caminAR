import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // Usar provider google si es posible
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from '../../context/UserContext';

export default function MapPreview() {
  const theme = useTheme();
  const router = useRouter();
  const [region, setRegion] = useState<any>(null);
  const { challenges, loadingChallenges } = useUser();

  useEffect(() => {
    (async () => {
      // Permisos ya se manejan en el index, aquí intentamos obtener rápido
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const challengesWithLocation = challenges.filter(c => c.latitud && c.longitud).slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        {region ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            pointerEvents="none" // Desactivar interacción directa para que el toque vaya al contenedor
          >
             {/* Marcador Usuario */}
             <Marker coordinate={region}>
                <View style={[styles.userMarker, { backgroundColor: theme.colors.primary }]}>
                   <View style={styles.userMarkerInner} />
                </View>
             </Marker>

             {/* Marcadores Retos (Pequeños puntos) */}
             {challengesWithLocation.map(c => (
               <Marker
                 key={c.id}
                 coordinate={{ latitude: c.latitud!, longitude: c.longitud! }}
               >
                 <Icon name="map-marker" size={24} color={theme.colors.tertiary} />
               </Marker>
             ))}
          </MapView>
        ) : (
          <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
             <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {/* Overlay Gradiante o Sombra para texto */}
        <View style={styles.overlay}>
           <View style={styles.overlayContent}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#fff' }}>Mapa Interactivo</Text>
                <Text variant="bodySmall" style={{ color: '#f0f0f0' }}>
                  {challengesWithLocation.length} retos cerca de ti
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/mapa')}
              >
                 <Icon name="arrow-right" size={24} color="white" />
              </TouchableOpacity>
           </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    backgroundColor: 'white',
    height: 180,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparente oscuro
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  overlayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  }
});