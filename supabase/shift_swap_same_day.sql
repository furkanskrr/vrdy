-- Takas sadece ayni gun: date_from = date_to
-- NOT: Tabloda date_from <> date_to satirlari varsa ADD CONSTRAINT basarisiz olur; once silin veya duzeltin.
alter table public.shift_swap_requests
  drop constraint if exists shift_swap_same_day;
alter table public.shift_swap_requests
  add constraint shift_swap_same_day check (date_from = date_to);
