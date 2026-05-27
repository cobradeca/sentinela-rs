# Plano de saneamento SITREP — Sentinela RS

## Regra-mãe

Dado operacional exibido = endpoint real + fonte + timestamp + status de validade.

Se não houver isso, exibir:
- Indisponível
- Sem leitura validada
- Aguardando fonte oficial
- Contexto histórico
- Parâmetro adotado

Nunca usar hardcoded/placeholders como alerta, previsão, SITREP ou dado real.

## Prioridade 1 — Remover hardcoded operacional

1. ENSO:
   - Remover `const ENSO` da leitura principal.
   - Usar NOAA/CPC para observado.
   - Usar IRI/CCSR para previsão probabilística.
   - Se endpoints falharem: mostrar "ENSO indisponível", não fallback fake.

2. Banner principal:
   - Não usar "+0,9°C" fixo.
   - Não usar "El Niño em desenvolvimento" fixo.
   - Derivar texto de:
     - fase observada NOAA/CPC;
     - maior probabilidade IRI/CCSR.

3. Impactos esperados:
   - Remover como SITREP.
   - Rebaixar para "Contexto técnico" apenas se houver fonte/data.
   - Não disparar risco sozinho.

4. Copernicus:
   - Enquanto `copernicus-health != AUTH_OK`, mostrar "Aguardando API real".
   - Não exibir como fonte operacional.

## Prioridade 2 — Fontes performando

Manter auditor único:

node scripts\auditar-sitrep-hardcoded-fontes.cjs

Critérios:
- Defesa Civil RS: alerta oficial
- CEMADEN: chuva observada
- Lagoa RADAR: sensores de nível
- HidroSens: nível Laranjal
- NOAA/CPC: índice observado
- IRI/CCSR: probabilidade ENSO
- CPTEC/INPE: produto oficial gráfico
- ANA: complementar
- Copernicus: auth; só vira operacional após produto real

## Prioridade 3 — Produto Copernicus real

Depois de AUTH_OK:
1. Água/superfície inundada
2. Sentinel-1
3. NDVI
