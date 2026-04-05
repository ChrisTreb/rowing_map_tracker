import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import Ionicons from "react-native-vector-icons/Ionicons";
import { addRace, initDb } from "../../../services/database";

// CONFIG
const MIN_DISTANCE = 0.001; // 1m
const MAX_SPEED = 200;
const MAX_ACCURACY = 2;
const INIT_LOCATION = {"latitude": 0, "longitude": 0};

const HomeScreen = () => {
  const currentLocation = useState(INIT_LOCATION)[0];
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [path, setPath] = useState([]);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      await initDb().catch(err => {
        console.error("Failed to initialize database", err);
      });
    };
    init();

    return () => {
      locationSubscription.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000;
  };

  const startTracking = async () => {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission refusée");
      return;
    }

    setDistance(0);
    setTimeElapsed(0);
    setPath([]);

    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);

    locationSubscription.current =
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const { latitude, longitude, accuracy } =
            location.coords;

          if (accuracy > MAX_ACCURACY) return;

          const newPoint = { latitude, longitude };

          currentLocation = newPoint;

          setPath((prev) => {
            if (prev.length === 0) return [newPoint];

            const last = prev[prev.length - 1];

            const d = calculateDistance(
              last.latitude,
              last.longitude,
              latitude,
              longitude
            );

            if (d < MIN_DISTANCE) return prev;

            const dt = 2;
            const speed = d / (dt / 3600);

            if (speed > MAX_SPEED) return prev;

            setDistance((dist) => dist + d);

            const updated = [...prev, newPoint];

            // 🎯 suivre la caméra
            mapRef.current?.animateCamera({
              center: newPoint,
            });

            return updated;
          });
        }
      );

    setIsTracking(true);
  };

  const stopTracking = async () => {
    locationSubscription.current?.remove();
    clearInterval(timerRef.current);

    setIsTracking(false);

    if (path.length < 2) return;

    const duration = timeElapsed;
    const avgSpeed =
      duration > 0 ? distance / (duration / 3600) : 0;

    await addRace(
      "Course",
      Date.now() - duration * 1000,
      Date.now(),
      duration,
      distance,
      avgSpeed,
      JSON.stringify(path)
    );
  };

  const speed =
    timeElapsed > 0 ? distance / (timeElapsed / 3600) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}><Ionicons name="compass" size={30} color="black" /> Tracker</Text>

      {/* 🗺️ CARTE */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: 48.39,
          longitude: -4.48,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* 📍 Départ */}
        {path.length > 0 && (
          <Marker coordinate={path[0]} title="Start" />
        )}

        {/* 📍 Arrivée */}
        {path.length > 1 && (
          <Marker
            coordinate={path[path.length - 1]}
            title="End"
          />
        )}

        {/* 📈 TRACE */}
        <Polyline
          coordinates={path}
          strokeWidth={4}
          strokeColor="blue"
        />
      </MapView>

      {!isTracking ? (
        <TouchableOpacity onPress={startTracking} style={[styles.btn, styles.btnStart]}>
          <Ionicons name="play" size={50} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={[styles.btn, styles.btnStop]}>
          <Ionicons name="stop" size={50} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.infos}>
        <Text style={{ fontSize: 18, marginVertical: 2 }}>Distance: {distance.toFixed(2)} km</Text>
        <Text style={{ fontSize: 18, marginVertical: 2 }}>Temps: {timeElapsed}s</Text>
        <Text style={{ fontSize: 18, marginVertical: 2 }}>Vitesse: {speed.toFixed(2)} km/h</Text>
        <Text style={{ fontSize: 18, marginVertical: 2 }}>Localisation: {currentLocation.latitude}, {currentLocation.longitude}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  title: {
    fontSize: 30,
    textAlign: "center",
    marginVertical: 10
  },

  map: {
    height: 300,
    width: "100%"
  },

  btn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    width: 200,
    alignSelf: "center",
    marginVertical: 30,
    borderRadius: 10
  },

  btnStart: {
    backgroundColor: "#4266f5"
  },

  btnStop: {
    backgroundColor: "#ff895e"
  },

  infos: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 10
  }
});

export default HomeScreen;
