# Próximos blocos recomendados

## Bloco A — Fechamento da prioridade alta
Rodar:

node auditar-prioridades-sentinela.cjs

Corrigir apenas itens com ❌.

## Bloco B — Histórico/gráfico por estação
Criar histórico usando:
- API RADAR: /dados/{sensor}/ultimos-dias?page=1
- HidroSens: ThingsBoard timeseries payload

## Bloco C — Aviso de dado desatualizado
Critérios sugeridos:
- atualizado: até 90 min
- atenção: 90 a 180 min
- desatualizado: acima de 180 min
- fallback local: sempre mostrar como dado salvo, sem alerta automático

## Bloco D — Saúde das fontes
Somente depois:
- RADAR 5/5
- HidroSens OK
- Defesa Civil OK
- CEMADEN OK
- INMET OK
