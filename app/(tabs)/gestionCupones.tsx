import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, FlatList, Alert, ActivityIndicator, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, useTheme, SegmentedButtons, Button, FAB, Card, Chip, IconButton, Modal, Portal, ProgressBar, Avatar, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { CuponEditorModal } from '../../components/cupones/CuponEditorModal';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

// --- Interfaces ---
interface MisCupones {
  id: number;
  titulo: string;
  descripcion: string | null;
  puntos_necesarios: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  codigo_cupon: string;
  disponible: boolean;
  canjeos_actuales: number;
  max_canjeos: number | null;
  imagen_url: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface CuponCanjeado {
  id: number;
  fecha_canje: string;
  usado: boolean;
  fecha_uso: string | null;
  token_qr: string;
  cupones: {
    id: number;
    titulo: string;
    imagen_url: string | null;
  } | null;
  usuarios: {
    id: number;
    usuario: string;
    avatar_url: string | null;
  } | null;
}

const { width } = Dimensions.get('window');

export default function GestionCuponesScreen() {
  const theme = useTheme();
  const { userId, isOrganization, username } = useUser();
  const [activeTab, setActiveTab] = useState<'creados' | 'canjeados'>('creados');

  const [misCupones, setMisCupones] = useState<MisCupones[]>([]);
  const [cuponesCanjeados, setCuponesCanjeados] = useState<CuponCanjeado[]>([]);

  const [loadingCreados, setLoadingCreados] = useState(true);
  const [loadingCanjeados, setLoadingCanjeados] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCupon, setSelectedCupon] = useState<MisCupones | null>(null);

  const [verQR, setVerQR] = useState<CuponCanjeado | null>(null);

  // --- Data Fetching ---
  const fetchMisCupones = useCallback(async () => {
    if (!userId) return;
    setLoadingCreados(true);
    try {
      const { data, error } = await supabase
        .from('cupones')
        .select('*')
        .eq('usuario_creador_id', userId)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setMisCupones(data as MisCupones[] || []);
    } catch (error: any) {
      console.error("Error fetching mis cupones:", error.message);
    } finally {
      setLoadingCreados(false);
    }
  }, [userId]);

