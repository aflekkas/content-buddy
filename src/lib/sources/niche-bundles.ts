export type NicheBundleFeed = {
  url: string;
  title: string;
};

export type NicheBundle = {
  id: string;
  label: string;
  description: string;
  feeds: NicheBundleFeed[];
};

export const NICHE_BUNDLES: NicheBundle[] = [
  {
    id: "ai-ml",
    label: "AI / ML",
    description: "Frontier model launches, research, and infra ops.",
    feeds: [
      { url: "https://openai.com/news/rss.xml", title: "OpenAI" },
      {
        url: "https://www.anthropic.com/news/rss.xml",
        title: "Anthropic news",
      },
      { url: "https://huggingface.co/blog/feed.xml", title: "Hugging Face" },
      { url: "https://simonwillison.net/atom/everything/", title: "Simon Willison" },
    ],
  },
  {
    id: "saas-founders",
    label: "B2B SaaS founders",
    description: "Indie & seed-stage SaaS, growth tactics, pricing.",
    feeds: [
      { url: "https://www.indiehackers.com/feed.xml", title: "Indie Hackers" },
      { url: "https://www.lennysnewsletter.com/feed", title: "Lenny's Newsletter" },
      { url: "https://stratechery.com/feed/", title: "Stratechery" },
    ],
  },
  {
    id: "devtools",
    label: "DevTools",
    description: "Engineering platforms, IDE/agent tooling, dev infra.",
    feeds: [
      { url: "https://blog.cloudflare.com/rss/", title: "Cloudflare blog" },
      { url: "https://github.blog/feed/", title: "GitHub blog" },
      { url: "https://vercel.com/atom", title: "Vercel" },
    ],
  },
  {
    id: "product-management",
    label: "Product management",
    description: "PM craft, frameworks, big-product post-mortems.",
    feeds: [
      { url: "https://www.lennysnewsletter.com/feed", title: "Lenny's Newsletter" },
      { url: "https://blog.pragmaticengineer.com/rss/", title: "Pragmatic Engineer" },
      {
        url: "https://www.reforge.com/blog/rss.xml",
        title: "Reforge blog",
      },
    ],
  },
  {
    id: "engineering-leadership",
    label: "Engineering leadership",
    description: "Eng management, scaling teams, hiring & culture.",
    feeds: [
      { url: "https://blog.pragmaticengineer.com/rss/", title: "Pragmatic Engineer" },
      { url: "https://lethain.com/feeds/", title: "Will Larson" },
      { url: "https://www.elidedbranches.com/feeds/posts/default", title: "Elided Branches" },
    ],
  },
  {
    id: "design-leadership",
    label: "Design leadership",
    description: "Design systems, craft, and design ops.",
    feeds: [
      { url: "https://uxdesign.cc/feed", title: "UX Collective" },
      { url: "https://uxplanet.org/feed", title: "UX Planet" },
      { url: "https://alistapart.com/main/feed/", title: "A List Apart" },
    ],
  },
  {
    id: "fintech",
    label: "FinTech",
    description: "Payments, banking infra, crypto rails, regulation.",
    feeds: [
      { url: "https://fintechbusinessweekly.substack.com/feed", title: "Fintech Business Weekly" },
      { url: "https://newsletter.fintechtakes.com/feed", title: "Fintech Takes" },
      { url: "https://www.thefintechblueprint.com/feed", title: "Fintech Blueprint" },
    ],
  },
  {
    id: "climate-tech",
    label: "Climate tech",
    description: "Energy, carbon, climate startups, policy.",
    feeds: [
      { url: "https://www.canarymedia.com/feeds/all.rss", title: "Canary Media" },
      { url: "https://heatmap.news/feed", title: "Heatmap News" },
      { url: "https://www.latitudemedia.com/news/rss.xml", title: "Latitude Media" },
    ],
  },
  {
    id: "creator-economy",
    label: "Creator economy",
    description: "Solopreneurs, audience building, monetization.",
    feeds: [
      { url: "https://every.to/feed.xml", title: "Every" },
      { url: "https://www.workweek.com/feed/", title: "Workweek" },
      { url: "https://creatoreconomy.so/feed", title: "Creator Economy" },
    ],
  },
  {
    id: "marketing-leadership",
    label: "Marketing leadership",
    description: "Brand, growth, content & demand-gen for B2B.",
    feeds: [
      { url: "https://marketingexamples.com/rss.xml", title: "Marketing Examples" },
      { url: "https://www.demandcurve.com/blog/rss.xml", title: "Demand Curve" },
      { url: "https://www.marketingbrew.com/feed", title: "Marketing Brew" },
    ],
  },
  {
    id: "sales-leadership",
    label: "B2B sales leadership",
    description: "Outbound, deal motion, pipeline & RevOps.",
    feeds: [
      { url: "https://www.salesweekly.com/feed/", title: "Sales Weekly" },
      { url: "https://salesblink.io/feed", title: "SalesBlink" },
      { url: "https://www.lennysnewsletter.com/feed", title: "Lenny's Newsletter" },
    ],
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    description: "Threat intel, vulns, AppSec & cloud-native security.",
    feeds: [
      { url: "https://krebsonsecurity.com/feed/", title: "Krebs on Security" },
      { url: "https://www.schneier.com/feed/atom/", title: "Schneier on Security" },
      { url: "https://www.darkreading.com/rss.xml", title: "Dark Reading" },
    ],
  },
];
