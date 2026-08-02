interface MapConfig {
  initialLat: number;
  initialLng: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    color: string;
    live: boolean;
    title: string;
  }>;
  userLat?: number;
  userLng?: number;
  pickMode?: boolean;
  dark?: boolean;
}

export function buildMapHtml(config: MapConfig): string {
  const markersJson = JSON.stringify(config.markers ?? []);
  const userLat = config.userLat ?? config.initialLat;
  const userLng = config.userLng ?? config.initialLng;
  const pickMode = config.pickMode ?? false;
  const dark = config.dark ?? true;
  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${dark ? '#131316' : '#e2e8f0'}; }
    .leaflet-container { background: ${dark ? '#131316' : '#e2e8f0'}; }
    .vibe-marker {
      width: 30px; height: 30px; border-radius: 50%;
      border: 3px solid ${dark ? '#1a1a1f' : 'white'}; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
    }
    .vibe-marker.live { animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.6), 0 2px 6px rgba(0,0,0,0.4); }
      70% { box-shadow: 0 0 0 14px rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.4); }
      100% { box-shadow: 0 0 0 0 rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.4); }
    }
    .user-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: #54a8f8; border: 3px solid ${dark ? '#1a1a1f' : 'white'};
      box-shadow: 0 2px 8px rgba(84,168,248,0.6);
    }
    .pick-marker {
      width: 28px; height: 36px;
      display: flex; align-items: flex-start; justify-content: center;
      filter: drop-shadow(0 3px 4px rgba(0,0,0,0.4));
    }
    .pick-pin-inner {
      width: 16px; height: 16px; border-radius: 50%;
      background: #54a8f8; border: 3px solid #f5f5f8; margin-top: 3px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${config.initialLat}, ${config.initialLng}], 14);
    L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);

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

    var pickMarker = null;
    var pickIcon = L.divIcon({
      className: '',
      html: '<div class="pick-marker"><div class="pick-pin-inner"></div></div>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    });

    ${pickMode ? `
    map.on('click', function(e) {
      if (pickMarker) { map.removeLayer(pickMarker); }
      pickMarker = L.marker(e.latlng, { icon: pickIcon }).addTo(map);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }));
    });
    ` : ''}

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
        if (msg.type === 'setPick' && pickMarker) {
          pickMarker.setLatLng([msg.lat, msg.lng]);
        }
        if (msg.type === 'placePick') {
          if (pickMarker) { map.removeLayer(pickMarker); }
          pickMarker = L.marker([msg.lat, msg.lng], { icon: pickIcon }).addTo(map);
          map.setView([msg.lat, msg.lng], 16);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>`;
}
