# Evidências para escalonamento ANA — Lagoa dos Patos

Resumo:
- Data: 2026-06-09
- Projeto: sentinela-rs
- Objetivo: demonstrar ausência de séries adotadas na API ANA para estações numéricas e evidenciar que o portal público retorna medições usando `sensor_*`.

Arquivos incluídos:
- `ana_87955000.json` — resposta da função `ana-rs` para `codEstacao=87955000` (retornou via Portal Público `sensor_1`).
- `ana_sensor_1.json` — resposta da função `ana-rs` para `codEstacao=sensor_1` (ANA REST retornou HTTP 400).
- `ana_sensor_2.json` — resposta para `sensor_2` (ANA REST retornou HTTP 400).

Comandos úteis:

PowerShell (exemplo usado para gerar os JSONs):

```powershell
$h=@{apikey='<ANON_KEY>'; Authorization='Bearer <ANON_KEY>'}
Invoke-RestMethod -Uri "https://ykaaxrzkfeaxatrnkkxj.functions.supabase.co/ana-rs?codEstacao=87955000" -Headers $h | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 .\supabase\evidence\ana_87955000.json
Invoke-RestMethod -Uri "https://ykaaxrzkfeaxatrnkkxj.functions.supabase.co/ana-rs?codEstacao=sensor_1" -Headers $h | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 .\supabase\evidence\ana_sensor_1.json
```

Observações:
- O arquivo `ana_87955000.json` mostra `source: Portal Publico - sensor_1` e um `latest.level_cm` válido.
- As consultas diretas `sensor_1`/`sensor_2` resultaram em `ANA HidroWeb REST` com erro HTTP 400, confirmando que a API ANA não aceita estes identificadores ou que a série adotada não existe.

Sugestão de próximo passo para escalonamento:
- Anexar estes JSONs ao e-mail/relatório, incluir capturas de tela do frontend mostrando `sensor_*` (se necessário), e pedir verificação das séries adotadas para as estações numéricas mencionadas.
