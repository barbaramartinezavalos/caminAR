import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Keyboard, Alert } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, Avatar, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';

interface UserSearchResult {
  id: number;
  usuario: string;
  nombre: string;
  avatar_url: string | null;
  isFollowing: boolean; // Estado local para saber si lo seguimos
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const UserSearchModal = ({ visible, onDismiss }: Props) => {
  const theme = useTheme();
  const { userId } = useUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null); // Para mostrar carga en el botón individual

  // Buscar usuarios cuando cambia el texto (con debounce manual o simple enter)
  const handleSearch = async () => {
    if (!query.trim() || !userId) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      // 1. Buscar usuarios que coincidan con el nombre o usuario
      const { data: usersData, error: searchError } = await supabase
        .from('usuarios')
        .select('id, usuario, nombre, avatar_url')
        .or(`usuario.ilike.%${query}%,nombre.ilike.%${query}%`)
        .neq('id', userId) // Excluir al usuario actual
        .limit(20);

      if (searchError) throw searchError;

      if (!usersData || usersData.length === 0) {
        setResults([]);
        return;
      }

      // 2. Obtener a quiénes sigo yo (para marcar los botones)
      const { data: followingData, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', userId);

      if (followingError) throw followingError;

      const followingSet = new Set(followingData?.map((f: any) => f.seguido_id));

      // 3. Combinar datos
      const mappedResults: UserSearchResult[] = usersData.map((u: any) => ({
        ...u,
        isFollowing: followingSet.has(u.id),
      }));

      setResults(mappedResults);

    } catch (error: any) {
      console.error("Error buscando usuarios:", error);
      Alert.alert("Error", "No se pudo realizar la búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (targetUserId: number, currentStatus: boolean) => {
    if (!userId) return;
    setProcessingId(targetUserId);

    try {
      if (currentStatus) {
        // Dejar de seguir (Delete)
        const { error } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', userId)
          .eq('seguido_id', targetUserId);

        if (error) throw error;
      } else {
        // Seguir (Insert)
        const { error } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: userId,
            seguido_id: targetUserId
          });

        if (error) throw error;
      }

      // Actualizar estado local
      setResults(prev => prev.map(u =>
        u.id === targetUserId ? { ...u, isFollowing: !currentStatus } : u
      ));

    } catch (error: any) {
      console.error("Error al seguir/dejar de seguir:", error);
      Alert.alert("Error", "No se pudo actualizar el seguimiento.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: UserSearchResult }) => (
    <View style={styles.userItem}>
      <Avatar.Image size={40} source={{ uri: item.avatar_url || 'https://avatar.iran.liara.run/public' }} />
      <View style={styles.userInfo}>
        <Text variant="titleMedium">{item.usuario}</Text>
        <Text variant="bodySmall" style={{color: theme.colors.outline}}>{item.nombre}</Text>
      </View>
      <Button
        mode={item.isFollowing ? "outlined" : "contained"}
        onPress={() => toggleFollow(item.id, item.isFollowing)}
        loading={processingId === item.id}
        disabled={processingId !== null}
        compact
        style={{ minWidth: 100 }}
      >
        {item.isFollowing ? "Siguiendo" : "Seguir"}
      </Button>
    </View>
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <View style={styles.header}>
            <Text variant="headlineSmall" style={{fontWeight: 'bold'}}>Buscar Amigos</Text>
            <IconButton icon="close" onPress={onDismiss} />
        </View>

        <View style={styles.searchContainer}>
            <TextInput
                placeholder="Nombre de usuario o nombre..."
                value={query}
                onChangeText={setQuery}
                mode="outlined"
                right={<TextInput.Icon icon="magnify" onPress={handleSearch} />}
                onSubmitEditing={handleSearch}
                style={styles.input}
                dense
            />
        </View>

        {loading ? (
            <View style={styles.centerContent}>
                <ActivityIndicator size="large" />
            </View>
        ) : (
            <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {query ? "No se encontraron usuarios." : "Busca usuarios para seguirlos."}
                    </Text>
                }
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
    height: '80%', // Ocupa gran parte de la pantalla
    overflow: 'hidden',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 0
  },
  searchContainer: {
      padding: 16,
  },
  input: {
      backgroundColor: 'white'
  },
  listContent: {
      paddingHorizontal: 16,
      paddingBottom: 20
  },
  userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
  },
  userInfo: {
      flex: 1,
      marginLeft: 12,
  },
  centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 40,
      color: '#888'
  }
});