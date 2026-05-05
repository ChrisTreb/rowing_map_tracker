import { initDb } from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useEffect } from "react";
import { StatusBar } from "react-native";

// Screens
import EventsScreen from "./screens/EventsScreen";

// TS interface for icon names
type IconName = keyof typeof Ionicons.glyphMap;

//Screen names
const eventsName = "Vos événements";

const Tab = createBottomTabNavigator();

function MainContainer() {

    useEffect(() => {
        // Initialize the database when the app starts
        initDb().then(() => {
            console.log("Database initialized successfully");
        }).catch((error) => {
            console.error("Error initializing database:", error);
        });
    }, []);

    return (
        <>
            <StatusBar animated={true} backgroundColor="#1E90FF" />

            <Tab.Navigator
                initialRouteName={eventsName}
                screenOptions={({ route }) => ({
                    tabBarActiveTintColor: "#1E90FF",
                    tabBarInactiveTintColor: "grey",
                    tabBarLabelStyle: {
                        paddingBottom: 10,
                        fontSize: 10,
                    },
                    tabBarStyle: [
                        {
                            paddingTop: 5,
                            display: "flex",
                        },
                        null,
                    ],
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName: IconName = "help-circle"; // fallback
                        let rn = route.name;

                        if (rn === eventsName) {
                            iconName = focused ? "home" : "home-outline";
                        }

                        // You can return any component that you like here!
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                })}
            >
                <Tab.Screen name={eventsName} component={EventsScreen} />

                { }
            </Tab.Navigator>
        </> // Utilisez un fragment React pour envelopper la StatusBar et le Tab.Navigator
    );
}

export default MainContainer;
