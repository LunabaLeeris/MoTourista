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

-- Insert initial location verification statuses.
insert into public.location_statuses (id, label, description, display_order)
values
  ('pending', 'Pending Verification', 'Awaiting administrative verification', 10),
  ('approved', 'Approved', 'Verified and visible on map', 20),
  ('rejected', 'Rejected', 'Did not meet verification criteria', 30)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  display_order = excluded.display_order;

-- Insert initial hotspot categories and tags.
insert into public.tags (id, name, icon, display_order)
values
  ('paresan', 'Paresan / Eatery', 'food-fork-drink', 10),
  ('talyer', 'Mechanic / Talyer', 'wrench-outline', 20),
  ('scenic_view', 'Scenic Viewpoint', 'image-filter-hdr', 30),
  ('mountain_loop', 'Mountain Loop', 'map-marker-distance', 40),
  ('coastal_highway', 'Coastal Highway', 'waves', 50),
  ('coffee_spot', 'Coffee Spot', 'coffee-outline', 60),
  ('tourist_spot', 'Tourist Attraction', 'compass-outline', 70),
  ('gas_station', 'Gas Station', 'gas-station', 80),
  ('campsite', 'Camp Site', 'tent', 90)
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  display_order = excluded.display_order;

-- Insert initial badges and achievements.
insert into public.badges (id, title, description, icon, category, criteria_type, criteria_data, is_secret, display_order)
values
  ('the_beninging', 'The Beninging', 'Completed first 10 hotspot visits', 'flag-checkered', 'milestone', 'total_visits', '{"threshold": 10}'::jsonb, false, 10),
  ('gayak_boy', 'Gayak Boy', 'Completed 20 hotspot visits', 'bag-personal-outline', 'milestone', 'total_visits', '{"threshold": 20}'::jsonb, false, 20),
  ('road_warrior', 'Road Warrior', 'Completed 50 hotspot visits across the Philippines', 'motorbike', 'milestone', 'total_visits', '{"threshold": 50}'::jsonb, false, 30),
  ('pares_warrior', 'Pares Warrior', 'Visited 5 paresan and eatery spots', 'bowl-mix-outline', 'eatery', 'tag_visits', '{"tag_id": "paresan", "threshold": 5}'::jsonb, false, 40),
  ('coffee_lover', 'Coffee Lover', 'Visited 3 coffee stops', 'coffee-outline', 'eatery', 'tag_visits', '{"tag_id": "coffee_spot", "threshold": 3}'::jsonb, false, 50),
  ('coffee_addict', 'Coffee Addict', 'Visited 10 coffee stops', 'coffee', 'eatery', 'tag_visits', '{"tag_id": "coffee_spot", "threshold": 10}'::jsonb, false, 60),
  ('dima', 'Dima', 'Visited 3 mechanic and vulcanizing shops', 'wrench-outline', 'discovery', 'tag_visits', '{"tag_id": "talyer", "threshold": 3}'::jsonb, false, 70),
  ('paldo', 'Paldo', 'Visited 100 gas stations', 'gas-station', 'milestone', 'tag_visits', '{"tag_id": "gas_station", "threshold": 100}'::jsonb, false, 80),
  ('senti', 'Senti', 'Visited 5 scenic viewpoints', 'image-filter-hdr', 'adventure', 'tag_visits', '{"tag_id": "scenic_view", "threshold": 5}'::jsonb, false, 90),
  ('adventure_seeker', 'Adventure Seeker', 'Visited 5 mountain loops', 'compass-outline', 'adventure', 'tag_visits', '{"tag_id": "mountain_loop", "threshold": 5}'::jsonb, false, 100),
  ('sunset_chaser', 'Sunset Chaser', 'Visited 5 coastal highways', 'weather-sunset', 'adventure', 'tag_visits', '{"tag_id": "coastal_highway", "threshold": 5}'::jsonb, false, 110),
  ('island_boy', 'Island Boy', 'Visited 10 coastal and beach hotspots', 'island', 'adventure', 'tag_visits', '{"tag_id": "coastal_highway", "threshold": 10}'::jsonb, false, 120)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  criteria_type = excluded.criteria_type,
  criteria_data = excluded.criteria_data,
  is_secret = excluded.is_secret,
  display_order = excluded.display_order;
