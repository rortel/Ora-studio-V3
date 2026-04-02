import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Sparkles, Palette, Calendar, Image, MessageSquare, Film, Music, Rocket, FolderOpen, BarChart3, Send } from "lucide-react";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRODUCT SHOWCASE — App mockups with real use cases
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

/* ── Browser frame ── */
function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div className="rounded-xl md:rounded-2xl overflow-hidden" style={{ background: "#1A1A1A", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: "#2A2A2A" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F56" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27CA40" }} />
        </div>
        <div className="flex-1 mx-8">
          <div className="px-3 py-1 rounded-md text-center" style={{ background: "#1A1A1A", fontSize: "11px", color: "#888", ...f }}>{url}</div>
        </div>
      </div>
      <div style={{ background: "#FAFAFA" }}>{children}</div>
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOCKUP 1 — Studio Hub
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StudioHubMockup({ t }: { t: (k: string) => string }) {
  return (
    <BrowserFrame url="ora-studio.app/hub">
      <div className="flex" style={{ minHeight: 440 }}>
        {/* Sidebar */}
        <div className="hidden md:flex flex-col items-center py-4 gap-3" style={{ width: 52, borderRight: "1px solid #EBEBEB" }}>
          {[Sparkles, Calendar, FolderOpen, Palette].map((Icon, i) => (
            <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: i === 0 ? "rgba(124,58,237,0.08)" : "transparent" }}>
              <Icon size={16} style={{ color: i === 0 ? "#7C3AED" : "#BBB" }} />
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111", marginBottom: 4, ...f }}>{t("mock.studioHeading")}</h3>
            <p style={{ fontSize: "13px", color: "#999", ...f }}>{t("mock.studioSub")}</p>
          </div>
          {/* Mode cards */}
          <div className="flex gap-3 justify-center mb-6">
            <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl" style={{ background: "#fff", border: "1.5px solid #7C3AED" }}>
              <Sparkles size={16} color="#7C3AED" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{t("mock.studioCreate")}</div>
                <div style={{ fontSize: "10px", color: "#999", ...f }}>{t("mock.studioCreateSub")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
              <Rocket size={16} color="#999" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{t("mock.studioCampaign")}</div>
                <div style={{ fontSize: "10px", color: "#999", ...f }}>{t("mock.studioCampaignSub")}</div>
              </div>
            </div>
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {[
              { icon: Image, label: t("mock.qProduct"), color: "#7C3AED" },
              { icon: Film, label: t("mock.qVideo"), color: "#EC4899" },
              { icon: Music, label: t("mock.qMusic"), color: "#F59E0B" },
              { icon: MessageSquare, label: t("mock.qSocial"), color: "#10B981" },
            ].map((a) => (
              <div key={a.label} className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: "#F5F5F5", fontSize: "11px", color: "#666", ...f }}>
                <a.icon size={12} color={a.color} />{a.label}
              </div>
            ))}
          </div>
          {/* Input */}
          <div className="max-w-lg mx-auto flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "#fff", border: "1px solid #EBEBEB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: "13px", color: "#CCC", flex: 1, ...f }}>{t("mock.studioPlaceholder")}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
              <Send size={12} color="#fff" />
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOCKUP 2 — Campaign Lab (florist example)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* Single card renderer */
function CampaignCard({ card, t }: { card: any; t: (k: string) => string }) {
  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ width: 320, background: "#FFFFFF", boxShadow: "0 8px 40px -12px rgba(0,0,0,0.3)" }}
    >
      {card.type === "photo" && (
        <div className="aspect-square relative overflow-hidden">
          <img src={card.img} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 45%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p style={{ fontSize: "13px", color: "#fff", lineHeight: 1.5, ...f }}>{card.text}</p>
          </div>
        </div>
      )}
      {card.type === "article" && (
        <div className="aspect-square relative bg-white p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full" style={{ background: "#E8B4B8" }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{card.name}</div>
              <div style={{ fontSize: "11px", color: "#999", ...f }}>{card.sub}</div>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.6, flex: 1, ...f }}>{card.text}</p>
          <div className="rounded-xl overflow-hidden mt-3">
            <img src={card.img} alt="" className="w-full h-28 object-cover" />
          </div>
        </div>
      )}
      {card.type === "story" && (
        <div className="aspect-[9/16] relative overflow-hidden" style={{ maxHeight: 320 }}>
          <img src={card.img} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#fff", ...f }}>{card.title}</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: 4, ...f }}>{card.sub}</p>
            <div className="mt-3 px-5 py-2 rounded-full inline-block" style={{ background: "#fff", fontSize: "12px", fontWeight: 600, color: "#111", ...f }}>{card.cta}</div>
          </div>
        </div>
      )}
      {card.type === "listing" && (
        <div className="aspect-square relative bg-white p-5 flex flex-col">
          <div className="rounded-xl overflow-hidden mb-4">
            <img src={card.img} alt="" className="w-full h-24 object-cover" />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#111", marginBottom: 4, ...f }}>{card.name}</p>
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill="#FBBC05" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span style={{ fontSize: "11px", color: "#666", marginLeft: 2, ...f }}>4.9</span>
          </div>
          <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.5, ...f }}>{card.desc}</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: "1px solid #F3F4F6" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{card.label || `${card.platform} Post`}</div>
          <div style={{ fontSize: "11px", color: "#999", ...f }}>{card.size}</div>
        </div>
        <div className="px-2.5 py-1 rounded-md" style={{ background: card.badge, fontSize: "10px", fontWeight: 600, color: "#fff", ...f }}>{card.platform}</div>
      </div>
    </div>
  );
}

