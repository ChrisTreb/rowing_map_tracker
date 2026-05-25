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
  const [isCodeValid, setIsCodeValid] = useState(false); // État pour indiquer si le code participant est valide (pour le modal)

  const [dbEvents, setDbEvents] = useState<DbRaceEvent[] | null>([]);
  // phoneRpKeys n'est pas strictement nécessaire ici si EventCard gère ses propres clés via fetch,
  // mais est utile pour la logique d'existence dans syncApiRaceEventsToLocalDb
  const [phoneRpKeys, setPhoneRpKeys] = useState<DbPhoneRpKey[] | null>([]);

  // État pour déclencher le rafraîchissement des EventCards
  const [refreshEventCardsTrigger, setRefreshEventCardsTrigger] = useState(0);

  // État pour le contenu de l'input du code participant
  const [participantCode, setParticipantCode] = useState("");

  // État de visibilité du modal
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fonction pour récupérer les événements de l'API et les synchroniser avec la DB locale
  // Retourne true si le codeToCheck a trouvé une correspondance, false sinon ou en cas d'erreur
  const syncApiRaceEventsToLocalDb = async (codeToCheck: string): Promise<boolean> => {
    try {
      const apiURL = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${apiURL}/raceevents/forkeys/${codeToCheck}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error (raceevents/forkeys): ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch race events: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const apiRaceEvents: RaceEvent[] = data.raceevents;

      // Récupérer une liste fraîche des clés de participant avant de commencer la synchronisation
      // pour éviter des conflits ou des états obsolètes.
      const currentPhoneRpKeys = await getPhoneRpKeys();
      setPhoneRpKeys(currentPhoneRpKeys); // Met à jour le state local de Index si nécessaire

      let foundMatchingCode = false;
      if (codeToCheck.trim() !== "" && codeToCheck !== "____") { // "____" est votre code initial de placeholder
        foundMatchingCode = apiRaceEvents.some((e: RaceEvent) => e.my_rp_key === codeToCheck);
      }
      // isCodeValid n'est PLUS mis à jour ici. La fonction renvoie la validité.

      const syncPromises = apiRaceEvents.map(async (event: RaceEvent) => {
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

          // Ajouter/Mettre à jour la clé de participant à la table phone_rp_keys si elle n'existe pas déjà et si elle est valide
          if (event.my_rp_key && event.my_rp_key.length === 4) {
            const existingKey = currentPhoneRpKeys?.find(key => key.prk_rp_key === event.my_rp_key);
            if (!existingKey) {
              await addPhoneRpKey(event.my_rp_key, event.re_id, event.re_event_end_date_and_time);
              console.log(`Added new phone RP key: ${event.my_rp_key}`);
            } else {
              // Mettre à jour la date d'expiration si la clé existe déjà
              await updatePhoneRpKey(event.re_id, event.re_event_end_date_and_time, event.my_rp_key);
              console.log(`Updated phone RP key: ${event.my_rp_key}`);
            }
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
          console.error(`Synchronisation de l'événement ${apiRaceEvents[index]?.re_id} échouée:`, result.reason);
        }
      });

      console.log("Synchronisation des événements terminée.");
      return foundMatchingCode; // Retourne la validité du code
    } catch (error) {
      console.error("Error fetching or syncing race events:", error);
      Alert.alert("Erreur de synchronisation", "Impossible de récupérer les événements. Veuillez vérifier votre connexion.");
      return false; // Retourne false en cas d'erreur
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

  // Initialisation de la base de données et synchronisation des événements au montage du composant
  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        setIsLoading(true);
        await initDb();
        console.log("Database initialized successfully.");
        // Supprimer les clés de participant expirées avant de charger les événements
        await deleteExpiredPhoneRpKeys();
        console.log("Expired phone RP keys deleted.");
        // Synchronisation initiale avec un code vide ou par défaut pour charger les événements sans code spécifique
        await syncApiRaceEventsToLocalDb("____"); // Votre placeholder pour charger les événements par défaut
        console.log("API events synced to local database.");
        // Charger les événements locaux après la synchronisation
        await loadLocalRaceEvents();
        console.log("Local events loaded into state.");
        // Déclencher un rafraîchissement initial pour les EventCards
        setRefreshEventCardsTrigger(prev => prev + 1);
      } catch (error) {
        console.error("Database initialization or initial sync failed:", error);
        Alert.alert("Erreur", "Problème d'initialisation de l'application. Réessayez.");
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
    if (participantCode.trim().length !== 4) {
      Alert.alert("Erreur", "Veuillez entrer un code participant de 4 caractères.");
      return;
    }

    try {
      setIsLoading(true); // Afficher l'indicateur de chargement pendant la soumission
      // Capture la valeur retournée par la fonction pour savoir si le code était valide
      const codeWasValid = await syncApiRaceEventsToLocalDb(participantCode.trim());
      await loadLocalRaceEvents(); // Recharger les événements locaux pour inclure les nouveaux
      setRefreshEventCardsTrigger(prev => prev + 1); // Déclencher le rafraîchissement des EventCards

      // MAINTENANT, mettre à jour l'état isCodeValid et la logique en fonction du résultat
      setIsCodeValid(codeWasValid); // Ceci met à jour l'état pour l'affichage du modal

      if (codeWasValid) {
        setTimeout(() => {
          setIsModalVisible(false); // Fermer le modal
          setParticipantCode(""); // Réinitialiser l'input
          setIsCodeValid(false); // Réinitialiser pour la prochaine ouverture du modal
        }, 3000); // Délai pour permettre à l'utilisateur de voir le message de succès
      } else {
        // Si le code n'était pas valide (aucune correspondance), alerter l'utilisateur
        Alert.alert("Code invalide", "Le code participant entré n'est associé à aucun événement ou n'est pas valide.");
        // Pas besoin de setIsCodeValid(false) ici, car c'est déjà la valeur actuelle
      }

      console.log("Participant code submitted and processed.");
    } catch (error) {
      console.error("Error during participant code submission:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la soumission du code. Veuillez réessayer.");
      setIsCodeValid(false); // S'assurer que l'état est correct en cas d'erreur
    } finally {
      setIsLoading(false); // Cacher l'indicateur de chargement
    }
  };

  const renderItem = ({ item }: { item: DbRaceEvent }) => {
    return <EventCard event={item} onRefreshTrigger={refreshEventCardsTrigger} />;
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
      <Text style={styles.pageTitle}>Événements</Text>
      <FlatList
        data={dbEvents}
        keyExtractor={(item) => item.re_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
      {/* Bouton déclencheur de la modale */}
      <Pressable style={styles.button} onPress={() => { setIsModalVisible(true); setIsCodeValid(false); /* Réinitialiser l'état du modal à l'ouverture */ setParticipantCode(""); }}>
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
          setParticipantCode(""); // Réinitialiser le champ
          setIsCodeValid(false); // Réinitialiser la validité pour la prochaine ouverture
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {/* Titre */}
            <Text style={styles.modalTitle}>Code participant</Text>
            <Text style={styles.text}>Entrez votre code participant de 4 caractères</Text>

            {/* Input du code ou message de succès */}
            {!isCodeValid ? ( // Affiche l'input et le bouton si le code n'est pas (encore) valide
              <>
                <TextInput
                  style={styles.inputCode}
                  placeholder="----"
                  value={participantCode}
                  onChangeText={(text) => setParticipantCode(text)}
                  autoCapitalize='characters'
                  maxLength={4}
                />
                <Pressable
                  style={[styles.button, { marginTop: 20 }]}
                  onPress={handleParticipantCodeSubmit}
                  disabled={participantCode.trim().length !== 4 || isLoading} // Désactiver si le champ est vide ou si déjà en chargement
                >
                  {isLoading ? ( // Afficher un ActivityIndicator dans le bouton si en chargement
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Valider</Text>
                  )}
                </Pressable>
              </>
            ) : ( // Affiche le message de succès si le code est valide
              <View style={{ alignItems: 'center' }}>
                <Text><Ionicons name="checkmark-circle" size={80} color="#26ae11" /></Text>
                <Text style={{ color: '#555', fontSize: 14, marginTop: 10, textAlign: 'center', marginBottom: 20 }}>Votre code a été traité. Fermez ce message pour voir les événements associés.</Text>
                {/* Bouton de fermeture spécifique pour le message de succès */}
                <Pressable onPress={() => { setIsModalVisible(false); setParticipantCode(""); setIsCodeValid(false); }} style={styles.closeButtonSuccess}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Fermer</Text>
                </Pressable>
              </View>
            )}

            {/* Bouton de fermeture global du modal - visible seulement si le message de succès n'est PAS affiché */}
            {!isCodeValid && (
                <Pressable onPress={() => { setIsModalVisible(false); setParticipantCode(""); setIsCodeValid(false); }} style={styles.closeButton}>
                    <Text style={{color: '#999'}}>Annuler</Text>
                </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E3E5E7",
    paddingVertical: 40,
    paddingHorizontal: 15,
  },
  pageTitle: {
    textAlign: "center",
    marginHorizontal: 15,
    padding: 15,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: "#0A0F0E",
    color: "#f5f7ff",
    borderRadius: 8,
  },
  card: {
    backgroundColor: "#f5f7ff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  text: {
    fontSize: 13,
    color: "#0A0F0E",
  },
  button: {
    backgroundColor: "#216161",
    padding: 15,
    borderRadius: 12,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#0A0F0E',
  },
  // Styles pour la Modale
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    minWidth: 300,
  },
  modalTitle: {
    width: 300,
    textAlign: 'center',
    padding: 15,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#f2f2f2',
    backgroundColor: '#7594A8',
    borderRadius: 8,
  },
  inputCode: {
    marginTop: 15,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    fontSize: 16,
  },
  closeButtonSuccess: {
    backgroundColor: '#216161',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
});

export default Index;