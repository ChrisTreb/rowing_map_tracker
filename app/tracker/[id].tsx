import { addRaceParticipantPosition } from '@/services/raceParticipantPosition';
import { ClassPosition, Position } from '@/types/Position';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ======================================================
// CONFIG
// ======================================================

const LOCATION_TASK_NAME = 'background-location-task';

const MIN_DISTANCE = 0.005; // km = 5m
const MAX_SPEED = 200; // km/h
const MAX_ACCURACY = 30;

const LOCATION_UPDATE_INTERVAL = 10000;
const LOCATION_DISTANCE_INTERVAL = 10;

const INIT_LOCATION: Position = {latitude: 48.39, longitude: -4.48};

const apiURL = process.env.EXPO_PUBLIC_API_URL;

// ======================================================
// ASYNC STORAGE KEYS
// ======================================================

const ASYNC_STORAGE_RP_ID = 'rp_id';
const ASYNC_STORAGE_RP_KEY = 'rp_key';
const ASYNC_STORAGE_START_TIME = 'tracking_start_time';
const ASYNC_STORAGE_LAST_BG_POSITION = 'last_bg_position';

// ======================================================
// HELPERS
// ======================================================

export const openBatteryOptimizationSettings = async () => {
  if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    );
  }
};

const getBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
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
    (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000
  );
};

// ======================================================
// API SAVE
// ======================================================

