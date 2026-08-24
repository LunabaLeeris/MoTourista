-- Seed data for the application database.

-- Insert initial driver license types.
insert into public.driver_types (id, label, icon, display_order)
values
  ('student', 'Student Permit', 'card-bulleted-outline', 10),
  ('non-pro', 'Non-Professional', 'card-account-details-outline', 20),
  ('pro', 'Professional', 'shield-check-outline', 30),
  ('none', 'None / Learning', 'alert-circle-outline', 40)
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  display_order = excluded.display_order;

-- Insert initial motorcycle vehicle categories.
insert into public.vehicle_types (id, label, icon, display_order)
values
  ('scooter', 'Scooter (Automatic)', 'moped', 10),
  ('underbone', 'Underbone / Semi', 'motorbike', 20),
  ('backbone_manual', 'Backbone / Manual', 'motorcycle', 30),
  ('maxi_scooter', 'Maxi Scooter (400cc+)', 'moped', 40),
  ('adventure', 'Adventure / Dual Sport', 'compass-outline', 50),
  ('sportbike', 'Sportbike', 'speedometer', 60),
  ('cruiser', 'Cruiser / Classic', 'car-cruise-control', 70),
  ('other', 'Other', 'dots-horizontal-circle-outline', 80)
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  display_order = excluded.display_order;
