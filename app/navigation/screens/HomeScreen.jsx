import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from "react";
import {  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { addRace, initDb } from "../../../services/database";

// CONFIG
const MIN_DISTANCE = 0.001; // 1m
const MAX_SPEED = 200;
const MAX_ACCURACY = 5; // Augmenté un peu pour la stabilité
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

  // HTML/JS pour Leaflet
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${INIT_LOCATION.latitude}, ${INIT_LOCATION.longitude}], 15);
          L.tileLayer.wms('https://data.geopf.fr/wms-r', {
            layers: 'GEOGRAPHICALGRIDSYSTEMS.COASTALMAPS',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            attribution: 'IGN'
          }).addTo(map);

          var polyline = L.polyline([], {color: '#4266f5', weight: 5}).addTo(map);
          var startMarker = null;
          var currentMarker = L.circleMarker([0,0], { radius: 8, color: 'white', fillColor: '#4266f5', fillOpacity: 1 }).addTo(map);

          window.addEventListener('message', function(event) {
            var data = JSON.parse(event.data);
            if (data.type === 'UPDATE_LOCATION') {
              var newPoint = [data.lat, data.lng];

              // Update marker position
              currentMarker.setLatLng(newPoint);

              // Update path
              if (data.isTracking) {
                var latlngs = data.path.map(p => [p.latitude, p.longitude]);
                polyline.setLatLngs(latlngs);

                if (latlngs.length === 1 && !startMarker) {
                  startMarker = L.marker(latlngs[0]).addTo(map).bindPopup("Départ");
                }
              }

              // Auto-follow
              if (data.follow) {
                map.panTo(newPoint);
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    initDb().catch(console.error);
    return () => {
      locationSubscription.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Envoyer les mises à jour à la WebView
  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_LOCATION',
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        path: path,
        isTracking: isTracking,
        follow: true
      }));
    }
  }, [currentLocation, path, isTracking]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
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

    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
      (location) => {
        const { latitude, longitude, accuracy } = location.coords;
        const newPoint = { latitude, longitude };

        setCurrentLocation(newPoint);

        if (accuracy > MAX_ACCURACY) return;

        setPath((prev) => {
          if (prev.length === 0) return [newPoint];
          const last = prev[prev.length - 1];
          const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);

          if (d < MIN_DISTANCE) return prev;

          setDistance((dist) => dist + d);
          return [...prev, newPoint];
        });
      }
    );
    setIsTracking(true);
  };

  const stopTracking = async () => {
    locationSubscription.current?.remove();
    clearInterval(timerRef.current);
    setIsTracking(false);

    if (path.length >= 2) {
      const duration = timeElapsed;
      await addRace("Course", Date.now() - duration * 1000, Date.now(), duration, distance, distance / (duration / 3600), JSON.stringify(path));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}><Ionicons name="compass" size={30} color="#4266f5" /> Tracker Leaflet</Text>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{html: leafletHtml,
            baseUrl: 'https://localhost' // Définit une origine pour le Referer
          }}
          userAgent="RowingMapTrackerApp" // Identifie votre application auprès d'OSM
          scrollEnabled={false}
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
        <Text style={styles.infoText}>Vitesse: {(timeElapsed > 0 ? distance / (timeElapsed / 3600) : 0).toFixed(2)} km/h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: "center", marginVertical: 15 },
  mapContainer: { height: 350, width: "100%", overflow: 'hidden' },
  map: { flex: 1 },
  btn: { alignItems: "center", justifyContent: "center", width: 80, height: 80, alignSelf: "center", marginTop: 15, borderRadius: 40, elevation: 5 },
  btnStart: { backgroundColor: "#4266f5" },
  btnStop: { backgroundColor: "#ff895e" },
  infos: { marginTop: 20, alignItems: "center" },
  infoText: { fontSize: 18, fontWeight: '500', marginVertical: 4, color: '#333' }
});

export default HomeScreen;
