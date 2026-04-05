import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from "./screens/HomeScreen";
import RaceDetailScreen from "./screens/RaceDetailScreen";
import UserScreen from "./screens/UserScreen";

//Screen names
const homeName = "Home";
const userName = "User";
const raceDetailName = "RaceDetail";

const Tab = createBottomTabNavigator();

function MainContainer() {

    return (
        <>
            <StatusBar animated={true} backgroundColor="#1E90FF" />

            <Tab.Navigator
                initialRouteName={homeName}
                screenOptions={({ route }) => ({
                    // ... (votre configuration existante) ...
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
                        let iconName;
                        let rn = route.name;

                        if (rn === homeName) {
                            iconName = focused ? "home" : "home-outline";
                        } else if (rn === userName) {
                            // Ajoute une icône pour l'écran UserScreen
                            iconName = focused ? "person" : "person-outline";
                        } else if (rn === raceDetailName) {
                            // Ajoute une icône pour l'écran RaceDetailScreen
                            iconName = focused ? "flag" : "flag-outline";
                        }

                        // You can return any component that you like here!
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                })}
            >
                <Tab.Screen name={homeName} component={HomeScreen} />
                <Tab.Screen name={raceDetailName} component={RaceDetailScreen} />
                <Tab.Screen name={userName} component={UserScreen} />
                { }
            </Tab.Navigator>
        </> // Utilisez un fragment React pour envelopper la StatusBar et le Tab.Navigator
    );
}

export default MainContainer;
