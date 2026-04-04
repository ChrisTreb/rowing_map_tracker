import React from "react";
import { StyleSheet, Text, View } from "react-native";

const UserScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Utilisateur</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Nom d'utilisateur:</Text>
        <Text style={styles.value}>John Doe</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>john.doe@example.com</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Statut:</Text>
        <Text style={styles.value}>Actif</Text>
      </View>
      <Text style={styles.placeholderText}>
        (Ici, vous pourrez afficher les statistiques de l'utilisateur, les
        courses passées, etc.)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#333",
  },
  infoContainer: {
    flexDirection: "row",
    marginBottom: 15,
    width: "80%",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
  },
  value: {
    fontSize: 18,
    color: "#777",
  },
  placeholderText: {
    marginTop: 50,
    fontSize: 14,
    fontStyle: "italic",
    color: "#999",
    textAlign: "center",
  },
});

export default UserScreen;
