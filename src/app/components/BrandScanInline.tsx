import React, { useState } from "react";
import { Loader2, Globe, Check, AlertCircle, Palette, Type, Users, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

interface BrandScanResult {
  brand_name?: string;
  tagline?: string;
  industry?: string;
  tone_of_voice?: {
    primary?: string;
    adjectives?: string[];
    formality?: number;
    confidence?: number;
    warmth?: number;
    humor?: number;
    do_say?: string[];
    dont_say?: string[];
  };
  semantics?: {
    approved_terms?: string[];
    forbidden_terms?: string[];
    key_messages?: string[];
  };
  target_audience?: {
    primary?: string;
    secondary?: string;
  };
  visual_identity?: {
    colors?: { primary?: string[]; secondary?: string[]; accent?: string[] };
  };
  logo?: { url?: string };
  og_image?: string;
  confidence_score?: number;
}

interface BrandScanInlineProps {
  onApply: (vaultData: Record<string, any>) => void;
  currentVault: Record<string, any> | null;
}

export function BrandScanInline({ onApply, currentVault }: BrandScanInlineProps) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BrandScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const { accessToken } = useAuth();

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const token = accessToken || "";
      const res = await fetch(`${API_BASE}/vault/scan-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ url: url.trim(), _token: token || undefined }),
        signal: AbortSignal.timeout(70_000),
      });
      const data = await res.json();
      if (data.success && data.scan) {
        setResult(data.scan);
      } else {
        setError(data.error || "Scan failed");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;

    const mergedVault: Record<string, any> = { ...(currentVault || {}) };

    if (result.brand_name) mergedVault.brandName = result.brand_name;
    if (result.tagline) mergedVault.tagline = result.tagline;

    // Tone
    if (result.tone_of_voice) {
      const tv = result.tone_of_voice;
      if (tv.primary) mergedVault.tone = tv.primary;
      if (tv.adjectives?.length) mergedVault.toneAttributes = tv.adjectives;
      if (tv.formality) mergedVault.personality = `Formality: ${tv.formality}/10, Confidence: ${tv.confidence || 5}/10, Warmth: ${tv.warmth || 5}/10`;
    }

    // Vocabulary
    if (result.semantics) {
      if (result.semantics.approved_terms?.length) mergedVault.approvedTerms = result.semantics.approved_terms;
      if (result.semantics.forbidden_terms?.length) mergedVault.forbiddenTerms = result.semantics.forbidden_terms;
      if (result.semantics.key_messages?.length) mergedVault.keyMessages = result.semantics.key_messages;
    }

    // Audience
    if (result.target_audience?.primary) mergedVault.targetAudience = result.target_audience.primary;

    // Colors
    if (result.visual_identity?.colors) {
      const colors = result.visual_identity.colors;
      const allColors = [...(colors.primary || []), ...(colors.secondary || []), ...(colors.accent || [])].filter(c => c.startsWith("#"));
      if (allColors.length > 0) {
        mergedVault.primaryColor = allColors[0];
        if (allColors.length > 1) mergedVault.secondaryColor = allColors[1];
        mergedVault.colors = allColors;
      }
    }

    // Logo URL
    if (result.logo?.url) mergedVault.logoUrl = result.logo.url;

    // Pass scanned URL for generation context
    mergedVault._scannedUrl = url.trim();

    onApply(mergedVault);
    setApplied(true);

    // Persist to KV vault (best effort — silent failure)
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/vault`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ ...mergedVault, _token: accessToken }),
        });
      } catch {} // Silent — best effort persistence
    }
  };

  const allColors = result?.visual_identity?.colors
    ? [...(result.visual_identity.colors.primary || []), ...(result.visual_identity.colors.secondary || []), ...(result.visual_identity.colors.accent || [])].filter(c => c.startsWith("#"))
    : [];

  // Count what was detected
  const detectedCount = result ? [
    result.brand_name,
    result.tone_of_voice?.primary,
    result.target_audience?.primary,
    allColors.length > 0,
    result.logo?.url,
    result.semantics?.key_messages?.length,
  ].filter(Boolean).length : 0;

  return (
    <div className="rounded-xl px-5 py-4" style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: "var(--ora-signal)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8E4DF" }}>
            Website URL
          </span>
        </div>
        {!result && (
          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "9px", fontWeight: 600, color: "var(--ora-signal)", background: "rgba(59,79,196,0.08)", border: "1px solid rgba(59,79,196,0.15)" }}>
            Recommended
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="mb-3" style={{ fontSize: "11px", color: "#7A7572", lineHeight: 1.4 }}>
        Paste your website or product page. We extract brand name, colors, logo, tone of voice, audience, and key messages to pre-fill your brief.
      </p>

      {/* Input + Scan button */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-brand.com or product page URL"
          onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4DF", fontSize: "13px" }}
          onFocus={e => (e.target.style.border = "1px solid rgba(59,79,196,0.4)")}
          onBlur={e => (e.target.style.border = "1px solid rgba(255,255,255,0.08)")}
          disabled={scanning}
        />
        <button
          onClick={handleScan}
          disabled={scanning || !url.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-opacity disabled:opacity-40"
          style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "12px", fontWeight: 600 }}
        >
          {scanning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {scanning ? "Analyzing..." : "Scan"}
        </button>
      </div>

      {/* Scanning indicator */}
      {scanning && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: "var(--ora-signal)", width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <span style={{ fontSize: "10px", color: "#7A7572" }}>Extracting brand identity...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.12)" }}>
          <AlertCircle size={12} style={{ color: "#d4183d" }} />
          <span style={{ fontSize: "11px", color: "#d4183d" }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-4 space-y-3">
          {/* Brand name + confidence + count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#E8E4DF" }}>
                {result.brand_name || "Brand detected"}
              </span>
              {result.industry && (
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "9px", fontWeight: 500, color: "#9A9590", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {result.industry}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.confidence_score && (
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, background: result.confidence_score > 70 ? "rgba(16,185,129,0.1)" : "rgba(234,179,8,0.1)", color: result.confidence_score > 70 ? "#10b981" : "#eab308" }}>
                  {result.confidence_score}%
                </span>
              )}
              <span style={{ fontSize: "10px", color: "#7A7572" }}>
                {detectedCount} elements found
              </span>
            </div>
          </div>

          {result.tagline && (
            <p style={{ fontSize: "12px", color: "#9A9590", fontStyle: "italic", lineHeight: 1.4 }}>"{result.tagline}"</p>
          )}

          {/* Detected info — cards */}
          <div className="grid grid-cols-2 gap-2">
            {result.tone_of_voice?.primary && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <Type size={11} style={{ color: "var(--ora-signal)" }} />
                <div>
                  <span style={{ fontSize: "9px", color: "#5C5856", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Tone</span>
                  <p style={{ fontSize: "11px", color: "#C4BEB8", fontWeight: 500 }}>{result.tone_of_voice.primary}</p>
                </div>
              </div>
            )}
            {result.target_audience?.primary && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <Users size={11} style={{ color: "var(--ora-signal)" }} />
                <div className="min-w-0">
                  <span style={{ fontSize: "9px", color: "#5C5856", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Audience</span>
                  <p className="line-clamp-1" style={{ fontSize: "11px", color: "#C4BEB8", fontWeight: 500 }}>{result.target_audience.primary}</p>
                </div>
              </div>
            )}
            {result.semantics?.key_messages && result.semantics.key_messages.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <MessageSquare size={11} style={{ color: "var(--ora-signal)" }} />
                <div>
                  <span style={{ fontSize: "9px", color: "#5C5856", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Messages</span>
                  <p style={{ fontSize: "11px", color: "#C4BEB8", fontWeight: 500 }}>{result.semantics.key_messages.length} extracted</p>
                </div>
              </div>
            )}
            {result.logo?.url && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <ExternalLink size={11} style={{ color: "var(--ora-signal)" }} />
                <div>
                  <span style={{ fontSize: "9px", color: "#5C5856", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Logo</span>
                  <p style={{ fontSize: "11px", color: "#C4BEB8", fontWeight: 500 }}>Detected</p>
                </div>
              </div>
            )}
          </div>

          {/* Colors */}
          {allColors.length > 0 && (
            <div className="flex items-center gap-2">
              <Palette size={11} style={{ color: "var(--ora-signal)" }} />
              <span style={{ fontSize: "9px", color: "#5C5856", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Colors</span>
              <div className="flex gap-1.5 ml-1">
                {allColors.slice(0, 8).map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-md" style={{ background: c, border: "1px solid rgba(255,255,255,0.1)" }} title={c} />
                ))}
              </div>
            </div>
          )}

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={applied}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all mt-1"
            style={{
              background: applied ? "rgba(16,185,129,0.08)" : "var(--ora-signal)",
              color: applied ? "#10b981" : "#fff",
              fontSize: "12px",
              fontWeight: 600,
              border: applied ? "1px solid rgba(16,185,129,0.2)" : "none",
            }}
          >
            {applied ? <><Check size={12} /> Applied to Brand Vault</> : "Apply to Brand Vault"}
          </button>
        </div>
      )}
    </div>
  );
}
