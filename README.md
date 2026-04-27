# Uptexx Research Agent Automation

Araştırma ajanlarını yöneten, raporları panelde PDF/Excel olarak sunan otomasyon paneli.

> Slack alanları veritabanında hazır tutulur; Slack'e otomatik teslim bu stabilizasyon sürümünde aktif değildir.

**Stack:** Next.js 16 · TypeScript · Prisma · Supabase (PostgreSQL) · Vercel

## Hızlı Başlangıç

### 1. Supabase Kurulumu

1. [supabase.com](https://supabase.com) üzerinden yeni bir proje oluştur
2. **Settings → Database → Connection string** bölümünden bağlantı bilgilerini al
3. `.env.local` dosyası oluştur:

```bash
cp .env.example .env.local
```

4. `DATABASE_URL` ve `DIRECT_URL` alanlarını Supabase bilgileriyle doldur
5. Admin ve job ayarlarını ekle:

```bash
ADMIN_USERNAME="serkangunacti"
ADMIN_PASSWORD="guclu-bir-sifre"
SESSION_SECRET="$(openssl rand -base64 48)"
CRON_SECRET="$(openssl rand -base64 32)"
GITHUB_REPO="serkangunacti/uptexxresearch"
GITHUB_PAT="github-fine-grained-token"
TAVILY_API_KEY="..."
TZ="Europe/Istanbul"
```

### 2. Veritabanını Hazırla

```bash
npm install
npx prisma db push
npm run seed
```

### 3. Çalıştır

```bash
npm run dev
```

Panel: [http://localhost:3000](http://localhost:3000)

## Vercel Deploy

1. GitHub'a push et
2. [vercel.com](https://vercel.com) → New Project → GitHub reposunu seç
3. Environment Variables bölümünde ekle:
   - `DATABASE_URL` — Supabase pooler bağlantısı
   - `DIRECT_URL` — Supabase direkt bağlantısı
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET` — panel girişi
   - `CRON_SECRET` — harici/manual `/api/cron` çağrıları için bearer secret
   - `GITHUB_PAT`, `GITHUB_REPO` — agent run workflow dispatch
   - `TAVILY_API_KEY` — web arama
   - `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL` — rapor üretimi
   - `TZ=Europe/Istanbul` — ajan çalışma saatleri
4. Deploy et

### Cron ve Background Runner

Saatlik zamanlayıcı GitHub Actions `schedule` event'i üzerinden çalışır. Scheduled workflow zamanı gelen ajanlar için veritabanında `QUEUED` run kaydı açar ve aynı workflow'u `workflow_dispatch` ile tetikler. Uzun süren web arama ve MiniMax rapor üretimi GitHub Actions üzerinde çalışır.

### Custom Domain

Vercel Dashboard → Settings → Domains → kendi domain adresini ekle.
DNS ayarlarında Vercel'in verdiği CNAME kaydını domain sağlayıcına ekle.

## Ajanlar

| Ajan | Schedule | Durum |
|------|----------|-------|
| Araştırma Ajanı CRYPTO | Her gün 07:00 | ✅ Aktif |
| Araştırma Ajanı EU | 2 günde bir 08:00 | ✅ Aktif |
| Araştırma Ajanı IT | Her gün 08:30 | ✅ Aktif |
| Araştırma Ajanı AI | Her gün 09:00 | ✅ Aktif |
| Araştırma Ajanı TR | 2 günde bir 10:00 | ✅ Aktif |
| Araştırma Ajanı TR II | 2 günde bir 11:00 | ✅ Aktif |
| Finans Ajanı Crypto | Pasif | ⏸️ Pasif |

## API Endpoints

- `GET /api/health` — Sağlık kontrolü
- `GET /api/agents` — Tüm ajanları listele
- `POST /api/agents/:id/run` — Ajanı manuel çalıştır
- `GET /api/reports` — Son raporları listele
- `GET /api/reports/:id/download` — Rapor PDF indir
- `GET /api/reports/:id/excel` — Rapor Excel indir
- `POST /api/auth/login` — Admin girişi
- `POST /api/auth/logout` — Admin çıkışı
- `GET /api/cron` — Secret ile çalışan harici/manual scheduler endpoint'i

`/api/health`, `/api/auth/login`, `/api/auth/logout` ve `CRON_SECRET` ile çağrılan `/api/cron` dışındaki API endpoint'leri imzalı admin session cookie ister.
