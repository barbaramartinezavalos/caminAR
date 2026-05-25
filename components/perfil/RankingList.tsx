import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Icon, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { RankingListItem } from './RankingListItem';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';

interface RankingUser {
  id: number;
  usuario: string;
  puntaje_total: number;
  rank?: number;
}

export const RankingList = () => {
  const theme = useTheme();
  const { userId, totalScore } = useUser();
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<RankingUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRanking = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // 1. Obtener el Top 10 global
        const { data: topUsers, error } = await supabase
          .from('usuarios')
          .select('id, usuario, puntaje_total')
          .order('puntaje_total', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (isMounted && topUsers) {
          setRankingData(topUsers);

          // 2. Verificar si el usuario actual está en el top 10
          const userInTop10 = topUsers.find(u => u.id === userId);

          if (!userInTop10) {
            // Si no está, calcular su posición
            // Contamos cuántos usuarios tienen más puntaje que el usuario actual
            const currentScore = totalScore || 0;

            const { count, error: countError } = await supabase
              .from('usuarios')
              .select('*', { count: 'exact', head: true })
              .gt('puntaje_total', currentScore);

            if (!countError) {
              // Su ranking es (usuarios con más puntaje) + 1
              // Manejamos empate simple: mismo puntaje obtiene mismo rank "teórico" en esta lógica simplificada
              const myRank = (count || 0) + 1;

              // Obtenemos datos del usuario actual para mostrar
              const { data: userData } = await supabase
                .from('usuarios')
                .select('id, usuario, puntaje_total')
                .eq('id', userId)
                .single();

              if (userData) {
                setCurrentUserRank({ ...userData, rank: myRank });
              }
            }
          } else {
            setCurrentUserRank(null); // Ya se muestra en la lista principal
          }
        }
      } catch (err) {
        console.error("Error fetching ranking:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRanking();

    return () => { isMounted = false; };
  }, [userId, totalScore]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} color={theme.colors.primary} />
        <Text style={{marginTop: 10, color: theme.colors.outline}}>Cargando tabla de posiciones...</Text>
      </View>
    );
  }

  return (
    <Card style={{ backgroundColor: '#fff', marginBottom: 20 }}>
      <Card.Title
        title="Ranking Global"
        subtitle="Top usuarios de CaminAR"
        titleVariant="titleLarge"
        left={(props) => <Icon {...props} source="trophy-outline" size={28} color="#FFD700" />}
      />
      <Card.Content>
        <View>
          {rankingData.map((user, index) => (
            <React.Fragment key={user.id}>
              <RankingListItem
                rank={index + 1}
                name={user.usuario}
                score={user.puntaje_total}
                isCurrentUser={user.id === userId}
              />
              {index < rankingData.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {/* Si el usuario no está en el top 10, mostramos un separador y su posición */}
          {currentUserRank && (
            <>
              <View style={styles.separatorContainer}>
                <Icon source="dots-vertical" size={24} color={theme.colors.outline} />
              </View>
              <Divider />
              <RankingListItem
                rank={currentUserRank.rank || 999}
                name={currentUserRank.usuario}
                score={currentUserRank.puntaje_total}
                isCurrentUser={true}
              />
            </>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorContainer: {
    alignItems: 'center',
    marginVertical: 8,
  }
});