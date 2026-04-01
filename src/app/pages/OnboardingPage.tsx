import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe, Upload, Palette, Check, ArrowRight, Loader2,
  Sparkles, Building2, X,
} from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { OraLogo } from "../components/OraLogo";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface ScanResult {
  brand_name?: string;
  tagline?: string;
  industry?: string;
  tone_of_voice?: {
    primary?: string;
    adjectives?: string[];
  };
  visual_identity?: {
    colors?: { primary?: string[]; secondary?: string[]; accent?: string[] };
  };
  logo?: { url?: string };
  confidence_score?: number;
}

/* ═══════════════════════════════════
   OnboardingPage — 4-step wizard
   ═══════════════════════════════════ */

export function OnboardingPage() {
  const navigate = useNavigate();
  const { accessToken, user, isLoading } = useAuth();
  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);
  const token = () => tokenRef.current || "";

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [isLoading, user, navigate]);

  /* ── Wizard state ── */
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Step 2 — scan
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Step 3 — logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — editable summary
  const [editSector, setEditSector] = useState("");
  const [editTone, setEditTone] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── Derived ── */
  const hasUrl = websiteUrl.trim().length > 0;
  const scanFoundLogo = !!(scanResult?.logo?.url);
  const allColors = scanResult?.visual_identity?.colors
    ? [
        ...(scanResult.visual_identity.colors.primary || []),
        ...(scanResult.visual_identity.colors.secondary || []),
        ...(scanResult.visual_identity.colors.accent || []),
      ].filter(c => c.startsWith("#"))
    : [];

  /* ── Compute actual step indices based on context ── */
  const getVisibleSteps = useCallback(() => {
    const steps: number[] = [1]; // Step 1 always
    if (hasUrl) steps.push(2);   // Step 2 only if URL
    // Step 3 only if scan didn't find logo (or no scan at all and URL was skipped)
    if (!scanFoundLogo) steps.push(3);
    steps.push(4); // Step 4 always
    return steps;
  }, [hasUrl, scanFoundLogo]);

  const goNext = useCallback(() => {
    const visible = getVisibleSteps();
    const currentIdx = visible.indexOf(step);
    if (currentIdx < visible.length - 1) {
      setStep(visible[currentIdx + 1]);
    }
  }, [step, getVisibleSteps]);

  const handleStep1Next = () => {
    if (!companyName.trim()) return;
    if (hasUrl) {
      setStep(2);
      triggerScan();
    } else {
      // skip scan, go to logo upload
      setStep(3);
    }
  };

  /* ── Step 2: Scan URL ── */
  const triggerScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await fetch(`${API_BASE}/vault/scan-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ url: websiteUrl.trim(), _token: token() }),
        signal: AbortSignal.timeout(70_000),
      });
      const data = await res.json();
      if (data.success && data.scan) {
        setScanResult(data.scan);
        // Pre-fill editable fields from scan
        if (data.scan.brand_name) setEditName(data.scan.brand_name);
        if (data.scan.industry) setEditSector(data.scan.industry);
        if (data.scan.tone_of_voice?.primary) setEditTone(data.scan.tone_of_voice.primary);
        if (data.scan.logo?.url) setLogoUrl(data.scan.logo.url);
      } else {
        setScanError(data.error || "Le scan a échoué. Vous pouvez continuer manuellement.");
      }
    } catch (err: any) {
      setScanError(err?.message === "The operation was aborted" ? "Le scan a pris trop de temps." : "Erreur réseau. Vous pouvez continuer manuellement.");
    } finally {
      setScanning(false);
    }
  };

  /* ── Step 3: Logo upload ── */
  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) selectLogoFile(file);
  };

  const selectLogoFile = (file: File) => {
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    uploadLogo(file);
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("_token", token());
      const res = await fetch(`${API_BASE}/vault/upload-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.logoUrl) {
        setLogoUrl(data.logoUrl);
      }
    } catch (err) {
      console.error("[Onboarding] Logo upload error:", err);
    } finally {
      setLogoUploading(false);
    }
  };

  /* ── Step 4: Save to vault ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const vaultPayload: Record<string, any> = {
        company_name: editName || companyName,
        sector: editSector,
        tone_of_voice: editTone,
        onboarding_completed: true,
      };
      if (allColors.length > 0) vaultPayload.brandColors = allColors;
      if (logoUrl) vaultPayload.logo_url = logoUrl;
      if (websiteUrl.trim()) vaultPayload.source_url = websiteUrl.trim();

      await fetch(`${API_BASE}/vault`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ ...vaultPayload, _token: token() }),
      });
      setSaved(true);
    } catch (err) {
      console.error("[Onboarding] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Sync editName from companyName when entering step 4
  useEffect(() => {
    if (step === 4 && !editName) setEditName(companyName);
  }, [step]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* ORA Logo */}
      <div style={{ marginBottom: 32 }}>
        <OraLogo size={36} animate={false} />
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {getVisibleSteps().map((s) => (
          <div
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: s === step ? "var(--foreground)" : "var(--border)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 560,
        background: "var(--card)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        padding: "40px 36px",
        position: "relative",
        overflow: "hidden",
      }}>
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Votre marque ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Building2 size={20} style={{ color: "var(--foreground)" }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Votre marque
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 28, lineHeight: 1.5 }}>
                Commençons par les bases. Comment s'appelle votre entreprise ?
              </p>

              <label style={labelStyle}>Nom de l'entreprise *</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: ORA Studio"
                style={inputStyle}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && companyName.trim()) handleStep1Next(); }}
              />

              <label style={{ ...labelStyle, marginTop: 20 }}>Site web (optionnel)</label>
              <div style={{ position: "relative" }}>
                <Globe size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  placeholder="https://votre-site.com"
                  style={{ ...inputStyle, paddingLeft: 36 }}
                  onKeyDown={e => { if (e.key === "Enter" && companyName.trim()) handleStep1Next(); }}
                />
              </div>
              {hasUrl && (
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={12} />
                  Nous scannerons votre site pour extraire automatiquement votre identité de marque.
                </p>
              )}

              <button
                onClick={handleStep1Next}
                disabled={!companyName.trim()}
                style={{ ...btnPrimary, marginTop: 28, opacity: companyName.trim() ? 1 : 0.4 }}
              >
                Suivant
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Scan automatique ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Sparkles size={20} style={{ color: "var(--foreground)" }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Scan automatique
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
                Analyse de <strong style={{ color: "var(--foreground)" }}>{websiteUrl.trim()}</strong>
              </p>

              {scanning && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: "var(--foreground)" }} />
                  <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Extraction de l'identité de marque...</p>
                  <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                    <motion.div
                      style={{ height: "100%", borderRadius: 2, background: "var(--foreground)" }}
                      initial={{ width: "5%" }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 60, ease: "linear" }}
                    />
                  </div>
                </div>
              )}

              {scanError && !scanning && (
                <div style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--destructive) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--destructive) 15%, transparent)",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--destructive)",
                }}>
                  {scanError}
                </div>
              )}

              {scanResult && !scanning && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Brand name + industry */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "var(--secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Building2 size={18} style={{ color: "var(--foreground)" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                        {scanResult.brand_name || companyName}
                      </p>
                      {scanResult.industry && (
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{scanResult.industry}</span>
                      )}
                    </div>
                    {scanResult.confidence_score && (
                      <span style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: scanResult.confidence_score > 70 ? "rgba(16,185,129,0.1)" : "rgba(234,179,8,0.1)",
                        color: scanResult.confidence_score > 70 ? "#10b981" : "#eab308",
                      }}>
                        {scanResult.confidence_score}%
                      </span>
                    )}
                  </div>

                  {/* Colors */}
                  {allColors.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Palette size={14} style={{ color: "var(--foreground)" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Couleurs détectées</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {allColors.slice(0, 8).map((c, i) => (
                          <div key={i} style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: c, border: "1px solid var(--border)",
                          }} title={c} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tone */}
                  {scanResult.tone_of_voice?.primary && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={chipStyle}>Ton : {scanResult.tone_of_voice.primary}</span>
                      {scanResult.tone_of_voice.adjectives?.slice(0, 3).map((adj, i) => (
                        <span key={i} style={chipStyle}>{adj}</span>
                      ))}
                    </div>
                  )}

                  {/* Logo found */}
                  {scanFoundLogo && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Check size={16} style={{ color: "#10b981" }} />
                      <span style={{ fontSize: 13, color: "var(--foreground)" }}>Logo détecté</span>
                      <img
                        src={scanResult.logo!.url!}
                        alt="Logo"
                        style={{ height: 28, width: "auto", marginLeft: 8, borderRadius: 4, border: "1px solid var(--border)" }}
                      />
                    </div>
                  )}
                </div>
              )}

              {!scanning && (
                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button onClick={goNext} style={btnSecondary}>
                    {scanError ? "Continuer" : "Passer"}
                  </button>
                  {scanResult && (
                    <button onClick={goNext} style={btnPrimary}>
                      Suivant
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Votre logo ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Upload size={20} style={{ color: "var(--foreground)" }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Votre logo
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
                Ajoutez votre logo pour personnaliser vos créations. Formats : PNG, JPG, SVG.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleLogoDrop}
                onClick={() => logoInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 12,
                  padding: logoPreview ? "20px" : "40px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--secondary)",
                }}
              >
                {logoPreview ? (
                  <div style={{ position: "relative" }}>
                    <img src={logoPreview} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, borderRadius: 8 }} />
                    {logoUploading && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.7)", borderRadius: 8,
                      }}>
                        <Loader2 size={20} className="animate-spin" style={{ color: "var(--foreground)" }} />
                      </div>
                    )}
                    {logoUrl && !logoUploading && (
                      <div style={{
                        position: "absolute", top: -6, right: -6,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Check size={12} style={{ color: "#fff" }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload size={24} style={{ color: "var(--muted-foreground)" }} />
                    <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
                      Glissez votre logo ici ou <span style={{ color: "var(--foreground)", fontWeight: 600 }}>parcourir</span>
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>PNG, JPG ou SVG</p>
                  </>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) selectLogoFile(f);
                }}
              />

              {/* Remove logo */}
              {logoPreview && (
                <button
                  onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUrl(null); }}
                  style={{ ...btnText, marginTop: 12, fontSize: 12 }}
                >
                  <X size={14} /> Supprimer
                </button>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button onClick={goNext} style={btnSecondary}>Passer</button>
                <button
                  onClick={goNext}
                  disabled={logoUploading}
                  style={{ ...btnPrimary, opacity: logoUploading ? 0.5 : 1 }}
                >
                  Suivant
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Confirmation ── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Check size={20} style={{ color: "var(--foreground)" }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Confirmation
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
                Vérifiez les informations avant de lancer votre studio.
              </p>

              {/* Summary card */}
              <div style={{
                background: "var(--secondary)",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                {/* Logo preview */}
                {(logoUrl || logoPreview) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={logoUrl || logoPreview!}
                      alt="Logo"
                      style={{ height: 40, width: "auto", borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                  </div>
                )}

                {/* Editable name */}
                <div>
                  <label style={labelStyle}>Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Editable sector */}
                <div>
                  <label style={labelStyle}>Secteur d'activité</label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={e => setEditSector(e.target.value)}
                    placeholder="Ex: Tech, Mode, Restauration..."
                    style={inputStyle}
                  />
                </div>

                {/* Editable tone */}
                <div>
                  <label style={labelStyle}>Ton de voix</label>
                  <input
                    type="text"
                    value={editTone}
                    onChange={e => setEditTone(e.target.value)}
                    placeholder="Ex: Professionnel, Décontracté, Inspirant..."
                    style={inputStyle}
                  />
                </div>

                {/* Colors (read-only) */}
                {allColors.length > 0 && (
                  <div>
                    <label style={labelStyle}>Couleurs de marque</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {allColors.slice(0, 8).map((c, i) => (
                        <div key={i} style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: c, border: "1px solid var(--border)",
                        }} title={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!saved ? (
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  style={{ ...btnPrimary, marginTop: 24, opacity: (saving || !editName.trim()) ? 0.5 : 1 }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Lancer mon studio
                    </>
                  )}
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 24, textAlign: "center" }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginBottom: 16, color: "#10b981", fontSize: 14, fontWeight: 600,
                  }}>
                    <Check size={18} /> Profil enregistré
                  </div>
                  <button
                    onClick={() => navigate("/hub")}
                    style={btnPrimary}
                  >
                    Accéder à mon studio
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip link */}
      {step < 4 && (
        <button
          onClick={() => {
            setStep(4);
            if (!editName) setEditName(companyName);
          }}
          style={{
            marginTop: 20,
            background: "none",
            border: "none",
            fontSize: 13,
            color: "var(--muted-foreground)",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Passer la configuration
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   STYLE CONSTANTS
   ═══════════════════════════════════ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--foreground)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.2s",
};

const btnText: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: "none",
  color: "var(--muted-foreground)",
  cursor: "pointer",
  fontSize: 13,
};

const chipStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 10px",
  borderRadius: 20,
  background: "var(--secondary)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
};
