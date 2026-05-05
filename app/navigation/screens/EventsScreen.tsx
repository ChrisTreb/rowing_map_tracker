import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { initDb } from "../../../services/database";
import { DbRaceEvent, addRaceEvent, getRaceEventById, getRaceEvents, updateRaceEvent } from "../../../services/raceEvent";
import { RaceEvent } from "../../../types/RaceEvent";
import { formatDateTime } from "../../../utils/dateUtils";

const EventsScreen = () => {
  // State to hold the list of race events retrieved from the local database
  const [dbEvents, setDbEvents] = useState<DbRaceEvent[]>([]);

  // Get race events from the API and sort them by end date in descending order
  const getApiRaceEvents = async () => {
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

      // Sort events by end date in descending order (most recent first)
      data.raceevents.sort(
        (a: RaceEvent, b: RaceEvent) =>
          b.re_event_end_date_and_time - a.re_event_start_date_and_time
      )

      // Loop through the sorted events and add them to the local database if they don't already exist
      for (const event of data.raceevents) {
        console.log("Event:", event);

        // Validation de re_viewport_visibility (doit être 0 ou 1)
        const visibility = (event.re_event_visibility >= 0 && event.re_event_visibility <= 1) ? event.re_event_visibility : 1;

        // Check if the event already exists in the local database before adding it
        await getRaceEventById(event.re_id).then((existingEvent) => {
          if (existingEvent) {
            console.log(`Event with ID ${event.re_id} already exists in the local database. Updating it.`);
            updateRaceEvent(
                event.re_user_id,
                event.re_event_name,
                visibility,
                event.re_event_start_date_and_time,
                event.re_event_end_date_and_time,
                event.re_event_random_id_edit,
                event.re_event_random_id_viewer,
                event.re_viewport_latitude,
                event.re_viewport_longitude,
                event.re_viewport_zoom,
                event.re_viewport_opacity,
                event.re_maplayer,
                event.re_marker_timeout,
                event.re_tail_timeout,
                event.re_flag_content,
                event.nb_participants
            );
          } else {
            console.log(`Event with ID ${event.re_id} does not exist in the local database. Adding it now.`);
            try {
              addRaceEvent(
                event.re_id,
                event.re_user_id,
                event.re_event_name,
                visibility,
                event.re_event_start_date_and_time,
                event.re_event_end_date_and_time,
                event.re_event_random_id_edit,
                event.re_event_random_id_viewer,
                event.re_viewport_latitude,
                event.re_viewport_longitude,
                event.re_viewport_zoom,
                event.re_viewport_opacity,
                event.re_maplayer,
                event.re_marker_timeout,
                event.re_tail_timeout,
                event.re_flag_content,
                event.nb_participants
              );
            } catch (error) {
              console.error("Error adding race event to local database:", error);
            }
          }
        }).catch((error) => {
          console.error(`Error checking for event with ID ${event.re_id} in local database:`, error);
        });
      }
    } catch (error) {
      console.error("Error fetching race events:", error);
    }
  };

  // Function to handle button press to enter participant code
  const onPressFunction = () => {
    console.log("Button pressed!");
  };

  useEffect(() => {
    // Initialize the database when the app starts
    initDb().then(() => {
        console.log("Database initialized successfully");
        // Fetch race events from the API and store them in the local database
        getApiRaceEvents().then(() => {
          console.log("Race events fetched and stored successfully");
          getRaceEvents().then((dbEvents) => {
            setDbEvents(dbEvents);
            console.log("Race events retrieved from local database:", dbEvents);
          }).catch((error) => {
            console.error("Error retrieving race events from local database:", error);
          });
        }).catch((error) => {
          console.error("Error fetching race events from API:", error);
        });
    }).catch((error) => {
        console.error("Error initializing database:", error);
    });
    
  }, []);

  const renderItem = ({ item }: { item: DbRaceEvent }) => {
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
        data={dbEvents}
        keyExtractor={(item) => item.re_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
      <Pressable style={styles.button} onPress={onPressFunction}>
        <Text style={styles.buttonText}>Entrez votre code</Text>
      </Pressable>
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

  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 12,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EventsScreen;
