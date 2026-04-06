import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';
import { addRace, initDb, seedRaces } from "../../../services/database";

// CONFIG
const MIN_DISTANCE = 0.005;
const MAX_SPEED = 200;
const MAX_ACCURACY = 10;
const INIT_LOCATION = { latitude: 48.39, longitude: -4.48 };

const HomeScreen = () => {
  const [currentLocation, setCurrentLocation] = useState(INIT_LOCATION);
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [path, setPath] = useState([]);

  const webviewRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          body { margin: 0; }
          #map { height: 100vh; width: 100vw; }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <script>
          var map = L.map('map').setView([48.39, -4.48], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap France'
          }).addTo(map);

          var polyline = L.polyline([], {color: '#4266f5', weight: 5}).addTo(map);
          var currentMarker = null;
          var startMarker = null;

          function handleMessage(event) {
            try {
              var data = JSON.parse(event.data);
              console.log("DATA:", data);

              var newPoint = [data.lat, data.lng];

              // Marker position actuelle
              if (!currentMarker) {
                currentMarker = L.circleMarker(newPoint, {
                  radius: 8,
                  color: 'white',
                  fillColor: '#4266f5',
                  fillOpacity: 1
                }).addTo(map);
              } else {
                currentMarker.setLatLng(newPoint);
              }

              // Path
              if (data.isTracking) {
                var latlngs = data.path.map(p => [p.latitude, p.longitude]);
                polyline.setLatLngs(latlngs);

                if (latlngs.length === 1 && !startMarker) {
                  startMarker = L.marker(latlngs[0]).addTo(map);
                }
              }

              if (data.follow) {
                map.setView(newPoint);
              }

            } catch (e) {
              console.log("ERROR:", e);
            }
          }

          // 🔥 ANDROID FIX
          document.addEventListener("message", handleMessage);
          window.addEventListener("message", handleMessage);

        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    const init = async () => {
      try {
        await initDb();
        await seedRaces(); // Ajoutez cette ligne pour insérer des données de test

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission refusée");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        const { latitude, longitude } = location.coords;

        setCurrentLocation({ latitude, longitude });

      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (webviewRef.current) {
      const message = JSON.stringify({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        path,
        isTracking,
        follow: true
      });

      console.log("SEND:", message);

      webviewRef.current.postMessage(message);
    }
  }, [currentLocation, path, isTracking]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission refusée");
      return;
    }

    setDistance(0);
    setTimeElapsed(0);
    setPath([]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000);

    locationSubscription.current?.remove();

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1
      },
      (location) => {
        const { latitude, longitude, accuracy } = location.coords;

        if (accuracy > MAX_ACCURACY) return;

        const newPoint = { latitude, longitude };
        setCurrentLocation(newPoint);

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

          const speed = d / (1 / 3600);
          if (speed > MAX_SPEED) return prev;

          setDistance(dist => dist + d);
          return [...prev, newPoint];
        });
      }
    );

    setIsTracking(true);
  };

  const stopTracking = async () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTracking(false);

    if (path.length >= 2) {
      const duration = timeElapsed;

      await addRace(
        "Course",
        Date.now() - duration * 1000,
        Date.now(),
        duration,
        distance,
        duration > 0 ? distance / (duration / 3600) : 0,
        JSON.stringify(path)
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="compass" size={30} color="#4266f5" /> Tracker
      </Text>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/100 Safari/537.36"
          style={styles.map}
        />
      </View>

      {!isTracking ? (
        <TouchableOpacity onPress={startTracking} style={[styles.btn, styles.btnStart]}>
          <Ionicons name="play" size={40} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={[styles.btn, styles.btnStop]}>
          <Ionicons name="stop" size={40} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.infos}>
        <Text style={styles.infoText}>Distance: {distance.toFixed(2)} km</Text>
        <Text style={styles.infoText}>Temps: {timeElapsed}s</Text>
        <Text style={styles.infoText}>
          Vitesse: {(timeElapsed > 0 ? distance / (timeElapsed / 3600) : 0).toFixed(2)} km/h
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, textAlign: "center", marginVertical: 15 },
  mapContainer: { height: 350 },
  map: { flex: 1 },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    alignSelf: "center",
    marginTop: 15,
    borderRadius: 40
  },
  btnStart: { backgroundColor: "#4266f5" },
  btnStop: { backgroundColor: "#ff895e" },
  infos: { marginTop: 20, alignItems: "center" },
  infoText: { fontSize: 18 }
});

export default HomeScreen;