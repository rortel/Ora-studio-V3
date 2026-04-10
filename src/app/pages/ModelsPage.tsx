import { motion } from "motion/react";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Image as ImageIcon, Video, Type, Music, Sparkles } from "lucide-react";
import { useI18n } from "../lib/i18n";

type Tier = "economy" | "standard" | "premium";
type Category = "text" | "image" | "video" | "music";

interface ModelDef {
  id: string;
  name: string;
  provider: string;
  category: Category;
  tier: Tier;
  badge: string;
  bestFor: string;
  bestForFr: string;
  strengths: string[];
}

/* ── Catalogue (aligned with /hub/compare) ── */
const MODELS: ModelDef[] = [
  // ── TEXT ──
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", category: "text", tier: "premium", badge: "Flagship", bestFor: "Complex reasoning & long form", bestForFr: "Raisonnement complexe et format long", strengths: ["reasoning", "creativity"] },
  { id: "claude-opus", name: "Claude Opus 4.6", provider: "Anthropic", category: "text", tier: "premium", badge: "Best Writer", bestFor: "Strategic copy & long essays", bestForFr: "Copy stratégique et longs contenus", strengths: ["depth", "strategy"] },
  { id: "claude-sonnet", name: "Claude Sonnet 4.6", provider: "Anthropic", category: "text", tier: "standard", badge: "Balanced", bestFor: "Daily copy & analysis", bestForFr: "Copy quotidien et analyse", strengths: ["balanced", "analysis"] },
  { id: "gemini-pro", name: "Gemini 2.5 Pro", provider: "Google", category: "text", tier: "standard", badge: "Multimodal", bestFor: "Data-driven content", bestForFr: "Contenu data-driven", strengths: ["multimodal", "factual"] },
  { id: "gemini-flash", name: "Gemini 2.5 Flash", provider: "Google", category: "text", tier: "economy", badge: "Fast", bestFor: "High volume short copy", bestForFr: "Copy courts en volume", strengths: ["speed", "cheap"] },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", category: "text", tier: "economy", badge: "Open", bestFor: "Budget-friendly generalist", bestForFr: "Généraliste low-cost", strengths: ["affordable", "technical"] },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "text", tier: "premium", badge: "Deep Think", bestFor: "Advanced reasoning", bestForFr: "Raisonnement avancé", strengths: ["reasoning", "depth"] },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", category: "text", tier: "economy", badge: "Open", bestFor: "Multilingual, cheap", bestForFr: "Multilingue économique", strengths: ["multilingual", "speed"] },
  { id: "qwen-2.5-72b", name: "Qwen 2.5 72B", provider: "Alibaba", category: "text", tier: "economy", badge: "FR Native", bestFor: "Native French content", bestForFr: "Contenu français natif", strengths: ["multilingual", "french"] },
  { id: "kimi-k2", name: "Kimi K2", provider: "Moonshot", category: "text", tier: "standard", badge: "Long Context", bestFor: "Long documents & analysis", bestForFr: "Documents longs et analyse", strengths: ["long-context", "analysis"] },
  { id: "glm-4.5", name: "GLM 4.5", provider: "Zhipu", category: "text", tier: "standard", badge: "Copy", bestFor: "Creative copywriting", bestForFr: "Copywriting créatif", strengths: ["creative", "copy"] },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral", category: "text", tier: "standard", badge: "EU", bestFor: "European GDPR-first use", bestForFr: "Usage européen RGPD-first", strengths: ["european", "compliant"] },
  { id: "grok-3", name: "Grok 3", provider: "xAI", category: "text", tier: "standard", badge: "Realtime", bestFor: "Realtime info & humor", bestForFr: "Info temps réel et humour", strengths: ["realtime", "wit"] },
  { id: "gpt-oss-120b", name: "GPT-OSS 120B", provider: "OpenAI", category: "text", tier: "standard", badge: "Open", bestFor: "General-purpose open source", bestForFr: "Généraliste open-source", strengths: ["general", "open"] },

  // ── IMAGE ──
  { id: "ideogram-3", name: "Ideogram V3", provider: "Ideogram", category: "image", tier: "premium", badge: "Brand + Text", bestFor: "Logos, text on images", bestForFr: "Logos, texte sur images", strengths: ["text-rendering", "branding"] },
  { id: "photon-1", name: "Luma Photon", provider: "Luma", category: "image", tier: "standard", badge: "Realism", bestFor: "Realistic portraits", bestForFr: "Portraits réalistes", strengths: ["realism", "lighting"] },
  { id: "photon-flash", name: "Photon Flash", provider: "Luma", category: "image", tier: "economy", badge: "Fast", bestFor: "Fast iteration", bestForFr: "Itérations rapides", strengths: ["speed", "iteration"] },
  { id: "gpt-image", name: "GPT Image", provider: "OpenAI", category: "image", tier: "premium", badge: "GPT-4o", bestFor: "Complex prompts", bestForFr: "Prompts complexes", strengths: ["creative", "detail"] },
  { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI", category: "image", tier: "premium", badge: "Precise", bestFor: "Precise compositions", bestForFr: "Compositions précises", strengths: ["precision", "composition"] },
  { id: "flux-pro", name: "Flux Pro", provider: "Black Forest Labs", category: "image", tier: "premium", badge: "Creative", bestFor: "Artistic visuals", bestForFr: "Visuels artistiques", strengths: ["artistic", "detail"] },
  { id: "flux-pro-2", name: "Flux Pro 2", provider: "Black Forest Labs", category: "image", tier: "premium", badge: "Premium", bestFor: "Premium campaigns", bestForFr: "Campagnes premium", strengths: ["quality", "premium"] },
  { id: "flux-schnell", name: "Flux Schnell", provider: "Black Forest Labs", category: "image", tier: "economy", badge: "Ultra Fast", bestFor: "Quick drafts", bestForFr: "Brouillons rapides", strengths: ["ultra-fast", "cheap"] },
  { id: "flux-dev", name: "Flux Dev", provider: "Black Forest Labs", category: "image", tier: "standard", badge: "Balanced", bestFor: "Balanced production", bestForFr: "Production équilibrée", strengths: ["balanced", "quality"] },
  { id: "kontext-pro", name: "Kontext Pro", provider: "Black Forest Labs", category: "image", tier: "standard", badge: "Edit", bestFor: "Image editing & consistency", bestForFr: "Édition, cohérence", strengths: ["editing", "consistency"] },
  { id: "lucid-realism", name: "Leonardo Realism", provider: "Leonardo", category: "image", tier: "standard", badge: "Photo", bestFor: "Photoreal product shots", bestForFr: "Photo produit", strengths: ["photo-realism"] },
  { id: "seedream-v4", name: "SeedDream v4", provider: "ByteDance", category: "image", tier: "standard", badge: "Detailed", bestFor: "Detailed environments", bestForFr: "Environnements détaillés", strengths: ["detail", "textures"] },
  { id: "soul", name: "Soul", provider: "Leonardo", category: "image", tier: "standard", badge: "Artistic", bestFor: "Stylized art", bestForFr: "Style artistique", strengths: ["artistic", "stylized"] },
  { id: "midjourney-v7", name: "Midjourney v7", provider: "Midjourney", category: "image", tier: "premium", badge: "Aesthetic", bestFor: "Best-in-class aesthetics", bestForFr: "Esthétique haut de gamme", strengths: ["aesthetic", "style"] },
  { id: "sd-3.5", name: "Stable Diffusion 3.5", provider: "Stability AI", category: "image", tier: "economy", badge: "Open", bestFor: "Open-source baseline", bestForFr: "Base open-source", strengths: ["open", "customizable"] },
  { id: "recraft-v3", name: "Recraft V3", provider: "Recraft", category: "image", tier: "standard", badge: "Design", bestFor: "Vector & brand design", bestForFr: "Design vectoriel et marque", strengths: ["vector", "design"] },

  // ── VIDEO ──
  { id: "ray-2", name: "Luma Ray 2", provider: "Luma", category: "video", tier: "premium", badge: "Cinematic", bestFor: "Cinematic shots", bestForFr: "Plans cinématiques", strengths: ["quality", "cinematic"] },
  { id: "ray-flash-2", name: "Ray Flash 2", provider: "Luma", category: "video", tier: "economy", badge: "Fast", bestFor: "Fast video iteration", bestForFr: "Itération vidéo rapide", strengths: ["speed"] },
  { id: "veo-3.1", name: "Veo 3.1", provider: "Google", category: "video", tier: "premium", badge: "Google", bestFor: "Google-tier quality", bestForFr: "Qualité Google", strengths: ["quality", "fidelity"] },
  { id: "sora-2", name: "Sora 2", provider: "OpenAI", category: "video", tier: "premium", badge: "OpenAI", bestFor: "Narrative storytelling", bestForFr: "Narrations créatives", strengths: ["creative", "narrative"] },
  { id: "kling-2.1", name: "Kling v2.1", provider: "Kuaishou", category: "video", tier: "premium", badge: "Character", bestFor: "Character scenes", bestForFr: "Scènes à personnages", strengths: ["cinematic", "character"] },
  { id: "kling-2.5", name: "Kling 2.5 Turbo Pro", provider: "Kuaishou", category: "video", tier: "premium", badge: "Pro", bestFor: "Image-to-video pro", bestForFr: "Image-to-video pro", strengths: ["cinematic", "motion"] },
  { id: "seedance-2", name: "Seedance 2.0", provider: "ByteDance", category: "video", tier: "standard", badge: "Versatile", bestFor: "Versatile video", bestForFr: "Vidéo polyvalente", strengths: ["versatile"] },
  { id: "pika-2", name: "Pika 2", provider: "Pika Labs", category: "video", tier: "economy", badge: "Fun", bestFor: "Fun quick animations", bestForFr: "Animations fun", strengths: ["fun", "quick"] },
  { id: "hailuo-02", name: "Minimax Hailuo 02", provider: "Minimax", category: "video", tier: "standard", badge: "Physics", bestFor: "Realistic motion", bestForFr: "Mouvements réalistes", strengths: ["realistic", "physics"] },
  { id: "wan-2.2", name: "Wan 2.2", provider: "Alibaba", category: "video", tier: "economy", badge: "Open", bestFor: "Open-source video", bestForFr: "Vidéo open-source", strengths: ["versatile", "open"] },
  { id: "runway-gen4", name: "Runway Gen-4", provider: "Runway", category: "video", tier: "premium", badge: "Pro VFX", bestFor: "Pro VFX & effects", bestForFr: "VFX et effets pro", strengths: ["vfx", "pro"] },
  { id: "hunyuan-video", name: "Hunyuan Video", provider: "Tencent", category: "video", tier: "standard", badge: "Open", bestFor: "Open-source baseline", bestForFr: "Base open-source", strengths: ["open", "general"] },

  // ── MUSIC ──
  { id: "suno-v4", name: "Suno v4", provider: "Suno", category: "music", tier: "premium", badge: "Full Songs", bestFor: "Full songs with vocals", bestForFr: "Chansons complètes avec voix", strengths: ["vocals", "song"] },
  { id: "udio-pro", name: "Udio Pro", provider: "Udio", category: "music", tier: "premium", badge: "Studio", bestFor: "Studio-grade production", bestForFr: "Production studio", strengths: ["production", "quality"] },
  { id: "stable-audio", name: "Stable Audio 2", provider: "Stability AI", category: "music", tier: "standard", badge: "Instrumental", bestFor: "Royalty-free instrumentals", bestForFr: "Instrumentaux libres de droits", strengths: ["instrumental", "open"] },
  { id: "riffusion", name: "Riffusion", provider: "Riffusion", category: "music", tier: "economy", badge: "Fast", bestFor: "Quick musical drafts", bestForFr: "Brouillons musicaux rapides", strengths: ["fast", "cheap"] },
  { id: "elevenlabs-music", name: "ElevenLabs Music", provider: "ElevenLabs", category: "music", tier: "premium", badge: "Voice-First", bestFor: "Voice-first music", bestForFr: "Musique avec voix", strengths: ["vocals", "realistic"] },
  { id: "mubert-pro", name: "Mubert Pro", provider: "Mubert", category: "music", tier: "standard", badge: "Sync-Ready", bestFor: "Background music loops", bestForFr: "Musique d'ambiance en boucle", strengths: ["loops", "sync"] },
];

