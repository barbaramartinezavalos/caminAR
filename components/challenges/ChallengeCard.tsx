import * as Sharing from 'expo-sharing';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Button, Card, Text, ProgressBar, Chip, useTheme } from 'react-native-paper';
import { Challenge } from '../../models/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ChallengeCard({ c }: { c: Challenge }) {
  const shot = useRef<ViewShot>(null);
  const theme = useTheme();

  const shareImage = async () => {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { dialogTitle: '¡Mira mi logro en CaminAR!' });
      }
    } catch (error) {
      console.error("Error al compartir la imagen", error);
    }
  };

  const pct = c.progress ? Math.round((c.progress.current / c.progress.total) * 100) : 0;

  const renderActions = () => {
    switch (c.status) {
      case 'in_progress':
        return <Button mode="contained" onPress={() => {}} style={styles.actionButton}>Continuar Desafío</Button>;
      case 'available':
        return <Button mode="outlined" onPress={() => {}} style={styles.actionButton}>Iniciar Desafío</Button>;
      case 'completed':
        return <Button mode="contained" icon="share-variant" onPress={shareImage} style={styles.actionButton}>Compartir Logro</Button>;
      default:
        return null;
    }
  };

  return (
    <ViewShot ref={shot} options={{ format: 'png', quality: 0.9 }}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {/* Cabecera reorganizada para evitar solapamientos */}
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>{c.title}</Text>
            <View style={styles.headerRight}>
              {c.points && <Text variant="titleLarge" style={[styles.points, { color: theme.colors.primary }]}>+{c.points} pts</Text>}
            </View>
          </View>

          {/* El chip "Activo" ahora está fuera de la cabecera para no interferir */}
          {c.status === 'in_progress' && <Chip style={styles.activeChip} textStyle={styles.activeChipText}>Activo</Chip>}

          <Text variant="bodyMedium" style={styles.description}>{c.description}</Text>

          {c.tags && (
            <View style={styles.tagsContainer}>
              {c.tags.map(tag => <Chip key={tag} style={styles.chip} textStyle={styles.chipText}>{tag}</Chip>)}
            </View>
          )}

          {c.status === 'in_progress' && c.progress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressInfo}>
                  <View style={styles.infoItem}>
                      <Icon name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                      <Text style={styles.infoText}>{c.duration} días</Text>
                  </View>
                  <Text style={styles.progressText}>{c.progress.current}/{c.progress.total}</Text>
              </View>
              <ProgressBar progress={pct / 100} color={theme.colors.primary} style={styles.progressBar} />
            </View>
          )}

          {renderActions()}
        </Card.Content>
      </Card>
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontWeight: 'bold',
    flex: 1, // Permite que el título ocupe el espacio disponible
    marginRight: 8,
  },
  points: {
    fontWeight: 'bold',
  },
  activeChip: {
    alignSelf: 'flex-start', // Se alinea a la izquierda
    backgroundColor: '#FFD700',
    marginTop: 8,
    marginBottom: 4,
  },
  activeChipText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 12,
  },
  description: {
    color: '#666',
    lineHeight: 21,
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    height: 32,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  chipText: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 4,
    color: '#666',
  },
  progressText: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  actionButton: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 50,
  },
});

