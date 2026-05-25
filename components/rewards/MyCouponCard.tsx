import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { Coupon } from '../../models/types';

export default function MyCouponCard({ c }: { c: Coupon }) {
  const theme = useTheme();
  const isActive = c.status === 'active';

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{c.title}</Text>
          <Chip
            icon={isActive ? 'check-circle' : 'close-circle'}
            style={[styles.statusChip, { backgroundColor: isActive ? theme.colors.primary : '#A9A9A9' }]} // Gris para "Usado"
            textStyle={{ color: 'white' }}
          >
            {isActive ? 'Activo' : 'Usado'}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.partner}>Válido en {c.partner}</Text>

        <View style={[styles.codeSection, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.codeLabel}>Código del cupón:</Text>
          <Text style={styles.codeText}>{c.code}</Text>
        </View>

        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>Canjeado: {c.redeemedDate}</Text>
          <Text style={styles.dateText}>Expira: {c.expiryDate}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: { fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusChip: { height: 32, alignItems: 'center' },
  partner: { color: '#666', marginBottom: 16 },
  codeSection: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: { color: '#666' },
  codeText: {
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 4,
    letterSpacing: 2,
    color: '#333',
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 12, color: '#666' },
});

