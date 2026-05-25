import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { uploadImage } from '../lib/storage';
import { Alert } from 'react-native';
import * as Location from 'expo-location'; // Importamos Location

// --- Interfaces ---

export interface Reto {
  id: number;
  titulo: string;
  descripcion: string;
  puntos_otorgados: number;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  usuario_creador_id?: number | null;
  max_completaciones?: number | null;
  completaciones_actuales?: number | null;
  activo?: boolean | null;
  creado_en?: string | null;
}

export interface UserProfileData {
  id?: number;
  auth_user_id?: string;
  usuario: string;
  nombre?: string | null;
  apellido?: string | null;
  avatar_url?: string | null;
  puntaje_total?: number;
  esOrganizacion?: boolean;
}

// Internal state
interface UserStateInternal {
  userId: number | null;
  username: string | null;
  nombre: string | null;
  apellido: string | null;
  profileImageUrl: string | null;
  profileType: 'common' | 'company' | null;
  isOrganization: boolean | null;
  totalScore: number;
  loadingProfile: boolean;
  challenges: Reto[]; // Aquí guardaremos TODOS los retos crudos de la BD
  loadingChallenges: boolean;
  completedChallengeIds: Set<number>;
  loadingCompletedChallenges: boolean;
}

// Public state
interface UserStatePublic {
    userId: number | null;
    username: string;
    nombre: string | null;
    apellido: string | null;
    profileImage: string | null;
    profileType: 'common' | 'company';
    isOrganization: boolean;
    totalScore: number;
    loadingProfile: boolean;
    challenges: Reto[]; // Esta lista estará FILTRADA por distancia
    loadingChallenges: boolean;
    completedChallengeIds: Set<number>;
    loadingCompletedChallenges: boolean;
    userLocation: Location.LocationObject | null; // Exponemos la ubicación
    updateProfile: (updates: Partial<UserProfileData>) => Promise<boolean>;
    completeChallenge: (reto: Reto, photoUri: string, description?: string | null) => Promise<{ success: boolean; message?: string }>;
}

const UserContext = createContext<(UserStateInternal & {
    userLocation: Location.LocationObject | null;
    filteredChallenges: Reto[]; // Lista procesada
    updateProfile: (updates: Partial<UserProfileData>) => Promise<boolean>;
    completeChallenge: (reto: Reto, photoUri: string, description?: string | null) => Promise<{ success: boolean; message?: string }>;
}) | undefined>(undefined);


const INITIAL_STATE: UserStateInternal = {
  userId: null,
  username: null,
  nombre: null,
  apellido: null,
  profileImageUrl: null,
  profileType: 'common',
  isOrganization: false,
  totalScore: 0,
  loadingProfile: true,
  challenges: [],
  loadingChallenges: true,
  completedChallengeIds: new Set(),
  loadingCompletedChallenges: true,
};

const profileTypeFromSupabase = (isOrg: boolean | undefined | null): 'common' | 'company' => {
    return isOrg ? 'company' : 'common';
}

