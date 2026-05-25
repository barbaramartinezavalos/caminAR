import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

interface WeatherCardProps {
  weather: {
    condition: string;
    tempMin: string; // Corregido: antes era tempRange en la prop pero usabas min/max en index
    tempMax: string;
    temp: string;
  } | null;
  isNight: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onManualInput?: () => void; // Nueva prop
}

const getWeatherIcon = (condition: string, isNight: boolean): string => {
  if (!condition) return 'weather-sunny';
  const lower = condition.toLowerCase();
  if (lower.includes('despejado')) return isNight ? 'weather-night' : 'weather-sunny';
  if (lower.includes('nublado') || lower.includes('nube')) return 'weather-partly-cloudy';
  if (lower.includes('lluvia') || lower.includes('llovizna')) return 'weather-rainy';
  if (lower.includes('tormenta')) return 'weather-lightning';
  if (lower.includes('nieve')) return 'weather-snowy';
  return 'weather-cloudy';
};

const Skeleton = ({ width, height, style }: { width: number | string, height: number, style?: any }) => (
  <View style={[{ width, height, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 }, style]} />
);

export default function WeatherCard({ weather, isNight, loading = false, error = false, onRetry, onManualInput }: WeatherCardProps) {
  const theme = useTheme();

  const gradientColors = isNight
    ? ['#2c3e50', '#4ca1af']
    : ['#56ab2f', '#a8e063'];

  const conditionText = weather?.condition || "--";
  const tempText = weather?.temp || "--";
  const tempMin = weather?.tempMin || "-";
  const tempMax = weather?.tempMax || "-";
  const iconName = getWeatherIcon(conditionText, isNight);

  if (error) {
    return (
      <Card style={styles.card} mode="elevated">
        <LinearGradient
          colors={['#e57373', '#ef5350']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text variant="titleMedium" style={styles.titleText}>
                Ubicación no disponible
              </Text>
              <Text variant="bodySmall" style={styles.conditionText}>
                No pudimos obtener tu GPS
              </Text>

              <View style={styles.errorActions}>
                {onRetry && (
                  <TouchableOpacity onPress={onRetry} style={styles.actionButton}>
                    <Icon name="refresh" size={16} color="white" />
                    <Text style={styles.actionText}>Reintentar</Text>
                  </TouchableOpacity>
                )}
                {onManualInput && (
                  <TouchableOpacity onPress={onManualInput} style={[styles.actionButton, { marginLeft: 8 }]}>
                    <Icon name="map-search" size={16} color="white" />
                    <Text style={styles.actionText}>Buscar Ciudad</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.weatherInfo}>
              <Icon name="map-marker-off" size={40} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Card>
    );
  }

  return (
    <Card style={styles.card} mode="elevated">
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            {loading ? (
              <>
                <Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
                <Skeleton width={100} height={16} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={16} />
              </>
            ) : (
              <>
                <Text variant="titleLarge" style={styles.titleText}>
                  {isNight ? "Buenas noches" : "¡Hola, a caminar!"}
                </Text>
                <Text variant="bodyLarge" style={styles.conditionText}>
                  {conditionText}
                </Text>
                <Text variant="bodyMedium" style={styles.rangeText}>
                  Mín: {tempMin}° / Máx: {tempMax}°
                </Text>
              </>
            )}
          </View>

          <View style={styles.weatherInfo}>
            {loading ? (
              <Skeleton width={60} height={60} style={{ borderRadius: 30 }} />
            ) : (
              <>
                <Icon name={iconName} size={48} color="#fff" />
                <Text style={styles.tempText}>{tempText}°</Text>
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conditionText: {
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
    textTransform: 'capitalize',
    fontSize: 18,
  },
  rangeText: {
    color: '#fff',
    opacity: 0.8,
  },
  weatherInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  tempText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 40,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  }
});