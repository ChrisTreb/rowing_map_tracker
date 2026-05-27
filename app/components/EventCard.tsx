import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DbPhoneRpKey, getPhoneRpKeysByRaceEventId } from "../../services/phoneKeys";
import { DbRaceEvent } from "../../services/raceEvent";
import { formatDateTime } from "../../utils/dateUtils";
import { debugLog } from "../../utils/logUtils";

interface EventCardProps {
  event: DbRaceEvent;
  // Ajout d'une prop pour déclencher le rafraîchissement
  onRefreshTrigger?: number;
}

const EventCard = ({ event, onRefreshTrigger }: EventCardProps) => {
  const [associatedKeys, setAssociatedKeys] = useState<DbPhoneRpKey[] | null>([]);
  const [keysLoading, setKeysLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setKeysLoading(true);
        const keys = await getPhoneRpKeysByRaceEventId(event.re_id);
        setAssociatedKeys(keys);
      } catch (error) {
        debugLog("ERROR", `Error fetching keys for event ${event.re_id}:`, error);
        setAssociatedKeys([]);
      } finally {
        setKeysLoading(false);
      }
    };
    fetchKeys();
  }, [event.re_id, onRefreshTrigger]); // Re-déclencher si l'ID de l'événement change ou une clé est ajoutée

  const participantKeyView = associatedKeys?.map(key => key.prk_rp_key).join(", ") ?? "";

  // Vérifier si l'événement est passé
  const isEventOver = event.re_event_end_date_and_time < new Date().getTime();

  return (
    <View style={[styles.card, isEventOver && styles.pastEventCard]}>
      <Link href={{ pathname: "/event/[id]", params: { id: event.re_id } }} style={{ width: "100%"}}>
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
              {/* Envelopper Ionicons dans un <Text> séparé pour éviter l'erreur */}
              <Text><Ionicons name="key" size={18} color="#0A0F0E" /></Text> {participantKeyView}
            </Text>
          )}
          {keysLoading && <ActivityIndicator size="small" color="#007bff" />}
        </View>
      </Link>
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
    backgroundColor: "#f0f0f0", // Couleur par défaut pour les événements actifs
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    // Vous pouvez ajouter une bordure pour mieux distinguer
    borderLeftWidth: 5,
    borderLeftColor: '#216161', // Couleur pour les événements actifs
  },
  pastEventCard: {
    backgroundColor: "#e0e0e0", // Une couleur plus discrète pour les événements passés
    borderLeftColor: '#999', // Bordure plus grise
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
    minWidth: 80,
    maxWidth: 260,
    width: 'auto',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 5,
    marginBottom: 3,
    borderRadius: 8,
    color: "#0A0F0E",
    backgroundColor: "#A7C7D2",
  },
});

export default EventCard;