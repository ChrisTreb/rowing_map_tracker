import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';
import { addRace, initDb } from "../../../services/database";

// CONFIG
const MIN_DISTANCE = 0.005;
const MIN_SPEED_DISTANCE = 0.01; // 10 mètres
const MIN_TIME = 1; // secondes
const MAX_SPEED = 200;
const MAX_ACCURACY = 10;
const INIT_LOCATION = { latitude: 48.39, longitude: -4.48 };

const HomeScreen = () => {
  const [currentLocation, setCurrentLocation] = useState(INIT_LOCATION);
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [path, setPath] = useState([]);
  const [bearing, setBearing] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const lastTimestamp = useRef(null);

  let raceName = "Course du " + new Date().toLocaleString();

  const webviewRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);

  // 🔥 CALCUL DIRECTION
  const getBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

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

          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .marker-inner {
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 20px solid #4266f5;
            transform-origin: center;
          }
          .marker-inner::after {
            content: '';
            position: absolute;
            left: -4px;
            top: 12px;
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          }
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
              var newPoint = [data.lat, data.lng];

              // ✅ Marker stable
              if (!currentMarker) {
                currentMarker = L.marker(newPoint, {
                  icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div class="marker-inner"></div>'
                  })
                }).addTo(map);
              } else {
                currentMarker.setLatLng(newPoint);
              }

              // ✅ rotation propre
              var el = currentMarker.getElement();
              if (el) {
                var inner = el.querySelector('.marker-inner');
                if (inner) {
                  inner.style.transform = 'rotate(' + (data.bearing || 0) + 'deg)';
                }
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
                var zoom = 17;
                map.setView(newPoint, zoom);
              }

            } catch (e) {
              console.log("ERROR:", e);
            }
          }

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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        path,
        isTracking,
        follow: true,
        bearing
      }));
    }
  }, [currentLocation, path, isTracking, bearing]);

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

          const now = location.timestamp;

          let speed = 0;

          if (lastTimestamp.current) {
            const deltaTime = (now - lastTimestamp.current) / 1000; // sec

            if (deltaTime >= MIN_TIME) {

              // 🔥 ignorer petits mouvements GPS
              if (d < MIN_SPEED_DISTANCE) {
                speed = 0;
              } else {
                speed = d / (deltaTime / 3600); // km/h
              }

            }
          }

          lastTimestamp.current = now;

          if (speed > MAX_SPEED) return prev;

          // ✅ vitesse instantanée
          const smoothSpeed = (oldSpeed, newSpeed) => {
            return oldSpeed * 0.8 + newSpeed * 0.2;
          };

          setCurrentSpeed(prev => smoothSpeed(prev, speed));

          if (speed < 1) speed = 0;

          // ✅ bearing
          const newBearing = getBearing(
            last.latitude,
            last.longitude,
            latitude,
            longitude
          );

          setBearing(newBearing);

          setDistance(dist => dist + d);
          return [...prev, newPoint];
        });
      }
    );

    setIsTracking(true);
  };

  const stopTracking = async () => {
    locationSubscription.current?.remove();

    if (timerRef.current) clearInterval(timerRef.current);

    setIsTracking(false);

    if (path.length >= 2) {
      const duration = timeElapsed;
      let avgSpeed = duration > 0 ? distance / (duration / 3600) : 0;

      await addRace(
        raceName,
        Date.now() - duration * 1000,
        Date.now(),
        duration,
        distance.toFixed(2),
        avgSpeed.toFixed(2),
        JSON.stringify(path)
      );
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
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
        {/* Ligne 1 */}
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

        {/* Ligne 2 */}
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Vitesse actuelle</Text>
            <Text style={[styles.value, { color: "#4266f5" }]}>
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
    marginTop: -20,
    borderRadius: 40
  },
  btnStart: { backgroundColor: "#4266f5" },
  btnStop: { backgroundColor: "#ff895e" },
  infos: {
    marginTop: 20,
    paddingHorizontal: 15,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  card: {
    flex: 1,
    backgroundColor: "#f8f9ff",
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 5,
    alignItems: "center",

    // shadow iOS
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },

    // shadow Android
    elevation: 3,
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 5,
  },

  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
  },

  unit: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

});

export default HomeScreen;