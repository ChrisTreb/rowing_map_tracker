import { addRaceParticipantPosition } from '@/services/raceParticipantPosition';
import { ClassPosition, Position } from '@/types/Position';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';

// CONFIG
const MIN_DISTANCE: number = 0.005;
const MIN_SPEED_DISTANCE: number = 0.01;
const MIN_TIME: number = 5;
const MAX_SPEED: number = 200; // Change to 50 in production
const MAX_ACCURACY: number = 10;

// API configuration
const apiURL = process.env.EXPO_PUBLIC_API_URL;
const apiKey = process.env.EXPO_PUBLIC_API_KEY;

const INIT_LOCATION: Position = { latitude: 48.39, longitude: -4.48 };

export default function Tracker() {

  const { id, eventId, participantId, participantKey } = useLocalSearchParams();
  const raceId = parseInt(id as string);
  const raceEventId = parseInt(eventId as string);
  const raceParticipantId = parseInt(participantId as string);
  const raceParticipantKey = participantKey;

  const [currentLocation, setCurrentLocation] = useState<Position>(INIT_LOCATION);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [bearing, setBearing] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);

  const lastTimestamp = useRef<number | null>(null);
  const lastBearing = useRef<number>(0);

  const webviewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // SAVE POSITIONS
  const saveParticipantPosition = async (latitude: number, longitude: number) => {

    try {
      // Insert position into local database
      await addRaceParticipantPosition(
        raceParticipantId,
        raceParticipantKey as string,
        new Date().getTime(),
        latitude,
        longitude
      );
    } catch (error) {
      console.error("Failed insertion new position into local database:", error);
      return;
    }

    try {
      const participantPosition = new ClassPosition(latitude, longitude);

      const response = await fetch(`${apiURL}/position/${participantKey}`, {
        method: 'POST',
        body: JSON.stringify(participantPosition),
      });

      console.log("Api Post position response code:", response.status);

    } catch (error) {
      console.error("Failed posting new position to API:", error);
    }
  }

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

  /// 📡 SEND MAP
  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
      path,
      bearing,
      follow: true
    }));
  }, [currentLocation, path, bearing]);

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

  // ▶️ START
  const startTracking = async () => {
    setDistance(0);
    setTimeElapsed(0);
    setPath([]);
    setCurrentSpeed(0);
    lastTimestamp.current = null;

    timerRef.current = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000) as unknown as NodeJS.Timeout;

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

          const d = calculateDistance(
            last.latitude,
            last.longitude,
            latitude,
            longitude
          );

          if (d < MIN_DISTANCE) return prev;

          let speed = 0;

          if (lastTimestamp.current) {
            const dt = (now - lastTimestamp.current) / 1000;

            if (dt >= MIN_TIME) {
              if (d < MIN_SPEED_DISTANCE) {
                speed = 0;
              } else {
                speed = d / (dt / 3600);
              }
            }
          }

          lastTimestamp.current = now;

          if (speed > MAX_SPEED) return prev;

          // 🔥 smoothing
          setCurrentSpeed(prev => prev * 0.7 + speed * 0.3);

          // 🔥 bearing stable
          if (speed > 1) {
            const raw: number = getBearing(
              last.latitude,
              last.longitude,
              latitude,
              longitude
            );

            const smoothBearing = lastBearing.current + (raw - lastBearing.current) * 0.2;
            lastBearing.current = smoothBearing;
            setBearing(smoothBearing);
          }

          setDistance(dist => dist + d);

          return [...prev, newPoint];
        });

        setCurrentLocation(newPoint);

        // Insertion des coordonnées actuelle en base locale + envoi vers api
        saveParticipantPosition(newPoint.latitude, newPoint.longitude);
      }
    );

    setIsTracking(true);
  };

  // ⏹ STOP
  const stopTracking = () => {
    locationSubscription.current?.remove();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTracking(false);
  };

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
            <Text style={styles.value}>{timeElapsed}</Text>
            <Text style={styles.unit}>sec</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Vitesse actuelle</Text>
            <Text style={[styles.value, { color: "#A7C7D2" }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3E5E7', paddingVertical: 40, paddingHorizontal: 10 },

  pageInformations: {fontSize: 12, fontWeight: 'bold', marginBottom: 10},
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
});