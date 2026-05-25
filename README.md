# Sentinel·RS — Monitor de Catástrofes

Sistema de monitoramento de eventos extremos para o Rio Grande do Sul.  
Stack: React + Vite → GitHub Pages · Supabase (banco + Edge Functions + Realtime)

---

## Stack

| Camada | Tecnologia | Custo |
|---|---|---|
| Frontend | React + Vite | Gratuito |
| Hospedagem | GitHub Pages | Gratuito |
| Banco de dados | Supabase PostgreSQL | Gratuito |
| Backend / cron | Supabase Edge Functions | Gratuito |
| Push notifications | Web Push API (PWA nativa) | Gratuito |
| Meteorologia | Open-Meteo API | Gratuito |
| **Total** | | **R$ 0/mês** |

---

## Setup passo a passo

### 1. Clone e instale dependências

```bash
git clone https://github.com/SEU_USUARIO/sentinel-rs
cd sentinel-rs
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [app.supabase.com](https://app.supabase.com)
2. Vá em **SQL Editor** e execute o arquivo `supabase/migrations/001_initial.sql`
3. Anote a **URL** e a **anon key** (Settings → API)

### 3. Gere as VAPID keys (para push notifications)

```bash
npx web-push generate-vapid-keys
```

Guarde:
- `Public Key` → vai no `.env` como `VITE_VAPID_PUBLIC_KEY`
- `Private Key` → vai **somente** nas variáveis de ambiente do Supabase

### 4. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas chaves
```

### 5. Configure variáveis no Supabase (Edge Functions)

Em **Settings → Edge Functions → Secrets**, adicione:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` → `mailto:seuemail@exemplo.com`

### 6. Deploy das Edge Functions

```bash
# Instale o Supabase CLI se não tiver
npm install -g supabase

supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy poll-apis
supabase functions deploy send-alerts
```

### 7. Configure o cron (polling a cada 30min)

No SQL Editor do Supabase:

```sql
select cron.schedule(
  'poll-sentinel',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJETO.supabase.co/functions/v1/poll-apis',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )
  $$
);
```

### 8. Deploy no GitHub Pages

No `package.json`, o campo `homepage` já está configurado. Basta:

```bash
npm run deploy
```

Isso faz o build e publica na branch `gh-pages` automaticamente.

Ative o GitHub Pages em:  
**Repositório → Settings → Pages → Source: gh-pages branch**

---

## Atualizar o app

```bash
# Faça suas alterações, então:
npm run deploy
```

---

## Integrações futuras planejadas

- **ANA/HidroWeb** — nível real da Lagoa dos Patos (token gratuito em snirh.gov.br)
- **INMET** — estações automáticas RS (portal.inmet.gov.br → API)
- **CEMADEN** — municípios em risco (cemaden.gov.br)
- **Defesa Civil RS** — alertas oficiais via RSS (alertas.rs.gov.br)
- **Copernicus** — imagens de satélite de alagamentos

---

## Estrutura do projeto

```
sentinel-rs/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service Worker (push notifications)
├── src/
│   ├── lib/supabase.js        # Cliente Supabase
│   ├── hooks/usePush.js       # Hook push notifications
│   ├── App.jsx                # App principal
│   └── main.jsx               # Entry point
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql    # Schema do banco
│   └── functions/
│       ├── poll-apis/         # Cron: busca APIs a cada 30min
│       └── send-alerts/       # Dispara push para inscritos
├── .env.example
├── vite.config.js
└── package.json
```
