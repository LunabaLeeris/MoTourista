// Coordinate representation for geographic positions.
export interface Coordinates {
    latitude: number;
    longitude: number;
}

// Complete rider location result with geographic coordinates and text address.
export interface LocationResult {
    latitude: number;
    longitude: number;
    readableLocation: string;
}

// Structure of OpenStreetMap reverse geocoding API response.
export interface NominatimAddress {
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    country?: string;
}

export interface NominatimResponse {
    address?: NominatimAddress;
    display_name?: string;
}