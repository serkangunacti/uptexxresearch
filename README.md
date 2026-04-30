# Uptexx Research Agent Automation

Araştırma ajanlarını yöneten, raporları panelde PDF/Excel olarak sunan otomasyon paneli.

> Slack alanları veritabanında hazır tutulur; Slack'e otomatik teslim bu stabilizasyon sürümünde aktif değildir.
> Sistem artık tenant bazlı çalışır. Her admin kendi şirketinin owner hesabıdır ve kendi provider API key'lerini girmeden araştırma başlatamaz.

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
5. Session, encryption ve seed owner ayarlarını ekle:

```bash
OWNER_ADMIN_PASSWORD="guclu-bir-bootstrap-sifre"
SESSION_SECRET="$(openssl rand -base64 48)"
APP_ENCRYPTION_KEY="$(openssl rand -base64 48)"
CRON_SECRET="$(openssl rand -base64 32)"
GITHUB_REPO="serkangunacti/uptexxresearch"
GITHUB_PAT="github-fine-grained-token"
TAVILY_API_KEY="..."
TZ="Europe/Istanbul"
```

İlk seeded owner admin hesabı:

```text
serkangunacti@kuzeytakip.com
```

Bu hesap ilk girişten sonra kendi tenant'ı için provider API key girmeden hiçbir ajanı çalıştıramaz.

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
   - `OWNER_ADMIN_PASSWORD` — ilk owner admin bootstrap parolası
   - `SESSION_SECRET` — imzalı oturum cookie secret'ı
   - `APP_ENCRYPTION_KEY` — tenant API key'lerini AES-256-GCM ile şifrelemek için master secret
   - `CRON_SECRET` — harici/manual `/api/cron` çağrıları için bearer secret
   - `GITHUB_PAT`, `GITHUB_REPO` — agent run workflow dispatch
   - `TAVILY_API_KEY` — web arama
   - `TZ=Europe/Istanbul` — ajan çalışma saatleri
4. Deploy et

### Cron ve Background Runner

Saatlik zamanlayıcı GitHub Actions `schedule` event'i üzerinden çalışır. Scheduled workflow zamanı gelen ajanlar için veritabanında `QUEUED` veya `BLOCKED` run kaydı açar ve yalnızca tenant içinde geçerli provider key varsa `workflow_dispatch` tetikler. Uzun süren web arama ve rapor üretimi GitHub Actions üzerinde çalışır.

## Tenant ve Provider Mantığı

- Her `OWNER_ADMIN` ayrı bir şirket/tenant sahibidir.
- API key'ler tenant bazında şifreli saklanır ve başka tenant oturumlarında görünmez.
- Desteklenen hazır provider katalogu:
  - `OpenRouter`
  - `OpenAI`
  - `Anthropic`
  - `MiniMax`
  - `GLM`
  - `Gemini`
  - `Custom OpenAI-Compatible`
- Admin kendi planına uygun provider key'ini Ayarlar ekranından ekler.
- Global fallback provider yoktur. Sistem env içindeki bir model token'ı ile sessizce araştırma başlatmaz.

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
- `POST /api/auth/login` — Tenant kullanıcısı girişi
- `POST /api/auth/logout` — Çıkış
- `POST /api/auth/invite/accept` — Davet kabul ve ilk şifre oluşturma
- `GET/POST /api/users` — Tenant kullanıcı davet yönetimi
- `GET/POST /api/credentials` — Tenant provider key yönetimi
- `DELETE /api/credentials/:id` — Tenant provider key silme
- `GET/POST /api/tasks` — Görev kütüphanesi yönetimi
- `GET /api/templates` — Ajan şablonları
- `GET /api/cron` — Secret ile çalışan harici/manual scheduler endpoint'i

`/api/health`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/invite/accept` ve `CRON_SECRET` ile çağrılan `/api/cron` dışındaki API endpoint'leri imzalı tenant session cookie ister.
