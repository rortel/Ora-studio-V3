import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Trophy, Image as ImageIcon, Video as VideoIcon, Type as TypeIcon, Zap, Clock, Shield, Leaf, DollarSign, Users, Sparkles } from "lucide-react";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRODUCT SHOWCASE — Comparator-first landing
   1. Compare (images + glass KPI overlay)
   2. 8 KPI dimensions grid
   3. Video compare (real videos)
   4. Model catalog (50+ models)
   5. Savings calculator
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

/* ═════════════════════════════════════════════════════════
   SHARED: MiniGauge for KPI overlay (mirrors ComparePage)
   ═════════════════════════════════════════════════════════ */
function MiniGauge({ value, size = 34 }: { value: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const color = value >= 75 ? "#4ade80" : value >= 55 ? "#facc15" : value >= 35 ? "#fb923c" : "#f87171";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={2.6} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={2.6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={10} fontWeight={800}>{value}</text>
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════
   1. COMPARE IMAGE MOCKUP — real images + glass KPI hover
   ═════════════════════════════════════════════════════════ */
interface CompareCard {
  model: string;
  badge: string;
  img: string;
  score: number;
  best?: boolean;
  time: string;
  price: string;
  kpis: { label: string; value: number }[];
  usage: string;
}

function CompareImageMockup({ t, isFr }: { t: (k: string) => string; isFr: boolean }) {
  const cards: CompareCard[] = [
    {
      model: "Ideogram V3", badge: "Brand + Text", best: true, score: 94, time: "4.2s", price: "€0.50",
      img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=900&q=85",
      usage: isFr ? "Idéal pour campagnes premium & print. Fidélité au prompt exemplaire." : "Ideal for premium campaigns & print. Exceptional prompt fidelity.",
      kpis: [
        { label: isFr ? "Anatomie" : "Anatomy", value: 96 },
        { label: isFr ? "Fidélité" : "Fidelity", value: 98 },
        { label: "DPI", value: 92 },
        { label: isFr ? "Coût/u." : "Cost/u.", value: 72 },
      ],
    },
    {
      model: "Luma Photon", badge: "Realism", score: 87, time: "2.8s", price: "€0.50",
      img: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&q=85",
      usage: isFr ? "Portraits et lumière naturelle. Excellent rapport qualité/vitesse." : "Portraits & natural light. Great quality/speed ratio.",
      kpis: [
        { label: isFr ? "Anatomie" : "Anatomy", value: 90 },
        { label: isFr ? "Fidélité" : "Fidelity", value: 82 },
        { label: isFr ? "Vitesse" : "Speed", value: 88 },
        { label: isFr ? "Coût/u." : "Cost/u.", value: 78 },
      ],
    },
    {
      model: "Flux Schnell", badge: "Ultra Fast", score: 72, time: "1.1s", price: "€0.10",
      img: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=900&q=85",
      usage: isFr ? "Brouillons ultra-rapides pour itérations volume." : "Ultra-fast drafts for volume iteration.",
      kpis: [
        { label: isFr ? "Anatomie" : "Anatomy", value: 68 },
        { label: isFr ? "Fidélité" : "Fidelity", value: 70 },
        { label: isFr ? "Vitesse" : "Speed", value: 98 },
        { label: isFr ? "Coût/u." : "Cost/u.", value: 95 },
      ],
    },
  ];

  return (
    <div>
      {/* Prompt bar preview */}
      <div className="max-w-2xl mx-auto mb-6 rounded-2xl flex items-center gap-3 px-5 py-3.5"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(10px)" }}>
        <Sparkles size={16} style={{ color: "#A78BFA" }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", flex: 1, ...f }}>
          {t("showcase.comparePrompt")}
        </span>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md" style={{ background: "rgba(124,58,237,0.25)", fontSize: 10, fontWeight: 600, color: "#E9D5FF", ...f }}>
          3 {isFr ? "modèles" : "models"}
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const gradeColor = c.score >= 80 ? "#22c55e" : c.score >= 60 ? "#84cc16" : "#f59e0b";
          return (
            <div key={c.model} className="relative rounded-2xl overflow-hidden group cursor-pointer"
              style={{
                aspectRatio: "1",
                background: "#0a0a0a",
                border: c.best ? `2px solid ${gradeColor}` : "1px solid rgba(255,255,255,0.1)",
                boxShadow: c.best ? `0 0 0 3px ${gradeColor}22, 0 20px 50px -10px rgba(0,0,0,0.6)` : "0 10px 30px -10px rgba(0,0,0,0.5)",
              }}>
              <img src={c.img} className="absolute inset-0 w-full h-full object-cover" alt={c.model} />

              {/* Best badge */}
              {c.best && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg z-10"
                  style={{ background: gradeColor, color: "#fff", fontSize: 10, fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", ...f }}>
                  <Trophy size={10} /> {isFr ? "Recommandé" : "Best"}
                </div>
              )}

              {/* Bottom label (fades on hover) */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg z-10 group-hover:opacity-0 transition-opacity"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
                <div className="min-w-0">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", ...f }} className="truncate">{c.model}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", ...f }}>{c.time} · {c.price}</div>
                </div>
                <span style={{ fontSize: 18, fontWeight: 900, color: gradeColor, ...f }}>{c.score}</span>
              </div>

              {/* Glassmorphism KPI overlay on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col"
                style={{
                  background: "linear-gradient(135deg, rgba(15,10,30,0.82) 0%, rgba(40,15,50,0.88) 100%)",
                  backdropFilter: "blur(22px) saturate(140%)",
                  WebkitBackdropFilter: "blur(22px) saturate(140%)",
                }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", ...f }} className="truncate">{c.model}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", ...f }}>{c.badge} · {c.time} · {c.price}</div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: `${gradeColor}22`, border: `1px solid ${gradeColor}55` }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: gradeColor, lineHeight: 1, ...f }}>{c.score}</span>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", fontWeight: 600, ...f }}>/100</span>
                  </div>
                </div>

                {/* KPI gauges */}
                <div className="flex-1 flex flex-col justify-center px-4 py-3 space-y-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {c.kpis.map((k) => (
                      <div key={k.label} className="flex flex-col items-center gap-1 py-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <MiniGauge value={k.value} size={34} />
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textAlign: "center", padding: "0 2px", fontWeight: 500, ...f }}>{k.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", marginBottom: 3, ...f }}>
                      {isFr ? "Analyse d'usage" : "Usage analysis"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.92)", lineHeight: 1.4, ...f }}>{c.usage}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p className="text-center mt-5" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", ...f }}>
        ↑ {t("showcase.compareHover")}
      </p>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   2. KPI GRID — 8 dimensions
   ═════════════════════════════════════════════════════════ */
function KpiGrid({ t }: { t: (k: string) => string }) {
  const cats = [
    { key: "Image", icon: ImageIcon, color: "#A78BFA", label: t("showcase.kpiImage"), usage: t("showcase.kpiImageUsage"), items: t("showcase.kpiImageItems") },
    { key: "Video", icon: VideoIcon, color: "#EC4899", label: t("showcase.kpiVideo"), usage: t("showcase.kpiVideoUsage"), items: t("showcase.kpiVideoItems") },
    { key: "Text", icon: TypeIcon, color: "#60A5FA", label: t("showcase.kpiText"), usage: t("showcase.kpiTextUsage"), items: t("showcase.kpiTextItems") },
    { key: "Pro", icon: DollarSign, color: "#34D399", label: t("showcase.kpiPro"), usage: t("showcase.kpiProUsage"), items: t("showcase.kpiProItems") },
    { key: "NonPro", icon: Users, color: "#FBBF24", label: t("showcase.kpiNonPro"), usage: t("showcase.kpiNonProUsage"), items: t("showcase.kpiNonProItems") },
    { key: "Tech", icon: Zap, color: "#F472B6", label: t("showcase.kpiTech"), usage: t("showcase.kpiTechUsage"), items: t("showcase.kpiTechItems") },
    { key: "Legal", icon: Shield, color: "#C084FC", label: t("showcase.kpiLegal"), usage: t("showcase.kpiLegalUsage"), items: t("showcase.kpiLegalItems") },
    { key: "Ethics", icon: Leaf, color: "#4ADE80", label: t("showcase.kpiEthics"), usage: t("showcase.kpiEthicsUsage"), items: t("showcase.kpiEthicsItems") },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cats.map((c, i) => (
        <motion.div key={c.key}
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.5 }}
          className="rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: `${c.color}22`, border: `1px solid ${c.color}44` }}>
            <c.icon size={18} style={{ color: c.color }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#FAFAFA", marginBottom: 4, letterSpacing: "-0.01em", ...f }}>{c.label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginBottom: 10, ...f }}>{c.usage}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, ...f }}>{c.items}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   3. VIDEO COMPARE MOCKUP — real videos
   ═════════════════════════════════════════════════════════ */
interface VideoCard { model: string; url: string; poster: string; score: number; best?: boolean; price: string; time: string }

function VideoCompareMockup({ isFr }: { isFr: boolean }) {
  // Pexels public CDN — hd variants (more reliable than uhd)
  const videos: VideoCard[] = [
    {
      model: "Veo 3.1", best: true, score: 93, price: "€3.00", time: "42s",
      url: "https://videos.pexels.com/video-files/4763824/4763824-hd_1080_1920_24fps.mp4",
      poster: "https://images.unsplash.com/photo-1522098543979-ffc7f79a56c4?auto=format&fit=crop&w=600&h=1067&q=80",
    },
    {
      model: "Sora 2", score: 89, price: "€3.00", time: "38s",
      url: "https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4",
      poster: "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=600&h=1067&q=80",
    },
    {
      model: "Kling v2.5", score: 85, price: "€3.50", time: "55s",
      url: "https://videos.pexels.com/video-files/5377700/5377700-hd_1080_1920_25fps.mp4",
      poster: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&h=1067&q=80",
    },
    {
      model: "Luma Ray 2", score: 82, price: "€3.00", time: "29s",
      url: "https://videos.pexels.com/video-files/4763824/4763824-hd_1080_1920_24fps.mp4",
      poster: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=600&h=1067&q=80",
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {videos.map((v) => {
        const gradeColor = v.score >= 90 ? "#22c55e" : v.score >= 80 ? "#84cc16" : "#f59e0b";
        return (
          <div key={v.model} className="relative rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "9/16",
              background: "#0a0a0a",
              border: v.best ? `2px solid ${gradeColor}` : "1px solid rgba(255,255,255,0.1)",
              boxShadow: v.best ? `0 0 0 3px ${gradeColor}22, 0 15px 40px -10px rgba(0,0,0,0.5)` : "0 8px 25px -10px rgba(0,0,0,0.5)",
            }}>
            <img
              src={v.poster}
              alt={v.model}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />
            <video
              src={v.url}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={v.poster}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
              onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
            />
            {v.best && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md z-10"
                style={{ background: gradeColor, color: "#fff", fontSize: 9, fontWeight: 800, ...f }}>
                <Trophy size={9} /> {isFr ? "Best" : "Best"}
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg z-10"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
              <div className="min-w-0">
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", ...f }} className="truncate">{v.model}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", ...f }}>{v.time} · {v.price}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: gradeColor, ...f }}>{v.score}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   4. MODEL CATALOG — 50+ models as chips grouped by category
   ═════════════════════════════════════════════════════════ */
function ModelCatalog({ t, isFr }: { t: (k: string) => string; isFr: boolean }) {
  const groups = [
    {
      key: "image",
      label: t("showcase.catalogCategoryImage"),
      color: "#A78BFA",
      icon: ImageIcon,
      models: [
        "Ideogram V3", "Luma Photon", "Photon Flash", "GPT Image", "DALL-E 3",
        "Flux Pro", "Flux Pro 2", "Flux Schnell", "Flux Dev", "Flux 1.1 Pro",
        "Kontext Pro", "Leonardo Realism", "SeedDream v4", "Soul", "ORA Vision",
      ],
    },
    {
      key: "video",
      label: t("showcase.catalogCategoryVideo"),
      color: "#EC4899",
      icon: VideoIcon,
      models: [
        "Luma Ray 2", "Ray Flash 2", "Veo 3.1", "Sora 2", "Kling v2.1",
        "Kling 2.5 Turbo Pro", "Seedance 2.0", "Minimax Hailuo 02", "Wan 2.2",
        "Pika", "ORA Motion",
      ],
    },
    {
      key: "text",
      label: t("showcase.catalogCategoryText"),
      color: "#60A5FA",
      icon: TypeIcon,
      models: [
        "GPT-4o", "GPT-5", "Claude Sonnet", "Claude Opus", "Gemini 2.5 Pro",
        "DeepSeek v3", "DeepSeek R1", "Llama 3.3 70B", "Qwen 2.5 72B", "Kimi K2",
        "GLM 4.5", "GPT-OSS 120B",
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${g.color}22`, border: `1px solid ${g.color}44` }}>
              <g.icon size={14} style={{ color: g.color }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111", letterSpacing: "-0.01em", ...f }}>{g.label}</span>
            <span style={{ fontSize: 11, color: "#999", ...f }}>{g.models.length} {isFr ? "modèles" : "models"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.models.map((m) => (
              <span key={m}
                className="px-3 py-1.5 rounded-lg"
                style={{
                  background: "#fff",
                  border: `1px solid ${g.color}22`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#111",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  ...f,
                }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SAVINGS CALCULATOR (kept from previous)
   ═════════════════════════════════════════════════════════ */
function SavingsCalculator({ t }: { t: (key: string) => string }) {
  const categories = [
    { id: "text",     label: t("savings.catText"),     sub: t("savings.subText"),     price: 40 },
    { id: "image",    label: t("savings.catImage"),    sub: t("savings.subImage"),    price: 40 },
    { id: "video",    label: t("savings.catVideo"),    sub: t("savings.subVideo"),    price: 65 },
    { id: "videopro", label: t("savings.catVideoPro"), sub: t("savings.subVideoPro"), price: 200 },
    { id: "music",    label: t("savings.catMusic"),    sub: t("savings.subMusic"),    price: 20 },
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set(["text", "image", "video", "music"]));
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const active = categories.filter(c => selected.has(c.id));
  const totalStack = active.reduce((s, c) => s + c.price, 0);
  const oraPrice = 79;
  const savedMoney = Math.max(0, totalStack - oraPrice);

  return (
    <section className="py-24 md:py-32 overflow-hidden" style={{ background: "#09090B" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div className="mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.04em", color: "#FAFAFA", maxWidth: 650, marginBottom: 14, ...f }}>
            {t("savings.title")}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 520, ...f }}>
            {t("savings.subtitle")}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-10">
          {categories.map(c => {
            const on = selected.has(c.id);
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-left"
                style={{
                  background: on ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.04)",
                  border: on ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{
                  background: on ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "rgba(255,255,255,0.08)",
                  border: on ? "none" : "1px solid rgba(255,255,255,0.15)",
                }}>
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col">
                  <span style={{ fontSize: "13px", fontWeight: 600, color: on ? "#FAFAFA" : "rgba(255,255,255,0.55)", ...f }}>{c.label}</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", ...f }}>{c.sub} · €{c.price}/mo</span>
                </div>
              </button>
            );
          })}
        </div>

        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6, ...f }}>
              {t("savings.monthlySavings")}
            </span>
            <div style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1,
              background: "linear-gradient(135deg, #A78BFA, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...f,
            }}>
              €{savedMoney.toLocaleString("fr-FR")}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6, ...f }}>
              {t("savings.stackCost")}
            </span>
            <div style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1,
              background: "linear-gradient(135deg, #F87171, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...f,
            }}>
              €{totalStack}<span style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)" }}>/mo</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6, ...f }}>
              {t("savings.annualSavings")}
            </span>
            <div style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: "#FAFAFA", ...f,
            }}>
              €{(savedMoney * 12).toLocaleString("fr-FR")}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6, ...f }}>
              ORA Pro
            </span>
            <div style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, color: "#FAFAFA", ...f }}>
              €{oraPrice}/mo
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4, ...f }}>{t("savings.allInOne")}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════
   SECTION LAYOUT — shared wrapper
   ═════════════════════════════════════════════════════════ */
function FullWidthSection({
  bg, label, title, description, children, index = 0, isDark,
}: {
  bg: string; label: string; title: string; description: string; children: React.ReactNode; index?: number; isDark: boolean;
}) {
  const textColor = isDark ? "#F1F5F9" : "#111111";
  const subColor = isDark ? "rgba(241,245,249,0.6)" : "#6B7280";

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const headerY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const mockupY = useTransform(scrollYProgress, [0, 1], [90, -30]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.15, 0.4, 0.8, 1], [0, 1, 1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: bg,
        zIndex: index + 1,
        boxShadow: index > 0 ? "0 -20px 60px -10px rgba(0,0,0,0.15)" : "none",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div className="text-center mb-12 md:mb-16" style={{ y: headerY, opacity: headerOpacity }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{
              fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16,
              background: "linear-gradient(135deg, #A78BFA, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...f,
            }}>
            {label}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.03em", color: textColor, marginBottom: 12, ...f }}>
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "15px", lineHeight: 1.65, color: subColor, maxWidth: 620, margin: "0 auto", ...f }}>{description}</motion.p>
        </motion.div>
        <motion.div style={{ y: mockupY }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════
   MAIN EXPORT
   ═════════════════════════════════════════════════════════ */
export function ProductShowcase() {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";

  return (
    <>
      {/* 1. Compare (images) — dark flagship */}
      <FullWidthSection
        index={0}
        bg="#0A0A0F"
        isDark
        label={t("showcase.compareLabel")}
        title={t("showcase.compareTitle")}
        description={t("showcase.compareDesc")}
      >
        <CompareImageMockup t={t} isFr={isFr} />
      </FullWidthSection>

      {/* 2. 8 KPI dimensions — dark purple */}
      <FullWidthSection
        index={1}
        bg="#0F0A1F"
        isDark
        label={t("showcase.kpiLabel")}
        title={t("showcase.kpiTitle")}
        description={t("showcase.kpiDesc")}
      >
        <KpiGrid t={t} />
      </FullWidthSection>

      {/* 3. Video compare — black */}
      <FullWidthSection
        index={2}
        bg="#050505"
        isDark
        label={t("showcase.videoLabel")}
        title={t("showcase.videoTitle")}
        description={t("showcase.videoDesc")}
      >
        <VideoCompareMockup isFr={isFr} />
      </FullWidthSection>

      {/* 4. Model catalog — light */}
      <FullWidthSection
        index={3}
        bg="#FAFAFA"
        isDark={false}
        label={t("showcase.catalogLabel")}
        title={t("showcase.catalogTitle")}
        description={t("showcase.catalogDesc")}
      >
        <ModelCatalog t={t} isFr={isFr} />
      </FullWidthSection>

      {/* 5. Savings calculator */}
      <SavingsCalculator t={t} />
    </>
  );
}
