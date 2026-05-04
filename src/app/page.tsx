import Link from "next/link";
import { getCurrentUser } from "@/lib/server-auth";
import styles from "./landing.module.css";

const packages = [
  {
    key: "FREE",
    name: "Free",
    price: "0 TL",
    detail: "tek seferlik başlangıç",
    description: "İlk kurulumu görmek ve tek ajan akışını denemek isteyen ekipler için.",
    features: ["1 aktif ajan", "Genel haber ajanı", "Temel rapor akışı", "Panel erişimi"],
  },
  {
    key: "BASIC",
    name: "Basic",
    price: "3.900 TL",
    detail: "aylık",
    description: "Düzenli araştırma yapan küçük ekipler için sade ve hızlı başlangıç paketi.",
    features: ["3 aktif ajan", "Lead TR ve Viral içerik", "Manuel run desteği", "PDF ve Excel çıktı"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "9.900 TL",
    detail: "aylık",
    description: "Araştırmayı satış, finans ve teknoloji tarafında büyütmek isteyen ekipler için.",
    features: ["10 aktif ajan", "Lead Global ve uzman araştırma ajanları", "Gelişmiş görev akışı", "Daha geniş katalog erişimi"],
  },
  {
    key: "PREMIUM",
    name: "Premium",
    price: "24.900 TL",
    detail: "aylık",
    description: "Kendi ajanlarını kurmak ve sistemi şirketine özel kurgulamak isteyen yapılar için.",
    features: ["Sınırsız aktif ajan", "Custom ajan oluşturma", "Tenant özel katalog", "Öncelikli genişleme alanı"],
    featured: true,
  },
];

const steps = [
  {
    title: "Kaynağı seç",
    body: "Web kaynaklarını, platformları ve görev başlıklarını tek ekranda belirle.",
  },
  {
    title: "Ajanı kur",
    body: "Hazır katalog ajanını birkaç ayarla aktif et veya Premium pakette kendi ajanını tasarla.",
  },
  {
    title: "Raporu al",
    body: "Sistem araştırmayı toplar, özetler ve PDF ile Excel olarak sunar.",
  },
];

const capabilities = [
  "Lead araştırma ve firma listesi çıkarma",
  "Teknoloji, IT, finans ve kripto haber takibi",
  "Viral içerik ve futbol analiz raporları",
  "Tenant bazlı API key, model ve ajan yönetimi",
  "Görev, kaynak ve prompt seviyesinde özelleştirme",
  "Rapor arşivi, çalışma geçmişi ve manuel run akışı",
];

function packageLink(packageKey: string, loggedIn: boolean) {
  if (loggedIn) {
    return "/catalog";
  }

  return `/login?next=%2Fcatalog&plan=${packageKey}`;
}

export default async function LandingPage() {
  const session = await getCurrentUser();
  const loggedIn = Boolean(session);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <img src="/uptexx-logo.png" alt="Uptexx" className={styles.logo} />
          <div>
            <strong>Uptexx Research Automation</strong>
            <span>Yapay zeka destekli araştırma ve raporlama platformu</span>
          </div>
        </Link>

        <div className={styles.headerActions}>
          {loggedIn ? (
            <Link href="/dashboard" className={styles.loginButton}>
              Panele Git
            </Link>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              Giriş Yap
            </Link>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Araştırmayı ekip işi olmaktan çıkaran operasyon katmanı</p>
            <h1>Uptexx Research Automation, şirketler için katalog bazlı araştırma ajanları sunar.</h1>
            <p className={styles.heroText}>
              Sistem; satış fırsatlarını, teknoloji gündemini, finans verilerini, kripto sinyallerini ve içerik trendlerini
              takip eden ajanları tek panelde yönetmeni sağlar. Her ajan kendi görevi, kaynağı, prompt yapısı ve rapor
              çıktısıyla çalışır.
            </p>

            <div className={styles.heroActions}>
              <Link href={loggedIn ? "/catalog" : "/login?next=%2Fcatalog"} className={styles.primaryButton}>
                Ajan Kataloğunu Aç
              </Link>
              <a href="#pricing" className={styles.secondaryButton}>
                Paketleri İncele
              </a>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroPanelTop}>
              <span>Kurum içi araştırma akışı</span>
              <strong>Tek panel, çok ajan</strong>
            </div>

            <div className={styles.heroStatGrid}>
              <div className={styles.heroStatCard}>
                <strong>Hazır katalog</strong>
                <span>Lead, haber, finans, viral içerik, futbol analiz</span>
              </div>
              <div className={styles.heroStatCard}>
                <strong>Tenant bazlı yapı</strong>
                <span>Her müşterinin kendi API key, modeli ve ajan seti</span>
              </div>
              <div className={styles.heroStatCard}>
                <strong>Rapor teslimi</strong>
                <span>Özet, bulgular, PDF ve Excel dışa aktarma</span>
              </div>
              <div className={styles.heroStatCard}>
                <strong>Custom genişleme</strong>
                <span>Premium pakette şirketine özel ajan tasarımı</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p>Ne işe yarar</p>
            <h2>Operasyon yükünü araştırma ajanlarına dağıtır.</h2>
          </div>

          <div className={styles.capabilityGrid}>
            {capabilities.map((item) => (
              <div key={item} className={styles.capabilityCard}>
                <span className={styles.capabilityDot} />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p>Nasıl çalışır</p>
            <h2>Kurulumdan rapora giden akış basit tutulur.</h2>
          </div>

          <div className={styles.stepGrid}>
            {steps.map((step, index) => (
              <div key={step.title} className={styles.stepCard}>
                <span className={styles.stepIndex}>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className={styles.section}>
          <div className={styles.sectionHeading}>
            <p>Fiyatlandırma</p>
            <h2>Paketini seç, katalog ajanlarını hemen kullanmaya başla.</h2>
          </div>

          <div className={styles.pricingGrid}>
            {packages.map((pkg) => (
              <article
                key={pkg.key}
                className={`${styles.pricingCard} ${pkg.featured ? styles.pricingCardFeatured : ""}`}
              >
                <div className={styles.pricingHead}>
                  <div>
                    <p className={styles.packageKey}>{pkg.key}</p>
                    <h3>{pkg.name}</h3>
                  </div>
                  {pkg.featured ? <span className={styles.featuredBadge}>Önerilen</span> : null}
                </div>

                <p className={styles.packageDescription}>{pkg.description}</p>

                <div className={styles.priceWrap}>
                  <strong>{pkg.price}</strong>
                  <span>{pkg.detail}</span>
                </div>

                <ul className={styles.featureList}>
                  {pkg.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <Link href={packageLink(pkg.key, loggedIn)} className={styles.buyButton}>
                  Satın Al
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
