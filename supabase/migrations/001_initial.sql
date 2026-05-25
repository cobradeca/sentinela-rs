-- ============================================================
-- Sentinel·RS — Schema Supabase
-- Execute em: app.supabase.com → SQL Editor
-- ============================================================

-- 1. Leituras meteorológicas (salvas a cada 30min pelo Edge Function poll-apis)
create table if not exists readings (
  id            bigserial primary key,
  station_id    text not null,
  station_name  text not null,
  recorded_at   timestamptz not null default now(),
  precip_mm     numeric,          -- precipitação da leitura
  temp_min      numeric,          -- temperatura mínima
  temp_max      numeric,          -- temperatura máxima
  wind_max      numeric,          -- vento máximo km/h
  weather_code  int,              -- código WMO
  lagoa_level   numeric,          -- nível lagoa em metros (quando aplicável)
  ninha_prob    numeric,          -- probabilidade La Niña 0-1
  risk_level    text not null default 'NORMAL'
                check (risk_level in ('NORMAL','ATENCAO','ALERTA','EMERGENCIA','CRITICO'))
);

create index if not exists readings_station_time on readings(station_id, recorded_at desc);

-- 2. Alertas gerados (histórico + alertas ativos)
create table if not exists alerts (
  id            bigserial primary key,
  station_id    text not null,
  station_name  text not null,
  risk_level    text not null,
  message       text,
  precip_7d     numeric,
  temp_min      numeric,
  wind_max      numeric,
  lagoa_level   numeric,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists alerts_active on alerts(active, created_at desc);

-- 3. Inscrições push dos usuários
create table if not exists push_subscriptions (
  id            bigserial primary key,
  endpoint      text unique not null,
  p256dh        text not null,
  auth          text not null,
  station_ids   text[] default '{}',   -- [] = todas as estações
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 4. Habilitar Realtime nas tabelas relevantes
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table readings;

-- 5. Row Level Security (leitura pública, escrita apenas por service_role)
alter table readings enable row level security;
alter table alerts enable row level security;
alter table push_subscriptions enable row level security;

-- Leitura pública para readings e alerts (frontend sem auth)
create policy "leitura publica readings" on readings for select using (true);
create policy "leitura publica alerts" on alerts for select using (true);

-- Push subscriptions: usuário só vê/edita a própria linha
create policy "push self insert" on push_subscriptions for insert with check (true);
create policy "push self update" on push_subscriptions for update using (true);
create policy "push self delete" on push_subscriptions for delete using (true);
