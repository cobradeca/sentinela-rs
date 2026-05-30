-- 004_disable_poll_alerts.sql
-- Remove o cron do poll-apis e limpa alertas internos gerados automaticamente.
-- Alertas operacionais são exclusivamente os avisos oficiais da Defesa Civil RS.

-- Remove cron do poll-apis (pg_cron — requer extensão ativa no Supabase)
-- Se o cron não existir, o comando é ignorado silenciosamente.
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.unschedule('poll-apis-30min');
  end if;
exception when others then
  null; -- ignora se não existir
end;
$$;

-- Remove alertas internos gerados pelo poll-apis.
-- Mantém apenas os alertas que vieram da Defesa Civil RS (source = 'defesa-civil-rs').
delete from alerts
where source is null
   or source != 'defesa-civil-rs';

-- Adiciona coluna source se não existir (para distinguir origem dos alertas)
alter table alerts
  add column if not exists source text default 'defesa-civil-rs';

-- Garante que novos inserts sem source explícito ficam marcados
comment on column alerts.source is
  'Origem do alerta. Valor obrigatório: defesa-civil-rs. '
  'Alertas internos automáticos não são mais gerados.';
