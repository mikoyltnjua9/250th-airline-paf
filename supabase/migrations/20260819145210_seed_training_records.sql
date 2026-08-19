-- Mock training history for the 10 seeded pilots — placeholder content,
-- same as the rest of the seed data.

insert into public.training_records (pilot_id, training_type, status, training_date) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'Recurrent Training',   'completed', '2026-03-08'),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', 'CRM Training',         'completed', '2026-03-08'),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'Recurrent Training',   'completed', '2025-11-01'),
  ('01414984-08b6-4f08-937f-5681904a94a9', 'Safety Seminar',       'completed', '2026-04-15'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'Recurrent Training',   'completed', '2026-01-20'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', 'Emergency Procedures', 'scheduled', '2026-09-10'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'Recurrent Training',   'overdue',   '2025-08-01'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', 'CRM Training',         'completed', '2025-08-01'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'Recurrent Training',   'completed', '2026-02-10'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', 'Safety Seminar',       'completed', '2026-02-10'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'Recurrent Training',   'completed', '2026-05-01'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', 'Emergency Procedures', 'completed', '2026-05-01'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'Recurrent Training',   'completed', '2025-12-01'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', 'CRM Training',         'completed', '2025-12-01'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'Recurrent Training',   'scheduled', '2026-09-01'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', 'Safety Seminar',       'completed', '2026-06-01'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'Recurrent Training',   'completed', '2026-04-01'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', 'Emergency Procedures', 'completed', '2026-04-01'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'Recurrent Training',   'completed', '2026-03-15'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', 'CRM Training',         'completed', '2026-03-15');
