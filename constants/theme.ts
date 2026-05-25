import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,

    // --- Roles principales ---
    primary: '#2E7D5E',        // Verde bosque natural, elegante y cálido.
    onPrimary: '#FFFFFF',      // Texto claro sobre el color principal.

    secondary: '#A4D65E',      // Verde lima suave, fresco, da contraste y vida.
    onSecondary: '#2F3A2E',    // Texto oscuro sobre el secundario.

    tertiary: '#E86A33',       // Naranja tierra, complementa bien a los verdes.
    onTertiary: '#FFFFFF',     // Texto claro sobre naranja.

    // --- Fondos y superficies ---
    background: '#F5F7F2',     // Fondo claro con tinte verdoso, muy natural y suave.
    onBackground: '#2F3A2E',   // Texto principal (verde muy oscuro grisáceo).

    surface: '#FFFFFF',        // Fondo de cards, menús, modales.
    onSurface: '#36423A',      // Texto principal sobre superficie.
    onSurfaceVariant: '#66735E', // Texto secundario, tono más apagado.

    // --- Otros roles ---
    outline: '#D5E2C6',        // Borde suave, verde grisáceo claro.
    text: '#2F3A2E',           // Texto general.
  },
};
