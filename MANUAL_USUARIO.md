# Manual de Uso e Leitura do Sentinela-RS

Este manual e para qualquer pessoa que precise abrir o Sentinela-RS e entender o que as informacoes significam.

Data de referencia: 2026-05-29.

## 1. O que e o Sentinela-RS

O Sentinela-RS e um painel de acompanhamento de riscos e condicoes ambientais no Rio Grande do Sul.

Ele mostra informacoes sobre:

- chuva prevista;
- temperatura;
- vento;
- nivel da Lagoa dos Patos;
- avisos e fontes oficiais;
- ENSO, El Nino e La Nina;
- produtos climaticos do CPTEC/INPE;
- satelites Copernicus;
- queimadas e areas de conservacao;
- canais de alerta.

O app ajuda a interpretar dados, mas nao substitui Defesa Civil, prefeituras, CEMADEN, INMET, ANA, INPE ou outros orgaos responsaveis.

## 2. Regra mais importante

O Sentinela-RS separa quatro tipos de informacao:

```text
Dado operacional
Indicador derivado
Fallback
Referencia historica
```

### Dado operacional

E uma informacao atual vinda de fonte real, com fonte e horario.

Exemplo:

```text
Fonte: HidroSens/UFPel
Cota atual: 0,650 m
Leitura: 29/05/2026, 13:41
Status: Normal
```

### Indicador derivado

E uma classificacao calculada pelo app a partir de dados reais.

Exemplos:

- Normal;
- Atencao;
- Alerta;
- Emergencia;
- Critico;
- contexto ENSO;
- indicador de agua por satelite;
- indicador de vegetacao.

Indicador derivado nao e alerta oficial sozinho.

### Fallback

Fallback e uma ultima leitura valida salva quando a fonte real falhou agora.

Quando isso aparecer, leia como:

```text
A fonte primaria falhou.
O app esta mostrando a ultima leitura conhecida.
Confira junto ao orgao responsavel.
```

### Referencia historica

E uma informacao de evento passado, como maio de 2024. Serve para comparacao, mas nao significa que aquilo esta acontecendo agora.

## 3. Cores e status

As cores ajudam a leitura rapida.

```text
Verde: Normal
Amarelo: Atencao
Laranja: Alerta
Vermelho: Emergencia ou Critico
Cinza/amarelo em fonte: aguardando, complementar ou sem resposta validada
```

O significado geral:

- Normal: nada acima dos limiares definidos naquele card.
- Atencao: ha algum parametro que merece acompanhamento.
- Alerta: ha parametro importante acima do limiar.
- Emergencia/Critico: situacao mais severa, quando regras especificas indicam risco alto.

Sempre leia o card junto com a fonte, horario e explicacao.

## 4. Frescor da leitura

O app considera o tempo da ultima leitura.

```text
Ate 180 minutos: leitura recente
Mais de 180 minutos ate 24 horas: atencao/desatualizacao leve
Mais de 24 horas: desatualizado
```

Se a leitura estiver desatualizada, ela nao deve ser tratada como uma medicao nova.

## 5. Como navegar

No computador, o menu fica na lateral esquerda.

No celular ou tela pequena, o menu aparece como uma barra horizontal.

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

## 6. Dashboard

O Dashboard mostra um resumo dos municipios monitorados.

Em cada card voce pode ver:

- municipio;
- status;
- chuva prevista em 14 dias;
- temperatura minima;
- vento maximo;
- contexto climatico;
- fonte INMET ou CEMADEN quando disponivel.

Ao clicar no card, o app abre detalhes sobre os parametros.

O Dashboard e uma leitura de acompanhamento. Ele nao substitui alerta oficial.

## 7. Previsao 14 Dias

Esta aba mostra previsao meteorologica para o municipio selecionado.

Ela pode incluir:

- chuva prevista;
- temperatura minima e maxima;
- vento;
- condicao do tempo;
- acumulado de chuva.

Como ler:

- chuva alta por varios dias merece acompanhamento;
- frio abaixo de 5 graus pode entrar em atencao;
- vento forte tem limiares proprios;
- previsao muda, entao deve ser acompanhada com atualizacao.

## 8. Lagoa dos Patos

Esta aba mostra pontos monitorados da Lagoa dos Patos.

Pontos organizados:

- Itapua;
- Arambare;
- Sao Lourenco do Sul;
- Pelotas / Laranjal;
- Sao Jose do Norte;
- Rio Grande.

Fontes usadas:

- RADAR Lagoa dos Patos;
- HidroSens/UFPel em Pelotas/Laranjal;
- ANA HidroWeb como complemento quando houver estacao.

Como ler um card:

- Cota atual: nivel medido.
- Fonte: origem da leitura.
- Horario: quando a leitura foi feita.
- Cota de alerta: referencia para acompanhamento.
- Cota critica: referencia de maior gravidade.
- Max. maio/2024: comparacao historica, nao leitura atual.

