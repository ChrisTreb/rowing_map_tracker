import { addRaceParticipant, getRaceEventById, getRaceParticipantById } from '@/services/database';
import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from '@/services/phoneKeys';
import { DbRaceEvent } from "@/services/raceEvent";
import { DbRaceParticipant, getRaceParticipantsByEventId } from '@/services/raceParticipant';
import { Participant } from '@/types/Participant';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from 'react-native';


export default function RaceScreen() {
  // Récupérez le paramètre de recherche local pour obtenir l'ID de l'événement de course
  const { id } = useLocalSearchParams();

  const [raceEvent, setRaceEvent] = useState<DbRaceEvent | null>(null);
  const [dbRaceParticipants, setDbRaceParticipants] = useState<DbRaceParticipant[]>([]);
  const [phoneRpKeys, setPhoneRpKeys] = useState<DbPhoneRpKey[]>([]);

  const apiURL = process.env.EXPO_PUBLIC_API_URL;

  const getRaceParticipantsApi = async (eventId: number) => {
    try {

      const response = await fetch(`${apiURL}/api/v1/participants/re_id/${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
        },
      });

      const participantsData: Participant[] = await response.json();

      console.log('Participants fetched from API:', participantsData);

      // Insertion des participants dans la base de données locale
      await Promise.all(participantsData.map(async (participant) => {
        // Si le participant n'existe pas déjà dans la base de données locale, l'ajouter
        if (getRaceParticipantById(participant.rp_id) === null) {

          await addRaceParticipant(
            participant.rp_id,
            participant.rp_ra_id,
            id ? parseInt(id as string) : null,
            participant.rp_bib,
            participant.rp_name,
            participant.rp_color,
            participant.rp_key,
            participant.rp_updated_at
          );
        } else {
          // Mettre à jour le participant existant dans la base de données locale
          try {
            await addRaceParticipant(
              participant.rp_id,
              participant.rp_ra_id,
              id ? parseInt(id as string) : null,
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
      }));

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
    const getPageData = async () => {
      // Récupérez les détails de l'événement de course depuis la base de données locale
      await getRaceEventById(parseInt(id as string)).then((event: DbRaceEvent | null) => {
        setRaceEvent(event);
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
        console.log('Participants récupérés depuis la base de données locale:', dbRaceParticipants);
      }).catch((error) => {
        console.error('Error fetching race participants from local database:', error);
      }).then(async () => {
        // Récupérez les clés des participants de la base de données locale pour les utiliser dans l'application
        await getPhoneRpKeys(parseInt(id as string));
        console.log('Fetching phone RP keys from local database for event ID:', phoneRpKeys);
      }).catch((error) => {
        console.error('Error fetching phone RP keys from local database:', error);
      });
    }

    getPageData();

  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Race screen</Text>
      {id && <Text style={styles.text}>ID de l'événement: {id}</Text>}
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