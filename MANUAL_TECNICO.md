# Manual Tecnico do Sentinela-RS

Este manual e para programadores, devs e mantenedores do app Sentinela-RS.

Data de referencia: 2026-05-29.

## 1. Objetivo do app

O Sentinela-RS e um painel de monitoramento para o Rio Grande do Sul. Ele combina fontes meteorologicas, hidrologicas, climaticas, satelitais e de queimadas para apoiar leitura operacional.

Regra central:

```text
Nenhum dado operacional pode ser inventado, simulado ou mascarado.
Se a fonte real falhar, o app deve dizer que falhou.
Se houver fallback, deve dizer que e fallback.
Se for calculo do app, deve dizer que e indicador derivado.
Se for historico, deve dizer que nao e operacional.
```

As regras oficiais do projeto ficam em:

```text
REGRAS_OPERACIONAIS.md
```

## 2. Stack

- Frontend: React 18 + Vite.
- Estilo: CSS global em `src/styles/sentinela-ui.css`.
- Hospedagem: GitHub Pages via `gh-pages`.
- Backend leve: Supabase Edge Functions.
- PWA: `public/manifest.json` e `public/sw.js`.
- Push: Web Push API + Edge Function `send-alerts`.

## 3. Estrutura principal

```text
src/App.jsx
src/main.jsx
src/styles/sentinela-ui.css
src/hooks/usePush.js
src/hooks/useDataSync.js
src/services/api.js
src/services/lagoaHistory.js
src/components/FreshnessBadge.jsx
src/components/Sparkline.jsx
supabase/functions/*
scripts/*
```

Observacao importante: parte da logica ja foi extraida para `src/services/api.js` e `src/hooks/useDataSync.js`, mas `src/App.jsx` ainda concentra muita regra de UI, parsing, estado e renderizacao. Ao evoluir o projeto, priorize reduzir o tamanho do `App.jsx`.

## 4. Comandos locais

Instalar dependencias:

```cmd
npm install
```

Rodar em desenvolvimento:

```cmd
npm run dev
```

Gerar build de producao:

```cmd
npm run build
```

Publicar no GitHub Pages:

```cmd
npm run deploy
```

Checar status do Git:

```cmd
git status --short
```

Commit sugerido:

```cmd
git add src\App.jsx src\styles\sentinela-ui.css MANUAL_TECNICO.md MANUAL_USUARIO.md
git commit -m "Add technical and user manuals"
git push
```

## 5. Navegacao e UI

O app usa navegacao lateral em desktop e barra horizontal compacta em telas menores.

Abas principais:

- Dashboard
- Previsao 14 Dias
- Lagoa dos Patos
- ENSO
- CPTEC/INPE
- Copernicus
- Queimadas / APAs
- Alertas
- Fontes de Dados

Arquivos relacionados:

```text
src/App.jsx
src/styles/sentinela-ui.css
```

## 6. Fontes e Edge Functions

As URLs ficam declaradas em `src/App.jsx` e parcialmente em `src/services/api.js`.

Funcoes Supabase existentes:

```text
ana-rs
cemaden-rs
copernicus-emergency
copernicus-ems
copernicus-health
copernicus-ndvi
copernicus-sentinel1-water
copernicus-water
cptec-inpe-produtos
defesa-civil-rs
effis-wms-health
hidrosens-laranjal
icmbio-ucs-rs
inmet-previsao
inpe-queimadas-rs
iri-enso-probabilidades
lagoa-patos-radar
noaa-enso
notification-health
poll-apis
send-alerts
```

Para deployar uma funcao publica:

```cmd
supabase functions deploy NOME_DA_FUNCAO --no-verify-jwt
```

Exemplo:

```cmd
supabase functions deploy hidrosens-laranjal --no-verify-jwt
supabase functions deploy ana-rs --no-verify-jwt
supabase functions deploy effis-wms-health --no-verify-jwt
```

Quando a funcao deve ser chamada pelo frontend sem login, ela precisa aceitar `GET` sem exigir `Authorization` e responder `OPTIONS` com CORS.

Headers CORS recomendados:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

## 7. Segredos e credenciais

Nunca grave secrets no codigo.

Secrets comuns no Supabase:

```text
ANA_HIDROWEB_IDENTIFICADOR
ANA_HIDROWEB_SENHA
CEMADEN_PED_TOKEN
COPERNICUS_CLIENT_ID
COPERNICUS_CLIENT_SECRET
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
RESEND_API_KEY
ALERT_EMAIL_TO
ALERT_EMAIL_FROM
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM
ALERT_SMS_TO
SIRENE_WEBHOOK_URL
SIRENE_WEBHOOK_TOKEN
```

Configurar secret:

```cmd
supabase secrets set NOME_DO_SECRET=valor
```

Depois de trocar secret usado por uma Edge Function, redeploye a funcao relacionada.

## 8. Regras de dado operacional

Um dado so pode ser operacional quando tiver:

- endpoint real ativo;
- fonte identificada;
- horario da leitura ou consulta;
- resposta validada;
- nenhum valor inventado.

Exemplo correto:

```text
Fonte: HidroSens/UFPel
Cota atual: 0,650 m
Leitura: 29/05/2026, 13:41
Status: Normal
```

Indicador derivado pode existir, mas precisa ser identificado como calculo do app. Exemplos:

- risco Normal, Atencao, Alerta, Emergencia ou Critico;
- NDWI de agua superficial;
- Sentinel-1 water-like;
- NDVI de vegetacao;
- saude das fontes;
- contexto ENSO.

Indicador derivado nao e alerta oficial.

## 9. Frescor dos dados

Regra atual:

- ate 180 minutos: leitura recente;
- acima de 180 minutos ate 24 horas: atencao/desatualizacao leve;
- acima de 24 horas: desatualizado.

