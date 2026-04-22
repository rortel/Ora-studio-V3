import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Globe, Upload, Loader2, Check, X, Plus,
  Palette, Users, Target, Megaphone, Sparkles,
  Camera, Type, FileText, ArrowRight, RefreshCw,
  Instagram, Linkedin, Twitter, Facebook, Youtube,
  Building2, ShoppingBag, Eye, Paintbrush, Image as ImageIcon,
  Layers, ChevronDown, Shield, Save, BookOpen, Compass, MessageSquare, Send,
  Trophy, Trash2,
} from "lucide-react";
import { apiUrl, apiHeaders } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";
import { ImageBank } from "../components/ImageBank";
import { bagel, COLORS } from "../components/ora/tokens";
// PDF.js loaded lazily (only when a PDF is dropped)
let pdfjsReady: typeof import("pdfjs-dist") | null = null;
async function getPdfJs() {
  if (pdfjsReady) return pdfjsReady;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  pdfjsReady = lib;
  return lib;
}

// ── Helpers ──

function corsBody(token: string | null, data?: Record<string, any>): string {
  return JSON.stringify({ _token: token || "", ...data });
}

// ── Types ──

interface VaultData {
  company_name: string;
  industry: string;
  tagline: string | null;
  products_services: string[];
  target_audiences: { name: string; description: string }[];
  colors: { hex: string; name: string; role: string }[];
  logo_url: string | null;
  logo_description: string | null;
  tone: { formality: number; confidence: number; warmth: number; humor: number; primary_tone: string; adjectives: string[] } | null;
  photo_style: { framing: string; mood: string; lighting: string; subjects: string } | null;
  social_presence: { platform: string; url: string | null; detected: boolean }[];
  key_messages: string[];
  approved_terms: string[];
  forbidden_terms: string[];
  fonts: string[];
  confidence_score: number;
  source_url: string | null;
  updatedAt: string | null;
  // Brand Charter fields
  mission: string | null;
  vision: string | null;
  personality: string | null;
  usp: string | null;
  values: string | null;
  font_usage_rules: string | null;
  competitors: string | null;
  brand_guidelines_text: string | null;
  // Brand Strategy (Platform de marque)
  brand_platform: {
    promise: string;
    narrative_register: string;
    creative_tension: string;
    semiotic_codes: {
      adopt: string[];
      avoid: string[];
      subvert: string[];
    };
    photo_direction: {
      framing: string;
      lighting: string;
      human_presence: string;
      composition: string;
    };
    reference_prompts: {
      positive: string[];
      negative: string[];
    };
  } | null;
  voice_profile: {
    sentence_style?: { avg_length?: string; structure?: string; preferred_openers?: string[] };
    vocabulary?: { register?: string; recurring_terms?: string[]; jargon?: string[]; avoids?: string[] };
    tone_markers?: { formality?: number; confidence?: number; warmth?: number; humor?: number; urgency?: number; primary_tone?: string; adjectives?: string[] };
    rhetorical_devices?: string[];
    key_phrases?: string[];
    do_patterns?: string[];
    dont_patterns?: string[];
    language?: string;
    summary?: string;
  } | null;
  // New Brand Book fields
  competitors_list?: {
    name: string;
    url?: string;
    positioning?: string;
    tone?: string;
    colors?: string[];
    strengths?: string[];
    weaknesses?: string[];
    differentiation_tips?: string[];
  }[];
  universes?: {
    id: string;
    name: string;
    description: string;
    colors?: string[];
    tone_override?: string;
    keywords?: string[];
  }[];
  text_calibration?: {
    rules?: { vouvoiement?: boolean; emoji?: boolean; hashtags?: boolean; structure?: string };
    do_examples?: string[];
    dont_examples?: string[];
    summary?: string;
  } | null;
  image_calibration?: {
    rules?: { lighting?: string; framing?: string; background?: string; colors?: string; style?: string };
    do_styles?: string[];
    dont_styles?: string[];
    mood?: string;
    summary?: string;
  } | null;
}

const EMPTY_VAULT: VaultData = {
  company_name: "", industry: "", tagline: null, products_services: [], target_audiences: [],
  colors: [], logo_url: null, logo_description: null, tone: null, photo_style: null,
  social_presence: [], key_messages: [], approved_terms: [], forbidden_terms: [],
  fonts: [], confidence_score: 0, source_url: null, updatedAt: null,
  mission: null, vision: null, personality: null, usp: null, values: null,
  font_usage_rules: null, competitors: null, brand_guidelines_text: null,
  brand_platform: null,
  voice_profile: null,
  competitors_list: [],
  universes: [],
  text_calibration: null,
  image_calibration: null,
};

// ── Merge logic: enrich existing vault with incoming file DNA ──
// A brand charter is authoritative on directives (tone, colors, fonts,
// photo style, vocabulary). Those fields from the file OVERRIDE or
// COMPLETE existing data. Factual / detection fields (social presence,
// source_url, logo) keep the URL-scan values.

function mergeVaultData(existing: VaultData, incoming: Partial<VaultData>): VaultData {
  // Helper: dedupe string arrays (case-insensitive)
  const dedupeStrings = (a: string[], b: string[]): string[] => {
    const seen = new Set(a.map(s => s.toLowerCase()));
    const merged = [...a];
    for (const item of b) {
      if (!seen.has(item.toLowerCase())) {
        seen.add(item.toLowerCase());
        merged.push(item);
      }
    }
    return merged;
  };

  // Helper: dedupe colors by hex
  const dedupeColors = (
    a: { hex: string; name: string; role: string }[],
    b: { hex: string; name: string; role: string }[]
  ) => {
    const seen = new Set(a.map(c => c.hex.toLowerCase()));
    const merged = [...a];
    for (const color of b) {
      if (!seen.has(color.hex.toLowerCase())) {
        seen.add(color.hex.toLowerCase());
        merged.push(color);
      }
    }
    return merged;
  };

  // Helper: dedupe audiences by name
  const dedupeAudiences = (
    a: { name: string; description: string }[],
    b: { name: string; description: string }[]
  ) => {
    const seen = new Set(a.map(x => x.name.toLowerCase()));
    const merged = [...a];
    for (const aud of b) {
      if (!seen.has(aud.name.toLowerCase())) {
        seen.add(aud.name.toLowerCase());
        merged.push(aud);
      }
    }
    return merged;
  };

  // Helper: merge social presence by platform
  const mergeSocial = (
    a: { platform: string; url: string | null; detected: boolean }[],
    b: { platform: string; url: string | null; detected: boolean }[]
  ) => {
    const map = new Map(a.map(s => [s.platform.toLowerCase(), s]));
    for (const s of b) {
      const key = s.platform.toLowerCase();
      const ex = map.get(key);
      if (!ex) {
        map.set(key, s);
      } else if (s.detected && (!ex.detected || !ex.url)) {
        map.set(key, { ...ex, detected: true, url: s.url || ex.url });
      }
    }
    return [...map.values()];
  };

  // Tone: charter is authoritative on voice directives.
  // If incoming has tone data, its non-zero values override.
  // Adjectives are merged.
  const mergeTone = (
    a: VaultData["tone"],
    b: VaultData["tone"]
  ): VaultData["tone"] => {
    if (!b) return a;
    if (!a) return b;
    return {
      formality: b.formality || a.formality,
      confidence: b.confidence || a.confidence,
      warmth: b.warmth || a.warmth,
      humor: b.humor || a.humor,
      primary_tone: b.primary_tone || a.primary_tone,
      adjectives: dedupeStrings(a.adjectives || [], b.adjectives || []),
    };
  };

  // Photo style: charter is authoritative on visual directives.
  // Non-empty incoming values override.
  const mergePhotoStyle = (
    a: VaultData["photo_style"],
    b: VaultData["photo_style"]
  ): VaultData["photo_style"] => {
    if (!b) return a;
    if (!a) return b;
    return {
      framing: b.framing || a.framing,
      mood: b.mood || a.mood,
      lighting: b.lighting || a.lighting,
      subjects: b.subjects || a.subjects,
    };
  };

  return {
    // Factual: keep URL scan unless empty
    company_name: existing.company_name || incoming.company_name || "",
    industry: existing.industry || incoming.industry || "",
    tagline: existing.tagline || incoming.tagline || null,
    logo_url: existing.logo_url || incoming.logo_url || null,
    logo_description: existing.logo_description || incoming.logo_description || null,
    source_url: existing.source_url || incoming.source_url || null,

    // Directive lists: charter enriches (union + dedupe)
    colors: dedupeColors(existing.colors || [], incoming.colors || []),
    products_services: dedupeStrings(existing.products_services || [], incoming.products_services || []),
    target_audiences: dedupeAudiences(existing.target_audiences || [], incoming.target_audiences || []),
    key_messages: dedupeStrings(existing.key_messages || [], incoming.key_messages || []),
    approved_terms: dedupeStrings(existing.approved_terms || [], incoming.approved_terms || []),
    forbidden_terms: dedupeStrings(existing.forbidden_terms || [], incoming.forbidden_terms || []),
    fonts: dedupeStrings(existing.fonts || [], incoming.fonts || []),

    // Directive objects: charter overrides non-empty fields
    tone: mergeTone(existing.tone, incoming.tone ?? null),
    photo_style: mergePhotoStyle(existing.photo_style, incoming.photo_style ?? null),

    // Detection: merge by platform
    social_presence: mergeSocial(existing.social_presence || [], incoming.social_presence || []),

    // Score: keep highest
    confidence_score: Math.max(existing.confidence_score || 0, incoming.confidence_score || 0),

    // Brand Charter: incoming overrides if non-empty (charter document is authoritative)
    mission: incoming.mission || existing.mission || null,
    vision: incoming.vision || existing.vision || null,
    personality: incoming.personality || existing.personality || null,
    usp: incoming.usp || existing.usp || null,
    values: incoming.values || existing.values || null,
    font_usage_rules: incoming.font_usage_rules || existing.font_usage_rules || null,
    competitors: incoming.competitors || existing.competitors || null,
    brand_guidelines_text: incoming.brand_guidelines_text || existing.brand_guidelines_text || null,

    // Brand platform & voice profile: keep existing unless incoming provides
    brand_platform: incoming.brand_platform || existing.brand_platform || null,
    voice_profile: incoming.voice_profile || existing.voice_profile || null,

    // New Brand Book fields: keep existing, merge if incoming
    competitors_list: incoming.competitors_list || existing.competitors_list || [],
    universes: incoming.universes || existing.universes || [],
    text_calibration: incoming.text_calibration || existing.text_calibration || null,
    image_calibration: incoming.image_calibration || existing.image_calibration || null,

    // Timestamp: always update
    updatedAt: existing.updatedAt,
  };
}

// ── Exports ──

export function VaultPage() {
  return (
    <RouteGuard requireAuth requireFeature="vault">
      <VaultPageContent />
    </RouteGuard>
  );
}

// ── Main ──

