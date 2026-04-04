import { Stack } from "expo-router";
import MainContainer from "./navigation/MainContainer";

export default function Index() {
  return (
    <>
      {/* Définit les options pour cet écran dans la Stack Navigator d'Expo Router */}
      <Stack.Screen options={{ headerShown: false }} />
      <MainContainer />
    </>
  );
}
