/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Auto Montage Dialog — AI-powered montage planning
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, X as XIcon, Film, Image as ImageIcon,
  Music, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

export interface MontagePlan {
  projectName: string;
  format: "landscape" | "portrait" | "square" | "story" | "feed-4x5";
  fps: number;
  clips: Array<{
    assetIndex: number;
    assetUrl: string;
    assetType: "image" | "video";
    width: number;
    height: number;
    startSec: number;
    durationSec: number;
    animation: string;
    textOverlay?: {
      text: string;
      position: "top" | "center" | "bottom";
      fontSize: "small" | "medium" | "large";
      style: "bold" | "normal" | "italic";
    };
  }>;
  musicStyle?: string;
  totalDurationSec: number;
}

interface LibraryItem {
  id: string;
  type: string;
  prompt: string;
  preview: any;
  customName?: string;
}

interface AutoMontageDialogProps {
  open: boolean;
  onClose: () => void;
  libraryItems: LibraryItem[];
  onMontageReady: (plan: MontagePlan) => void;
  serverPost: (path: string, body: any) => Promise<any>;
  isFr: boolean;
}

// ── Format definitions ──

type FormatKey = "landscape" | "portrait" | "square" | "story" | "feed-4x5";

const FORMATS: { key: FormatKey; label: string; ratio: string; w: number; h: number }[] = [
  { key: "landscape", label: "Landscape", ratio: "16:9", w: 1920, h: 1080 },
  { key: "portrait",  label: "Portrait",  ratio: "9:16", w: 1080, h: 1920 },
  { key: "square",    label: "Square",     ratio: "1:1",  w: 1080, h: 1080 },
  { key: "story",     label: "Story",      ratio: "9:16", w: 1080, h: 1920 },
  { key: "feed-4x5",  label: "Feed",       ratio: "4:5",  w: 1080, h: 1350 },
];

// ── Helpers ──

function getAssetUrl(item: LibraryItem): string | null {
  if (!item.preview) return null;
  if (item.preview.kind === "image") return item.preview.imageUrl || null;
  if (item.preview.kind === "film") return item.preview.videoUrl || null;
  return null;
}

function isVideo(item: LibraryItem): boolean {
  return item.type === "film" || item.preview?.kind === "film";
}

function getItemName(item: LibraryItem): string {
  return item.customName || item.prompt || "Untitled";
}

/** Probe natural dimensions of an image or video element. */
function probeDimensions(
  url: string,
  type: "image" | "video",
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (type === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve({ width: v.videoWidth || 1920, height: v.videoHeight || 1080 });
      v.onerror = () => resolve({ width: 1920, height: 1080 });
      v.src = url;
    } else {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1080 });
      img.onerror = () => resolve({ width: 1080, height: 1080 });
      img.src = url;
    }
  });
}

// ── Component ──