function VaultPageContent() {
  const { t } = useI18n();
  const [vault, setVault] = useState<VaultData>(EMPTY_VAULT);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  // Brand memory — the longer the user stays, the smarter the Vault gets.
  // `/vault/insights` scans their Library + image bank and surfaces the
  // palette / moods that recur but aren't in the Vault yet. One-click
  // adoption; dismissible per-user via localStorage.
  type InsightColor = { hex: string; hits: number; score: number };
  type InsightTerm  = { label: string; hits: number; score: number };
  const [insights, setInsights] = useState<{
    colors: InsightColor[]; moods: InsightTerm[]; styles: InsightTerm[]; lighting: InsightTerm[];
    sampleSize: number;
  } | null>(null);
  const [insightsDismissed, setInsightsDismissed] = useState(() => {
    try { return localStorage.getItem("ora:vault-insights-dismissed") === "1"; } catch { return false; }
  });
  const [adoptingInsights, setAdoptingInsights] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [voiceLearning, setVoiceLearning] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [imageBankRefreshKey, setImageBankRefreshKey] = useState(0);
  // ── ORA Voice (fine-tuning) ──
  const [oraVoiceStatus, setOraVoiceStatus] = useState<{
    hasVoice: boolean;
    jobId?: string;
    status?: string;
    fineTunedModel?: string | null;
    samplesCount?: number;
    createdAt?: number;
  } | null>(null);
  const [oraVoiceTraining, setOraVoiceTraining] = useState(false);
  const [oraVoiceError, setOraVoiceError] = useState<string | null>(null);

  // Brand Book tabs
  const [vaultTab, setVaultTab] = useState<"identity" | "audience" | "voice" | "visuals" | "competitors">("identity");

  // Competitor scanning
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  // Universe management
  const [universeEditing, setUniverseEditing] = useState<string | null>(null);
  const [newUniverse, setNewUniverse] = useState<{ name: string; description: string; colors: string; tone_override: string; keywords: string }>({ name: "", description: "", colors: "", tone_override: "", keywords: "" });
  const [showAddUniverse, setShowAddUniverse] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const charterRef = useRef<HTMLDivElement>(null);
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const token = () => tokenRef.current || "";

  // Re-fetch vault from server (used after scan to pick up background-saved logo/images)
  const refetchVault = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/vault"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(tokenRef.current),
      });
      const data = await res.json();
      if (data.success && data.vault) {
        setVault((prev) => ({ ...prev, ...data.vault }));
      }
    } catch (err) { console.error("[Vault] Refetch error:", err); }
  }, []);

  const hasData = !!(
    vault.company_name || vault.colors.length || vault.fonts.length ||
    vault.mission || vault.vision || vault.values || vault.key_messages.length ||
    vault.tone || vault.brand_guidelines_text
  );

  // ── Load ──
  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl("/vault"), {
          method: "POST", headers: vaultHeaders(), body: corsBody(accessToken),
        });
        const data = await res.json();
        console.log("[Vault] Load response:", data.success, data.vault ? "has vault" : "no vault");
        if (data.success && data.vault) {
          setVault((prev) => ({ ...prev, ...data.vault }));
          if (data.vault.source_url) setUrlInput(data.vault.source_url);
        }
      } catch (err) { console.error("[Vault] Load error:", err); }
      setLoading(false);
    })();
  }, [accessToken]);

  // ── Save ──
  const saveVault = useCallback(async (newVault?: VaultData) => {
    const v = newVault || vault;
    setSaving(true);
    try {
      await fetch(apiUrl("/vault"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token(), v),
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (err) { console.error("[Vault] Save error:", err); }
    setSaving(false);
  }, [vault]);

  // ── Brand memory: fetch insights on mount (auth + Studio+ plan required,
  //    the server gates it). Silently ignores non-200 so the rest of the
  //    page keeps working if the user isn't eligible or the call fails. ──
  useEffect(() => {
    if (insightsDismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/vault/insights"), {
          method: "POST",
          headers: vaultHeaders(),
          body: corsBody(tokenRef.current),
        });
        if (!res.ok) return;
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (d?.success && d?.hasNewSignal) {
          setInsights({
            colors:   Array.isArray(d.suggestions?.colors)   ? d.suggestions.colors   : [],
            moods:    Array.isArray(d.suggestions?.moods)    ? d.suggestions.moods    : [],
            styles:   Array.isArray(d.suggestions?.styles)   ? d.suggestions.styles   : [],
            lighting: Array.isArray(d.suggestions?.lighting) ? d.suggestions.lighting : [],
            sampleSize: Number(d.sampleSize || 0),
          });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [insightsDismissed]);

  const dismissInsights = useCallback(() => {
    try { localStorage.setItem("ora:vault-insights-dismissed", "1"); } catch {}
    setInsightsDismissed(true);
    setInsights(null);
  }, []);

  const adoptInsights = useCallback(async () => {
    if (!insights || adoptingInsights) return;
    setAdoptingInsights(true);
    try {
      // Merge: keep the existing palette, append the new colors (dedup by hex).
      const existingHexes = new Set((vault.colors || []).map((c: any) => String(c?.hex || "").toUpperCase()));
      const addedColors = insights.colors
        .filter((c) => c.hex && !existingHexes.has(c.hex.toUpperCase()))
        .map((c) => ({ hex: c.hex, name: "", role: "" }));
      const mergedColors = [...(vault.colors || []), ...addedColors];

      // Merge mood/style into photo_style if empty there, otherwise leave untouched
      // to avoid overwriting user intent.
      const nextPhotoStyle = { ...(vault.photo_style || {}) };
      if (!nextPhotoStyle.mood     && insights.moods[0])    nextPhotoStyle.mood    = insights.moods[0].label;
      if (!nextPhotoStyle.lighting && insights.lighting[0]) nextPhotoStyle.lighting = insights.lighting[0].label;

      const nextVault: any = { ...vault, colors: mergedColors, photo_style: nextPhotoStyle };
      setVault(nextVault);
      await saveVault(nextVault);
      dismissInsights();
    } catch (err) {
      console.error("[Vault] Adopt insights error:", err);
    } finally {
      setAdoptingInsights(false);
    }
  }, [insights, adoptingInsights, vault, saveVault, dismissInsights]);

  // ── Reset vault ──
  const handleResetVault = useCallback(async () => {
    if (!confirm(t("vault.resetConfirm"))) return;
    setResetting(true);
    try {
      // Send EMPTY_VAULT with all fields explicitly null/empty to overwrite everything
      const blank: Record<string, any> = {
        company_name: "", industry: "", tagline: "", brandName: "",
        mission: null, vision: null, personality: null, usp: null, values: null,
        products_services: [], target_audiences: [], colors: [], fonts: [],
        logo_url: null, logo_description: null, logoUrl: null, logo_path: null, logoStoragePath: null,
        tone: null, photo_style: null, social_presence: [],
        key_messages: [], approved_terms: [], forbidden_terms: [],
        font_usage_rules: null, competitors: null, brand_guidelines_text: null,
        confidence_score: 0, source_url: null,
        brand_platform: null, voice_profile: null,
        competitors_list: [], universes: [], text_calibration: null, image_calibration: null,
        guidelines: null, compliance: null, onboarding_answers: null,
        conversation_complete: false, updatedAt: new Date().toISOString(),
      };
      const res = await fetch(apiUrl("/vault"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token(), blank),
      });
      const data = await res.json();
      if (data.success) {
        setVault(EMPTY_VAULT);
        setUrlInput("");
      }
    } catch (err) { console.error("[Vault] Reset error:", err); }
    setResetting(false);
  }, []);

  // ── Analyze URL ──
  const handleAnalyzeUrl = async (deepScan = false) => {
    let url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress(deepScan ? t("vault.deepScanning") : t("vault.scanning"));
    try {
      console.log("[Vault] Analyzing URL:", url, "deep:", deepScan);
      const res = await fetch(apiUrl("/vault/analyze"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token(), { url, deep: deepScan }),
      });
      const data = await res.json();
      if (data.success && (data.dna || data.vault)) {
        // Prefer full merged vault from server over just dna
        const serverData = data.vault || data.dna;
        const updated = { ...vault, ...serverData, source_url: url, updatedAt: new Date().toISOString() };
        setVault(updated);
        setAnalyzeProgress("Saving to vault...");
        await saveVault(updated);
        setAnalyzeProgress("Saved!");
        setTimeout(() => setAnalyzeProgress(""), 2000);

        // Logo & brand images are downloaded in background on the server.
        // Re-fetch vault + image bank after a delay to pick them up.
        setTimeout(() => {
          console.log("[Vault] Re-fetching to pick up background-saved logo/images...");
          refetchVault();
          setImageBankRefreshKey((k) => k + 1);
        }, 8000);
        // Second re-fetch for slower image downloads
        setTimeout(() => {
          refetchVault();
          setImageBankRefreshKey((k) => k + 1);
        }, 20000);
      } else {
        setAnalyzeError(data.error || `Analysis failed (${res.status})`);
      }
    } catch (err: any) {
      console.error("[Vault] Analyze network error:", err);
      setAnalyzeError(err?.message || "Network error");
    }
    setAnalyzing(false);
  };

  // ── ORA Voice (fine-tuning) ──
  const fetchOraVoiceStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/vault/voice/status"), {
        method: "GET", headers: vaultHeaders(),
      });
      const data = await res.json();
      if (data.success) setOraVoiceStatus(data);
    } catch (err) { console.error("[Vault] ORA Voice status error:", err); }
  }, []);

  useEffect(() => { fetchOraVoiceStatus(); }, [fetchOraVoiceStatus]);

  // Poll while training
  useEffect(() => {
    const st = oraVoiceStatus?.status;
    if (st === "pending" || st === "running" || st === "queued") {
      const timer = setInterval(fetchOraVoiceStatus, 30_000);
      return () => clearInterval(timer);
    }
  }, [oraVoiceStatus?.status, fetchOraVoiceStatus]);

  const handleTrainOraVoice = async () => {
    setOraVoiceTraining(true);
    setOraVoiceError(null);
    try {
      const res = await fetch(apiUrl("/vault/voice/train"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token()),
      });
      const data = await res.json();
      if (data.success) {
        setOraVoiceStatus({ hasVoice: true, jobId: data.jobId, status: data.status, samplesCount: data.samplesCount });
      } else {
        setOraVoiceError(data.error || "Training failed");
      }
    } catch (err: any) {
      setOraVoiceError(err?.message || "Network error");
    }
    setOraVoiceTraining(false);
  };

  // ── Learn Voice ──
  const handleLearnVoice = async () => {
    setVoiceLearning(true);
    setVoiceError(null);
    try {
      const res = await fetch(apiUrl("/vault/learn-voice"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token()),
      });
      const data = await res.json();
      if (data.success && data.voice_profile) {
        setVault(prev => ({ ...prev, voice_profile: data.voice_profile }));
      } else {
        setVoiceError(data.error || "Voice learning failed");
      }
    } catch (err: any) {
      console.error("[Vault] Voice learn error:", err);
      setVoiceError(err?.message || "Network error");
    }
    setVoiceLearning(false);
  };

  // ── Scan Competitor ──
  const handleScanCompetitor = async () => {
    let url = competitorUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    setCompetitorLoading(true);
    setCompetitorError(null);
    try {
      const res = await fetch(apiUrl("/vault/scan-competitor"), {
        method: "POST", headers: { "Content-Type": "text/plain" }, body: corsBody(accessToken, { url }),
      });
      const data = await res.json();
      if (data.success && data.competitor) {
        const updated = { ...vault, competitors_list: [...(vault.competitors_list || []), data.competitor] };
        setVault(updated);
        await saveVault(updated);
        setCompetitorUrl("");
      } else {
        setCompetitorError(data.error || "Scan failed");
      }
    } catch (err: any) {
      setCompetitorError(err?.message || "Network error");
    }
    setCompetitorLoading(false);
  };

  const handleRemoveCompetitor = async (index: number) => {
    const list = [...(vault.competitors_list || [])];
    list.splice(index, 1);
    const updated = { ...vault, competitors_list: list };
    setVault(updated);
    await saveVault(updated);
  };

  // ── Universe Management ──
  const handleAddUniverse = async () => {
    if (!newUniverse.name.trim()) return;
    const universe = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: newUniverse.name.trim(),
      description: newUniverse.description.trim(),
      colors: newUniverse.colors.split(",").map(s => s.trim()).filter(Boolean),
      tone_override: newUniverse.tone_override.trim(),
      keywords: newUniverse.keywords.split(",").map(s => s.trim()).filter(Boolean),
    };
    const updated = { ...vault, universes: [...(vault.universes || []), universe] };
    setVault(updated);
    await saveVault(updated);
    setNewUniverse({ name: "", description: "", colors: "", tone_override: "", keywords: "" });
    setShowAddUniverse(false);
  };

  const handleUpdateUniverse = async (id: string, fields: Partial<{ name: string; description: string; colors: string[]; tone_override: string; keywords: string[] }>) => {
    const list = (vault.universes || []).map(u => u.id === id ? { ...u, ...fields } : u);
    const updated = { ...vault, universes: list };
    setVault(updated);
    await saveVault(updated);
    setUniverseEditing(null);
  };

  const handleDeleteUniverse = async (id: string) => {
    const list = (vault.universes || []).filter(u => u.id !== id);
    const updated = { ...vault, universes: list };
    setVault(updated);
    await saveVault(updated);
  };

  // ── Extract text from PDF client-side using pdf.js (fallback) ──
  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(" ");
      if (text.trim()) pages.push(text);
    }
    return pages.join("\n\n");
  };

  // ── Extract embedded images from PDF using pdf.js ──
  // Extract embedded raster images (photos, bitmaps) from PDF
  const extractPdfRasterImages = async (file: File): Promise<{ blob: Blob; page: number; w: number; h: number }[]> => {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const results: { blob: Blob; page: number; w: number; h: number }[] = [];
    const MIN_SIZE = 80; // skip tiny decorations
    const seen = new Set<string>(); // deduplicate by size signature

    const imgDataToBlob = async (imgData: any): Promise<Blob | null> => {
      if (!imgData) return null;
      // Handle ImageBitmap or HTMLImageElement (some pdf.js versions)
      if (typeof ImageBitmap !== "undefined" && imgData instanceof ImageBitmap) {
        const canvas = document.createElement("canvas");
        canvas.width = imgData.width; canvas.height = imgData.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(imgData, 0, 0);
        return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      }
      if (imgData instanceof HTMLImageElement) {
        const canvas = document.createElement("canvas");
        canvas.width = imgData.naturalWidth; canvas.height = imgData.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(imgData, 0, 0);
        return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      }
      // Standard pdf.js image data: { width, height, data, kind }
      if (!imgData.width || !imgData.height || !imgData.data) return null;
      if (imgData.width < MIN_SIZE || imgData.height < MIN_SIZE) return null;
      const canvas = document.createElement("canvas");
      canvas.width = imgData.width; canvas.height = imgData.height;
      const ctx = canvas.getContext("2d")!;
      const src = imgData.data;
      const imgDataObj = ctx.createImageData(imgData.width, imgData.height);
      const dest = imgDataObj.data;
      const hasAlpha = imgData.kind === 3 || src.length === imgData.width * imgData.height * 4;
      if (hasAlpha) {
        dest.set(src);
      } else {
        const pixelCount = imgData.width * imgData.height;
        for (let p = 0; p < pixelCount; p++) {
          dest[p * 4] = src[p * 3];
          dest[p * 4 + 1] = src[p * 3 + 1];
          dest[p * 4 + 2] = src[p * 3 + 2];
          dest[p * 4 + 3] = 255;
        }
      }
      ctx.putImageData(imgDataObj, 0, 0);
      return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    };

    // Build reverse lookup: op code → op name for debugging
    const opNames: Record<number, string> = {};
    for (const [name, code] of Object.entries(pdfjsLib.OPS)) {
      opNames[code as number] = name;
    }
    const imageOps = new Set([
      pdfjsLib.OPS.paintImageXObject,
      pdfjsLib.OPS.paintJpegXObject,
      pdfjsLib.OPS.paintInlineImageXObject,
      pdfjsLib.OPS.paintInlineImageXObjectGroup,
      pdfjsLib.OPS.paintImageMaskXObject,
      pdfjsLib.OPS.paintImageMaskXObjectGroup,
      pdfjsLib.OPS.paintImageMaskXObjectRepeat,
    ]);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const ops = await page.getOperatorList();

      // Debug: log all image-related operators found on this page
      const pageImageOps: string[] = [];
      for (let j = 0; j < ops.fnArray.length; j++) {
        if (imageOps.has(ops.fnArray[j])) {
          const name = opNames[ops.fnArray[j]] || `op${ops.fnArray[j]}`;
          const args = ops.argsArray[j];
          const argInfo = args?.[0] ? (typeof args[0] === "string" ? args[0] : `w=${args[0]?.width||"?"}`) : "noarg";
          pageImageOps.push(`${name}(${argInfo})`);
        }
      }
      if (pageImageOps.length > 0) {
        console.log(`[Vault] p${i} image ops: ${pageImageOps.join(", ")}`);
      }

      for (let j = 0; j < ops.fnArray.length; j++) {
        const op = ops.fnArray[j];
        try {
          // Named image XObjects (most common for photos/logos)
          if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintJpegXObject) {
            const imgName = ops.argsArray[j][0];
            let imgData: any = null;
            try {
              imgData = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
                page.objs.get(imgName, (data: any) => { clearTimeout(timeout); resolve(data); });
              });
            } catch {
              try {
                imgData = await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => reject(new Error("timeout")), 3000);
                  page.commonObjs.get(imgName, (data: any) => { clearTimeout(timeout); resolve(data); });
                });
              } catch { imgData = null; }
            }
            if (!imgData) { console.log(`[Vault] p${i} ${imgName}: no data`); continue; }
            const w = imgData.width || imgData.naturalWidth || 0;
            const h = imgData.height || imgData.naturalHeight || 0;
            console.log(`[Vault] p${i} ${imgName}: ${w}×${h} kind=${imgData.kind} type=${typeof imgData} bitmap=${imgData instanceof ImageBitmap}`);
            if (w < MIN_SIZE || h < MIN_SIZE) continue;
            const sig = `${w}x${h}`;
            if (seen.has(sig)) continue;
            const blob = await imgDataToBlob(imgData);
            if (blob && blob.size > 1000) {
              seen.add(sig);
              results.push({ blob, page: i, w, h });
              console.log(`[Vault] ✓ Extracted img p${i}: ${w}×${h} (${(blob.size/1024).toFixed(0)}KB)`);
            }
          }
          // Inline images (embedded directly in content stream)
          else if (op === pdfjsLib.OPS.paintInlineImageXObject || op === pdfjsLib.OPS.paintInlineImageXObjectGroup) {
            const inlineData = ops.argsArray[j][0];
            if (!inlineData) continue;
            const w = inlineData.width || 0;
            const h = inlineData.height || 0;
            console.log(`[Vault] p${i} inline: ${w}×${h} kind=${inlineData.kind}`);
            if (w < MIN_SIZE || h < MIN_SIZE) continue;
            const sig = `inline-${w}x${h}`;
            if (seen.has(sig)) continue;
            const blob = await imgDataToBlob(inlineData);
            if (blob && blob.size > 1000) {
              seen.add(sig);
              results.push({ blob, page: i, w, h });
              console.log(`[Vault] ✓ Extracted inline p${i}: ${w}×${h} (${(blob.size/1024).toFixed(0)}KB)`);
            }
          }
          // Image masks (may contain actual photos behind masks)
          else if (op === pdfjsLib.OPS.paintImageMaskXObject) {
            const maskData = ops.argsArray[j][0];
            if (!maskData) continue;
            const w = maskData.width || 0;
            const h = maskData.height || 0;
            if (w >= MIN_SIZE && h >= MIN_SIZE) {
              console.log(`[Vault] p${i} imageMask: ${w}×${h} (skipping masks for now)`);
            }
          }
        } catch (e: any) {
          console.log(`[Vault] p${i} extraction error: ${e?.message}`);
        }
      }
      page.cleanup();
    }
    console.log(`[Vault] Raster extraction complete: ${results.length} images from ${pdf.numPages} pages`);
    return results;
  };

  // Render each PDF page as a full-page PNG (captures vectors, logos, pictos, layout)
  const renderPdfPages = async (file: File, maxPages = 30, scale = 2): Promise<Blob[]> => {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageBlobs: Blob[] = [];
    const numPages = Math.min(pdf.numPages, maxPages);

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.75)
        );
        if (blob && blob.size > 1000) pageBlobs.push(blob);
        page.cleanup();
      } catch (err) {
        console.warn(`[Vault] Failed to render page ${i}:`, err);
      }
    }
    return pageBlobs;
  };

  // ── Analyze File ──
  const handleFile = async (file: File) => {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress(`Analyzing ${file.name}...`);
    try {
      // Block unsupported formats (Keynote, Numbers, Pages — Apple proprietary)
      const unsupportedExt = file.name.match(/\.(key|numbers|pages)$/i);
      if (unsupportedExt) {
        setAnalyzeError(t("vault.unsupportedFormat"));
        setAnalyzing(false);
        return;
      }

      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocument = isPDF || !!file.name.match(/\.(pptx?|docx?)$/i);

      if (isImage || isDocument) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("_token", token());
        setAnalyzeProgress(isDocument ? `Extracting brand DNA from ${file.name}...` : `Analyzing ${file.name}...`);
        let data: any = {};
        let analyzeFileFailed = false;
        try {
          const res = await fetch(apiUrl("/vault/analyze-file"), { method: "POST", headers: vaultFormHeaders(), body: formData });
          data = await res.json();
          console.log("[Vault] analyze-file response:", JSON.stringify(data).slice(0, 500));
          if (!res.ok || !data.success) analyzeFileFailed = true;
        } catch (err: any) {
          console.warn("[Vault] analyze-file network error:", err?.message);
          analyzeFileFailed = true;
        }

        // If backend failed entirely (546 WORKER_LIMIT, timeout, etc.) → fall back to client-side PDF extraction
        if (analyzeFileFailed && isPDF) {
          console.log("[Vault] analyze-file failed, falling back to client-side pdf.js extraction...");
          setAnalyzeProgress("Reading PDF text (client-side)...");
          const clientText = await extractPdfText(file);
          console.log(`[Vault] pdf.js fallback extracted ${clientText.length} chars`);
          if (clientText.length >= 50) {
            data = { success: true, extractedText: clientText };
            analyzeFileFailed = false;
          }
        }

        let dnaOk = false;
        if (data.success && data.dna) {
          console.log("[Vault] Direct DNA from file:", data.dna.company_name, `${data.dna.colors?.length || 0} colors`);
          const updated = mergeVaultData(vault, data.dna);
          updated.updatedAt = new Date().toISOString();
          setVault(updated);
          setAnalyzeProgress("Saving to vault...");
          await saveVault(updated);
          dnaOk = true;
        } else if (data.success && data.extractedText) {
          // Check if extractedText is binary garbage or just metadata (no real content)
          let textForAI = data.extractedText;
          const isMetadataOnly = textForAI.startsWith("[Document uploaded:") || textForAI.startsWith("[File:");
          const isBinaryGarbage = textForAI.startsWith("%PDF") || textForAI.startsWith("\\x") || (textForAI.match(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g)?.length || 0) > textForAI.length * 0.3;
          if ((isBinaryGarbage || isMetadataOnly) && isPDF) {
            console.log("[Vault] Backend returned binary garbage or metadata only, extracting text client-side with pdf.js...");
            setAnalyzeProgress("Reading PDF text...");
            textForAI = await extractPdfText(file);
            console.log(`[Vault] pdf.js extracted ${textForAI.length} chars`);
          }
          if (isMetadataOnly && !isPDF) {
            // Non-PDF file where server couldn't extract real content
            setAnalyzeError(t("vault.unsupportedFormat"));
            setAnalyzing(false);
            return;
          }
          if (textForAI.length < 50) { setAnalyzeError("Could not extract text from file"); }
          else {
            console.log(`[Vault] Sending ${textForAI.length} chars to /vault/analyze (sourceType=pdf-charter)...`);
            setAnalyzeProgress("Structuring brand data (this may take 30-60s)...");
            try {
              const res2 = await fetch(apiUrl("/vault/analyze"), {
                method: "POST", headers: vaultHeaders(),
                body: corsBody(token(), { content: textForAI.slice(0, 25000), sourceName: file.name, sourceType: "pdf-charter" }),
              });
              console.log(`[Vault] /vault/analyze status: ${res2.status}`);
              const data2 = await res2.json();
              console.log("[Vault] /vault/analyze response:", JSON.stringify(data2).slice(0, 300));
              if (data2.success && data2.dna) {
                console.log(`[Vault] Charter DNA: ${data2.dna.company_name}, colors=${data2.dna.colors?.length}, mission=${!!data2.dna.mission}, _path=${data2._path || "unknown"}`);
                const updated = mergeVaultData(vault, data2.dna);
                updated.updatedAt = new Date().toISOString();
                setVault(updated);
                setAnalyzeProgress("Saving to vault...");
                await saveVault(updated);
                dnaOk = true;
              } else {
                console.error("[Vault] /vault/analyze failed:", data2.error);
                setAnalyzeError(data2.error || "Analysis failed");
              }
            } catch (fetchErr: any) {
              console.error("[Vault] /vault/analyze fetch error:", fetchErr?.message || fetchErr);
              setAnalyzeError(`Analysis request failed: ${fetchErr?.message || "network error"}`);
            }
          }
        } else { setAnalyzeError(data.error || "Could not extract content from file"); }

        // Extract images from PDF: try Adobe Extract first, fallback to page rendering
        if (dnaOk && isPDF) {
          let adobeOk = false;
          // ─── Primary: Adobe PDF Extract API (individual figures) ───
          try {
            setAnalyzeProgress("Extracting visual assets from PDF...");
            console.log("[Vault] Trying Adobe Extract API...");

            const extractForm = new FormData();
            extractForm.append("file", file);
            extractForm.append("_token", token());
            extractForm.append("brand_name", vault.company_name || "");

            const extractRes = await fetch(apiUrl("/vault/adobe-extract"), {
              method: "POST",
              headers: apiHeaders(false),
              body: extractForm,
            });

            if (extractRes.ok) {
              const extractData = await extractRes.json();
              console.log(`[Vault] Adobe Extract: ${JSON.stringify(extractData.stats)}, elapsed=${extractData._elapsed}ms`);
              if (extractData.stats?.uploaded > 0) {
                adobeOk = true;
                setAnalyzeProgress(`${extractData.stats.uploaded} visual asset${extractData.stats.uploaded > 1 ? "s" : ""} extracted and added to Image Bank`);
              }
            } else {
              const errText = await extractRes.text().catch(() => extractRes.statusText);
              console.warn(`[Vault] Adobe Extract failed (${extractRes.status}): ${errText}`);
            }
          } catch (err: any) {
            console.warn("[Vault] Adobe Extract error:", err?.message || err);
          }

          // ─── Fallback: Render pages + AI categorization (if Adobe failed) ───
          if (!adobeOk) {
            try {
              console.log("[Vault] Fallback: rendering PDF pages for AI categorization...");
              setAnalyzeProgress("Rendering PDF pages for visual analysis...");
              const pageBlobs = await renderPdfPages(file, 30, 2);
              console.log(`[Vault] Pages: ${pageBlobs.length} rendered`);
              const pdfName = file.name.replace(/\.pdf$/i, "");

              if (pageBlobs.length > 0) {
                setAnalyzeProgress(`Classifying ${pageBlobs.length} pages with AI...`);
                const results = await Promise.allSettled(pageBlobs.map(async (blob, idx) => {
                  const form = new FormData();
                  form.append("files", blob, `${pdfName}_page_${idx + 1}.jpg`);
                  form.append("_token", token());
                  form.append("brand_name", vault.company_name || "");
                  form.append("source", "pdf-charter");
                  const res = await fetch(apiUrl("/vault/pdf-images-upload"), { method: "POST", headers: apiHeaders(false), body: form });
                  if (!res.ok) throw new Error(`${res.status}`);
                  return res.json();
                }));

                let uploaded = 0, skipped = 0;
                for (const r of results) {
                  if (r.status === "fulfilled" && r.value?.success) {
                    uploaded += r.value.stats?.uploaded || 0;
                    skipped += r.value.stats?.skipped || 0;
                  }
                }
                const failed = results.filter(r => r.status === "rejected").length;
                console.log(`[Vault] Fallback: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
                if (uploaded > 0) {
                  setAnalyzeProgress(`${uploaded} visual asset${uploaded > 1 ? "s" : ""} added to Image Bank`);
                }
              }
            } catch (err: any) {
              console.warn("[Vault] Fallback page render error:", err?.message || err);
            }
          }
        }

        if (dnaOk) {
          setAnalyzeProgress("Saved!");
          setTimeout(() => setAnalyzeProgress(""), 2000);
          // Scroll to Brand Charter if it now has data
          setTimeout(() => charterRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
        }
      } else {
        const text = await file.text();
        if (text.length < 50) { setAnalyzeError("File content too short"); setAnalyzing(false); return; }
        const res = await fetch(apiUrl("/vault/analyze"), {
          method: "POST", headers: vaultHeaders(),
          body: corsBody(token(), { content: text, sourceName: file.name, sourceType: "file" }),
        });
        const data = await res.json();
        if (data.success && data.dna) {
          const updated = mergeVaultData(vault, data.dna);
          updated.updatedAt = new Date().toISOString();
          setVault(updated);
          setAnalyzeProgress("Saving to vault...");
          await saveVault(updated);
          setAnalyzeProgress("Saved!");
          setTimeout(() => setAnalyzeProgress(""), 2000);
        } else { setAnalyzeError(data.error || "Analysis failed"); }
      }
    } catch (err: any) { setAnalyzeError(err?.message || "File analysis error"); }
    setAnalyzing(false);
  };

  // ── Logo Upload ──
  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("_token", token());
      const res = await fetch(apiUrl("/vault/upload-logo"), { method: "POST", headers: vaultFormHeaders(), body: formData });
      const data = await res.json();
      if (data.success && data.logoUrl) {
        const updated = { ...vault, logo_url: data.logoUrl };
        setVault(updated as VaultData);
        await saveVault(updated as VaultData);
      }
    } catch (err) { console.error("[Vault] Logo upload error:", err); }
    setLogoUploading(false);
  };

  // ── Drop zone ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const socialIcons: Record<string, any> = {
    instagram: Instagram, linkedin: Linkedin, twitter: Twitter, x: Twitter,
    facebook: Facebook, youtube: Youtube,
  };

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const isOpen = (id: string) => !collapsedSections.has(id);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  return (
    <div className="min-h-screen" style={{ background: COLORS.cream, color: COLORS.ink }}>
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-16">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="mb-3 uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: COLORS.coral }}>
              Brand Vault
            </p>
            <h1 className="leading-none mb-3" style={{ ...bagel, fontSize: "clamp(48px, 7vw, 96px)", color: COLORS.ink }}>
              {t("vault.title")}
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.55, color: COLORS.muted, fontWeight: 500, maxWidth: 540 }}>
              {t("vault.subtitle")}
            </p>
          </div>
          {hasData && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => saveVault()}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer disabled:opacity-50 transition-all shrink-0"
              style={{
                background: saveOk ? "rgba(93,138,77,0.1)" : "var(--accent-warm-light)",
                border: saveOk ? "1px solid rgba(93,138,77,0.25)" : "1px solid var(--accent-warm-medium)",
                fontSize: "13px",
                fontWeight: 500,
                color: saveOk ? "var(--ora-olive)" : "var(--accent)",
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveOk ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {saving ? t("vault.saving") : saveOk ? t("vault.saved") : t("vault.save")}
            </motion.button>
          )}
          {/* Reset button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleResetVault}
            disabled={resetting}
            className="flex items-center gap-2 px-3 py-2.5 rounded-full cursor-pointer disabled:opacity-50 transition-all shrink-0"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: "12px",
              fontWeight: 500,
              color: "#ef4444",
            }}
            title={t("vault.resetConfirm")}
          >
            {resetting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {t("vault.reset")}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Brand memory nudge — the longer you stay, the smarter it gets ── */}
      <AnimatePresence>
        {insights && !insightsDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-8 rounded-3xl p-6 md:p-8"
            style={{ background: COLORS.warm, border: `1px solid ${COLORS.line}` }}
          >
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div>
                <p className="uppercase mb-2" style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", color: COLORS.coral }}>
                  Brand memory
                </p>
                <h3 className="leading-none mb-2" style={{ ...bagel, fontSize: "clamp(24px, 3vw, 34px)", color: COLORS.ink }}>
                  We noticed.
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: COLORS.muted, maxWidth: 620 }}>
                  {insights.sampleSize > 1
                    ? `Across ${insights.sampleSize} of your assets, these signals keep coming back. Lock them into your Vault so every surprise hits sharper.`
                    : `These signals recur in your assets. Lock them into your Vault so every surprise hits sharper.`}
                </p>
              </div>
              <button
                onClick={dismissInsights}
                aria-label="Dismiss"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition shrink-0"
                style={{ color: COLORS.muted }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              {insights.colors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: COLORS.subtle, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", minWidth: 60 }}>
                    Palette
                  </span>
                  {insights.colors.slice(0, 6).map((c) => (
                    <span
                      key={c.hex}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full"
                      style={{ background: "#FFFFFF", border: `1px solid ${COLORS.line}` }}
                      title={`${c.hits} occurrence${c.hits > 1 ? "s" : ""}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }} />
                      <span className="font-mono" style={{ fontSize: 11, color: COLORS.ink }}>{c.hex}</span>
                    </span>
                  ))}
                </div>
              )}
              {insights.moods.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: COLORS.subtle, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", minWidth: 60 }}>
                    Mood
                  </span>
                  {insights.moods.slice(0, 4).map((m) => (
                    <span key={m.label} className="inline-flex items-center h-7 px-3 rounded-full capitalize"
                          style={{ background: "#FFFFFF", border: `1px solid ${COLORS.line}`, fontSize: 12, color: COLORS.ink, fontWeight: 500 }}>
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
              {insights.lighting.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: COLORS.subtle, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", minWidth: 60 }}>
                    Light
                  </span>
                  {insights.lighting.slice(0, 3).map((l) => (
                    <span key={l.label} className="inline-flex items-center h-7 px-3 rounded-full capitalize"
                          style={{ background: "#FFFFFF", border: `1px solid ${COLORS.line}`, fontSize: 12, color: COLORS.ink, fontWeight: 500 }}>
                      {l.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={adoptInsights}
                disabled={adoptingInsights}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full transition hover:opacity-90 disabled:opacity-60"
                style={{ background: COLORS.ink, color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}
              >
                {adoptingInsights ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {adoptingInsights ? "Locking…" : "Lock into my Vault"}
              </button>
              <button
                onClick={dismissInsights}
                className="inline-flex items-center h-10 px-4 rounded-full transition hover:bg-black/5"
                style={{ color: COLORS.muted, fontSize: 13, fontWeight: 500 }}
              >
                Not this time
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scanner ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl p-5 mb-10"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>

        {/* URL row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)" }}>
            <Globe size={15} style={{ color: "var(--accent)", opacity: 0.7 }} />
            <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !analyzing && handleAnalyzeUrl()}
              placeholder={t("vault.scanPlaceholder")} disabled={analyzing}
              className="flex-1 bg-transparent outline-none placeholder:text-white/15"
              style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 400 }} />
          </div>
          <button
            onClick={() => handleAnalyzeUrl(false)} disabled={analyzing || !urlInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer disabled:opacity-30 transition-opacity"
            style={{ background: "linear-gradient(135deg, #FF5C39, #EC4899)", fontSize: "13px", fontWeight: 500, color: "#FFFFFF" }}>
            {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {t("vault.scanBtn")}
          </button>
          <button
            onClick={() => handleAnalyzeUrl(true)} disabled={analyzing || !urlInput.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer disabled:opacity-30 transition-opacity"
            style={{ border: "1px solid var(--border-strong)", fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
            <Layers size={13} /> {t("vault.deep")}
          </button>
        </div>

        {/* File drop */}
        <div onClick={() => !analyzing && fileRef.current?.click()}
          className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl cursor-pointer transition-all"
          style={{
            border: `1px dashed ${dragOver ? "rgba(17,17,17,0.5)" : "rgba(26,23,20,0.04)"}`,
            background: dragOver ? "rgba(17,17,17,0.04)" : "transparent",
          }}>
          <Upload size={14} style={{ color: "rgba(26,23,20,0.18)" }} />
          <span style={{ fontSize: "12px", color: "rgba(26,23,20,0.18)", fontWeight: 400 }}>
            {t("vault.dropzone")}
          </span>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.svg"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Progress / Error */}
        <AnimatePresence>
          {(analyzing || analyzeProgress) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              {analyzing ? (
                <Loader2 size={13} className="animate-spin" style={{ color: "var(--accent)" }} />
              ) : analyzeProgress === "Saved!" ? (
                <Check size={13} style={{ color: "#666666" }} />
              ) : null}
              <span style={{ fontSize: "12px", fontWeight: 500, color: analyzeProgress === "Saved!" ? "#666666" : "var(--accent)" }}>
                {analyzeProgress}
              </span>
            </motion.div>
          )}
          {analyzeError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <X size={13} style={{ color: "#DC2626" }} />
              <span style={{ fontSize: "12px", color: "#DC2626" }}>{analyzeError}</span>
              <button onClick={() => setAnalyzeError(null)} className="ml-auto cursor-pointer">
                <X size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Brand Data ── */}
      <AnimatePresence>
        {hasData && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

            {/* ═══ IDENTITY HEADER ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6 mb-6"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="relative group shrink-0">
                    {vault.logo_url ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/90 flex items-center justify-center"
                        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                        <img src={vault.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                        onClick={() => logoRef.current?.click()}
                        style={{ background: "rgba(17,17,17,0.08)", border: "1px dashed rgba(17,17,17,0.3)" }}>
                        {logoUploading ? <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} /> : <Plus size={16} style={{ color: "var(--accent)" }} />}
                      </div>
                    )}
                    {vault.logo_url && (
                      <button onClick={() => logoRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <RefreshCw size={12} className="text-white" />
                      </button>
                    )}
                    <input ref={logoRef} type="file" className="hidden" accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                  </div>

                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                      {vault.company_name}
                    </h2>
                    {vault.industry && (
                      <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-tertiary)" }}>{vault.industry}</span>
                    )}
                    {vault.tagline && (
                      <p style={{ fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 2 }}>"{vault.tagline}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {vault.confidence_score > 0 && (
                    <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl"
                      style={{ background: "rgba(17,17,17,0.08)", border: "1px solid rgba(17,17,17,0.15)" }}>
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--accent)" }}>{vault.confidence_score}</span>
                      <span style={{ fontSize: "10px", color: "rgba(17,17,17,0.6)", fontWeight: 500 }}>/100</span>
                    </div>
                  )}
                  {vault.source_url && (
                    <button onClick={() => handleAnalyzeUrl(true)} disabled={analyzing}
                      className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06]"
                      style={{ border: "1px solid rgba(26,23,20,0.04)" }}>
                      <RefreshCw size={13} className={analyzing ? "animate-spin" : ""} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {([
                { key: "identity" as const, label: t("vault.tabIdentity") },
                { key: "audience" as const, label: t("vault.tabAudience") },
                { key: "voice" as const, label: t("vault.tabVoice") },
                { key: "visuals" as const, label: t("vault.tabVisuals") },
                { key: "competitors" as const, label: t("vault.tabCompetitors") },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setVaultTab(key)}
                  className="px-4 py-2 rounded-full cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    background: vaultTab === key ? "var(--foreground)" : "transparent",
                    color: vaultTab === key ? "var(--background)" : "var(--text-tertiary)",
                    border: vaultTab === key ? "none" : "1px solid var(--border)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ═══ TAB CONTENT ═══ */}

            {/* ── Tab 1: Identité ── */}
            {vaultTab === "identity" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brand Guidelines (Charter) -- full width */}
                {(vault.mission || vault.vision || vault.personality || vault.usp || vault.values || vault.font_usage_rules || vault.competitors || vault.brand_guidelines_text) && (
                  <div ref={charterRef} className="md:col-span-2">
                    <SectionCard icon={BookOpen} title={t("vault.brandGuidelines")}
                      count={[vault.mission, vault.vision, vault.personality, vault.usp, vault.values, vault.font_usage_rules, vault.competitors, vault.brand_guidelines_text].filter(Boolean).length}
                      open={isOpen("charter")} onToggle={() => toggleSection("charter")}>
                      <div className="space-y-3">
                        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                          {t("vault.guidelinesDesc")}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { label: t("vault.mission"), value: vault.mission, key: "mission" },
                            { label: t("vault.vision"), value: vault.vision, key: "vision" },
                            { label: t("vault.personality"), value: vault.personality, key: "personality" },
                            { label: t("vault.usp"), value: vault.usp, key: "usp" },
                            { label: t("vault.values"), value: vault.values, key: "values" },
                          ].filter(x => x.value).map((field) => (
                            <div key={field.key} className="p-3 rounded-xl"
                              style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {field.label}
                              </span>
                              <p style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--foreground)", marginTop: 4 }}>{field.value}</p>
                            </div>
                          ))}
                        </div>
                        {vault.brand_guidelines_text && (
                          <div className="p-3 rounded-xl"
                            style={{ background: "rgba(17,17,17,0.04)", border: "1px solid rgba(17,17,17,0.08)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.brandGuidelines")}
                            </span>
                            <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 4, whiteSpace: "pre-line" }}>
                              {vault.brand_guidelines_text}
                            </p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Brand Platform (Strategy) -- full width */}
                <div className="md:col-span-2">
                  <SectionCard icon={Compass} title={t("vault.brandPlatform")}
                    count={vault.brand_platform ? 1 : 0}
                    open={isOpen("strategy")} onToggle={() => toggleSection("strategy")}>
                    {vault.brand_platform ? (
                      <BrandStrategyDisplay platform={vault.brand_platform} onEdit={() => {
                        setVault(prev => ({ ...prev, brand_platform: null }));
                      }} />
                    ) : (
                      <BrandStrategyOnboarding
                        vault={vault}
                        onComplete={(platform) => {
                          const updated = { ...vault, brand_platform: platform };
                          setVault(updated);
                          saveVault(updated);
                        }}
                      />
                    )}
                  </SectionCard>
                </div>

                {/* Products & Services */}
                <div className="md:col-span-2">
                  <SectionCard icon={ShoppingBag} title={t("vault.products")} count={vault.products_services.length}
                    open={isOpen("products")} onToggle={() => toggleSection("products")}>
                    {vault.products_services.length > 0 ? (
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {vault.products_services.map((p, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg"
                              style={{ fontSize: "12px", fontWeight: 500, background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                              {p}
                            </span>
                          ))}
                        </div>
                        <Link to="/hub/vault/products"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
                          style={{ background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: 500 }}>
                          <ShoppingBag size={14} /> {t("vault.manageProducts")}
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <EmptyState />
                        <Link to="/hub/vault/products"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl mt-3 transition-all hover:opacity-90"
                          style={{ background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: 500 }}>
                          <Plus size={14} /> {t("vault.manageProducts")}
                        </Link>
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Product Universes */}
                <div className="md:col-span-2">
                  <SectionCard icon={Layers} title={t("vault.productUniverse")} count={(vault.universes || []).length}
                    open={isOpen("universes")} onToggle={() => toggleSection("universes")}>
                    <div className="space-y-3">
                      {(vault.universes || []).length > 0 ? (
                        <div className="space-y-3">
                          {(vault.universes || []).map((u) => (
                            <div key={u.id} className="p-4 rounded-xl"
                              style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{u.name}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setUniverseEditing(universeEditing === u.id ? null : u.id)}
                                    className="px-2.5 py-1 rounded-full cursor-pointer transition-colors hover:bg-secondary"
                                    style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-tertiary)", border: "1px solid var(--border)" }}>
                                    {universeEditing === u.id ? t("vault.close") : t("vault.edit")}
                                  </button>
                                  <button onClick={() => handleDeleteUniverse(u.id)}
                                    className="p-1.5 rounded-full cursor-pointer transition-colors hover:bg-red-50"
                                    style={{ color: "#DC2626" }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              {u.description && (
                                <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text-tertiary)", marginBottom: 8 }}>{u.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {(u.colors || []).map((c, ci) => (
                                  <div key={ci} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} title={c} />
                                ))}
                                {u.tone_override && (
                                  <span className="px-2 py-0.5 rounded" style={{ fontSize: "10px", fontWeight: 500, background: "rgba(17,17,17,0.06)", color: "var(--accent)" }}>
                                    {u.tone_override}
                                  </span>
                                )}
                                {(u.keywords || []).map((k, ki) => (
                                  <span key={ki} className="px-2 py-0.5 rounded" style={{ fontSize: "10px", fontWeight: 500, background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                                    {k}
                                  </span>
                                ))}
                              </div>
                              {/* Edit form */}
                              {universeEditing === u.id && (
                                <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                                  <div>
                                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.name")}</label>
                                    <input defaultValue={u.name} id={`uni-name-${u.id}`}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                      style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.description")}</label>
                                    <textarea defaultValue={u.description} id={`uni-desc-${u.id}`}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none resize-none"
                                      style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 60 }} />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.colorsHex")}</label>
                                      <input defaultValue={(u.colors || []).join(", ")} id={`uni-colors-${u.id}`}
                                        className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                        style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }} />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.toneLabel")}</label>
                                      <input defaultValue={u.tone_override || ""} id={`uni-tone-${u.id}`}
                                        className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                        style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }} />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.keywords")}</label>
                                      <input defaultValue={(u.keywords || []).join(", ")} id={`uni-kw-${u.id}`}
                                        className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                        style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }} />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const name = (document.getElementById(`uni-name-${u.id}`) as HTMLInputElement)?.value || u.name;
                                      const description = (document.getElementById(`uni-desc-${u.id}`) as HTMLTextAreaElement)?.value || u.description;
                                      const colors = (document.getElementById(`uni-colors-${u.id}`) as HTMLInputElement)?.value.split(",").map(s => s.trim()).filter(Boolean) || u.colors;
                                      const tone_override = (document.getElementById(`uni-tone-${u.id}`) as HTMLInputElement)?.value || u.tone_override;
                                      const keywords = (document.getElementById(`uni-kw-${u.id}`) as HTMLInputElement)?.value.split(",").map(s => s.trim()).filter(Boolean) || u.keywords;
                                      handleUpdateUniverse(u.id, { name, description, colors, tone_override, keywords });
                                    }}
                                    className="px-4 py-2 rounded-full cursor-pointer transition-all"
                                    style={{ fontSize: "12px", fontWeight: 500, background: "var(--accent)", color: "#fff" }}>
                                    {t("vault.saveBtn")}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{t("vault.noProductUniverse")}</p>
                      )}

                      {/* Add universe */}
                      {showAddUniverse ? (
                        <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.nameRequired")}</label>
                            <input value={newUniverse.name} onChange={(e) => setNewUniverse({ ...newUniverse, name: e.target.value })}
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                              style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }}
                              placeholder={t("vault.universePlaceholder")} />
                          </div>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.description")}</label>
                            <textarea value={newUniverse.description} onChange={(e) => setNewUniverse({ ...newUniverse, description: e.target.value })}
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none resize-none"
                              style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 60 }}
                              placeholder={t("vault.universeDescPlaceholder")} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.colorsHex")}</label>
                              <input value={newUniverse.colors} onChange={(e) => setNewUniverse({ ...newUniverse, colors: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }}
                                placeholder={t("vault.colorsPlaceholder")} />
                            </div>
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.toneLabel")}</label>
                              <input value={newUniverse.tone_override} onChange={(e) => setNewUniverse({ ...newUniverse, tone_override: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }}
                                placeholder={t("vault.tonePlaceholder")} />
                            </div>
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.keywords")}</label>
                              <input value={newUniverse.keywords} onChange={(e) => setNewUniverse({ ...newUniverse, keywords: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-transparent outline-none"
                                style={{ fontSize: "13px", color: "var(--foreground)", border: "1px solid var(--border)" }}
                                placeholder={t("vault.keywordsPlaceholder")} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleAddUniverse} disabled={!newUniverse.name.trim()}
                              className="px-4 py-2 rounded-full cursor-pointer transition-all disabled:opacity-30"
                              style={{ fontSize: "12px", fontWeight: 500, background: "var(--accent)", color: "#fff" }}>
                              {t("vault.create")}
                            </button>
                            <button onClick={() => setShowAddUniverse(false)}
                              className="px-4 py-2 rounded-full cursor-pointer transition-all"
                              style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-tertiary)", border: "1px solid var(--border)" }}>
                              {t("vault.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddUniverse(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90"
                          style={{ background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: 500 }}>
                          <Plus size={14} /> {t("vault.addUniverse")}
                        </button>
                      )}
                    </div>
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ── Tab 2: Audience ── */}
            {vaultTab === "audience" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Audiences */}
                <div className="md:col-span-2">
                  <SectionCard icon={Users} title={t("vault.targetAudiences")} count={vault.target_audiences.length}
                    open={isOpen("audiences")} onToggle={() => toggleSection("audiences")}>
                    {vault.target_audiences.length > 0 ? (
                      <div className="space-y-2">
                        {vault.target_audiences.map((a, i) => (
                          <div key={i} className="p-3 rounded-xl"
                            style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{a.name}</span>
                            {a.description && (
                              <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text-tertiary)", marginTop: 3 }}>{a.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <EmptyState />}
                  </SectionCard>
                </div>

                {/* Social Presence */}
                <div className="md:col-span-2">
                  <SectionCard icon={Target} title={t("vault.socialPresence")}
                    count={vault.social_presence.filter(s => s.detected).length}
                    open={isOpen("social")} onToggle={() => toggleSection("social")}>
                    {vault.social_presence.filter(s => s.detected).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {vault.social_presence.filter(s => s.detected).map((s, i) => {
                          const Icon = socialIcons[s.platform.toLowerCase()] || Globe;
                          return (
                            <a key={i} href={s.url || "#"} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                              style={{ border: "1px solid rgba(26,23,20,0.04)" }}>
                              <Icon size={14} style={{ color: "var(--text-tertiary)" }} />
                              <span className="capitalize" style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>
                                {s.platform}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    ) : <EmptyState />}
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ── Tab 3: Voix ── */}
            {vaultTab === "voice" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tone of Voice */}
                <SectionCard icon={Megaphone} title={t("vault.tone")} count={vault.tone?.adjectives?.length || 0}
                  open={isOpen("tone")} onToggle={() => toggleSection("tone")}>
                  {vault.tone ? (
                    <div className="space-y-3">
                      {vault.tone.primary_tone && (
                        <span className="inline-block px-3 py-1.5 rounded-xl"
                          style={{ background: "rgba(17,17,17,0.12)", border: "1px solid rgba(17,17,17,0.2)", color: "var(--accent)", fontSize: "12px", fontWeight: 500 }}>
                          {vault.tone.primary_tone}
                        </span>
                      )}
                      <div className="grid grid-cols-2 gap-2.5">
                        <ToneGauge label={t("vault.formality")} value={vault.tone.formality} />
                        <ToneGauge label={t("vault.confidence")} value={vault.tone.confidence} />
                        <ToneGauge label={t("vault.warmth")} value={vault.tone.warmth} />
                        <ToneGauge label={t("vault.humor")} value={vault.tone.humor} />
                      </div>
                      {vault.tone.adjectives?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {vault.tone.adjectives.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(17,17,17,0.08)", color: "var(--accent)" }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : <EmptyState />}
                </SectionCard>

                {/* Vocabulary / Approved & Forbidden Terms */}
                <SectionCard icon={Paintbrush} title={t("vault.approvedTerms") + " / " + t("vault.forbiddenTerms")}
                  count={vault.approved_terms.length + vault.forbidden_terms.length}
                  open={isOpen("vocab")} onToggle={() => toggleSection("vocab")}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#666666" }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#666666", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {t("vault.approvedTerms")}
                        </span>
                      </div>
                      {vault.approved_terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {vault.approved_terms.map((term, i) => (
                            <span key={i} className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(17,17,17,0.08)", color: "#666666", border: "1px solid rgba(17,17,17,0.15)" }}>
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>--</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#DC2626" }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {t("vault.forbiddenTerms")}
                        </span>
                      </div>
                      {vault.forbidden_terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {vault.forbidden_terms.map((term, i) => (
                            <span key={i} className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(17,17,17,0.08)", color: "#DC2626", border: "1px solid rgba(17,17,17,0.15)" }}>
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>--</span>}
                    </div>
                  </div>
                </SectionCard>

                {/* Key Messages */}
                <div className="md:col-span-2">
                  <SectionCard icon={FileText} title={t("vault.keyMessages")} count={vault.key_messages.length}
                    open={isOpen("messages")} onToggle={() => toggleSection("messages")}>
                    {vault.key_messages.length > 0 ? (
                      <div className="space-y-1.5">
                        {vault.key_messages.map((m, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                            style={{ background: "rgba(17,17,17,0.04)", border: "1px solid rgba(17,17,17,0.08)" }}>
                            <ArrowRight size={11} style={{ color: "var(--accent)", marginTop: 3, flexShrink: 0, opacity: 0.6 }} />
                            <span style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--foreground)" }}>{m}</span>
                          </div>
                        ))}
                      </div>
                    ) : <EmptyState />}
                  </SectionCard>
                </div>

                {/* Learned Brand Voice -- full width */}
                <div className="md:col-span-2">
                  <SectionCard icon={MessageSquare} title={t("vault.learnedVoice")}
                    count={vault.voice_profile ? 1 : 0}
                    open={isOpen("voice")} onToggle={() => toggleSection("voice")}>
                    {vault.voice_profile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                            {t("vault.voiceDesc")}
                          </p>
                          <button onClick={handleLearnVoice} disabled={voiceLearning}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:bg-secondary"
                            style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: voiceLearning ? 0.5 : 1 }}>
                            {voiceLearning ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} {t("vault.reanalyze")}
                          </button>
                        </div>

                        {/* Summary */}
                        {vault.voice_profile.summary && (
                          <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.synthesis")}
                            </span>
                            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 6 }}>
                              {vault.voice_profile.summary}
                            </p>
                          </div>
                        )}

                        {/* Tone markers */}
                        {vault.voice_profile.tone_markers && (
                          <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.toneMarkers")}
                            </span>
                            {vault.voice_profile.tone_markers.primary_tone && (
                              <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 6, fontWeight: 500 }}>
                                {vault.voice_profile.tone_markers.primary_tone}
                              </p>
                            )}
                            <div className="grid grid-cols-5 gap-3 mt-3">
                              {([
                                { key: "formality", label: t("vault.formality") },
                                { key: "confidence", label: t("vault.confidence") },
                                { key: "warmth", label: t("vault.warmth") },
                                { key: "humor", label: t("vault.humor") },
                                { key: "urgency", label: t("vault.urgency") },
                              ] as const).map(({ key, label }) => {
                                const val = (vault.voice_profile?.tone_markers as any)?.[key] ?? 0;
                                return (
                                  <div key={key} className="text-center">
                                    <div className="mx-auto mb-1" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)" }}>{val}</span>
                                    </div>
                                    <span style={{ fontSize: "9px", color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Key phrases */}
                        {vault.voice_profile.key_phrases && vault.voice_profile.key_phrases.length > 0 && (
                          <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.keyPhrases")}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {vault.voice_profile.key_phrases.map((phrase, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full"
                                  style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)", background: "rgba(17,17,17,0.06)", border: "1px solid var(--border)" }}>
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Do / Don't patterns */}
                        {((vault.voice_profile.do_patterns && vault.voice_profile.do_patterns.length > 0) || (vault.voice_profile.dont_patterns && vault.voice_profile.dont_patterns.length > 0)) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vault.voice_profile.do_patterns && vault.voice_profile.do_patterns.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {t("vault.toDo")}
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.voice_profile.do_patterns.map((p, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <Check size={11} className="inline mr-1.5" style={{ color: "#22c55e" }} />{p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {vault.voice_profile.dont_patterns && vault.voice_profile.dont_patterns.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {t("vault.toAvoid")}
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.voice_profile.dont_patterns.map((p, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <X size={11} className="inline mr-1.5" style={{ color: "#ef4444" }} />{p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Vocabulary & Style details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {vault.voice_profile.vocabulary?.register && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.register")}</span>
                              <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 4, fontWeight: 500 }}>{vault.voice_profile.vocabulary.register}</p>
                            </div>
                          )}
                          {vault.voice_profile.sentence_style?.structure && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.sentenceStyle")}</span>
                              <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 4, fontWeight: 500 }}>
                                {vault.voice_profile.sentence_style.structure}, longueur {vault.voice_profile.sentence_style.avg_length || "moyenne"}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Rhetorical devices */}
                        {vault.voice_profile.rhetorical_devices && vault.voice_profile.rhetorical_devices.length > 0 && (
                          <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.rhetoricalDevices")}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {vault.voice_profile.rhetorical_devices.map((d, i) => (
                                <span key={i} className="px-2 py-0.5 rounded"
                                  style={{ fontSize: "11px", color: "var(--text-secondary)", background: "rgba(17,17,17,0.05)" }}>
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto 16px" }}>
                          {t("vault.analyzeVoiceDesc")}
                        </p>
                        <button onClick={handleLearnVoice} disabled={voiceLearning}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all"
                          style={{
                            fontSize: "13px", fontWeight: 500, color: "#fff",
                            background: "var(--accent)", border: "none",
                            opacity: voiceLearning ? 0.6 : 1,
                          }}>
                          {voiceLearning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          {voiceLearning ? t("vault.analyzing") : t("vault.analyzeMyContent")}
                        </button>
                        {voiceError && (
                          <p style={{ fontSize: "12px", color: "#ef4444", marginTop: 12 }}>{voiceError}</p>
                        )}
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* ORA Voice — Fine-tuned model (Business plan) */}
                <div className="md:col-span-2">
                  <SectionCard
                    icon={Sparkles}
                    title="ORA Voice"
                    count={oraVoiceStatus?.hasVoice ? 1 : 0}
                    open={isOpen("ora-voice")}
                    onToggle={() => toggleSection("ora-voice")}
                  >
                    <div className="space-y-4">
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,92,57,0.06), rgba(236,72,153,0.06))",
                          border: "1px solid rgba(255,92,57,0.2)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              fontSize: "9px", fontWeight: 600,
                              background: "linear-gradient(135deg, #FF5C39, #EC4899)",
                              color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase",
                            }}
                          >
                            Business
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                            {t("vault.oraVoiceTagline")}
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.6 }}>
                          {t("vault.oraVoiceDesc")}
                        </p>
                      </div>

                      {oraVoiceStatus?.hasVoice ? (
                        <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {t("vault.oraVoiceStatus")}
                              </span>
                              <p style={{ fontSize: "13px", color: "var(--foreground)", marginTop: 4, fontWeight: 500 }}>
                                {oraVoiceStatus.status === "completed" || oraVoiceStatus.status === "succeeded"
                                  ? t("vault.oraVoiceReady")
                                  : oraVoiceStatus.status === "running" || oraVoiceStatus.status === "pending" || oraVoiceStatus.status === "queued"
                                  ? t("vault.oraVoiceTraining")
                                  : oraVoiceStatus.status === "failed" || oraVoiceStatus.status === "error"
                                  ? t("vault.oraVoiceFailed")
                                  : oraVoiceStatus.status}
                              </p>
                              {oraVoiceStatus.samplesCount && (
                                <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2 }}>
                                  {oraVoiceStatus.samplesCount} {t("vault.oraVoiceSamples")}
                                </p>
                              )}
                              {oraVoiceStatus.fineTunedModel && (
                                <p style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: 4, fontFamily: "monospace" }}>
                                  {oraVoiceStatus.fineTunedModel}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={handleTrainOraVoice}
                              disabled={oraVoiceTraining || oraVoiceStatus.status === "running" || oraVoiceStatus.status === "pending"}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:bg-secondary"
                              style={{
                                fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)",
                                border: "1px solid var(--border)",
                                opacity: oraVoiceTraining || oraVoiceStatus.status === "running" ? 0.5 : 1,
                              }}
                            >
                              {oraVoiceTraining ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                              {t("vault.oraVoiceRetrain")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto 16px" }}>
                            {t("vault.oraVoiceEmpty")}
                          </p>
                          <button
                            onClick={handleTrainOraVoice}
                            disabled={oraVoiceTraining}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all"
                            style={{
                              fontSize: "13px", fontWeight: 500, color: "#fff",
                              background: "linear-gradient(135deg, #FF5C39, #EC4899)",
                              border: "none",
                              opacity: oraVoiceTraining ? 0.6 : 1,
                            }}
                          >
                            {oraVoiceTraining ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                            {oraVoiceTraining ? t("vault.oraVoiceLaunching") : t("vault.oraVoiceTrain")}
                          </button>
                        </div>
                      )}
                      {oraVoiceError && (
                        <p style={{ fontSize: "12px", color: "#ef4444" }}>{oraVoiceError}</p>
                      )}
                    </div>
                  </SectionCard>
                </div>

                {/* Text Calibration Results */}
                {vault.text_calibration && (
                  <div className="md:col-span-2">
                    <SectionCard icon={FileText} title={t("vault.textCalibration")} count={1}
                      open={isOpen("text-cal")} onToggle={() => toggleSection("text-cal")}>
                      <div className="space-y-4">
                        {vault.text_calibration.rules && (
                          <div className="flex flex-wrap gap-3">
                            {vault.text_calibration.rules.vouvoiement !== undefined && (
                              <span className="px-3 py-1.5 rounded-lg" style={{ fontSize: "12px", fontWeight: 500, background: vault.text_calibration.rules.vouvoiement ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: vault.text_calibration.rules.vouvoiement ? "#22c55e" : "#ef4444", border: `1px solid ${vault.text_calibration.rules.vouvoiement ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                                {t("vault.vouvoiement")}{vault.text_calibration.rules.vouvoiement ? t("vault.yes") : t("vault.no")}
                              </span>
                            )}
                            {vault.text_calibration.rules.emoji !== undefined && (
                              <span className="px-3 py-1.5 rounded-lg" style={{ fontSize: "12px", fontWeight: 500, background: vault.text_calibration.rules.emoji ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: vault.text_calibration.rules.emoji ? "#22c55e" : "#ef4444", border: `1px solid ${vault.text_calibration.rules.emoji ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                                {t("vault.emojis")}{vault.text_calibration.rules.emoji ? t("vault.yes") : t("vault.no")}
                              </span>
                            )}
                            {vault.text_calibration.rules.hashtags !== undefined && (
                              <span className="px-3 py-1.5 rounded-lg" style={{ fontSize: "12px", fontWeight: 500, background: vault.text_calibration.rules.hashtags ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: vault.text_calibration.rules.hashtags ? "#22c55e" : "#ef4444", border: `1px solid ${vault.text_calibration.rules.hashtags ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                                {t("vault.hashtags")}{vault.text_calibration.rules.hashtags ? t("vault.yes") : t("vault.no")}
                              </span>
                            )}
                            {vault.text_calibration.rules.structure && (
                              <span className="px-3 py-1.5 rounded-lg" style={{ fontSize: "12px", fontWeight: 500, background: "rgba(17,17,17,0.06)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                                Structure: {vault.text_calibration.rules.structure}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Do / Don't examples */}
                        {((vault.text_calibration.do_examples && vault.text_calibration.do_examples.length > 0) || (vault.text_calibration.dont_examples && vault.text_calibration.dont_examples.length > 0)) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vault.text_calibration.do_examples && vault.text_calibration.do_examples.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {t("vault.examplesToFollow")}
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.text_calibration.do_examples.map((ex, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <Check size={11} className="inline mr-1.5" style={{ color: "#22c55e" }} />{ex}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {vault.text_calibration.dont_examples && vault.text_calibration.dont_examples.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {t("vault.examplesToAvoid")}
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.text_calibration.dont_examples.map((ex, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <X size={11} className="inline mr-1.5" style={{ color: "#ef4444" }} />{ex}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {vault.text_calibration.summary && (
                          <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {t("vault.synthesis")}
                            </span>
                            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 6 }}>
                              {vault.text_calibration.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 4: Visuels ── */}
            {vaultTab === "visuals" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brand Colors with hierarchy */}
                <div className="md:col-span-2">
                  <SectionCard icon={Palette} title={t("vault.colors")} count={vault.colors.length}
                    open={isOpen("colors")} onToggle={() => toggleSection("colors")}>
                    {vault.colors.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex gap-0.5 h-10 rounded-lg overflow-hidden"
                          style={{ border: "1px solid var(--border)" }}>
                          {vault.colors.map((c, i) => (
                            <div key={i} className="flex-1 transition-all hover:flex-[2] cursor-pointer"
                              style={{ background: c.hex }} title={`${c.name || c.hex} -- ${c.role}`} />
                          ))}
                        </div>
                        {/* Principales */}
                        {vault.colors.slice(0, 3).length > 0 && (
                          <div>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                              {t("vault.primaryColors")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {vault.colors.slice(0, 3).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                                  style={{ background: "rgba(26,23,20,0.03)", border: "1px solid var(--border)" }}>
                                  <div className="w-3 h-3 rounded-full" style={{ background: c.hex }} />
                                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)", fontFamily: "monospace" }}>{c.hex}</span>
                                  {c.name && <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{c.name}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Secondaires */}
                        {vault.colors.slice(3, 6).length > 0 && (
                          <div>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                              {t("vault.secondaryColors")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {vault.colors.slice(3, 6).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                                  style={{ background: "rgba(26,23,20,0.03)", border: "1px solid var(--border)" }}>
                                  <div className="w-3 h-3 rounded-full" style={{ background: c.hex }} />
                                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)", fontFamily: "monospace" }}>{c.hex}</span>
                                  {c.name && <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{c.name}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Accents */}
                        {vault.colors.slice(6).length > 0 && (
                          <div>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                              {t("vault.accentColors")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {vault.colors.slice(6).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                                  style={{ background: "rgba(26,23,20,0.03)", border: "1px solid var(--border)" }}>
                                  <div className="w-3 h-3 rounded-full" style={{ background: c.hex }} />
                                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)", fontFamily: "monospace" }}>{c.hex}</span>
                                  {c.name && <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{c.name}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <EmptyState />}
                  </SectionCard>
                </div>

                {/* Typography */}
                <SectionCard icon={Type} title={t("vault.fonts")} count={vault.fonts.length}
                  open={isOpen("fonts")} onToggle={() => toggleSection("fonts")}>
                  {vault.fonts.length > 0 ? (
                    <div className="space-y-1.5">
                      {vault.fonts.map((f, i) => (
                        <div key={i} className="px-3 py-2.5 rounded-lg flex items-center justify-between"
                          style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)", fontFamily: f }}>{f}</span>
                          <span style={{ fontSize: "9px", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("vault.font")}</span>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState />}
                </SectionCard>

                {/* Font Usage Rules */}
                {vault.font_usage_rules && (
                  <div className="p-4 rounded-xl self-start"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {t("vault.fontUsageRules")}
                    </span>
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 6, whiteSpace: "pre-line" }}>
                      {vault.font_usage_rules}
                    </p>
                  </div>
                )}

                {/* Photo Style */}
                <div className="md:col-span-2">
                  <SectionCard icon={Camera} title={t("vault.photoStyle")} count={vault.photo_style ? 4 : 0}
                    open={isOpen("photo")} onToggle={() => toggleSection("photo")}>
                    {vault.photo_style ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: t("vault.framing"), value: vault.photo_style.framing },
                          { label: t("vault.mood"), value: vault.photo_style.mood },
                          { label: t("vault.lighting"), value: vault.photo_style.lighting },
                          { label: t("vault.subjects"), value: vault.photo_style.subjects },
                        ].filter(x => x.value).map((x, i) => (
                          <div key={i} className="p-2.5 rounded-xl"
                            style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {x.label}
                            </span>
                            <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)", marginTop: 3 }}>{x.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : <EmptyState />}
                  </SectionCard>
                </div>

                {/* Image Calibration Results */}
                {vault.image_calibration && (
                  <div className="md:col-span-2">
                    <SectionCard icon={Camera} title={t("vault.visualCalibration")} count={1}
                      open={isOpen("img-cal")} onToggle={() => toggleSection("img-cal")}>
                      <div className="space-y-4">
                        {vault.image_calibration.rules && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(vault.image_calibration.rules).filter(([, v]) => v).map(([key, value]) => (
                              <div key={key} className="p-2.5 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {key}
                                </span>
                                <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)", marginTop: 3 }}>{value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {((vault.image_calibration.do_styles && vault.image_calibration.do_styles.length > 0) || (vault.image_calibration.dont_styles && vault.image_calibration.dont_styles.length > 0)) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {vault.image_calibration.do_styles && vault.image_calibration.do_styles.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Styles à adopter
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.image_calibration.do_styles.map((s, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <Check size={11} className="inline mr-1.5" style={{ color: "#22c55e" }} />{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {vault.image_calibration.dont_styles && vault.image_calibration.dont_styles.length > 0 && (
                              <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <span style={{ fontSize: "9px", fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Styles à éviter
                                </span>
                                <ul className="mt-2 space-y-1.5">
                                  {vault.image_calibration.dont_styles.map((s, i) => (
                                    <li key={i} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                      <X size={11} className="inline mr-1.5" style={{ color: "#ef4444" }} />{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {vault.image_calibration.mood && (
                          <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Mood</span>
                            <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 4, fontWeight: 500 }}>{vault.image_calibration.mood}</p>
                          </div>
                        )}
                        {vault.image_calibration.summary && (
                          <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.synthesis")}</span>
                            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 6 }}>{vault.image_calibration.summary}</p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Image Bank */}
                <div className="md:col-span-2">
                  <ImageBank accessToken={accessToken} refreshKey={imageBankRefreshKey} />
                </div>
              </div>
            )}

            {/* ── Tab 5: Concurrents ── */}
            {vaultTab === "competitors" && (
              <div className="space-y-6">
                {/* Competitor scanner */}
                <div className="rounded-xl p-5"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Trophy size={16} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{t("vault.scanCompetitor")}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                      style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)" }}>
                      <Globe size={15} style={{ color: "var(--accent)", opacity: 0.7 }} />
                      <input type="text" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !competitorLoading && handleScanCompetitor()}
                        placeholder={t("vault.competitorPlaceholder")} disabled={competitorLoading}
                        className="flex-1 bg-transparent outline-none placeholder:text-white/15"
                        style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 400 }} />
                    </div>
                    <button onClick={handleScanCompetitor} disabled={competitorLoading || !competitorUrl.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer disabled:opacity-30 transition-opacity"
                      style={{ background: "linear-gradient(135deg, #FF5C39, #EC4899)", fontSize: "13px", fontWeight: 500, color: "#FFFFFF" }}>
                      {competitorLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {t("vault.scanBtn")}
                    </button>
                  </div>
                  {competitorError && (
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <X size={13} style={{ color: "#DC2626" }} />
                      <span style={{ fontSize: "12px", color: "#DC2626" }}>{competitorError}</span>
                      <button onClick={() => setCompetitorError(null)} className="ml-auto cursor-pointer">
                        <X size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing competitors from vault.competitors text field */}
                {vault.competitors && (
                  <div className="p-4 rounded-xl"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {t("vault.competitors")}
                    </span>
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--foreground)", marginTop: 6, whiteSpace: "pre-line" }}>
                      {vault.competitors}
                    </p>
                  </div>
                )}

                {/* Scanned competitors list */}
                {(vault.competitors_list || []).length > 0 ? (
                  <div className="space-y-4">
                    {(vault.competitors_list || []).map((comp, idx) => (
                      <div key={idx} className="rounded-xl p-5"
                        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)" }}>{comp.name}</h3>
                            {comp.url && (
                              <a href={comp.url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{comp.url}</a>
                            )}
                          </div>
                          <button onClick={() => handleRemoveCompetitor(idx)}
                            className="p-2 rounded-full cursor-pointer transition-colors hover:bg-red-50"
                            style={{ color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {comp.positioning && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.positioning")}</span>
                              <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 4, lineHeight: 1.5 }}>{comp.positioning}</p>
                            </div>
                          )}
                          {comp.tone && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.toneLabel")}</span>
                              <p style={{ fontSize: "12px", color: "var(--foreground)", marginTop: 4, lineHeight: 1.5 }}>{comp.tone}</p>
                            </div>
                          )}
                        </div>

                        {/* Color swatches */}
                        {comp.colors && comp.colors.length > 0 && (
                          <div className="flex gap-1.5 mt-3">
                            {comp.colors.map((c, ci) => (
                              <div key={ci} className="w-6 h-6 rounded-full border border-white/20" style={{ background: c }} title={c} />
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {comp.strengths && comp.strengths.length > 0 && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.strengths")}</span>
                              <ul className="mt-2 space-y-1">
                                {comp.strengths.map((s, si) => (
                                  <li key={si} style={{ fontSize: "11px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                    <Check size={10} className="inline mr-1" style={{ color: "#22c55e" }} />{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {comp.weaknesses && comp.weaknesses.length > 0 && (
                            <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("vault.weaknesses")}</span>
                              <ul className="mt-2 space-y-1">
                                {comp.weaknesses.map((w, wi) => (
                                  <li key={wi} style={{ fontSize: "11px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                    <X size={10} className="inline mr-1" style={{ color: "#ef4444" }} />{w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Differentiation tips */}
                        {comp.differentiation_tips && comp.differentiation_tips.length > 0 && (
                          <div className="mt-3 p-4 rounded-xl" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Pistes de différenciation
                            </span>
                            <ul className="mt-2 space-y-1.5">
                              {comp.differentiation_tips.map((tip, ti) => (
                                <li key={ti} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)" }}>
                                  <Sparkles size={10} className="inline mr-1.5" style={{ color: "#d97706" }} />{tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: "rgba(17,17,17,0.08)" }}>
                      <Trophy size={20} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                      {t("vault.scanCompetitorDesc")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer meta */}
            {vault.updatedAt && (
              <p className="text-center pt-6" style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                {t("vault.lastUpdated")} {new Date(vault.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {vault.source_url && <> from <span style={{ color: "var(--foreground)" }}>{vault.source_url}</span></>}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasData && !loading && !analyzing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(17,17,17,0.08)", border: "1px solid rgba(17,17,17,0.15)" }}>
            <Building2 size={24} style={{ color: "var(--accent)" }} />
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            {t("vault.noVault")}
          </h3>
          <p className="max-w-[380px] mx-auto mt-2" style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-tertiary)", fontWeight: 400 }}>
            {t("vault.noVaultDesc")}
          </p>
        </motion.div>
      )}

      {!loading && !hasData && accessToken && <ImageBank accessToken={accessToken} refreshKey={imageBankRefreshKey} />}
    </div>
    </div>
  );
}

// ════════════════════════════════════════
// SECTION CARD
// ════════════════════════════════════════

function SectionCard({ icon: Icon, title, count, children, open, onToggle }: {
  icon: any; title: string; count: number;
  children: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
        style={{ background: "transparent" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(17,17,17,0.08)" }}>
            <Icon size={15} style={{ color: "var(--accent)" }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{title}</span>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded"
              style={{ fontSize: "10px", fontWeight: 500, background: "var(--border)", color: "var(--text-tertiary)" }}>
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        </motion.div>
      </button>

      {/* Content -- open by default */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden">
            <div className="px-5 pb-4" style={{ borderTop: "1px solid rgba(26,23,20,0.03)" }}>
              <div className="pt-3">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════

function ToneGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="p-2.5 rounded-xl"
      style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="h-full rounded-full"
          style={{ background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>Not detected yet</span>;
}

// ════════════════════════════════════════
// API HELPERS
// ════════════════════════════════════════

function vaultHeaders(): Record<string, string> {
  return { ...apiHeaders(false), "Content-Type": "text/plain" };
}

function vaultFormHeaders(): Record<string, string> {
  return apiHeaders(false);
}

// ════════════════════════════════════════
// BRAND STRATEGY — Display
// ════════════════════════════════════════

const REGISTER_LABELS: Record<string, { label: string; desc: string }> = {
  transformation: { label: "Transformation", desc: "Show the after, never the process. The product is invisible, only its effect exists." },
  connivence: { label: "Connivence", desc: "Speak to those who know. Shared references create belonging." },
  tension: { label: "Tension", desc: "Name a problem no one dares to. Disrupt before reassuring." },
  proof: { label: "Silent proof", desc: "Say nothing, show results. Absence of argument is the argument." },
  culture: { label: "Culture", desc: "Don't talk about yourself. Talk about the world. Become a media." },
};

function BrandStrategyDisplay({ platform, onEdit }: {
  platform: NonNullable<VaultData["brand_platform"]>;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const reg = REGISTER_LABELS[platform.narrative_register] || { label: platform.narrative_register, desc: "" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          This strategy is automatically injected into every generation — images, text, video, and audio.
        </p>
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:bg-secondary"
          style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw size={11} /> Reconfigure
        </button>
      </div>

      {/* Promise */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid var(--border)" }}>
        <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {t("vault.promise")}
        </span>
        <p style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.5, color: "var(--foreground)", marginTop: 6 }}>
          "{platform.promise}"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Narrative register */}
        <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t("vault.narrativeRegister")}
          </span>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", marginTop: 4 }}>{reg.label}</p>
          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>{reg.desc}</p>
        </div>

        {/* Creative tension */}
        {platform.creative_tension && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("vault.creativeTension")}
            </span>
            <p style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--foreground)", marginTop: 4 }}>
              {platform.creative_tension}
            </p>
          </div>
        )}
      </div>

      {/* Semiotic codes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([
          { key: "adopt" as const, label: t("vault.adopt"), color: "#16a34a" },
          { key: "avoid" as const, label: t("vault.avoid"), color: "#dc2626" },
          { key: "subvert" as const, label: t("vault.subvert"), color: "#d97706" },
        ] as const).map(({ key, label, color }) => (
          platform.semiotic_codes[key].length > 0 && (
            <div key={key} className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </span>
              <div className="flex flex-wrap gap-1 mt-2">
                {platform.semiotic_codes[key].map((code, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full"
                    style={{ fontSize: "10px", fontWeight: 500, background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Photo direction */}
      {platform.photo_direction && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(26,23,20,0.02)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t("vault.photoDirection")}
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {([
              { label: t("vault.framing"), value: platform.photo_direction.framing },
              { label: t("vault.lighting"), value: platform.photo_direction.lighting },
              { label: t("vault.humanPresence"), value: platform.photo_direction.human_presence },
              { label: t("vault.composition"), value: platform.photo_direction.composition },
            ]).filter(f => f.value).map((field) => (
              <div key={field.label}>
                <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textTransform: "uppercase" }}>{field.label}</span>
                <p style={{ fontSize: "11px", color: "var(--foreground)", marginTop: 2 }}>{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// BRAND STRATEGY — Conversational chat onboarding
// ════════════════════════════════════════

type ChatMessage = { role: "ai" | "user"; text: string };

function buildVaultContext(vault: VaultData) {
  return {
    company_name: vault.company_name,
    industry: vault.industry,
    tagline: vault.tagline,
    mission: vault.mission,
    vision: vault.vision,
    personality: vault.personality,
    usp: vault.usp,
    values: vault.values,
    tone: vault.tone,
    key_messages: vault.key_messages,
  };
}

function buildWelcomeMessage(vault: VaultData): string {
  const parts: string[] = [];
  if (vault.company_name) parts.push(`Je vois que votre marque s'appelle **${vault.company_name}**`);
  if (vault.industry) parts.push(`dans le secteur **${vault.industry}**`);
  if (vault.mission) parts.push(`avec pour mission : "${vault.mission}"`);
  const intro = parts.length > 0
    ? `${parts.join(", ")}. C'est un bon point de départ.\n\n`
    : "";
  return `${intro}Je vais vous aider à définir votre plateforme de marque. Racontez-moi votre marque en quelques mots — ce que vous faites, pour qui, et ce qui vous rend unique.`;
}

function BrandStrategyOnboarding({ vault, onComplete }: {
  vault: VaultData;
  onComplete: (platform: NonNullable<VaultData["brand_platform"]>) => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: buildWelcomeMessage(vault) },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { accessToken } = useAuth();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiThinking]);

  const userMessageCount = messages.filter(m => m.role === "user").length;

  const handleSend = async () => {
    const text = currentInput.trim();
    if (!text || aiThinking || synthesizing) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setCurrentInput("");
    setAiThinking(true);

    const nextUserCount = userMessageCount + 1;

    // After 2-3 user messages, synthesize
    if (nextUserCount >= 3) {
      // Final AI message before synthesis
      const synthMsg: ChatMessage = {
        role: "ai",
        text: t("vault.strategySynthesizing"),
      };
      setMessages([...newMessages, synthMsg]);
      setAiThinking(false);
      setSynthesizing(true);
      await synthesizePlatform([...newMessages, synthMsg]);
      return;
    }

    // Otherwise, get a follow-up question from the AI
    try {
      const res = await fetch(apiUrl("/brand-engine/chat"), {
        method: "POST",
        headers: vaultHeaders(),
        body: corsBody(accessToken || "", {
          conversation: newMessages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
          vaultContext: buildVaultContext(vault),
          exchangeNumber: nextUserCount,
          maxExchanges: 3,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        const aiReply: ChatMessage = { role: "ai", text: data.message };
        const updatedMessages = [...newMessages, aiReply];
        setMessages(updatedMessages);

        // If the AI decides to synthesize early
        if (data.readyToSynthesize) {
          setSynthesizing(true);
          setAiThinking(false);
          await synthesizePlatform(updatedMessages);
          return;
        }
      } else {
        // Fallback follow-up questions
        const fallbacks = [
          "Merci. Et côté communication visuelle, quel univers souhaitez-vous projeter ? Qu'est-ce que les gens doivent ressentir en voyant votre marque ?",
          "Très bien. Dernière chose : y a-t-il une marque dont vous admirez la communication ? Et qu'est-ce qui ne doit jamais apparaître dans la vôtre ?",
        ];
        const fallbackIdx = Math.min(nextUserCount - 1, fallbacks.length - 1);
        setMessages([...newMessages, { role: "ai", text: fallbacks[fallbackIdx] }]);
      }
    } catch {
      // Fallback on network error
      const fallbacks = [
        "Merci. Et côté communication visuelle, quel univers souhaitez-vous projeter ? Qu'est-ce que les gens doivent ressentir en voyant votre marque ?",
        "Très bien. Dernière chose : y a-t-il une marque dont vous admirez la communication ? Et qu'est-ce qui ne doit jamais apparaître dans la vôtre ?",
      ];
      const fallbackIdx = Math.min(nextUserCount - 1, fallbacks.length - 1);
      setMessages([...newMessages, { role: "ai", text: fallbacks[fallbackIdx] }]);
    }
    setAiThinking(false);
  };

  const synthesizePlatform = async (conversation: ChatMessage[]) => {
    try {
      const res = await fetch(apiUrl("/brand-engine/synthesize"), {
        method: "POST",
        headers: vaultHeaders(),
        body: corsBody(accessToken || "", {
          conversation: conversation.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
          vaultContext: buildVaultContext(vault),
        }),
      });
      const data = await res.json();
      if (data.success && data.platform) {
        onComplete(data.platform);
      } else {
        buildFallbackPlatform(conversation);
      }
    } catch {
      buildFallbackPlatform(conversation);
    }
    setSynthesizing(false);
  };

  const buildFallbackPlatform = (conversation: ChatMessage[]) => {
    const userTexts = conversation.filter(m => m.role === "user").map(m => m.text);
    const combined = userTexts.join(" ");
    onComplete({
      promise: userTexts[0] || "",
      narrative_register: "transformation",
      creative_tension: userTexts[2] || "",
      semiotic_codes: {
        adopt: userTexts[1] ? userTexts[1].split(",").map(s => s.trim()).filter(Boolean).slice(0, 8) : [],
        avoid: [],
        subvert: [],
      },
      photo_direction: { framing: "", lighting: "natural", human_presence: "", composition: "" },
      reference_prompts: { positive: [], negative: [] },
    });
  };

  if (synthesizing) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t("vault.strategySynthesisLoading")}</p>
        <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Extraction des codes sémiotiques, du registre narratif et de la direction photographique</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
        {t("vault.strategyDesc")}
      </p>

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-2.5 overflow-y-auto px-1"
        style={{ maxHeight: 400, minHeight: 120, scrollBehavior: "smooth" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className="flex"
            style={{ justifyContent: msg.role === "ai" ? "flex-start" : "flex-end" }}
          >
            <div
              className="rounded-2xl px-3.5 py-2.5"
              style={{
                maxWidth: "82%",
                fontSize: "13px",
                lineHeight: 1.55,
                ...(msg.role === "ai"
                  ? {
                      background: "rgba(17,17,17,0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      borderBottomLeftRadius: 6,
                    }
                  : {
                      background: "var(--foreground)",
                      color: "var(--background)",
                      borderBottomRightRadius: 6,
                    }),
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {aiThinking && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div
              className="rounded-2xl px-4 py-3 flex gap-1 items-center"
              style={{
                background: "rgba(17,17,17,0.04)",
                border: "1px solid var(--border)",
                borderBottomLeftRadius: 6,
              }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "0ms" }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "150ms" }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder={t("vault.yourAnswer")}
          disabled={aiThinking || synthesizing}
          className="flex-1 rounded-xl px-4 py-3 resize-none transition-all disabled:opacity-50"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontSize: "13px",
            lineHeight: 1.5,
            minHeight: 48,
            maxHeight: 100,
            outline: "none",
          }}
          onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
          onBlur={e => (e.target.style.border = "1px solid var(--border)")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!currentInput.trim() || aiThinking || synthesizing}
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}