import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Événements", headerShown: false }} />
      {/* Référencez le dossier dynamique 'race' et le fichier '[id].tsx' */}
      <Stack.Screen name="race/[id]" options={{ title: "Course", headerShown: false }} />
    </Stack>
  );
}