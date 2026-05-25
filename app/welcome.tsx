import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

export default function WelcomeScreen() {
  const theme = useTheme();

  return (
    <ImageBackground
      source={require('../assets/images/fondo.jpg')}
      resizeMode="cover"
      style={styles.imageBackground}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Se eliminó el View que creaba el círculo verde */}
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoImage} // Este estilo ahora controla el tamaño y posición del logo
            resizeMode="contain"
          />

          <Text style={styles.title}>
            CaminAR
          </Text>
          <Text style={styles.subtitle}>
            La aventura se encuentra con la ecología.
            Descubrí, desafiá y marcá la diferencia.
          </Text>

          <Link href="/login" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                Comenzá tu viaje ecológico
              </Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.missionText}>
            Impulsado por tu pasión por el planeta
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  // Se eliminó el estilo 'logoContainer' que creaba el círculo
  logoImage: {
    width: 120, // Un tamaño adecuado para el logo solo
    height: 120,
    marginBottom: 24, // Mantenemos el espacio inferior
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    marginBottom: 10,
  },
  subtitle: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  missionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    position: 'absolute',
    bottom: -60,
  },
});

