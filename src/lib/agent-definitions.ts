import type { AgentDefinition } from "./types";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "research-tr",
    slug: "arastirma-ajani-tr",
    name: "Arastirma Ajani TR",
    description: "Turkiye'de IT danismanligi, lisans satisi, Microsoft 365, Azure ve sistem destek firsatlarini arastirir.",
    cadence: "2 gunde bir",
    scheduleLabel: "2 gunde bir 10:00",
    status: "ACTIVE",
    schedule: { hour: 10, minute: 0, everyDays: 2 },
    queries: [
      "\"Microsoft 365\" \"satinalma\" \"teklif\" Turkiye",
      "\"Azure\" \"bakim destek\" \"teklif\" Turkiye",
      "\"IT danismanligi\" \"ihale\" Turkiye",
      "\"sistem bakim destek\" \"aylik\" \"firma\""
    ],
    prompt:
      "Turkiye pazarinda Uptexx icin potansiyel musteri olabilecek IT danismanligi, lisans satisi, Microsoft 365, Azure, bakim ve sistem destek taleplerini bul. Kaynak linki, ihtiyac sinyali ve oncelik skoru ver."
  },
  {
    id: "research-tr-sme",
    slug: "arastirma-ajani-tr-ii",
    name: "Arastirma Ajani TR II",
    description: "500 kullaniciya kadar olabilecek Turkiye firmalarini listeler ve iletisim bilgilerini zenginlestirir.",
    cadence: "2 gunde bir",
    scheduleLabel: "2 gunde bir 11:00",
    status: "ACTIVE",
    schedule: { hour: 11, minute: 0, everyDays: 2 },
    queries: [
      "\"calisan sayisi\" \"50\" \"500\" \"Turkiye\" \"iletisim\"",
      "\"Microsoft is ortagi\" \"Turkiye\" \"iletisim\"",
      "\"sanayi\" \"teknoloji\" \"iletisim\" \"Turkiye\"",
      "\"firma\" \"bilgi teknolojileri\" \"iletisim\" \"Turkiye\""
    ],
    prompt:
      "Turkiye'de 500 kullaniciya kadar olabilecek firmalari bul. Firma adi, adres, telefon, web sitesi, e-posta varsa e-posta, sektor, kullanici sayisi tahmini ve kaynak guven skoru uret. Ayni firmayi tekrar etme."
  },
  {
    id: "research-eu",
    slug: "arastirma-ajani-eu",
    name: "Arastirma Ajani EU",
    description: "Avrupa odakli yazilim proje danismanligi ve freelance is firsatlarini arastirir.",
    cadence: "2 gunde bir",
    scheduleLabel: "2 gunde bir 08:00",
    status: "ACTIVE",
    schedule: { hour: 8, minute: 0, everyDays: 2 },
    queries: [
      "site:upwork.com/jobs software consultant Europe hourly 40",
      "site:freelancer.com/projects software consultant Europe",
      "\"software consulting\" \"hourly\" \"$40\" Europe",
      "\"Azure\" \"consultant\" \"hourly\" Europe"
    ],
    prompt:
      "Avrupa odakli donemsel veya proje bazli yazilim danismanligi islerini bul. Saatlik 40 USD altindaki ilanlari rapora alma. Upwork/Freelancer benzeri kaynaklarda proje ozeti, butce, saatlik oran, musteri sinyali ve basvuru onerisi ver."
  },
  {
    id: "research-ai",
    slug: "arastirma-ajani-ai",
    name: "Arastirma Ajani AI",
    description: "AI model, fiyat, release, benchmark ve urun guncellemelerini gunluk raporlar.",
    cadence: "Her gun",
    scheduleLabel: "Her gun 09:00",
    status: "ACTIVE",
    schedule: { hour: 9, minute: 0, everyDays: 1 },
    queries: [
      "AI model release pricing update today OpenAI Anthropic Google Meta",
      "site:openai.com blog model pricing API update",
      "site:anthropic.com news model pricing API update",
      "site:ai.google.dev Gemini release pricing"
    ],
    prompt:
      "Dunyadaki AI model ve platform guncellemelerini topla. Yeni model, fiyat degisikligi, API ozelligi, benchmark veya onemli urun duyurusunu kaynak linkleriyle raporla."
  },
  {
    id: "research-crypto",
    slug: "arastirma-ajani-crypto",
    name: "Arastirma Ajani CRYPTO",
    description: "Kripto haberleri, piyasa sinyalleri, buyuk transferler ve Polymarket beklentilerini gunluk raporlar.",
    cadence: "Her gun",
    scheduleLabel: "Her gun 07:00",
    status: "ACTIVE",
    schedule: { hour: 7, minute: 0, everyDays: 1 },
    queries: [
      "crypto market news today whale transfer cold wallet",
      "Polymarket crypto bitcoin ethereum market odds",
      "Bitcoin Ethereum market forecast today",
      "crypto exchange reserve inflow outflow news"
    ],
    prompt:
      "Kripto piyasasindaki onemli gelismeleri, yukselis/dusus sinyallerini, buyuk transferleri, Polymarket beklentilerini ve riskleri ozetle. Finansal tavsiye verme; arastirma ve risk sinyali formatinda raporla."
  },
  {
    id: "finance-crypto",
    slug: "finans-ajani-crypto",
    name: "Finans Ajani Crypto",
    description: "Gelecekte Binance islemleri icin ayrilmis pasif ajan. Simdilik hicbir trade islemi yapmaz.",
    cadence: "Pasif",
    scheduleLabel: "Schedule yok",
    status: "PAUSED",
    queries: [],
    prompt:
      "Pasif ajan. Arastirma Ajani CRYPTO raporlarini gelecekte okuyacak; simdilik trade, API emir veya otomatik karar yok."
  },
  {
    id: "research-it",
    slug: "arastirma-ajani-it",
    name: "Arastirma Ajani IT",
    description: "Teknoloji dunyasi urun lansmanlari, yonetici degisimleri ve kurumsal gelismeleri gunluk raporlar.",
    cadence: "Her gun",
    scheduleLabel: "Her gun 08:30",
    status: "ACTIVE",
    schedule: { hour: 8, minute: 30, everyDays: 1 },
    queries: [
      "IT product launch executive appointment technology news today",
      "Microsoft Google AWS product launch executive change",
      "enterprise IT news leadership change product release",
      "technology company appoints CEO CTO CIO today"
    ],
    prompt:
      "IT dunyasindaki son gelismeleri, urun lansmanlarini, ust duzey yonetici atamalarini/gorevden ayrilmalari ve kurumsal teknoloji haberlerini kaynak linkleriyle ozetle."
  }
];

export function getAgentDefinition(agentId: string) {
  return AGENT_DEFINITIONS.find((agent) => agent.id === agentId || agent.slug === agentId);
}
