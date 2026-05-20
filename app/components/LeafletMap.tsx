import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from 'react-native-webview';

const LeafletMap = ({ webviewRef }: { webviewRef: React.Ref<WebView> | null }) => {

  // 🌍 MAP
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
        body { margin: 0; }
        #map { height: 100vh; }
        .gps-arrow { transform-origin: center center;}
        </style>
    </head>
    <body>
        <div id="map"></div>

        <script>
        var map = L.map('map').setView([48.39, -4.48], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var polyline = L.polyline([], { color: '#4266f5', weight: 5 }).addTo(map);
        var marker = null;

        function handleMessage(event) {
            var data = JSON.parse(event.data);
            var point = [data.lat, data.lng];

            // marker
            if (!marker) {
            marker = L.marker(point, {
                icon: L.divIcon({
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                html:
                    '<svg class="gps-arrow" width="40" height="40" viewBox="0 0 32 32">' +
                    '<path d="M16 2 L28 28 L16 22 L4 28 Z" fill="#4266f5" stroke="white" stroke-width="2"/>' +
                    '</svg>'
                })
            }).addTo(map);
            } else {
            marker.setLatLng(point);
            }

            var el = marker.getElement();

            if (el) {
            var arrow = el.querySelector('.gps-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(' + (data.bearing || 0) + 'deg)';
            }
            }

            // path
            if (data.path) {
            var latlngs = data.path.map(p => [p.latitude, p.longitude]);
            polyline.setLatLngs(latlngs);
            }

            if (data.follow) {
            map.setView(point, 17);
            }
        }

        document.addEventListener("message", handleMessage);
        window.addEventListener("message", handleMessage);
        </script>
    </body>
    </html>
    `;

  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: leafletHtml }}
        style={styles.map}
      />
    </View>
  )
};

const styles = StyleSheet.create({
  mapContainer: { height: 350 },
  map: { flex: 1 },
});

export default LeafletMap;