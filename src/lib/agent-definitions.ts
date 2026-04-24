import type { AgentDefinition } from "./types";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "research-tr",
    slug: "arastirma-ajani-tr",
    name: "Araştırma Ajanı TR",
    description: "Türkiye'de IT danışmanlığı, lisans satışı, Microsoft 365, Azure ve sistem destek fırsatlarını araştırır.",
    cadence: "2 günde bir",
    scheduleLabel: "2 günde bir 10:00",
    status: "ACTIVE",
    schedule: { hour: 10, minute: 0, everyDays: 2 },
    queries: [
      "\"Microsoft 365\" \"satınalma\" \"teklif\" Türkiye",
      "\"Azure\" \"bakım destek\" \"teklif\" Türkiye",
      "\"IT danışmanlığı\" \"ihale\" Türkiye",
      "\"sistem bakım destek\" \"aylık\" \"firma\""
    ],
    prompt:
      "Türkiye pazarında Uptexx için potansiyel müşteri olabilecek IT danışmanlığı, lisans satışı, Microsoft 365, Azure, bakım ve sistem destek taleplerini bul. Kaynak linki, ihtiyaç sinyali ve öncelik skoru ver."
  },
  {
    id: "research-tr-sme",
    slug: "arastirma-ajani-tr-ii",
    name: "Araştırma Ajanı TR II",
    description: "500 kullanıcıya kadar olabilecek Türkiye firmalarını listeler ve iletişim bilgilerini zenginleştirir.",
    cadence: "2 günde bir",
    scheduleLabel: "2 günde bir 11:00",
    status: "ACTIVE",
    schedule: { hour: 11, minute: 0, everyDays: 2 },
    queries: [
      "\"çalışan sayısı\" \"50\" \"500\" \"Türkiye\" \"iletişim\"",
      "\"Microsoft iş ortağı\" \"Türkiye\" \"iletişim\"",
      "\"sanayi\" \"teknoloji\" \"iletişim\" \"Türkiye\"",
      "\"firma\" \"bilgi teknolojileri\" \"iletişim\" \"Türkiye\""
    ],
    prompt:
      "Türkiye'de 500 kullanıcıya kadar olabilecek firmaları bul. Firma adı, adres, telefon, web sitesi, e-posta varsa e-posta, sektör, kullanıcı sayısı tahmini ve kaynak güven skoru üret. Aynı firmayı tekrar etme."
  },
  {
    id: "research-eu",
    slug: "arastirma-ajani-eu",
    name: "Araştırma Ajanı EU",
    description: "Avrupa odaklı yazılım proje danışmanlığı ve freelance iş fırsatlarını araştırır.",
    cadence: "2 günde bir",
    scheduleLabel: "2 günde bir 08:00",
    status: "ACTIVE",
    schedule: { hour: 8, minute: 0, everyDays: 2 },
    queries: [
      "site:upwork.com/jobs software consultant Europe hourly 40",
      "site:freelancer.com/projects software consultant Europe",
      "\"software consulting\" \"hourly\" \"$40\" Europe",
      "\"Azure\" \"consultant\" \"hourly\" Europe"
    ],
    prompt:
      "Avrupa odaklı dönemsel veya proje bazlı yazılım danışmanlığı işlerini bul. Saatlik 40 USD altındaki ilanları rapora alma. Upwork/Freelancer benzeri kaynaklarda proje özeti, bütçe, saatlik oran, müşteri sinyali ve başvuru önerisi ver."
  },
  {
    id: "research-ai",
    slug: "arastirma-ajani-ai",
    name: "Araştırma Ajanı AI",
    description: "AI model, fiyat, release, benchmark ve ürün güncellemelerini günlük raporlar.",
    cadence: "Her gün",
    scheduleLabel: "Her gün 09:00",
    status: "ACTIVE",
    schedule: { hour: 9, minute: 0, everyDays: 1 },
    queries: [
      "AI model release pricing update today OpenAI Anthropic Google Meta",
      "site:openai.com blog model pricing API update",
      "site:anthropic.com news model pricing API update",
      "site:ai.google.dev Gemini release pricing"
    ],
    prompt:
      "Dünyadaki AI model ve platform güncellemelerini topla. Yeni model, fiyat değişikliği, API özelliği, benchmark veya önemli ürün duyurusunu kaynak linkleriyle raporla."
  },
  {
    id: "research-crypto",
    slug: "arastirma-ajani-crypto",
    name: "Araştırma Ajanı CRYPTO",
    description: "Kripto haberleri, piyasa sinyalleri, büyük transferler ve Polymarket beklentilerini günlük raporlar.",
    cadence: "Her gün",
    scheduleLabel: "Her gün 07:00",
    status: "ACTIVE",
    schedule: { hour: 7, minute: 0, everyDays: 1 },
    queries: [
      "crypto market news today whale transfer cold wallet",
      "Polymarket crypto bitcoin ethereum market odds",
      "Bitcoin Ethereum market forecast today",
      "crypto exchange reserve inflow outflow news"
    ],
    prompt:
      "Kripto piyasasındaki önemli gelişmeleri, yükseliş/düşüş sinyallerini, büyük transferleri, Polymarket beklentilerini ve riskleri özetle. Finansal tavsiye verme; araştırma ve risk sinyali formatında raporla."
  },
  {
    id: "finance-crypto",
    slug: "finans-ajani-crypto",
    name: "Finans Ajanı Crypto",
    description: "Gelecekte Binance işlemleri için ayrılmış pasif ajan. Şimdilik hiçbir trade işlemi yapmaz.",
    cadence: "Pasif",
    scheduleLabel: "Zamanlama yok",
    status: "PAUSED",
    queries: [],
    prompt:
      "Pasif ajan. Araştırma Ajanı CRYPTO raporlarını gelecekte okuyacak; şimdilik trade, API emir veya otomatik karar yok."
  },
  {
    id: "research-it",
    slug: "arastirma-ajani-it",
    name: "Araştırma Ajanı IT",
    description: "Teknoloji dünyası ürün lansmanları, yönetici değişimleri ve kurumsal gelişmeleri günlük raporlar.",
    cadence: "Her gün",
    scheduleLabel: "Her gün 08:30",
    status: "ACTIVE",
    schedule: { hour: 8, minute: 30, everyDays: 1 },
    queries: [
      "IT product launch executive appointment technology news today",
      "Microsoft Google AWS product launch executive change",
      "enterprise IT news leadership change product release",
      "technology company appoints CEO CTO CIO today"
    ],
    prompt:
      "IT dünyasındaki son gelişmeleri, ürün lansmanlarını, üst düzey yönetici atamalarını/görevden ayrılmaları ve kurumsal teknoloji haberlerini kaynak linkleriyle özetle."
  }
];

export function getAgentDefinition(agentId: string) {
  return AGENT_DEFINITIONS.find((agent) => agent.id === agentId || agent.slug === agentId);
}
