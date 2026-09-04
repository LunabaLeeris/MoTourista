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

-- Insert initial popular Philippine motorcycle models.
insert into public.motorcycle_models (id, vehicle_type_id, label, icon, display_order)
values
  -- Scooter
  ('yamaha_nmax_155', 'scooter', 'Yamaha NMAX 155', 'moped', 10),
  ('yamaha_aerox_155', 'scooter', 'Yamaha Aerox 155', 'moped', 20),
  ('honda_click_125i', 'scooter', 'Honda Click 125i', 'moped', 30),
  ('honda_click_160', 'scooter', 'Honda Click 160', 'moped', 40),
  ('honda_pcx_160', 'scooter', 'Honda PCX 160', 'moped', 50),
  ('honda_beat_110', 'scooter', 'Honda Beat 110', 'moped', 60),
  ('yamaha_mio_fazzio', 'scooter', 'Yamaha Mio Fazzio 125', 'moped', 70),
  ('suzuki_burgman_125', 'scooter', 'Suzuki Burgman Street 125', 'moped', 80),

  -- Underbone
  ('suzuki_raider_150', 'underbone', 'Suzuki Raider R150 Fi', 'motorbike', 10),
  ('yamaha_sniper_155', 'underbone', 'Yamaha Sniper 155', 'motorbike', 20),
  ('honda_wave_rsx', 'underbone', 'Honda Wave RSX 110', 'motorbike', 30),
  ('honda_winner_x', 'underbone', 'Honda Winner X 150', 'motorbike', 40),

  -- Backbone / Manual
  ('honda_tmx_125', 'backbone_manual', 'Honda TMX 125 Alpha', 'motorcycle', 10),
  ('kawasaki_barako_175', 'backbone_manual', 'Kawasaki Barako II 175', 'motorcycle', 20),
  ('yamaha_ytx_125', 'backbone_manual', 'Yamaha YTX 125', 'motorcycle', 30),
  ('yamaha_mt_15', 'backbone_manual', 'Yamaha MT-15', 'motorcycle', 40),
  ('honda_cb150x', 'backbone_manual', 'Honda CB150X', 'motorcycle', 50),

  -- Maxi Scooter
  ('yamaha_tmax_560', 'maxi_scooter', 'Yamaha TMAX 560', 'moped', 10),
  ('kymco_ak550', 'maxi_scooter', 'Kymco AK550', 'moped', 20),
  ('sym_maxsym_400', 'maxi_scooter', 'SYM Maxsym 400', 'moped', 30),
  ('honda_x_adv_750', 'maxi_scooter', 'Honda X-ADV 750', 'moped', 40),

  -- Adventure
  ('honda_adv_160', 'adventure', 'Honda ADV 160', 'compass-outline', 10),
  ('honda_crf300l', 'adventure', 'Honda CRF300L', 'compass-outline', 20),
  ('kawasaki_versys_650', 'adventure', 'Kawasaki Versys 650', 'compass-outline', 30),
  ('ktm_390_adventure', 'adventure', 'KTM 390 Adventure', 'compass-outline', 40),
  ('bmw_r1250_gs', 'adventure', 'BMW R 1250 GS', 'compass-outline', 50),

  -- Sportbike
  ('kawasaki_ninja_400', 'sportbike', 'Kawasaki Ninja 400', 'speedometer', 10),
  ('yamaha_yzf_r3', 'sportbike', 'Yamaha YZF-R3', 'speedometer', 20),
  ('cfmoto_450sr', 'sportbike', 'CFMOTO 450SR', 'speedometer', 30),
  ('honda_cbr500r', 'sportbike', 'Honda CBR500R', 'speedometer', 40),

  -- Cruiser
  ('honda_rebel_500', 'cruiser', 'Honda Rebel 500', 'car-cruise-control', 10),
  ('royal_enfield_classic_350', 'cruiser', 'Royal Enfield Classic 350', 'car-cruise-control', 20),
  ('kawasaki_vulcan_s', 'cruiser', 'Kawasaki Vulcan S', 'car-cruise-control', 30),

  -- Other
  ('other_model', 'other', 'Custom / Other Model', 'dots-horizontal-circle-outline', 10)
on conflict (id) do update set
  vehicle_type_id = excluded.vehicle_type_id,
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
