import { addRaceParticipant, getRaceEventById, getRaceParticipantById, updateRaceParticipant } from '@/services/database';
import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from '@/services/phoneKeys';
import { DbRaceEvent } from "@/services/raceEvent";
import { DbRaceParticipant, getRaceParticipantsByEventId } from '@/services/raceParticipant';
import { EventRacesWithParticipants } from '@/types/EventRacesWithParticipants';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from 'react-native';


export default function RaceScreen() {
  // Récupérez le paramètre de recherche local pour obtenir l'ID de l'événement de course
  const { id } = useLocalSearchParams();

  const [raceEvent, setRaceEvent] = useState<DbRaceEvent>({} as DbRaceEvent);
  const [dbRaceParticipants, setDbRaceParticipants] = useState<DbRaceParticipant[]>([]);
  const [phoneRpKeys, setPhoneRpKeys] = useState<DbPhoneRpKey[]>([]);

  const apiURL = process.env.EXPO_PUBLIC_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  const getRaceParticipantsApi = async (eventId: number) => {
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

      // Insertion des participants dans la base de données locale
      eventData.participants.map(async (participant) => {
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
          try {
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
          } catch (error) {
            console.error(`Error updating participant with ID ${participant.rp_id}:`, error);
          }
        }
      });

    } catch (error) {
      console.error('Error fetching race participants:', error);
    }
  }

  const getPhoneRpKeys = async (eventId: number) => {
    try {
      const dbPhoneRpKeys = await getPhoneRpKeysByRaceEventId(eventId);
      setPhoneRpKeys(dbPhoneRpKeys);
      console.log('Phone RP Keys retrieved from local database:', dbPhoneRpKeys);
    } catch (error) {
      console.error('Error fetching phone RP keys from local database:', error);
    }
  }

  useEffect(() => {
    const getEventData = async () => {
      // Récupérez les détails de l'événement de course depuis la base de données locale
      await getRaceEventById(parseInt(id as string)).then((event: DbRaceEvent | null) => {
        setRaceEvent(event as DbRaceEvent);
        console.log('Race event retrieved from local database:', raceEvent);
      }).catch((error) => {
        console.error('Error fetching race event from database:', error);
      });

      // Récupérez les participants de l'API et mettez à jour la base de données locale
      await getRaceParticipantsApi(parseInt(id as string)).catch((error) => {
        console.error('Error fetching race participants from API:', error);
      }).then(async () => {
        // Après avoir récupéré les participants de l'API, récupérez-les à nouveau depuis la base de données locale pour les afficher
        const localParticipants = await getRaceParticipantsByEventId(parseInt(id as string));
        setDbRaceParticipants(localParticipants);
        console.log('Participants récupérés depuis la base de données locale:', localParticipants);
      }).then(async () => {
        // Récupérez les clés des participants de la base de données locale pour les utiliser dans l'application
        await getPhoneRpKeys(parseInt(id as string));
        setPhoneRpKeys(phoneRpKeys);
        console.log('Fetching phone RP keys from local database for event ID:', phoneRpKeys);
      }).catch((error) => {
        console.error('Error fetching phone RP keys from local database:', error);
      });
    }

    getEventData();

  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{raceEvent.re_event_name}</Text>
      {dbRaceParticipants.map((participant) => (
        <View key={participant.rp_id} style={{ marginVertical: 5 }}>
          {participant.rp_name && <Text style={styles.text}>Name: {participant.rp_name}</Text>}
          {participant.rp_bib && <Text style={styles.text}>Bib: {participant.rp_bib}</Text>}
          {participant.rp_color && <Text style={styles.text}>Color: {participant.rp_color}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginVertical: 5,
  },
});