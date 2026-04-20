import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";
import heroImg from "../../assets/b545abf4495677ce6104da79f57e7f15edcba5a0.png";
import serviceImg from "../../assets/fd1a1304c95304459d525edabe5b548965b73ee0.png";
import sunsetImg from "../../assets/e770a4caf934a7f0a280cbbe70316b0d298cff32.png";

/* ═══ Light palette ═══ */
const BG = "#FAFAF7";
const TEXT = "#0A0A0A";
const MUTED = "#6B7280";
const BORDER = "rgba(10,10,10,0.08)";
const ACCENT = "#3B82F6";
const INK = "#0A0A0A";
const INK_TEXT = "#FFFFFF";

export function LandingPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";

  return (
    <div style={{ background: BG, color: TEXT, fontFeatureSettings: '"ss01"' }}>
      <LandingHeader isFr={isFr} authed={!!user} />
      <Hero isFr={isFr} authed={!!user} />
      <SectionDecode isFr={isFr} />
      <SectionGenerate isFr={isFr} />
      <SectionKeep isFr={isFr} />
      <ModelsStrip isFr={isFr} />
      <FinalCta isFr={isFr} authed={!!user} />
      <Footer isFr={isFr} />
    </div>
  );
}

/* ═══ Header ═══ */
function LandingHeader({ isFr, authed }: { isFr: boolean; authed: boolean }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-10 h-16"
      style={{ background: `${BG}E6`, backdropFilter: "blur(14px)", borderBottom: `1px solid ${BORDER}` }}
    >
      <Link to="/" className="flex items-center gap-2">
        <OraLogo size={24} />
        <span className="text-[17px] tracking-tight" style={{ fontWeight: 600 }}>Ora</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[14px]" style={{ color: MUTED }}>
        <Link to="/models" className="hover:text-black transition">{isFr ? "Modèles" : "Models"}</Link>
        <Link to="/pricing" className="hover:text-black transition">{isFr ? "Tarifs" : "Pricing"}</Link>
        <Link to="/about" className="hover:text-black transition">{isFr ? "À propos" : "About"}</Link>
      </nav>
      <div className="flex items-center gap-2">
        {authed ? (
          <Link to="/hub/analyze" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[14px]"
                style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
            {isFr ? "Ouvrir" : "Open"} <ArrowRight size={15} />
          </Link>
        ) : (
          <>
            <Link to="/login" className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-[14px] hover:bg-black/5"
                  style={{ color: TEXT }}>
              {isFr ? "Se connecter" : "Sign in"}
            </Link>
            <Link to="/login" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[14px]"
                  style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
              {isFr ? "Essayer" : "Try it"} <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/* ═══ Hero ═══ */
function Hero({ isFr, authed }: { isFr: boolean; authed: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-16 md:pt-28 pb-10 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] mb-5"
                 style={{ background: "rgba(59,130,246,0.08)", color: ACCENT, border: `1px solid rgba(59,130,246,0.2)` }}>
              <Sparkles size={12} /> {isFr ? "Image → prompt → image" : "Image → prompt → image"}
            </div>
            <h1 className="tracking-tight"
                style={{ fontSize: "clamp(44px, 6vw, 84px)", lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {isFr ? <>L'image que tu aimes,<br/><span style={{ color: ACCENT }}>recréée en un message.</span></>
                    : <>The image you love,<br/><span style={{ color: ACCENT }}>recreated in one message.</span></>}
            </h1>
            <p className="mt-6 text-[17px] md:text-[19px] leading-relaxed max-w-[520px]" style={{ color: MUTED }}>
              {isFr
                ? "Envoie une photo. Ora en extrait le prompt, choisis un modèle, génère. Tes résultats sont enregistrés en HD."
                : "Drop a photo. Ora extracts the prompt, pick a model, generate. Your outputs are saved in HD."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={authed ? "/hub/analyze" : "/login"}
                    className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[15px]"
                    style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
                {isFr ? "Commencer avec une image" : "Start with an image"} <ArrowRight size={16} />
              </Link>
              <Link to="/models"
                    className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-[15px] hover:bg-black/5"
                    style={{ border: `1px solid ${BORDER}`, color: TEXT }}>
                {isFr ? "Voir les modèles" : "See models"}
              </Link>
            </div>
          </motion.div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* Visual to the right of hero — image + floating chat bubble with the prompt */
function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
      className="relative"
    >
      <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden"
           style={{ boxShadow: "0 30px 80px -20px rgba(10,10,10,0.2)", border: `1px solid ${BORDER}` }}>
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Floating user bubble (image echo) top-right */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute -top-4 right-4 rounded-full px-4 h-10 flex items-center gap-2 text-[13px]"
        style={{ background: INK, color: INK_TEXT, boxShadow: "0 10px 30px -10px rgba(10,10,10,0.4)" }}
      >
        📎 hero.jpg
      </motion.div>

      {/* Floating Ora bubble with prompt bottom-left */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}
        className="absolute -bottom-6 -left-4 md:-left-8 max-w-[320px] px-4 py-3 text-[13.5px] leading-snug"
        style={{ background: "#fff", color: TEXT, border: `1px solid ${BORDER}`,
                 borderRadius: "20px 20px 20px 6px", boxShadow: "0 20px 60px -15px rgba(10,10,10,0.15)" }}
      >
        "A dramatic sunset over the desert, warm amber and ember tones, a family car with open trunk, golden hour, shallow depth of field, cinematic photo."
      </motion.div>
    </motion.div>
  );
}

/* ═══ Section 1 · Décoder ═══ */
function SectionDecode({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-20 md:py-32">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-20 items-center">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: ACCENT }}>
            01 · {isFr ? "Décoder" : "Decode"}
          </div>
          <h2 className="tracking-tight" style={{ fontSize: "clamp(32px, 4vw, 56px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {isFr ? "N'importe quelle image, décodée en 8 dimensions." : "Any image, decoded in 8 dimensions."}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-[460px]" style={{ color: MUTED }}>
            {isFr
              ? "Sujet, composition, lumière, palette, style, ambiance, caméra, finition. Tu vois exactement ce que l'IA a compris — et tu peux le modifier."
              : "Subject, composition, lighting, palette, style, mood, camera, finish. You see exactly what the AI understood — and you can edit it."}
          </p>
        </div>
        <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden"
             style={{ boxShadow: "0 20px 60px -20px rgba(10,10,10,0.2)", border: `1px solid ${BORDER}` }}>
          <img src={serviceImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-end">
            <div className="m-4 md:m-6 flex flex-wrap gap-1.5">
              {["sujet: SUV", "lumière: golden hour", "palette: ambre", "style: cinematic", "ambiance: familial"].map((t) => (
                <span key={t} className="px-2.5 h-7 rounded-full text-[12px] inline-flex items-center"
                      style={{ background: "rgba(255,255,255,0.9)", color: TEXT, border: `1px solid rgba(255,255,255,0.5)`, backdropFilter: "blur(6px)" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Section 2 · Générer ═══ */
function SectionGenerate({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-20 md:py-32" style={{ background: "#F3F4F1" }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="max-w-[720px] mb-10 md:mb-14">
          <div className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: ACCENT }}>
            02 · {isFr ? "Générer" : "Generate"}
          </div>
          <h2 className="tracking-tight" style={{ fontSize: "clamp(32px, 4vw, 56px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {isFr ? "Cinq modèles, une même conversation." : "Five models, one conversation."}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-[520px]" style={{ color: MUTED }}>
            {isFr
              ? "Photon Flash, Photon, Flux Pro, Ideogram, DALL-E 3. Un chip, un clic, une nouvelle image — sans jamais quitter le fil."
              : "Photon Flash, Photon, Flux Pro, Ideogram, DALL-E 3. One chip, one click, a new image — never leaving the thread."}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { img: heroImg,    chip: "⚡ Rapide" },
            { img: serviceImg, chip: "📸 Photo"  },
            { img: sunsetImg,  chip: "🎨 Créatif" },
            { img: heroImg,    chip: "🔤 Typo"   },
          ].map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
              className="relative aspect-[4/5] rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 12px 30px -15px rgba(10,10,10,0.18)" }}
            >
              <img src={it.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-3 left-3 px-2.5 h-7 rounded-full text-[12px] inline-flex items-center"
                   style={{ background: "rgba(255,255,255,0.95)", color: TEXT, fontWeight: 600 }}>
                {it.chip}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ Section 3 · Conserver ═══ */
function SectionKeep({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-20 md:py-32">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center">
        <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden order-2 lg:order-1"
             style={{ boxShadow: "0 20px 60px -20px rgba(10,10,10,0.2)", border: `1px solid ${BORDER}` }}>
          <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute bottom-4 right-4 px-3 h-9 rounded-full inline-flex items-center gap-2 text-[13px]"
               style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
            HD · 4K
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: ACCENT }}>
            03 · {isFr ? "Conserver" : "Keep"}
          </div>
          <h2 className="tracking-tight" style={{ fontSize: "clamp(32px, 4vw, 56px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {isFr ? "Tout est enregistré. Télécharge en HD." : "Everything's saved. Download in HD."}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-[460px]" style={{ color: MUTED }}>
            {isFr
              ? "Chaque image générée atterrit dans ta bibliothèque, téléchargeable en haute définition — sans upload manuel, sans perte."
              : "Every generated image lands in your library, ready for HD download — no manual upload, no loss."}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══ Models strip ═══ */
function ModelsStrip({ isFr }: { isFr: boolean }) {
  const models = ["Photon Flash", "Photon-1", "Flux Pro", "Ideogram V3", "DALL-E 3", "Seedream", "Flux Schnell"];
  return (
    <section className="py-14 md:py-20" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
        <div className="text-[12px] uppercase tracking-[0.18em] mb-6" style={{ color: MUTED }}>
          {isFr ? "Propulsé par les meilleurs modèles" : "Powered by the best models"}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 md:gap-x-12 gap-y-3">
          {models.map((m) => (
            <span key={m} className="text-[16px] md:text-[19px] tracking-tight" style={{ color: TEXT, fontWeight: 500, opacity: 0.75 }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ Final CTA ═══ */
function FinalCta({ isFr, authed }: { isFr: boolean; authed: boolean }) {
  return (
    <section className="py-24 md:py-36">
      <div className="max-w-[900px] mx-auto px-5 md:px-10 text-center">
        <h2 className="tracking-tight" style={{ fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1.03, fontWeight: 600, letterSpacing: "-0.03em" }}>
          {isFr ? <>Commence avec<br/><span style={{ color: ACCENT }}>une image.</span></>
                : <>Start with<br/><span style={{ color: ACCENT }}>one image.</span></>}
        </h2>
        <p className="mt-6 text-[18px] leading-relaxed" style={{ color: MUTED }}>
          {isFr ? "Pas de formulaire. Pas de réglages. Juste un message et un résultat." : "No forms. No settings. Just a message and a result."}
        </p>
        <div className="mt-9">
          <Link to={authed ? "/hub/analyze" : "/login"}
                className="inline-flex items-center gap-2 h-14 px-7 rounded-full text-[16px]"
                style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
            {isFr ? "Envoyer ma première image" : "Send my first image"} <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══ Footer ═══ */
function Footer({ isFr }: { isFr: boolean }) {
  return (
    <footer className="py-10" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <OraLogo size={20} />
          <span className="text-[14px]" style={{ fontWeight: 600 }}>Ora</span>
          <span className="text-[13px] ml-2" style={{ color: MUTED }}>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]" style={{ color: MUTED }}>
          <Link to="/pricing" className="hover:text-black transition">{isFr ? "Tarifs" : "Pricing"}</Link>
          <Link to="/models" className="hover:text-black transition">{isFr ? "Modèles" : "Models"}</Link>
          <Link to="/terms" className="hover:text-black transition">{isFr ? "Conditions" : "Terms"}</Link>
          <Link to="/privacy" className="hover:text-black transition">{isFr ? "Confidentialité" : "Privacy"}</Link>
        </div>
      </div>
    </footer>
  );
}
