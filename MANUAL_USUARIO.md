# Manual de Uso e Leitura do Sentinela-RS

Data de referencia: 2026-06-02.

## 1. O que e o Sentinela-RS

O Sentinela-RS e um painel de acompanhamento de condicoes climaticas, hidrologicas e ambientais no Rio Grande do Sul.

Ele organiza dados publicos e indicadores derivados para ajudar a acompanhar a situacao. Os avisos oficiais continuam sendo os da Defesa Civil RS e dos orgaos responsaveis.

O app mostra informacoes sobre:

- chuva prevista;
- temperatura;
- vento;
- nivel da Lagoa dos Patos;
- avisos oficiais da Defesa Civil RS;
- ENSO, El Nino e La Nina;
- produtos climaticos do CPTEC/INPE;
- satelites Copernicus;
- queimadas e areas de conservacao;
- saude das fontes de dados.

## 2. Regra mais importante

Leia sempre cada informacao junto com tres perguntas:

```text
De onde veio?
Quando foi medida ou consultada?
E dado atual, calculo do app, fallback ou referencia historica?
```

O Sentinela-RS separa quatro tipos de informacao:

```text
Dado operacional
Indicador derivado
Fallback
Referencia historica
```

### Dado operacional

E uma informacao atual vinda de fonte real, com fonte identificada e horario.

Exemplo:

