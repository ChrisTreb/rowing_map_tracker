import { addRaceParticipant, getRaceEventById, getRaceParticipantById, updateRaceParticipant } from '@/services/database';
import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from '@/services/phoneKeys';
import { addRace, DbRace, getRaceById, getRacesByEventId, updateRace } from '@/services/race';
import { DbRaceEvent } from "@/services/raceEvent";
import { DbRaceParticipant, getRaceParticipantsByEventId } from '@/services/raceParticipant';
import { EventRacesWithParticipants } from '@/types/EventRacesWithParticipants';
import { Participant } from "@/types/Participant";
import { Race } from "@/types/Race";
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';


export default function RaceScreen() {
  // Récupérez le paramètre de recherche local pour obtenir l'ID de l'événement de course
  const { id } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true); // État pour indiquer le chargement/la synchronisation

  const [raceEvent, setRaceEvent] = useState<DbRaceEvent>({} as DbRaceEvent);
  const [dbRaceParticipants, setDbRaceParticipants] = useState<DbRaceParticipant[] | null>([]);
  const [dbRaces, setDbRaces] = useState<DbRace[] | null>([])
  const [dbPhoneRpKeys, setDbPhoneRpKeys] = useState<DbPhoneRpKey[] | null>([]);

  const apiURL = process.env.EXPO_PUBLIC_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  const getRaceAndParticipantsFromApi = async (eventId: number) => {
    try {

      const response = await fetch(`${apiURL}/participants/re_id/${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey ? apiKey : '',
        },
      });

      const eventData: EventRacesWithParticipants = await response.json();

      console.log('Event data fetched from API:', eventData);

      // Insertion des courses dans la base de données locale
      eventData.races.map(async (race: Race) => {
        console.log('Processing race:', race);
        // Si la course n'existe pas déjà dans la base de données locale, l'ajouter
        if (await getRaceById(race.ra_id) === null) {

          await addRace(
            race.ra_id,
            race.ra_re_id,
            race.ra_type,
            race.ra_name
          );
        } else {
          // Mise à jour systématique en base des données récupérées depuis l'API
          await updateRace(
            race.ra_id,
            race.ra_re_id,
            race.ra_type,
            race.ra_name
          );
        }
      });

      // Insertion des participants dans la base de données locale
      eventData.participants.map(async (participant: Participant) => {
        console.log('Processing participant:', participant);
        // Si le participant n'existe pas déjà dans la base de données locale, l'ajouter
        if (await getRaceParticipantById(participant.rp_id) === null) {

          await addRaceParticipant(
            participant.rp_id,
            participant.rp_ra_id,
            parseInt(id as string),
            participant.rp_bib,
            participant.rp_name,
            participant.rp_color,
            participant.rp_key,
            participant.rp_updated_at
          );
        } else {
          // Mettre à jour le participant existant dans la base de données locale
          await updateRaceParticipant(
            participant.rp_id,
            parseInt(id as string),
            participant.rp_ra_id,
            participant.rp_bib,
            participant.rp_name,
            participant.rp_color,
            participant.rp_key,
            participant.rp_updated_at
          );
        }
      });

    } catch (error) {
      console.error('Error fetching race participants:', error);
    }
  }

  const getLocalData = async () => {
    // Récupérez les détails de l'événement de course depuis la base de données locale
    const localRaceEvent = await getRaceEventById(parseInt(id as string))
    setRaceEvent(localRaceEvent as DbRaceEvent);
    console.log('Race event retrieved from local database:', raceEvent);

    // Après avoir récupéré les participants de l'API, récupérez-les à nouveau depuis la base de données locale pour les afficher
    const localParticipants: DbRaceParticipant[] | null = await getRaceParticipantsByEventId(parseInt(id as string));
    setDbRaceParticipants(localParticipants);
    console.log('Participants récupérés depuis la base de données locale:', dbRaceParticipants);

    // Récupérer les courses en base de données associées à l'événement
    const localRaces: DbRace[] | null = await getRacesByEventId(parseInt(id as string));
    setDbRaces(localRaces);
    console.log('Courses récupérées depuis la base de données locale:', dbRaces);

    // Récupérez les clés des participants de la base de données locale pour les utiliser dans l'application
    const localPhoneRpKeys: DbPhoneRpKey[] | null = await getPhoneRpKeysByRaceEventId(parseInt(id as string));
    setDbPhoneRpKeys(localPhoneRpKeys);
    console.log('Phone RP Keys retrieved from local database:', dbPhoneRpKeys);
  }

  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        setIsLoading(true);

        // Récupérez les participants de l'API et mettez à jour la base de données locale
        await getRaceAndParticipantsFromApi(parseInt(id as string))

      } catch (error) {
        console.error('Error loading data for event ID', id);
      } finally {
        // Charger les données depuis la base de données locale
        await getLocalData();

        setIsLoading(false);
      }
    };
    // Exécuter une seule fois au montage du composant
    initializeAndSync();
  }, []);

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
      <Text style={styles.title}>{raceEvent.re_event_name}</Text>
      <Text style={styles.title}>Participants</Text>
      {dbRaceParticipants != null && dbRaceParticipants.map((participant) => (
        <View key={participant.rp_id} style={{ marginVertical: 5 }}>
          <Text>{JSON.stringify(participant)}</Text>
        </View>
      ))}
      <Text style={styles.title}>Courses de l'événement</Text>
      {dbRaces != null && dbRaces.map((races) => (
        <View key={races.ra_id} style={{ marginVertical: 5 }}>
          <Text>{JSON.stringify(races)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    color: '#0A0F0E',
    fontSize: 18,
    marginVertical: 5,
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