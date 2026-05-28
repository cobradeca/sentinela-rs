# Cartilha do Estado Atual do App Sentinela-RS

Data da cartilha: 2026-05-27

Esta cartilha registra o estado atual do app local antes de novas mudancas. A partir deste ponto, qualquer alteracao futura deve ser comparada contra este documento e contra os arquivos existentes nesta pasta.

## Escopo

O projeto nesta pasta e o app Sentinela-RS. A analise abaixo considera somente os arquivos locais do projeto, sem usar prints, deploy publicado ou qualquer referencia externa ao diretorio.

Raiz local:

```text
C:\HomeCloud\shared\Projetos\sentinela-rs
```

## Estrutura Principal

- `src/App.jsx`: componente principal do app, com regras de risco, carregamento de dados, telas, cards e modais.
- `src/main.jsx`: entrada React.
- `src/styles/sentinela-ui.css`: camada visual global, com estilo escuro forte e overrides por seletor.
- `supabase/functions/*`: Edge Functions usadas como proxies ou integracoes de dados.
- `public/`: manifest, service worker e icones PWA.
- `package.json`: app Vite + React.

## Estado Funcional Atual

O app local ja possui:

- Dashboard de municipios monitorados.
- Aba de previsao com horizonte de 14 dias.
- Seletor de municipio na previsao.
- Aba Lagoa dos Patos com pontos de monitoramento.
- Aba ENSO com leitura observada NOAA/CPC e probabilidade IRI/CCSR.
- Aba Copernicus com produtos Water, Sentinel-1 e NDVI.
- Aba Queimadas/APAs.
- Aba Alertas.
- Aba Fontes de Dados com saude das fontes.
- Botao de modo claro/escuro, ainda parcial.
- PWA com manifest, service worker e tentativa de push.

## Municipios Monitorados

No app atual, os municipios operacionais de previsao/risco sao:

- Porto Alegre
- Canoas
- Sao Leopoldo
- Lajeado
- Caxias do Sul
- Passo Fundo
- Pelotas
- Santa Maria
- Rio Grande
- Cachoeira do Sul

Esses municipios ficam em `STATIONS_CIDADES` no `src/App.jsx`.

## Lagoa dos Patos

O app possui pontos especificos da Lagoa em `STATIONS_LAGOA`:

- Itapua
- Arambare
- Sao Lourenco do Sul
- Pelotas / Laranjal
- Sao Jose do Norte
- Rio Grande / FURG CCMAR

Fontes usadas:

- RADAR Lagoa dos Patos via `supabase/functions/lagoa-patos-radar`.
- HidroSens/UFPel para Pelotas/Laranjal via `supabase/functions/hidrosens-laranjal`.
- ANA HidroWeb aparece como complementar/parcial para pontos com `anaCode`.

Observacao: o app ja separa `STATIONS_CIDADES` de `STATIONS_LAGOA`. A previsao por municipio usa cidades, e a aba Lagoa usa pontos da Lagoa.

## Fontes Conectadas

### Operacionais ou chamadas diretamente pelo app

- Open-Meteo: previsao meteorologica 14 dias, chamada direto no navegador.
- INMET: previsao oficial por municipio via `inmet-previsao`.
- CEMADEN: acumulados observados via `cemaden-rs`, dependente de token `CEMADEN_PED_TOKEN`.
- RADAR Lagoa dos Patos: sensores de nivel via `lagoa-patos-radar`.
- HidroSens/UFPel: sensor Laranjal/Pelotas via `hidrosens-laranjal`.
- NOAA/CPC ENSO: indices observados via `noaa-enso`.
- IRI/CCSR ENSO: probabilidades via `iri-enso-probabilidades`.
- CPTEC/INPE: produtos graficos via `cptec-inpe-produtos`.
- Defesa Civil RS: RSS via `defesa-civil-rs`.
- INPE BDQueimadas: chamada direta no navegador.
- Copernicus Water: via `copernicus-water`, depende de credenciais Copernicus.
- Copernicus Sentinel-1: via `copernicus-sentinel1-water`, depende de credenciais Copernicus.
- Copernicus NDVI: via `copernicus-ndvi`, depende de credenciais Copernicus.

### Complementares, parciais ou dependentes

- ANA HidroWeb: existe `ana-rs`, mas a UI descreve como complementar/aguardando credencial.
- Push PWA: depende de `VITE_VAPID_PUBLIC_KEY` no frontend e secrets VAPID no backend.
- `send-alerts`: depende de Supabase Service Role e VAPID.
- `poll-apis`: existe como funcao de polling, mas usa logica mais antiga e previsao 7 dias; deve ser revisada antes de uso operacional.

### Referenciais, nao operacionais

