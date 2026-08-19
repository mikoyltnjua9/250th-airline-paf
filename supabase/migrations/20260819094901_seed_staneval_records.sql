-- Mock StanEval history for the 10 seeded pilots — placeholder content,
-- same as the rest of the seed data.

insert into public.staneval_records (pilot_id, eval_date, status, grading, next_due_date) values
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', '2026-02-20', 'pass', 'Highly Proficient', '2027-02-20'),
  ('0e1e7177-da34-4011-a4b0-de0b9666780e', '2023-02-15', 'pass', 'Qualified', '2024-02-15'),
  ('01414984-08b6-4f08-937f-5681904a94a9', '2025-08-15', 'pass', 'Qualified', '2026-08-15'),
  ('fa18e78b-9d62-49da-89b1-c441f538acf9', '2026-01-10', 'pass', 'Qualified', '2027-01-10'),
  ('98c821b0-1155-4bb9-a310-d09f49d5f622', '2025-06-01', 'fail', 'Below Standard — remedial training required', '2025-12-01'),
  ('3fe25774-050d-4706-a15f-5f57c110552f', '2026-03-01', 'pass', 'Qualified', '2027-03-01'),
  ('36055a56-fad0-4235-b326-e4b82179ee3d', '2026-04-15', 'pass', 'Highly Proficient', '2027-04-15'),
  ('42782c27-017b-4d97-a0b8-04477c18226b', '2025-09-20', 'pass', 'Qualified', '2026-09-20'),
  ('87c2b905-c192-4747-af62-8d6dec02a916', '2026-05-01', 'pass', 'Qualified (Initial)', '2027-05-01'),
  ('55c2e396-647e-4de7-a9a1-83be01648e9f', '2025-09-08', 'pass', 'Qualified', '2026-09-08'),
  ('b87e1024-1bd6-4962-86ce-74b8c4f41036', '2026-02-01', 'pass', 'Qualified', '2027-02-01');