function CampaignLabMockup({ t }: { t: (k: string) => string }) {
  const cards = [
    {
      platform: "Instagram", badge: "#E1306C", size: t("mock.campInstaSize"),
      type: "photo" as const,
      img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=85",
      text: t("mock.campInstaText"),
    },
    {
      platform: "LinkedIn", badge: "#0A66C2", size: t("mock.campLinkedSize"),
      type: "article" as const,
      img: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&q=85",
      name: "Rose & Pivoine", sub: t("mock.campLinkedSub"), text: t("mock.campLinkedText"),
    },
    {
      platform: "Facebook", badge: "#1877F2", size: t("mock.campFbSize"),
      type: "story" as const,
      img: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&q=85",
      title: t("mock.campFbTitle"), sub: t("mock.campFbSub"), cta: t("mock.campFbCta"),
    },
    {
      platform: "Google", badge: "#4285F4", size: t("mock.campGoogleSize"),
      type: "listing" as const,
      img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=85",
      name: t("mock.campGoogleName"), desc: t("mock.campGoogleDesc"), label: t("mock.campGoogleLabel"),
    },
  ];

  // Total width of one set of cards: 4 cards × 320px + 3 gaps × 20px = 1340px
  const setWidth = cards.length * 320 + (cards.length - 1) * 20;

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
              <Rocket size={14} color="#fff" />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", ...f }}>{t("mock.campTitle")}</span>
          </div>
          <span style={{ fontSize: "12px", color: "rgba(241,245,249,0.5)", ...f }}>{t("mock.campAssets")}</span>
        </div>
        <div className="hidden md:flex gap-2">
          <div className="px-3 py-1.5 rounded-full" style={{ background: "rgba(22,163,106,0.15)", fontSize: "11px", fontWeight: 500, color: "#4ADE80", ...f }}>Brand Score: 94%</div>
        </div>
      </div>

      {/* Auto-scrolling marquee — duplicated cards for seamless loop */}
      <div className="overflow-hidden" style={{ margin: "0 -24px", padding: "0 24px" }}>
        <style>{`
          @keyframes campaign-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${setWidth + 20}px); }
          }
          .campaign-track { animation: campaign-scroll 25s linear infinite; }
          .campaign-track:hover { animation-play-state: paused; }
        `}</style>
        <div className="campaign-track flex gap-5" style={{ width: "max-content" }}>
          {/* First set */}
          {cards.map((card) => (
            <CampaignCard key={card.platform} card={card} t={t} />
          ))}
          {/* Duplicate set for seamless loop */}
          {cards.map((card) => (
            <CampaignCard key={`dup-${card.platform}`} card={card} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOCKUP 3 — Brand Vault (fleuriste)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function BrandVaultMockup({ t }: { t: (k: string) => string }) {
  const toneItems = [
    { label: t("mock.vaultFormality"), score: 6 },
    { label: t("mock.vaultWarmth"), score: 9 },
    { label: t("mock.vaultBoldness"), score: 4 },
    { label: t("mock.vaultClarity"), score: 8 },
  ];
  return (
    <BrowserFrame url="ora-studio.app/hub/vault">
      <div className="flex" style={{ minHeight: 400 }}>
        <div className="hidden md:flex flex-col items-center py-4 gap-3" style={{ width: 52, borderRight: "1px solid #EBEBEB" }}>
          {[Sparkles, Calendar, FolderOpen, Palette].map((Icon, i) => (
            <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: i === 3 ? "rgba(124,58,237,0.08)" : "transparent" }}>
              <Icon size={16} style={{ color: i === 3 ? "#7C3AED" : "#BBB" }} />
            </div>
          ))}
        </div>
        <div className="flex-1 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#111" }}>
              <Palette size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#111", ...f }}>Rose & Pivoine</div>
              <div style={{ fontSize: "12px", color: "#999", ...f }}>rose-et-pivoine.fr · {t("mock.vaultScanned")}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Colors */}
            <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, ...f }}>{t("mock.vaultPalette")}</div>
              <div className="flex gap-2 mb-3">
                {["#2D5016", "#E8B4B8", "#F5E6D3", "#8B4513", "#FFFFFF"].map((c, i) => (
                  <motion.div key={c} className="w-11 h-11 rounded-xl" style={{ background: c, border: c === "#FFFFFF" ? "1px solid #EEE" : "none", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
                    initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 400 }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[t("mock.vaultTag1"), t("mock.vaultTag2"), t("mock.vaultTag3"), t("mock.vaultTag4")].map((w) => (
                  <span key={w} className="px-2.5 py-1 rounded-lg" style={{ background: "rgba(124,58,237,0.06)", fontSize: "10px", color: "#7C3AED", fontWeight: 500, ...f }}>{w}</span>
                ))}
              </div>
            </div>
            {/* Tone */}
            <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, ...f }}>{t("mock.vaultVoice")}</div>
              {toneItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 mb-2.5">
                  <span style={{ fontSize: "11px", color: "#666", width: 60, ...f }}>{item.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                    <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #7C3AED, #EC4899)" }}
                      initial={{ width: 0 }} whileInView={{ width: `${item.score * 10}%` }} viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.8 }}
                    />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#111", ...f }}>{item.score}/10</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOCKUP 4 — Calendar (salon de coiffure)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function CalendarMockup({ t }: { t: (k: string) => string }) {
  const posts = [1, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 27];
  const published = [1, 4, 7];
  const days = [t("mock.calMon"), t("mock.calTue"), t("mock.calWed"), t("mock.calThu"), t("mock.calFri"), t("mock.calSat"), t("mock.calSun")];
  return (
    <BrowserFrame url="ora-studio.app/hub/calendar">
      <div className="flex" style={{ minHeight: 400 }}>
        <div className="hidden md:flex flex-col items-center py-4 gap-3" style={{ width: 52, borderRight: "1px solid #EBEBEB" }}>
          {[Sparkles, Calendar, FolderOpen, Palette].map((Icon, i) => (
            <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: i === 1 ? "rgba(124,58,237,0.08)" : "transparent" }}>
              <Icon size={16} style={{ color: i === 1 ? "#7C3AED" : "#BBB" }} />
            </div>
          ))}
        </div>
        <div className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111", ...f }}>{t("mock.calTitle")}</h3>
              <span style={{ fontSize: "12px", color: "#999", ...f }}>{t("mock.calSub")}</span>
            </div>
            <div className="hidden md:flex gap-2">
              <div className="px-3 py-1.5 rounded-full" style={{ fontSize: "11px", fontWeight: 500, color: "#7C3AED", background: "rgba(124,58,237,0.06)", ...f }}>
                <BarChart3 size={10} className="inline mr-1" /> Insights
              </div>
              <div className="px-3 py-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", fontSize: "11px", fontWeight: 500, color: "#fff", ...f }}>+ {t("mock.calNew")}</div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => (
              <div key={d} className="text-center py-1" style={{ fontSize: "10px", color: "#999", fontWeight: 600, ...f }}>{d}</div>
            ))}
            {Array.from({ length: 28 }, (_, i) => {
              const hasPost = posts.includes(i);
              const isPub = published.includes(i);
              return (
                <motion.div key={i} className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5"
                  style={{
                    background: isPub ? "linear-gradient(135deg, #7C3AED, #EC4899)" : hasPost ? "rgba(124,58,237,0.08)" : "#F9FAFB",
                    color: isPub ? "#fff" : hasPost ? "#7C3AED" : "#9CA3AF",
                    fontSize: "12px", fontWeight: hasPost ? 600 : 400, ...f,
                  }}
                  initial={hasPost ? { scale: 0 } : {}} whileInView={hasPost ? { scale: 1 } : {}} viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.015, type: "spring", stiffness: 400 }}
                >
                  {i + 1}
                  {hasPost && !isPub && <div className="w-1 h-1 rounded-full" style={{ background: "#7C3AED" }} />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   IMPACT COUNTER — Time saved + Visibility
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */


function SavingsCalculator({ t }: { t: (key: string) => string }) {
  // Realistic prices: what a French SMB/artisan would ACTUALLY pay for each need
  // Either hire a freelance OR do it yourself with tools — not both stacked
  const categories = [
    {
      id: "social",
      label: t("savings.catSocial"),
      hire: { label: t("savings.cmFreelance"), price: 1200 },
      diy: { label: t("savings.diyTools"), tools: "Hootsuite + Canva", price: 60 },
      hours: 15, // hours/month DIY
    },
    {
      id: "design",
      label: t("savings.catDesign"),
      hire: { label: t("savings.designerFreelance"), price: 800 },
      diy: { label: t("savings.diyTools"), tools: "Canva Pro + Adobe", price: 72 },
      hours: 12,
    },
    {
      id: "copy",
      label: t("savings.catCopy"),
      hire: { label: t("savings.copyFreelance"), price: 600 },
      diy: { label: t("savings.diyTools"), tools: "ChatGPT+ + Jasper", price: 69 },
      hours: 10,
    },
    {
      id: "video",
      label: t("savings.catVideo"),
      hire: { label: t("savings.videoFreelance"), price: 1000 },
      diy: { label: t("savings.diyTools"), tools: "CapCut + Runway", price: 40 },
      hours: 8,
    },
    {
      id: "brand",
      label: t("savings.catBrand"),
      hire: { label: t("savings.brandConsultant"), price: 500 },
      diy: { label: t("savings.diyTools"), tools: "Notion + Coolors", price: 10 },
      hours: 5,
    },
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set(["social", "design", "copy"]));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const active = categories.filter(c => selected.has(c.id));
  const totalHire = active.reduce((s, c) => s + c.hire.price, 0);
  const totalHours = active.reduce((s, c) => s + c.hours, 0);
  const oraPrice = 79;
  const savedMoney = Math.max(0, totalHire - oraPrice);

  return (
    <section className="py-24 md:py-32 overflow-hidden" style={{ background: "#09090B" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div className="mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.04em", color: "#FAFAFA", maxWidth: 650, marginBottom: 14, ...f }}>
            {t("savings.title")}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 520, ...f }}>
            {t("savings.subtitle")}
          </p>
        </motion.div>

        {/* Categories with checkboxes */}
        <div className="flex flex-wrap gap-3 mb-10">
          {categories.map(c => (
            <button key={c.id} onClick={() => toggle(c.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all duration-200"
              style={{
                background: selected.has(c.id) ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.04)",
                border: selected.has(c.id) ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="w-4 h-4 rounded flex items-center justify-center" style={{
                background: selected.has(c.id) ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "rgba(255,255,255,0.08)",
                border: selected.has(c.id) ? "none" : "1px solid rgba(255,255,255,0.15)",
              }}>
                {selected.has(c.id) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: selected.has(c.id) ? "#FAFAFA" : "rgba(255,255,255,0.45)", ...f }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Comparison grid: Hire vs DIY vs ORA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden mb-12" style={{ background: "rgba(255,255,255,0.06)" }}>
          {categories.map(c => {
            const active = selected.has(c.id);
            return (
              <div key={c.id} className="flex flex-col gap-4 p-5" style={{
                background: "#09090B",
                opacity: active ? 1 : 0.3,
                transition: "opacity 0.2s",
              }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", textTransform: "uppercase", ...f }}>{c.label}</span>
                {/* Hire option */}
                <div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: 2, ...f }}>{c.hire.label}</div>
                  <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.7)", ...f }}>€{c.hire.price.toLocaleString("fr-FR")}<span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>/mo</span></div>
                </div>
                {/* DIY time */}
                <div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: 2, ...f }}>{t("savings.diyTime")}</div>
                  <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.7)", ...f }}>{c.hours}h<span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>/mo</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Savings result — money + time */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
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
              {t("savings.timeSaved")}
            </span>
            <div style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1,
              background: "linear-gradient(135deg, #34D399, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...f,
            }}>
              {totalHours}h<span style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)" }}>/mo</span>
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
              ORA Studio Pro
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION LAYOUTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FullWidthSection({
  bg, label, title, description, children, index = 0,
}: {
  bg: string; label: string; title: string; description: string; children: React.ReactNode; index?: number;
}) {
  const isDark = bg === "#0F172A" || bg === "#111111";
  const textColor = isDark ? "#F1F5F9" : "#111111";
  const subColor = isDark ? "rgba(241,245,249,0.6)" : "#6B7280";

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });

  // Parallax layers: header moves faster, mockup moves slower → depth effect
  const headerY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const mockupY = useTransform(scrollYProgress, [0, 1], [120, -40]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.15, 0.4, 0.8, 1], [0, 1, 1, 1, 0]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.88, 1, 1, 0.95]);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: bg,
        zIndex: index + 1,
        // Card stacking shadow: each section casts a shadow on the previous
        boxShadow: index > 0 ? "0 -20px 60px -10px rgba(0,0,0,0.15)" : "none",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div className="text-center mb-12 md:mb-16" style={{ y: headerY, opacity: headerOpacity }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16,
              background: "linear-gradient(135deg, #A78BFA, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...f }}>
            {label}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.03em", color: textColor, marginBottom: 12, ...f }}>
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "15px", lineHeight: 1.65, color: subColor, maxWidth: 560, margin: "0 auto", ...f }}>{description}</motion.p>
        </motion.div>
        <motion.div style={{ y: mockupY, scale: mockupScale }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


/* ── Main export ── */
export function ProductShowcase() {
  const { t } = useI18n();

  return (
    <>
      {/* 1. Studio Hub — white bg */}
      <FullWidthSection index={0} bg="#FFFFFF" label={t("showcase.studioLabel")} title={t("showcase.studioTitle")} description={t("showcase.studioDesc")}>
        <StudioHubMockup t={t} />
      </FullWidthSection>

      {/* 2. Campaign Lab — dark bg */}
      <FullWidthSection index={1} bg="#0F172A" label={t("showcase.campaignLabel")} title={t("showcase.campaignTitle")} description={t("showcase.campaignDesc")}>
        <CampaignLabMockup t={t} />
      </FullWidthSection>

      {/* 3. Brand Vault — light bg */}
      <FullWidthSection index={2} bg="#FAFAFA" label={t("showcase.vaultLabel")} title={t("showcase.vaultTitle")} description={t("showcase.vaultDesc")}>
        <BrandVaultMockup t={t} />
      </FullWidthSection>

      {/* 4. Calendar — dark bg */}
      <FullWidthSection index={3} bg="#111111" label={t("showcase.calendarLabel")} title={t("showcase.calendarTitle")} description={t("showcase.calendarDesc")}>
        <CalendarMockup t={t} />
      </FullWidthSection>

      {/* 5. Savings calculator */}
      <SavingsCalculator t={t} />
    </>
  );
}
