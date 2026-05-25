import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper'; // Import useTheme

const { width } = Dimensions.get('window');

export default function TutorialStep1() {
  const theme = useTheme(); // Get theme colors

  const handleNext = () => {
    // Navega a la siguiente pantalla del tutorial
    router.push('./tutorial2');
  };

  const handleSkip = () => {
    // Navega a la pantalla principal y reemplaza la historia
    console.log("LOG: [Tutorial1] Saltando tutorial...");
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
        options={{
          headerShown: false, // Oculta el encabezado
        }}
      />
      <View style={styles.container}>
        {/* Espacio para la ilustración */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/2.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Contenido del paso */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>¡Bienvenido a CaminAR!</Text>
          <Text style={styles.description}>
            La aventura se encuentra con la ecología. Descubrí, desafiá y marcá la diferencia en tu ciudad.
          </Text>
        </View>

        {/* Botones de navegación */}
        <View style={styles.buttonContainer}>
          {/* Botón Siguiente */}
          <TouchableOpacity onPress={handleNext} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.buttonText}>Siguiente</Text>
          </TouchableOpacity>
          {/* Botón Saltar */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipButtonText, { color: theme.colors.onSurfaceVariant }]}>Saltar Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding:10,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20, // Add some top padding
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 40,
    alignItems: 'center', // Center buttons horizontally
  },
  button: {
    // backgroundColor is now set using theme
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '80%',
    alignSelf: 'center',
    marginBottom: 10, // Add margin below the main button
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 10, // Slightly smaller padding
    width: '80%',
    alignSelf: 'center',
  },
  skipButtonText: {
    // color is set using theme
    fontSize: 16, // Slightly smaller font size
    textAlign: 'center',
  },
});
