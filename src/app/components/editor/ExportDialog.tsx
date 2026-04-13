/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Export Dialog — Image or Video export
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X as XIcon, Download, Image as ImageIcon, Film,
  Loader2, Check, AlertCircle,
} from "lucide-react";
import type { EditorProject } from "../../lib/editor/types";

type ExportMode = "image" | "video";
type ImageFormat = "png" | "jpeg" | "webp";
type VideoQuality = "standard" | "high";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  project: EditorProject;
  currentFrame: number;
  onExportImage: (format: ImageFormat, quality: number) => string | null;
  onExportVideo: (quality: VideoQuality) => Promise<string | null>;
  hasTimeline: boolean;
  isFr: boolean;
}

export function ExportDialog({
  open, onClose, project, currentFrame,
  onExportImage, onExportVideo, hasTimeline, isFr,
}: ExportDialogProps) {
  const [mode, setMode] = useState<ExportMode>(hasTimeline ? "video" : "image");
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [imageQuality, setImageQuality] = useState(92);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("standard");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const handleExportImage = useCallback(() => {
    const dataUrl = onExportImage(imageFormat, imageQuality / 100);
    if (dataUrl) {
      const ext = imageFormat === "jpeg" ? "jpg" : imageFormat;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${project.name || "export"}-frame${currentFrame}.${ext}`;
      a.click();
      setExportResult({ success: true });
    } else {
      setExportResult({ success: false, error: isFr ? "Rien à exporter" : "Nothing to export" });
    }
  }, [onExportImage, imageFormat, imageQuality, project.name, currentFrame, isFr]);

  const handleExportVideo = useCallback(async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const url = await onExportVideo(videoQuality);
      if (url) setExportResult({ success: true, url });
      else setExportResult({ success: false, error: isFr ? "Export vidéo échoué" : "Video export failed" });
    } catch (err: any) {
      setExportResult({ success: false, error: err?.message || "Export error" });
    } finally {
      setExporting(false);
    }
  }, [onExportVideo, videoQuality, isFr]);

  if (!open) return null;

  const duration = (project.durationInFrames / project.fps).toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}
        onClick={() => { if (!exporting) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: "#fff", border: "1px solid #e8e8e8",
            borderRadius: 14, width: "100%", maxWidth: 420,
            boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #f0f0f0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Download size={18} style={{ color: "#7C3AED" }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                {isFr ? "Exporter" : "Export"}
              </h3>
            </div>
            <button
              onClick={onClose} disabled={exporting}
              style={{ background: "none", border: "none", color: "#bbb", cursor: exporting ? "default" : "pointer", padding: 4 }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <ModeButton active={mode === "image"} onClick={() => setMode("image")}
                icon={<ImageIcon size={16} />} label="Image" sub={`Frame ${currentFrame}`} />
              <ModeButton active={mode === "video"} onClick={() => setMode("video")}
                icon={<Film size={16} />} label={isFr ? "Vidéo" : "Video"} sub={`${duration}s · ${project.fps}fps`} />
            </div>

            {mode === "image" && (
              <>
                <div>
                  <label style={labelStyle}>Format</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["png", "jpeg", "webp"] as const).map(f => (
                      <button key={f} onClick={() => setImageFormat(f)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: imageFormat === f ? "1px solid #7C3AED" : "1px solid #e8e8e8",
                        background: imageFormat === f ? "rgba(124,58,237,0.06)" : "#fafafa",
                        color: imageFormat === f ? "#7C3AED" : "#999",
                        fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "uppercase",
                      }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                {imageFormat !== "png" && (
                  <div>
                    <label style={labelStyle}>{isFr ? "Qualité" : "Quality"}: {imageQuality}%</label>
                    <input type="range" min={10} max={100} value={imageQuality}
                      onChange={e => setImageQuality(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#7C3AED" }}
                    />
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#bbb" }}>
                  {project.width} × {project.height}px
                </div>
              </>
            )}

            {mode === "video" && (
              <>
                <div>
                  <label style={labelStyle}>{isFr ? "Qualité" : "Quality"}</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["standard", "high"] as const).map(q => (
                      <button key={q} onClick={() => setVideoQuality(q)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: videoQuality === q ? "1px solid #7C3AED" : "1px solid #e8e8e8",
                        background: videoQuality === q ? "rgba(124,58,237,0.06)" : "#fafafa",
                        color: videoQuality === q ? "#7C3AED" : "#999",
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                      }}>
                        {q === "standard" ? "Standard" : (isFr ? "Haute qualité" : "High quality")}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#bbb" }}>
                  {project.width} × {project.height}px · {duration}s · MP4
                </div>
              </>
            )}

            {exportResult && (
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: exportResult.success ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${exportResult.success ? "#bbf7d0" : "#fecaca"}`,
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, color: exportResult.success ? "#16a34a" : "#dc2626",
              }}>
                {exportResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                {exportResult.success ? (isFr ? "Export réussi !" : "Export successful!") : exportResult.error}
                {exportResult.url && (
                  <a href={exportResult.url} download={`${project.name || "export"}.mp4`}
                    style={{ marginLeft: "auto", color: "#7C3AED", textDecoration: "underline" }}>
                    Download
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 20px", borderTop: "1px solid #f0f0f0",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            <button onClick={onClose} disabled={exporting} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e8e8e8",
              background: "#fff", color: "#999",
              fontSize: 13, cursor: exporting ? "default" : "pointer",
            }}>
              {isFr ? "Fermer" : "Close"}
            </button>
            <button
              onClick={mode === "image" ? handleExportImage : handleExportVideo}
              disabled={exporting}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: exporting ? "#f5f5f7" : "#7C3AED",
                color: exporting ? "#bbb" : "#fff",
                fontSize: 13, fontWeight: 600,
                cursor: exporting ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  {isFr ? "Export..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download size={14} />
                  {isFr ? "Exporter" : "Export"}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ModeButton({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "12px 14px", borderRadius: 10,
      border: active ? "1px solid #7C3AED" : "1px solid #e8e8e8",
      background: active ? "rgba(124,58,237,0.04)" : "#fafafa",
      cursor: "pointer", textAlign: "left",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: active ? "#7C3AED" : "#999" }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: 10, color: "#bbb" }}>{sub}</span>
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#999", textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 6,
};
