import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native'; // Import StyleSheet and Text

export default function TabLayout() {
  const theme = useTheme();
  const { isOrganization, loadingProfile } = useUser();

  // Log para verificar los valores del contexto
  console.log('[TabLayout] Rendering - loadingProfile:', loadingProfile, 'isOrganization:', isOrganization);

  // Mostrar indicador de carga mientras se determina el tipo de usuario
  if (loadingProfile) {
    console.log('[TabLayout] Showing loading indicator...');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
        <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>Cargando perfil...</Text>
      </View>
    );
  }

  // Log una vez que el perfil ha cargado
  console.log(`[TabLayout] Profile loaded. Rendering tabs for ${isOrganization ? 'Organization' : 'Common User'}`);

  return (
    <Tabs
      screenOptions={({ route }) => ({ // Use function form to dynamically set options if needed later
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 4,
          shadowOpacity: 0.1,
        },
        // It's good practice to define the icon within screenOptions if it depends on route/state
        // but since we are completely changing the screens, defining per-screen is fine.
      })}
    >
      {/* Pestañas Comunes (se ocultarán si es Organización) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
          // Ocultar si es organización
          href: isOrganization ? null : '/(tabs)/',
        }}
      />
      <Tabs.Screen
        name="retos"
        options={{
          title: 'Retos',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} />,
          // Ocultar si es organización
          href: isOrganization ? null : '/(tabs)/retos',
        }}
      />
      <Tabs.Screen
        name="premios"
        options={{
          title: 'Premios',
          tabBarIcon: ({ color, size }) => <Ionicons name="gift-outline" color={color} size={size} />,
          // Ocultar si es organización
          href: isOrganization ? null : '/(tabs)/premios',
        }}
      />

      {/* Pestaña de Perfil (siempre visible, cambia icono/título) */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: isOrganization ? 'Perfil Org.' : 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isOrganization ? "business-outline" : "person-outline"}
              color={color}
              size={size}
            />
          ),
          // Siempre visible
          href: '/(tabs)/perfil',
        }}
      />

      {/* Pestaña de Gestión (solo visible para Organización) */}
      <Tabs.Screen
        name="gestionCupones"
        options={{
          title: 'Gestionar',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} />,
          // Ocultar si NO es organización
          href: isOrganization ? '/(tabs)/gestionCupones' : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

