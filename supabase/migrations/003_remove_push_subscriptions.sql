-- Remove infraestrutura de push proprio do Sentinela-RS.
-- Alertas operacionais passam a ser exclusivamente os avisos oficiais da Defesa Civil RS.
drop table if exists push_subscriptions;