Referencias no codigo:

```text
src/App.jsx -> dataStaleness()
src/components/FreshnessBadge.jsx
```

Fallback so pode aparecer se houver leitura real anterior salva. Fallback vencido nao deve gerar novo alerta automatico.

## 10. Abas e responsabilidades tecnicas

### Dashboard

Mostra municipios monitorados, resumo de risco e atalho para Lagoa dos Patos.

Base:

```text
STATIONS_CIDADES
getRiskLevel()
loadAllData()
```

### Previsao 14 Dias

Usa Open-Meteo e INMET via proxy Supabase. A previsao de 14 dias e apoio operacional, nao alerta oficial isolado.

### Lagoa dos Patos

Usa:

- RADAR Lagoa dos Patos;
- HidroSens/UFPel para Pelotas/Laranjal;
- ANA HidroWeb como complementar quando houver codigo de estacao.

As cotas de alerta e critica sao limiares de referencia, nao leituras atuais.

### ENSO

Usa NOAA/CPC para indice observado e IRI/CCSR para probabilidade. ENSO e contexto climatico e nao aciona alerta municipal sozinho.

### CPTEC/INPE

Usa produtos graficos sazonais/subsazonais. Deve ser apresentado como tendencia, nao previsao diaria deterministica.

### Copernicus

Usa indicadores satelitais e produtos EMS:

- Water / Sentinel-2;
- Sentinel-1 SAR;
- NDVI / Sentinel-2;
- Copernicus EMS Rapid Mapping e Risk and Recovery como camada pos-evento.

Produtos Copernicus sao contexto ou referencia tecnica, nao alerta oficial automatico sozinhos.

### Queimadas / APAs

Usa:

- INPE BDQueimadas para focos reais;
- CENSIPAM Painel do Fogo para Eventos de Fogo consolidados em GeoJSON;
- ICMBio para UCs/APAs;
- EFFIS WMS como camada complementar.

Status de UC deve ser:

- Com foco: ao menos um foco INPE ou Evento de Fogo CENSIPAM recente esta dentro do raio tecnico do ponto de referencia;
- Sem foco: nao ha informacao valida de foco recente dentro do raio tecnico configurado.

O cruzamento usa distancia geodesica entre coordenadas reais dos focos INPE, poligonos de Eventos de Fogo CENSIPAM e pontos de referencia cadastrados. Eventos CENSIPAM do mes atual so sustentam o status quando a ultima deteccao ocorreu nas ultimas 48 horas. Nome de municipio nao pode gerar destaque ou alerta.

A interface nao lista IDs de eventos CENSIPAM isolados. Ela apresenta somente as areas monitoradas alcancadas pelos eventos recentes, com nome da regiao e horario da ultima deteccao.

EFFIS/GWIS/FIRMS so deve virar alerta operacional quando houver cruzamento espacial validado para RS.

### Alertas

Agrega alertas calculados no frontend. A contagem deve evitar inflar risco com contexto isolado.

### Fontes de Dados

Mostra a saude das fontes e a explicacao de cada integracao. `LIVE OK` deve aparecer apenas quando houver resposta 200 validada.

## 11. Testes e auditoria

Antes de publicar:

```cmd
npm run build
```

Auditorias existentes:

```cmd
node scripts\auditar-sitrep-hardcoded-fontes.cjs
node scripts\auditar-fontes.cjs
node scripts\diagnosticar-cemaden-hidrosens.cjs
```

Nem todos os scripts podem funcionar em ambientes sem rede externa. Se `build` passa e uma auditoria falha com `fetch failed`, diferencie falha de codigo de falha de rede.

Teste de endpoint publico:

```cmd
curl -k https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal
```

Teste com Node:

```cmd
node -e "fetch('https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal').then(r=>r.text()).then(console.log).catch(console.error)"
```

## 12. Deploy recomendado

Sequencia para alteracao de frontend:

```cmd
npm run build
npm run deploy
git status --short
git add ARQUIVOS_ALTERADOS
git commit -m "Mensagem objetiva"
git push
```

Sequencia para Edge Function:

```cmd
supabase functions deploy NOME_DA_FUNCAO --no-verify-jwt
curl -k https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/NOME_DA_FUNCAO
npm run build
```

## 13. Cuidados antes de alterar

Antes de incluir campo novo no card:

1. Identifique a fonte.
2. Confirme se e dado atual, fallback, indicador derivado ou historico.
3. Inclua horario da leitura/consulta quando for operacional.
4. Nao use valor fixo como dado atual.
5. Nao use historico para disparar alerta automatico.
6. Rode build e auditoria.

Antes de incluir uma nova regiao:

1. Verifique se existe fonte real para aquela regiao.
2. Nao inclua somente por suposicao.
3. Se for historico, marque como referencia historica e nao operacional.

## 14. PWA e notificacoes

Push nativo:

- depende do browser;
- depende do service worker;
- depende de VAPID configurado;
- pode ser bloqueado pelo usuario no navegador.

E-mail:

- previsto via Resend;
- requer `RESEND_API_KEY` e destinatarios.

SMS:

- previsto via Twilio;
- usar somente para Emergencia/Critico.

Sirene IoT:

- exige hardware externo;
- usar somente para Critico;
- deve receber webhook validado.

## 15. Checklist de qualidade

Antes de encerrar uma tarefa:

- `npm run build` passou.
- O texto nao mistura operacional com historico.
- Nenhum placeholder aparece em producao.
- Nenhum hardcoded virou dado operacional.
- Fontes novas aparecem em Fontes de Dados.
- Falha de fonte aparece como falha, nao como valor inventado.
- UI funciona em desktop e mobile.
- Se publicou, `npm run deploy` terminou com `Published`.
