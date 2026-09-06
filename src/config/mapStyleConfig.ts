export const MAP_STYLE_CONFIG = {
  // Rider current location pulsing marker.
  riderMarker: {
    size: 22,
    background: '#00d2ff',
    borderColor: '#ffffff',
    borderWidth: 3,
    glowShadow: '0 0 12px #00d2ff, 0 0 20px rgba(0, 210, 255, 0.6)',
    pulseBorderColor: 'rgba(0, 210, 255, 0.5)',
    pulseBorderWidth: 2,
    pulseDurationSeconds: 1.8,
  },

  // Custom POI map pin.
  poiPin: {
    width: 32,
    height: 32,
    defaultBackground: '#e11d48',
    selectedBackground: '#f59e0b',
    borderColor: '#ffffff',
    borderWidth: 2,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
    selectedGlowShadow: '0 0 16px #f59e0b',
    selectedScale: 1.25,
    iconFontSize: 13,
    iconEmoji: '🏍️',
  },

  // Restricted zone badge.
  restrictedBadge: {
    background: 'rgba(11, 15, 25, 0.94)',
    borderColor: 'rgba(239, 68, 68, 0.8)',
    borderWidth: 1.5,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.7)',
    backdropBlur: 8,
    titleColor: '#f87171',
    subtitleColor: '#94a3b8',
    title: 'MALAYSIA / BORNEO',
    subtitle: 'Outside MoTourista Territory — Inaccessible',
    coordinates: [116.8, 5.8] as [number, number],
  },
};

// High-zoom road and building contrast enhancement colors.
export const MAP_CONTRAST_CONFIG = {
  highwayMinor: {
    lineColor: '#262e3d',
    lineOpacity: 0.95,
  },
  highwayMajorInner: {
    lineColor: '#334155',
  },
  highwayMajorCasing: {
    lineColor: 'rgba(100, 116, 139, 0.6)',
  },
  highwayMotorwayInner: {
    lineColor: '#475569',
  },
  building: {
    fillColor: '#131926',
    fillOutlineColor: '#1e293b',
  },
};

// Map boundaries and blackout layer styling.
export const MAP_BOUNDARY_CONFIG = {
  foreignLandsFill: {
    color: '#04060a',
    opacity: 0.94,
  },
  foreignLandsBorder: {
    color: '#ef4444',
    width: 2.5,
    opacity: 0.85,
    dasharray: [3, 2],
  },
  maritimeBorder: {
    color: '#0284c7',
    width: 1.5,
    opacity: 0.6,
    dasharray: [4, 3],
  },
  routeLine: {
    color: '#00d2ff',
    width: 5,
    opacity: 0.95,
  },
};
