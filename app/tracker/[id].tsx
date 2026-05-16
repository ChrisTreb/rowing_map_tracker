import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const LOCATION_TASK_NAME = 'background-location-task';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const LOCATION_INTERVAL = 3000;
const LOCATION_DISTANCE = 3;
const MAX_ACCURACY = 35;

const STORAGE_RP_ID = 'rp_id';
const STORAGE_RP_KEY = 'rp_key';
const STORAGE_LAST_POSITION = 'last_position';

type Position = {
  latitude: number;
  longitude: number;
};

const INIT_LOCATION: Position = {
  latitude: 48.39,
  longitude: -4.48,
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;

  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  return (
    (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) /
    1000
  );
};

const getBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (deg: number) =>
    (deg * Math.PI) / 180;

  const toDeg = (rad: number) =>
    (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);

  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) *
    Math.cos(φ2) *
    Math.cos(Δλ);

  return (
    (toDeg(Math.atan2(y, x)) + 360) % 360
  );
};

const sendPositionToAPI = async (
  rpId: number,
  rpKey: string,
  latitude: number,
  longitude: number,
  timestamp: number
) => {
  try {
    const response = await fetch(
      `${API_URL}/position/${rpKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          rp_id: rpId,
          rp_key: rpKey,
          latitude,
          longitude,
          timestamp,
        }),
      }
    );

    console.log(
      `API ${response.status} -> ${latitude}, ${longitude}`
    );
  } catch (e) {
    console.error('API ERROR', e);
  }
};

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    const { locations } = data as {
      locations: Location.LocationObject[];
    };

    if (!locations?.length) {
      return;
    }

    const location =
      locations[locations.length - 1];

    const {
      latitude,
      longitude,
      accuracy,
    } = location.coords;

    if (
      accuracy != null &&
      accuracy > MAX_ACCURACY
    ) {
      return;
    }

    const lastPositionRaw =
      await AsyncStorage.getItem(
        STORAGE_LAST_POSITION
      );

    if (lastPositionRaw) {
      const lastPosition =
        JSON.parse(lastPositionRaw);

      const distance = calculateDistance(
        lastPosition.latitude,
        lastPosition.longitude,
        latitude,
        longitude
      );

      if (distance < 0.002) {
        return;
      }
    }

    await AsyncStorage.setItem(
      STORAGE_LAST_POSITION,
      JSON.stringify({
        latitude,
        longitude,
      })
    );

    const rpId = await AsyncStorage.getItem(
      STORAGE_RP_ID
    );

    const rpKey = await AsyncStorage.getItem(
      STORAGE_RP_KEY
    );

    if (!rpId || !rpKey) {
      return;
    }

    await sendPositionToAPI(
      parseInt(rpId),
      rpKey,
      latitude,
      longitude,
      location.timestamp
    );
  }
);

export default function Tracker() {
  const [loading, setLoading] =
    useState(true);

  const [tracking, setTracking] =
    useState(false);

  const [location, setLocation] =
    useState(INIT_LOCATION);

  const [path, setPath] = useState<
    Position[]
  >([]);

  const [bearing, setBearing] =
    useState(0);

  const webviewRef =
    useRef<WebView>(null);

  const foregroundSubscription =
    useRef<Location.LocationSubscription | null>(
      null
    );

  useEffect(() => {
    initialize();

    return () => {
      foregroundSubscription.current?.remove();
    };
  }, []);

  const initialize = async () => {
    try {
      const fg =
        await Location.requestForegroundPermissionsAsync();

      if (fg.status !== 'granted') {
        Alert.alert(
          'Permission refusée'
        );

        return;
      }

      const bg =
        await Location.requestBackgroundPermissionsAsync();

      if (bg.status !== 'granted') {
        Alert.alert(
          'Permission background refusée'
        );
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      setLocation({
        latitude:
          current.coords.latitude,

        longitude:
          current.coords.longitude,
      });

      const started =
        await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TASK_NAME
        );

      setTracking(started);

      await startForegroundWatcher();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startForegroundWatcher =
    async () => {
      foregroundSubscription.current?.remove();

      foregroundSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,

            timeInterval: 2000,

            distanceInterval: 3,
          },

          position => {
            const {
              latitude,
              longitude,
            } = position.coords;

            const newPoint = {
              latitude,
              longitude,
            };

            setPath(prev => {
              if (!prev.length) {
                return [newPoint];
              }

              const last =
                prev[prev.length - 1];

              const rawBearing =
                getBearing(
                  last.latitude,
                  last.longitude,
                  latitude,
                  longitude
                );

              setBearing(rawBearing);

              return [...prev, newPoint];
            });

            setLocation(newPoint);
          }
        );
    };

  const startTracking = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_RP_ID,
        '1'
      );

      await AsyncStorage.setItem(
        STORAGE_RP_KEY,
        'demo-key'
      );

      await Location.startLocationUpdatesAsync(
        LOCATION_TASK_NAME,
        {
          accuracy:
            Location.Accuracy.BestForNavigation,

          timeInterval:
            LOCATION_INTERVAL,

          distanceInterval:
            LOCATION_DISTANCE,

          deferredUpdatesInterval: 3000,

          deferredUpdatesDistance: 3,

          pausesUpdatesAutomatically:
            false,

          foregroundService: {
            notificationTitle:
              'Tracking GPS actif',

            notificationBody:
              'Votre position est envoyée',

            notificationColor:
              '#216161',

            killServiceOnDestroy: false,
          },
        }
      );

      setTracking(true);

      Alert.alert(
        'Tracking démarré'
      );
    } catch (e) {
      console.error(e);
    }
  };

  const stopTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

      setTracking(false);

      Alert.alert(
        'Tracking arrêté'
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    webviewRef.current?.postMessage(
      JSON.stringify({
        lat: location.latitude,
        lng: location.longitude,
        path,
        bearing,
        follow: true,
      })
    );
  }, [location, path, bearing]);

  const leafletHtml = `
  <!DOCTYPE html>
  <html>
  <head>

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet/dist/leaflet.css"
    />

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

    <style>
      body {
        margin: 0;
      }

      #map {
        height: 100vh;
      }

      .gps-arrow {
        transform-origin: center center;
      }
    </style>

  </head>

  <body>

    <div id="map"></div>

    <script>

      var map =
        L.map('map')
          .setView([48.39, -4.48], 15);

      L.tileLayer(
        'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
      ).addTo(map);

      var polyline =
        L.polyline([], {
          color: '#4266f5',
          weight: 5
        }).addTo(map);

      var marker = null;

      function handleMessage(event) {

        var data =
          JSON.parse(event.data);

        var point = [
          data.lat,
          data.lng
        ];

        if (!marker) {

          marker = L.marker(point, {

            icon: L.divIcon({
              className: '',

              iconSize: [40, 40],

              iconAnchor: [20, 20],

              html:
                '<svg class="gps-arrow" width="40" height="40" viewBox="0 0 32 32">' +
                '<path d="M16 2 L28 28 L16 22 L4 28 Z" fill="#4266f5" stroke="white" stroke-width="2"/>' +
                '</svg>'
            })

          }).addTo(map);

        } else {
          marker.setLatLng(point);
        }

        var el =
          marker.getElement();

        if (el) {

          var arrow =
            el.querySelector('.gps-arrow');

          if (arrow) {
            arrow.style.transform =
              'rotate(' +
              (data.bearing || 0) +
              'deg)';
          }
        }

        if (data.path) {

          var latlngs =
            data.path.map(
              p => [
                p.latitude,
                p.longitude
              ]
            );

          polyline.setLatLngs(latlngs);
        }

        if (data.follow) {
          map.setView(point, 17);
        }
      }

      document.addEventListener(
        'message',
        handleMessage
      );

      window.addEventListener(
        'message',
        handleMessage
      );

    </script>

  </body>
  </html>
  `;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: leafletHtml }}
          originWhitelist={['*']}
          style={styles.map}
        />
      </View>

      {!tracking ? (
        <TouchableOpacity
          onPress={startTracking}
          style={[
            styles.button,
            styles.start,
          ]}
        >
          <Text style={styles.buttonText}>
            <Ionicons
              name="play"
              size={22}
              color="white"
            />{' '}
            Démarrer
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={stopTracking}
          style={[
            styles.button,
            styles.stop,
          ]}
        >
          <Text style={styles.buttonText}>
            <Ionicons
              name="stop"
              size={22}
              color="white"
            />{' '}
            Stopper
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3E5E7',
    paddingTop: 40,
    paddingHorizontal: 10,
  },

  mapContainer: {
    height: 400,
    overflow: 'hidden',
    borderRadius: 16,
  },

  map: {
    flex: 1,
  },

  button: {
    height: 60,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  start: {
    backgroundColor: '#216161',
  },

  stop: {
    backgroundColor: '#FE4B32',
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});