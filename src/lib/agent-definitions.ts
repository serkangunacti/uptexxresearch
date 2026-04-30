import type { AgentTemplateSeed, DefaultAgentSeed } from "./types";

export const AGENT_TEMPLATE_SEEDS: AgentTemplateSeed[] = [
  {
    id: "sales-research",
    name: "Satış Fırsatı Araştırma",
    category: "sales",
    description: "Potansiyel müşterileri, ihale ve teklif sinyallerini toplar.",
    defaultPrompt:
      "Şirket için potansiyel müşteri olabilecek fırsatları, ihtiyaç sinyallerini ve iletişim izlerini topla. Aynı kurum veya aynı kaynağı tekrar etme. Sadece son 7 gün içinde yayınlanan kaynakları kullan.",
    defaultQueries: [
      "IT danışmanlığı teklif ihale satınalma son 7 gün Türkiye",
      "Microsoft 365 Azure bakım destek talebi son 7 gün Türkiye",
      "kurumsal yazılım danışmanlığı teklif son 7 gün"
    ],
    defaultTasks: [
      {
        name: "Fırsat sinyallerini topla",
        category: "sales",
        description: "Talep, ihale, teklif veya ihtiyaç sinyallerini çıkartır.",
        instruction: "Yeni fırsat sinyallerini kaynak linkleriyle çıkart ve özetle.",
      },
      {
        name: "Müşteri önceliği puanla",
        category: "sales",
        description: "Firma veya iş fırsatı için öncelik puanı üretir.",
        instruction: "Her fırsat için gerekçeli öncelik puanı üret.",
      },
    ],
    defaultSchedule: {
      hour: 10,
      minute: 0,
      timezone: "Europe/Istanbul",
      intervalDays: 2,
    },
    defaultRule: {
      maxRunsPerDay: 1,
      maxRunsPerWeek: 4,
      maxSourceAgeDays: 7,
      dedupeLookbackDays: 7,
      preventDuplicates: true,
    },
    suggestedProvider: "OPENROUTER",
  },
  {
    id: "market-news",
    name: "Pazar ve Haber Takibi",
    category: "news",
    description: "AI, IT ve pazar haberlerini takip eder.",
    defaultPrompt:
      "Belirlenen alanla ilgili son 7 günde yayınlanan önemli haberleri, ürün duyurularını ve fiyat değişimlerini topla. Tekrarlayan haberleri çıkar.",
    defaultQueries: [
      "AI model release pricing update last 7 days",
      "enterprise IT product launch executive change last 7 days",
      "OpenAI Anthropic Google Meta product update last 7 days"
    ],
    defaultTasks: [
      {
        name: "Haber özeti çıkar",
        category: "news",
        description: "Son haberleri kısa özetler halinde çıkarır.",
        instruction: "Her bulguyu bir yönetici özeti gibi yaz.",
      },
      {
        name: "Risk ve fırsat analizi",
        category: "news",
        description: "Haberi iş etkisine göre yorumlar.",
        instruction: "Haberin iş etkisini, fırsat ve riskiyle birlikte belirt.",
      },
    ],
    defaultSchedule: {
      hour: 9,
      minute: 0,
      timezone: "Europe/Istanbul",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    },
    defaultRule: {
      maxRunsPerDay: 1,
      maxRunsPerWeek: 7,
      maxSourceAgeDays: 7,
      dedupeLookbackDays: 7,
      preventDuplicates: true,
    },
    suggestedProvider: "OPENROUTER",
  },
  {
    id: "operations-research",
    name: "Operasyon ve Destek Takibi",
    category: "operations",
    description: "Operasyonel süreçleri ve destek gereksinimlerini araştırır.",
    defaultPrompt:
      "Kurumsal operasyon, destek ve bakım süreçleriyle ilgili yeni ihtiyaç sinyallerini bul. Son 7 gün dışındaki içerikleri kullanma.",
    defaultQueries: [
      "sistem bakım destek talebi son 7 gün",
      "outsource IT destek ihtiyacı son 7 gün",
      "operasyon iyileştirme teknoloji partner son 7 gün"
    ],
    defaultTasks: [
      {
        name: "Operasyon ihtiyacı çıkar",
        category: "operations",
        description: "Operasyonel ihtiyaçları sınıflandırır.",
        instruction: "İhtiyacı, kapsamını ve olası çözüm yönünü kısa yaz.",
      },
    ],
    defaultSchedule: {
      hour: 8,
      minute: 30,
      timezone: "Europe/Istanbul",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    defaultRule: {
      maxRunsPerDay: 1,
      maxRunsPerWeek: 5,
      maxSourceAgeDays: 7,
      dedupeLookbackDays: 7,
      preventDuplicates: true,
    },
    suggestedProvider: "OPENROUTER",
  },
  {
    id: "football-analysis",
    name: "Futbol Analizi",
    category: "sports",
    description: "Günün maçlarını, geçmiş istatistikleri ve takım durumlarını analiz eder.",
    defaultPrompt:
      "Günün maçlarını topla. Son 7 gün içindeki haberleri, sakat-cezalı bilgilerini, lig sıralamasını, son form grafiğini ve geçmiş karşılaşmaları kullanarak güncel analiz yaz. Eski veya tekrarlanan içerikleri tekrar etme.",
    defaultQueries: [
      "today football fixtures league standings injuries suspensions last 7 days",
      "head to head football match preview injuries standings last 7 days",
      "team news injuries suspensions match preview today football"
    ],
    defaultTasks: [
      {
        name: "Maç listesi çıkar",
        category: "sports",
        description: "Günün maçlarını toplar.",
        instruction: "Önce günün maçlarını lig ve saat bilgisiyle listele.",
      },
      {
        name: "Karşılaştırmalı analiz yaz",
        category: "sports",
        description: "Takımları kıyaslayarak analiz üretir.",
        instruction: "Form, kadro, eksikler, puan durumu ve geçmiş maçlara göre karşılaştırmalı analiz yaz.",
      },
    ],
    defaultSchedule: {
      hour: 11,
      minute: 0,
      timezone: "Europe/Istanbul",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    },
    defaultRule: {
      maxRunsPerDay: 2,
      maxRunsPerWeek: 14,
      maxSourceAgeDays: 7,
      dedupeLookbackDays: 7,
      preventDuplicates: true,
    },
    suggestedProvider: "OPENROUTER",
  },
  {
    id: "finance-market",
    name: "Finans ve Kripto Takibi",
    category: "finance",
    description: "Piyasa haberlerini ve sinyallerini izler.",
    defaultPrompt:
      "Son 7 günde yayınlanan piyasa haberlerini, büyük hareketleri ve risk sinyallerini özetle. Finansal tavsiye verme.",
    defaultQueries: [
      "crypto market news last 7 days whale transfer",
      "bitcoin ethereum market outlook last 7 days",
      "financial market signal macro risk last 7 days"
    ],
    defaultTasks: [
      {
        name: "Piyasa sinyali topla",
        category: "finance",
        description: "Piyasa sinyallerini özetler.",
        instruction: "Yükseliş/düşüş sinyallerini ve riskleri listele.",
      },
    ],
    defaultSchedule: {
      hour: 7,
      minute: 0,
      timezone: "Europe/Istanbul",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    },
    defaultRule: {
      maxRunsPerDay: 1,
      maxRunsPerWeek: 7,
      maxSourceAgeDays: 7,
      dedupeLookbackDays: 7,
      preventDuplicates: true,
    },
    suggestedProvider: "OPENROUTER",
  },
];

export const DEFAULT_AGENT_SEEDS: DefaultAgentSeed[] = [
  {
    templateId: "sales-research",
    slug: "arastirma-ajani-tr",
    name: "Araştırma Ajanı TR",
    description: "Türkiye'de IT danışmanlığı, lisans satışı, Microsoft 365 ve Azure fırsatlarını araştırır.",
    modelProvider: "OPENROUTER",
    modelName: "openai/gpt-4.1-mini",
  },
  {
    templateId: "sales-research",
    slug: "arastirma-ajani-tr-ii",
    name: "Araştırma Ajanı TR II",
    description: "Türkiye'de KOBİ ölçekli IT fırsatlarını araştırır.",
    modelProvider: "OPENROUTER",
    modelName: "openai/gpt-4.1-mini",
  },
  {
    templateId: "sales-research",
    slug: "arastirma-ajani-eu",
    name: "Araştırma Ajanı EU",
    description: "Avrupa yazılım danışmanlığı ve freelance fırsatlarını araştırır.",
    modelProvider: "OPENROUTER",
    modelName: "openai/gpt-4.1-mini",
  },
  {
    templateId: "market-news",
    slug: "arastirma-ajani-ai",
    name: "Araştırma Ajanı AI",
    description: "AI model, fiyat, benchmark ve ürün güncellemelerini raporlar.",
    modelProvider: "OPENROUTER",
    modelName: "anthropic/claude-3.5-sonnet",
  },
  {
    templateId: "finance-market",
    slug: "arastirma-ajani-crypto",
    name: "Araştırma Ajanı CRYPTO",
    description: "Kripto haberleri ve piyasa sinyallerini raporlar.",
    modelProvider: "OPENROUTER",
    modelName: "openai/gpt-4.1-mini",
  },
  {
    templateId: "operations-research",
    slug: "arastirma-ajani-it",
    name: "Araştırma Ajanı IT",
    description: "Teknoloji dünyası ürün lansmanları ve kurumsal gelişmeleri izler.",
    modelProvider: "OPENROUTER",
    modelName: "openai/gpt-4.1-mini",
  },
  {
    templateId: "football-analysis",
    slug: "futbol-analiz-ajani",
    name: "Futbol Analiz Ajanı",
    description: "Günün maçlarını ve takım verilerini karşılaştırmalı analiz eder.",
    modelProvider: "OPENROUTER",
    modelName: "anthropic/claude-3.5-sonnet",
  },
];

export function getTemplateSeed(templateId: string) {
  return AGENT_TEMPLATE_SEEDS.find((template) => template.id === templateId);
}