const CATEGORIES: { id: Category | "all"; labelEn: string; labelFr: string; icon: React.ElementType }[] = [
  { id: "all",   labelEn: "All models", labelFr: "Tous les modèles", icon: Sparkles },
  { id: "text",  labelEn: "Text",       labelFr: "Texte",            icon: Type },
  { id: "image", labelEn: "Image",      labelFr: "Image",            icon: ImageIcon },
  { id: "video", labelEn: "Video",      labelFr: "Vidéo",            icon: Video },
  { id: "music", labelEn: "Music",      labelFr: "Musique",          icon: Music },
];

const TIER_STYLES: Record<Tier, { label: string; labelFr: string; color: string; bg: string }> = {
  economy:  { label: "Economy",  labelFr: "Éco",      color: "#16a34a", bg: "rgba(22, 163, 74, 0.10)" },
  standard: { label: "Standard", labelFr: "Standard", color: "#2563eb", bg: "rgba(37, 99, 235, 0.10)" },
  premium:  { label: "Premium",  labelFr: "Premium",  color: "#7C3AED", bg: "rgba(124, 58, 237, 0.10)" },
};

export function ModelsPage() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const [active, setActive] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: MODELS.length, text: 0, image: 0, video: 0, music: 0 };
    for (const m of MODELS) c[m.category]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (active !== "all" && m.category !== active) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.badge.toLowerCase().includes(q)
      );
    });
  }, [active, query]);

  return (
    <div style={{ background: "#F5F5F5" }}>
      {/* Hero — dark */}
      <section
        className="relative overflow-hidden pt-24 pb-20 px-6"
        style={{ background: "#111111" }}
      >
        <div className="max-w-[900px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
              style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7C3AED" }} />
              <span style={{ fontSize: "13px", fontWeight: 400, color: "rgba(255,255,255,0.75)", fontFamily: "'Inter', sans-serif" }}>
                {isFr ? `${MODELS.length} modèles IA · Un abonnement` : `${MODELS.length} AI models · One subscription`}
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                color: "#FFFFFF",
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
              }}
            >
              {isFr ? "Tous les modèles IA." : "Every AI model."}
            </h1>
            <p
              className="mt-2"
              style={{
                fontSize: "clamp(20px, 4vw, 32px)",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
            >
              {isFr ? "Comparés côte à côte." : "Compared side by side."}
            </p>
          </motion.div>

          <motion.p
            className="mt-8 mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              fontSize: "16px",
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {isFr
              ? "Texte, image, vidéo, musique. Les meilleurs modèles du marché dans une seule interface, avec un scoring transparent sur 8 dimensions."
              : "Text, image, video, music. The best models on the market in one interface, with transparent scoring across 8 dimensions."}
          </motion.p>

          <motion.div
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <Link
              to="/login?mode=signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isFr ? "Essayer le comparateur" : "Try the comparator"}
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-colors hover:bg-white/5"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isFr ? "Voir les tarifs" : "See pricing"}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="pt-16 pb-6 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = active === cat.id;
                const count = cat.id === "all" ? counts.all : counts[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActive(cat.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
                    style={{
                      border: isActive ? "1px solid #111111" : "1px solid rgba(0,0,0,0.08)",
                      background: isActive ? "#111111" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "#666666",
                      fontSize: "13px",
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <Icon size={14} />
                    {isFr ? cat.labelFr : cat.labelEn}
                    <span style={{ opacity: 0.6, fontSize: "12px" }}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9590" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFr ? "Rechercher un modèle..." : "Search a model..."}
                className="w-full pl-9 pr-3 py-2 rounded-full focus:outline-none"
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#FFFFFF",
                  color: "#111111",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center py-16" style={{ fontSize: "14px", color: "#9A9590", fontFamily: "'Inter', sans-serif" }}>
              {isFr ? "Aucun modèle ne correspond à votre recherche." : "No model matches your search."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((m, i) => {
                const tier = TIER_STYLES[m.tier];
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="rounded-2xl p-5 transition-colors"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate"
                          style={{
                            fontSize: "15px",
                            fontWeight: 500,
                            color: "#111111",
                            letterSpacing: "-0.01em",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {m.name}
                        </h3>
                        <p
                          className="truncate"
                          style={{ fontSize: "12px", marginTop: 2, color: "#9A9590", fontFamily: "'Inter', sans-serif" }}
                        >
                          {m.provider}
                        </p>
                      </div>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: "10px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background: tier.bg,
                          color: tier.color,
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {isFr ? tier.labelFr : tier.label}
                      </span>
                    </div>

                    <p
                      className="mb-4"
                      style={{ fontSize: "13px", lineHeight: 1.5, color: "#666666", fontFamily: "'Inter', sans-serif" }}
                    >
                      {isFr ? m.bestForFr : m.bestFor}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: "11px",
                          color: "#666666",
                          border: "1px solid rgba(0,0,0,0.08)",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {m.badge}
                      </span>
                      {m.strengths.slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: "11px",
                            color: "#9A9590",
                            background: "rgba(0,0,0,0.03)",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-[900px] mx-auto">
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <h2
              className="mb-3"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                color: "#111111",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isFr ? "Prêt à comparer ?" : "Ready to compare?"}
            </h2>
            <p
              className="mb-8 mx-auto"
              style={{
                fontSize: "15px",
                lineHeight: 1.55,
                color: "#9A9590",
                maxWidth: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isFr
                ? "Envoyez votre premier prompt à 3 modèles en même temps. Gratuit, sans carte bancaire."
                : "Send your first prompt to 3 models at once. Free, no credit card."}
            </p>
            <Link
              to="/login?mode=signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isFr ? "Commencer gratuitement" : "Start free"}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ModelsPage;
