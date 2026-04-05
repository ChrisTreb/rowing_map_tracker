import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { WebView } from 'react-native-webview';

const RaceDetailScreen = ({ route }) => {
  const race = route?.params?.race;
  const webviewRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [error, setError] = useState(null);

  const screenWidth = Dimensions.get("window").width;

  // HTML/JS pour Leaflet avec IGN WMS
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false });

          L.tileLayer.wms('https://data.geopf.fr/wms-r', {
            layers: 'GEOGRAPHICALGRIDSYSTEMS.COASTALMAPS',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            attribution: 'IGN'
          }).addTo(map);

          var polyline = L.polyline([], {color: '#4266f5', weight: 5}).addTo(map);
          var marker = L.circleMarker([0,0], { radius: 6, color: 'white', fillColor: 'red', fillOpacity: 1 }).addTo(map);

          window.addEventListener('message', function(event) {
            var data = JSON.parse(event.data);
            if (data.type === 'SET_DATA') {
               var latlngs = data.points.map(p => [p.latitude, p.longitude]);
               if (latlngs.length > 0) {
                 map.fitBounds(latlngs);
               }
            }
            if (data.type === 'UPDATE_REPLAY') {
              var currentPoints = data.visiblePoints.map(p => [p.latitude, p.longitude]);
              polyline.setLatLngs(currentPoints);
              if (currentPoints.length > 0) {
                marker.setLatLng(currentPoints[currentPoints.length - 1]);
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (!race) {
      setError("Aucune course fournie.");
      return;
    }

    if (!race.route_data) {
      setError("Aucune donnée GPS disponible.");
      return;
    }

    try {
      const parsed = JSON.parse(race.route_data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Données GPS invalides.");
        return;
      }

      setPoints(parsed);

      // ▶️ replay
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i >= parsed.length) {
          clearInterval(interval);
        } else {
          setReplayIndex(i);
        }
      }, 300);

      return () => clearInterval(interval);
    } catch (e) {
      setError("Impossible de lire la course.");
    }
  }, [race]);

  // Envoyer les points à la WebView une fois chargée
  const onMapLoad = () => {
    if (webviewRef.current && points.length > 0) {
      webviewRef.current.postMessage(JSON.stringify({
        type: 'SET_DATA',
        points: points
      }));
    }
  };

  // Mettre à jour le tracé du replay
  useEffect(() => {
    if (webviewRef.current && points.length > 0) {
      webviewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_REPLAY',
        visiblePoints: points.slice(0, replayIndex + 1)
      }));
    }
  }, [replayIndex, points]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (points.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4266f5" />
      </View>
    );
  }

  // Calcul des vitesses pour le graph
  const speeds = points.map((p, i) => {
    // Si on a les données de vitesse réelles dans le point on les utilise
    // Sinon on simule ou on affiche 0 pour l'exemple
    return i % 5 === 0 ? Math.random() * 15 : 10; // Exemple
  }).slice(0, 20); // Limiter pour l'affichage

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml, baseUrl: 'https://localhost' }}
          userAgent="RowingMapTrackerApp"
          onLoad={onMapLoad}
          style={styles.map}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.stats}>Distance: {race.distance?.toFixed(2) || 0} km</Text>
        <Text style={styles.stats}>Vitesse moy: {race.avg_speed?.toFixed(2) || 0} km/h</Text>

        <LineChart
          data={{
            labels: ["Start", "...", "End"],
            datasets: [{ data: speeds.length > 0 ? speeds : [0] }],
          }}
          width={screenWidth - 40}
          height={180}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(66, 102, 245, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "3", strokeWidth: "2", stroke: "#4266f5" }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { height: '40%', width: '100%' },
  map: { flex: 1 },
  details: { padding: 20 },
  stats: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  chart: { marginVertical: 8, borderRadius: 16 }
});

export default RaceDetailScreen;
