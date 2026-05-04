import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";

// Screens
import HomeScreen from "./screens/HomeScreen";

// TS interface for icon names
type IconName = keyof typeof Ionicons.glyphMap;

//Screen names
const homeName = "Home";

const Tab = createBottomTabNavigator();

function MainContainer() {
    return (
        <>
            <StatusBar animated={true} backgroundColor="#1E90FF" />

            <Tab.Navigator
                initialRouteName={homeName}
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

                        if (rn === homeName) {
                            iconName = focused ? "home" : "home-outline";
                        }

                        // You can return any component that you like here!
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                })}
            >
                <Tab.Screen name={homeName} component={HomeScreen} />

                { }
            </Tab.Navigator>
        </> // Utilisez un fragment React pour envelopper la StatusBar et le Tab.Navigator
    );
}

export default MainContainer;
