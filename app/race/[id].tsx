import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from '@/services/phoneKeys';
import { addRace, DbRace, getRaceById, getRacesByEventId, updateRace } from '@/services/race';
import { DbRaceEvent, getRaceEventById } from "@/services/raceEvent";
import { addRaceParticipant, DbRaceParticipant, getRaceParticipantById, getRaceParticipantsByEventId, updateRaceParticipant } from '@/services/raceParticipant';
import { EventRacesWithParticipants } from '@/types/EventRacesWithParticipants';
import { Participant } from "@/types/Participant";
import { Race } from "@/types/Race";
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';


export default function RaceScreen() {
  const { id } = useLocalSearchParams();
  const eventId = id ? parseInt(id as string) : null;

  const [isLoading, setIsLoading] = useState(true);

  const [raceEvent, setRaceEvent] = useState<DbRaceEvent | null>(null);
  const [dbRaceParticipants, setDbRaceParticipants] = useState<DbRaceParticipant[] | null>([]);
  const [dbRaces, setDbRaces] = useState<DbRace[] | null>([]);
  const [dbPhoneRpKeys, setDbPhoneRpKeys] = useState<DbPhoneRpKey[] | null>([]);

  const apiURL = process.env.EXPO_PUBLIC_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  const getRaceAndParticipantsFromApi = async (currentEventId: number) => {
    try {
      const response = await fetch(`${apiURL}/participants/re_id/${currentEventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey ? apiKey : '',
        },
      });

      // --- Vérification de la réponse avant de tenter de parser JSON ---
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error for participants (Status: ${response.status} ${response.statusText}):`, errorBody);
        throw new Error(`Failed to fetch participants: ${response.status} ${response.statusText}`);
      }
      // --- Fin de la vérification ---

      const eventData: EventRacesWithParticipants = await response.json();
      console.log('Event data fetched from API:', eventData);

      // Traiter les courses
      const racePromises = eventData.races.map(async (race: Race) => {
        const existingRace = await getRaceById(race.ra_id);
        if (!existingRace) {
          await addRace(race.ra_id, race.ra_re_id, race.ra_type, race.ra_name);
          console.log(`Added race ${race.ra_name} (ID: ${race.ra_id}).`);
        } else {
          await updateRace(race.ra_id, race.ra_re_id, race.ra_type, race.ra_name);
          console.log(`Updated race ${race.ra_name} (ID: ${race.ra_id}).`);
        }
      });

      // Traiter les participants
      const participantPromises = eventData.participants.map(async (participant: Participant) => {
        const existingParticipant = await getRaceParticipantById(participant.rp_id);
        if (!existingParticipant) {
          await addRaceParticipant(
            participant.rp_id,
            participant.rp_ra_id,
            currentEventId,
            participant.rp_bib,
            participant.rp_name,
            participant.rp_color,
            participant.rp_key,
            participant.rp_updated_at
          );
          console.log(`Added participant ${participant.rp_key} (ID: ${participant.rp_id}).`);
        } else {
          // --- Correction de l'ordre des arguments ---
          await updateRaceParticipant(
            participant.rp_id,
            participant.rp_ra_id,
            currentEventId,
            participant.rp_bib,
            participant.rp_name,
            participant.rp_color,
            participant.rp_key,
            participant.rp_updated_at
          );
          console.log(`Updated participant ${participant.rp_key} (ID: ${participant.rp_id}).`);
        }
      });

      // Attendre que toutes les insertions/mises à jour de courses et de participants soient terminées
      await Promise.all([...racePromises, ...participantPromises]);
      console.log('All races and participants synced.');

    } catch (error) {
      console.error('Error fetching or syncing race data from API:', error);
      throw error; // Propager l'erreur pour la gestion globale
    }
  }

  const getLocalData = async (currentEventId: number) => {
    try {
      // Récupérez les détails de l'événement de course depuis la base de données locale
      const localRaceEvent = await getRaceEventById(currentEventId);
      setRaceEvent(localRaceEvent);
      console.log('Race event récupéré depuis la base de données locale:', localRaceEvent);

      // Récupérer les courses en base de données associées à l'événement
      const localRaces = await getRacesByEventId(currentEventId);
      setDbRaces(localRaces);
      console.log('Courses récupérées depuis la base de données locale:', localRaces);

      // Récupérez les participants depuis la base de données locale pour les afficher
      const localParticipants = await getRaceParticipantsByEventId(currentEventId);
      setDbRaceParticipants(localParticipants);
      console.log('Participants récupérés depuis la base de données locale:', localParticipants);

      // Récupérez les clés des participants de la base de données locale
      const localPhoneRpKeys = await getPhoneRpKeysByRaceEventId(currentEventId);
      setDbPhoneRpKeys(localPhoneRpKeys);
      console.log('Phone RP Keys récupérées depuis la base de données locale:', localPhoneRpKeys);

    } catch (error) {
      console.error('Error retrieving local data:', error);
      throw error;
    }
  }

  useEffect(() => {
    const initializeAndSync = async () => {
      if (eventId === null || isNaN(eventId)) {
        console.error("Invalid or missing event ID.");
        setIsLoading(false);
        Alert.alert("Erreur", "L'événement n'existe pas.");
        return;
      }

      try {
        setIsLoading(true);

        // 1. Récupérer et synchroniser les données (courses et participants) depuis l'API
        await getRaceAndParticipantsFromApi(eventId);

        // 2. Charger toutes les données depuis la base de données locale après la synchronisation
        await getLocalData(eventId);

      } catch (error) {
        console.error('Error in initializeAndSync:', error);
        Alert.alert("Erreur de synchronisation", "Une erreur est survenue lors de la synchronisation des données.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndSync();
  }, [eventId]); // Le useEffect se déclenche lorsque eventId change

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement des détails de la course...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {raceEvent ? (
        <Text style={styles.title}>{raceEvent.re_event_name}</Text>
      ) : (
        <Text style={styles.title}>Détails de l'événement introuvables</Text>
      )}

      {dbRaceParticipants &&
        <Text style={styles.subtitle}>Participants ({dbRaceParticipants.length})</Text>
      }
      {dbRaceParticipants != null ? dbRaceParticipants.map((participant) => (
        <View key={participant.rp_id} style={styles.dataCard}>
          <Text style={styles.dataText}>Course ID: {participant.rp_ra_id}</Text>
          <Text style={styles.dataText}>Nom: {participant.rp_name}</Text>
          <Text style={styles.dataText}>Clé: {participant.rp_key}</Text>
          <Text style={styles.dataText}>Couleur: {participant.rp_color}</Text>
        </View>
      )) : <Text style={styles.noDataText}>Aucun participant trouvé.</Text>}

      {dbRaces &&
        <Text style={styles.subtitle}>Courses de l'événement ({dbRaces.length})</Text>
      }
      {dbRaces != null ? dbRaces.map((race) => (
        <View key={race.ra_id} style={styles.dataCard}>
          <Text style={styles.dataText}>Nom: {race.ra_name}</Text>
          <Text style={styles.dataText}>Type: {race.ra_type}</Text>
        </View>
      )) : <Text style={styles.noDataText}>Aucune course trouvée.</Text>}

      {dbPhoneRpKeys &&
        <Text style={styles.subtitle}>Clés RP locales ({dbPhoneRpKeys.length})</Text>
      }
      {dbPhoneRpKeys != null ? dbPhoneRpKeys.map((key) => (
        <View key={key.prk_id} style={styles.dataCard}>
          <Text style={styles.dataText}>Clé: {key.prk_rp_key}</Text>
          <Text style={styles.dataText}>Fin validité: {new Date(key.re_event_end_date_and_time).toLocaleString()}</Text>
        </View>
      )) : <Text style={styles.noDataText}>Aucune clé RP trouvée.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    paddingVertical: 40,
    paddingHorizontal: 15,
    overflow: "scroll",
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  dataCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
});