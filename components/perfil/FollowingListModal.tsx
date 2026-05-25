import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, Avatar, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router'; // Usamos router de expo

interface FollowingUser {
  userId: number;
  usuario: string;
  nombre: string;
  avatar_url: string | null;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const FollowingListModal = ({ visible, onDismiss }: Props) => {
  const theme = useTheme();
  const { userId } = useUser();
  const router = useRouter(); // Hook de navegación
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seguidores')
        .select(`
          seguido:usuarios!fk_seguido (
            id,
            usuario,
            nombre,
            avatar_url
          )
        `)
        .eq('seguidor_id', userId);

      if (error) throw error;

      const mappedData = data.map((item: any) => ({
        userId: item.seguido.id,
        usuario: item.seguido.usuario,
        nombre: item.seguido.nombre,
        avatar_url: item.seguido.avatar_url,
      }));

      setFollowing(mappedData);
    } catch (error) {
      console.error("Error al obtener seguidos:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) fetchFollowing();
  }, [visible, fetchFollowing]);

  const handleNavigateToProfile = (targetUserId: number) => {
    onDismiss(); // Cerramos el modal primero
    // Navegamos a la misma ruta (perfil) pero pasando el userId como parámetro
    router.push({
      pathname: '/(tabs)/perfil',
      params: { userId: targetUserId }
    });
  };

  const renderItem = ({ item }: { item: FollowingUser }) => (
    <TouchableOpacity onPress={() => handleNavigateToProfile(item.userId)}>
      <View style={styles.userItem}>
        <Avatar.Image size={40} source={{ uri: item.avatar_url || 'https://avatar.iran.liara.run/public' }} />
        <View style={styles.userInfo}>
          <Text variant="titleMedium">{item.usuario}</Text>
          <Text variant="bodySmall" style={{color: theme.colors.outline}}>{item.nombre}</Text>
        </View>
        <IconButton icon="chevron-right" size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <View style={styles.header}>
            <Text variant="headlineSmall" style={{fontWeight: 'bold'}}>Mis Seguidos</Text>
            <IconButton icon="close" onPress={onDismiss} />
        </View>
        <Divider />
        {loading ? (
            <View style={styles.centerContent}><ActivityIndicator size="large" /></View>
        ) : (
            <FlatList
                data={following}
                renderItem={renderItem}
                keyExtractor={(item) => item.userId.toString()}
                ListEmptyComponent={<Text style={styles.emptyText}>Aún no sigues a nadie.</Text>}
                ItemSeparatorComponent={() => <Divider />}
                contentContainerStyle={styles.listContent}
            />
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    height: '70%',
    overflow: 'hidden',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  userInfo: { flex: 1, marginLeft: 12 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888' }
});