- Copernicus EFFIS na aba Queimadas: atualmente aparece como risco estrutural/referencia por bioma, nao como integracao operacional em tempo real.
- APAs/UCs: lista georreferenciada local, sem cruzamento operacional real por geocerca.
- Qualidade do ar: citada como possivel integracao futura, nao conectada.
- SPI/CHIRPS para seca: citado como integracao futura, nao conectado.
- Copernicus Emergency/CEMS: marcado como nao ativo.

## Regras de Risco

O risco principal e calculado em `getRiskLevel` usando:

- Precipitacao acumulada em 14 dias.
- Temperatura minima.
- Vento maximo.
- Nivel da Lagoa somente quando ha limiar proprio validado por fonte real.

ENSO e tratado como contexto climatico e nao deve acionar alerta local sozinho.

Na aba Alertas, entram apenas:

- `ALERTA`
- `EMERGENCIA`
- `CRITICO`

`ATENCAO` fica visivel nos cards, mas nao infla o contador de alertas ativos.

## Pontos Fortes Atuais

- Boa separacao conceitual entre municipios e Lagoa dos Patos.
- Horizonte de previsao ja esta em 14 dias no frontend.
- Uso de Edge Functions para varias fontes sensiveis a CORS ou credencial.
- Politica de fallback explicitada na UI.
- Fallback local para RADAR/HidroSens com aviso de ultima leitura valida.
- Saude das fontes exibida na aba Fontes de Dados.
- ENSO nao entra diretamente no score local, o que evita falso alerta operacional.

## Fragilidades Atuais

- `src/App.jsx` concentra muita responsabilidade: UI, regras, fontes, parsing, risco e estado.
- `loadAllData` faz varias chamadas em sequencia, principalmente por estacao.
- O helper `tracked` pode chamar uma fonte novamente no erro por causa de `typeof fn()`.
- INPE BDQueimadas e chamado direto no navegador, sem proxy, cache ou normalizacao.
- Parser do IRI/CCSR depende de texto da pagina publica; e fragil se o texto mudar.
- Copernicus EFFIS aparece no produto, mas nao esta conectado como dado operacional em tempo real.
- Modo claro existe, mas o CSS global ainda forca uma identidade escura forte.
- Historico da Lagoa fica em `localStorage`, nao em backend persistente.
- Alertas locais sao gerados no frontend; nao ha fila/persistencia central de alertas.
- Algumas funcoes antigas podem estar desalinhadas com o app atual, especialmente `poll-apis`.

## Performance Atual

Principal gargalo:

- `loadAllData` carrega dados para `ALL_STATIONS` com fluxo majoritariamente serial.

Melhorias recomendadas antes de crescer o app:

- Corrigir `tracked` para nao rechamar fonte ao falhar.
- Paralelizar chamadas por estacao com `Promise.allSettled`.
- Adicionar limite de concorrencia para nao saturar APIs.
- Cachear Open-Meteo e INMET por municipio.
- Carregar dados pesados sob demanda por aba.
- Considerar uma Edge Function agregadora para reduzir chamadas do navegador.
- Persistir historico e alertas no backend, nao apenas no navegador.

## Melhorias Ja Identificadas Para Proxima Fase

1. Tornar cards de alerta clicaveis com explicacao dos parametros que geraram o alerta.
2. Ajustar textos ENSO para mostrar apenas o evento dominante/proximo quando apropriado.
3. Revisar a aba Queimadas para nao comunicar EFFIS como probabilidade operacional se nao houver API real.
4. Validar se ha mais sensores reais da Lagoa antes de incluir novos pontos.
5. Manter previsao focada em municipios, nao em pontos da Lagoa.
6. Incluir novos municipios/regioes somente com base real verificavel no codigo/fonte.
7. Consolidar modo claro/escuro para que o CSS global respeite o tema.
8. Separar referencias historicas de dados operacionais em todas as abas.
9. Criar proxy para INPE BDQueimadas.
10. Revisar funcoes antigas antes de usar em producao.

## Criterio Para Novas Mudancas

Antes de incluir uma nova informacao operacional:

- Deve haver fonte real identificada.
- Deve haver horario ou periodo de referencia.
- Deve ficar claro se e dado atual, fallback, complementar ou historico.
- Fallback vencido nao deve gerar novo alerta.
- ENSO, Copernicus contextual e produtos sazonais nao devem acionar alerta local sozinhos.

## Regras Operacionais Vigentes

As regras operacionais do app foram formalizadas em `REGRAS_OPERACIONAIS.md`.

A regra-mae e:

```text
Nenhum dado operacional pode ser inventado, simulado ou mascarado.
Se a fonte real falhar, o app deve dizer que falhou.
Se houver fallback, deve dizer que e fallback.
Se for calculo do app, deve dizer que e indicador derivado.
Se for historico, deve dizer que nao e operacional.
```

## Estado Congelado

Esta cartilha representa o estado atual antes das proximas alteracoes. Depois de zipar o projeto, as proximas mudancas podem ser feitas com este documento como baseline.
