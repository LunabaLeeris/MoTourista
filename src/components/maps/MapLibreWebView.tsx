import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Coordinates } from '../../services/locationService';
import { ACTIVE_MAP_CONFIG, getMapStyleUrl, DEFAULT_MANILA_COORDINATES } from '../../config/mapConfig';
import { POI_CONFIG, OSM_DEFAULT_SPRITE_ICONS } from '../../config/poiConfig';
import { MAP_STYLE_CONFIG } from '../../config/mapStyleConfig';
import { getStylePaintEnhancements, getCustomMapSources, getCustomMapLayers } from '../../lib/maplibre/mapLayers';
import { MapMarker, MoTouristaMapRef, MoTouristaMapProps } from '../../types/map';
import { MAP_HTML } from '../../lib/maplibre/mapHtml';
import MapLoadingOverlay from './MapLoadingOverlay';

// Strongly typed actions dispatched from React Native to WebView via postMessage
type MapAction =
  | { type: 'INIT_MAP'; payload: any }
  | { type: 'FLY_TO'; payload: { center: [number, number]; zoom: number; speed?: number } }
  | { type: 'FIT_BOUNDS'; payload: { coordinates: [number, number][] } }
  | { type: 'DRAW_ROUTE'; payload: { coordinates: [number, number][] } }
  | { type: 'CLEAR_ROUTE' }
  | { type: 'SET_MARKERS'; payload: { markers: MapMarker[]; selectedId?: string } }
  | { type: 'SET_USER_LOCATION'; payload: { longitude: number; latitude: number } };

/**
 * MapLibreWebView component.
 * Renders MapLibre GL JS vector map engine inside a WebView.
 * Uses Tailwind CSS utility classes for styling.
 */
const MapLibreWebView = forwardRef<MoTouristaMapRef, MoTouristaMapProps>(
  (
    {
      markers = [],
      userLocation,
      selectedMarkerId,
      onMarkerPress,
      onMapPress,
      onMapReady,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial center coordinates
    const initialLat = userLocation?.latitude || DEFAULT_MANILA_COORDINATES.latitude;
    const initialLng = userLocation?.longitude || DEFAULT_MANILA_COORDINATES.longitude;
    const styleUrl = getMapStyleUrl(ACTIVE_MAP_CONFIG);

    // Post structured JSON action to MapLibre GL JS inside the WebView
    const sendAction = useCallback((action: MapAction) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(action));
      }
    }, []);

    // Send initialization configuration to WebView runtime
    const initializeMapInWebView = useCallback(() => {
      sendAction({
        type: 'INIT_MAP',
        payload: {
          styleUrl,
          initialCenter: [initialLng, initialLat],
          bounds: ACTIVE_MAP_CONFIG.bounds,
          minZoom: ACTIVE_MAP_CONFIG.zoom.min,
          maxZoom: ACTIVE_MAP_CONFIG.zoom.max,
          defaultZoom: ACTIVE_MAP_CONFIG.zoom.default,
          paintUpdates: getStylePaintEnhancements(),
          sources: getCustomMapSources(),
          layers: getCustomMapLayers(POI_CONFIG, OSM_DEFAULT_SPRITE_ICONS),
          restrictedBadge: MAP_STYLE_CONFIG.restrictedBadge,
          poiPin: MAP_STYLE_CONFIG.poiPin,
          poiCategoryMap: POI_CONFIG,
        },
      });
    }, [styleUrl, initialLng, initialLat, sendAction]);

    // Expose imperative map controls to parent components
    useImperativeHandle(ref, () => ({
      flyTo: (coords: Coordinates, zoom = 14) => {
        sendAction({
          type: 'FLY_TO',
          payload: { center: [coords.longitude, coords.latitude], zoom, speed: 1.2 },
        });
      },
      recenter: () => {
        const target = userLocation || DEFAULT_MANILA_COORDINATES;
        const zoom = userLocation ? 14 : 12;
        sendAction({
          type: 'FLY_TO',
          payload: { center: [target.longitude, target.latitude], zoom, speed: 1.2 },
        });
      },
      fitBounds: (coordinates: Coordinates[]) => {
        if (!coordinates || coordinates.length === 0) return;
        sendAction({
          type: 'FIT_BOUNDS',
          payload: { coordinates: coordinates.map((c) => [c.longitude, c.latitude]) },
        });
      },
      drawRoute: (coordinates: Coordinates[]) => {
        sendAction({
          type: 'DRAW_ROUTE',
          payload: { coordinates: coordinates.map((c) => [c.longitude, c.latitude]) },
        });
      },
      clearRoute: () => {
        sendAction({ type: 'CLEAR_ROUTE' });
      },
    }));

    // Send updated markers to MapLibre when markers change
    useEffect(() => {
      if (isLoaded) {
        sendAction({
          type: 'SET_MARKERS',
          payload: { markers, selectedId: selectedMarkerId || undefined },
        });
      }
    }, [markers, selectedMarkerId, isLoaded, sendAction]);

    // Send updated user location to MapLibre when location updates
    useEffect(() => {
      if (isLoaded && userLocation) {
        sendAction({
          type: 'SET_USER_LOCATION',
          payload: { longitude: userLocation.longitude, latitude: userLocation.latitude },
        });
      }
    }, [userLocation, isLoaded, sendAction]);

    // Handle messages coming from MapLibre GL JS inside the WebView
    const handleMessage = (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        switch (message.type) {
          case 'WEBVIEW_MOUNTED':
            initializeMapInWebView();
            break;
          case 'MAP_LOADED':
            setIsLoaded(true);
            if (onMapReady) onMapReady();
            break;
          case 'MARKER_CLICK':
            if (onMarkerPress && message.payload) {
              onMarkerPress(message.payload);
            }
            break;
          case 'MAP_CLICK':
            if (onMapPress) {
              onMapPress();
            }
            break;
          case 'MAP_DEBUG':
            {
              const prefix = `[MAP_DEBUG][${message.level || 'LOG'}]`;
              if (message.level === 'ERROR') {
                console.error(prefix, message.message);
              } else if (message.level === 'WARN') {
                console.warn(prefix, message.message);
              } else {
                console.log(prefix, message.message);
              }
            }
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebView message:', err);
      }
    };

    return (
      <View className="flex-1 bg-[#0c1017]" style={style}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML }}
          className="flex-1 bg-[#0c1017]"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          onMessage={handleMessage}
          onLoadEnd={() => initializeMapInWebView()}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        />

        {!isLoaded && <MapLoadingOverlay />}
      </View>
    );
  }
);

export default MapLibreWebView;
