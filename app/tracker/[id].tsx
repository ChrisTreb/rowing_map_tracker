import { addRaceParticipantPosition } from '@/services/raceParticipantPosition';
import { ClassPosition, Position } from '@/types/Position';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';

// CONFIG
const MIN_DISTANCE: number = 0.005;
const MIN_SPEED_DISTANCE: number = 0.01;
const MAX_SPEED: number = 200; // Change to 50 in production
const MAX_ACCURACY: number = 10;
const LOCATION_UPDATE_INTERVAL: number = 2000; // Fréquence de mise à jour en ms
const LOCATION_TASK_NAME = 'background-location-task'; // Nom unique pour la tâche

// Clés AsyncStorage pour persister les IDs du participant
const ASYNC_STORAGE_RP_ID = 'rp_id';
const ASYNC_STORAGE_RP_KEY = 'rp_key';
const ASYNC_STORAGE_START_TIME = 'tracking_start_time';


// API configuration
const apiURL = process.env.EXPO_PUBLIC_API_URL;
const apiKey = process.env.EXPO_PUBLIC_API_KEY;

const INIT_LOCATION: Position = { latitude: 48.39, longitude: -4.48 };

// 🔥 BEARING
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// 🔥 DISTANCE
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000;
};

// SAVE POSITIONS (pour TaskManager)
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
    console.log(`Position saved locally for ${rpp_rp_key}: ${latitude}, ${longitude}`);
  } catch (error) {
    console.error("Failed insertion new position into local database from background task:", error);
    return;
  }

  try {
    const participantPosition = new ClassPosition(latitude, longitude);

    const response = await fetch(`${apiURL}/position/${rpp_rp_key}`, {
      method: 'POST',
      body: JSON.stringify(participantPosition),
    });

    console.log(`Api Post position response code for ${rpp_rp_key}: ${response.status}`);

  } catch (error) {
    console.error("Failed posting new position to API from background task:", error);
  }
};

// --- Définition de la tâche de localisation en arrière-plan ---
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('LOCATION_TASK_ERROR', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[0];

    const storedParticipantId = await AsyncStorage.getItem(ASYNC_STORAGE_RP_ID);
    const storedParticipantKey = await AsyncStorage.getItem(ASYNC_STORAGE_RP_KEY);

    if (storedParticipantId && storedParticipantKey) {
      await globalSaveParticipantPosition(
        parseInt(storedParticipantId),
        storedParticipantKey,
        latestLocation.coords.latitude,
        latestLocation.coords.longitude
      );
    } else {
      console.warn('Participant ID or Key not found in AsyncStorage for background task. Cannot save position.');
    }
  }
});


