import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import MapView, { Marker, Polyline } from "react-native-maps";

const RaceDetailScreen = ({ route }) => {
  const race = route?.params?.race;

  const [points, setPoints] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 🔒 sécurité 1 : race existe ?
    if (!race) {
      setError("Aucune course fournie.");
      return;
    }

    // 🔒 sécurité 2 : route_data existe ?
    if (!race.route_data) {
      setError("Aucune donnée GPS disponible.");
      return;
    }

    try {
      const parsed = JSON.parse(race.route_data);

      // 🔒 sécurité 3 : tableau valide
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Données GPS invalides.");
        return;
      }

      setPoints(parsed);

      // ▶️ replay sécurisé
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setReplayIndex(i);

        if (i >= parsed.length) {
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    } catch (e) {
      console.error("JSON parse error:", e);
      setError("Impossible de lire la course.");
    }
  }, []);

  // 🔴 UI erreur
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "red" }}>{error}</Text>
      </View>
    );
  }

  // ⏳ loading
  if (points.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 📊 calcul vitesses (simple)
  const speeds = [];

  for (let i = 1; i < points.length; i++) {
    const d = 0.01;
    const dt = 2;
    speeds.push(d / (dt / 3600));
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 🗺️ MAP */}
      <MapView style={{ flex: 1 }}>
        <Polyline
          coordinates={points.slice(0, replayIndex)}
          strokeWidth={4}
          strokeColor="blue"
        />

        {points[replayIndex] && (
          <Marker coordinate={points[replayIndex]} />
        )}
      </MapView>

      {/* 📊 GRAPH */}
      <LineChart
        data={{
          labels: speeds.map((_, i) => i.toString()),
          datasets: [{ data: speeds }],
        }}
        width={300}
        height={200}
        chartConfig={{
          backgroundColor: "#000",
          color: () => "#00ff00",
        }}
      />

      <Text>Distance: {race.distance?.toFixed(2) || 0} km</Text>
      <Text>Vitesse moy: {race.avg_speed?.toFixed(2) || 0} km/h</Text>
    </View>
  );
};

export default RaceDetailScreen;
