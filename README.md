# Uptexx Research Agent Automation

Araştırma ajanlarını yöneten, raporları Slack'e teslim eden otomasyon paneli.

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
4. Deploy et

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
