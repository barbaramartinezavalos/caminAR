import { Challenge, MapPoint, Reward, Coupon } from "./types";

// Tus MOCK_CHALLENGES y MOCK_POINTS se mantienen como estaban.
export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "c1",
    title: "Encontrá 20 puntos de reciclaje",
    description: "Ubicá y fotografiá 20 tachos de reciclaje en la ciudad.",
    points: 200,
    status: "in_progress",
    progress: { current: 5, total: 20 },
    type: "visit_points",
    mapPointIds: ["m1", "m2", "m3"],
    coverEmoji: "♻️",
    duration: 7,
    tags: ["Reciclaje", "Urbano"]
  },
  {
    id: "c2",
    title: "Foto: reutilizá una botella",
    description: "Sacá una foto mostrando cómo reutilizás una botella.",
    points: 80,
    status: "available",
    type: "photo_task",
    coverEmoji: "📸",
    tags: ["Creatividad", "Fácil"]
  },
  {
    id: "c3",
    title: "Caminata ecológica 5 km",
    description: "Completá una caminata de 5 km por una ruta verde.",
    points: 120,
    status: "completed",
    type: "custom",
    coverEmoji: "🥾",
    tags: ["Ejercicio", "Naturaleza"]
  },
];

// MOCK_REWARDS ahora incluye todos los campos que definimos en types.ts
export const MOCK_REWARDS: Reward[] = [
  {
    id: "r1",
    title: "Descuento 20% en Café Verde",
    partner: "Café Verde",
    description: "Válido en todas las sucursales de Café Verde por 30 días",
    pointsRequired: 200,
    imageUrl: "https://images.unsplash.com/photo-1559925393-8be0ec476ac7?q=80&w=1954&auto=format&fit=crop",
    category: "Alimentación",
    validUntil: "14/03/2026",
    locations: "Centro, Norte, Sur",
    availability: { current: 33, total: 45 },
  },
  {
    id: "r2",
    title: "10% OFF en EcoTienda",
    partner: "EcoTienda",
    description: "Descuento aplicable en toda la tienda en productos seleccionados.",
    pointsRequired: 150,
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop",
    category: "Compras",
    validUntil: "31/12/2025",
    locations: "Tienda online",
    availability: { current: 89, total: 100 },
  },
];

// Nuevo MOCK_COUPONS para la pestaña "Mis Cupones", con la estructura de la interfaz Coupon
export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'c1',
    title: 'Descuento 15% en productos orgánicos',
    partner: 'Mercado Orgánico',
    status: 'used',
    code: 'EC0123456',
    redeemedDate: '01/09/2025',
    expiryDate: '02/09/2025',
  },
  {
    id: 'c2',
    title: 'Entrada al museo de ciencias',
    partner: 'Acceso completo al museo y planetario',
    status: 'active',
    code: 'CIENCIA24',
    redeemedDate: '20/08/2025',
    expiryDate: '20/11/2025',
  }
];

export const MOCK_POINTS: MapPoint[] = [
  { id: "m1", title: "Tacho reciclaje Plaza", latitude: -31.394, longitude: -58.018, kind: "recycle_bin", challengeIds: ["c1"] },
  { id: "m2", title: "Punto verde Costanera", latitude: -31.405, longitude: -58.016, kind: "recycle_bin", challengeIds: ["c1"] },
  { id: "m3", title: "EcoPunto UNER", latitude: -31.389, longitude: -58.017, kind: "recycle_bin", challengeIds: ["c1"] },
];

