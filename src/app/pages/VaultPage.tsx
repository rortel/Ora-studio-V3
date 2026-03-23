import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe, Upload, Loader2, Check, X, Plus,
  Palette, Users, Target, Megaphone, Sparkles,
  Camera, Type, FileText, ArrowRight, RefreshCw,
  Instagram, Linkedin, Twitter, Facebook, Youtube,
  Building2, ShoppingBag, Eye, Paintbrush, Image as ImageIcon,
  Layers, ChevronDown, Shield, Save,
} from "lucide-react";
import { apiUrl, apiHeaders } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { ImageBank } from "../components/ImageBank";

// ── Helpers ──

function corsBody(token: string | null, data?: Record<string, any>): string {
  return JSON.stringify({ _token: token || "", ...data });
}

// ── Types ──

interface ProductAnchor {
  id: string;
  name: string;                  // Nom exact tel qu'il doit apparaître dans le voiceover
  visual_description: string;    // Description visuelle précise
  usp_primary: string;           // USP principale
  usp_secondary: string | null;  // USP secondaire
  usage_moment: string;          // Moment d'usage canonique
  appearance_rules: {
    min_scenes: number;                // Minimum de scènes (défaut 2)
    must_name_in_voiceover: boolean;   // Doit être nommé explicitement
    visible_in_final_scene: boolean;   // Visible dans la scène finale
  };
}

interface ComplianceRules {
  sector_restrictions: string[];           // e.g. "alcool", "armes"
  authorized_cultural_refs: string[];      // Références culturelles autorisées
  forbidden_cultural_refs: string[];       // Références culturelles interdites
  mandatory_legal_mentions: string[];      // Mentions légales obligatoires
  compliance_threshold: number;            // 0-100, défaut 85
}

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
  // ── Nouveaux champs BrandVault ──
  product_anchors: ProductAnchor[];
  compliance_rules: ComplianceRules | null;
}

