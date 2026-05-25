import React from 'react';
import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
// Add Button import
import { Card, Text, Chip, useTheme, Button } from 'react-native-paper';
import { Reward } from '../../models/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from '../../context/UserContext'; // Import useUser to check points
import { useRouter } from 'expo-router'; // --- IMPORTADO ---

// Add onRedeem and isAlreadyRedeemed props
export default function AvailableRewardCard({ r, onRedeem, isAlreadyRedeemed }: { r: Reward, onRedeem: (reward: Reward) => void, isAlreadyRedeemed: boolean }) {
  const theme = useTheme();
  const router = useRouter(); // --- AÑADIDO ---
  const { totalScore } = useUser(); // Get user's points

  const canAfford = totalScore >= r.pointsRequired;
  // Check availability (current > 0 OR total is 0/null indicating unlimited)
  const isAvailable = r.availability.total === 0 || r.availability.current > 0;
  // Can redeem only if affordable, available AND not already redeemed
  const canRedeem = canAfford && isAvailable && !isAlreadyRedeemed;

  const handlePressRedeem = () => {
    // Show specific alerts based on why redemption is not possible
    if (isAlreadyRedeemed) {
        Alert.alert("Ya Canjeado", "Ya has canjeado este premio anteriormente.");
        return;
    }
    if (!canAfford) {
        Alert.alert("Puntos insuficientes", `Necesitas ${r.pointsRequired} puntos para canjear este premio.`);
        return;
    }
    if (!isAvailable) {
        Alert.alert("No disponible", "Este premio ya no está disponible.");
        return;
    }

    // Call the passed function if all checks pass
    onRedeem(r);
  };

  // Determine button label based on state
  const buttonLabel = isAlreadyRedeemed ? 'Ya canjeado' :
                      canAfford ? (isAvailable ? 'Canjear' : 'No disponible') :
                      'Puntos insuficientes';

  return (
    <Card style={styles.card} mode="elevated">
      <View>
        <Card.Cover source={{ uri: r.imageUrl }} style={styles.cover} />
        <View style={styles.overlay}>
          <Chip style={styles.categoryChip} textStyle={{color: 'white'}}>{r.category}</Chip>
          <Chip
             style={[styles.pointsChip, !canAfford && styles.pointsChipDisabled]} // Style if cannot afford
             textStyle={{ color: canAfford ? theme.colors.primary : theme.colors.error, fontWeight: 'bold' }}
           >
             {r.pointsRequired} pts
          </Chip>
        </View>
      </View>
      <Card.Content style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>{r.title}</Text>
        <Text variant="bodyMedium" style={styles.partner}>Por {r.partner}</Text>
        <Text variant="bodyMedium" style={styles.description}>{r.description}</Text>
        <View style={styles.infoRow}>
          <Icon name="calendar-check" size={16} color="#666" />
          <Text style={styles.infoText}>Válido hasta {r.validUntil}</Text>
        </View>

        {/* --- CAMBIO: Añadido link al mapa si hay lat/lon --- */}
        {r.latitud && r.longitud ? (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => router.push({
              pathname: '/mapa',
              params: { lat: r.latitud, lon: r.longitud, title: r.title }
            })}
          >
            <Icon name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.primary, textDecorationLine: 'underline' }]}>Ver ubicación</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={16} color="#666" />
            <Text style={styles.infoText}>{r.locations}</Text>
          </View>
        )}

        {/* Only show availability if it's limited (total > 0) */}
        {r.availability.total > 0 && (
            <View style={styles.availability}>
            <Text style={styles.infoText}>Disponibilidad</Text>
            <Text style={[styles.availabilityCount, !isAvailable && styles.availabilityNone]}>
                {isAvailable ? `${r.availability.current} de ${r.availability.total}` : 'Agotado'}
            </Text>
            </View>
        )}
      </Card.Content>
       {/* Add Redeem Button */}
       <Card.Actions style={styles.actions}>
            <Button
                mode="contained"
                icon="gift-outline"
                onPress={handlePressRedeem}
                 // Disable if canRedeem is false (covers all conditions)
                disabled={!canRedeem}
                style={[styles.redeemButton, isAlreadyRedeemed && styles.redeemedButton]} // Add specific style if already redeemed
                labelStyle={styles.redeemButtonLabel}
            >
               {buttonLabel}
            </Button>
       </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, backgroundColor: 'white' },
  cover: { height: 150 },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryChip: { backgroundColor: 'rgba(0,0,0,0.5)' },
  pointsChip: { backgroundColor: 'white' },
  pointsChipDisabled: { backgroundColor: '#ffebee' }, // Light red background if cannot afford
  content: { paddingTop: 16 },
  title: { fontWeight: 'bold', marginBottom: 4 },
  partner: { color: '#666', marginBottom: 8 },
  description: { marginBottom: 16, lineHeight: 21 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 8, color: '#666' },
  availability: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  availabilityCount: { fontWeight: 'bold', color: '#333' },
  availabilityNone: { color: 'red', fontWeight: 'bold' }, // Style for 'Agotado'
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'flex-end', // Align button to the right
  },
  redeemButton: {
    borderRadius: 20,
  },
   redeemedButton: {
      backgroundColor: '#e0e0e0', // Grey out button if already redeemed
   },
  redeemButtonLabel: {
    // Style for the button text if needed
  },
});
