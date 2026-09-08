import { MAP_STYLE_CONFIG } from '../../config/mapStyleConfig';

// [RECHECK] ugly css trick
/**
 * Generate CSS stylesheet for HTML markers and badges from declarative style tokens.
 * Follows ASD-STE100 guidelines for clear, unambiguous comments.
 */
export function generateMapCss(config = MAP_STYLE_CONFIG): string {
  const { riderMarker, poiPin, restrictedBadge } = config;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #0c1017; overflow: hidden; }

    /* Rider user location marker */
    .rider-marker {
      width: ${riderMarker.size}px;
      height: ${riderMarker.size}px;
      border-radius: 50%;
      background: ${riderMarker.background};
      border: ${riderMarker.borderWidth}px solid ${riderMarker.borderColor};
      box-shadow: ${riderMarker.glowShadow};
      position: relative;
    }
    .rider-marker::after {
      content: '';
      position: absolute;
      top: -6px; left: -6px; right: -6px; bottom: -6px;
      border-radius: 50%;
      border: ${riderMarker.pulseBorderWidth}px solid ${riderMarker.pulseBorderColor};
      animation: rider-pulse ${riderMarker.pulseDurationSeconds}s infinite;
    }
    @keyframes rider-pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    /* POI custom pin */
    .poi-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${poiPin.width}px;
      height: ${poiPin.height}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: ${poiPin.defaultBackground};
      border: ${poiPin.borderWidth}px solid ${poiPin.borderColor};
      box-shadow: ${poiPin.boxShadow};
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .poi-pin.selected {
      background: ${poiPin.selectedBackground};
      transform: rotate(-45deg) scale(${poiPin.selectedScale});
      box-shadow: ${poiPin.selectedGlowShadow};
      z-index: 999;
    }
    .poi-pin-inner {
      transform: rotate(45deg);
      color: #ffffff;
      font-family: sans-serif;
      font-size: ${poiPin.iconFontSize}px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Restricted zone indicator badge */
    .restricted-badge {
      background: ${restrictedBadge.background};
      border: ${restrictedBadge.borderWidth}px solid ${restrictedBadge.borderColor};
      box-shadow: ${restrictedBadge.boxShadow};
      padding: 8px 14px;
      border-radius: ${restrictedBadge.borderRadius}px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      pointer-events: none;
      backdrop-filter: blur(${restrictedBadge.backdropBlur}px);
      -webkit-backdrop-filter: blur(${restrictedBadge.backdropBlur}px);
    }
    .restricted-badge-title {
      font-size: 11px;
      font-weight: 800;
      color: ${restrictedBadge.titleColor};
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .restricted-badge-sub {
      font-size: 10px;
      color: ${restrictedBadge.subtitleColor};
      margin-top: 2px;
      font-weight: 500;
    }
  `;
}
