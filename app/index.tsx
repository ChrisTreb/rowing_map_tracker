import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { initDb } from "../services/database";
import { DbPhoneRpKey, addPhoneRpKey, deleteExpiredPhoneRpKeys, getPhoneRpKeys, updatePhoneRpKey } from "../services/phoneKeys";
import { DbRaceEvent, addRaceEvent, getRaceEventById, getRaceEvents, updateRaceEvent } from "../services/raceEvent";
import { RaceEvent } from "../types/RaceEvent";
import EventCard from "./components/EventCard";


const Index = () => {
  const [isLoading, setIsLoading] = useState(true); // État pour indiquer le chargement/la synchronisation
  const [isCodeValid, setIsCodeValid] = useState(true); // État pour indiquer si le code participant est valide

  const [dbEvents, setDbEvents] = useState<DbRaceEvent[] | null>([]);
  const [phoneRpKeys, setPhoneRpKeys] = useState<DbPhoneRpKey[] | null>([]);

  // État pour le contenu de l'input du code participant
  const [participantCode, setParticipantCode] = useState("");

  // État de visibilité du modal
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fonction pour récupérer les événements de l'API et les synchroniser avec la DB locale
  const syncApiRaceEventsToLocalDb = async (participantCode: string) => {
    try {
      const apiURL = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiURL}/raceevents/forkeys/${participantCode}`);

      const data = await response.json();

      // Préparer toutes les opérations d'insertion/mise à jour en parallèle
      const syncPromises = data.raceevents.map(async (event: RaceEvent) => {

        // Si le code participant est fourni, vérifier s'il correspond à l'un des événements récupérés
        if (participantCode.trim() !== "") {
          const isCodeValidForEvent = data.raceevents.some((e: RaceEvent) => e.my_rp_key === participantCode);
          if (!isCodeValidForEvent) {
            console.warn(`Le code participant "${participantCode}" n'est associé à aucun événement récupéré. Ignoring this code for synchronization.`);
            setIsCodeValid(false);
          } else {
            setIsCodeValid(true);
          }
        }

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
              event.nb_participants,
              event.my_rp_key
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
              event.nb_participants,
              event.my_rp_key
            );
            console.log(`Event with ID ${event.re_id} added.`);
          }

          // Ajouter la clé de participant à la table phone_rp_keys si elle n'existe pas déjà et si elle est valide
          if (event.my_rp_key && event.my_rp_key != null && event.my_rp_key.length === 4 && phoneRpKeys != null) {
            const existingKey = phoneRpKeys.find(key => key.prk_rp_key === event.my_rp_key);
            if (!existingKey) {
              await addPhoneRpKey(event.my_rp_key, event.re_id, event.re_event_end_date_and_time);
            } else {
              await updatePhoneRpKey(event.re_id, event.re_event_end_date_and_time, event.my_rp_key);
            }
          }
        } catch (error) {
          console.error(`Error syncing event ${event.re_id} to local database:`, error);
          throw error; // Propager l'erreur pour que Promise.allSettled la capture
        }

        try {
          // Retourner la liste mise à jour des clés de participant après chaque synchronisation d'événement
          setPhoneRpKeys(await getPhoneRpKeys());
        } catch (error) {
          console.error("Error retrieving phone RP keys after syncing event:", error);
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
        // Supprimer les clés de participant expirées avant de charger les événements
        await deleteExpiredPhoneRpKeys();
        console.log("Expired phone RP keys deleted.");
        // Charger les clés de participant depuis la base de données locale
        const keys = await getPhoneRpKeys();
        setPhoneRpKeys(keys);
        console.log("Phone RP keys loaded:", keys);
        // Synchronisation initiale avec un code vide ou par défaut pour charger les événements sans code spécifique
        await syncApiRaceEventsToLocalDb("____");
        console.log("API events synced to local database.");
        // Charger les événements locaux après la synchronisation
        await loadLocalRaceEvents();
        console.log("Local events loaded into state.");
      } catch (error) {
        console.error("Database initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndSync();
  }, []); // Exécuter une seule fois au montage du composant

  // ===================================================================
  // LOGIQUE DU MODAL ET DE L'INPUT DU CODE PARTICIPANT
  // ===================================================================
  const handleParticipantCodeSubmit: () => Promise<void> = async () => {
    if (participantCode.trim() === "") return;

    try {
      console.log(`Tentative d'accès avec le code: ${participantCode}`);

      await syncApiRaceEventsToLocalDb(participantCode);
      console.log("API events synced to local database.");
      await loadLocalRaceEvents();
      console.log("Local events loaded into state.");

      setTimeout(() => {
        // Réinitialiser l'état de validité du code à chaque soumission
        setIsCodeValid(false);
        // Réinitialiser le champ de saisie du code participant
        setParticipantCode("");
        // Fermer le modal après la soumission
        setIsModalVisible(false);
      }, 3000); // Délai pour permettre à l'utilisateur de voir les événements associés avant de réinitialiser le champ

      console.log("Participant code submitted and processed successfully. ", phoneRpKeys);
    } catch (error) {
      console.error("Error during participant code submission:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la soumission du code. Veuillez réessayer.");
    }
  };

  const renderItem = ({ item }: { item: DbRaceEvent }) => {
    return <EventCard event={item} />;
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
      {/* Bouton déclencheur de la modale */}
      <Pressable style={styles.button} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.buttonText}><Ionicons name="grid" size={20} color="#ffffff" /> Entrez votre code</Text>
      </Pressable>

      {/* MODAL POUR ENTRER LE CODE PARTICIPANT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          // Fermer le modal si l'utilisateur appuie sur le bouton retour du système
          setIsModalVisible(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {/* Titre */}
            <Text style={styles.modalTitle}>Entrez votre code</Text>

            {/* Input du code */}
            {!isCodeValid && (
              <TextInput
                style={styles.inputCode}
                placeholder="----"
                value={participantCode}
                onChangeText={(text) => setParticipantCode(text)}
                autoCapitalize='characters'
                maxLength={4}
              />
            )}

            {/* Bouton de soumission */}
            {!isCodeValid && (
              <Pressable
                style={[styles.button, { marginTop: 20 }]}
                onPress={handleParticipantCodeSubmit}
                disabled={!participantCode.trim()} // Désactiver si le champ est vide
              >
                <Text style={styles.buttonText}>Valider</Text>
              </Pressable>
            )}

            {isCodeValid && (
              <View style={{ alignItems: 'center' }}>
                <Text><Ionicons name="checkmark-circle" size={80} color="#26ae11" /></Text>
                <Text style={{ color: '#555', fontSize: 14, marginTop: 10, textAlign: 'center', marginBottom: 20 }}>Fermez ce message pour voir les événements associés à votre code.</Text>
              </View>
            )}


            {/* Bouton de fermeture */}
            <Pressable onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButton}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 40, 
  },
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
    backgroundColor: "#216161",
    padding: 15,
    borderRadius: 12,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
  },
  buttonText: {
    minWidth: 200,
    width: "100%",
    textAlign: "center",
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
  // Styles pour la Modale
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fond semi-transparent
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  inputCode: {
    textAlign: 'center',
    width: 150,
    height: 80,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 36,
    fontWeight: 'bold',
  },
  closeButton: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    color: '#999',
    padding: 10,
    marginTop: 10,
    fontSize: 16,
  }
});

export default Index;


