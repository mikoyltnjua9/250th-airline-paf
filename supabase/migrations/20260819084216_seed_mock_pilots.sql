-- =============================================================================
-- Seed data: 10 mock pilots, per the client's request. Every name, AFSN,
-- license number, and date below is placeholder content — their data entry
-- specialist corrects all of it once the real build is handed over. Do not
-- treat any of this as real personnel data.
-- =============================================================================

insert into public.pilots (id, full_name, rank_code, afsn, unit_section, position) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'Ramon Bautista',      'Capt',  '104521', '250th PAW / 1st Air Div', 'Pilot'),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'Andrea Villanueva',   '1Lt',   '104522', '250th PAW / 1st Air Div', 'Pilot'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'Ferdinand Cruz',      'Maj',   '104523', '250th PAW / 2nd Air Div', 'Pilot'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'Miguel Santos',       'Capt',  '104524', '250th PAW / 2nd Air Div', 'Pilot'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'Kristine Aquino',     '1Lt',   '104525', '250th PAW / 1st Air Div', 'Pilot'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'Roberto Mendoza',     'LtCol', '104526', '250th PAW / Wing HQ',     'Pilot'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'Bianca Reyes',        'Capt',  '104527', '250th PAW / 2nd Air Div', 'Pilot'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'Joshua Tan',          '2Lt',   '104528', '250th PAW / 1st Air Div', 'Pilot'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'Patricia Lim',        'Maj',   '104529', '250th PAW / Wing HQ',     'Pilot'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'Daniel Garcia',       'Capt',  '104530', '250th PAW / 2nd Air Div', 'Pilot');

insert into public.licenses (pilot_id, license_no, date_issued, date_expires, status) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'WSLQ-26-001-000101', '2024-06-01', '2027-06-01', 'valid'),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'WSLQ-26-001-000102', '2023-05-15', '2026-08-05', 'expired'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'WSLQ-26-001-000103', '2022-01-10', '2027-01-10', 'valid'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'WSLQ-26-001-000104', '2024-03-20', '2027-03-20', 'valid'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'WSLQ-26-001-000105', '2024-09-01', '2027-09-01', 'valid'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'WSLQ-26-001-000106', '2019-02-01', '2027-02-01', 'valid'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'WSLQ-26-001-000107', '2023-11-11', '2026-11-11', 'valid'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'WSLQ-26-001-000108', '2025-01-05', '2028-01-05', 'valid'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'WSLQ-26-001-000109', '2021-07-01', '2026-05-01', 'suspended'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'WSLQ-26-001-000110', '2024-04-18', '2027-04-18', 'valid');

insert into public.qualifications (pilot_id, aircraft_type_code, status, date_earned, expiry_date) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'f28',     'expiring_soon', '2023-09-02', '2026-09-02'),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'bell412', 'current',       '2022-04-10', '2027-04-10'),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'f28',     'current',       '2024-01-15', '2027-01-15'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'c295',    'current',       '2021-06-01', '2027-06-01'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 's70i',    'expiring_soon', '2023-09-11', '2026-09-11'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'n22b',    'expired',       '2020-08-10', '2026-08-10'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 's70i',    'in_training',   null,         null),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'g280',    'current',       '2024-11-01', '2027-11-01'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'g280',    'current',       '2019-03-01', '2027-03-01'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'bell412', 'current',       '2019-05-01', '2027-05-01'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'c295',    'current',       '2023-02-01', '2027-02-01'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 's70i',    'in_training',   null,         null),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'bell412', 'expired',       '2018-01-01', '2026-01-01'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'n22b',    'current',       '2022-10-01', '2027-10-01'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'f28',     'current',       '2022-10-01', '2027-10-01');

