# Sentinela·RS — ANA integration (scaffold)

Arquivos criados em `sentinela/ana`:

- `__init__.py` — pacote
- `config.py` — leitura de env vars
- `auth.py` — gerencia token OAuth (cache 55 min)
- `estacoes.py` — consulta inventário (`HidroInventarioEstacoes/v1`)
- `nivel.py` — consulta série adotada (`HidroinfoanaSerieTelemetricaAdotada/v1`)
- `diagnostico.py` — lógica de diagnóstico de causa
- `run_check.py` — script CLI para testar as três estações

Como testar (PowerShell):

```powershell
$env:ANA_HIDROWS_IDENTIFICADOR='05752529794'
$env:ANA_HIDROWS_SENHA='6kq3xjir'
python -m sentinela.ana.run_check
```

Notas:
- NÃO commitar credenciais. Use variáveis de ambiente no CI/servidor.
- O scaffold usa apenas biblioteca padrão do Python.
- O script `run_check.py` é um teste rápido; ele imprime os payloads brutos retornados pela ANA.
