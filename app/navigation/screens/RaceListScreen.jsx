import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { getRaces, resetDatabase } from "../../../services/database";

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

  const handleResetDb = () => {
    Alert.alert(
      "Reset database",
      "Supprimer toutes les courses ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await resetDatabase();
              await loadRaces();
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  // ✅ Format durée mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      
      {/* Titre */}
      <Text style={styles.title}>{item.name}</Text>

      {/* Date */}
      <Text style={styles.date}>
        📅 {formatDate(item.start_time)}
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {item.distance ? item.distance.toFixed(2) : "0.00"}
          </Text>
          <Text style={styles.statLabel}>km</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.statLabel}>temps</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {item.avg_speed ? item.avg_speed.toFixed(2) : "0.00"}
          </Text>
          <Text style={styles.statLabel}>km/h</Text>
        </View>
      </View>

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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Mes courses</Text>

        <TouchableOpacity onPress={handleResetDb} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
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
    backgroundColor: "#f5f6fa",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 3,
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },

  resetBtn: {
    backgroundColor: "#ff895e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  resetText: {
    color: "white",
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },

  date: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },

  stat: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4266f5",
  },

  statLabel: {
    fontSize: 12,
    color: "#777",
  },
});