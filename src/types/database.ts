// [QUESTION] is there a way to check if these correctly matches the types in database?
export type DriverType = 'student' | 'non-pro' | 'pro' | 'none';

export type VehicleType =
  | 'scooter'
  | 'underbone'
  | 'backbone_manual'
  | 'cruiser'
  | 'adventure'
  | 'sportbike'
  | 'maxi_scooter'
  | 'other';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  driver_type: DriverType;
  vehicle_type: VehicleType;
  is_onboarded: boolean;
  created_at?: string;
  updated_at?: string;
}