// --- Función Auxiliar: Cálculo de Distancia (Haversine) ---
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distancia en km
  return d;
}

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, loading: loadingAuth } = useAuth();
  const [profile, setProfile] = useState<UserStateInternal>(INITIAL_STATE);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  // --- 1. Obtener Ubicación del Usuario ---
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[UserContext] Permiso de ubicación denegado.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        console.log(`[UserContext] Ubicación actualizada: ${location.coords.latitude}, ${location.coords.longitude}`);
      } catch (error) {
        console.error('[UserContext] Error obteniendo ubicación:', error);
      }
    })();
  }, []);

  // Fetch Profile
  const fetchProfile = useCallback(async () => {
      if (!user) {
        setProfile(prev => ({...INITIAL_STATE, loadingProfile: false, loadingCompletedChallenges: false, loadingChallenges: prev.loadingChallenges }));
        return;
      }
      setProfile(prev => ({ ...prev, loadingProfile: true }));

      try {
        const { data, error, status } = await supabase
          .from('usuarios')
          .select(`id, usuario, nombre, apellido, avatar_url, puntaje_total, "esOrganizacion"`)
          .eq('auth_user_id', user.id)
          .single();

        if (error && status !== 406) {
          console.error("Supabase fetch profile error:", error);
          if (status !== 406) throw error;
        }

        const currentUsername = data?.usuario || user.email?.split('@')[0] || 'Invitado';
        const currentUserId = data?.id || null;
        const currentIsOrg = data?.esOrganizacion ?? false;

        setProfile(prev => ({
          ...prev,
          userId: currentUserId,
          username: currentUsername,
          nombre: data?.nombre,
          apellido: data?.apellido,
          profileImageUrl: data?.avatar_url || INITIAL_STATE.profileImageUrl,
          profileType: profileTypeFromSupabase(currentIsOrg),
          isOrganization: currentIsOrg,
          totalScore: data?.puntaje_total ?? INITIAL_STATE.totalScore,
          loadingProfile: false,
        }));

      } catch (error) {
        console.error('[UserContext] Error fetching profile:', error);
        setProfile(prev => ({ ...prev, loadingProfile: false }));
      }
  }, [user]);

  // Fetch Challenges (Trae TODOS, el filtrado se hace en el render del contexto)
  const fetchChallenges = useCallback(async () => {
     console.log("[UserContext] Fetching raw challenges...");
    setProfile(prev => ({ ...prev, loadingChallenges: true }));
    try {
      const { data, error } = await supabase
        .from('retos')
        .select('*')
        .eq('activo', true)
        .limit(100);

      if (error) throw error;
      setProfile(prev => ({ ...prev, challenges: (data as Reto[]) || [], loadingChallenges: false }));
    } catch (error) {
      console.error('[UserContext] Error fetching challenges:', error);
      setProfile(prev => ({ ...prev, challenges: [], loadingChallenges: false }));
    }
  }, []);

  const fetchCompletedChallenges = useCallback(async () => {
      const numericUserId = profile.userId;
      if (!user || !numericUserId) {
          setProfile(prev => ({ ...prev, completedChallengeIds: new Set(), loadingCompletedChallenges: false }));
          return;
      }
      setProfile(prev => ({ ...prev, loadingCompletedChallenges: true }));
      try {
          const { data, error } = await supabase
              .from('retos_completados')
              .select('reto_id')
              .eq('usuario_id', numericUserId);

          if (error) throw error;

          const completedIds = new Set(data?.map(item => item.reto_id) || []);
          setProfile(prev => ({ ...prev, completedChallengeIds: completedIds, loadingCompletedChallenges: false }));
      } catch (error) {
          console.error('[UserContext] Error fetching completed challenges:', error);
          setProfile(prev => ({ ...prev, completedChallengeIds: new Set(), loadingCompletedChallenges: false }));
      }
  }, [user, profile.userId]);


  useEffect(() => {
     if (!loadingAuth) {
       if (session && user) {
         fetchProfile().then(() => {
            fetchCompletedChallenges();
         });
         fetchChallenges();
       } else {
          setProfile(prev => ({...INITIAL_STATE, loadingProfile: false, loadingChallenges: false, loadingCompletedChallenges: false }));
       }
     }
  }, [session, user, loadingAuth, fetchProfile, fetchChallenges, fetchCompletedChallenges]);

  const updateProfileInSupabase = async (updates: Partial<UserProfileData>): Promise<boolean> => {
      if (!user) return false;

     const dbColumns: (keyof UserProfileData)[] = [
        'usuario', 'nombre', 'apellido', 'avatar_url', 'puntaje_total', 'esOrganizacion'
     ];

     const updatesForSupabase: Partial<UserProfileData> = {};
     let hasDbUpdates = false;

     for (const key in updates) {
         const typedKey = key as keyof UserProfileData;
         if (dbColumns.includes(typedKey)) {
             updatesForSupabase[typedKey] = updates[typedKey];
             hasDbUpdates = true;
         }
     }

     if (hasDbUpdates) {
        setProfile(prev => ({ ...prev, loadingProfile: true }));
        try {
            const { auth_user_id, id, ...updatePayload } = updatesForSupabase;
            const { error } = await supabase
                 .from('usuarios')
                 .update(updatePayload)
                 .eq('auth_user_id', user.id);

            if (error) throw error;

             const newStateChanges: Partial<UserStateInternal> = {};
             if (updatesForSupabase.usuario !== undefined) newStateChanges.username = updatesForSupabase.usuario;
             if (updatesForSupabase.nombre !== undefined) newStateChanges.nombre = updatesForSupabase.nombre;
             if (updatesForSupabase.apellido !== undefined) newStateChanges.apellido = updatesForSupabase.apellido;
             if (updatesForSupabase.avatar_url !== undefined) newStateChanges.profileImageUrl = updatesForSupabase.avatar_url;
             if (updatesForSupabase.puntaje_total !== undefined) newStateChanges.totalScore = updatesForSupabase.puntaje_total;
             if (updatesForSupabase.esOrganizacion !== undefined) {
                 newStateChanges.isOrganization = updatesForSupabase.esOrganizacion;
                 newStateChanges.profileType = profileTypeFromSupabase(updatesForSupabase.esOrganizacion);
             }

             setProfile(prev => ({ ...prev, ...newStateChanges, loadingProfile: false }));
        } catch (error) {
            console.error('[UserContext] Error updating profile:', error);
            setProfile(prev => ({ ...prev, loadingProfile: false }));
            return false;
        }
     }
      return true;
  };

  // --- Complete Challenge con Validación de Distancia ---
  const completeChallenge = async (
      reto: Reto,
      photoUri: string,
      description?: string | null
  ): Promise<{ success: boolean; message?: string }> => {
    const numericUserId = profile.userId;

    if (!user || !numericUserId) return { success: false, message: "Usuario no autenticado." };
    if (profile.completedChallengeIds.has(reto.id)) return { success: false, message: "Ya has completado este reto." };

    // --- VALIDACIÓN DE DISTANCIA ---
    if (reto.latitud && reto.longitud) {
        if (!userLocation) {
            return { success: false, message: "No se pudo verificar tu ubicación. Asegúrate de tener el GPS activo." };
        }
        const dist = getDistanceFromLatLonInKm(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            reto.latitud,
            reto.longitud
        );

        console.log(`[UserContext] Validando distancia. Usuario a ${dist.toFixed(2)}km del reto.`);

        if (dist > 16) {
            return {
                success: false,
                message: `Estás demasiado lejos (${dist.toFixed(1)}km). Debes estar a menos de 16km para completar este reto.`
            };
        }
    }
    // -------------------------------

    try {
      const photoUrl = await uploadImage(photoUri);
      if (!photoUrl) throw new Error('Falló la subida de la imagen.');

      const now = new Date();
      const horaCompletado = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const { data: completedData, error: completedError } = await supabase
        .from('retos_completados')
        .insert({
            usuario_id: numericUserId,
            reto_id: reto.id,
            hora_completado: horaCompletado
        })
        .select('id')
        .single();
      if (completedError || !completedData) throw completedError;
      const retoCompletadoId = completedData.id;

      const { error: photoError } = await supabase
        .from('fotos_participaciones')
        .insert({
          usuario_id: numericUserId,
          reto_completado_id: retoCompletadoId,
          url_foto: photoUrl,
          descripcion: description || null
        });
      if (photoError) throw photoError;

       const { data: userData, error: userFetchError } = await supabase
           .from('usuarios')
           .select('puntaje_total')
           .eq('id', numericUserId)
           .single();
       if (userFetchError && userFetchError.code !== 'PGRST116') throw userFetchError;
       const currentScore = userData?.puntaje_total || 0;
       const newScore = currentScore + reto.puntos_otorgados;

       const { error: scoreError } = await supabase
           .from('usuarios')
           .update({ puntaje_total: newScore })
           .eq('id', numericUserId);
       if (scoreError) throw scoreError;

       setProfile(prev => ({
           ...prev,
           totalScore: newScore,
           completedChallengeIds: new Set(prev.completedChallengeIds).add(reto.id)
       }));

        const { data: retoData } = await supabase
            .from('retos')
            .select('completaciones_actuales, max_completaciones')
            .eq('id', reto.id)
            .single();

        if (retoData) {
            const currentCompletions = retoData.completaciones_actuales || 0;
            if (retoData.max_completaciones == null || currentCompletions < retoData.max_completaciones) {
                 const newCompletions = currentCompletions + 1;
                 await supabase.from('retos').update({ completaciones_actuales: newCompletions }).eq('id', reto.id);
                 setProfile(prev => ({
                     ...prev,
                     challenges: prev.challenges.map(c =>
                         c.id === reto.id ? { ...c, completaciones_actuales: newCompletions } : c
                     )
                 }));
            }
        }
      return { success: true };
    } catch (error: any) {
      console.error(`[UserContext] Error completing challenge ${reto.id}:`, error);
      return { success: false, message: error.message || "Error desconocido." };
    }
  };

  // --- FILTRADO AUTOMÁTICO DE RETOS POR DISTANCIA ---
  // Calculamos la lista filtrada "al vuelo" cada vez que cambie la ubicación o los retos cargados
  const filteredChallenges = profile.challenges.filter(reto => {
      // Si el reto no tiene ubicación, es un reto global: mostrar siempre
      if (!reto.latitud || !reto.longitud) return true;

      // Si no tenemos ubicación del usuario, ocultamos los retos locales por seguridad (o podrías mostrarlos todos)
      // Aquí elegimos ocultar para cumplir "ni tampoco se le listen"
      if (!userLocation) return false;

      const dist = getDistanceFromLatLonInKm(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          reto.latitud,
          reto.longitud
      );

      // Mostrar solo si está a menos de 16km
      return dist <= 16;
  });

  const internalValue = {
      ...profile,
      userLocation, // Exponemos la ubicación
      filteredChallenges, // Pasamos la lista ya filtrada internamente
      updateProfile: updateProfileInSupabase,
      completeChallenge: completeChallenge
  };

  return <UserContext.Provider value={internalValue}>{children}</UserContext.Provider>;
};

// Hook PÚBLICO
export const useUser = (): UserStatePublic => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  // Mapeamos 'filteredChallenges' a 'challenges' para que el resto de la app use la lista filtrada transparentemente
  return {
      userId: context.userId,
      username: context.username || 'Invitado',
      nombre: context.nombre,
      apellido: context.apellido,
      profileImage: context.profileImageUrl,
      profileType: context.profileType || 'common',
      isOrganization: context.isOrganization ?? false,
      totalScore: context.totalScore,
      loadingProfile: context.loadingProfile,

      // IMPORTANTE: Aquí entregamos la lista filtrada como si fuera la lista principal
      challenges: context.filteredChallenges,

      loadingChallenges: context.loadingChallenges,
      completedChallengeIds: context.completedChallengeIds,
      loadingCompletedChallenges: context.loadingCompletedChallenges,
      userLocation: context.userLocation,
      updateProfile: context.updateProfile,
      completeChallenge: context.completeChallenge,
  };
};