import { FOREIGN_LANDS_GEOJSON, PH_MARITIME_BORDER_GEOJSON } from './mapSources';
import { MAP_BOUNDARY_CONFIG, MAP_CONTRAST_CONFIG } from '../../config/mapStyleConfig';
import { PoiCategoryRule } from '../../config/poiConfig';

export interface PaintPropertyUpdate {
  layerId: string;
  property: string;
  value: any;
}

export interface MapSourceDefinition {
  id: string;
  spec: any;
}

export interface MapLayerDefinition {
  spec: any;
  beforeId?: string;
}

/**
 * Returns paint property updates to enhance road and building contrast at high zoom.
 */
export function getStylePaintEnhancements(): PaintPropertyUpdate[] {
  const { highwayMinor, highwayMajorInner, highwayMajorCasing, highwayMotorwayInner, building } =
    MAP_CONTRAST_CONFIG;

  return [
    { layerId: 'highway_minor', property: 'line-color', value: highwayMinor.lineColor },
    { layerId: 'highway_minor', property: 'line-opacity', value: highwayMinor.lineOpacity },
    { layerId: 'highway_major_inner', property: 'line-color', value: highwayMajorInner.lineColor },
    { layerId: 'highway_major_casing', property: 'line-color', value: highwayMajorCasing.lineColor },
    { layerId: 'highway_motorway_inner', property: 'line-color', value: highwayMotorwayInner.lineColor },
    { layerId: 'building', property: 'fill-color', value: building.fillColor },
    { layerId: 'building', property: 'fill-outline-color', value: building.fillOutlineColor },
  ];
}

/**
 * Returns custom GeoJSON and vector tile sources for the map engine.
 */
export function getCustomMapSources(): MapSourceDefinition[] {
  return [
    {
      id: 'openmaptiles',
      spec: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
    },
    {
      id: 'foreign-lands-mask',
      spec: {
        type: 'geojson',
        data: FOREIGN_LANDS_GEOJSON,
      },
    },
    {
      id: 'ph-border-line-source',
      spec: {
        type: 'geojson',
        data: PH_MARITIME_BORDER_GEOJSON,
      },
    },
    {
      id: 'route-source',
      spec: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      },
    },
  ];
}

/**
 * Returns custom MapLibre layers for foreign boundaries, maritime borders, routes, and POIs.
 * Follows the standard MapLibre Style Specification JSON format.
 */
export function getCustomMapLayers(
  poiConfig: Record<string, PoiCategoryRule>,
  spriteIcons: Record<string, string>
): MapLayerDefinition[] {
  const { foreignLandsFill, foreignLandsBorder, maritimeBorder, routeLine } = MAP_BOUNDARY_CONFIG;

  // Build category color match expression from poiConfig
  const categoryColorMatch: any[] = ['match', ['get', 'class']];
  Object.keys(poiConfig).forEach((key) => {
    if (key !== 'default') {
      categoryColorMatch.push(key);
      categoryColorMatch.push(poiConfig[key].color);
    }
  });
  categoryColorMatch.push(poiConfig.default ? poiConfig.default.color : '#94a3b8');

  // Build vector sprite icon and custom text icon match expressions
  const spriteIconMatch: any[] = ['match', ['get', 'class']];
  const customIconMatch: any[] = ['match', ['get', 'class']];
  let hasCustomTextIcons = false;

  Object.keys(poiConfig).forEach((key) => {
    if (key !== 'default') {
      const cfg = poiConfig[key];
      if (cfg.icon && cfg.icon !== '*') {
        customIconMatch.push(key);
        customIconMatch.push(cfg.icon);
        hasCustomTextIcons = true;
      } else {
        const sName = spriteIcons[key] || spriteIcons.default || 'dot_11';
        spriteIconMatch.push(key);
        spriteIconMatch.push(sName);
      }
    }
  });
  spriteIconMatch.push(spriteIcons.default || 'dot_11');
  customIconMatch.push('');

  const layers: MapLayerDefinition[] = [
    // Foreign lands blackout fill
    {
      spec: {
        id: 'foreign-lands-fill',
        type: 'fill',
        source: 'foreign-lands-mask',
        paint: {
          'fill-color': foreignLandsFill.color,
          'fill-opacity': foreignLandsFill.opacity,
        },
      },
    },
    // Foreign lands border line
    {
      spec: {
        id: 'foreign-lands-border',
        type: 'line',
        source: 'foreign-lands-mask',
        paint: {
          'line-color': foreignLandsBorder.color,
          'line-width': foreignLandsBorder.width,
          'line-opacity': foreignLandsBorder.opacity,
          'line-dasharray': foreignLandsBorder.dasharray,
        },
      },
    },
    // Philippine maritime boundary outline
    {
      spec: {
        id: 'ph-border-outline',
        type: 'line',
        source: 'ph-border-line-source',
        paint: {
          'line-color': maritimeBorder.color,
          'line-width': maritimeBorder.width,
          'line-opacity': maritimeBorder.opacity,
          'line-dasharray': maritimeBorder.dasharray,
        },
      },
    },
    // Motorcycle route polyline
    {
      spec: {
        id: 'route-layer',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': routeLine.color,
          'line-width': routeLine.width,
          'line-opacity': routeLine.opacity,
        },
      },
    },
    //OSM POI background circular badge
    {
      spec: {
        id: 'osm-poi-dots',
        type: 'circle',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 12,
        filter: ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 4,
            14, 6,
            16, 9,
          ],
          'circle-color': categoryColorMatch,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.85,
          'circle-opacity': 0.95,
        },
      },
      beforeId: 'foreign-lands-fill',
    },
    // OSM POI vector sprite icon
    {
      spec: {
        id: 'osm-poi-icons',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 12,
        filter: ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
        layout: {
          'icon-image': spriteIconMatch,
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0.45,
            14, 0.65,
            16, 0.85,
          ],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
        },
      },
      beforeId: 'foreign-lands-fill',
    },
  ];

  // Custom text / emoji icons if configured
  if (hasCustomTextIcons) {
    layers.push({
      spec: {
        id: 'osm-poi-custom-icons',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 12,
        filter: ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
        layout: {
          'text-field': customIconMatch,
          'text-size': 12,
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
      },
      beforeId: 'foreign-lands-fill',
    });
  }

  // OSM POI text labels
  layers.push({
    spec: {
      id: 'osm-poi-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 13,
      filter: ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name'], ''],
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 10,
          15, 12,
          17, 13,
        ],
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-optional': true,
        'text-max-width': 9,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': '#0c1017',
        'text-halo-width': 2.0,
      },
    },
    beforeId: 'foreign-lands-fill',
  });

  // Mountain Peaks
  layers.push({
    spec: {
      id: 'osm-mountain-peaks',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'mountain_peak',
      minzoom: 10,
      layout: {
        'text-field': ['concat', '▲ ', ['coalesce', ['get', 'name:en'], ['get', 'name']]],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-optional': true,
      },
      paint: {
        'text-color': '#38bdf8',
        'text-halo-color': '#0c1017',
        'text-halo-width': 2.0,
      },
    },
    beforeId: 'foreign-lands-fill',
  });

  return layers;
}
