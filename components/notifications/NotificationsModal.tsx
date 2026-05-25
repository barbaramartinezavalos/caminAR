import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, IconButton, useTheme, Avatar, Divider, Button } from 'react-native-paper';
import { useNotifications, Notificacion } from '../../context/NotificationContext';

const getTimeAgo = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const NotificationsModal = ({ visible, onDismiss }: Props) => {
  const theme = useTheme();
  const { notifications, markAllAsRead, markAsRead } = useNotifications();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comentario': return 'comment';
      case 'seguidor': return 'account-plus';
      default: return 'bell';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'like': return '#ED4956';
      case 'comentario': return '#4db6ac';
      case 'seguidor': return '#2E7D5E';
      default: return theme.colors.primary;
    }
  };

  const renderItem = ({ item }: { item: Notificacion }) => (
    <TouchableOpacity onPress={() => !item.leido && markAsRead(item.id)} activeOpacity={0.8}>
      <View style={[styles.itemContainer, !item.leido && { backgroundColor: theme.colors.secondaryContainer + '30' }]}>
        <View style={styles.avatarContainer}>
            <Avatar.Image
                size={40}
                source={{ uri: item.origen?.avatar_url || 'https://avatar.iran.liara.run/public' }}
            />
            <View style={[styles.iconBadge, { backgroundColor: getColorForType(item.tipo) }]}>
                <IconButton icon={getIconForType(item.tipo)} size={10} iconColor="white" style={{margin:0}} />
            </View>
        </View>

        <View style={styles.contentContainer}>
            <Text variant="bodyMedium" numberOfLines={2}>
                <Text style={{fontWeight: 'bold'}}>{item.origen?.usuario || 'Usuario'} </Text>
                {item.mensaje}
            </Text>
            <Text variant="labelSmall" style={{color: theme.colors.outline, marginTop: 2}}>
                {/* CORREGIDO: Usamos item.fecha */}
                {getTimeAgo(item.fecha)}
            </Text>
        </View>

        {!item.leido && (
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
            <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Notificaciones</Text>
            <IconButton icon="close" onPress={onDismiss} />
        </View>

        <View style={styles.actions}>
            {notifications.length > 0 && (
                <Button mode="text" onPress={markAllAsRead} compact textColor={theme.colors.primary}>
                    Marcar todo como leído
                </Button>
            )}
        </View>

        <Divider />

        <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <IconButton icon="bell-sleep-outline" size={48} iconColor={theme.colors.outline} />
                    <Text style={{color: theme.colors.outline, marginTop: 10}}>No tienes notificaciones nuevas</Text>
                </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    height: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 5,
    paddingTop: 10,
  },
  actions: {
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingBottom: 5,
  },
  itemContainer: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
      borderBottomWidth: 0.5,
      borderBottomColor: '#eee',
  },
  avatarContainer: {
      position: 'relative',
      marginRight: 12,
  },
  iconBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
  },
  contentContainer: {
      flex: 1,
  },
  dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 8,
  },
  emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
  }
});