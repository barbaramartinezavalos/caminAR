import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Import useMemo
import { ScrollView, StyleSheet, View, StatusBar, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Added Button, Modal, Portal, IconButton
import { Text, useTheme, SegmentedButtons, Chip, Button, Modal, Portal, IconButton, Surface } from 'react-native-paper';
import AvailableRewardCard from '../../components/rewards/AvailableRewardCard';
import MyCouponCard from '../../components/rewards/MyCouponCard';
import { supabase } from '../../lib/supabase';
// Need updateProfile function from context
import { useUser, UserProfileData } from '../../context/UserContext';
import { Reward, Coupon } from '../../models/types';
import QRCode from 'react-native-qrcode-svg'; // Import QR Code library
import * as Clipboard from 'expo-clipboard'; // Import Clipboard
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // <-- Import Icon

// Interfaz para el resultado de la query de cupones disponibles (tabla 'cupones')
interface AvailableCouponData {
  id: number;
  titulo: string;
  descripcion: string | null;
  puntos_necesarios: number;
  imagen_url: string | null;
  fecha_fin: string | null;
  max_canjeos: number | null;
  canjeos_actuales: number | null;
  disponible: boolean;
  // --- CAMPOS AÑADIDOS ---
  latitud: number | null;
  longitud: number | null;
}

// Interfaz ampliada para mis cupones, incluyendo token_qr y cupon_id
interface MyCouponData {
  id: number; // ID de cupones_canjeados
  cupon_id: number; // ID del cupón original
  fecha_canje: string;
  codigo_generado: string | null;
  usado: boolean;
  fecha_uso: string | null;
  token_qr: string; // Added token_qr
  cupones: {
    id: number;
    titulo: string;
    descripcion: string | null;
    imagen_url: string | null;
    fecha_fin: string | null;
  } | null;
}

// Interface for the successfully redeemed coupon data to show in modal
interface RedeemedCouponInfo extends Coupon {
    token_qr: string;
}

// Interfaz para el estado de myCoupons que incluye el cupon_id original
interface MyCouponState extends Coupon {
    originalCouponId: number; // ID de la tabla 'cupones'
}


export default function PremiosScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'disponibles' | 'cupones'>('disponibles');
  // Destructure updateProfile from useUser
  const { userId, totalScore, loadingProfile, updateProfile } = useUser();

  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  // Use MyCouponState para guardar el ID original
  const [myCoupons, setMyCoupons] = useState<MyCouponState[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [loadingMyCoupons, setLoadingMyCoupons] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for redemption process
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedCouponInfo, setRedeemedCouponInfo] = useState<RedeemedCouponInfo | null>(null);

  const fetchAvailableRewards = useCallback(async () => {
    console.log("[PremiosScreen] Fetching available rewards...");
    setLoadingRewards(true);
    setError(null);
    try {
      // --- CAMBIO: Añadir latitud y longitud al select ---
      const { data, error: dbError } = await supabase
        .from('cupones')
        .select('id, titulo, descripcion, puntos_necesarios, imagen_url, fecha_fin, max_canjeos, canjeos_actuales, disponible, latitud, longitud')
        .eq('disponible', true)
        .order('puntos_necesarios', { ascending: true });

      if (dbError) throw dbError;

      const mappedRewards: Reward[] = data?.map((item: AvailableCouponData) => ({
        id: String(item.id), // id is the original coupon id
        title: item.titulo,
        partner: 'Socio Participante', // Placeholder
        description: item.descripcion || 'Sin descripción detallada.',
        pointsRequired: item.puntos_necesarios,
        imageUrl: item.imagen_url || `https://picsum.photos/seed/${item.id}/700/400`,
        category: 'General', // Placeholder
        validUntil: item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : 'Indefinido',
        locations: 'Varias', // Placeholder
        availability: {
          current: (item.max_canjeos === null || item.max_canjeos === 0) ? 999 : item.max_canjeos - (item.canjeos_actuales ?? 0),
          total: item.max_canjeos ?? 0,
        },
        // --- CAMBIO: Pasar latitud y longitud ---
        latitud: item.latitud,
        longitud: item.longitud,
      })) || [];

      setAvailableRewards(mappedRewards);
      console.log(`[PremiosScreen] Found ${mappedRewards.length} available rewards.`);

    } catch (catchError: any) {
      console.error("[PremiosScreen] Error fetching available rewards:", catchError);
      setError("No se pudieron cargar los premios disponibles.");
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  const fetchMyCoupons = useCallback(async () => {
    if (!userId) {
      console.log("[PremiosScreen] No numeric userId, skipping fetchMyCoupons.");
      setLoadingMyCoupons(false);
      setMyCoupons([]);
      return;
    }
    console.log(`[PremiosScreen] Fetching my coupons for user ID: ${userId}...`);
    setLoadingMyCoupons(true);
    setError(null);
    try {
      // Include cupon_id in the main select
      const { data, error: dbError } = await supabase
        .from('cupones_canjeados')
        .select(`
          id,
          cupon_id,
          fecha_canje,
          codigo_generado,
          usado,
          fecha_uso,
          token_qr,
          cupones (
            id,
            titulo,
            descripcion,
            imagen_url,
            fecha_fin
          )
        `)
        .eq('usuario_id', userId)
        .order('fecha_canje', { ascending: false });

      if (dbError) throw dbError;

      // Map to MyCouponState
      const mappedCoupons: MyCouponState[] = data
        ?.filter((item: MyCouponData) => item.cupones !== null)
        .map((item: MyCouponData) => {
          const cuponDetails = item.cupones!;
          return {
            id: String(item.id), // ID de cupones_canjeados
            originalCouponId: item.cupon_id, // Store original coupon ID
            title: cuponDetails.titulo,
            partner: 'Socio Participante', // Placeholder
            status: item.usado ? 'used' : 'active',
            code: item.codigo_generado || 'N/A', // Use codigo_generado
            redeemedDate: new Date(item.fecha_canje).toLocaleDateString(),
            expiryDate: cuponDetails.fecha_fin ? new Date(cuponDetails.fecha_fin).toLocaleDateString() : 'Indefinido',
          };
        }) || [];

      setMyCoupons(mappedCoupons);
      console.log(`[PremiosScreen] Found ${mappedCoupons.length} coupons for user.`);

    } catch (catchError: any) {
      console.error("[PremiosScreen] Error fetching my coupons:", catchError);
      setError("No se pudieron cargar tus cupones.");
    } finally {
      setLoadingMyCoupons(false);
    }
  }, [userId]);

  // Create a memoized Set of redeemed coupon IDs (original IDs from 'cupones' table)
  const redeemedOriginalCouponIds = useMemo(() => {
      return new Set(myCoupons.map(c => c.originalCouponId));
  }, [myCoupons]);


  useEffect(() => {
    fetchAvailableRewards();
    if (userId) {
        fetchMyCoupons();
    } else if (!loadingProfile) {
        setMyCoupons([]);
        setLoadingMyCoupons(false);
    }
  }, [fetchAvailableRewards, fetchMyCoupons, userId, loadingProfile]);

   // --- Handle Redeem Logic ---
   const handleRedeem = (reward: Reward) => {
    if (!userId || isRedeeming) return;

    // *** Check if already redeemed using the memoized Set ***
    if (redeemedOriginalCouponIds.has(parseInt(reward.id, 10))) {
        Alert.alert("Ya Canjeado", "Ya has canjeado este premio anteriormente.");
        return;
    }


    if (totalScore < reward.pointsRequired) {
      Alert.alert("Puntos insuficientes", `Necesitas ${reward.pointsRequired} puntos.`);
      return;
    }
    if (reward.availability.total > 0 && reward.availability.current <= 0) {
       Alert.alert("No disponible", "Este premio ya no está disponible.");
       fetchAvailableRewards();
       return;
    }

    setSelectedReward(reward);

    Alert.alert(
      "Confirmar Canje",
      `¿Deseas canjear "${reward.title}" por ${reward.pointsRequired} puntos?`,
      [
        { text: "Cancelar", style: "cancel", onPress: () => setSelectedReward(null) },
        { text: "Confirmar", onPress: () => executeRedemption(reward) },
      ]
    );
  };

  // --- Execute Redemption (called after confirmation) ---
  const executeRedemption = async (reward: Reward) => {
     if (!userId || !selectedReward) return;

    // *** Add check if already redeemed before executing ***
     if (redeemedOriginalCouponIds.has(parseInt(reward.id, 10))) {
        Alert.alert("Ya Canjeado", "Ya has canjeado este premio.");
        setIsRedeeming(false); // Ensure loading state is reset
        setSelectedReward(null);
        return;
    }


    setIsRedeeming(true);
    setError(null);
    console.log(`[PremiosScreen] Attempting redemption for reward ID: ${reward.id} by user ID: ${userId}`);

    try {
        // **Simulated Transaction Steps (Ideally use an RPC function)**

        // 1. Re-fetch latest user points and coupon status (basic check for race condition)
        // Check if user already redeemed this specific coupon in the DB as a final check
        const { data: existingRedemption, error: checkError } = await supabase
            .from('cupones_canjeados')
            .select('id')
            .eq('usuario_id', userId)
            .eq('cupon_id', parseInt(reward.id, 10))
            .limit(1);

        if (checkError) throw new Error("Error al verificar si ya canjeaste este cupón.");
        if (existingRedemption && existingRedemption.length > 0) {
            // Refetch my coupons to update local state if inconsistent
            fetchMyCoupons();
            throw new Error("Ya has canjeado este premio.");
        }


        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('puntaje_total')
            .eq('id', userId)
            .single();

        if (userError || !userData) throw new Error("No se pudo verificar el puntaje del usuario.");
        if (userData.puntaje_total < reward.pointsRequired) throw new Error("Puntos insuficientes.");

        const { data: couponData, error: couponError } = await supabase
            .from('cupones')
            .select('disponible, canjeos_actuales, max_canjeos')
            .eq('id', parseInt(reward.id, 10))
            .single();

        if (couponError || !couponData) throw new Error("No se pudo verificar la disponibilidad del cupón.");
        if (!couponData.disponible) throw new Error("El cupón ya no está disponible.");
        if (couponData.max_canjeos !== null && (couponData.canjeos_actuales ?? 0) >= couponData.max_canjeos) {
            throw new Error("Este cupón ya ha alcanzado el límite de canjes.");
        }

        // 2. Calculate new score
        const newScore = userData.puntaje_total - reward.pointsRequired;

        // 3. Generate a simple unique code
        const generatedCode = `CAM${userId}${reward.id}${Date.now().toString().slice(-6)}`;

        // 4. Insert into cupones_canjeados
        const { data: redeemedData, error: insertError } = await supabase
            .from('cupones_canjeados')
            .insert({
                usuario_id: userId,
                cupon_id: parseInt(reward.id, 10),
                codigo_generado: generatedCode,
            })
            .select('id, token_qr, cupon_id') // Select cupon_id too
            .single();

        if (insertError || !redeemedData) throw insertError || new Error("No se pudo registrar el canje.");
        console.log(`[PremiosScreen] Inserted into cupones_canjeados, ID: ${redeemedData.id}, TokenQR: ${redeemedData.token_qr}`);


        // 5. Decrement user points
        const { error: scoreError } = await supabase
            .from('usuarios')
            .update({ puntaje_total: newScore })
            .eq('id', userId);

        if (scoreError) {
            console.error("CRITICAL: Failed to update user score after inserting redeemed coupon!", scoreError);
            // Consider attempting to delete the cupones_canjeados row here
            await supabase.from('cupones_canjeados').delete().eq('id', redeemedData.id);
            throw new Error("Error al actualizar tus puntos. El canje ha sido cancelado.");
        }
        console.log(`[PremiosScreen] User score updated to ${newScore}`);


        // 6. Increment coupon redemptions (if limited)
        if (couponData.max_canjeos !== null) {
             const newRedemptions = (couponData.canjeos_actuales ?? 0) + 1;
             // Also set disponible = false if max is reached
             const updateCouponPayload: { canjeos_actuales: number; disponible?: boolean } = {
                 canjeos_actuales: newRedemptions
             };
             if (newRedemptions >= couponData.max_canjeos) {
                 updateCouponPayload.disponible = false;
             }

            const { error: countError } = await supabase
                .from('cupones')
                .update(updateCouponPayload)
                .eq('id', parseInt(reward.id, 10));

            if (countError) {
                console.warn(`[PremiosScreen] Failed to update canjeos_actuales/disponible for coupon ${reward.id}:`, countError);
            } else {
                 console.log(`[PremiosScreen] Coupon ${reward.id} updated.`);
            }
        }

        // 7. Update local state
        await updateProfile({ puntaje_total: newScore }); // Update context score first
        // Add the new coupon *locally* before refetching to give immediate feedback
         const newLocalCoupon: MyCouponState = {
            id: String(redeemedData.id),
            originalCouponId: redeemedData.cupon_id,
            title: reward.title,
            partner: reward.partner,
            status: 'active',
            code: generatedCode,
            redeemedDate: new Date().toLocaleDateString(),
            expiryDate: reward.validUntil,
        };
        setMyCoupons(prev => [...prev, newLocalCoupon]);
        // Update available rewards locally for immediate feedback (remove/update availability)
        setAvailableRewards(prev => prev.map(r => {
            if (r.id === reward.id) {
                const current = r.availability.current > 0 ? r.availability.current - 1 : 0;
                return { ...r, availability: { ...r.availability, current }};
            }
            return r;
        }).filter(r => r.availability.total === 0 || r.availability.current > 0));


        // Refetch in background for consistency
        fetchAvailableRewards();
        fetchMyCoupons();

        // 8. Prepare data for success modal
        const successInfo: RedeemedCouponInfo = {
            ...newLocalCoupon, // Use locally created coupon info
            token_qr: redeemedData.token_qr, // Add the token
        };
        setRedeemedCouponInfo(successInfo);
        setShowSuccessModal(true);

        // No need for Alert here, modal is shown

    } catch (redeemError: any) {
        console.error("[PremiosScreen] Redemption failed:", redeemError);
        setError(`Error al canjear: ${redeemError.message}`);
        Alert.alert("Error en el Canje", `No se pudo completar el canje: ${redeemError.message}`);
         // Refetch available rewards in case availability changed on server
         fetchAvailableRewards();
    } finally {
        setIsRedeeming(false);
        setSelectedReward(null);
    }
  };

  // --- Copy code to clipboard ---
    const copyToClipboard = async (code: string | null) => {
        if (code) {
            await Clipboard.setStringAsync(code);
            Alert.alert("Copiado", "Código del cupón copiado al portapapeles.");
        }
    };


  const renderTabContent = () => {
    if (activeTab === 'disponibles') {
      if (loadingRewards) return <ActivityIndicator animating={true} color={theme.colors.primary} size="large" style={styles.loader} />;
      if (error && availableRewards.length === 0) return <Text style={[styles.infoText, { color: theme.colors.error }]}>{error}</Text>;
      if (availableRewards.length === 0) return <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>No hay premios disponibles por el momento.</Text>;

      return (
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Premios Disponibles</Text>
            <Chip>{availableRewards.length} {availableRewards.length === 1 ? 'premio' : 'premios'}</Chip>
          </View>
          {/* Pass redeemed IDs Set to the card */}
          {availableRewards.map((r) => (
            <AvailableRewardCard
                key={r.id}
                r={r}
                onRedeem={handleRedeem}
                // Convert redeemedOriginalCouponIds Set to check if the card's original ID is present
                isAlreadyRedeemed={redeemedOriginalCouponIds.has(parseInt(r.id, 10))}
             />
           ))}
        </View>
      );
    } else { // activeTab === 'cupones'
      if (loadingMyCoupons) return <ActivityIndicator animating={true} color={theme.colors.primary} size="large" style={styles.loader} />;
       if (error && myCoupons.length === 0) return <Text style={[styles.infoText, { color: theme.colors.error }]}>{error}</Text>;
       if (myCoupons.length === 0) return <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>Aún no has canjeado ningún cupón.</Text>;

      return (
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Mis Cupones</Text>
            <Chip>{myCoupons.length} {myCoupons.length === 1 ? 'cupón' : 'cupones'}</Chip>
          </View>
          {/* MyCouponCard might need update later to show QR on tap */}
          {myCoupons.map((c) => <MyCouponCard key={c.id} c={c} />)}
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* ESTILO HOME: StatusBar con iconos oscuros */}
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* ESTILO HOME: Header limpio estilo HomeHeader */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface, elevation: 2, zIndex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Premios</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Canjea tus puntos</Text>
          </View>
          {/* Píldora de puntos consistente con HomeHeader */}
          <Surface style={[styles.pointsPill, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
            <Icon name="leaf" size={16} color={theme.colors.primary} />
            <Text style={[styles.pointsText, { color: theme.colors.onSecondaryContainer }]}>
              {loadingProfile ? '...' : (totalScore ?? 0)}
            </Text>
          </Surface>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.container}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab as (value: string) => void}
          buttons={[
            { value: 'disponibles', label: 'Disponibles' },
            { value: 'cupones', label: 'Mis Cupones' },
          ]}
          style={styles.tabs}
        />
        {renderTabContent()}
      </ScrollView>

       {/* Success Modal */}
       <Portal>
           <Modal
             visible={showSuccessModal}
             onDismiss={() => setShowSuccessModal(false)}
             contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
             {redeemedCouponInfo && (
                <View style={styles.modalContent}>
                    <IconButton
                        icon="close-circle"
                        size={24}
                        onPress={() => setShowSuccessModal(false)}
                        style={styles.modalCloseButton}
                     />
                    <Text variant="headlineSmall" style={styles.modalTitle}>¡Canje Exitoso!</Text>
                    <Text variant="titleMedium" style={styles.modalSubtitle}>{redeemedCouponInfo.title}</Text>
                    <Surface style={styles.qrContainer} elevation={1}>
                        <QRCode
                            value={redeemedCouponInfo.token_qr} // Use token_qr for QR code value
                            size={180}
                            logo={require('../../assets/images/icon.png')} // Optional logo
                            logoSize={30}
                            logoBackgroundColor='transparent'
                        />
                    </Surface>
                    <Text style={styles.qrInstruction}>Muestra este QR para usar tu cupón.</Text>

                    <TouchableOpacity onPress={() => copyToClipboard(redeemedCouponInfo.code)} style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>Código:</Text>
                        <Text style={styles.codeText}>{redeemedCouponInfo.code}</Text>
                        <Icon name="content-copy" size={16} color={theme.colors.primary} style={{marginLeft: 8}} />
                    </TouchableOpacity>

                    <Button mode="contained" onPress={() => setShowSuccessModal(false)} style={{marginTop: 20}}>
                        Entendido
                    </Button>
                </View>
             )}
            </Modal>
        </Portal>

         {/* Loading overlay during redemption */}
         <Portal>
             <Modal visible={isRedeeming} dismissable={false} contentContainerStyle={styles.loadingModal}>
                <ActivityIndicator animating={true} size="large" color={theme.colors.primary}/>
                <Text style={{marginTop: 15, color: theme.colors.onSurface}}>Procesando canje...</Text>
             </Modal>
         </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Ajustamos header para que coincida con HomeHeader
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  // Estilo de la píldora de puntos idéntico al Home
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  container: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  tabs: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: { fontWeight: 'bold' },
  loader: {
    marginTop: 48,
  },
  infoText: {
      marginTop: 48,
      textAlign: 'center',
      fontSize: 16,
  },
  // Modal Styles
  modalContainer: {
    margin: 20,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalContent: {
      alignItems: 'center',
      width: '100%',
  },
  modalCloseButton: {
      position: 'absolute',
      top: -10,
      right: -10,
  },
  modalTitle: {
      marginBottom: 8,
      fontWeight: 'bold',
      textAlign: 'center',
  },
   modalSubtitle: {
       marginBottom: 20,
       textAlign: 'center',
       // color: theme.colors.onSurfaceVariant, // Use theme color if needed
   },
  qrContainer: {
      padding: 15,
      backgroundColor: 'white', // Ensure QR has white background
      borderRadius: 8,
      marginBottom: 15,
  },
  qrInstruction: {
      // color: theme.colors.onSurfaceVariant, // Use theme color if needed
      textAlign: 'center',
      marginBottom: 20,
      fontSize: 14,
  },
  codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f0f0', // Light background for code
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
  },
  codeLabel: {
      // color: theme.colors.onSurfaceVariant, // Use theme color if needed
      fontSize: 14,
      marginRight: 5,
  },
  codeText: {
      fontWeight: 'bold',
      fontSize: 16,
      // color: theme.colors.primary, // Use theme color if needed
      letterSpacing: 1,
  },
  loadingModal: {
    backgroundColor: 'white',
    padding: 35,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center', // Center modal horizontally
  }
});