export function AutoMontageDialog({
  open, onClose, libraryItems, onMontageReady, serverPost, isFr,
}: AutoMontageDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<FormatKey>("landscape");
  const [stylePrompt, setStylePrompt] = useState("");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter library items to those with valid asset URLs
  const validItems = useMemo(
    () => libraryItems.filter((i) => getAssetUrl(i) !== null),
    [libraryItems],
  );

  const selectedCount = selectedIds.size;
  const canCreate = selectedCount >= 2 && !loading;

  // ── Handlers ──

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === validItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validItems.map((i) => i.id)));
    }
  }, [validItems, selectedIds.size]);

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    setLoading(true);

    try {
      // Build asset list with probed dimensions
      const selected = validItems.filter((i) => selectedIds.has(i.id));
      const assets = await Promise.all(
        selected.map(async (item) => {
          const url = getAssetUrl(item)!;
          const type: "image" | "video" = isVideo(item) ? "video" : "image";
          const dims = await probeDimensions(url, type);
          return {
            id: item.id,
            url,
            type,
            name: getItemName(item),
            width: dims.width,
            height: dims.height,
          };
        }),
      );

      const body = {
        assets,
        format,
        style: stylePrompt || undefined,
        musicPrompt: musicEnabled ? (musicPrompt || undefined) : undefined,
        locale: isFr ? "fr" : "en",
      };

      const plan: MontagePlan = await serverPost("/editor/auto-montage", body);
      onMontageReady(plan);
      onClose();
      toast.success(isFr ? "Montage prêt !" : "Montage ready!");
    } catch (err: any) {
      const msg = err?.message || (isFr ? "Erreur lors de la création du montage" : "Failed to create montage");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [canCreate, validItems, selectedIds, format, stylePrompt, musicEnabled, musicPrompt, isFr, serverPost, onMontageReady, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}
        onClick={() => { if (!loading) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 16,
            width: "100%",
            maxWidth: 560,
            maxHeight: "90vh",
            boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #7C3AED, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={14} style={{ color: "#fff" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                {isFr ? "Montage IA" : "AI Montage"}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: "none", border: "none", color: "#bbb",
                cursor: loading ? "default" : "pointer", padding: 4,
                borderRadius: 6, display: "flex",
              }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Step 1: Asset selection ── */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={sectionLabel}>
                  {isFr ? "1. Sélectionnez vos médias" : "1. Select your media"}
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={selectAll} style={linkButton}>
                    {selectedIds.size === validItems.length
                      ? (isFr ? "Tout désélectionner" : "Deselect all")
                      : (isFr ? "Tout sélectionner" : "Select all")}
                  </button>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: selectedCount >= 2 ? "#7C3AED" : "#bbb",
                    background: selectedCount >= 2 ? "rgba(124,58,237,0.08)" : "#f5f5f7",
                    padding: "2px 8px", borderRadius: 10,
                  }}>
                    {selectedCount}
                  </span>
                </div>
              </div>

              {validItems.length === 0 ? (
                <div style={{
                  padding: "32px 16px", textAlign: "center",
                  background: "#fafafa", borderRadius: 10, border: "1px solid #f0f0f0",
                }}>
                  <ImageIcon size={24} style={{ color: "#ddd", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>
                    {isFr ? "Aucun média dans la bibliothèque" : "No media in library"}
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                  gap: 8, maxHeight: 260, overflowY: "auto",
                  padding: 2,
                }}>
                  {validItems.map((item) => {
                    const url = getAssetUrl(item)!;
                    const video = isVideo(item);
                    const selected = selectedIds.has(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => !loading && toggleItem(item.id)}
                        style={{
                          position: "relative",
                          borderRadius: 10,
                          overflow: "hidden",
                          cursor: loading ? "default" : "pointer",
                          aspectRatio: "1",
                          background: "#f5f5f7",
                          border: selected ? "2px solid #7C3AED" : "2px solid transparent",
                          boxShadow: selected ? "0 0 0 2px rgba(124,58,237,0.18)" : "none",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                      >
                        {video ? (
                          <video
                            src={url}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            muted
                            playsInline
                            preload="metadata"
                            onMouseEnter={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}); }}
                            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                          />
                        ) : (
                          <img
                            src={url}
                            alt={getItemName(item)}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            loading="lazy"
                          />
                        )}

                        {/* Type badge */}
                        <div style={{
                          position: "absolute", top: 5, left: 5,
                          background: "rgba(0,0,0,0.5)", borderRadius: 4,
                          padding: "2px 4px", display: "flex", alignItems: "center",
                        }}>
                          {video
                            ? <Film size={9} style={{ color: "#fff" }} />
                            : <ImageIcon size={9} style={{ color: "#fff" }} />
                          }
                        </div>

                        {/* Selection check */}
                        <div style={{
                          position: "absolute", top: 5, right: 5,
                          width: 18, height: 18, borderRadius: 5,
                          background: selected ? "#7C3AED" : "rgba(255,255,255,0.7)",
                          border: selected ? "none" : "1.5px solid rgba(0,0,0,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background 0.15s",
                        }}>
                          {selected && <Check size={11} style={{ color: "#fff" }} />}
                        </div>

                        {/* Item name tooltip on hover */}
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0,
                          background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
                          padding: "12px 6px 5px",
                        }}>
                          <span style={{
                            fontSize: 9, color: "#fff", fontWeight: 500,
                            display: "block", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {getItemName(item)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {selectedCount > 0 && selectedCount < 2 && (
                <p style={{ fontSize: 11, color: "#e67e22", marginTop: 6, marginBottom: 0 }}>
                  {isFr ? "Sélectionnez au moins 2 médias" : "Select at least 2 media items"}
                </p>
              )}
            </section>

            {/* ── Step 2: Settings ── */}
            <section>
              <label style={sectionLabel}>
                {isFr ? "2. Paramètres" : "2. Settings"}
              </label>

              {/* Format selector */}
              <div style={{ marginTop: 10 }}>
                <label style={fieldLabel}>{isFr ? "Format" : "Format"}</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {FORMATS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFormat(f.key)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: 8,
                        border: format === f.key ? "1px solid #7C3AED" : "1px solid #e8e8e8",
                        background: format === f.key ? "rgba(124,58,237,0.06)" : "#fafafa",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        transition: "border-color 0.12s, background 0.12s",
                      }}
                    >
                      {/* Aspect ratio preview box */}
                      <div style={{
                        width: f.w >= f.h ? 26 : Math.round(26 * (f.w / f.h)),
                        height: f.h >= f.w ? 26 : Math.round(26 * (f.h / f.w)),
                        borderRadius: 3,
                        border: `1.5px solid ${format === f.key ? "#7C3AED" : "#ccc"}`,
                        transition: "border-color 0.12s",
                      }} />
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: format === f.key ? "#7C3AED" : "#999",
                      }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize: 9, color: "#bbb" }}>{f.ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style prompt */}
              <div style={{ marginTop: 14 }}>
                <label style={fieldLabel}>{isFr ? "Style" : "Style"}</label>
                <textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder={isFr
                    ? "Décrivez le style souhaité... (ex: cinématique, dynamique, doux)"
                    : "Describe the desired style... (e.g. cinematic, dynamic, soft)"
                  }
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid #e8e8e8", background: "#fafafa",
                    fontSize: 12, color: "#1a1a1a", resize: "vertical",
                    outline: "none", fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e8e8e8"; }}
                />
              </div>

              {/* Music toggle */}
              <div style={{ marginTop: 14 }}>
                <label
                  onClick={() => setMusicEnabled((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    cursor: "pointer", userSelect: "none",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: musicEnabled ? "none" : "1.5px solid #ccc",
                    background: musicEnabled ? "#7C3AED" : "#fafafa",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.12s",
                    flexShrink: 0,
                  }}>
                    {musicEnabled && <Check size={11} style={{ color: "#fff" }} />}
                  </div>
                  <Music size={14} style={{ color: musicEnabled ? "#7C3AED" : "#bbb" }} />
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>
                    {isFr ? "Générer une musique de fond" : "Generate background music"}
                  </span>
                </label>

                {/* Music prompt (conditional) */}
                <AnimatePresence>
                  {musicEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: "hidden" }}
                    >
                      <input
                        type="text"
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        placeholder={isFr
                          ? "Style musical (optionnel)... ex: lo-fi chill, epic orchestral"
                          : "Music style (optional)... e.g. lo-fi chill, epic orchestral"
                        }
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: 8,
                          border: "1px solid #e8e8e8", background: "#fafafa",
                          fontSize: 12, color: "#1a1a1a", outline: "none",
                          fontFamily: "inherit", marginTop: 8,
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#e8e8e8"; }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "14px 20px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: "#bbb" }}>
              {selectedCount > 0
                ? (isFr
                  ? `${selectedCount} média${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`
                  : `${selectedCount} item${selectedCount > 1 ? "s" : ""} selected`)
                : ""}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "1px solid #e8e8e8", background: "#fff",
                  color: "#999", fontSize: 13,
                  cursor: loading ? "default" : "pointer",
                }}
              >
                {isFr ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: canCreate
                    ? "linear-gradient(135deg, #7C3AED, #9333EA)"
                    : "#f0f0f0",
                  color: canCreate ? "#fff" : "#ccc",
                  fontSize: 13, fontWeight: 600,
                  cursor: canCreate ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: canCreate ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    {isFr ? "L'IA prépare votre montage..." : "AI is preparing your montage..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {isFr ? "Créer le montage" : "Create montage"}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Shared styles ──

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#555",
  display: "block",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11, color: "#999", textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 6,
};

const linkButton: React.CSSProperties = {
  background: "none", border: "none",
  color: "#7C3AED", fontSize: 11, fontWeight: 500,
  cursor: "pointer", padding: 0, textDecoration: "underline",
  textUnderlineOffset: 2,
};
