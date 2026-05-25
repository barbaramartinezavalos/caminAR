import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Challenge } from '../../models/types';
import ChallengeCard from './ChallengeCard';

export default function ChallengeSections({ data }: { data: Challenge[] }) {
  // Filtramos los desafíos por su estado
  const completed = data.filter((c) => c.status === 'completed');
  const inProgress = data.filter((c) => c.status === 'in_progress');
  const available = data.filter((c) => c.status === 'available');

  return (
    <View>
      {/* Sección para el desafío en progreso */}
      {inProgress.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Desafío Actual</Text>
          {inProgress.map((c) => <ChallengeCard key={c.id} c={c} />)}
        </View>
      )}

      {/* Sección para los desafíos disponibles */}
      {available.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Desafíos Disponibles</Text>
          {available.map((c) => <ChallengeCard key={c.id} c={c} />)}
        </View>
      )}

      {/* Sección para los desafíos completados */}
      {completed.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Desafíos Completados</Text>
          {completed.map((c) => <ChallengeCard key={c.id} c={c} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32, // Aumentamos el espacio entre secciones para mayor claridad
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
});

