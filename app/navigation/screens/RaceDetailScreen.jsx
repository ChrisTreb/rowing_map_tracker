import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { getRaces } from "../../../services/database";

const RaceDetailScreen = () => {
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const webviewRef = useRef(null);
  const lastBearing = useRef(0);
  const smooth = (a, b) => a + (b - a) * 0.2;
  const path = selectedRace ? JSON.parse(selectedRace.route_data) : [];
  const pathLength = path.length || 0;

  const getBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  const formatTime = (index, total) => {
    if (!selectedRace || total === 0) return "0:00";

    const percent = index / total;
    const totalDuration = selectedRace.duration || 0;

    const currentTime = Math.floor(totalDuration * percent);

    const min = Math.floor(currentTime / 60);
    const sec = currentTime % 60;

    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          body { margin: 0; }
          #map { height: 100vh; width: 100vw; }

          .marker-inner {
            width: 0;
            height: 0;

            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 20px solid #f95c5c;

            transform-origin: 50% 70%;

            filter: drop-shadow(0 0 3px white) drop-shadow(0 2px 3px rgba(0,0,0,0.3));
          }
        
          .marker-inner::after {
            content: '';
            position: absolute;
            left: -4px;
            top: 12px;
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <script>
          var map = L.map('map').setView([48.39, -4.48], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap France'
          }).addTo(map);

          var replayLine = L.polyline([], {
            color: '#4266f5',
            weight: 5
          }).addTo(map);

          var fullLine = L.polyline([], {
            color: '#ccc',
            weight: 3,
            opacity: 0.5
          }).addTo(map);

          var marker = null;

          function handleMessage(event) {
            var data = JSON.parse(event.data);

            if (data.fullPath) {
              var latlngs = data.fullPath.map(p => [p.latitude, p.longitude]);
              fullLine.setLatLngs(latlngs);
              map.fitBounds(latlngs);
            }

            if (data.resetReplay) {
              replayLine.setLatLngs([]);
            }

            if (data.replayPoint) {
              var point = [data.replayPoint.latitude, data.replayPoint.longitude];

              replayLine.addLatLng(point);

              if (!marker) {
                marker = L.marker(point, {
                  icon: L.divIcon({
                    className: '',
                    html: '<div class="marker-inner"></div>'
                  })
                }).addTo(map);
              } else {
                marker.setLatLng(point);

                var el = marker.getElement();
                if (el) {
                  var inner = el.querySelector('.marker-inner');
                  if (inner) {
                    inner.style.transform = 'rotate(' + (data.bearing || 0) + 'deg)';
                  }
                }
              }

              var zoom = 17;

              map.setView(point, zoom);
            }
          }

          document.addEventListener("message", handleMessage);
          window.addEventListener("message", handleMessage);
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    const load = async () => {
      const data = await getRaces();
      setRaces(data);
    };
    load();
  }, []);

  // ▶️ Replay loop
  useEffect(() => {
    let interval;

    if (isPlaying && selectedRace) {
      const path = JSON.parse(selectedRace.route_data);

      interval = setInterval(() => {
        setReplayIndex((i) => {
          if (i >= path.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 400);
    }

    return () => clearInterval(interval);
  }, [isPlaying, selectedRace]);

  // 📡 envoyer path complet
  useEffect(() => {
    if (!selectedRace || !webviewRef.current) return;

    const path = JSON.parse(selectedRace.route_data);
    const point = path[replayIndex];

    let bearing = 0;

    if (replayIndex > 0) {
      const prev = path[replayIndex - 1];

      let rawBearing = getBearing(
        prev.latitude,
        prev.longitude,
        point.latitude,
        point.longitude
      );

      // 🔥 lissage
      let bearing = smooth(lastBearing.current, rawBearing);

      // sauvegarde
      lastBearing.current = bearing;
    }

    webviewRef.current.postMessage(JSON.stringify({
      replayPoint: point,
      bearing
    }));

  }, [replayIndex]);

  if (!selectedRace) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mes courses</Text>

        <FlatList
          data={races}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedRace(item);
                setReplayIndex(0);
              }}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text>{item.distance} km</Text>
              <Text>{item.duration}s</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => {
        setSelectedRace(null);
        setIsPlaying(false);
      }}>
        <Text style={styles.back}>⬅ Retour</Text>
      </TouchableOpacity>

      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: leafletHtml }}
        style={{ height: 350 }}
      />

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setIsPlaying(true)}>
          <Text style={styles.control}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsPlaying(false)}>
          <Text style={styles.control}>⏸</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          setIsPlaying(false);
          setReplayIndex(0);

          webviewRef.current.postMessage(JSON.stringify({
            resetReplay: true
          }));
        }}>
          <Text style={styles.control}>⏹</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.timelineContainer}>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={0}
          maximumValue={pathLength > 0 ? pathLength - 1 : 0}
          value={replayIndex}
          onSlidingStart={() => setIsPlaying(false)}
          onValueChange={(value) => {
            setIsPlaying(false); // pause quand on touche
            setReplayIndex(Math.floor(value));
          }}

          minimumTrackTintColor="#4266f5"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#4266f5"
        />

        <View style={styles.timelineLabels}>
          <Text>{formatTime(replayIndex, pathLength)}</Text>
          <Text>{formatTime(pathLength, pathLength)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: { fontSize: 24, textAlign: "center", marginVertical: 10 },

  card: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },

  cardTitle: { fontSize: 18, fontWeight: "bold" },

  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },

  control: { fontSize: 30 },

  back: { fontSize: 18, marginBottom: 10 },
  timelineContainer: {
    width: "100%",
    marginTop: 10,
    paddingHorizontal: 10,
  },

  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -5,
  },
});

export default RaceDetailScreen;