const globalSaveParticipantPosition = async (
  rpp_rp_id: number,
  rpp_rp_key: string,
  latitude: number,
  longitude: number
) => {
  try {
    await addRaceParticipantPosition(
      rpp_rp_id,
      rpp_rp_key,
      new Date().getTime(),
      latitude,
      longitude
    );

    console.log(
      `LOCAL SAVE OK -> ${latitude}, ${longitude}`
    );
  } catch (error) {
    console.error('LOCAL SAVE ERROR:', error);
  }

  try {
    const participantPosition = new ClassPosition(latitude, longitude);

    const response = await fetch(
      `${apiURL}/position/${rpp_rp_key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(participantPosition),
      }
    );

    console.log(
      `API SAVE OK (${response.status}) -> ${latitude}, ${longitude}`
    );
  } catch (error) {
    console.error('API SAVE ERROR:', error);
  }
};

// ======================================================
// BACKGROUND TASK
// ======================================================

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('TASK ERROR:', error);
      return;
    }

    if (!data) return;

    try {
      const { locations } = data as {
        locations: Location.LocationObject[];
      };

      if (!locations || locations.length === 0) {
        return;
      }

      // IMPORTANT
      // prendre la plus récente
      const latestLocation = locations[locations.length - 1];

      const {latitude, longitude, accuracy} = latestLocation.coords;

      const timestamp = latestLocation.timestamp;

      // Accuracy filter
      if (accuracy != null && accuracy > MAX_ACCURACY) {
        console.log('IGNORED BAD ACCURACY');
        return;
      }

      // Last position
      const lastPositionRaw = await AsyncStorage.getItem(ASYNC_STORAGE_LAST_BG_POSITION);

      if (lastPositionRaw) {
        const lastPosition = JSON.parse(lastPositionRaw);

        const distance = calculateDistance(
          lastPosition.latitude,
          lastPosition.longitude,
          latitude,
          longitude
        );

        const dt = (timestamp - lastPosition.timestamp) / 1000;

        // duplicate
        if (distance < MIN_DISTANCE) {
          console.log('IGNORED DUPLICATE');
          return;
        }

        // too fast
        if (dt < 2) {
          console.log('IGNORED TOO FAST');
          return;
        }

        // speed filter
        const speed = (distance / dt) * 3600;

        if (speed > MAX_SPEED) {
          console.log('IGNORED INVALID SPEED');
          return;
        }
      }

      // save last valid position
      await AsyncStorage.setItem(ASYNC_STORAGE_LAST_BG_POSITION, JSON.stringify({latitude, longitude, timestamp}));

      const storedParticipantId = await AsyncStorage.getItem(ASYNC_STORAGE_RP_ID);
      const storedParticipantKey = await AsyncStorage.getItem(ASYNC_STORAGE_RP_KEY);

      if (!storedParticipantId || !storedParticipantKey) {
        console.error('MISSING PARTICIPANT DATA');
        return;
      }

      await globalSaveParticipantPosition(
        parseInt(storedParticipantId),
        storedParticipantKey,
        latitude,
        longitude
      );
    } catch (err) {
      console.error('BACKGROUND TASK FAILED:', err);
    }
  }
);

// ======================================================
// COMPONENT
// ======================================================

export default function Tracker() {
  const {id, eventId, participantId, participantKey} = useLocalSearchParams();

  const raceId = parseInt(id as string);
  const raceEventId = parseInt(eventId as string);
  const raceParticipantId = parseInt(participantId as string);
  const raceParticipantKey = participantKey as string;
  const [currentLocation, setCurrentLocation] = useState<Position>(INIT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [bearing, setBearing] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const lastBearing = useRef<number>(0);
  const webviewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    initialize();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const initialize = async () => {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();

      if (fg.status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Permission GPS nécessaire'
        );
        return;
      }

      const bg = await Location.requestBackgroundPermissionsAsync();

      if (bg.status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Permission arrière-plan nécessaire'
        );
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setPath([
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      ]);

      const isTaskActive = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

      setIsTracking(isTaskActive);

      if (isTaskActive) {
        startForegroundWatcher();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // ======================================================
  // FOREGROUND WATCHER
  // ======================================================

  const startForegroundWatcher = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    locationSubscription.current =
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const {latitude, longitude, accuracy} = location.coords;

          if (
            accuracy != null &&
            accuracy > MAX_ACCURACY
          ) {
            return;
          }

          const now = location.timestamp;
          const newPoint = {latitude, longitude};

          setPath((prev) => {
            if (prev.length === 0) {
              return [newPoint];
            }

            const last = prev[prev.length - 1];

            const d = calculateDistance(
              last.latitude,
              last.longitude,
              latitude,
              longitude
            );

            if (d < MIN_DISTANCE) {
              return prev;
            }

            let speed = 0;

            if (lastTimestamp.current) {
              const dt =
                (now - lastTimestamp.current) / 1000;

              if (dt > 0) {
                speed = (d / dt) * 3600;
              }
            }

            lastTimestamp.current = now;

            if (speed > MAX_SPEED) {
              return prev;
            }

            setCurrentSpeed(
              (prev) => prev * 0.7 + speed * 0.3
            );

            if (speed > 1) {
              const raw = getBearing(last.latitude, last.longitude, latitude, longitude);
              const smoothBearing = lastBearing.current + (raw - lastBearing.current) * 0.2;
              lastBearing.current = smoothBearing;
              setBearing(smoothBearing);
            }

            setDistance((dist) => dist + d);

            return [...prev, newPoint];
          });

          setCurrentLocation(newPoint);
        }
      );
  };

  // ======================================================
  // START TRACKING
  // ======================================================

  const startTracking = async () => {
    try {
      const alreadyStarted =
        await TaskManager.isTaskRegisteredAsync(
          LOCATION_TASK_NAME
        );

      if (alreadyStarted) {
        Alert.alert(
          'Tracking',
          'Déjà démarré'
        );
        return;
      }

      // await openBatteryOptimizationSettings();

      setDistance(0);
      setTimeElapsed(0);
      setPath([]);
      setCurrentSpeed(0);

      startTimeRef.current = Date.now();

      await AsyncStorage.setItem(ASYNC_STORAGE_START_TIME, startTimeRef.current.toString());
      await AsyncStorage.setItem(ASYNC_STORAGE_RP_ID, raceParticipantId.toString());

      await AsyncStorage.setItem(ASYNC_STORAGE_RP_KEY, raceParticipantKey);

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setTimeElapsed(
            Math.floor(
              (Date.now() - startTimeRef.current) /
              1000
            )
          );
        }
      }, 1000);

      await Location.startLocationUpdatesAsync(
        LOCATION_TASK_NAME,
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_INTERVAL,
          deferredUpdatesInterval: 10000,
          deferredUpdatesDistance: 10,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.Fitness,

          foregroundService: {
            notificationTitle: 'Tracking GPS actif',
            notificationBody: 'Votre position est partagée',
            notificationColor: '#216161',
            killServiceOnDestroy: false,
          },
        }
      );

      await startForegroundWatcher();
      setIsTracking(true);
      Alert.alert('Tracking démarré', 'Le tracking GPS est actif');

    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de démarrer le tracking');
    }
  };

  // ======================================================
  // STOP TRACKING
  // ======================================================

  const stopTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      await AsyncStorage.multiRemove([
        ASYNC_STORAGE_RP_ID,
        ASYNC_STORAGE_RP_KEY,
        ASYNC_STORAGE_START_TIME,
        ASYNC_STORAGE_LAST_BG_POSITION,
      ]);

      setIsTracking(false);
      setDistance(0);
      setTimeElapsed(0);
      setPath([]);
      setCurrentSpeed(0);
      setBearing(0);

      Alert.alert(
        'Tracking arrêté',
        'Le tracking GPS est désactivé'
      );
    } catch (e) {
      console.error(e);

      Alert.alert(
        'Erreur',
        'Impossible d’arrêter le tracking'
      );
    }
  };

  // ======================================================
  // WEBVIEW UPDATE
  // ======================================================

  useEffect(() => {
    if ( AppState.currentState === 'active' && webviewRef.current) {
      webviewRef.current.postMessage(
        JSON.stringify({
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          path,
          bearing,
          follow: true,
        })
      );
    }
  }, [currentLocation, path, bearing]);

  // ======================================================
  // HTML MAP
  // ======================================================

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

      <style>
        body {
          margin: 0;
        }
        #map {
          height: 100vh;
        }
        .marker-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gps-arrow {
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4));
          transform-origin: center center;
          transition: transform 0.15s linear;
        }
      </style>
    </head>

    <body>

      <div id="map"></div>

      <script>
        var map = L.map('map').setView([48.39, -4.48], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png').addTo(map);

        var polyline = L.polyline([], {color: '#4266f5', weight: 5}).addTo(map);

        var marker = null;

        function handleMessage(event) {

          var data = JSON.parse(event.data);
          var point = [data.lat, data.lng];

          if (!marker) {
            marker = L.marker(point, {
              icon: L.divIcon({
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],

                html: '<div class="marker-wrapper">' +
                '<svg class="gps-arrow" width="32" height="32" viewBox="0 0 32 32">' +
                '<path d="M16 2 L28 28 L16 22 L4 28 Z" fill="#4266f5" stroke="white" stroke-width="2"/>' +
                '</svg>' +
                '</div>'
              })
            }).addTo(map);

          } else {
            marker.setLatLng(point);
          }

          var el = marker.getElement();

          if (el) {
            var inner = el.querySelector('.gps-arrow');
            if (inner) {
              inner.style.transform = 'rotate(' + (data.bearing || 0) + 'deg)';
            }
          }

          if (data.path) {
            var latlngs = data.path.map(
              p => [p.latitude, p.longitude]
            );
            polyline.setLatLngs(latlngs);
          }

          if (data.follow) {
            map.setView(point, 17);
          }
        }

        document.addEventListener(
          "message",
          handleMessage
        );

        window.addEventListener(
          "message",
          handleMessage
        );
      </script>
    </body>
    </html>
    `;

  // ======================================================
  // FORMAT TIME
  // ======================================================

  const formatTime = (totalSeconds: number) => {

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((v) => (v < 10 ? '0' + v : v))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff"/>
        <Text style={styles.loadingText}>Chargement GPS...</Text>
      </View>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <View style={styles.container}>
      <Text style={styles.pageInformations}>
        Event id: {raceEventId} - 
        Race id:{' '} {raceId} -
         Participant id:{' '} {raceParticipantId} - 
         Key:{' '} {raceParticipantKey}
      </Text>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          style={styles.map}
        />
      </View>

      {!isTracking ? (
        <TouchableOpacity onPress={startTracking} style={[styles.btn, styles.btnStart,]} >
          <Text style={styles.btnText}>
            <Ionicons name="play" size={26} color="white" />{' '} Démarrer le tracking
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={[styles.btn, styles.btnStop,]} >
          <Text style={styles.btnText}>
            <Ionicons name="stop" size={26} color="white" />{' '} Stopper le tracking
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.infos}>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>{distance.toFixed(2)}</Text>
            <Text style={styles.unit}>km</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Temps</Text>
            <Text style={styles.value}>{formatTime(timeElapsed)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Vitesse actuelle</Text>
            <Text style={[styles.value, { color: '#FFCE39' },]}>{currentSpeed.toFixed(2)}</Text>
            <Text style={styles.unit}>km/h</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Vitesse moyenne</Text>

            <Text style={styles.value}>
              {(timeElapsed > 0 ? distance / (timeElapsed / 3600) : 0).toFixed(2)}
            </Text>
            <Text style={styles.unit}>km/h</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3E5E7',
    paddingVertical: 40,
    paddingHorizontal: 10,
  },

  pageInformations: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  mapContainer: {
    height: 350,
  },

  map: {
    flex: 1,
  },

  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 60,
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 40,
    elevation: 3,
  },

  btnStart: {
    backgroundColor: '#216161',
  },

  btnStop: {
    backgroundColor: '#FE4B32',
  },

  btnText: {
    fontSize: 20,
    color: '#f8f9ff',
    fontWeight: 'bold',
  },

  infos: {
    marginTop: 20,
    paddingHorizontal: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  card: {
    flex: 1,
    backgroundColor: '#0A0F0E',
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 3,
    alignItems: 'center',
    elevation: 3,
  },

  label: {
    fontSize: 16,
    color: '#E3E5E7',
  },

  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E3E5E7',
  },

  unit: {
    fontSize: 12,
    color: '#E3E5E7',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3E5E7',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
});