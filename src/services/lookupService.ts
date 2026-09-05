import { supabase } from '../lib/supabase';
import { DriverTypeRow, VehicleTypeRow, MotorcycleModelRow, TagRow } from '../types/database';

export interface LookupOptions {
  driverTypes: DriverTypeRow[];
  vehicleTypes: VehicleTypeRow[];
  motorcycleModels: MotorcycleModelRow[];
}

// In-memory session cache for lookup tables to prevent redundant queries across the app.
let cachedLookupOptions: LookupOptions | null = null;
let cachedTags: TagRow[] | null = null;

/**
 * Fetches driver types, vehicle types, and motorcycle models from Supabase in parallel.
 * Caches results in-memory so subsequent calls across any screen return immediately.
 */
export async function getLookupOptions(forceRefresh = false): Promise<LookupOptions> {
  if (cachedLookupOptions && !forceRefresh) {
    return cachedLookupOptions;
  }

  const [dRes, vRes, mRes] = await Promise.all([
    supabase
      .from('driver_types')
      .select('*')
      .order('display_order', { ascending: true }),
    supabase
      .from('vehicle_types')
      .select('*')
      .order('display_order', { ascending: true }),
    supabase
      .from('motorcycle_models')
      .select('*')
      .order('display_order', { ascending: true }),
  ]);

  if (dRes.error) {
    console.error('Error fetching driver types:', dRes.error);
  }
  if (vRes.error) {
    console.error('Error fetching vehicle types:', vRes.error);
  }
  if (mRes.error) {
    console.error('Error fetching motorcycle models:', mRes.error);
  }

  const options: LookupOptions = {
    driverTypes: dRes.data || [],
    vehicleTypes: vRes.data || [],
    motorcycleModels: mRes.data || [],
  };

  // Cache in-memory if at least driver types or vehicle types were fetched
  if (options.driverTypes.length > 0 || options.vehicleTypes.length > 0) {
    cachedLookupOptions = options;
  }

  return options;
}

/**
 * Fetches location hotspot tags from Supabase.
 * Caches results in-memory so subsequent calls across any screen return immediately.
 */
export async function getTags(forceRefresh = false): Promise<TagRow[]> {
  if (cachedTags && !forceRefresh) {
    return cachedTags;
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const tags = data || [];
  if (tags.length > 0) {
    cachedTags = tags;
  }

  return tags;
}

/**
 * Clears the in-memory lookup cache if fresh data needs to be pulled.
 */
export function clearLookupCache(): void {
  cachedLookupOptions = null;
  cachedTags = null;
}

