# Cartilha do Estado Atual do App Sentinela-RS

Data da cartilha: 2026-06-01

Esta cartilha registra o estado atual do app após as sessões de refatoração de maio/junho de 2026.
Qualquer alteração futura deve ser comparada contra este documento e contra os arquivos existentes.

---

## Posicionamento do App

O Sentinela-RS é um **painel informativo de contexto climático e ambiental do Rio Grande do Sul**.
Ele NÃO emite alertas operacionais próprios. Alertas são exclusivamente os da Defesa Civil RS via RSS oficial.
Todos os indicadores exibem aviso padronizado com link para Defesa Civil RS e números 199 / 193 Bombeiros.

---

## Arquitetura

- **Frontend:** React/Vite, hospedado em GitHub Pages (cobradeca.github.io/sentinela-rs)
- **Backend:** Supabase Edge Functions (sa-east-1), 19 funções ativas
- **Autenticação:** Edge Functions com `verify_jwt = false` (sem autenticação pública)
- **Cache:** Cache-Control nos headers das Edge Functions (6h ENSO, 5min Lagoa, etc.)

---

## Cidades Monitoradas

Somente cidades que beiram a Lagoa dos Patos com régua e endpoint real:
- Rio Grande / FURG CCMAR
- São Lourenço do Sul
- Arambaré
- São José do Norte
- Itapuã (norte da Lagoa)
- Pelotas (HidroSens/UFPel)

**Nenhuma expansão de cobertura geográfica sem decisão explícita do dono do projeto.**

---

## Edge Functions — Estado Atual

| Função | Status | Observação |
|---|---|---|
| ana-rs | ATIVA | ANA HidroWeb REST, complementar |
| cemaden-rs | DESCONTINUADA NO APP | Token revogado/401; fluxo substituÃ­do por chuva observada Open-Meteo |
| copernicus-ems | ATIVA | Referência estrutural pós-evento |
| copernicus-health | ATIVA | Health check Copernicus |
| copernicus-ndvi | ATIVA | NDVI entorno Lagoa |
| copernicus-sentinel1-water | ATIVA | Sentinel-1 água |
| copernicus-water | ATIVA | Copernicus Water |
| cptec-inpe-produtos | ATIVA | Produtos CPTEC/INPE |
| defesa-civil-rs | ATIVA | RSS oficial Defesa Civil RS |
| effis-wms-health | ATIVA | EFFIS referência estrutural |
| enso-noticias | ATIVA v5+ | GNews BR + Copernicus C3S + CPTEC/INPE |
| hidrosens-laranjal | ATIVA | Sensor UFPel Pelotas |
| icmbio-ucs-rs | ATIVA | UCs RS |
| inmet-previsao | ATIVA | Previsão INMET |
| inpe-queimadas-rs | ATIVA | Proxy BDQueimadas |
| iri-enso-probabilidades | ATIVA | Parser IRI com ok:false fallback |
| lagoa-patos-radar | ATIVA | Sensores RADAR 5 estações |
| noaa-enso | ATIVA | Índices NOAA/CPC |
| poll-apis | DESATIVADA | Cron removido via migration 004 |

---

## Regras das Edge Functions

- `enso-noticias`: verify_jwt = false (pública, sem Authorization header)
- Demais: verify_jwt = false (padrão do projeto)
- `poll-apis`: NÃO ativar sem revisão e aprovação explícita

---

## Secrets Configurados no Supabase

| Secret | Uso |
|---|---|
| VAPID_PUBLIC_KEY | Órfão — push removido, pode ser deletado |
| VAPID_PRIVATE_KEY | Órfão — push removido, pode ser deletado |
| VAPID_SUBJECT | Órfão — push removido, pode ser deletado |
| CEMADEN_PED_TOKEN | Obsoleto no app â€” fonte CEMADEN removida do fluxo principal |
| COPERNICUS_CLIENT_ID | Copernicus OAuth |
| COPERNICUS_CLIENT_SECRET | Copernicus OAuth |
| ANA_HIDROWEB_IDENTIFICADOR | ANA HidroWeb |
| ANA_HIDROWEB_SENHA | ANA HidroWeb |
| ANA_USERNAME | ANA |
| ANA_PASSWORD | ANA |
| SENTINELA_SERVICE_ROLE_KEY | Supabase service role |
| OPENROUTER_API_KEY | Tradução notícias (modelo nvidia/nemotron free) |
| GNEWS_API_KEY | GNews API — notícias BR sobre El Niño |
| CHECKWX_API_KEY | CheckWX ? complemento METAR/TAF em awc-metar-corredor quando AWC n?o retorna leitura para SBPK/SBCO/SBSM |

---

## Aba Notícias El Niño

**Edge Function:** `enso-noticias` (verify_jwt = false)

**Fontes:**
- **GNews BR** — notícias em português de portais brasileiros (G1, CNN Brasil, INMET, etc.)
  - Query: "El Niño" OR "La Niña" OR "ENOS", lang=pt, country=br
  - Janela: mês atual + mês anterior
  - API key: GNEWS_API_KEY (plano gratuito, 100 req/dia)
- **Copernicus C3S** — scraping de climate.copernicus.eu/seasonal-forecasts
  - Extrai highlight ENSO com imagem do plume Niño3.4
  - Traduzido via OpenRouter (nvidia/nemotron free)
- **CPTEC/INPE** — scraping de enos.cptec.inpe.br
  - Só links textuais (sem .gif/.png)
  - Já em português, sem tradução

**Tradução:** OpenRouter com `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
**Cache:** Cache-Control public, max-age=21600 (6h)
**Timeout global:** withTimeout 22s por fonte, get() 9s

---

## Alertas

- Aba Alertas exibe SOMENTE RSS da Defesa Civil RS
- Sem alertas gerados pelo frontend
- Sem push notifications (infraestrutura removida)
- Sem send-alerts, sem usePush.js, sem VAPID ativo

---

## Migrations Aplicadas

| Migration | O que faz |
|---|---|
| 001_initial.sql | Schema base |
| 003_remove_push_subscriptions.sql | Remove tabela push_subscriptions |
| 004_disable_poll_alerts.sql | Remove cron poll-apis e limpa alertas não-oficiais |

---

## Código Morto Conhecido

- `src/hooks/useDataSync.js` — existe mas não é importado no App.jsx. Pode ser removido em sessão futura.
- Secrets VAPID_* — órfãos, podem ser deletados do Supabase.

---

## Regras Inegociáveis

1. O app NÃO emite alertas operacionais próprios.
2. Alertas são exclusivamente os da Defesa Civil RS.
3. ENSO é contexto climático — jamais aciona alerta local sozinho.
4. Nunca mascarar falha de fonte com dado simulado.
5. Fallback vencido não dispara novo alerta.
6. Dado real, fallback e indicador derivado sempre rotulados diferente na UI.
7. Nunca persistir no Supabase sem migration SQL aprovada.
8. poll-apis nunca ativa sem revisão e aprovação explícita.
9. Cidades monitoradas: somente as da Lagoa dos Patos com régua e endpoint real.
10. Notícias ENSO são informativas — nunca com linguagem de alerta operacional.
