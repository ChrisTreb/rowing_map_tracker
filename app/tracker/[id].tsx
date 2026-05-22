import { addRaceParticipantPosition } from '@/services/raceParticipantPosition';
import { ClassPosition, Position } from '@/types/Position';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';
import NavigationModal from './NavigationModal';

// CONFIG
const MIN_DISTANCE: number = 0.005;  // 5 mètres
const MAX_SPEED: number = 200; // Change to 50 in production
const MAX_ACCURACY: number = 30;
const LOCATION_UPDATE_INTERVAL: number = 2000; // Fréquence de mise à jour bdd ou api en ms
const LOCATION_TASK_NAME = 'background-location-task'; // Nom unique pour la tâche

// Clés AsyncStorage pour persister les IDs du participant
const ASYNC_STORAGE_RP_ID = 'rp_id';
const ASYNC_STORAGE_RP_KEY = 'rp_key';
const ASYNC_STORAGE_START_TIME = 'tracking_start_time';

// API configuration
const apiURL = process.env.EXPO_PUBLIC_API_URL;
const apiMapsViewerURL = process.env.EXPO_PUBLIC_API_MAPS_URL;

const INIT_LOCATION: Position = { latitude: 48.39, longitude: -4.48 };

// 🔥 BEARING (calcul amélioré)
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number | null => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// 🔥 DISTANCE
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
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

  // Envoyer la position au serveur via l'API
  sendCurrentPositionToApi(rpp_rp_key, latitude, longitude);
};

const sendCurrentPositionToApi = async (rpp_rp_key: string, latitude: number, longitude: number) => {
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
}

// --- Définition de la tâche de localisation en arrière-plan ---
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  console.log('Task called !');

  if (error) {
    console.error('LOCATION_TASK_ERROR', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    console.log('Locations array in task manager:', locations);

    const storedParticipantId = await AsyncStorage.getItem(ASYNC_STORAGE_RP_ID);
    const storedParticipantKey = await AsyncStorage.getItem(ASYNC_STORAGE_RP_KEY);

    if (storedParticipantId && storedParticipantKey) {

      for (const location of locations) {

        console.log('POSITION:', new Date(location.timestamp).toISOString());

        await globalSaveParticipantPosition(
          parseInt(storedParticipantId),
          storedParticipantKey,
          location.coords.latitude,
          location.coords.longitude
        );
      }
    } else {
      console.warn('Participant ID or Key not found in AsyncStorage for background task. Cannot save position.');
    }
  }
});

