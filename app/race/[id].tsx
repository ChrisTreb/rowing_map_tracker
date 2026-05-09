import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function RaceScreen() {
    const { id } = useLocalSearchParams(); // Récupérez les paramètres locaux

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Race screen</Text>
            {id && <Text style={styles.text}>ID de l'événement: {id}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 18,
        marginVertical: 5,
    },
});