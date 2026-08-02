interface MapConfig {
  initialLat: number;
  initialLng: number;
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    color: string;
    live: boolean;
    title: string;
  }>;
  userLat?: number;
  userLng?: number;
}

export function buildMapHtml(config: MapConfig): string {
  const markersJson = JSON.stringify(config.markers);
  const userLat = config.userLat ?? config.initialLat;
  const userLng = config.userLng ?? config.initialLng;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #e2e8f0; }
    .vibe-marker {
      width: 30px; height: 30px; border-radius: 50%;
      border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .vibe-marker.live { animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.5), 0 2px 6px rgba(0,0,0,0.3); }
      70% { box-shadow: 0 0 0 12px rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.3); }
      100% { box-shadow: 0 0 0 0 rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.3); }
    }
    .user-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: #1585e8; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(21,133,232,0.5);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${config.initialLat}, ${config.initialLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var userIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16,16], iconAnchor: [8,8] });
    var userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);

    var markers = ${markersJson};
    var eventMarkers = {};
    markers.forEach(function(m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="vibe-marker' + (m.live ? ' live' : '') + '" style="background:' + m.color + '"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      var em = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
      em.on('click', function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: m.id }));
      });
      eventMarkers[m.id] = em;
    });

    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'center') {
          map.setView([msg.lat, msg.lng], msg.zoom || 14);
        }
        if (msg.type === 'updateMarkers') {
          Object.keys(eventMarkers).forEach(function(k) { map.removeLayer(eventMarkers[k]); });
          eventMarkers = {};
          msg.markers.forEach(function(m) {
            var icon = L.divIcon({
              className: '',
              html: '<div class="vibe-marker' + (m.live ? ' live' : '') + '" style="background:' + m.color + '"></div>',
              iconSize: [30,30], iconAnchor: [15,15]
            });
            var em = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
            em.on('click', function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: m.id }));
            });
            eventMarkers[m.id] = em;
          });
        }
        if (msg.type === 'setUser') {
          userMarker.setLatLng([msg.lat, msg.lng]);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>`;
}