  const fetchCuponesCanjeados = useCallback(async () => {
    if (!userId) return;
    setLoadingCanjeados(true);
    try {
      // 1. Obtener IDs de mis cupones
      const { data: misCuponesIdsData, error: misCuponesError } = await supabase
        .from('cupones')
        .select('id')
        .eq('usuario_creador_id', userId);

      if (misCuponesError) throw misCuponesError;
      const misCuponesIds = misCuponesIdsData.map(c => c.id);

      if (misCuponesIds.length === 0) {
        setCuponesCanjeados([]);
        setLoadingCanjeados(false);
        return;
      }

      // 2. Obtener canjes de esos cupones
      const { data, error } = await supabase
        .from('cupones_canjeados')
        .select(`
          id,
          fecha_canje,
          usado,
          fecha_uso,
          token_qr,
          cupones (id, titulo, imagen_url),
          usuarios (id, usuario, avatar_url)
        `)
        .in('cupon_id', misCuponesIds)
        .order('fecha_canje', { ascending: false });

      if (error) throw error;
      setCuponesCanjeados(data as CuponCanjeado[] || []);
    } catch (error: any) {
      console.error("Error fetching cupones canjeados:", error.message);
    } finally {
      setLoadingCanjeados(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOrganization) {
      if (activeTab === 'creados') {
        fetchMisCupones();
      } else {
        fetchCuponesCanjeados();
      }
    }
  }, [userId, isOrganization, activeTab, fetchMisCupones, fetchCuponesCanjeados]);

  // --- Handlers ---
  const handleOpenCreator = (cupon: MisCupones | null = null) => {
    setSelectedCupon(cupon);
    setIsModalVisible(true);
  };

  const onModalClose = (refresh: boolean) => {
    setIsModalVisible(false);
    setSelectedCupon(null);
    if (refresh) {
      fetchMisCupones();
    }
  };

  const handleMarcarUsado = async (canjeadoId: number) => {
    Alert.alert(
      "Confirmar Uso",
      "¿Validar este cupón? Esta acción es irreversible.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Validar",
          style: "default",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cupones_canjeados')
                .update({ usado: true, fecha_uso: new Date().toISOString() })
                .eq('id', canjeadoId);

              if (error) throw error;

              setCuponesCanjeados(prev =>
                prev.map(c =>
                  c.id === canjeadoId ? { ...c, usado: true, fecha_uso: new Date().toISOString() } : c
                )
              );
            } catch (error: any) {
              Alert.alert("Error", "No se pudo actualizar.");
            }
          },
        },
      ]
    );
  };

  // --- Render Components ---

  const renderHeader = () => (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface, elevation: 2, zIndex: 1 }}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Gestionar
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
            Tus promociones y canjes
          </Text>
        </View>
        <Avatar.Icon
            size={48}
            icon="store"
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            color={theme.colors.onSecondaryContainer}
        />
      </View>
    </SafeAreaView>
  );

  const renderEmptyState = (message: string, icon: string, action?: () => void, actionLabel?: string) => (
    <View style={styles.emptyStateContainer}>
      <Icon name={icon} size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>{message}</Text>
      {action && (
        <Button mode="contained-tonal" onPress={action} style={{ marginTop: 16 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );

  const renderCuponCreado = ({ item }: { item: MisCupones }) => {
    const progress = item.max_canjeos ? (item.canjeos_actuales / item.max_canjeos) : 0;
    const isExpired = item.fecha_fin && new Date(item.fecha_fin) < new Date();
    const statusColor = !item.disponible || isExpired ? theme.colors.error : theme.colors.primary;
    const statusText = !item.disponible ? "Inactivo" : isExpired ? "Expirado" : "Activo";

    return (
      <TouchableOpacity onPress={() => handleOpenCreator(item)} activeOpacity={0.9}>
        <Surface style={styles.card} elevation={1}>
            <View style={styles.cardImageContainer}>
                {item.imagen_url ? (
                    <Image source={{ uri: item.imagen_url }} style={styles.cardCover} />
                ) : (
                    <View style={[styles.cardCover, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Icon name="image-off" size={30} color="#999" />
                    </View>
                )}
                <View style={styles.statusBadgeContainer}>
                    <Chip
                        compact
                        style={{ backgroundColor: statusColor, height: 26 }}
                        textStyle={{ fontSize: 10, color: 'white', fontWeight: 'bold', lineHeight: 12 }}
                    >
                        {statusText}
                    </Chip>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                    <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
                    <Icon name="chevron-right" size={20} color={theme.colors.outline} />
                </View>

                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginBottom: 12}} numberOfLines={2}>
                    {item.descripcion}
                </Text>

                <View style={styles.statsRow}>
                    <View style={[styles.statPill, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Icon name="star" size={14} color={theme.colors.onSecondaryContainer} />
                        <Text style={{ marginLeft: 4, fontSize: 12, color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
                            {item.puntos_necesarios} pts
                        </Text>
                    </View>
                    <View style={[styles.statPill, { backgroundColor: '#f0f0f0' }]}>
                         <Icon name="calendar" size={14} color="#666" />
                         <Text style={{ marginLeft: 4, fontSize: 12, color: '#666' }}>
                            {item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : 'Ilimitado'}
                         </Text>
                    </View>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                        <Text variant="labelSmall" style={{color: theme.colors.onSurfaceVariant}}>Progreso Canjeos</Text>
                        <Text variant="labelSmall" style={{fontWeight: 'bold'}}>{item.canjeos_actuales} / {item.max_canjeos || '∞'}</Text>
                    </View>
                    {item.max_canjeos && (
                        <ProgressBar progress={progress} color={progress >= 1 ? theme.colors.error : theme.colors.primary} style={{height: 6, borderRadius: 3}} />
                    )}
                </View>
            </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderCuponCanjeado = ({ item }: { item: CuponCanjeado }) => (
    <Surface style={[styles.card, item.usado && { opacity: 0.8, backgroundColor: '#f9f9f9' }]} elevation={1}>
      <View style={{flexDirection: 'row', padding: 16, alignItems: 'center'}}>
         <Avatar.Image
            size={48}
            source={{ uri: item.usuarios?.avatar_url || 'https://avatar.iran.liara.run/public' }}
            style={{marginRight: 16}}
         />
         <View style={{flex: 1}}>
            <Text variant="titleSmall" style={{fontWeight: 'bold'}}>{item.usuarios?.usuario || 'Usuario'}</Text>
            <Text variant="bodySmall" style={{color: theme.colors.primary, marginTop: 2}}>
                {item.cupones?.titulo}
            </Text>
            <Text variant="labelSmall" style={{color: theme.colors.outline, marginTop: 4}}>
                {new Date(item.fecha_canje).toLocaleString()}
            </Text>
         </View>
         <TouchableOpacity onPress={() => setVerQR(item)} style={styles.qrIconBtn}>
             <Icon name="qrcode-scan" size={24} color={theme.colors.onPrimary} />
         </TouchableOpacity>
      </View>

      {!item.usado ? (
        <View style={styles.cardActionFooter}>
            <Button
                mode="contained"
                onPress={() => handleMarcarUsado(item.id)}
                style={{flex: 1, borderRadius: 8}}
                icon="check-decagram"
            >
                Validar Cupón
            </Button>
        </View>
      ) : (
        <View style={[styles.cardActionFooter, {backgroundColor: '#eee', justifyContent: 'center'}]}>
            <Icon name="check-circle" size={16} color="#666" style={{marginRight: 6}} />
            <Text style={{color: '#666', fontStyle: 'italic', fontSize: 12}}>
                Validado el {item.fecha_uso ? new Date(item.fecha_uso).toLocaleDateString() : 'N/A'}
            </Text>
        </View>
      )}
    </Surface>
  );

  const renderContent = () => {
    if (activeTab === 'creados') {
      if (loadingCreados) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.colors.primary} />;
      if (misCupones.length === 0) return renderEmptyState("No tienes cupones activos", "ticket-percent-outline", () => handleOpenCreator(null), "Crear Primer Cupón");
      return (
        <FlatList
          data={misCupones}
          renderItem={renderCuponCreado}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (activeTab === 'canjeados') {
      if (loadingCanjeados) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.colors.primary} />;
      if (cuponesCanjeados.length === 0) return renderEmptyState("Aún no han canjeado tus cupones", "history");
      return (
        <FlatList
          data={cuponesCanjeados}
          renderItem={renderCuponCanjeado}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }
    return null;
  };

  if (!isOrganization) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Icon name="shield-lock-outline" size={60} color={theme.colors.error} style={{ marginBottom: 20 }} />
        <Text variant="headlineSmall" style={{textAlign: 'center', marginBottom: 10, color: theme.colors.onSurface}}>Acceso Restringido</Text>
        <Text style={{textAlign: 'center', marginBottom: 30, color: theme.colors.onSurfaceVariant}}>
            Esta sección es exclusiva para organizaciones aliadas. Si deseas registrar tu negocio, contáctanos.
        </Text>
        <Button mode="contained" onPress={() => router.replace('/(tabs)/')}>
          Volver al Inicio
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {renderHeader()}

      <View style={styles.container}>
        <View style={styles.tabsContainer}>
            <SegmentedButtons
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'creados' | 'canjeados')}
            buttons={[
                { value: 'creados', label: 'Mis Cupones', icon: 'ticket-outline' },
                { value: 'canjeados', label: 'Historial Canjes', icon: 'history' },
            ]}
            style={styles.tabs}
            density="medium"
            />
        </View>

        {renderContent()}
      </View>

      {activeTab === 'creados' && (
        <FAB
          icon="plus"
          label="Nuevo"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#fff"
          onPress={() => handleOpenCreator(null)}
        />
      )}

      {isModalVisible && (
        <CuponEditorModal
          visible={isModalVisible}
          onClose={onModalClose}
          cupon={selectedCupon}
          userId={userId!}
        />
      )}

      {/* Modal QR (Ticket Style) */}
      <Portal>
        <Modal visible={!!verQR} onDismiss={() => setVerQR(null)} contentContainerStyle={styles.qrModalContainer}>
            <View style={styles.ticketHeader}>
                <View style={styles.holeLeft} />
                <View style={styles.holeRight} />
                <Text variant="titleMedium" style={{color: 'white', fontWeight: 'bold'}}>TOKEN DE VALIDACIÓN</Text>
            </View>
            <View style={styles.ticketBody}>
                <Text style={{marginBottom: 10, color: '#666'}}>Escanea para verificar</Text>
                {verQR && (
                    <QRCode
                        value={verQR.token_qr}
                        size={200}
                        logo={require('../../assets/images/icon.png')}
                        logoSize={30}
                    />
                )}
                <Text variant="headlineSmall" style={{marginTop: 20, fontWeight: 'bold', letterSpacing: 2, color: theme.colors.primary}}>
                    {verQR?.token_qr}
                </Text>
                <Button onPress={() => setVerQR(null)} style={{marginTop: 20}}>Cerrar</Button>
            </View>
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
  container: {
    flex: 1,
    padding: 16,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    // Personalización adicional si se requiere
  },
  listContent: {
    paddingBottom: 80, // Espacio para el FAB
  },
  // --- Card Styling Actualizado ---
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImageContainer: {
      position: 'relative',
      height: 140,
  },
  cardCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadgeContainer: {
      position: 'absolute',
      top: 12,
      right: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  cardActionFooter: {
      padding: 12,
      borderTopWidth: 1,
      borderColor: '#eee',
      flexDirection: 'row',
  },
  qrIconBtn: {
      backgroundColor: '#2E7D5E', // Color primario manual o usar theme
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    padding: 20,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  // Estilos del Modal QR (Ticket)
  qrModalContainer: {
    marginHorizontal: 30,
    backgroundColor: 'transparent',
  },
  ticketHeader: {
    backgroundColor: '#2E7D5E',
    height: 60,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ticketBody: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
  },
  holeLeft: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  holeRight: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});