insert into public.flights (pilot_id, flight_date, aircraft_type_code, route, duty, flying_time_hours, block_time_hours) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', '2026-08-13', 'g280',    'MNL–CEB–MNL', 'PIC', 2.3, 2.5),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', '2026-08-05', 'bell412', 'MNL–LUB–MNL', 'PIC', 1.7, 1.8),
  ('01414984-08b6-4f08-937f-5681904a94a9', '2026-08-01', 'f28',     'MNL–CEB–MNL', 'SIC', 2.1, 2.3),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', '2026-08-10', 'c295',    'MNL–CRK–MNL', 'PIC', 2.0, 2.1),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', '2026-07-28', 'n22b',    'MNL–BAC–MNL', 'SIC', 1.9, 2.0),
  ('3fe25774-050d-4706-a15f-5f57c110552f', '2026-08-02', 's70i',    'MNL–LUB–MNL', 'Student', 1.5, 1.6),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', '2026-08-14', 'g280',    'MNL–CEB–MNL', 'PIC', 2.2, 2.4),
  ('42782c27-017b-4d97-a0b8-04477c18226b', '2026-08-09', 'c295',    'MNL–CRK–MNL', 'IP', 2.0, 2.1),
  ('87c2b905-c192-4747-af62-8d6dec02a916', '2026-07-30', 's70i',    'MNL–LUB–MNL', 'Student', 1.3, 1.4),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', '2026-08-06', 'bell412', 'MNL–BAC–MNL', 'PIC', 1.8, 1.9),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', '2026-08-12', 'f28',     'MNL–CEB–MNL', 'SIC', 2.1, 2.2);

insert into public.ape_records (pilot_id, last_ape_date, next_due_date, fit_to_fly, classification) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', '2026-02-10', '2026-08-10', true,  'Class 1'),
  ('01414984-08b6-4f08-937f-5681904a94a9', '2026-01-20', '2026-07-20', true,  'Class 1'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', '2025-12-01', '2026-06-01', true,  'Class 1'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', '2026-03-05', '2026-09-05', true,  'Class 1'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', '2026-02-15', '2026-08-15', false, 'Class 2'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', '2026-04-01', '2026-10-01', true,  'Class 1'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', '2026-01-10', '2026-07-10', true,  'Class 1'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', '2026-02-20', '2026-08-20', true,  'Class 1'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', '2025-11-15', '2026-05-15', true,  'Class 1'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', '2026-03-18', '2026-09-18', true,  'Class 1');

insert into public.currency_items (pilot_id, item_type, last_date, validity_days) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'last_flight',       '2026-08-13', 45),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'ifr',                '2026-06-01', 180),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'night_proficiency', '2026-05-20', 180),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'peculiar_runways',  '2026-04-01', 180),

  ('01414984-08b6-4f08-937f-5681904a94a9', 'last_flight',       '2026-08-01', 45),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'ifr',                '2026-03-01', 180),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'night_proficiency', '2026-01-10', 180),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'peculiar_runways',  '2026-03-15', 180),

  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'last_flight',       '2026-08-10', 45),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'ifr',                '2026-06-15', 180),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'night_proficiency', '2026-05-01', 180),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'peculiar_runways',  '2026-02-01', 180),

  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'last_flight',       '2026-07-28', 45),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'ifr',                '2026-04-01', 180),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'night_proficiency', '2026-01-01', 180),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'peculiar_runways',  '2026-05-01', 180),

  ('3fe25774-050d-4706-a15f-5f57c110552f', 'last_flight',       '2026-08-02', 45),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'ifr',                '2026-02-01', 180),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'night_proficiency', '2025-12-01', 180),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'peculiar_runways',  '2026-04-15', 180),

  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'last_flight',       '2026-08-14', 45),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'ifr',                '2026-07-01', 180),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'night_proficiency', '2026-06-01', 180),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'peculiar_runways',  '2026-05-20', 180),

  ('42782c27-017b-4d97-a0b8-04477c18226b', 'last_flight',       '2026-08-09', 45),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'ifr',                '2026-05-15', 180),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'night_proficiency', '2026-04-01', 180),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'peculiar_runways',  '2026-06-01', 180),

  ('87c2b905-c192-4747-af62-8d6dec02a916', 'last_flight',       '2026-07-30', 45),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'ifr',                '2026-01-15', 180),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'night_proficiency', '2025-11-01', 180),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'peculiar_runways',  '2026-02-15', 180),

  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'last_flight',       '2026-08-06', 45),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'ifr',                '2026-06-01', 180),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'night_proficiency', '2026-05-01', 180),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'peculiar_runways',  '2026-03-01', 180),

  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'last_flight',       '2026-08-12', 45),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'ifr',                '2026-07-10', 180),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'night_proficiency', '2026-06-15', 180),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'peculiar_runways',  '2026-04-20', 180);
