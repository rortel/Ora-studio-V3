import { useState, useCallback } from "react";
import type { VideoProject } from "../../lib/video-editor/types";
import { useExport, type ExportOptions } from "../../lib/video-editor/useExport";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Export Dialog — Format, quality, resolution
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  open: boolean;
  onClose: () => void;
  project: VideoProject;
}

export function ExportDialog({ open, onClose, project }: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    format: "mp4",
    quality: "standard",
    resolution: "original",
  });

  const { exportVideo, cancelExport, progress, isExporting } = useExport();

  const handleExport = useCallback(() => {
    exportVideo(project, options);
  }, [project, options, exportVideo]);

  const handleDownload = useCallback(() => {
    if (!progress?.downloadUrl) return;
    const a = document.createElement("a");
    a.href = progress.downloadUrl;
    a.download = `${project.name || "video"}.${options.format}`;
    a.click();
  }, [progress, project.name, options.format]);

  if (!open) return null;

  const duration = (project.durationInFrames / project.fps).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6" style={{ boxShadow: "var(--shadow-xl)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Export Video</h2>
          <button
            onClick={onClose}
            disabled={isExporting && progress?.phase === "rendering"}
            className="text-muted-foreground hover:text-foreground text-xl leading-none disabled:opacity-30"
          >
            &times;
          </button>
        </div>

        {/* Export progress view */}
        {isExporting || progress?.phase === "done" || progress?.phase === "error" ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground capitalize">{progress?.phase}</span>
                <span className="text-xs text-muted-foreground/70">{Math.round(progress?.percent || 0)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progress?.phase === "error"
                      ? "bg-red-500"
                      : progress?.phase === "done"
                        ? "bg-emerald-500"
                        : "bg-foreground"
                  }`}
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground text-center">{progress?.message}</p>

            {/* Frame counter */}
            {progress?.phase === "rendering" && (
              <p className="text-[11px] text-muted-foreground/60 text-center font-mono">
                Frame {progress.currentFrame} / {progress.totalFrames}
              </p>
            )}

            {/* Error */}
            {progress?.phase === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600">{progress.error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {progress?.phase === "done" && progress.downloadUrl ? (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-colors"
                  >
                    Download {options.format.toUpperCase()}
                  </button>
                  <button
                    onClick={() => {
                      if (progress.downloadUrl) URL.revokeObjectURL(progress.downloadUrl);
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-full bg-secondary text-foreground/60 text-sm border border-border hover:bg-secondary/80 transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : progress?.phase === "error" ? (
                <>
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2.5 rounded-full bg-secondary text-foreground text-sm font-medium border border-border hover:bg-secondary/80 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-full bg-secondary text-foreground/60 text-sm border border-border hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={cancelExport}
                  className="flex-1 py-2.5 rounded-full bg-secondary text-foreground/60 text-sm border border-border hover:bg-secondary/80 transition-colors"
                >
                  Cancel export
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Options view */
          <div className="space-y-5">
            {/* Project info */}
            <div className="bg-secondary rounded-lg p-3 flex items-center justify-between border border-border">
              <div>
                <p className="text-sm text-foreground font-medium">{project.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {project.width}x{project.height} &middot; {project.fps}fps &middot; {duration}s
                </p>
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono">
                {project.durationInFrames} frames
              </span>
            </div>

            {/* Format */}
            <OptionGroup label="Format">
              <OptionButton
                active={options.format === "mp4"}
                onClick={() => setOptions({ ...options, format: "mp4" })}
                label="MP4"
                desc="Best compatibility"
              />
              <OptionButton
                active={options.format === "webm"}
                onClick={() => setOptions({ ...options, format: "webm" })}
                label="WebM"
                desc="Smaller files"
              />
            </OptionGroup>

            {/* Quality */}
            <OptionGroup label="Quality">
              <OptionButton
                active={options.quality === "draft"}
                onClick={() => setOptions({ ...options, quality: "draft" })}
                label="Draft"
                desc="Fast, 2 Mbps"
              />
              <OptionButton
                active={options.quality === "standard"}
                onClick={() => setOptions({ ...options, quality: "standard" })}
                label="Standard"
                desc="Balanced, 5 Mbps"
              />
              <OptionButton
                active={options.quality === "high"}
                onClick={() => setOptions({ ...options, quality: "high" })}
                label="High"
                desc="Best, 10 Mbps"
              />
            </OptionGroup>

            {/* Resolution */}
            <OptionGroup label="Resolution">
              <OptionButton
                active={options.resolution === "original"}
                onClick={() => setOptions({ ...options, resolution: "original" })}
                label="Original"
                desc={`${project.width}x${project.height}`}
              />
              <OptionButton
                active={options.resolution === "1080p"}
                onClick={() => setOptions({ ...options, resolution: "1080p" })}
                label="1080p"
                desc="Full HD"
              />
              <OptionButton
                active={options.resolution === "720p"}
                onClick={() => setOptions({ ...options, resolution: "720p" })}
                label="720p"
                desc="Faster export"
              />
            </OptionGroup>

            {/* Estimated size */}
            <div className="bg-secondary rounded-lg p-3 text-center border border-border">
              <p className="text-[11px] text-muted-foreground">
                Estimated file size:{" "}
                <span className="text-foreground font-medium">
                  {estimateFileSize(project, options)}
                </span>
              </p>
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="w-full py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-colors"
            >
              Start Export
            </button>

            <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
              The export captures the Remotion preview in real-time.
              <br />
              Keep this tab active during export.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared components ── */

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">{label}</label>
      <div className="grid grid-cols-3 gap-1.5">{children}</div>
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2.5 px-2 rounded-lg border transition-all ${
        active
          ? "border-foreground/40 bg-secondary text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-secondary"
      }`}
    >
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[9px] text-muted-foreground/60 mt-0.5">{desc}</span>
    </button>
  );
}

/* ── Estimate file size based on bitrate and duration ── */
function estimateFileSize(project: VideoProject, options: ExportOptions): string {
  const durationSec = project.durationInFrames / project.fps;
  const bitrateMap = { draft: 2, standard: 5, high: 10 }; // Mbps
  const bitrate = bitrateMap[options.quality];
  const sizeMB = (bitrate * durationSec) / 8;

  if (sizeMB < 1) return `~${Math.round(sizeMB * 1024)} KB`;
  return `~${sizeMB.toFixed(1)} MB`;
}
