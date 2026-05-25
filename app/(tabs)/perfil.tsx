import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedButtons, Button, useTheme, Text, Avatar, Surface, IconButton, Modal, Portal, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Componentes
import { RankingList } from '../../components/perfil/RankingList';
import { StatisticsSection } from '../../components/perfil/StatisticsSection';
import { UserSearchModal } from '../../components/perfil/UserSearchModal';
import { FollowingListModal } from '../../components/perfil/FollowingListModal';
import { PhotosGrid } from '../../components/perfil/PhotosGrid';

// Lógica y BD
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';

export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();

  // 1. Obtener parámetros y contexto
  const params = useLocalSearchParams();
  const paramUserId = params.userId ? parseInt(Array.isArray(params.userId) ? params.userId[0] : params.userId, 10) : null;
  const { userId: currentUserId, totalScore: myScore, username: myUsername, profileImage: myProfileImage, loadingProfile } = useUser();

  // 2. Determinar si es perfil propio o ajeno
  const isOwnProfile = !paramUserId || paramUserId === currentUserId;
  const targetUserId = isOwnProfile ? currentUserId : paramUserId;

  // Estados
  const [activeTab, setActiveTab] = useState('estadisticas');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);

  // Nuevo estado para el modal de fotos al tocar el avatar
  const [photosModalVisible, setPhotosModalVisible] = useState(false);

  // Estados para perfil ajeno
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingOther, setLoadingOther] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // Efecto para cargar datos de OTRO usuario
  useEffect(() => {
    if (!isOwnProfile && targetUserId) {
      fetchOtherUserProfile();
      checkIfFollowing();
    }
  }, [targetUserId, isOwnProfile]);

  const fetchOtherUserProfile = async () => {
    setLoadingOther(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, usuario, nombre, avatar_url, puntaje_total')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      setOtherUserProfile(data);
    } catch (err) {
      console.error("Error fetching other profile:", err);
    } finally {
      setLoadingOther(false);
    }
  };

  const checkIfFollowing = async () => {
    if (!currentUserId) return;
    try {
      const { count } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', currentUserId)
        .eq('seguido_id', targetUserId);

      setIsFollowing((count || 0) > 0);
    } catch (err) {
      console.error("Error check follow:", err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !targetUserId) return;
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        // Dejar de seguir
        await supabase.from('seguidores').delete().eq('seguidor_id', currentUserId).eq('seguido_id', targetUserId);
        setIsFollowing(false);
      } else {
        // Seguir
        await supabase.from('seguidores').insert({ seguidor_id: currentUserId, seguido_id: targetUserId });
        setIsFollowing(true);

        // TRIGGER NOTIFICACIÓN: Solo si no me sigo a mí mismo (lo cual no debería pasar en la UI, pero por seguridad)
        if (currentUserId !== targetUserId) {
            await supabase.from('notificaciones').insert({
                usuario_id: targetUserId, // El perfil que visito recibe la notif
                origen_usuario_id: currentUserId, // Yo soy el origen
                tipo: 'seguidor',
                mensaje: 'Comenzó a seguirte',
                leido: false
            });
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setLoadingFollow(false);
    }
  };

  // Datos a mostrar (Mío o Ajeno)
  const displayUser = isOwnProfile ? {
      username: myUsername,
      profileImage: myProfileImage,
      totalScore: myScore,
      subtitle: 'Explorador Eco'
  } : {
      username: otherUserProfile?.usuario || 'Cargando...',
      profileImage: otherUserProfile?.avatar_url,
      totalScore: otherUserProfile?.puntaje_total,
      subtitle: otherUserProfile?.nombre || 'Usuario de CaminAR'
  };

  // Calculo de Nivel
  const currentLevel = Math.floor((displayUser.totalScore || 0) / 500) + 1;
  const progressToNext = ((displayUser.totalScore || 0) % 500) / 500;


  // Renderizado condicional del contenido principal
  const renderContent = () => {
    if (activeTab === 'estadisticas') return <StatisticsSection />;
    if (activeTab === 'ranking') return <RankingList />;
    return null;
  };

  if (!isOwnProfile && loadingOther) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* StatusBar Consistente */}
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* Header Estilo Home/Retos */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface, elevation: 2, zIndex: 1 }}>
        <View style={styles.header}>
            {/* Botón Back si no es mi perfil */}
            {!isOwnProfile && (
                <IconButton
                    icon="arrow-left"
                    onPress={() => router.back()}
                    style={{marginLeft: -8}}
                />
            )}
            <View style={{flex: 1}}>
                <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                    {isOwnProfile ? 'Mi Perfil' : 'Perfil de Usuario'}
                </Text>
            </View>
            {/* Icono Configuración solo si es mi perfil */}
            {isOwnProfile && (
                <IconButton
                    icon="cog-outline"
                    iconColor={theme.colors.onSurface}
                    size={24}
                    onPress={() => router.push('/configuracion')}
                />
            )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* --- Tarjeta de Perfil Principal --- */}
        <Surface style={styles.profileCard} elevation={1}>
            <View style={styles.profileHeaderRow}>
                {/* Avatar Tocable para ver fotos */}
                <TouchableOpacity onPress={() => setPhotosModalVisible(true)} activeOpacity={0.7}>
                    <Avatar.Image
                        size={80}
                        source={{ uri: displayUser.profileImage || 'https://avatar.iran.liara.run/public/47' }}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                    />
                    <View style={styles.cameraIconBadge}>
                        <Icon name="camera-burst" size={12} color="white" />
                    </View>
                </TouchableOpacity>

                <View style={styles.profileInfo}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{displayUser.username}</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{displayUser.subtitle}</Text>

                    {/* Badges / Info rápida */}
                    <View style={styles.badgesRow}>
                        <View style={[styles.levelBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                            <Icon name="trophy-variant" size={14} color={theme.colors.onSecondaryContainer} />
                            <Text style={{ marginLeft: 4, color: theme.colors.onSecondaryContainer, fontWeight: 'bold', fontSize: 12 }}>
                                Nivel {currentLevel}
                            </Text>
                        </View>
                        <View style={[styles.levelBadge, { backgroundColor: theme.colors.primaryContainer, marginLeft: 8 }]}>
                            <Icon name="leaf" size={14} color={theme.colors.onPrimaryContainer} />
                            <Text style={{ marginLeft: 4, color: theme.colors.onPrimaryContainer, fontWeight: 'bold', fontSize: 12 }}>
                                {displayUser.totalScore || 0} pts
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Barra de Progreso de Nivel */}
            <View style={styles.progressSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Progreso Nivel {currentLevel}</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>{Math.round(progressToNext * 100)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressToNext * 100}%`, backgroundColor: theme.colors.primary }]} />
                </View>
            </View>

            {/* Botones de Acción */}
            <View style={styles.actionButtonsRow}>
                {!isOwnProfile ? (
                    <Button
                        mode={isFollowing ? "outlined" : "contained"}
                        onPress={handleToggleFollow}
                        loading={loadingFollow}
                        style={{ flex: 1 }}
                        icon={isFollowing ? "check" : "account-plus"}
                    >
                        {isFollowing ? "Siguiendo" : "Seguir"}
                    </Button>
                ) : (
                    <>
                        <Button
                            mode="outlined"
                            onPress={() => setFollowingModalVisible(true)}
                            style={{ flex: 1, marginRight: 8 }}
                            icon="account-heart-outline"
                            compact
                        >
                            Seguidos
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => setSearchModalVisible(true)}
                            style={{ flex: 1 }}
                            icon="magnify"
                            compact
                        >
                            Buscar
                        </Button>
                    </>
                )}
            </View>
        </Surface>

        {/* --- Galería de Fotos (Si es otro usuario, se muestra aquí abajo también) --- */}
        {!isOwnProfile && targetUserId && (
             <View style={styles.sectionContainer}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Galería</Text>
                <Surface style={styles.galleryCard} elevation={1}>
                    <PhotosGrid userId={targetUserId} />
                </Surface>
             </View>
        )}

        {/* --- Tabs para Mi Perfil --- */}
        {isOwnProfile && (
            <>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveTab}
                    buttons={[
                        { value: 'estadisticas', label: 'Estadísticas', icon: 'chart-bar' },
                        { value: 'ranking', label: 'Global', icon: 'podium' },
                    ]}
                    style={styles.tabs}
                    density="medium"
                />
                {renderContent()}
            </>
        )}

      </ScrollView>

      <UserSearchModal
        visible={searchModalVisible}
        onDismiss={() => setSearchModalVisible(false)}
      />
      <FollowingListModal
        visible={followingModalVisible}
        onDismiss={() => setFollowingModalVisible(false)}
      />

      {/* Modal de Galería de Fotos al tocar Avatar */}
      <Portal>
        <Modal
            visible={photosModalVisible}
            onDismiss={() => setPhotosModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
        >
            <View style={styles.modalHeader}>
                <Text variant="headlineSmall" style={{fontWeight: 'bold'}}>Galería de Fotos</Text>
                <IconButton icon="close" onPress={() => setPhotosModalVisible(false)} />
            </View>
            <Divider />
            <ScrollView contentContainerStyle={{padding: 16}}>
                {targetUserId && <PhotosGrid userId={targetUserId} />}
            </ScrollView>
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionContainer: {
      marginBottom: 24,
  },
  sectionTitle: {
      fontWeight: 'bold',
      marginBottom: 12,
      paddingHorizontal: 4,
  },
  galleryCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      minHeight: 100,
  },
  tabs: {
      marginBottom: 20,
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  cameraIconBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: 'white'
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    height: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
});