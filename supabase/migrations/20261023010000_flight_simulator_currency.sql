-- Flight simulator currency, a new requirement tracked per aircraft like the
-- others (the form defaults it to a 365-day / 1 year validity window).
-- Safe to run more than once.
alter type public.currency_item_type add value if not exists 'flight_simulator';
