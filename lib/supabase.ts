import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// --- DEBES REEMPLAZAR ESTOS VALORES ---
// 1. Ve a tu proyecto de Supabase -> Settings -> API
// 2. Copia la URL del Proyecto y la Clave "anon" (pública)
const supabaseUrl = 'https://rxorwfmlmvauydpgwdhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3J3Zm1sbXZhdXlkcGd3ZGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjkwMzIsImV4cCI6MjA3NjI0NTAzMn0.gFRUW6iHj2vFZJwaia49esQLe-Bz-qkazLSc5kBos3Q';

// --- Creación del Cliente de Supabase ---
// El cliente es el punto de entrada para todas tus interacciones con Supabase.
// Le indicamos que use AsyncStorage para manejar la sesión del usuario en el dispositivo.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
