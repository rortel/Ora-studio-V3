import { useCallback, useRef, useState, useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoComposition } from "./VideoComposition";
import type { VideoProject } from "../../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Preview — Remotion Player wrapper
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  project: VideoProject;
  playheadFrame: number;
  onFrameChange: (frame: number) => void;
}

export function VideoPreview({ project, playheadFrame, onFrameChange }: Props) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerSize, setPlayerSize] = useState<{ width: number; height: number } | null>(null);

  // Calculate player dimensions to fit within container while preserving aspect ratio
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      // Reserve space for timecode bar (about 32px) and padding (32px)
      const availW = rect.width - 32;
      const availH = rect.height - 64;
      if (availW <= 0 || availH <= 0) return;

      const videoAR = project.width / project.height;
      const containerAR = availW / availH;

      let w: number, h: number;
      if (videoAR > containerAR) {
        w = availW;
        h = availW / videoAR;
      } else {
        h = availH;
        w = availH * videoAR;
      }
      setPlayerSize({ width: Math.round(w), height: Math.round(h) });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [project.width, project.height]);

  const handleSeek = useCallback((e: { detail: { frame: number } }) => {
    onFrameChange(e.detail.frame);
  }, [onFrameChange]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3 h-full justify-center p-4 bg-secondary/50">
      {playerSize && (
        <div
          className="rounded-xl overflow-hidden border border-border"
          style={{
            boxShadow: "var(--shadow-lg)",
            width: playerSize.width,
            height: playerSize.height,
          }}
        >
          <Player
            ref={playerRef}
            component={VideoComposition}
            inputProps={{ project }}
            compositionWidth={project.width}
            compositionHeight={project.height}
            durationInFrames={project.durationInFrames}
            fps={project.fps}
            style={{
              width: "100%",
              height: "100%",
            }}
            controls
            autoPlay={false}
            loop
            clickToPlay
            acknowledgeRemotionLicense
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {formatTimecode(playheadFrame, project.fps)} / {formatTimecode(project.durationInFrames, project.fps)}
        </span>
      </div>
    </div>
  );
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const f = frame % fps;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}
