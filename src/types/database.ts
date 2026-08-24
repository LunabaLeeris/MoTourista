import { Database, Tables, TablesInsert, TablesUpdate } from './database.generated';

export type { Database, Tables, TablesInsert, TablesUpdate };

// Type aliases for database tables.
export type DriverTypeRow = Tables<'driver_types'>;
export type VehicleTypeRow = Tables<'vehicle_types'>;
export type ProfileRow = Tables<'profiles'>;

// Extended profile type that includes lookup relations.
export interface ProfileWithDetails extends ProfileRow {
  driver_types?: DriverTypeRow | null;
  vehicle_types?: VehicleTypeRow | null;
}
