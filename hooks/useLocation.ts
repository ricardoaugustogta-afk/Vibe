import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationState = {
  coords: Coords | null;
  granted: boolean;
  loading: boolean;
  error: string | null;
};

const DEFAULT_COORDS: Coords = { latitude: -11.8563, longitude: -55.5084 };

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    granted: false,
    loading: true,
    error: null,
  });

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      return new Promise<void>((resolve) => {
        if (!('geolocation' in navigator)) {
          setState({ coords: DEFAULT_COORDS, granted: false, loading: false, error: 'no_geolocation' });
          resolve();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setState({
              coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
              granted: true,
              loading: false,
              error: null,
            });
            resolve();
          },
          () => {
            setState({ coords: DEFAULT_COORDS, granted: false, loading: false, error: 'denied' });
            resolve();
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      });
    }

    setState((s) => ({ ...s, loading: true }));
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({ coords: DEFAULT_COORDS, granted: false, loading: false, error: 'denied' });
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({
        coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        granted: true,
        loading: false,
        error: null,
      });
    } catch {
      setState({ coords: DEFAULT_COORDS, granted: false, loading: false, error: 'failed' });
    }
  }, []);

  return { ...state, requestPermission };
}
