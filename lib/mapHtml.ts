interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  live: boolean;
  title: string;
  avatarUrl: string | null;
  business: boolean;
  eventCount: number;
}

interface MapConfig {
  initialLat: number;
  initialLng: number;
  markers?: MapMarker[];
  userLat?: number;
  userLng?: number;
  pickMode?: boolean;
  dark?: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function markerHtml(m: MapMarker, dark: boolean): string {
  const borderColor = m.business ? '#fbbf24' : (dark ? '#1a1a1f' : 'white');
  const borderClass = m.business ? ' vibe-marker-business' : '';
  const liveClass = m.live ? ' live' : '';
  const ringClass = m.live ? ' vibe-ring-live' : '';

  let inner: string;
  if (m.avatarUrl) {
    inner = `<img src="${escapeHtml(m.avatarUrl)}" class="vibe-marker-img" />`;
  } else {
    const initial = m.title.charAt(0).toUpperCase() || '?';
    inner = `<span class="vibe-marker-initial">${escapeHtml(initial)}</span>`;
  }

  const countBadge =
    m.eventCount > 1
      ? `<span class="vibe-marker-count">${m.eventCount}</span>`
      : '';

  const previewText = escapeHtml(m.title.length > 18 ? m.title.substring(0, 18) + '…' : m.title);
  const preview = `<span class="vibe-marker-preview">${previewText}</span>`;

  return `<div class="vibe-marker-wrap">
    <div class="vibe-marker${liveClass}${borderClass}" style="background:${m.color};border-color:${borderColor}">
      ${inner}
    </div>
    ${countBadge}
    <div class="vibe-marker-label${ringClass}">${preview}</div>
  </div>`;
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
  const bgColor = dark ? '#131316' : '#e2e8f0';
  const labelBg = dark ? 'rgba(20,20,26,0.92)' : 'rgba(255,255,255,0.92)';
  const labelText = dark ? '#e8e8ee' : '#1a1a1f';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${bgColor}; }
    .leaflet-container { background: ${bgColor}; }
    .vibe-marker-wrap {
      display: flex; flex-direction: column; align-items: center;
      cursor: pointer; position: relative;
    }
    .vibe-marker {
      width: 34px; height: 34px; border-radius: 50%;
      border: 3px solid ${dark ? '#1a1a1f' : 'white'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; position: relative; z-index: 2;
      transition: transform 0.15s;
    }
    .vibe-marker:hover { transform: scale(1.1); }
    .vibe-marker-business {
      border-width: 3px;
      box-shadow: 0 0 0 1px #fbbf24, 0 2px 8px rgba(251,191,36,0.4);
    }
    .vibe-marker.live { animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.6), 0 2px 6px rgba(0,0,0,0.4); }
      70% { box-shadow: 0 0 0 12px rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.4); }
      100% { box-shadow: 0 0 0 0 rgba(244,63,94,0), 0 2px 6px rgba(0,0,0,0.4); }
    }
    .vibe-marker-business.live {
      animation: pulseBusiness 2s infinite;
    }
    @keyframes pulseBusiness {
      0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.6), 0 0 0 1px #fbbf24, 0 2px 8px rgba(251,191,36,0.4); }
      70% { box-shadow: 0 0 0 12px rgba(251,191,36,0), 0 0 0 1px #fbbf24, 0 2px 8px rgba(251,191,36,0.4); }
      100% { box-shadow: 0 0 0 0 rgba(251,191,36,0), 0 0 0 1px #fbbf24, 0 2px 8px rgba(251,191,36,0.4); }
    }
    .vibe-marker-img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
    }
    .vibe-marker-initial {
      color: white; font-size: 14px; font-weight: 700; font-family: -apple-system, sans-serif;
    }
    .vibe-marker-count {
      position: absolute; top: -4px; right: -4px;
      background: #f43f5e; color: white; font-size: 10px; font-weight: 700;
      min-width: 18px; height: 18px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 4px; z-index: 3;
      border: 2px solid ${dark ? '#131316' : 'white'};
      font-family: -apple-system, sans-serif;
    }
    .vibe-marker-label {
      margin-top: 3px;
      background: ${labelBg};
      color: ${labelText};
      font-size: 10px; font-weight: 600; font-family: -apple-system, sans-serif;
      padding: 2px 7px; border-radius: 8px;
      white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;
      backdrop-filter: blur(8px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      z-index: 1;
    }
    .vibe-ring-live .vibe-marker-label {
      border: 1px solid rgba(244,63,94,0.4);
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

    var darkMode = ${dark};
    var markers = ${markersJson};
    var eventMarkers = {};

    function buildIcon(m) {
      var bg = m.color;
      var border = m.business ? '#fbbf24' : (darkMode ? '#1a1a1f' : 'white');
      var liveClass = m.live ? ' live' : '';
      var bizClass = m.business ? ' vibe-marker-business' : '';
      var inner = '';
      if (m.avatarUrl) {
        inner = '<img src="' + m.avatarUrl.replace(/"/g, '&quot;') + '" class="vibe-marker-img" />';
      } else {
        var ch = (m.title.charAt(0) || '?').toUpperCase();
        inner = '<span class="vibe-marker-initial">' + ch + '</span>';
      }
      var countBadge = m.eventCount > 1 ? '<span class="vibe-marker-count">' + m.eventCount + '</span>' : '';
      var previewText = m.title.length > 18 ? m.title.substring(0,18) + '…' : m.title;
      var preview = '<span class="vibe-marker-label' + (m.live ? ' vibe-ring-live' : '') + '">' + previewText.replace(/</g,'&lt;') + '</span>';
      var html = '<div class="vibe-marker-wrap"><div class="vibe-marker' + liveClass + bizClass + '" style="background:' + bg + ';border-color:' + border + '">' + inner + '</div>' + countBadge + preview + '</div>';
      return L.divIcon({ className: '', html: html, iconSize: [44, 52], iconAnchor: [22, 26] });
    }

    markers.forEach(function(m) {
      var icon = buildIcon(m);
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
            var icon = buildIcon(m);
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
