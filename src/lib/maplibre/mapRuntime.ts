// WebView client runtime for the MapLibre GL JS engine.
// Exported as a JavaScript string literal.
// Hermes (React Native JS engine) compiles functions to bytecode,
// so Function.prototype.toString() returns "[bytecode]" — not valid JS.
// This module builds the runtime as a plain string to avoid that limitation.

/**
 * Returns the full MapLibre WebView client runtime as executable JavaScript.
 * The returned string is placed inside an inline &lt;script&gt; tag.
 */
export function getMapRuntimeScript(): string {
  return `
(function () {
  var win = window;

  // Forward WebView console output to React Native Metro
  (function setupConsoleBridge() {
    var origLog = console.log;
    var origWarn = console.warn;
    var origError = console.error;

    function bridge(level, args) {
      try {
        if (win.ReactNativeWebView) {
          win.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'MAP_DEBUG',
              level: level,
              message: Array.from(args)
                .map(function (a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); })
                .join(' ')
            })
          );
        }
      } catch (_) {}
    }

    console.log = function () {
      bridge('LOG', arguments);
      origLog.apply(console, arguments);
    };
    console.warn = function () {
      bridge('WARN', arguments);
      origWarn.apply(console, arguments);
    };
    console.error = function () {
      bridge('ERROR', arguments);
      origError.apply(console, arguments);
    };

    window.onerror = function (msg, url, lineNo) {
      bridge('ERROR', ['[UNCAUGHT_ERROR]', msg, url ? url + ':' + lineNo : '']);
      return false;
    };
  })();

  // Map engine runtime state
  win.mapInstance = null;
  var currentMarkers = [];
  var userMarkerInstance = null;
  var categoryColorMap = {};
  var defaultPinBackground = '#e11d48';
  var pinEmoji = 'm';

  // Render a transparent fallback for missing style images in vector tiles
  function registerMissingImageFallback(map) {
    map.on('styleimagemissing', function (e) {
      var id = e.id;
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'rgba(24, 32, 24, 0.3)';
      ctx.fillRect(0, 0, 1, 1);
      var imgData = ctx.getImageData(0, 0, 1, 1);
      try {
        map.addImage(id, { width: 1, height: 1, data: imgData.data });
      } catch (_) {}
    });
  }

  // Update or create rider user location marker
  win.updateUserLocationMarker = function (lng, lat) {
    if (userMarkerInstance) {
      userMarkerInstance.setLngLat([lng, lat]);
    } else if (win.mapInstance) {
      var el = document.createElement('div');
      el.className = 'rider-marker';
      userMarkerInstance = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(win.mapInstance);
    }
  };

  // Render custom POI markers
  win.updateMapMarkers = function (markers, selectedId) {
    currentMarkers.forEach(function (m) { m.remove(); });
    currentMarkers = [];
    if (!win.mapInstance) return;

    markers.forEach(function (poi) {
      var el = document.createElement('div');
      el.className = 'poi-pin' + (poi.id === selectedId ? ' selected' : '');

      var rawTag = (poi.tagName || '').toLowerCase().trim().replace(/\\s+/g, '_');
      var matchedRule = categoryColorMap[rawTag];
      if (!matchedRule) {
        var foundKey = Object.keys(categoryColorMap).find(function (k) {
          return rawTag.includes(k) || k.includes(rawTag);
        });
        if (foundKey) matchedRule = categoryColorMap[foundKey];
      }

      el.style.background = matchedRule ? matchedRule.color : defaultPinBackground;

      var inner = document.createElement('div');
      inner.className = 'poi-pin-inner';
      inner.innerText = pinEmoji;
      el.appendChild(inner);

      el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (win.ReactNativeWebView) {
          win.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'MARKER_CLICK', payload: poi })
          );
        }
      });

      var marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .addTo(win.mapInstance);

      currentMarkers.push(marker);
    });
  };

  // Render polyline coordinates for motorcycle route
  win.renderRouteLine = function (coordinates) {
    if (!win.mapInstance || !win.mapInstance.getSource('route-source')) return;
    win.mapInstance.getSource('route-source').setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coordinates }
    });

    if (coordinates.length > 1) {
      var bounds = coordinates.reduce(
        function (b, coord) { return b.extend(coord); },
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      win.mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  };

  // Remove polyline coordinates from route layer
  win.clearRouteLine = function () {
    if (!win.mapInstance || !win.mapInstance.getSource('route-source')) return;
    win.mapInstance.getSource('route-source').setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] }
    });
  };

  // Adjust camera to fit bounding box around coordinates
  win.fitToCoordinates = function (coords) {
    if (!win.mapInstance || !coords || coords.length === 0) return;
    var bounds = coords.reduce(
      function (b, coord) { return b.extend(coord); },
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    win.mapInstance.fitBounds(bounds, { padding: 50 });
  };

  // Initialize MapLibre GL JS engine from configuration payload
  function initializeMap(payload) {
    if (win.mapInstance) return;

    // Wait until maplibregl CDN script has finished loading
    if (typeof maplibregl === 'undefined' || !maplibregl.Map) {
      console.log('[MAP_DEBUG] Waiting for maplibregl CDN script to load...');
      setTimeout(function () { initializeMap(payload); }, 100);
      return;
    }

    try {
      categoryColorMap = payload.poiCategoryMap || {};
      defaultPinBackground = payload.defaultPinColor || '#e11d48';
      pinEmoji = payload.pinEmoji || (payload.poiPin && payload.poiPin.iconEmoji) || '\\u{1F3CD}\\u{FE0F}';

      var boundsData = payload.bounds;
      var mapBounds = [
        [boundsData.southWest[0], boundsData.southWest[1]],
        [boundsData.northEast[0], boundsData.northEast[1]]
      ];

      win.mapInstance = new maplibregl.Map({
        container: 'map',
        style: payload.styleUrl,
        center: [payload.initialCenter[0], payload.initialCenter[1]],
        zoom: payload.defaultZoom || 12.0,
        minZoom: payload.minZoom || 5.0,
        maxZoom: payload.maxZoom || 17.0,
        maxBounds: mapBounds,
        attributionControl: false
      });

      registerMissingImageFallback(win.mapInstance);

      win.mapInstance.on('error', function (e) {
        console.error(
          '[MAP_DEBUG] Map error:',
          e.error ? e.error.message : e.message || 'unknown error'
        );
      });

      win.mapInstance.on('click', function (e) {
        if (win.ReactNativeWebView) {
          win.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'MAP_CLICK',
              payload: { lng: e.lngLat.lng, lat: e.lngLat.lat }
            })
          );
        }
      });

      win.mapInstance.on('load', function () {
        console.log('[MAP_DEBUG] Map style loaded');

        // Apply road and building paint property enhancements
        var paintUpdates = payload.paintUpdates || [];
        paintUpdates.forEach(function (u) {
          if (win.mapInstance.getLayer(u.layerId)) {
            win.mapInstance.setPaintProperty(u.layerId, u.property, u.value);
          }
        });

        // Register vector and GeoJSON data sources
        var sources = payload.sources || [];
        sources.forEach(function (s) {
          if (!win.mapInstance.getSource(s.id)) {
            win.mapInstance.addSource(s.id, s.spec);
          }
        });

        // Register MapLibre vector layers
        var layers = payload.layers || [];
        layers.forEach(function (l) {
          if (!win.mapInstance.getLayer(l.spec.id)) {
            win.mapInstance.addLayer(l.spec, l.beforeId);
          }
        });

        // Add restricted zone badge marker
        if (payload.restrictedBadge) {
          var rb = payload.restrictedBadge;
          var badgeEl = document.createElement('div');
          badgeEl.className = 'restricted-badge';
          badgeEl.innerHTML =
            '<div class="restricted-badge-title">' +
            rb.title +
            '</div><div class="restricted-badge-sub">' +
            rb.subtitle +
            '</div>';
          new maplibregl.Marker({ element: badgeEl })
            .setLngLat([rb.coordinates[0], rb.coordinates[1]])
            .addTo(win.mapInstance);
        }

        // Attach POI interaction listeners
        var poiLayerNames = ['osm-poi-dots', 'osm-poi-icons', 'osm-poi-labels', 'osm-mountain-peaks'];
        if (win.mapInstance.getLayer('osm-poi-custom-icons')) {
          poiLayerNames.push('osm-poi-custom-icons');
        }

        var handlePoiClick = function (e) {
          if (!e.features || e.features.length === 0) return;
          var f = e.features[0];
          var p = f.properties;
          var coords = f.geometry.coordinates;

          if (win.ReactNativeWebView) {
            win.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'MARKER_CLICK',
                payload: {
                  id: 'osm_' + (p.osm_id || Math.random().toString(36).substring(2, 8)),
                  title: p.name || (p.class ? p.class.replace('_', ' ').toUpperCase() : 'Landmark'),
                  latitude: coords[1],
                  longitude: coords[0],
                  tagName: p.class ? p.class.replace('_', ' ') : 'Landmark',
                  address: p.subclass ? p.subclass.replace('_', ' ') : undefined,
                  isApproved: true
                }
              })
            );
          }
        };

        poiLayerNames.forEach(function (layerId) {
          win.mapInstance.on('click', layerId, handlePoiClick);
          win.mapInstance.on('mouseenter', layerId, function () {
            win.mapInstance.getCanvas().style.cursor = 'pointer';
          });
          win.mapInstance.on('mouseleave', layerId, function () {
            win.mapInstance.getCanvas().style.cursor = '';
          });
        });

        // Notify React Native that Map is ready
        if (win.ReactNativeWebView) {
          win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_LOADED' }));
        }
      });
    } catch (err) {
      console.error('[MAP_DEBUG] initializeMap error:', err ? err.message : err);
    }
  }

  // Native message dispatcher
  function handleNativeMessage(event) {
    try {
      var action = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (!action || !action.type) return;

      switch (action.type) {
        case 'INIT_MAP':
          initializeMap(action.payload);
          break;
        case 'FLY_TO':
          if (win.mapInstance && action.payload) {
            win.mapInstance.flyTo(action.payload);
          }
          break;
        case 'FIT_BOUNDS':
          if (action.payload && action.payload.coordinates) {
            win.fitToCoordinates(action.payload.coordinates);
          }
          break;
        case 'DRAW_ROUTE':
          if (action.payload && action.payload.coordinates) {
            win.renderRouteLine(action.payload.coordinates);
          }
          break;
        case 'CLEAR_ROUTE':
          win.clearRouteLine();
          break;
        case 'SET_MARKERS':
          if (action.payload && action.payload.markers) {
            win.updateMapMarkers(action.payload.markers, action.payload.selectedId);
          }
          break;
        case 'SET_USER_LOCATION':
          if (action.payload) {
            win.updateUserLocationMarker(action.payload.longitude, action.payload.latitude);
          }
          break;
        default:
          console.log('[MAP_DEBUG] Unhandled action type:', action.type);
      }
    } catch (err) {
      console.error('[MAP_DEBUG] Native message handling error:', err);
    }
  }

  window.addEventListener('message', handleNativeMessage);
  document.addEventListener('message', handleNativeMessage);

  // Signal React Native that the WebView runtime has mounted
  function signalMounted(attempts) {
    attempts = attempts || 0;
    if (win.ReactNativeWebView) {
      win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEBVIEW_MOUNTED' }));
    } else if (attempts < 50) {
      setTimeout(function () { signalMounted(attempts + 1); }, 100);
    }
  }
  signalMounted(0);
})();
`;
}
