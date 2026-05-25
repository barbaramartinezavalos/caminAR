import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta sea correcta

// Define la forma de los datos de autenticación que compartiremos
interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>; // Añadimos la función signOut
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Intenta obtener la sesión actual al iniciar la app
    const fetchSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // 2. Escucha los cambios en el estado de autenticación (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Si el evento es SIGNED_OUT, nos aseguramos que loading sea false
      if (_event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // 3. Limpia el listener al desmontar el componente
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Función para cerrar sesión
  const signOut = async () => {
    setLoading(true); // Opcional: mostrar indicador mientras cierra sesión
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      // Podrías manejar el error aquí, quizás mostrando un mensaje al usuario
    }
    // El listener onAuthStateChange se encargará de actualizar session y user a null
    // y setLoading a false si es SIGNED_OUT
  };


  const value = {
    session,
    user,
    loading,
    signOut, // Exponemos la función signOut
  };

  // No renderizar children hasta que la sesión inicial se haya cargado
  // OJO: Si tienes una pantalla de splash gestionada por expo-splash-screen,
  // podrías querer quitar este return condicional y manejar la ocultación
  // del splash una vez que loading sea false.
  // if (loading) {
  //   return null; // O un componente de carga global
  // }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