```text
Fonte: HidroSens/UFPel
Cota atual: 0,650 m
Leitura: 02/06/2026, 13:41
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
- indicador de vegetacao;
- saude das fontes.

Indicador derivado nao e alerta oficial sozinho.

### Fallback

Fallback e a ultima leitura valida salva quando a fonte real falhou agora.

Quando isso aparecer, leia como:

```text
A fonte primaria falhou.
O app esta mostrando a ultima leitura conhecida.
Confira junto ao orgao responsavel.
```

Fallback vencido nao dispara novo alerta automatico.

### Referencia historica

E uma informacao de evento passado, como maio de 2024. Serve para comparacao, mas nao significa que aquilo esta acontecendo agora.

## 3. Cores e status

As cores ajudam a leitura rapida, mas nao substituem a fonte e o horario.

```text
Verde: Normal
Amarelo: Atencao
Laranja: Alerta
Vermelho: Emergencia ou Critico
Cinza/amarelo em fonte: aguardando, complementar ou sem resposta validada
```

Significado geral:

- Normal: nada acima dos limiares definidos naquele card.
- Atencao: existe algum parametro que merece acompanhamento.
- Alerta: existe parametro importante acima do limiar.
- Emergencia/Critico: situacao mais severa dentro das regras do painel.
- Aguardando: a fonte ainda nao respondeu nesta sessao ou depende de nova consulta.
- Falhou: a fonte nao retornou leitura validada.

Sempre leia o card junto com fonte, horario e explicacao.

## 4. Frescor da leitura

O app considera o tempo da ultima leitura.

```text
Ate 180 minutos: leitura recente
Mais de 180 minutos ate 24 horas: atencao/desatualizacao leve
Mais de 24 horas: desatualizado
```

Se a leitura estiver desatualizada, ela nao deve ser tratada como medicao nova.

## 5. Como navegar

No computador, o menu fica na lateral esquerda.

No celular ou tela pequena, use o botao de menu no topo para abrir a navegacao.

Abas principais:

- Dashboard
- Previsao 14 Dias
- Lagoa dos Patos
- ENSO
- Noticias El Nino
- CPTEC/INPE
- Copernicus
- Queimadas / APAs
- Alertas
- Fontes de Dados

O botao de sol/lua troca entre modo claro e modo escuro. O botao de atualizar recarrega os dados.

## 6. Dashboard

O Dashboard mostra um resumo dos municipios monitorados e do estado geral do painel.

Em cada card voce pode ver:

- municipio;
- status;
- chuva prevista em 14 dias;
- temperatura minima;
- vento maximo;
- contexto climatico;
- fonte INMET ou CEMADEN quando disponivel.

Ao clicar no card, o app abre detalhes sobre os parametros.

Como ler:

- use o status como resumo inicial;
- confira os numeros que explicam o status;
- confirme se ha fonte e horario;
- para avisos oficiais, acompanhe a Defesa Civil RS.

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

Previsao nao e medicao observada. Ela indica tendencia provavel.

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

Se aparecer "Dado real, mas sem limiar operacional validado", leia o valor como medicao disponivel, mas sem classificacao automatica de alerta para aquele ponto.

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

## 10. Noticias El Nino

Esta aba lista noticias e comunicados sobre El Nino, La Nina e ENSO.

Como ler:

- os links abrem a fonte original;
- noticias servem como contexto informativo;
- noticia nao e alerta operacional;
- se uma fonte de noticias falhar, o app mostra indisponibilidade sem inventar resultado.

Use esta aba para acompanhar o assunto, nao para decidir emergencia local.

## 11. CPTEC/INPE

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

## 12. Copernicus

Esta aba mostra informacoes de satelite e produtos europeus Copernicus.

Exemplos:

- agua superficial por Sentinel-2;
- radar Sentinel-1 para agua/alagamento sob nuvens ou a noite;
- vegetacao/estiagem por NDVI;
- Copernicus EMS para resposta a desastre e referencia pos-evento.

Como interpretar:

- satelite ajuda a enxergar contexto;
- nuvens, horario, resolucao e metodo podem limitar a leitura;
- indicador de satelite nao e automaticamente alerta oficial;
- produtos historicos ou pos-evento nao significam risco atual.

Se aparecer "Aguardando", significa que o produto ainda nao carregou naquela sessao. Isso nao deve ser lido como situacao normal nem como alerta.

## 13. Queimadas / APAs

Esta aba acompanha focos de fogo nas principais areas de preservacao ambiental do trajeto pelas rodovias BR-116 e BR-471.

Fontes e camadas:

- INPE BDQueimadas: focos reais detectados por satelite;
- CENSIPAM Painel do Fogo: eventos consolidados com poligono, quantidade de deteccoes e area de influencia;

Como ler:

- Com foco: existe foco INPE georreferenciado ou Evento de Fogo CENSIPAM recente na area monitorada ou proximo dela.
- Sem foco: as fontes responderam e nao ha informacao valida de foco recente na area monitorada.
- Sem leitura: alguma fonte nao respondeu, entao o app nao confirma a situacao daquela area.

O total estadual de focos nao e exibido nesta aba, porque nao representa necessariamente o trajeto monitorado. Quando houver foco, o card informa a fonte e o horario da ultima deteccao.

O destaque e calculado sobre coordenadas reais das fontes de queimadas e os limites cadastrados das areas monitoradas.

## 14. Alertas

A aba Alertas mostra apenas avisos oficiais publicados pela Defesa Civil RS via fonte oficial.

Ela tambem orienta os canais oficiais:

- emergencia: 199;
- Bombeiros: 193;
- Brigada Militar: 190;
- SMS 40199 para cadastro de CEP;
- canal oficial de WhatsApp indicado no card;
- site oficial da Defesa Civil RS.

Como ler:

- se houver aviso listado, abra o link oficial e leia a orientacao completa;
- se a aba mostrar "Sem aviso oficial ativo no RSS", isso significa que o RSS consultado nao trouxe aviso ativo naquele momento;
- ausencia de aviso no painel nao substitui verificacao junto aos canais oficiais em situacao de risco;
- o Sentinela-RS nao cria alerta proprio.

## 15. Fontes de Dados

Esta aba mostra a saude das fontes e a politica operacional do app.

Como interpretar:

- OK: a fonte respondeu ou teve leitura validada.
- Aguardando: a fonte ainda nao respondeu nesta sessao.
- Falhou: a fonte nao retornou leitura validada.
- Configurar/sem leitura: fonte complementar sem leitura operacional validada no momento.

Leia tambem o bloco "Politica operacional - fonte real e fallback". Ele resume que:

- dado real, fallback e indicador derivado devem aparecer separados;
- fallback vencido nao dispara alerta;
- EFFIS e Copernicus complementam a leitura, mas nao criam alerta automatico sozinhos;
- avisos oficiais sao os da Defesa Civil RS.

## 16. O que fazer em caso de risco

Use o Sentinela-RS como apoio de leitura.

Em situacao real de risco:

1. confira avisos oficiais da Defesa Civil RS;
2. acompanhe prefeitura e orgaos locais;
3. consulte fontes oficiais quando necessario;
4. nao tome decisao critica baseada em uma unica camada do app;
5. se houver emergencia, siga orientacoes das autoridades.

## 17. Frase oficial do app

```text
O Sentinela-RS utiliza fontes reais ativas e indicadores derivados identificados. Alertas operacionais dependem de fontes oficiais, dados observados e regras explicitas. Camadas climaticas, satelitais, historicas e complementares nao disparam alerta automatico sozinhas.
```
