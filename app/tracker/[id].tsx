import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function Tracker() {

  const { id } = useLocalSearchParams();
  const raceId = id ? parseInt(id as string) : null;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello, World! Welcome to race {raceId} !</Text>
    </View>
  );
}