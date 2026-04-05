import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";

import MapView, { Marker, Polyline } from "react-native-maps";

import { addRace, getRaces, initDb } from "../../../services/database";

// CONFIG
const MIN_DISTANCE = 0.001; // 1m
const MAX_SPEED = 40;
const MAX_ACCURACY = 20;

const HomeScreen = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [races, setRaces] = useState([]);
  const [distance, setDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [path, setPath] = useState([]);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      await initDb();
      await loadRaces();
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

  const loadRaces = async () => {
    const data = await getRaces();
    setRaces(data);
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
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const { latitude, longitude, accuracy } =
            location.coords;

          if (accuracy > MAX_ACCURACY) return;

          const newPoint = { latitude, longitude };

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

    await loadRaces();
  };

  const speed =
    timeElapsed > 0 ? distance / (timeElapsed / 3600) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚣 Tracker</Text>

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
        <TouchableOpacity onPress={startTracking} style={styles.btn}>
          <Ionicons name="play" size={20} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={stopTracking} style={styles.btnStop}>
          <Ionicons name="stop" size={20} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.infos}>
        <Text>Distance: {distance.toFixed(2)} km</Text>
        <Text>Temps: {timeElapsed}s</Text>
        <Text>Vitesse: {speed.toFixed(2)} km/h</Text>
      </View>

      <FlatList
        data={races}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>{item.name}</Text>
        )}
      />
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
    backgroundColor: "green",
    padding: 10
  },

  btnStop: {
    backgroundColor: "red",
    padding: 10
  },

  infos: {
    fontSize: 20,
    flexDirection: "column",
    justifyContent: "space-around",
    marginVertical: 10
  }
});

export default HomeScreen;
