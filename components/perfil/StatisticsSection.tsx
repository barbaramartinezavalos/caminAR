import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { StatGridItem } from './StatGridItem';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';

export const StatisticsSection = () => {
  const theme = useTheme();
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cuponesCanjeados: 0,
    retosCompletados: 0,
    fotosCompartidas: 0,
    seguidores: 0,
    seguidos: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // 1. Cupones
        const { count: cuponesCount } = await supabase
          .from('cupones_canjeados')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', userId);

        // 2. Retos
        const { count: retosCount } = await supabase
          .from('retos_completados')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', userId);

        // 3. Fotos
        const { count: fotosCount } = await supabase
          .from('fotos_participaciones')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', userId);

        // 4. Seguidores (Yo soy el seguido_id)
        const { count: seguidoresCount } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguido_id', userId);

        // 5. Seguidos (Yo soy el seguidor_id)
        const { count: seguidosCount } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguidor_id', userId);

        if (isMounted) {
          setStats({
            cuponesCanjeados: cuponesCount || 0,
            retosCompletados: retosCount || 0,
            fotosCompartidas: fotosCount || 0,
            seguidores: seguidoresCount || 0,
            seguidos: seguidosCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();

    return () => { isMounted = false; };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Card style={styles.container} mode="elevated">
      <Card.Title
        title="Estadísticas"
        titleVariant="titleLarge"
        left={(props) => <Text {...props} style={{ fontSize: 24 }}>📊</Text>}
      />
      <Card.Content>
        <View style={styles.gridContainer}>
          {/* Fila 1: Cupones y Retos */}
          <View style={styles.row}>
            <StatGridItem
                style={styles.halfWidth}
                icon="ticket-percent-outline"
                value={stats.cuponesCanjeados}
                label="Cupones"
            />
            <View style={styles.spacer} />
            <StatGridItem
                style={styles.halfWidth}
                icon="check-decagram-outline"
                value={stats.retosCompletados}
                label="Retos"
            />
          </View>

          {/* Fila 2: Seguidores y Seguidos (Nueva Fila) */}
          <View style={styles.row}>
            <StatGridItem
                style={styles.halfWidth}
                icon="account-group"
                value={stats.seguidores}
                label="Seguidores"
            />
            <View style={styles.spacer} />
            <StatGridItem
                style={styles.halfWidth}
                icon="account-arrow-right"
                value={stats.seguidos}
                label="Seguidos"
            />
          </View>

          {/* Fila 3: Fotos (Ancho completo) */}
          <View style={styles.row}>
            <StatGridItem
                style={{ width: '100%' }}
                icon="camera-outline"
                value={stats.fotosCompartidas}
                label="Fotos Compartidas en la Comunidad"
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfWidth: {
    flex: 1,
  },
  spacer: {
    width: 10,
  }
});