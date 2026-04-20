import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Loader2, Paperclip, RotateCcw } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey } from "../lib/supabase";
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
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: "radial-gradient(60% 50% at 70% 30%, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />
      <div className="relative max-w-[1280px] mx-auto px-5 md:px-10 pt-16 md:pt-28 pb-10 md:pb-20">
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

          <HeroVisual isFr={isFr} />
        </div>
      </div>
    </section>
  );
}

/* Interactive live demo — upload → call /analyze/reverse-prompt → typewrite prompt */
function HeroVisual({ isFr }: { isFr: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [imgSrc, setImgSrc] = useState<string>(heroImg);
  const [typed, setTyped] = useState<string>("");
  const [full, setFull] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number | null>(null);

  // Sample prompt shown in idle state
  const samplePrompt = isFr
    ? "Un coucher de soleil sur le désert, tons ambrés chauds, SUV familial coffre ouvert, golden hour, faible profondeur de champ, photo cinéma."
    : "A dramatic desert sunset, warm amber tones, family SUV with open trunk, golden hour, shallow depth of field, cinematic photo.";

  useEffect(() => () => { if (typingTimer.current) window.clearInterval(typingTimer.current); }, []);

  const typewrite = useCallback((text: string) => {
    if (typingTimer.current) window.clearInterval(typingTimer.current);
    setTyped("");
    let i = 0;
    typingTimer.current = window.setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length && typingTimer.current) {
        window.clearInterval(typingTimer.current);
        typingTimer.current = null;
      }
    }, 14);
  }, []);

  const readBase64 = (file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = r.result as string;
        resolve({ dataUrl, base64: dataUrl.split(",")[1] || "", mimeType: file.type || "image/png" });
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const analyze = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setStatus("error");
      setFull(isFr ? "Image invalide (<10Mo)." : "Invalid image (<10MB).");
      setTyped(isFr ? "Image invalide (<10Mo)." : "Invalid image (<10MB).");
      return;
    }
    try {
      const { dataUrl, base64, mimeType } = await readBase64(file);
      setImgSrc(dataUrl);
      setStatus("loading");
      setTyped("");
      setTags([]);

      const res = await fetch(`${API_BASE}/analyze/reverse-prompt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
        signal: AbortSignal.timeout(45_000),
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!data.success) {
        setStatus("error");
        const msg = isFr ? "Ora n'a pas pu lire cette image." : "Ora couldn't read this image.";
        setFull(msg); setTyped(msg);
        return;
      }
      const s = data.schema || {};
      setTags([s.subject, s.lighting, s.palette, s.style, s.mood].filter(Boolean).slice(0, 5));
      setFull(data.promptText || "");
      typewrite(data.promptText || "");
      setStatus("result");
    } catch (err: any) {
      setStatus("error");
      const msg = isFr ? "Connexion interrompue." : "Network error.";
      setFull(msg); setTyped(msg);
    }
  }, [isFr, typewrite]);

  const reset = () => {
    setStatus("idle");
    setImgSrc(heroImg);
    setTyped("");
    setFull("");
    setTags([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
      className="relative"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); e.target.value = ""; }}
      />

      <div
        className="relative aspect-[4/5] rounded-[28px] overflow-hidden group cursor-pointer"
        style={{ boxShadow: "0 30px 80px -20px rgba(10,10,10,0.2)", border: `1px solid ${BORDER}` }}
        onClick={() => status !== "loading" && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); }}
      >
        <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-[1.02]" />
        {status === "idle" && (
          <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}>
            <div className="px-4 h-10 rounded-full inline-flex items-center gap-2 text-[13px]"
                 style={{ background: "#fff", color: TEXT, fontWeight: 500, boxShadow: "0 8px 20px -8px rgba(0,0,0,0.3)" }}>
              <Paperclip size={14} /> {isFr ? "Essaie avec ta photo" : "Try with your photo"}
            </div>
          </div>
        )}
      </div>

      {/* Floating user bubble */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute -top-4 right-4 rounded-full px-4 h-10 flex items-center gap-2 text-[13px]"
        style={{ background: INK, color: INK_TEXT, boxShadow: "0 10px 30px -10px rgba(10,10,10,0.4)" }}
      >
        📎 {status === "idle" ? "hero.jpg" : isFr ? "ton image" : "your image"}
      </motion.div>

      {/* Ora bubble */}
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="absolute -bottom-6 left-2 sm:-left-4 md:-left-8 max-w-[calc(100%-16px)] sm:max-w-[340px] px-4 py-3 text-[13.5px] leading-snug"
        style={{ background: "#fff", color: TEXT, border: `1px solid ${BORDER}`,
                 borderRadius: "20px 20px 20px 6px", boxShadow: "0 20px 60px -15px rgba(10,10,10,0.15)" }}
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2" style={{ color: MUTED }}>
            <Loader2 size={14} className="animate-spin" />
            {isFr ? "Je lis ton image…" : "Reading your image…"}
          </span>
        ) : status === "idle" ? (
          <span>"{samplePrompt}"</span>
        ) : status === "error" ? (
          <span style={{ color: "#B91C1C" }}>{typed || full}</span>
        ) : (
          <>
            <span>"{typed}"</span>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t, i) => (
                  <span key={i} className="px-2 h-6 rounded-full text-[11px] inline-flex items-center"
                        style={{ background: "#F3F4F6", color: MUTED, border: `1px solid ${BORDER}` }}>
                    {t.slice(0, 40)}
                  </span>
                ))}
              </div>
            )}
            {full && typed.length >= full.length && (
              <button onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="mt-2 text-[11px] inline-flex items-center gap-1 hover:underline" style={{ color: ACCENT }}>
                <RotateCcw size={11} /> {isFr ? "Essayer une autre" : "Try another"}
              </button>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══ Section 1 · Décoder ═══ */
function SectionDecode({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-20 md:py-32">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true, margin: "-80px" }}
        >
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
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }} viewport={{ once: true, margin: "-80px" }}
          className="relative aspect-[4/3] rounded-[24px] overflow-hidden"
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
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Section 2 · Générer ═══ */
function SectionGenerate({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-20 md:py-32" style={{ background: "#F3F4F1" }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true, margin: "-80px" }}
          className="max-w-[720px] mb-10 md:mb-14"
        >
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
        </motion.div>

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
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true, margin: "-80px" }}
          className="relative aspect-[4/3] rounded-[24px] overflow-hidden order-2 lg:order-1"
          style={{ boxShadow: "0 20px 60px -20px rgba(10,10,10,0.2)", border: `1px solid ${BORDER}` }}>
          <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute bottom-4 right-4 px-3 h-9 rounded-full inline-flex items-center gap-2 text-[13px]"
               style={{ background: INK, color: INK_TEXT, fontWeight: 500 }}>
            HD · 4K
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }} viewport={{ once: true, margin: "-80px" }}
          className="order-1 lg:order-2"
        >
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
        </motion.div>
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
