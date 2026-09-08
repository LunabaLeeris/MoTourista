export interface PoiCategoryRule {
  // Hex color for the landmark icon and text (e.g. '#ef4444').
  color: string;
  // Specific icon character or '*' to use the default OpenStreetMap vector icon.
  icon: string;
  // Minimum map zoom level when this landmark category becomes visible.
  minZoom: number;
}

/**
 * Default OpenStreetMap sprite icon names from OpenFreeMap sprite sheet.
 * Used when a category specifies icon: '*'.
 */
export const OSM_DEFAULT_SPRITE_ICONS: Record<string, string> = {
  fuel: 'fuel',
  car_repair: 'car',
  mechanic: 'car',
  restaurant: 'restaurant',
  fast_food: 'fast_food',
  cafe: 'cafe',
  bar: 'bar',
  viewpoint: 'attraction',
  attraction: 'attraction',
  camp_site: 'campsite',
  campsite: 'campsite',
  park: 'park',
  mountain_peak: 'mountain',
  hospital: 'hospital',
  clinic: 'hospital',
  pharmacy: 'pharmacy',
  police: 'police',
  hotel: 'lodging',
  motel: 'lodging',
  hostel: 'lodging',
  convenience: 'grocery',
  supermarket: 'grocery',
  bank: 'bank',
  atm: 'bank',
  default: 'dot_11',
};

/**
 * POI Style Configuration.
 * Easily customize the icon and color for each landmark category.
 * If icon is '*', the map uses the default OpenStreetMap vector icon.
 */
export const POI_CONFIG: Record<string, PoiCategoryRule> = {
  // Motorcycle & Automotive
  fuel: { color: '#ef4444', icon: '*', minZoom: 12 },
  car_repair: { color: '#06b6d4', icon: '*', minZoom: 13 },
  mechanic: { color: '#06b6d4', icon: '*', minZoom: 13 },

  // Food, Dining & Paresan
  restaurant: { color: '#f97316', icon: '*', minZoom: 13 },
  fast_food: { color: '#f97316', icon: '*', minZoom: 13 },
  cafe: { color: '#f59e0b', icon: '*', minZoom: 13 },
  bar: { color: '#f59e0b', icon: '*', minZoom: 14 },

  // Scenic, Peaks & Tourism
  viewpoint: { color: '#10b981', icon: '*', minZoom: 11 },
  attraction: { color: '#10b981', icon: '*', minZoom: 12 },
  camp_site: { color: '#14b8a6', icon: '*', minZoom: 12 },
  campsite: { color: '#14b8a6', icon: '*', minZoom: 12 },
  park: { color: '#10b981', icon: '*', minZoom: 12 },
  mountain_peak: { color: '#38bdf8', icon: '*', minZoom: 10 },

  // Emergency & Healthcare
  hospital: { color: '#ec4899', icon: '*', minZoom: 12 },
  clinic: { color: '#ec4899', icon: '*', minZoom: 13 },
  pharmacy: { color: '#ec4899', icon: '*', minZoom: 13 },
  police: { color: '#3b82f6', icon: '*', minZoom: 13 },

  // Lodging & Accommodations
  hotel: { color: '#8b5cf6', icon: '*', minZoom: 14 },
  motel: { color: '#8b5cf6', icon: '*', minZoom: 14 },
  hostel: { color: '#8b5cf6', icon: '*', minZoom: 14 },

  // Commercial & Daily Services
  convenience: { color: '#64748b', icon: '*', minZoom: 14 },
  supermarket: { color: '#64748b', icon: '*', minZoom: 14 },
  bank: { color: '#64748b', icon: '*', minZoom: 14 },
  atm: { color: '#64748b', icon: '*', minZoom: 14 },

  // Default fallback for any unlisted OpenStreetMap landmark
  default: { color: '#94a3b8', icon: '*', minZoom: 13 },
};

