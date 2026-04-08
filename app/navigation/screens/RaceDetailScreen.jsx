import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { dummyPositions, getRaceParticipantPositionsByParticipantId } from "../../../services/database";

const RaceDetailScreen = () => {
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const webviewRef = useRef(null);
  const lastBearing = useRef(0);

  const smooth = (a, b) => a + (b - a) * 0.2;

  // 🔥 GROUP + CLEAN
  const groupByRace = (positions) => {
    const map = {};

    positions.forEach(p => {
      if (!map[p.rpp_rp_id]) map[p.rpp_rp_id] = [];
      map[p.rpp_rp_id].push(p);
    });

    return Object.values(map).map(points =>
      points
        .sort((a, b) => a.rp_date - b.rp_date)
        .filter((p, i, arr) => {
          if (i === 0) return true;

          const prev = arr[i - 1];

          const dLat = Math.abs(p.rpp_viewport_latitude - prev.rpp_viewport_latitude);
          const dLng = Math.abs(p.rpp_viewport_longitude - prev.rpp_viewport_longitude);

          return dLat < 0.01 && dLng < 0.01; // filtre GPS
        })
    );
  };

  const path = selectedRace || [];
  const pathLength = path.length;

  // 🔥 BEARING
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

  // 🔥 LOAD DATA
  useEffect(() => {
    const load = async () => {
      await dummyPositions(1);

      const data = await getRaceParticipantPositionsByParticipantId(1);

      console.log("POINTS:", data.length);

      const grouped = groupByRace(data);

      setRaces(grouped);
    };

    load();
  }, []);

  // ▶️ REPLAY LOOP
  useEffect(() => {
    let interval;

    if (isPlaying && selectedRace) {
      interval = setInterval(() => {
        setReplayIndex(i => {
          if (i >= path.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 300);
    }

    return () => clearInterval(interval);
  }, [isPlaying, selectedRace]);

  // 📡 SEND TO MAP
  useEffect(() => {
    if (!selectedRace || !webviewRef.current) return;

    const point = path[replayIndex];

    let bearing = lastBearing.current;

    if (replayIndex > 0) {
      const prev = path[replayIndex - 1];

      const raw = getBearing(
        prev.rpp_viewport_latitude,
        prev.rpp_viewport_longitude,
        point.rpp_viewport_latitude,
        point.rpp_viewport_longitude
      );

      bearing = smooth(lastBearing.current, raw);
      lastBearing.current = bearing;
    }

    const currentPath = path.slice(0, replayIndex + 1);

    webviewRef.current.postMessage(JSON.stringify({
      currentPath,
      replayPoint: point,
      bearing
    }));

  }, [replayIndex]);

  // 📡 FULL PATH INIT
  useEffect(() => {
    if (!selectedRace || !webviewRef.current) return;

    webviewRef.current.postMessage(JSON.stringify({
      fullPath: path
    }));

  }, [selectedRace]);

  // 🌍 LEAFLET
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
        border-bottom: 20px solid #ff3b3b;
        transform-origin: 50% 70%;
        filter: drop-shadow(0 0 3px white);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script>
      var map = L.map('map').setView([48.39, -4.48], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png').addTo(map);

      var replayLine = L.polyline([], { color: '#4266f5', weight: 5 }).addTo(map);
      var fullLine = L.polyline([], { color: '#ccc', weight: 3 }).addTo(map);

      var marker = null;

      function handleMessage(event) {
        var data = JSON.parse(event.data);

        if (data.fullPath) {
          var latlngs = data.fullPath.map(p => [
            p.rpp_viewport_latitude,
            p.rpp_viewport_longitude
          ]);
          fullLine.setLatLngs(latlngs);
          map.fitBounds(latlngs);
        }

        if (data.currentPath) {
          var latlngs = data.currentPath.map(p => [
            p.rpp_viewport_latitude,
            p.rpp_viewport_longitude
          ]);
          replayLine.setLatLngs(latlngs);
        }

        if (data.replayPoint) {
          var point = [
            data.replayPoint.rpp_viewport_latitude,
            data.replayPoint.rpp_viewport_longitude
          ];

          if (!marker) {
            marker = L.marker(point, {
              icon: L.divIcon({
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

          map.setView(point, 17);
        }
      }

      document.addEventListener("message", handleMessage);
      window.addEventListener("message", handleMessage);
    </script>
  </body>
  </html>
  `;

  // 📱 LIST VIEW
  if (!selectedRace) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mes courses</Text>

        <FlatList
          data={races}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedRace(item);
                setReplayIndex(0);
              }}
            >
              <Text style={styles.cardTitle}>Course</Text>
              <Text>{item.length} points</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // 🎬 REPLAY VIEW
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
        }}>
          <Text style={styles.control}>⏹</Text>
        </TouchableOpacity>
      </View>

      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={pathLength > 0 ? pathLength - 1 : 0}
        value={replayIndex}
        onValueChange={(v) => {
          setIsPlaying(false);
          setReplayIndex(Math.floor(v));
        }}
      />
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
});

export default RaceDetailScreen;