import type { VideoProjectActions } from "../../lib/video-editor/useVideoProject";
import { VIDEO_PRESETS, type VideoPresetKey } from "../../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Editor Toolbar — Top bar
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  actions: VideoProjectActions;
  onExport?: () => void;
  onClose?: () => void;
}

export function VideoEditorToolbar({ actions, onExport, onClose }: Props) {
  const { project, setProject, undo, redo, canUndo, canRedo } = actions;

  return (
    <div className="flex items-center gap-3 px-4 h-12 bg-card border-b border-border">
      {onClose && (
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      <input
        value={project.name}
        onChange={(e) => setProject({ ...project, name: e.target.value })}
        className="bg-transparent text-foreground text-sm font-medium border-b border-transparent hover:border-border focus:border-foreground focus:outline-none px-1 py-0.5 min-w-[120px]"
      />

      <div className="w-px h-5 bg-border" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          title="Undo (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 0 1 0 10H3" />
            <path d="M3 10l4-4M3 10l4 4" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H11a5 5 0 0 0 0 10h10" />
            <path d="M21 10l-4-4M21 10l-4 4" />
          </svg>
        </button>
      </div>

      <div className="w-px h-5 bg-border" />

      <select
        value={`${project.width}x${project.height}`}
        onChange={(e) => {
          const key = e.target.value as VideoPresetKey;
          const preset = VIDEO_PRESETS[key];
          if (preset) setProject({ ...project, width: preset.width, height: preset.height });
        }}
        className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
      >
        {Object.entries(VIDEO_PRESETS).map(([key, p]) => (
          <option key={key} value={key}>{p.label}</option>
        ))}
      </select>

      <select
        value={project.fps}
        onChange={(e) => setProject({ ...project, fps: Number(e.target.value) })}
        className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
      >
        {[24, 25, 30, 60].map((fps) => (
          <option key={fps} value={fps}>{fps} fps</option>
        ))}
      </select>

      <div className="flex-1" />

      <span className="text-xs text-muted-foreground font-mono tabular-nums">
        {(project.durationInFrames / project.fps).toFixed(1)}s
      </span>

      <button
        onClick={onExport}
        className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-all"
      >
        Export
      </button>
    </div>
  );
}
