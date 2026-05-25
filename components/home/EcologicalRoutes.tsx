import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser, Reto } from '../../context/UserContext';
import { useRouter } from 'expo-router';

const ChallengeItem = ({ challenge, onPress }: { challenge: Reto, onPress: () => void }) => {
  const theme = useTheme();

  let iconName = 'walk';
  let iconColor = theme.colors.primary;
  let bgIconColor = theme.colors.secondaryContainer;

  if (challenge.titulo.toLowerCase().includes('recicl')) {
    iconName = 'recycle';
    iconColor = '#2E7D32'; // Verde oscuro
    bgIconColor = '#E8F5E9';
  } else if (challenge.titulo.toLowerCase().includes('foto')) {
    iconName = 'camera';
    iconColor = '#1565C0'; // Azul
    bgIconColor = '#E3F2FD';
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.itemContainer} elevation={1}>
        <View style={[styles.iconContainer, { backgroundColor: bgIconColor }]}>
          <Icon name={iconName} size={24} color={iconColor} />
        </View>

        <View style={styles.infoContainer}>
          <Text variant="titleSmall" style={styles.itemTitle} numberOfLines={1}>
            {challenge.titulo}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {challenge.descripcion || 'Sin descripción'}
          </Text>
        </View>

        <View style={styles.pointsBadge}>
          <Text style={[styles.pointsText, { color: theme.colors.primary }]}>
            +{challenge.puntos_otorgados}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

export default function EcologicalRoutes() {
  const { challenges, loadingChallenges } = useUser();
  const theme = useTheme();
  const router = useRouter();

  // Mostramos solo los primeros 3 para no saturar el home
  const displayChallenges = challenges.slice(0, 3);

  if (loadingChallenges) {
    // Skeleton simple para la lista
    return (
      <View style={{ gap: 10 }}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.skeletonItem, { backgroundColor: theme.colors.surfaceVariant }]} />
        ))}
      </View>
    );
  }

  if (displayChallenges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="leaf-off" size={40} color={theme.colors.outline} />
        <Text style={{ color: theme.colors.outline, marginTop: 8 }}>No hay retos cercanos.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {displayChallenges.map(challenge => (
        <ChallengeItem
          key={challenge.id}
          challenge={challenge}
          onPress={() => router.push('/retos')} // Lleva a la pestaña de retos
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pointsBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  pointsText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  skeletonItem: {
    height: 72,
    borderRadius: 16,
    width: '100%',
    opacity: 0.5,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd'
  }
});