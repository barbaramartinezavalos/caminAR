import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Chip, useTheme } from 'react-native-paper';

type Props = {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
};

export const RankingListItem = ({ rank, name, score, isCurrentUser = false }: Props) => {
  const theme = useTheme();
  // Estilo condicional para resaltar al usuario actual
  const itemStyle = [
    styles.container,
    isCurrentUser && {
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: 12,
    }
  ];

  return (
    <View style={itemStyle}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankNumber}>{rank}</Text>
      </View>
      <Avatar.Icon size={40} icon="account-outline" style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text variant="titleMedium">{name}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {score} puntos
        </Text>
      </View>
      {isCurrentUser && (
        <Chip
            style={{ backgroundColor: theme.colors.secondary }}
            textStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
        >
            Tú
        </Chip>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#06543a', // Tu color primario
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
});