Se o card mostrar "Normal", significa que a leitura atual esta abaixo do limiar usado naquele ponto.

## 9. ENSO, El Nino e La Nina

Esta aba mostra o contexto climatico do Pacifico.

Termos principais:

- El Nino: aquecimento anormal no Pacifico tropical.
- La Nina: resfriamento anormal no Pacifico tropical.
- Neutro: sem El Nino ou La Nina estabelecido.
- Nino 3.4: regiao usada para medir a anomalia de temperatura do oceano.
- ONI: media trimestral usada para acompanhar fase ENSO.

Como interpretar:

- ENSO indica contexto climatico.
- ENSO nao diz sozinho se vai chover em uma cidade em um dia especifico.
- ENSO nao dispara alerta local sozinho no Sentinela-RS.

Se a aba mostrar probabilidade alta de El Nino, leia como maior chance de formacao ou manutencao daquele padrao no periodo indicado, nao como desastre confirmado.

## 10. CPTEC/INPE

Esta aba mostra produtos climaticos oficiais por imagem.

Ha dois tipos comuns:

```text
Subsazonal: tendencia por semanas.
Sazonal: tendencia provavel para cerca de 3 meses.
```

Como interpretar:

- nao e previsao diaria;
- nao informa se vai chover exatamente em uma cidade num dia especifico;
- serve para entender tendencia regional;
- nao aciona alerta automatico sozinho.

## 11. Copernicus

Esta aba mostra informacoes de satelite e produtos europeus Copernicus.

Exemplos:

- agua superficial por Sentinel-2;
- radar Sentinel-1 para agua/alagamento;
- vegetacao/estiagem por NDVI;
- Copernicus EMS para resposta a desastre e referencia pos-evento.

Como interpretar:

- satelite ajuda a enxergar contexto;
- nuvens, horario, resolucao e metodo podem limitar a leitura;
- indicador de satelite nao e automaticamente alerta oficial;
- produtos historicos ou pos-evento nao significam risco atual.

## 12. Queimadas / APAs

Esta aba acompanha focos de fogo e areas monitoradas.

Fontes e camadas:

- INPE BDQueimadas: focos reais detectados por satelite;
- ICMBio: unidades de conservacao;
- EFFIS/GWIS: camada complementar de perigo, focos ou area queimada.

Como ler:

- Normal: o endpoint nao informou foco validado naquela regiao.
- Alerta: o endpoint informou foco validado naquela regiao.
- EFFIS pode aparecer como complemento, mas nao deve virar alerta no RS sem cruzamento espacial validado.

Traducoes dos termos:

```text
Fire Danger Forecast: previsao de perigo meteorologico de fogo.
Active Fires: focos ativos detectados por satelite.
Burnt Areas: area queimada.
Data request: solicitacao de dados.
```

## 13. Alertas

A aba Alertas mostra eventos calculados pelo app ou vindos de fontes conectadas.

Atencao:

- nem todo "Atencao" entra como alerta ativo;
- contexto climatico nao deve disparar alerta sozinho;
- alerta operacional precisa de dado atual, fonte e regra clara.

## 14. Fontes de Dados

Esta aba mostra quais fontes estao ativas, aguardando credencial ou em uso complementar.

Como interpretar:

- Ativo: fonte configurada e considerada operacional pelo app.
- Aguardando credencial: precisa de chave, token ou autorizacao.
- Aguardando: ainda nao respondeu nesta sessao ou depende de integracao.
- LIVE OK: deve aparecer somente quando o endpoint respondeu corretamente.

Se uma fonte falhar, o app deve dizer que falhou. Ele nao deve inventar valor para preencher a tela.

## 15. Notificacoes

O app pode trabalhar com varios canais:

- alerta na tela;
- push nativo do PWA;
- e-mail;
- SMS;
- sirene IoT.

Nem todos ficam ativos automaticamente. Alguns dependem de permissao do navegador, configuracao no Supabase ou hardware externo.

Se o navegador negar notificacao, e preciso liberar permissao nas configuracoes do navegador ou instalar o PWA quando exigido pelo sistema.

## 16. O que fazer em caso de risco

Use o Sentinela-RS como apoio de leitura.

Em situacao real de risco:

1. confira avisos oficiais da Defesa Civil;
2. acompanhe prefeitura e orgaos locais;
3. consulte fontes oficiais quando necessario;
4. nao tome decisao critica baseada em uma unica camada do app;
5. se houver emergencia, siga orientacoes das autoridades.

## 17. Frase oficial do app

```text
O Sentinela-RS utiliza fontes reais ativas e indicadores derivados identificados. Alertas operacionais dependem de fontes oficiais, dados observados e regras explicitas. Camadas climaticas, satelitais, historicas e complementares nao disparam alerta automatico sozinhas.
```

