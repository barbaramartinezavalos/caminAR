import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, StatusBar, RefreshControl, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Text, Portal, Dialog, TextInput, Button } from 'react-native-paper';
import * as Location from 'expo-location';
import { HomeHeader } from '../../components/home/HomeHeader';
import WeatherCard from '../../components/home/WeatherCard';
import MapPreview from '../../components/home/MapPreview';
import EcologicalRoutes from '../../components/home/EcologicalRoutes';

interface WeatherData {
  temp: string;
  condition: string;
  tempMin: string;
  tempMax: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

const getWeatherDescription = (code: number): string => {
  const descriptions: { [key: number]: string } = {
    0: 'Despejado', 1: 'Despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna',
    61: 'Lluvia', 63: 'Lluvia', 65: 'Lluvia fuerte', 71: 'Nieve', 73: 'Nieve',
    75: 'Nieve', 80: 'Chubascos', 81: 'Chubascos', 82: 'Tormenta', 95: 'Tormenta',
    96: 'Granizo', 99: 'Granizo fuerte',
  };
  return descriptions[code] || 'Desconocido';
};

export default function IndexScreen() {
  const theme = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isNight, setIsNight] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherError, setWeatherError] = useState(false);

  // Estados para búsqueda manual
  const [showCityDialog, setShowCityDialog] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  // Función base para traer clima dado lat/lon
  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Error API Clima');
      const data: OpenMeteoResponse = await response.json();

      if (data.current && data.daily) {
        setWeather({
          temp: Math.round(data.current.temperature_2m).toString(),
          condition: getWeatherDescription(data.current.weather_code),
          tempMin: Math.round(data.daily.temperature_2m_min[0]).toString(),
          tempMax: Math.round(data.daily.temperature_2m_max[0]).toString(),
        });
        setWeatherError(false);
      }
    } catch (error) {
      console.log("Error obteniendo datos del clima:", error);
      setWeatherError(true);
    } finally {
      setLoadingWeather(false);
      setRefreshing(false);
    }
  };

  const fetchWeatherData = useCallback(async () => {
    setLoadingWeather(true);
    setWeatherError(false);

    try {
      const currentHour = new Date().getHours();
      setIsNight(currentHour < 6 || currentHour >= 19);

      // 1. Pedir permisos
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeatherError(true);
        setLoadingWeather(false);
        return;
      }

      // 2. Obtener ubicación real
      // Usamos accuracy balanced para evitar demoras excesivas
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // 3. Llamar a la API con coordenadas reales
      await fetchWeatherByCoords(location.coords.latitude, location.coords.longitude);

    } catch (error) {
      console.log("Error obteniendo ubicación GPS:", error);
      // Si falla el GPS, mostramos error para que el usuario elija manual
      setWeatherError(true);
      setLoadingWeather(false);
      setRefreshing(false);
    }
  }, []);

  // Búsqueda manual por nombre de ciudad (Geocoding)
  const handleManualCitySubmit = async () => {
    if (!cityQuery.trim()) return;
    Keyboard.dismiss();
    setIsSearchingCity(true);

    try {
      // API de Geocoding de Open-Meteo
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=es&format=json`;
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, country } = data.results[0];
        console.log(`Ciudad encontrada: ${name}, ${country} (${latitude}, ${longitude})`);

        setShowCityDialog(false);
        setLoadingWeather(true); // Mostrar carga en la tarjeta
        await fetchWeatherByCoords(latitude, longitude);
      } else {
        Alert.alert("Ciudad no encontrada", "Intenta con otro nombre.");
      }
    } catch (error) {
      console.error("Error buscando ciudad:", error);
      Alert.alert("Error", "No se pudo buscar la ciudad.");
    } finally {
      setIsSearchingCity(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeatherData();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.surface}
        translucent={false}
      />

      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface, elevation: 2, zIndex: 1 }}>
        <HomeHeader />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={{ color: theme.colors.outline, marginBottom: 8 }}>
            Tu día hoy
          </Text>

          <WeatherCard
            weather={weather}
            isNight={isNight}
            loading={loadingWeather}
            error={weatherError}
            onRetry={fetchWeatherData}
            onManualInput={() => setShowCityDialog(true)}
          />
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Explora tu entorno</Text>
          <MapPreview />
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleLarge" style={styles.sectionTitle}>Retos cercanos</Text>
          </View>
          <EcologicalRoutes />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Diálogo para ingresar ciudad manual */}
      <Portal>
        <Dialog visible={showCityDialog} onDismiss={() => setShowCityDialog(false)} style={{ backgroundColor: 'white' }}>
          <Dialog.Title>Ingresar Ciudad</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nombre de la ciudad"
              value={cityQuery}
              onChangeText={setCityQuery}
              mode="outlined"
              autoFocus
              onSubmitEditing={handleManualCitySubmit}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCityDialog(false)}>Cancelar</Button>
            <Button onPress={handleManualCitySubmit} loading={isSearchingCity} disabled={isSearchingCity}>
              Buscar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
});