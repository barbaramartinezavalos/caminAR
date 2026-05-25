import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card, Text, useTheme, Icon } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';

type Props = {
  icon: IconSource;
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>; // Añadimos soporte para estilos externos
};

export const StatGridItem = ({ icon, value, label, style }: Props) => {
  const theme = useTheme();

  return (
    <Card style={[styles.card, style]} mode="outlined">
      <Card.Content style={styles.content}>
        <Icon source={icon} size={32} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.valueText}>
          {value}
        </Text>
        <Text variant="bodySmall" style={styles.labelText}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    // Eliminamos el width: '48%' fijo para que sea flexible
    marginBottom: 10,
    backgroundColor: 'white',
    flex: 1, // Permite que la tarjeta llene el espacio del contenedor
  },
  content: {
    alignItems: 'center',
    padding: 16,
  },
  valueText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  labelText: {
    marginTop: 2,
    textAlign: 'center',
  },
});