/**
 * Stock photography used as section backdrops and topic images until the owner supplies
 * brand photography. All files come from Unsplash under the Unsplash License (free for
 * commercial use, no attribution required) and are stored locally in /public/images/stock.
 * Swap any entry by replacing the file and keeping the key. See docs/image-credits.md.
 */
export type ImageKey =
  | "hero-home"
  | "hero-services"
  | "hero-work"
  | "hero-about"
  | "hero-solutions"
  | "hero-technologies"
  | "hero-process"
  | "hero-contact"
  | "hero-insights"
  | "hero-lab"
  | "hero-careers"
  | "hero-booking"
  | "hero-start"
  | "hero-legal"
  | "custom-software"
  | "websites"
  | "saas"
  | "enterprise"
  | "mobile"
  | "design"
  | "integration"
  | "cloud"
  | "education"
  | "healthcare"
  | "retail"
  | "workforce"
  | "hospitality"
  | "startups"
  | "cta"
  | "team"
  | "consulting"
  | "meeting"
  | "analytics"
  | "code"
  | "payments"
  | "writing"
  | "students"
  | "office"
  | "planning"
  | "server"
  | "phone"
  | "shop"
  | "doctor"
  | "lab";

export type StockImage = { file: string; alt: string; unsplashId: string };

const img = (key: string, unsplashId: string, alt: string): StockImage => ({ file: `/images/stock/${key}.webp`, alt, unsplashId });

export const stockImages: Record<ImageKey, StockImage> = {
  "hero-home": img("hero-home", "1522071820081-009f0129c71c", "A product team working together on laptops around a shared table"),
  "hero-services": img("hero-services", "1498050108023-c5249f4df085", "Source code on a laptop screen in a bright workspace"),
  "hero-work": img("hero-work", "1460925895917-afdab827c52f", "Analytics dashboard open on a laptop"),
  "hero-about": img("hero-about", "1519389950473-47ba0277781c", "Overhead view of a team working on laptops at one table"),
  "hero-solutions": img("hero-solutions", "1497366216548-37526070297c", "Modern office interior with glass partitions"),
  "hero-technologies": img("hero-technologies", "1518770660439-4636190af475", "Close up of a circuit board"),
  "hero-process": img("hero-process", "1542744173-8e7e53415bb0", "A team in a planning meeting with laptops open"),
  "hero-contact": img("hero-contact", "1520607162513-77705c0f0d4a", "A tidy desk with a laptop, phone and coffee"),
  "hero-insights": img("hero-insights", "1434030216411-0b793f4b4173", "A hand writing notes in a notebook beside a coffee"),
  "hero-lab": img("hero-lab", "1581091226825-a6a2a5aee158", "An engineer working at a robotics bench"),
  "hero-careers": img("hero-careers", "1524758631624-e2822e304c36", "A calm modern office lounge"),
  "hero-booking": img("hero-booking", "1517245386807-bb43f82c33c4", "Two people talking across a table with a laptop"),
  "hero-start": img("hero-start", "1557426272-fc759fdf7a8d", "A team planning with sticky notes on a glass wall"),
  "hero-legal": img("hero-legal", "1450101499163-c8848c66ca85", "A person signing a document"),
  "custom-software": img("custom-software", "1555066931-4365d14bab8c", "Code on a dark editor screen"),
  websites: img("websites", "1516321318423-f06f85e504b3", "A person pointing at a website layout on a laptop"),
  saas: img("saas", "1460925895917-afdab827c52f", "A software dashboard with charts on a laptop"),
  enterprise: img("enterprise", "1551288049-bebda4e38f71", "A dark analytics dashboard with usage charts"),
  mobile: img("mobile", "1512941937669-90a1b58e7e9c", "A smartphone home screen full of apps"),
  design: img("design", "1557804506-669a67965ba0", "A designer presenting at a whiteboard to a team"),
  integration: img("integration", "1544197150-b99a580bb7a8", "Network cables plugged into a patch panel"),
  cloud: img("cloud", "1558494949-ef010cbdcc31", "Server racks lit in a data centre"),
  education: img("education", "1523240795612-9a054b0db644", "Students studying together in a library"),
  healthcare: img("healthcare", "1576091160399-112ba8d25d1d", "A clinician holding a phone"),
  retail: img("retail", "1441986300917-64674bd600d8", "A clothing store interior with shelves and rails"),
  workforce: img("workforce", "1504384308090-c894fdcc538d", "A large open plan office full of people at work"),
  hospitality: img("hospitality", "1566073771259-6a8506099945", "A resort pool with loungers at dusk"),
  startups: img("startups", "1579621970563-ebec7560ff3e", "A seedling growing out of a pile of coins"),
  cta: img("cta", "1600880292203-757bb62b4baf", "Two colleagues celebrating with a high five at a desk"),
  team: img("team", "1517048676732-d65bc937f952", "A team working together around a wooden table"),
  consulting: img("consulting", "1556761175-5973dc0f32e7", "A speaker presenting to a seated team in a studio"),
  meeting: img("meeting", "1521737604893-d14cc237f11d", "People in a meeting around laptops"),
  analytics: img("analytics", "1551288049-bebda4e38f71", "A dark analytics dashboard with usage charts"),
  code: img("code", "1498050108023-c5249f4df085", "Source code on a laptop screen"),
  payments: img("payments", "1556745757-8d76bdb6984b", "A card payment on a counter terminal"),
  writing: img("writing", "1553877522-43269d4ea984", "A person working at a laptop in monochrome"),
  students: img("students", "1522202176988-66273c2fd55f", "Students collaborating at a table"),
  office: img("office", "1559136555-9303baea8ebd", "A bright studio office with long desks"),
  planning: img("planning", "1552664730-d307ca884978", "A team planning on a board covered in notes"),
  server: img("server", "1573164713988-8665fc963095", "An engineer walking through a server room"),
  phone: img("phone", "1586953208448-b95a79798f07", "A phone showing an app in soft light"),
  shop: img("shop", "1472851294608-062f824d29cc", "An open sign in a shop window"),
  doctor: img("doctor", "1532938911079-1b06ac7ceec7", "A doctor with a stethoscope"),
  lab: img("lab", "1581091226825-a6a2a5aee158", "An engineer at a robotics workbench"),
};

/** Service slug to topic image. */
export const serviceImage: Record<string, ImageKey> = {
  "custom-software-web-applications": "custom-software",
  "corporate-websites-web-development": "websites",
  "saas-product-engineering": "saas",
  "enterprise-operations-systems": "enterprise",
  "mobile-application-development": "mobile",
  "ui-ux-product-design": "design",
  "api-integration-automation": "integration",
  "cloud-deployment-maintenance-consulting": "cloud",
};

/** Sector slug to topic image. */
export const sectorImage: Record<string, ImageKey> = {
  education: "education",
  healthcare: "healthcare",
  retail: "retail",
  workforce: "workforce",
  "hospitality-services": "hospitality",
  startups: "startups",
};

/** Process step index (01 to 08) to topic image. */
export const processImage: ImageKey[] = ["consulting", "planning", "design", "server", "code", "analytics", "meeting", "cta"];
