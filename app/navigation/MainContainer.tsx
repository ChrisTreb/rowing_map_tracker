import React from "react";
import { StatusBar, StyleSheet, View } from "react-native";

// Screens
import EventsScreen from "./screens/EventsScreen";

function MainContainer() {

    return (
        <View style={styles.container}>
            <StatusBar animated={true} backgroundColor="#1E90FF" />
            <EventsScreen />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingVertical: 40,
    },
});

export default MainContainer;
