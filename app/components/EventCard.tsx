import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from "../../services/phoneKeys";
import { DbRaceEvent } from "../../services/raceEvent";
import { formatDateTime } from "../../utils/dateUtils";

interface EventCardProps {
  event: DbRaceEvent;
}

const EventCard = ({ event }: EventCardProps) => {
  const [associatedKeys, setAssociatedKeys] = useState<DbPhoneRpKey[] | null>([]);
  const [keysLoading, setKeysLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setKeysLoading(true);
        const keys = await getPhoneRpKeysByRaceEventId(event.re_id);
        setAssociatedKeys(keys);
      } catch (error) {
        console.error(`Error fetching keys for event ${event.re_id}:`, error);
        setAssociatedKeys([]);
      } finally {
        setKeysLoading(false);
      }
    };
    fetchKeys();
  }, [event.re_id]); // Re-déclencher si l'ID de l'événement change

  const participantKeyView = associatedKeys?.map(key => key.prk_rp_key).join(", ") ?? ""; 

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>{event.re_event_name}</Text>
        <Text style={styles.text}>Participants: {event.nb_participants}</Text>
        <Text style={styles.text}>
          Début: {formatDateTime(event.re_event_start_date_and_time)}
        </Text>
        <Text style={styles.text}>
          Fin: {formatDateTime(event.re_event_end_date_and_time)}
        </Text>
        {/* Afficher toutes les clés associées de la DB locale */}
        {!keysLoading && associatedKeys && associatedKeys.length > 0 && (
          <Text style={styles.textKey}>
            <Ionicons name="key" size={18} color="#0A0F0E" /> {participantKeyView}
          </Text>
        )}
        {keysLoading && <ActivityIndicator size="small" color="#007bff" />}
      </View>
      <View style={styles.linkContainer}>
        {/* Construisez le href pour inclure l'ID de l'événement */}
        <Link href={{ pathname: "/event/[id]", params: { id: event.re_id } }} >
          <Ionicons name="play-circle-outline" size={45} color="#E3E5E7" />
        </Link>
      </View>
    </View>
  );
};

// Styles réutilisés pour la carte
const styles = StyleSheet.create({
  card: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
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
    fontSize: 14,
    marginBottom: 3,
    color: "#555",
  },
  textKey: {
    textAlign: 'center',
    width: 80,
    fontSize: 16,
    fontWeight: 'bold',
    padding: 5,
    marginBottom: 3,
    borderRadius: 8,
    color: "#0A0F0E",
    backgroundColor: "#A7C7D2",
  },
  linkContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#216161",
    width: 60,
    height: 60,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default EventCard;