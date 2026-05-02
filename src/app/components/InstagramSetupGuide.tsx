import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Instagram, Facebook, Settings, Briefcase, Link2, Check } from "lucide-react";
import { useI18n } from "../lib/i18n";

/**
 * InstagramSetupGuide — visual walkthrough for converting a personal
 * Instagram account into a Business one and linking it to a Facebook
 * Page. Required by Meta's Graph API for any third-party publishing,
 * including via Post for Me. Aimed at small commerce owners (Ora's ICP)
 * who freeze when faced with the technical phrasing — uses CSS-rendered
 * phone mockups + plain-language steps instead of a wall of text.
 */

interface Props { open: boolean; onClose: () => void; }

export function InstagramSetupGuide({ open, onClose }: Props) {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  if (!open) return null;

  const steps = isFr ? STEPS_FR : STEPS_EN;
  const t = isFr ? COPY_FR : COPY_EN;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)" }}>
                <Instagram size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>
                  {t.subtitle}
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary cursor-pointer shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Why box */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              {t.whyLabel}
            </div>
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.5 }}>
              {t.whyBody}
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-6 space-y-5">
            {steps.map((step, i) => (
              <StepRow key={i} step={step} index={i + 1} isLast={i === steps.length - 1} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between gap-3"
            style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {t.footerNote}
            </div>
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
              style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 13, fontWeight: 600 }}>
              {t.gotIt}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

/* ─────────────────────────────────────────────
   STEP ROW
   ───────────────────────────────────────────── */

interface Step {
  title: string;
  body: string;
  visual: "settings" | "professional" | "business" | "facebook";
}

function StepRow({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  return (
    <div className="flex items-start gap-4 relative">
      {/* Step number + connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 13, fontWeight: 700 }}>
          {index}
        </div>
        {!isLast && <div className="w-px flex-1 mt-2" style={{ background: "var(--border)", minHeight: 60 }} />}
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start pb-2">
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            {step.body}
          </div>
        </div>
        <StepVisual kind={step.visual} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VISUALS — minimal phone-style mockups so the
   guide stays consistent regardless of changes
   to Meta's UI. Each one highlights the single
   element the user is supposed to tap.
   ───────────────────────────────────────────── */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ width: 140, height: 200 }}>
      <div className="absolute inset-0 rounded-[18px] overflow-hidden"
        style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        <div className="absolute top-0 left-0 right-0 h-4 flex items-center justify-center"
          style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
          <div className="w-8 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>
        <div className="pt-5 px-2">{children}</div>
      </div>
    </div>
  );
}

function StepVisual({ kind }: { kind: Step["visual"] }) {
  if (kind === "settings") {
    return (
      <PhoneFrame>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full" style={{ background: "linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)" }} />
          <div className="flex-1">
            <div className="h-1.5 w-12 rounded" style={{ background: "var(--border)" }} />
            <div className="h-1 w-8 rounded mt-1" style={{ background: "var(--border)" }} />
          </div>
          <div className="w-4 h-3 flex flex-col justify-around">
            <div className="h-0.5 rounded" style={{ background: "var(--foreground)" }} />
            <div className="h-0.5 rounded" style={{ background: "var(--foreground)" }} />
            <div className="h-0.5 rounded" style={{ background: "var(--foreground)" }} />
          </div>
        </div>
        <Highlight>
          <div className="flex items-center gap-1.5">
            <Settings size={10} />
            <div style={{ fontSize: 9, fontWeight: 600 }}>Settings</div>
          </div>
        </Highlight>
        <RowPlaceholder /><RowPlaceholder /><RowPlaceholder />
      </PhoneFrame>
    );
  }
  if (kind === "professional") {
    return (
      <PhoneFrame>
        <RowPlaceholder /><RowPlaceholder />
        <Highlight>
          <div style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.2 }}>
            Switch to professional account
          </div>
        </Highlight>
        <RowPlaceholder /><RowPlaceholder />
      </PhoneFrame>
    );
  }
  if (kind === "business") {
    return (
      <PhoneFrame>
        <div style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 6, color: "var(--foreground)" }}>
          Choose category
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="px-2 py-1.5 rounded-md" style={{ border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9, color: "var(--muted-foreground)" }}>Creator</div>
          </div>
          <div className="px-2 py-1.5 rounded-md flex items-center justify-between"
            style={{ border: "2px solid #FF5C39", background: "rgba(255,92,57,0.08)" }}>
            <div className="flex items-center gap-1.5">
              <Briefcase size={10} style={{ color: "#FF5C39" }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: "#FF5C39" }}>Business</div>
            </div>
            <Check size={10} style={{ color: "#FF5C39" }} />
          </div>
        </div>
      </PhoneFrame>
    );
  }
  // facebook
  return (
    <PhoneFrame>
      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)" }}>
          <Instagram size={14} color="#fff" />
        </div>
        <Link2 size={12} style={{ color: "var(--muted-foreground)" }} />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1877F2" }}>
          <Facebook size={14} color="#fff" />
        </div>
      </div>
      <div className="mt-3 text-center" style={{ fontSize: 9, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3 }}>
        Connect to your Facebook Page
      </div>
      <div className="mt-2 mx-auto py-1 px-2 rounded text-center" style={{ background: "#1877F2", maxWidth: 80 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>Continue</div>
      </div>
    </PhoneFrame>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 my-1 rounded-md"
      style={{ background: "rgba(255,92,57,0.12)", border: "1.5px solid #FF5C39" }}>
      {children}
    </div>
  );
}

