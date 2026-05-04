import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { RaceEvent } from "../../../types/RaceEvent";
import { formatDateTime } from "../../../utils/dateUtils";

const HomeScreen = () => {
  const [events, setEvents] = useState<RaceEvent[]>([]);

  const getRaceEvents = async () => {
    try {
      const apiURL = process.env.EXPO_PUBLIC_API_URL;
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;

      console.log("API URL:", apiURL);
      console.log("API Key:", apiKey);

      const response = await fetch(`${apiURL}/raceevents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": `${apiKey}`,
        },
      });
      const data = await response.json();

      setEvents(
        data.raceevents.sort(
          (a: RaceEvent, b: RaceEvent) =>
            b.re_event_end_date_and_time - a.re_event_start_date_and_time,
        ),
      );

      for (const event of data.raceevents) {
        console.log("Event:", event);
      }

    } catch (error) {
      console.error("Error fetching race events:", error);
    }
  };

  useEffect(() => {
    getRaceEvents();
  }, []);

  const renderItem = ({ item }: { item: RaceEvent }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.re_event_name}</Text>
        <Text style={styles.text}>Participants: {item.nb_participants}</Text>
        <Text style={styles.text}>
          Début: {formatDateTime(item.re_event_start_date_and_time)}
        </Text>
        <Text style={styles.text}>
          Fin: {formatDateTime(item.re_event_end_date_and_time)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.re_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  card: {
    backgroundColor: "#f5f7ff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },

  text: {
    fontSize: 13,
    color: "#555",
  },
});

export default HomeScreen;
