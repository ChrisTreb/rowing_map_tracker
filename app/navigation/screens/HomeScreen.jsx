import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";


const HomeScreen = () => {

  const getRaceEvents = async () => {
    try {
      
      const apiURL = process.env.EXPO_PUBLIC_API_URL;
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;

      console.log('API URL:', apiURL);
      console.log('API Key:', apiKey);

      const response = await fetch(`${apiURL}/raceevents`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': `${apiKey}`
        }
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Error fetching race events:', error);
    }
  };

  useEffect(() => {
    getRaceEvents();
  }, []);

  return (
    <View style={styles.container}>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default HomeScreen;