/**
 * Foreign land blackout polygon masks.
 * Prevents non-Philippine regions from rendering clearly.
 */
export const FOREIGN_LANDS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    // Sabah / Borneo (Malaysia). Stays west of longitude 119.2.
    {
      type: 'Feature',
      properties: { name: 'Malaysia' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [108.0, 0.0],
            [119.2, 0.0],
            [119.2, 4.2],
            [118.0, 5.2],
            [116.5, 6.8],
            [115.2, 6.2],
            [108.0, 4.0],
            [108.0, 0.0],
          ],
        ],
      },
    },
    // Northern Indonesia (Sulawesi / Sangihe). Stays south of latitude 3.8.
    {
      type: 'Feature',
      properties: { name: 'Indonesia' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [118.0, -1.0],
            [129.0, -1.0],
            [129.0, 3.8],
            [118.0, 3.8],
            [118.0, -1.0],
          ],
        ],
      },
    },
    // Taiwan (North). Stays north of latitude 21.8.
    {
      type: 'Feature',
      properties: { name: 'Taiwan' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [119.5, 21.8],
            [122.5, 21.8],
            [122.5, 26.0],
            [119.5, 26.0],
            [119.5, 21.8],
          ],
        ],
      },
    },
  ],
};

/**
 * Philippine maritime boundary line string coordinates.
 */
export const PH_MARITIME_BORDER_GEOJSON = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [119.5, 21.6],
      [122.8, 21.6],
      [126.8, 19.8],
      [127.8, 14.2],
      [127.8, 5.0],
      [125.8, 4.2],
      [119.2, 4.2],
      [116.5, 6.8],
      [115.8, 11.2],
      [117.8, 16.0],
      [119.5, 21.6],
    ],
  },
};
