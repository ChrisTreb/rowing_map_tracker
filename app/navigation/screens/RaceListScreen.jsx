import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getRaces } from "../../../services/database";

const RaceListScreen = () => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRaces = async () => {
    try {
      setLoading(true);
      const data = await getRaces();
      setRaces(data);
    } catch (error) {
      console.error("Error loading races:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>

      <Text>📅 Départ : {formatDate(item.start_time)}</Text>
      <Text>⏱ Durée : {item.duration ?? "N/A"} sec</Text>
      <Text>📏 Distance : {item.distance ?? "N/A"} m</Text>
      <Text>🚤 Vitesse moy : {item.avg_speed ?? "N/A"} m/s</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Chargement des courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {races.length === 0 ? (
        <View style={styles.center}>
          <Text>Aucune course trouvée</Text>
        </View>
      ) : (
        <FlatList
          data={races}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </View>
  );
};

export default RaceListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
});