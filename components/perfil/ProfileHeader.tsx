import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, Text, IconButton, ProgressBar, useTheme } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';

// Props opcionales para cuando vemos el perfil de otro
interface ProfileHeaderProps {
  customUser?: {
    username: string;
    profileImage: string | null;
    totalScore: number;
  };
  isOwnProfile?: boolean;
}

export const ProfileHeader = ({ customUser, isOwnProfile = true }: ProfileHeaderProps) => {
  const theme = useTheme();
  const router = useRouter();

  // Datos del usuario logueado (contexto)
  const { profileImage: contextImage, username: contextName, totalScore: contextScore, loadingProfile } = useUser();

  // Decidir qué datos mostrar
  const displayImage = customUser ? customUser.profileImage : contextImage;
  const displayName = customUser ? customUser.username : contextName;
  const displayScore = customUser ? customUser.totalScore : contextScore;

  // Lógica de nivel visual
  const scoreNeededForNextLevel = 1500;
  const progress = (displayScore || 0) / scoreNeededForNextLevel;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Botón de Atrás si no es mi perfil */}
      {!isOwnProfile && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconButton icon="arrow-left" iconColor="#FFF" size={24} />
        </TouchableOpacity>
      )}

      <View style={styles.userInfo}>
        <Avatar.Image
          size={64}
          source={{ uri: displayImage || 'https://avatar.iran.liara.run/public/47' }}
        />
        <View style={styles.userInfoText}>
          <Text variant="headlineSmall" style={styles.name}>
            {loadingProfile && isOwnProfile ? 'Cargando...' : (displayName || 'Usuario')}
          </Text>
          {/* Subtítulo opcional o handle */}
        </View>

        {/* Icono de configuración solo si es mi perfil */}
        {isOwnProfile && (
          <Link href="/configuracion" asChild>
            <IconButton icon="cog-outline" iconColor="#FFF" />
          </Link>
        )}
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.levelText}>Nivel {Math.floor((displayScore || 0) / 500) + 1}</Text>
        <ProgressBar progress={progress > 1 ? 1 : progress} color="#FFF" style={styles.progressBar} />
        <Text style={styles.pointsText}>
            {displayScore || 0} pts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 4,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10, // Espacio extra si hay botón de atrás
  },
  userInfoText: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelText: {
    color: '#FFF',
    marginRight: 8,
    fontWeight: 'bold',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pointsText: {
    color: '#FFF',
    marginLeft: 8,
    minWidth: 60,
    textAlign: 'right',
    fontWeight: 'bold',
  },
});