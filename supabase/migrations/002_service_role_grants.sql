-- Permite que Edge Functions autenticadas com service_role gravem histórico operacional.
grant insert, select on table public.readings to service_role;
grant usage, select on sequence public.readings_id_seq to service_role;

grant insert, select, update on table public.alerts to service_role;
grant usage, select on sequence public.alerts_id_seq to service_role;
