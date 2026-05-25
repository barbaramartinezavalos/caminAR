// Define los posibles estados de un desafío para usarlo de forma consistente
export type ChallengeStatus = "available" | "in_progress" | "completed";

// Define la estructura de los datos para los Retos
export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  status: ChallengeStatus;
  progress?: { current: number; total: number };
  type: "visit_points" | "photo_task" | "custom";
  mapPointIds?: string[];
  coverEmoji?: string;
  tags?: string[];
  duration?: number;
}

// Estructura para los Premios disponibles para canjear (versión completa para la UI)
export interface Reward {
  id: string;
  title: string;
  partner: string;
  description: string;
  pointsRequired: number;
  imageUrl: string;
  category: string;
  validUntil: string;
  locations: string;
  availability: {
    current: number;
    total: number;
  };
  // --- CAMPOS AÑADIDOS ---
  latitud?: number | null;
  longitud?: number | null;
}

// Estructura para los Cupones que el usuario ya tiene (necesaria para la pestaña "Mis Cupones")
export interface Coupon {
  id: string;
  title: string;
  partner: string;
  status: 'active' | 'used';
  code: string;
  redeemedDate: string;
  expiryDate: string;
}

// Estructura para los Puntos en el Mapa
export interface MapPoint {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  description?: string;
  challengeIds?: string[];
  kind: "recycle_bin" | "event" | "poi";
}