const EMPTY_VAULT: VaultData = {
  company_name: "", industry: "", tagline: null, products_services: [], target_audiences: [],
  colors: [], logo_url: null, logo_description: null, tone: null, photo_style: null,
  social_presence: [], key_messages: [], approved_terms: [], forbidden_terms: [],
  fonts: [], confidence_score: 0, source_url: null, updatedAt: null,
  product_anchors: [], compliance_rules: null,
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

  // Product anchors: merge by name (case-insensitive), incoming enriches
  const mergeProductAnchors = (
    a: ProductAnchor[],
    b: ProductAnchor[]
  ): ProductAnchor[] => {
    const map = new Map(a.map(p => [p.name.toLowerCase(), p]));
    for (const p of b) {
      const key = p.name.toLowerCase();
      if (!key) continue;
      const ex = map.get(key);
      if (!ex) {
        map.set(key, p);
      } else {
        map.set(key, { ...ex, ...p, id: ex.id }); // preserve original ID
      }
    }
    return [...map.values()];
  };

  // Compliance rules: merge arrays, incoming threshold overrides
  const mergeComplianceRules = (
    a: ComplianceRules | null | undefined,
    b: ComplianceRules | null | undefined
  ): ComplianceRules | null => {
    if (!b) return a ?? null;
    if (!a) return b;
    return {
      sector_restrictions: dedupeStrings(a.sector_restrictions || [], b.sector_restrictions || []),
      authorized_cultural_refs: dedupeStrings(a.authorized_cultural_refs || [], b.authorized_cultural_refs || []),
      forbidden_cultural_refs: dedupeStrings(a.forbidden_cultural_refs || [], b.forbidden_cultural_refs || []),
      mandatory_legal_mentions: dedupeStrings(a.mandatory_legal_mentions || [], b.mandatory_legal_mentions || []),
      compliance_threshold: b.compliance_threshold || a.compliance_threshold || 85,
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

    // Timestamp: always update
    updatedAt: existing.updatedAt,

    // Product anchors: merge by name
    product_anchors: mergeProductAnchors(existing.product_anchors || [], incoming.product_anchors || []),

    // Compliance rules: merge arrays
    compliance_rules: mergeComplianceRules(existing.compliance_rules, incoming.compliance_rules),
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
  const [vault, setVault] = useState<VaultData>(EMPTY_VAULT);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const token = () => tokenRef.current || "";
  const hasData = !!vault.company_name;

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
          setVault((prev) => ({
            ...EMPTY_VAULT,
            ...prev,
            ...data.vault,
            product_anchors: data.vault.product_anchors || [],
            compliance_rules: data.vault.compliance_rules || null,
          }));
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

  // ── Analyze URL ──
  const handleAnalyzeUrl = async (deepScan = false) => {
    let url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress(deepScan ? "Deep scanning website + sub-pages..." : "Scanning website...");
    try {
      console.log("[Vault] Analyzing URL:", url, "deep:", deepScan);
      const res = await fetch(apiUrl("/vault/analyze"), {
        method: "POST", headers: vaultHeaders(), body: corsBody(token(), { url, deep: deepScan }),
      });
      const data = await res.json();
      if (data.success && data.dna) {
        const updated = { ...vault, ...data.dna, source_url: url, updatedAt: new Date().toISOString() };
        setVault(updated);
        setAnalyzeProgress("Saving to vault...");
        await saveVault(updated);
        setAnalyzeProgress("Saved!");
        setTimeout(() => setAnalyzeProgress(""), 2000);
      } else {
        setAnalyzeError(data.error || `Analysis failed (${res.status})`);
      }
    } catch (err: any) {
      console.error("[Vault] Analyze network error:", err);
      setAnalyzeError(err?.message || "Network error");
    }
    setAnalyzing(false);
  };

  // ── Analyze File ──
  const handleFile = async (file: File) => {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress(`Analyzing ${file.name}...`);
    try {
      const isImage = file.type.startsWith("image/");
      if (isImage || file.type === "application/pdf" || file.name.match(/\.(pptx?|docx?)$/i)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("_token", token());
        const res = await fetch(apiUrl("/vault/analyze-file"), { method: "POST", headers: vaultFormHeaders(), body: formData });
        const data = await res.json();
        if (data.success && data.extractedText) {
          const res2 = await fetch(apiUrl("/vault/analyze"), {
            method: "POST", headers: vaultHeaders(),
            body: corsBody(token(), { content: data.extractedText, sourceName: file.name, sourceType: file.type }),
          });
          const data2 = await res2.json();
          if (data2.success && data2.dna) {
            const updated = mergeVaultData(vault, data2.dna);
            updated.updatedAt = new Date().toISOString();
            setVault(updated);
            setAnalyzeProgress("Saving to vault...");
            await saveVault(updated);
            setAnalyzeProgress("Saved!");
            setTimeout(() => setAnalyzeProgress(""), 2000);
          } else { setAnalyzeError(data2.error || "Analysis failed"); }
        } else { setAnalyzeError(data.error || "Could not extract content from file"); }
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

  // ── Product Anchors ──
  const handleAddProductAnchor = () => {
    const newAnchor: ProductAnchor = {
      id: crypto.randomUUID(),
      name: "",
      visual_description: "",
      usp_primary: "",
      usp_secondary: null,
      usage_moment: "",
      appearance_rules: {
        min_scenes: 2,
        must_name_in_voiceover: true,
        visible_in_final_scene: true,
      },
    };
    setVault({ ...vault, product_anchors: [...(vault.product_anchors || []), newAnchor] });
  };

  const handlePromoteToAnchor = (productName: string) => {
    const newAnchor: ProductAnchor = {
      id: crypto.randomUUID(),
      name: productName,
      visual_description: "",
      usp_primary: "",
      usp_secondary: null,
      usage_moment: "",
      appearance_rules: {
        min_scenes: 2,
        must_name_in_voiceover: true,
        visible_in_final_scene: true,
      },
    };
    setVault({
      ...vault,
      product_anchors: [...(vault.product_anchors || []), newAnchor],
      products_services: vault.products_services.filter(p => p.toLowerCase() !== productName.toLowerCase()),
    });
  };

  // ── Compliance Rules ──
  const handleComplianceUpdate = (field: string, value: any) => {
    const current = vault.compliance_rules || {
      sector_restrictions: [],
      authorized_cultural_refs: [],
      forbidden_cultural_refs: [],
      mandatory_legal_mentions: [],
      compliance_threshold: 85,
    };
    setVault({
      ...vault,
      compliance_rules: { ...current, [field]: value },
    });
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
        <Loader2 size={20} className="animate-spin" style={{ color: "#5E6AD2" }} />
      </div>
    );
  }

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-16">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 uppercase" style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", color: "#5E6AD2" }}>
              Brand Intelligence
            </p>
            <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.15, color: "#E8E4DF" }}>
              Brand Vault
            </h1>
            <p className="mt-2" style={{ fontSize: "15px", lineHeight: 1.55, color: "#9A9590", fontWeight: 400, maxWidth: 460 }}>
              Your brand DNA, extracted and structured. Drop a URL, a PDF, or an image.
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all shrink-0"
              style={{
                background: saveOk ? "rgba(16,185,129,0.12)" : "rgba(94,106,210,0.12)",
                border: saveOk ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(94,106,210,0.25)",
                fontSize: "13px",
                fontWeight: 500,
                color: saveOk ? "#10B981" : "#5E6AD2",
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveOk ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {saving ? "Saving..." : saveOk ? "Saved" : "Save"}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── Scanner ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl p-5 mb-10"
        style={{ background: "#1a1918", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>

        {/* URL row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Globe size={15} style={{ color: "#5E6AD2", opacity: 0.7 }} />
            <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !analyzing && handleAnalyzeUrl()}
              placeholder="yourcompany.com" disabled={analyzing}
              className="flex-1 bg-transparent outline-none placeholder:text-white/15"
              style={{ fontSize: "14px", color: "#E8E4DF", fontWeight: 400 }} />
          </div>
          <button
            onClick={() => handleAnalyzeUrl(false)} disabled={analyzing || !urlInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer disabled:opacity-30 transition-opacity"
            style={{ background: "#5E6AD2", fontSize: "13px", fontWeight: 500, color: "#FFF" }}>
            {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Scan
          </button>
          <button
            onClick={() => handleAnalyzeUrl(true)} disabled={analyzing || !urlInput.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer disabled:opacity-30 transition-opacity"
            style={{ border: "1px solid rgba(255,255,255,0.10)", fontSize: "13px", fontWeight: 500, color: "#E8E4DF" }}>
            <Layers size={13} /> Deep
          </button>
        </div>

        {/* File drop */}
        <div onClick={() => !analyzing && fileRef.current?.click()}
          className="flex items-center justify-center gap-2.5 py-3.5 rounded-lg cursor-pointer transition-all"
          style={{
            border: `1px dashed ${dragOver ? "rgba(94,106,210,0.5)" : "rgba(255,255,255,0.08)"}`,
            background: dragOver ? "rgba(94,106,210,0.04)" : "transparent",
          }}>
          <Upload size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>
            Drop or click -- PDF, PPT, DOCX, images
          </span>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.svg"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Progress / Error */}
        <AnimatePresence>
          {(analyzing || analyzeProgress) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {analyzing ? (
                <Loader2 size={13} className="animate-spin" style={{ color: "#5E6AD2" }} />
              ) : analyzeProgress === "Saved!" ? (
                <Check size={13} style={{ color: "#10B981" }} />
              ) : null}
              <span style={{ fontSize: "12px", fontWeight: 500, color: analyzeProgress === "Saved!" ? "#10B981" : "#5E6AD2" }}>
                {analyzeProgress}
              </span>
            </motion.div>
          )}
          {analyzeError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <X size={13} style={{ color: "#C45050" }} />
              <span style={{ fontSize: "12px", color: "#C45050" }}>{analyzeError}</span>
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
              style={{ background: "#1a1918", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
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
                        style={{ background: "rgba(94,106,210,0.08)", border: "1px dashed rgba(94,106,210,0.3)" }}>
                        {logoUploading ? <Loader2 size={16} className="animate-spin" style={{ color: "#5E6AD2" }} /> : <Plus size={16} style={{ color: "#5E6AD2" }} />}
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
                    <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#E8E4DF", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                      {vault.company_name}
                    </h2>
                    {vault.industry && (
                      <span style={{ fontSize: "13px", fontWeight: 400, color: "#9A9590" }}>{vault.industry}</span>
                    )}
                    {vault.tagline && (
                      <p style={{ fontSize: "13px", color: "#9A9590", fontStyle: "italic", marginTop: 2 }}>"{vault.tagline}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {vault.confidence_score > 0 && (
                    <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(94,106,210,0.08)", border: "1px solid rgba(94,106,210,0.15)" }}>
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "#5E6AD2" }}>{vault.confidence_score}</span>
                      <span style={{ fontSize: "10px", color: "rgba(94,106,210,0.6)", fontWeight: 500 }}>/100</span>
                    </div>
                  )}
                  {vault.source_url && (
                    <button onClick={() => handleAnalyzeUrl(true)} disabled={analyzing}
                      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06]"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                      <RefreshCw size={13} className={analyzing ? "animate-spin" : ""} style={{ color: "#9A9590" }} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ═══ DATA SECTIONS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Colors */}
              <SectionCard icon={Palette} title="Brand Colors" count={vault.colors.length}
                open={isOpen("colors")} onToggle={() => toggleSection("colors")}>
                {vault.colors.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-0.5 h-10 rounded-lg overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      {vault.colors.map((c, i) => (
                        <div key={i} className="flex-1 transition-all hover:flex-[2] cursor-pointer"
                          style={{ background: c.hex }} title={`${c.name || c.hex} -- ${c.role}`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vault.colors.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-3 h-3 rounded-full" style={{ background: c.hex }} />
                          <span style={{ fontSize: "11px", fontWeight: 500, color: "#E8E4DF", fontFamily: "monospace" }}>{c.hex}</span>
                          {c.name && <span style={{ fontSize: "10px", color: "#9A9590" }}>{c.name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Tone of Voice */}
              <SectionCard icon={Megaphone} title="Tone of Voice" count={vault.tone?.adjectives?.length || 0}
                open={isOpen("tone")} onToggle={() => toggleSection("tone")}>
                {vault.tone ? (
                  <div className="space-y-3">
                    {vault.tone.primary_tone && (
                      <span className="inline-block px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.2)", color: "#5E6AD2", fontSize: "12px", fontWeight: 500 }}>
                        {vault.tone.primary_tone}
                      </span>
                    )}
                    <div className="grid grid-cols-2 gap-2.5">
                      <ToneGauge label="Formality" value={vault.tone.formality} />
                      <ToneGauge label="Confidence" value={vault.tone.confidence} />
                      <ToneGauge label="Warmth" value={vault.tone.warmth} />
                      <ToneGauge label="Humor" value={vault.tone.humor} />
                    </div>
                    {vault.tone.adjectives?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {vault.tone.adjectives.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded"
                            style={{ fontSize: "11px", fontWeight: 500, background: "rgba(94,106,210,0.08)", color: "#5E6AD2" }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Audiences */}
              <SectionCard icon={Users} title="Target Audiences" count={vault.target_audiences.length}
                open={isOpen("audiences")} onToggle={() => toggleSection("audiences")}>
                {vault.target_audiences.length > 0 ? (
                  <div className="space-y-2">
                    {vault.target_audiences.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#E8E4DF" }}>{a.name}</span>
                        {a.description && (
                          <p style={{ fontSize: "12px", lineHeight: 1.5, color: "#9A9590", marginTop: 3 }}>{a.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Products & Anchors */}
              <div className="md:col-span-2">
                <SectionCard icon={ShoppingBag} title="Products & Anchors"
                  count={(vault.product_anchors?.length || 0) + vault.products_services.length}
                  open={isOpen("products")} onToggle={() => toggleSection("products")}>

                  {/* Structured Product Anchors */}
                  {(vault.product_anchors?.length || 0) > 0 && (
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={12} style={{ color: "#5E6AD2" }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#5E6AD2", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Product Anchors
                        </span>
                      </div>
                      {vault.product_anchors.map((p, i) => (
                        <ProductAnchorCard
                          key={p.id}
                          product={p}
                          onUpdate={(updated) => {
                            const newAnchors = [...vault.product_anchors];
                            newAnchors[i] = updated;
                            setVault({ ...vault, product_anchors: newAnchors });
                          }}
                          onRemove={() => {
                            setVault({ ...vault, product_anchors: vault.product_anchors.filter((_, j) => j !== i) });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add Product Anchor */}
                  <button onClick={handleAddProductAnchor}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-[rgba(94,106,210,0.08)]"
                    style={{ border: "1px dashed rgba(94,106,210,0.3)", background: "rgba(94,106,210,0.04)" }}>
                    <Plus size={13} style={{ color: "#5E6AD2" }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#5E6AD2" }}>Add Product Anchor</span>
                  </button>

                  {/* Legacy string products */}
                  {vault.products_services.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: "10px", color: "#9A9590", fontWeight: 500 }}>
                        Legacy products (click to upgrade to anchor):
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {vault.products_services.map((p, i) => (
                          <button key={i} onClick={() => handlePromoteToAnchor(p)}
                            className="px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:border-[rgba(94,106,210,0.3)]"
                            style={{ fontSize: "12px", fontWeight: 500, background: "rgba(255,255,255,0.04)", color: "#E8E4DF", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {p} <ArrowRight size={10} className="inline ml-1" style={{ opacity: 0.5 }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(vault.product_anchors?.length || 0) === 0 && vault.products_services.length === 0 && <EmptyState />}
                </SectionCard>
              </div>

              {/* Visual Style */}
              <SectionCard icon={Camera} title="Visual Style" count={vault.photo_style ? 4 : 0}
                open={isOpen("photo")} onToggle={() => toggleSection("photo")}>
                {vault.photo_style ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Framing", value: vault.photo_style.framing },
                      { label: "Mood", value: vault.photo_style.mood },
                      { label: "Lighting", value: vault.photo_style.lighting },
                      { label: "Subjects", value: vault.photo_style.subjects },
                    ].filter(x => x.value).map((x, i) => (
                      <div key={i} className="p-2.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#5E6AD2", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {x.label}
                        </span>
                        <p style={{ fontSize: "12px", fontWeight: 500, color: "#E8E4DF", marginTop: 3 }}>{x.value}</p>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Social Presence */}
              <SectionCard icon={Target} title="Social Presence"
                count={vault.social_presence.filter(s => s.detected).length}
                open={isOpen("social")} onToggle={() => toggleSection("social")}>
                {vault.social_presence.filter(s => s.detected).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {vault.social_presence.filter(s => s.detected).map((s, i) => {
                      const Icon = socialIcons[s.platform.toLowerCase()] || Globe;
                      return (
                        <a key={i} href={s.url || "#"} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                          <Icon size={14} style={{ color: "#9A9590" }} />
                          <span className="capitalize" style={{ fontSize: "12px", fontWeight: 500, color: "#E8E4DF" }}>
                            {s.platform}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Typography */}
              <SectionCard icon={Type} title="Typography" count={vault.fonts.length}
                open={isOpen("fonts")} onToggle={() => toggleSection("fonts")}>
                {vault.fonts.length > 0 ? (
                  <div className="space-y-1.5">
                    {vault.fonts.map((f, i) => (
                      <div key={i} className="px-3 py-2.5 rounded-lg flex items-center justify-between"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "15px", fontWeight: 500, color: "#E8E4DF", fontFamily: f }}>{f}</span>
                        <span style={{ fontSize: "9px", color: "#9A9590", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Font</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Key Messages */}
              <SectionCard icon={FileText} title="Key Messages" count={vault.key_messages.length}
                open={isOpen("messages")} onToggle={() => toggleSection("messages")}>
                {vault.key_messages.length > 0 ? (
                  <div className="space-y-1.5">
                    {vault.key_messages.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                        style={{ background: "rgba(94,106,210,0.04)", border: "1px solid rgba(94,106,210,0.08)" }}>
                        <ArrowRight size={11} style={{ color: "#5E6AD2", marginTop: 3, flexShrink: 0, opacity: 0.6 }} />
                        <span style={{ fontSize: "12px", lineHeight: 1.55, color: "#E8E4DF" }}>{m}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState />}
              </SectionCard>

              {/* Vocabulary -- full width */}
              <div className="md:col-span-2">
                <SectionCard icon={Paintbrush} title="Vocabulary"
                  count={vault.approved_terms.length + vault.forbidden_terms.length}
                  open={isOpen("vocab")} onToggle={() => toggleSection("vocab")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Approved
                        </span>
                      </div>
                      {vault.approved_terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {vault.approved_terms.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ fontSize: "11px", color: "#9A9590" }}>--</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444" }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Forbidden
                        </span>
                      </div>
                      {vault.forbidden_terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {vault.forbidden_terms.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ fontSize: "11px", color: "#9A9590" }}>--</span>}
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Compliance Rules -- full width */}
              <div className="md:col-span-2">
                <SectionCard icon={Shield} title="Compliance Rules"
                  count={
                    (vault.compliance_rules?.sector_restrictions?.length || 0) +
                    (vault.compliance_rules?.mandatory_legal_mentions?.length || 0) +
                    (vault.compliance_rules?.forbidden_cultural_refs?.length || 0)
                  }
                  open={isOpen("compliance")} onToggle={() => toggleSection("compliance")}>
                  <div className="space-y-4">
                    {/* Threshold slider */}
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#E8E4DF" }}>
                        Compliance Threshold
                      </span>
                      <div className="flex items-center gap-2">
                        <input type="range" min={50} max={100}
                          value={vault.compliance_rules?.compliance_threshold || 85}
                          onChange={(e) => handleComplianceUpdate("compliance_threshold", parseInt(e.target.value))}
                          className="w-32"
                          style={{ accentColor: "#5E6AD2" }} />
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#5E6AD2", minWidth: 32, textAlign: "right" }}>
                          {vault.compliance_rules?.compliance_threshold || 85}
                        </span>
                      </div>
                    </div>

                    {/* Tag lists */}
                    <ComplianceTagList
                      label="Sector Restrictions"
                      color="#EF4444"
                      tags={vault.compliance_rules?.sector_restrictions || []}
                      onChange={(tags) => handleComplianceUpdate("sector_restrictions", tags)}
                      placeholder="e.g., alcohol, weapons, gambling"
                    />
                    <ComplianceTagList
                      label="Authorized Cultural References"
                      color="#10B981"
                      tags={vault.compliance_rules?.authorized_cultural_refs || []}
                      onChange={(tags) => handleComplianceUpdate("authorized_cultural_refs", tags)}
                      placeholder="e.g., mainstream cinema, sports"
                    />
                    <ComplianceTagList
                      label="Forbidden Cultural References"
                      color="#EF4444"
                      tags={vault.compliance_rules?.forbidden_cultural_refs || []}
                      onChange={(tags) => handleComplianceUpdate("forbidden_cultural_refs", tags)}
                      placeholder="e.g., violence, politics"
                    />
                    <ComplianceTagList
                      label="Mandatory Legal Mentions"
                      color="#F59E0B"
                      tags={vault.compliance_rules?.mandatory_legal_mentions || []}
                      onChange={(tags) => handleComplianceUpdate("mandatory_legal_mentions", tags)}
                      placeholder="e.g., Drink responsibly, 18+"
                    />
                  </div>
                </SectionCard>
              </div>

            </div>

            {/* Footer meta */}
            {vault.updatedAt && (
              <p className="text-center pt-6" style={{ fontSize: "11px", color: "#9A9590", fontWeight: 400 }}>
                Last updated {new Date(vault.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {vault.source_url && <> from <span style={{ color: "#E8E4DF" }}>{vault.source_url}</span></>}
              </p>
            )}

            {/* Image Bank */}
            <div className="mt-8">
              <ImageBank accessToken={accessToken} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasData && !loading && !analyzing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(94,106,210,0.08)", border: "1px solid rgba(94,106,210,0.15)" }}>
            <Building2 size={24} style={{ color: "#5E6AD2" }} />
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 500, color: "#E8E4DF", letterSpacing: "-0.02em" }}>
            No brand data yet
          </h3>
          <p className="max-w-[380px] mx-auto mt-2" style={{ fontSize: "14px", lineHeight: 1.6, color: "#9A9590", fontWeight: 400 }}>
            Enter your company URL or upload a brand guidelines document above. ORA will extract everything automatically.
          </p>
        </motion.div>
      )}

      {!loading && !hasData && accessToken && <ImageBank accessToken={accessToken} />}
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
      style={{ background: "#1a1918", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
        style={{ background: "transparent" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(94,106,210,0.08)" }}>
            <Icon size={15} style={{ color: "#5E6AD2" }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#E8E4DF" }}>{title}</span>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded"
              style={{ fontSize: "10px", fontWeight: 500, background: "rgba(255,255,255,0.06)", color: "#9A9590" }}>
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: "#9A9590" }} />
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
            <div className="px-5 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
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
    <div className="p-2.5 rounded-lg"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: "10px", fontWeight: 500, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8E4DF" }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="h-full rounded-full"
          style={{ background: "#5E6AD2" }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return <span style={{ fontSize: "12px", color: "#9A9590", fontWeight: 400 }}>Not detected yet</span>;
}

// ════════════════════════════════════════
// PRODUCT ANCHOR CARD
// ════════════════════════════════════════

function ProductAnchorCard({ product, onUpdate, onRemove }: {
  product: ProductAnchor;
  onUpdate: (p: ProductAnchor) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!product.name);
  const [draft, setDraft] = useState(product);

  const handleSave = () => {
    onUpdate(draft);
    if (draft.name) setExpanded(false);
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: "13px", fontWeight: 400,
    color: "#E8E4DF", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
  };

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: product.name ? "#5E6AD2" : "#9A9590" }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#E8E4DF" }}>
            {product.name || "New Product Anchor"}
          </span>
          {product.usp_primary && (
            <span style={{ fontSize: "11px", color: "#9A9590", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {product.usp_primary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {product.name && (
            <div className="flex items-center gap-1">
              {product.appearance_rules?.must_name_in_voiceover && (
                <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 600, background: "rgba(94,106,210,0.1)", color: "#5E6AD2" }}>VO</span>
              )}
              <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 600, background: "rgba(94,106,210,0.1)", color: "#5E6AD2" }}>
                {product.appearance_rules?.min_scenes || 2}+ scenes
              </span>
            </div>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} style={{ color: "#9A9590" }} />
          </motion.div>
        </div>
      </div>

      {/* Expanded form */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div style={labelStyle}>Product Name *</div>
                  <input style={fieldStyle} value={draft.name} placeholder="Exact name (as in voiceover)"
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <div style={labelStyle}>Usage Moment</div>
                  <input style={fieldStyle} value={draft.usage_moment} placeholder="When/how it appears in the story"
                    onChange={(e) => setDraft({ ...draft, usage_moment: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <div style={labelStyle}>Visual Description</div>
                  <textarea style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} value={draft.visual_description}
                    placeholder="Precise visual description (color, shape, distinctive features...)"
                    onChange={(e) => setDraft({ ...draft, visual_description: e.target.value })} />
                </div>
                <div>
                  <div style={labelStyle}>Primary USP</div>
                  <input style={fieldStyle} value={draft.usp_primary} placeholder="Main unique selling proposition"
                    onChange={(e) => setDraft({ ...draft, usp_primary: e.target.value })} />
                </div>
                <div>
                  <div style={labelStyle}>Secondary USP</div>
                  <input style={fieldStyle} value={draft.usp_secondary || ""} placeholder="Optional secondary USP"
                    onChange={(e) => setDraft({ ...draft, usp_secondary: e.target.value || null })} />
                </div>
              </div>

              {/* Appearance Rules */}
              <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Appearance Rules</div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "12px", color: "#9A9590" }}>Min scenes:</span>
                    <input type="number" min={1} max={10} style={{ ...fieldStyle, width: 60, textAlign: "center", padding: "6px 8px" }}
                      value={draft.appearance_rules.min_scenes}
                      onChange={(e) => setDraft({ ...draft, appearance_rules: { ...draft.appearance_rules, min_scenes: parseInt(e.target.value) || 2 } })} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={draft.appearance_rules.must_name_in_voiceover}
                      onChange={(e) => setDraft({ ...draft, appearance_rules: { ...draft.appearance_rules, must_name_in_voiceover: e.target.checked } })}
                      style={{ accentColor: "#5E6AD2" }} />
                    <span style={{ fontSize: "12px", color: "#E8E4DF" }}>Name in voiceover</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={draft.appearance_rules.visible_in_final_scene}
                      onChange={(e) => setDraft({ ...draft, appearance_rules: { ...draft.appearance_rules, visible_in_final_scene: e.target.checked } })}
                      style={{ accentColor: "#5E6AD2" }} />
                    <span style={{ fontSize: "12px", color: "#E8E4DF" }}>Visible in final scene</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "#5E6AD2", fontSize: "12px", fontWeight: 500, color: "#FFF" }}>
                  <Check size={12} /> Save
                </button>
                <button onClick={onRemove}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-all hover:bg-red-500/10"
                  style={{ border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px", fontWeight: 500, color: "#EF4444" }}>
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════
// COMPLIANCE TAG LIST
// ════════════════════════════════════════

function ComplianceTagList({ label, color, tags, onChange, placeholder }: {
  label: string; color: string; tags: string[];
  onChange: (tags: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        {tags.length > 0 && (
          <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 500, background: "rgba(255,255,255,0.06)", color: "#9A9590" }}>
            {tags.length}
          </span>
        )}
      </div>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded group"
              style={{ fontSize: "11px", fontWeight: 500, background: `${color}12`, color, border: `1px solid ${color}25` }}>
              {t}
              <button onClick={() => handleRemove(i)} className="opacity-40 hover:opacity-100 cursor-pointer transition-opacity">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add input */}
      <div className="flex items-center gap-2">
        <input
          type="text" value={input} placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 bg-transparent outline-none placeholder:text-white/15 px-3 py-1.5 rounded-lg"
          style={{ fontSize: "12px", color: "#E8E4DF", border: "1px solid rgba(255,255,255,0.08)" }} />
        <button onClick={handleAdd} disabled={!input.trim()}
          className="px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-30 transition-opacity"
          style={{ fontSize: "11px", fontWeight: 500, color, border: `1px solid ${color}30` }}>
          Add
        </button>
      </div>
    </div>
  );
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