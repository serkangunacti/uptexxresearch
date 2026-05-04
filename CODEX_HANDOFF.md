# Uptexx Research Handoff

Bu dosya, projeyi başka bir bilgisayarda kaldığımız yerden devam ettirmek için oluşturuldu.

## Resume Cümlesi

Yeni oturumda şunu yaz:

`Projeyi tanı ve docs/CODEX_HANDOFF.md dosyasına göre kaldığımız yerden devam et.`

## Repo Bilgisi

- Proje adı: `uptexxresearch`
- Yerel çalışma klasörü: `/Users/serkan/Downloads/Projects/Ticket Sistemi`
- GitHub repo: `https://github.com/serkangunacti/uptexxresearch`
- Son doğrulanmış commit: `f0fc7d347d2f0504743d5b39e7cd8c967eee9014`
- Production URL: `https://uptexxresearch.vercel.app`

## Mevcut Durum

Bu proje artık:

- tenant bazlı çalışıyor
- DB tabanlı auth kullanıyor
- kullanıcı, ajan, run, report ve API key kayıtlarını tenant scope ile tutuyor
- provider API key olmadan araştırma başlatmıyor
- API key'leri şifreli saklıyor
- kullanıcı adı veya e-posta ile login kabul ediyor

## Tamamlanan Ana İşler

1. Tek-admin/env tabanlı yapı kaldırıldı.
2. `Company`, `User`, `UserSession`, `InviteToken`, `ApiCredential`, `AgentTemplate`, `Task`, `AgentAssignment`, `AgentSchedule`, `AgentRule`, `AuditLog`, `RateLimitEvent` modelleri eklendi.
3. Seed owner admin tanımlandı:
   - `serkangunacti@kuzeytakip.com`
4. Provider katalogu eklendi:
   - `OpenRouter`
   - `OpenAI`
   - `Anthropic`
   - `MiniMax`
   - `GLM`
   - `Gemini`
   - `Custom OpenAI-Compatible`
5. Global `MINIMAX_*` fallback kaldırıldı.
6. Login düzeltildi:
   - `serkangunacti`
   - `serkangunacti@kuzeytakip.com`
   ikisi de çalışıyor.
7. Tüm mevcut ajanlar silindi.
8. Varsayılan ajanların otomatik yeniden oluşması kapatıldı.

## Şu Anda Sistem Durumu

- Production'da login çalışıyor.
- Production'da ajan listesi boş.
- Kullanıcı giriş yapabiliyor ama henüz hiç ajan yok.
- Bu, bilinçli olarak temiz başlangıç için bırakıldı.

## Sıradaki Net Adım

Bir sonraki iş tek ajanla başlamaktır:

1. `Settings` ekranından bir provider API key ekle
2. tek bir ajan oluştur
3. bu ajanı ilgili API key'e bağla
4. tek bir görev ata
5. tek bir manuel run ile uçtan uca test et

Toplu ajan ekleme yapılmayacak. Önce tek ajan akışı doğrulanacak.

## Önerilen İlk Ajan Akışı

İlk test için en güvenli yol:

1. provider key ekle
2. basit bir araştırma ajanı oluştur
3. kısa bir prompt kullan
4. tek görev bağla
5. manuel run başlat
6. report oluşumunu kontrol et

Bu adım başarıyla geçmeden çoklu ajan kurulumuna geçilmemeli.

## Önemli Teknik Notlar

- `ensureSystemData()` artık şirket, owner kullanıcı ve template kayıtlarını hazırlar.
- Varsayılan ajanları artık seed etmez.
- Bu yüzden silinen ajanlar tekrar kendiliğinden oluşmaz.
- Scheduler ve runner, tenant credential yoksa run başlatmaz.
- Login route `identifier` alanını destekler.

## Env Notları

Bu dosyada secret değerleri tutulmuyor.

Yeni makinede çalışırken gerekli env'leri Vercel veya güvenli kaynak üzerinden yeniden çek:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `APP_ENCRYPTION_KEY`
- `OWNER_ADMIN_PASSWORD`
- `CRON_SECRET`
- `GITHUB_PAT`
- `GITHUB_REPO`
- `TAVILY_API_KEY` (kullanılacaksa)

## Yeni Makinede Devam Etme Akışı

1. repo'yu clone et
2. env'leri güvenli şekilde tanımla
3. `npm install`
4. `npx prisma db push`
5. `npm run seed`
6. `npm run dev` veya deploy hedefi neyse onunla devam et

## Kullanıcıya Göre Çalışma Kuralı

Bu projede bundan sonra parça parça ilerlenmeli.

Yani:

- tek seferde büyük kapsam açılmayacak
- her adım ayrı uygulanacak
- her kritik değişiklikten sonra doğrulama yapılacak

## Son Bırakılan Nokta

Tam burada bırakıldı:

`Ajanların tamamı silindi. Sıradaki adım tek bir API key ekleyip tek bir ajan oluşturmak.`
