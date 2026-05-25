import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import * as Notifications from 'expo-notifications';

export interface Notificacion {
  id: number;
  usuario_id: number;
  origen_usuario_id: number;
  tipo: 'seguidor' | 'like' | 'comentario';
  mensaje: string;
  leido: boolean;
  fecha: string; // CORREGIDO: Coincide con tu DB
  origen?: {
    usuario: string;
    avatar_url: string | null;
  };
}

interface NotificationContextType {
  notifications: Notificacion[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendLocalNotification: (title: string, body: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useUser();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Configuración de Notificaciones Nativas (Segura para Expo Go)
  useEffect(() => {
    const configureNotifications = async () => {
      try {
        if (Platform.OS === 'web') return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
      } catch (error) {
        console.warn("Notificaciones nativas no disponibles:", error);
      }
    };
    configureNotifications();
  }, []);

  // Lógica de Supabase
  useEffect(() => {
    if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
    }

    // Carga inicial
    fetchNotifications();

    // Suscripción Realtime
    const subscription = supabase
      .channel('public:notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔔 Nueva notificación detectada:', payload.new);

          // TRUCO: Fetch individual para obtener los datos del usuario origen (JOIN)
          // porque el payload raw no trae las relaciones.
          const { data: fullNotification } = await supabase
            .from('notificaciones')
            .select(`
              *,
              origen:usuarios!notificaciones_origen_usuario_id_fkey (
                usuario,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullNotification) {
            const newNotif = fullNotification as Notificacion;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            sendLocalNotification('Nueva actividad', newNotif.mensaje);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Nos aseguramos de usar el nombre correcto de la FK si es necesario
      // Si falla, intenta quitar '!notificaciones_origen_usuario_id_fkey'
      const { data, error } = await supabase
        .from('notificaciones')
        .select(`
          *,
          origen:usuarios!notificaciones_origen_usuario_id_fkey (
            usuario,
            avatar_url
          )
        `)
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      console.log(`📥 Se cargaron ${data?.length} notificaciones.`);
      setNotifications(data as Notificacion[]);

      const unread = data?.filter((n: any) => !n.leido).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Excepción en fetchNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    // Optimista: actualizamos UI primero
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revertir si fuera necesario, pero para leer notifs no suele ser crítico
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
    setUnreadCount(0);

    try {
      await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('usuario_id', userId)
        .eq('leido', false);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: null,
        });
      }
    } catch (e) {
      // Ignorar errores en Expo Go
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, sendLocalNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationProvider');
  }
  return context;
};