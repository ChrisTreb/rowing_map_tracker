import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { initDb } from "../../../services/database";
import { DbRaceEvent, addRaceEvent, getRaceEventById, getRaceEvents, updateRaceEvent } from "../../../services/raceEvent";
import { RaceEvent } from "../../../types/RaceEvent";
import { formatDateTime } from "../../../utils/dateUtils";

const EventsScreen = () => {
  const [dbEvents, setDbEvents] = useState<DbRaceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true); // État pour indiquer le chargement/la synchronisation

  // Fonction pour récupérer les événements de l'API et les synchroniser avec la DB locale
  const syncApiRaceEventsToLocalDb = async () => {
    try {
      const apiURL = process.env.EXPO_PUBLIC_API_URL;
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;

      const response = await fetch(`${apiURL}/raceevents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": `${apiKey}`,
        },
      });
      const data = await response.json();

      // Préparer toutes les opérations d'insertion/mise à jour en parallèle
      const syncPromises = data.raceevents.map(async (event: RaceEvent) => {

        // Validation de re_event_visibility (doit être 0 ou 1)
        const visibility = (event.re_event_visibility >= 0 && event.re_event_visibility <= 1) ? event.re_event_visibility : 1;

        try {
          const existingEvent = await getRaceEventById(event.re_id);
          if (existingEvent) {
            // Mettre à jour l'événement existant
            await updateRaceEvent(
                event.re_id,
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
            console.log(`Event with ID ${event.re_id} updated.`);
          } else {
            // Ajouter le nouvel événement
            await addRaceEvent(
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
            console.log(`Event with ID ${event.re_id} added.`);
          }
    } catch (error) {
          console.error(`Error syncing event ${event.re_id} to local database:`, error);
          throw error; // Propager l'erreur pour que Promise.allSettled la capture
    }
      });

      // Exécuter toutes les promesses de synchronisation en parallèle
      const results = await Promise.allSettled(syncPromises);

      // Log des résultats pour le débogage
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Synchronisation de l'événement ${data.raceevents[index]?.re_id} échouée:`, result.reason);
        }
      });

      console.log("Synchronisation des événements terminée.");

    } catch (error) {
      console.error("Error fetching or syncing race events:", error);
    }
  };

  // Fonction pour récupérer les événements de la base de données locale
  const loadLocalRaceEvents = async () => {
    try {
      const eventsFromDb = await getRaceEvents();
      // Trier les événements par date de fin descendante
      eventsFromDb.sort(
        (a: DbRaceEvent, b: DbRaceEvent) =>
          b.re_event_end_date_and_time - a.re_event_start_date_and_time
    );
      setDbEvents(eventsFromDb);
    } catch (error) {
      console.error("Error retrieving race events from local database:", error);
    }
  };

  // Initialisation de la base de données et synchronisation des événements
  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        setIsLoading(true);
        await initDb();
        console.log("Database initialized successfully.");
        await syncApiRaceEventsToLocalDb();
        console.log("API events synced to local database.");
        await loadLocalRaceEvents();
        console.log("Local events loaded into state.");
      } catch (error) {
        console.error("Initialization or sync failed:", error);
      } finally {
        setIsLoading(false);
      }
};

    initializeAndSync();
  }, []); // Exécuter une seule fois au montage du composant

  const onPressFunction = () => {
    console.log("Button pressed!");
    // Logique pour entrer un code participant
  };

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Synchronisation des événements...</Text>
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});

export default EventsScreen;

