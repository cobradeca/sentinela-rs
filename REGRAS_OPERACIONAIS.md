# Regras Operacionais do Sentinela-RS

Estas regras valem para qualquer mudanca daqui para frente.

## 1. Dado Real

Um dado so pode aparecer como operacional quando vier de:

- endpoint real ativo
- fonte identificada
- horario da leitura ou consulta
- resposta validada
- nenhum valor inventado

Fontes reais atuais:

- Defesa Civil RS
- CEMADEN
- RADAR Lagoa
- HidroSens
- INMET via proxy
- Open-Meteo
- NOAA/CPC ENSO
- IRI/CCSR ENSO
- CPTEC/INPE
- Copernicus Water
- Copernicus Sentinel-1
- Copernicus NDVI

## 2. Indicador Derivado

Indicador derivado e permitido, mas precisa estar identificado como calculo do app sobre dado real.

Exemplos:

- risco Normal/Atencao/Alerta
- NDWI agua superficial
- Sentinel-1 water-like
- NDVI vegetacao
- saude das fontes
- contexto climatico ENSO

Regras:

- indicador derivado nao e alerta oficial
- indicador derivado nao pode fingir ser dado bruto
- indicador derivado precisa informar metodo, fonte e limitacao

## 3. Fallback

Fallback so e permitido quando:

- ja existe endpoint real configurado
- o endpoint real ja respondeu antes com dado valido
- a fonte primaria falhou agora
- o card informa claramente que e ultima leitura valida salva
- o card orienta verificar junto ao orgao responsavel
- fallback vencido nao dispara novo alerta automatico

Texto padrao:

```text
Fonte primaria indisponivel.
Exibindo ultima leitura valida salva.
Verifique a informacao junto ao orgao responsavel.
```

## 4. Hardcoded

Hardcoded nao pode ser usado como dado operacional.

Proibido:

- nivel fixo
- chuva fixa
- risco fixo
- probabilidade fixa
- alerta fixo
- texto dizendo risco alto sem fonte real
- numero historico parecendo atual

Permitido apenas quando for:

- configuracao tecnica
- lista de cidades monitoradas
- limiar validado e identificado
- texto explicativo
- referencia historica claramente marcada como nao operacional

## 5. Placeholder

Placeholder e proibido em producao.

Nao pode aparecer:

- mock
- dummy
- lorem
- SEU_CLIENT_ID
- SEU_CLIENT_SECRET
- valor_real
- TODO tecnico
- dados de exemplo
- aguardando valor

Quando uma fonte ainda nao esta conectada, o correto e:

```text
Aguardando integracao oficial.
Sem leitura operacional validada.
```

## 6. Referencia Historica

Referencia historica pode existir, mas precisa ficar separada do operacional.

Correto:

```text
Referencia historica
NAO OPERACIONAL
Nao dispara alerta
```

Errado:

- mostrar numero historico no card principal como se fosse dado atual
- misturar historico com risco de hoje
- usar historico para gerar alerta automatico

## 7. Regra-Mae

Nenhum dado operacional pode ser inventado, simulado ou mascarado.

Se a fonte real falhar, o app deve dizer que falhou.

Se houver fallback, deve dizer que e fallback.

Se for calculo do app, deve dizer que e indicador derivado.

Se for historico, deve dizer que nao e operacional.

Frase oficial:

```text
O Sentinela-RS utiliza fontes reais ativas e indicadores derivados identificados. Alertas operacionais dependem de fontes oficiais, dados observados e regras explicitas. Camadas climaticas, satelitais, historicas e complementares nao disparam alerta automatico sozinhas.
```
