import { useCallback, useRef } from "react";
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

  const handleSeek = useCallback((e: { detail: { frame: number } }) => {
    onFrameChange(e.detail.frame);
  }, [onFrameChange]);

  return (
    <div className="flex flex-col items-center gap-3 h-full justify-center p-4 bg-secondary/50">
      <div
        className="rounded-xl overflow-hidden border border-border"
        style={{
          boxShadow: "var(--shadow-lg)",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${project.width}/${project.height}`,
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
          initialFrame={playheadFrame}
        />
      </div>

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
