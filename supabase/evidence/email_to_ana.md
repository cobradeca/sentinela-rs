Assunto: Evidências — Telemetria Lagoa dos Patos (estação 87955000)

Prezados,

Anexo evidências técnicas relativas à consulta de nível para a estação `87955000` da Lagoa dos Patos.

Resumo:
- Data: 2026-06-09
- Consulta via API pública da ANA: sem registros adotados (sem séries operacionais).
- Portal público alternativo (`api-medidas-porto-7bni.onrender.com`) devolve medições associadas a `sensor_1`..`sensor_5`.

Arquivos anexos:
- `ana_87955000.json` — resposta da nossa função `ana-rs` indicando fallback para `sensor_1`.
- `ana_sensor_1.json`, `ana_sensor_2.json` — respostas mostrando erro HTTP 400 ao consultar a API REST da ANA diretamente com esses identificadores.
- `bundle_snippet.txt` — trecho extraído do código mostrando `sensor_*` usados no fallback.

Comandos reproduzíveis (PowerShell):

```powershell
$h=@{apikey='<ANON_KEY>'; Authorization='Bearer <ANON_KEY>'}
Invoke-RestMethod -Uri "https://ykaaxrzkfeaxatrnkkxj.functions.supabase.co/ana-rs?codEstacao=87955000" -Headers $h | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://ykaaxrzkfeaxatrnkkxj.functions.supabase.co/ana-rs?codEstacao=sensor_1" -Headers $h | ConvertTo-Json -Depth 10
```

Pedido:
- Poderiam, por gentileza, verificar se existe uma série adotada para a estação `87955000` ou se houve alteração de identificadores que justifique a ausência de registros adotados? Se houver um mapping interno entre IDs ANA e `sensor_*`, por favor nos orientar como obter as séries adotadas.

Atenciosamente,
Equipe Sentinela-RS