export default function Tracker() {

  const { id, eventId, eventName, participantId, participantName, participantKey, raceName, viewerId } = useLocalSearchParams();
  const raceId = parseInt(id as string);
  const raceEventId = parseInt(eventId as string);
  const raceEventName = eventName;
  const raceParticipantId = parseInt(participantId as string);
  const raceParticipantName = participantName;
  const raceParticipantKey = participantKey;
  const raceCurrentName = raceName;
  const apiViewerId = viewerId;

  const [currentLocation, setCurrentLocation] = useState<Position>(INIT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [bearing, setBearing] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const lastBearing = useRef<number | null>(null); // Reset à null pour initialiser proprement
  const webviewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null); // Pour le suivi en premier plan (UI)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gérer le mode KeepAwake en fonction de l'état de tracking
  useKeepAwake(isTracking ? 'tracking' : undefined);

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

      // Demande de permission de permission de localisation en arrière-plan (Android/iOS)
      let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert('Permission refusée', 'La permission d\'accéder à la localisation en arrière-plan est nécessaire pour le tracking continu.');
        // Le tracking de l'UI peut toujours fonctionner, mais le tracking en arrière-plan sera limité.
      }

      // Tenter de récupérer la position actuelle du téléphone
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
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
  }, []);

  /// 📡 SEND MAP
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
    // Réinitialiser l'état UI complètement
    setDistance(0);
    setTimeElapsed(0);
    setPath([]);

    // Reset de la vitesse à null pour éviter le smoothing précédent
    setCurrentSpeed(null);
    lastTimestamp.current = null;
    lastBearing.current = null; // Reset le dernier bearing

    startTimeRef.current = Date.now();
    await AsyncStorage.setItem(ASYNC_STORAGE_START_TIME, startTimeRef.current.toString());

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
        distanceInterval: 1,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Tracking de la course',
          notificationBody: `Votre position est partagée pour l'événement ${raceEventId} et participant ${raceParticipantKey}.`,
          notificationColor: '#216161',
          killServiceOnDestroy: true,
        },
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
      });

      setIsTracking(true);

      // Démarrer le watchPositionAsync pour mettre à jour l'UI en premier plan
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 1
        },
        (location) => {
          const { latitude, longitude, accuracy, speed: gpsSpeed } = location.coords;

          // Ignorer si précision GPS est mauvaise
          if (accuracy != null && accuracy > MAX_ACCURACY) return;

          const now = location.timestamp;
          const newPoint = { latitude, longitude };

          setPath(prev => {
            if (prev.length === 0) {
              lastTimestamp.current = now; // Initialise lastTimestamp pour la première position
              return [newPoint];
            }
            const last = prev[prev.length - 1];
            const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);

            // Seuil de distance : éviter les positions bruitées
            if (d < MIN_DISTANCE) return prev;

            let speed = 0;

            if (lastTimestamp.current && now >= lastTimestamp.current) {
              const dt = (now - lastTimestamp.current) / 1000; // en secondes

              // Éviter la division par zéro
              if (dt > 0.5) { // Minimum 0.5s entre deux positions
                speed = (d / dt) * 3.6; // km/h
              }
            }

            lastTimestamp.current = now;

            // Utiliser la vélocité GPS si disponible et valide, sinon le calcul distance/temps
            const gpsSpeedKmh = (gpsSpeed && typeof gpsSpeed === 'number' && gpsSpeed > 0) ? gpsSpeed * 3.6 : null;

            // Préférer GPS si vitesse calculée est trop faible (bruit de GPS)
            const finalSpeed = (gpsSpeedKmh !== null && gpsSpeedKmh > speed * 1.5) ? gpsSpeedKmh : speed;

            // ✅ ARRÊT INTELLIGENT : Reset la vitesse à 0 si l'utilisateur s'arrête
            if (d < 0.003 || finalSpeed < 0.1) {
              setCurrentSpeed(0);
              return prev;
            }

            // Limiter MAX_SPEED uniquement pour la boucle, pas pour l'affichage
            const smoothedFinalSpeed = Math.min(finalSpeed, MAX_SPEED);

            // ✅ Smoothed speed avec reset complet à 0 quand on est à l'arrêt
            let nextSpeed = 0;
            if (currentSpeed === null) {
              // Première position : utiliser la vitesse réelle
              nextSpeed = smoothedFinalSpeed;
            } else {
              // Appliquer le smoothing seulement si on bouge
              nextSpeed = currentSpeed * 0.3 + smoothedFinalSpeed * 0.7;
            }

            setCurrentSpeed(nextSpeed);
            const rawBearing = getBearing(last.latitude, last.longitude, latitude, longitude);
            if (rawBearing !== null) {
              let smoothBearing;
              if (lastBearing.current === null) {
                smoothBearing = rawBearing;
              } else {
                // Smoothing du bearing. Gérer le passage de 359 à 0 degrés
                let diff = rawBearing - lastBearing.current;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothBearing = (lastBearing.current + diff * 0.2 + 360) % 360;
              }
              lastBearing.current = smoothBearing;
              setBearing(smoothBearing);
            }

            setDistance(dist => dist + d);
            return [...prev, newPoint];
          });

          setCurrentLocation(newPoint);
        }
      );
    } catch (e) {
      console.error('Error starting location updates:', e);
      Alert.alert("Erreur", "Impossible de démarrer le suivi GPS. Vérifiez les permissions.");
      setIsTracking(false);
      // Nettoyer en cas d'échec
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      startTimeRef.current = null;
      lastBearing.current = null; // Reset bearing en cas d'échec
      await AsyncStorage.multiRemove([ASYNC_STORAGE_RP_ID, ASYNC_STORAGE_RP_KEY, ASYNC_STORAGE_START_TIME]);
    }
  };

  const handleStart = () => {
    setModalVisible(true);
    startTracking();
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
      lastBearing.current = null; // Réinitialiser le bearing

      // Nettoyer les données persistantes du tracking
      await AsyncStorage.multiRemove([ASYNC_STORAGE_RP_ID, ASYNC_STORAGE_RP_KEY, ASYNC_STORAGE_START_TIME]);

      setIsTracking(false);
      Alert.alert("Tracking arrêté", "Le suivi GPS a été désactivé.");

      // Réinitialiser l'UI pour un arrêt propre
      setDistance(0);
      setTimeElapsed(0);
      setPath([]);
      setCurrentSpeed(null); // Utilisez null pour indiquer l'état initial
      setBearing(0);
      setCurrentLocation(INIT_LOCATION);

      // Fermer le modal si ouvert
      setModalVisible(false);
    } catch (e) {
      console.error('Error stopping location updates:', e);
      Alert.alert("Erreur", "Impossible d'arrêter le suivi GPS.");
    }
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

  // Ouvrir le lien externe dans le navigateur par défaut
  const handleOpenExternalLink = () => {
    const url = `${apiMapsViewerURL}/${apiViewerId}`;
    Linking.openURL(url).catch(err => console.error("Failed to open URL:", err));
  };

  return (
    <View style={styles.container}>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{raceEventName}</Text>
      </View>

      <View style={styles.pageInformations}>
        <Text style={styles.pageInformationsText}>Course: {raceCurrentName}</Text>
        <Text style={styles.pageInformationsText}>Votre clé: {raceParticipantKey}</Text>
      </View>

      <View style={styles.trackingInformations}>
        <Text style={styles.trackingInformationsText}>
          <Ionicons name="flame" size={24} color="#0A0F0E" /> Bienvenue {raceParticipantName} !
        </Text>
        <Text style={styles.trackingInformationsText}>
          Vous permettrez à vos proches et aux organisateurs de suivre votre progression en temps réel sur la carte.
        </Text>
        <TouchableOpacity onPress={handleOpenExternalLink} style={styles.btnLink}>
          <Text style={styles.btnLinkText}><Ionicons name="eye" size={18} color="white" /> Voir sur le site</Text>
        </TouchableOpacity>
        <Text style={styles.trackingInformationsText}>
          <Ionicons name="location" size={24} color="#0A0F0E" /> En démarrant le tracking, vous acceptez que votre position soit collectée et partagée en temps réel avec les organisateurs de l'événement et les spectateurs via le site web.
        </Text>
        <Text style={styles.trackingInformationsText}>
          <Ionicons name="phone-portrait" size={24} color="#0A0F0E" /> Assurez-vous d'avoir une bonne connexion GPS, un smartphone avec une batterie suffisante, de garder l'application en avant-plan et de permettre les autorisations nécessaires pour une expérience optimale.
        </Text>
        <Text style={styles.trackingInformationsText}>
          <Ionicons name="rocket" size={24} color="#0A0F0E" /> L'équipe de l'événement vous remercie de votre participation et vous souhaite une excellente course !
        </Text>
      </View>

      {!isTracking ? (
        <TouchableOpacity onPress={handleStart} style={[styles.btn, styles.btnStart]}>
          <Text style={styles.btnText}><Ionicons name="play" size={26} color="white" /> Démarrer le tracking</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={[styles.btn, styles.btnStop]}>
          <Text style={styles.btnText}><Ionicons name="stop" size={26} color="white" /> Stopper le tracking</Text>
        </TouchableOpacity>
      )}

      {/* Navigation Modal */}
      <NavigationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSwipeUnlocked={() => setModalVisible(false)}
        data={{
          currentLocation,
          distance,
          timeElapsed,
          path,
          bearing,
          currentSpeed,
          raceEventId,
          raceParticipantKey,
          webviewRef
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3E5E7',
    paddingVertical: 40,
    paddingHorizontal: 15
  },
  titleContainer: {
    backgroundColor: '#0A0F0E',
    borderRadius: 18,
    padding: 10,
    marginBottom: 15,
    display: 'flex',
    alignItems: 'center'
  },
  titleText: {
    fontSize: 20,
    color: '#f8f9ff',
    fontWeight: 'bold'
  },
  pageInformations: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: '#f8f9ff',
    elevation: 3,
  },
  pageInformationsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A0F0E',
    marginBottom: 5,
  },
  trackingInformations: {
    paddingHorizontal: 20,
    color: '#0A0F0E',
    marginBottom: 10,
  },
  trackingInformationsText: {
    fontSize: 16,
    marginVertical: 8,
    lineHeight: 22,
  },
  btn: {
    display: 'flex',
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
    height: 60,
    alignSelf: "center",
    marginTop: 15,
    borderRadius: 40,
    elevation: 3,
  },
  btnText: {
    fontSize: 20,
    color: '#f8f9ff',
    fontWeight: 'bold'
  },
  btnLink: {
    backgroundColor: "#0A0F0E",
    marginVertical: 5,
    height: 45,
    width: '60%',
    display: 'flex',
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    elevation: 3,
  },
  btnLinkText: {
    fontSize: 14,
    color: '#f8f9ff',
    fontWeight: 'bold'
  },
  btnStart: {
    backgroundColor: "#216161"
  },
  btnStop: {
    backgroundColor: "#FE4B32"
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
    color: '#0A0F0E',
  },
});