export default function Tracker() {

  const { id, eventId, participantId, participantKey } = useLocalSearchParams();
  const raceId = parseInt(id as string);
  const raceEventId = parseInt(eventId as string);
  const raceParticipantId = parseInt(participantId as string);
  const raceParticipantKey = participantKey;

  const [currentLocation, setCurrentLocation] = useState<Position>(INIT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [bearing, setBearing] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const lastBearing = useRef<number>(0);

  const webviewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null); // Pour le suivi en premier plan (UI)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gérer les permissions de localisation au montage et nettoyer à l'unmount
  useEffect(() => {
    const initializeTrackingAndPermissions = async () => {
      // Demande de permission de localisation en premier plan
      let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission refusée', 'La permission d\'accéder à la localisation en premier plan est nécessaire.');
        setIsLoadingLocation(false); // Arrêter le chargement même en cas d'erreur
        return;
      }

      // Demande de permission de localisation en arrière-plan (Android/iOS)
      let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert('Permission refusée', 'La permission d\'accéder à la localisation en arrière-plan est nécessaire pour le tracking continu.');
        // Le tracking de l'UI peut toujours fonctionner, mais le tracking en arrière-plan sera limité.
      }

      // Tenter de récupérer la position actuelle du téléphone
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });
        // Si le chemin est vide, ajouter la position initiale
        setPath([{
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        }]);
      } catch (error) {
        console.error("Failed to get initial location:", error);
        Alert.alert("Erreur", "Impossible de récupérer votre position actuelle.");
      } finally {
        setIsLoadingLocation(false); // Fin du chargement de la position initiale
      }


      // Vérifier si la tâche est déjà enregistrée et si le tracking est actif
      const isTaskActive = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      setIsTracking(isTaskActive);

      // Si le tracking était déjà actif, on peut tenter de récupérer le temps de début
      if (isTaskActive) {
          const storedStartTime = await AsyncStorage.getItem(ASYNC_STORAGE_START_TIME);
          if (storedStartTime) {
              startTimeRef.current = parseInt(storedStartTime);
              // Lancer le timer pour le temps écoulé si le tracking est actif
              timerRef.current = setInterval(() => {
                if (startTimeRef.current) {
                  setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
                }
              }, 1000) as unknown as NodeJS.Timeout;
          }
          console.log("Background location task was active. UI state might not reflect actual path/distance without persistence load.");

          // Lancer un watchPositionAsync juste pour mettre à jour l'UI en premier plan
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 1
            },
            (location) => {
              const { latitude, longitude, accuracy } = location.coords;
              if (accuracy != null && accuracy > MAX_ACCURACY) return;

              const now = location.timestamp;
              const newPoint = { latitude, longitude };

              setPath(prev => {
                if (prev.length === 0) return [newPoint];
                const last = prev[prev.length - 1];
                const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);
                if (d < MIN_DISTANCE) return prev;

                let speed = 0;
                if (lastTimestamp.current) {
                  const dt = (now - lastTimestamp.current) / 1000;
                  if (dt > 0) speed = (d / dt) * 3600;
                }
                lastTimestamp.current = now;
                if (speed > MAX_SPEED) return prev;

                setCurrentSpeed(prev => prev * 0.7 + speed * 0.3);
                if (speed > 1) {
                  const raw: number = getBearing(last.latitude, last.longitude, latitude, longitude);
                  const smoothBearing = lastBearing.current + (raw - lastBearing.current) * 0.2;
                  lastBearing.current = smoothBearing;
                  setBearing(smoothBearing);
                }
                setDistance(dist => dist + d);
                return [...prev, newPoint];
              });
              setCurrentLocation(newPoint);
            }
          );
      }
    };

    initializeTrackingAndPermissions();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, []); // Le tableau de dépendances vide assure qu'il s'exécute une seule fois au montage

  // 🌍 MAP
  const leafletHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <style>
      body { margin: 0; }
      #map { height: 100vh; }

      .marker-inner {
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 20px solid #4266f5;
        transform-origin: 50% 70%;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script>
      var map = L.map('map').setView([48.39, -4.48], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png').addTo(map);

      var polyline = L.polyline([], { color: '#4266f5', weight: 5 }).addTo(map);
      var marker = null;

      function handleMessage(event) {
        var data = JSON.parse(event.data);
        var point = [data.lat, data.lng];

        // marker
        if (!marker) {
          marker = L.marker(point, {
            icon: L.divIcon({
              html: '<div class="marker-inner"></div>'
            })
          }).addTo(map);
        } else {
          marker.setLatLng(point);
        }

        // rotation
        var el = marker.getElement();
        if (el) {
          var inner = el.querySelector('.marker-inner');
          if (inner) {
            inner.style.transform = 'rotate(' + (data.bearing || 0) + 'deg)';
          }
        }

        // path
        if (data.path) {
          var latlngs = data.path.map(p => [p.latitude, p.longitude]);
          polyline.setLatLngs(latlngs);
        }

        if (data.follow) {
          map.setView(point, 17);
        }
      }

      document.addEventListener("message", handleMessage);
      window.addEventListener("message", handleMessage);
    </script>
  </body>
  </html>
  `;

  /// 📡 SEND MAP (remis à l'intérieur du composant)
  useEffect(() => {
    // Ne met à jour la WebView que si l'application est en premier plan
    // et que le ref de la webview est disponible.
    if (AppState.currentState === 'active' && webviewRef.current) {
        webviewRef.current?.postMessage(JSON.stringify({
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
            path,
            bearing,
            follow: true
        }));
    }
  }, [currentLocation, path, bearing]);


  // ▶️ START
  const startTracking = async () => {
    const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      Alert.alert("Tracking", "Le tracking est déjà démarré.");
      setIsTracking(true);
      return;
    }

    // Réinitialiser l'état UI
    setDistance(0);
    setTimeElapsed(0);
    setPath([]);
    setCurrentSpeed(0);
    lastTimestamp.current = null;

    startTimeRef.current = Date.now();
    await AsyncStorage.setItem(ASYNC_STORAGE_START_TIME, startTimeRef.current.toString()); // Persister le temps de début

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000) as unknown as NodeJS.Timeout;

    try {
      // Stocker les IDs du participant dans AsyncStorage pour la tâche en arrière-plan
      await AsyncStorage.setItem(ASYNC_STORAGE_RP_ID, raceParticipantId.toString());
      await AsyncStorage.setItem(ASYNC_STORAGE_RP_KEY, raceParticipantKey as string);

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 1, // Mètres
        timeInterval: LOCATION_UPDATE_INTERVAL, // Millisecondes
        foregroundService: {
          notificationTitle: 'Tracking de la course',
          notificationBody: `Votre position est partagée pour l'événement ${raceEventId} et participant ${raceParticipantKey}.`,
          notificationColor: '#216161',
        },
        activityType: Location.ActivityType.OtherNavigation,
        pausesUpdatesAutomatically: false,
      });

      setIsTracking(true);
      Alert.alert("Tracking démarré", "Le suivi GPS est maintenant actif en arrière-plan. Une notification est visible.");

      // Démarrer le watchPositionAsync pour mettre à jour l'UI en premier plan
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1
        },
        (location) => {
          const { latitude, longitude, accuracy } = location.coords;
          if (accuracy != null && accuracy > MAX_ACCURACY) return;

          const now = location.timestamp;
          const newPoint = { latitude, longitude };

          setPath(prev => {
            if (prev.length === 0) return [newPoint];
            const last = prev[prev.length - 1];
            const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);
            if (d < MIN_DISTANCE) return prev;

            let speed = 0;
            if (lastTimestamp.current) {
              const dt = (now - lastTimestamp.current) / 1000;
              if (dt > 0) speed = (d / dt) * 3600;
            }
            lastTimestamp.current = now;
            if (speed > MAX_SPEED) return prev;

            setCurrentSpeed(prev => prev * 0.7 + speed * 0.3);
            if (speed > 1) {
              const raw: number = getBearing(last.latitude, last.longitude, latitude, longitude);
              const smoothBearing = lastBearing.current + (raw - lastBearing.current) * 0.2;
              lastBearing.current = smoothBearing;
              setBearing(smoothBearing);
            }
            setDistance(dist => dist + d);
            return [...prev, newPoint];
          });
          setCurrentLocation(newPoint);
          // La sauvegarde de position est gérée par la tâche en arrière-plan.
          // On ne fait que mettre à jour l'UI ici.
        }
      );

    } catch (e) {
      console.error('Error starting location updates:', e);
      Alert.alert("Erreur", "Impossible de démarrer le suivi GPS. Vérifiez les permissions.");
      setIsTracking(false);
      // Nettoyer en cas d'échec
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      startTimeRef.current = null;
      await AsyncStorage.multiRemove([ASYNC_STORAGE_RP_ID, ASYNC_STORAGE_RP_KEY, ASYNC_STORAGE_START_TIME]);
    }
  };

  // ⏹ STOP
  const stopTracking = async () => {
    const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!hasStarted) {
      Alert.alert("Tracking", "Le tracking n'est pas actif.");
      setIsTracking(false);
      return;
    }

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (locationSubscription.current) {
          locationSubscription.current.remove();
          locationSubscription.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null; // Réinitialiser le temps de début

      // Nettoyer les données persistantes du tracking
      await AsyncStorage.multiRemove([ASYNC_STORAGE_RP_ID, ASYNC_STORAGE_RP_KEY, ASYNC_STORAGE_START_TIME]);

      setIsTracking(false);
      Alert.alert("Tracking arrêté", "Le suivi GPS a été désactivé.");

      // Réinitialiser l'UI pour un arrêt propre
      setDistance(0);
      setTimeElapsed(0);
      setPath([]);
      setCurrentSpeed(0);
      setBearing(0);
      setCurrentLocation(INIT_LOCATION);

    } catch (e) {
      console.error('Error stopping location updates:', e);
      Alert.alert("Erreur", "Impossible d'arrêter le suivi GPS.");
    }
  };

  // Helper pour formater le temps en HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map(v => v < 10 ? "0" + v : v)
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  // Rendu conditionnel pendant le chargement de la position initiale
  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement de votre position...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageInformations}>Event id: {raceEventId} - Race id: {raceId} - Participant id: {raceParticipantId} - Participant key: {raceParticipantKey}</Text>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          style={styles.map}
        />
      </View>

      {!isTracking ? (
        <TouchableOpacity onPress={startTracking} style={[styles.btn, styles.btnStart]}>
          <Text style={styles.btnText}><Ionicons name="play" size={26} color="white" /> Démarrer le tracking</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={[styles.btn, styles.btnStop]}>
          <Text style={styles.btnText}><Ionicons name="stop" size={26} color="white" /> Stopper le tracking</Text>
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
            <Text style={styles.unit}></Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Vitesse actuelle</Text>
            <Text style={[styles.value, { color: "#FFCE39" }]}>
              {currentSpeed.toFixed(2)}
            </Text>
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
};

// ... Styles restent inchangés ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3E5E7', paddingVertical: 40, paddingHorizontal: 10 },

  pageInformations: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  mapContainer: { height: 350 },
  map: { flex: 1 },

  btn: {
    display: 'flex',
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
    height: 80,
    alignSelf: "center",
    marginTop: 20,
    borderRadius: 40,
    color: '#f8f9ff',
    elevation: 3,
  },
  btnText: { fontSize: 20, color: '#f8f9ff', fontWeight: 'bold' },
  btnStart: { backgroundColor: "#216161" },
  btnStop: { backgroundColor: "#FE4B32" },

  infos: { marginTop: 20, paddingHorizontal: 15 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  card: {
    flex: 1,
    backgroundColor: "#0A0F0E",
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 3,
    alignItems: "center",
    elevation: 3,
  },

  label: { fontSize: 16, color: "#E3E5E7" },
  value: { fontSize: 28, fontWeight: "bold", color: "#E3E5E7" },
  unit: { fontSize: 12, color: "#E3E5E7" },

  // Nouveaux styles pour le chargement
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