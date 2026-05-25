import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, useTheme, Icon } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';

type Props = {
  icon: IconSource;
  value: string | number;
  label: string;
};

export const StatCard = ({ icon, value, label }: Props) => {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.content}>
        <Icon source={icon} size={32} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={[styles.valueText, { color: theme.colors.primary }]}>{value}</Text>
        <Text variant="bodyMedium">{label}</Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
    justifyContent: 'center',
  },
  valueText: {
    marginTop: 8,
    fontWeight: 'bold',
  }
});