function RowPlaceholder() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="w-2.5 h-2.5 rounded" style={{ background: "var(--border)" }} />
      <div className="h-1 flex-1 rounded" style={{ background: "var(--border)", maxWidth: 60 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   COPY
   ───────────────────────────────────────────── */

const COPY_EN = {
  title: "Connect Instagram in 3 minutes",
  subtitle: "A one-time setup required by Meta — same for every social tool, not just Ora.",
  whyLabel: "Why this is needed",
  whyBody: "Instagram only lets apps publish on your behalf if your account is set as Business and linked to a Facebook Page. It takes 3 minutes from your phone — you only do it once.",
  footerNote: "Stuck? Reach out — we'll guide you.",
  gotIt: "Got it",
};

const COPY_FR = {
  title: "Connecter Instagram en 3 minutes",
  subtitle: "Configuration unique exigée par Meta — c'est la même pour tous les outils, pas spécifique à Ora.",
  whyLabel: "Pourquoi c'est nécessaire",
  whyBody: "Instagram n'autorise les applications à publier en ton nom que si ton compte est en mode Business et lié à une Page Facebook. Ça prend 3 minutes depuis ton téléphone — à faire une seule fois.",
  footerNote: "Bloqué ? Écris-nous — on t'accompagne.",
  gotIt: "Compris",
};

const STEPS_EN: Step[] = [
  {
    title: "Open Instagram and go to Settings",
    body: "Tap your profile picture, then the menu icon (☰) in the top right, then “Settings and privacy”.",
    visual: "settings",
  },
  {
    title: "Switch to a professional account",
    body: "Inside Settings, find “Account type and tools” → “Switch to professional account”.",
    visual: "professional",
  },
  {
    title: "Choose Business (not Creator)",
    body: "Pick a category that matches what you sell (e.g. “Local business”, “Shopping”). Don't overthink it — you can change it later.",
    visual: "business",
  },
  {
    title: "Link your Facebook Page",
    body: "Instagram will ask to connect a Facebook Page. If you don't have one, tap “Create new Page” — Instagram makes one in 30 seconds.",
    visual: "facebook",
  },
];

const STEPS_FR: Step[] = [
  {
    title: "Ouvre Instagram et va dans Réglages",
    body: "Touche ta photo de profil, puis l'icône menu (☰) en haut à droite, puis « Paramètres et confidentialité ».",
    visual: "settings",
  },
  {
    title: "Passe en compte professionnel",
    body: "Dans les Paramètres, trouve « Type de compte et outils » → « Passer à un compte professionnel ».",
    visual: "professional",
  },
  {
    title: "Choisis Entreprise (pas Créateur)",
    body: "Prends une catégorie qui correspond à ce que tu vends (ex. « Commerce local », « Shopping »). Pas besoin de te casser la tête — tu peux changer plus tard.",
    visual: "business",
  },
  {
    title: "Lie ta Page Facebook",
    body: "Instagram va te demander d'associer une Page Facebook. Si tu n'en as pas, touche « Créer une nouvelle Page » — Instagram en fabrique une en 30 secondes.",
    visual: "facebook",
  },
];
