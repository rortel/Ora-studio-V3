import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import type { VideoTrack, TrackItem, Transition } from "../../lib/video-editor/types";
import type { VideoProjectActions } from "../../lib/video-editor/useVideoProject";
import { AudioWaveform } from "./AudioWaveform";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Timeline — Phase 5: snap, shortcuts, transitions
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PIXELS_PER_FRAME = 3;
const TRACK_HEIGHT = 48;
const HEADER_WIDTH = 160;
const RULER_HEIGHT = 28;
const SNAP_THRESHOLD_PX = 8;

const TRACK_COLORS: Record<string, string> = {
  video: "rgba(99,102,241,0.7)",
  audio: "rgba(16,185,129,0.6)",
  text: "rgba(245,158,11,0.6)",
  overlay: "rgba(236,72,153,0.6)",
  background: "rgba(107,114,128,0.5)",
};

const TRANSITION_TYPES: Transition["type"][] = [
  "crossfade", "fade-black", "fade-white", "wipe-left", "wipe-right",
];

interface Props {
  actions: VideoProjectActions;
}

export function Timeline({ actions }: Props) {
  const {
    project,
    playheadFrame,
    setPlayheadFrame,
    selectedItemId,
    setSelectedItemId,
    updateTrack,
    moveItem,
    updateItem,
    splitAtPlayhead,
    removeItem,
    duplicateItem,
    undo,
    redo,
    setTransition,
  } = actions;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const ppf = PIXELS_PER_FRAME * zoom;
  const totalWidth = project.durationInFrames * ppf + 200;

  /* ── Collect all snap points (clip edges + playhead) ── */
  const snapPoints = useMemo(() => {
    const pts = new Set<number>();
    pts.add(0);
    pts.add(playheadFrame);
    for (const track of project.tracks) {
      for (const item of track.items) {
        pts.add(item.from);
        pts.add(item.from + item.durationInFrames);
      }
    }
    return Array.from(pts);
  }, [project, playheadFrame]);

  /* ── Snap helper ── */
  const snapFrame = useCallback(
    (frame: number, excludeItemId?: string): number => {
      const threshold = SNAP_THRESHOLD_PX / ppf;
      let closest = frame;
      let minDist = threshold;
      for (const sp of snapPoints) {
        const dist = Math.abs(frame - sp);
        if (dist < minDist) {
          minDist = dist;
          closest = sp;
        }
      }
      setSnapGuide(closest !== frame ? closest : null);
      return closest;
    },
    [snapPoints, ppf],
  );

  const clearSnapGuide = useCallback(() => setSnapGuide(null), []);

  /* ── Ruler click → set playhead ── */
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
      setPlayheadFrame(Math.max(0, Math.round(x / ppf)));
    },
    [ppf, setPlayheadFrame],
  );

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Delete / Backspace → remove clip
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedItemId) { e.preventDefault(); removeItem(selectedItemId); }
      }
      // Cmd+S / Ctrl+S → split at playhead
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedItemId) splitAtPlayhead(selectedItemId);
      }
      // Cmd+Z → undo
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault(); undo();
      }
      // Cmd+Shift+Z or Cmd+Y → redo
      if ((e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key === "y" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault(); redo();
      }
      // D → duplicate
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedItemId) duplicateItem(selectedItemId);
      }
      // Arrow keys → scrub playhead (Shift = 10 frames)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlayheadFrame(Math.max(0, playheadFrame - (e.shiftKey ? 10 : 1)));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlayheadFrame(playheadFrame + (e.shiftKey ? 10 : 1));
      }
      // Home → start
      if (e.key === "Home") { e.preventDefault(); setPlayheadFrame(0); }
      // End → end
      if (e.key === "End") { e.preventDefault(); setPlayheadFrame(project.durationInFrames); }
      // Space → play/pause (click Remotion player)
      if (e.key === " ") {
        e.preventDefault();
        const playBtn = document.querySelector("[aria-label='Play']") as HTMLButtonElement
          || document.querySelector("[aria-label='Pause']") as HTMLButtonElement;
        if (playBtn) playBtn.click();
      }
      // + / - → zoom
      if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.25, z - 0.25));
      // Escape → deselect
      if (e.key === "Escape") setSelectedItemId(null);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItemId, playheadFrame, setPlayheadFrame, splitAtPlayhead, removeItem, undo, redo, duplicateItem, project.durationInFrames, setSelectedItemId]);

  return (
    <div className="flex flex-col bg-card border-t border-border select-none h-full">
      {/* ── Toolbar row ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-secondary/50">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Timeline</span>

        {/* Split button */}
        <button
          onClick={() => { if (selectedItemId) splitAtPlayhead(selectedItemId); }}
          disabled={!selectedItemId}
          className="ml-3 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-[10px] text-foreground/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Split at playhead (Cmd+S)"
        >
          Split
        </button>

        {/* Duplicate button */}
        <button
          onClick={() => { if (selectedItemId) duplicateItem(selectedItemId); }}
          disabled={!selectedItemId}
          className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-[10px] text-foreground/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Duplicate (Cmd+D)"
        >
          Duplicate
        </button>

        {/* Transition selector */}
        <TransitionSelector
          selectedItemId={selectedItemId}
          actions={actions}
        />

        {/* Zoom controls */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground/50 text-sm flex items-center justify-center"
          >
            -
          </button>
          <span className="text-[11px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground/50 text-sm flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden flex-1">
        {/* ── Track headers (fixed left) ── */}
        <div className="flex-shrink-0" style={{ width: HEADER_WIDTH }}>
          <div style={{ height: RULER_HEIGHT }} className="border-b border-border" />
          {project.tracks.map((track) => (
            <TrackHeader key={track.id} track={track} onUpdate={(u) => updateTrack(track.id, u)} />
          ))}
        </div>

        {/* ── Scrollable area ── */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: totalWidth, position: "relative" }}>
            {/* Ruler */}
            <div
              className="border-b border-border cursor-pointer relative"
              style={{ height: RULER_HEIGHT }}
              onClick={handleRulerClick}
            >
              <Ruler fps={project.fps} ppf={ppf} totalWidth={totalWidth} />
            </div>

            {/* Track lanes */}
            {project.tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                ppf={ppf}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onMoveItem={moveItem}
                onResizeItem={(id, dur) => updateItem(id, { durationInFrames: dur })}
                snapFrame={snapFrame}
                onDragEnd={clearSnapGuide}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{ left: playheadFrame * ppf, width: 2 }}
            >
              <div className="w-3 h-3 -ml-[5px] bg-foreground rounded-full" />
              <div className="w-0.5 h-full bg-foreground mx-auto" />
            </div>

            {/* Snap guide line */}
            {snapGuide !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-15"
                style={{ left: snapGuide * ppf, width: 1 }}
              >
                <div className="w-px h-full bg-amber-500/60" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyboard hints ── */}
      <div className="flex items-center gap-4 px-3 py-1 border-t border-border bg-secondary/50">
        {[
          ["Space", "Play/Pause"],
          ["Del", "Delete"],
          ["\u2318S", "Split"],
          ["\u2318D", "Duplicate"],
          ["\u2318Z", "Undo"],
          ["\u2190\u2192", "Scrub"],
          ["+/-", "Zoom"],
        ].map(([key, label]) => (
          <span key={key} className="text-[9px] text-muted-foreground/60">
            <span className="text-muted-foreground font-mono">{key}</span> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Transition selector (inline in toolbar) ── */
function TransitionSelector({
  selectedItemId,
  actions,
}: {
  selectedItemId: string | null;
  actions: VideoProjectActions;
}) {
  const item = selectedItemId ? actions.getItem(selectedItemId) : undefined;
  const currentType = item?.transition?.type || "none";

  if (!selectedItemId) return null;

  return (
    <select
      value={currentType}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "none") {
          actions.setTransition(selectedItemId, undefined);
        } else {
          actions.setTransition(selectedItemId, {
            type: val as Transition["type"],
            durationInFrames: item?.transition?.durationInFrames || 15,
          });
        }
      }}
      className="bg-secondary border border-border rounded-md px-2 py-1 text-[10px] text-foreground/60"
      title="Transition"
    >
      <option value="none">No transition</option>
      <option value="crossfade">Crossfade</option>
      <option value="fade-black">Fade to black</option>
      <option value="fade-white">Fade to white</option>
      <option value="wipe-left">Wipe left</option>
      <option value="wipe-right">Wipe right</option>
    </select>
  );
}

/* ── Ruler component ── */
function Ruler({ fps, ppf, totalWidth }: { fps: number; ppf: number; totalWidth: number }) {
  const marks: React.ReactNode[] = [];
  const secondWidth = fps * ppf;
  const step = secondWidth < 30 ? 5 : secondWidth < 60 ? 2 : 1;

  for (let s = 0; s * fps * ppf < totalWidth; s += step) {
    const x = s * fps * ppf;
    const isMain = s % (step * 2) === 0;
    marks.push(
      <div key={s} className="absolute top-0 bottom-0" style={{ left: x }}>
        <div className={`w-px ${isMain ? "h-full bg-border-strong" : "h-1/2 bg-border"}`} />
        {isMain && (
          <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground whitespace-nowrap">
            {formatTime(s)}
          </span>
        )}
      </div>,
    );
  }
  return <>{marks}</>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Track header ── */
function TrackHeader({
  track,
  onUpdate,
}: {
  track: VideoTrack;
  onUpdate: (u: Partial<Pick<VideoTrack, "label" | "locked" | "muted" | "visible">>) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 border-b border-border/50"
      style={{ height: TRACK_HEIGHT }}
    >
      <span className="text-[11px] text-foreground/70 truncate flex-1">{track.label}</span>
      <button
        onClick={() => onUpdate({ muted: !track.muted })}
        className={`w-5 h-5 rounded text-[9px] flex items-center justify-center ${
          track.muted ? "bg-red-100 text-red-600" : "bg-secondary text-muted-foreground"
        }`}
        title={track.muted ? "Unmute" : "Mute"}
      >
        M
      </button>
      <button
        onClick={() => onUpdate({ locked: !track.locked })}
        className={`w-5 h-5 rounded text-[9px] flex items-center justify-center ${
          track.locked ? "bg-amber-100 text-amber-600" : "bg-secondary text-muted-foreground"
        }`}
        title={track.locked ? "Unlock" : "Lock"}
      >
        L
      </button>
      <button
        onClick={() => onUpdate({ visible: !track.visible })}
        className={`w-5 h-5 rounded text-[9px] flex items-center justify-center ${
          !track.visible ? "bg-secondary text-muted-foreground/40" : "bg-secondary text-muted-foreground"
        }`}
        title={track.visible ? "Hide" : "Show"}
      >
        {track.visible ? "V" : "H"}
      </button>
    </div>
  );
}

/* ── Track lane (contains clips) ── */
function TrackLane({
  track,
  ppf,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  onResizeItem,
  snapFrame,
  onDragEnd,
}: {
  track: VideoTrack;
  ppf: number;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onMoveItem: (id: string, newFrom: number) => void;
  onResizeItem: (id: string, newDuration: number) => void;
  snapFrame: (frame: number) => number;
  onDragEnd: () => void;
}) {
  return (
    <div
      className="relative border-b border-border/50"
      style={{ height: TRACK_HEIGHT }}
    >
      {track.items.map((item) => (
        <ClipBlock
          key={item.id}
          item={item}
          track={track}
          ppf={ppf}
          isSelected={selectedItemId === item.id}
          onSelect={() => onSelectItem(item.id)}
          onMove={(newFrom) => onMoveItem(item.id, newFrom)}
          onResize={(newDur) => onResizeItem(item.id, newDur)}
          locked={track.locked}
          snapFrame={snapFrame}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

/* ── Individual clip block (draggable + resizable + snap) ── */
function ClipBlock({
  item,
  track,
  ppf,
  isSelected,
  onSelect,
  onMove,
  onResize,
  locked,
  snapFrame,
  onDragEnd,
}: {
  item: TrackItem;
  track: VideoTrack;
  ppf: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (newFrom: number) => void;
  onResize: (newDuration: number) => void;
  locked: boolean;
  snapFrame: (frame: number) => number;
  onDragEnd: () => void;
}) {
  const dragRef = useRef<{ startX: number; startFrom: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startDur: number } | null>(null);

  const left = item.from * ppf;
  const width = item.durationInFrames * ppf;
  const color = TRACK_COLORS[track.type] || TRACK_COLORS.background;

  const label =
    item.data.kind === "text"
      ? item.data.text.slice(0, 20)
      : item.data.kind === "background"
        ? item.data.color
        : item.data.kind;

  /* Drag handler with snap */
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (locked) return;
      e.stopPropagation();
      onSelect();
      dragRef.current = { startX: e.clientX, startFrom: item.from };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const rawFrame = dragRef.current.startFrom + Math.round(dx / ppf);
        const snapped = snapFrame(Math.max(0, rawFrame));
        onMove(snapped);
      };
      const onMouseUp = () => {
        dragRef.current = null;
        onDragEnd();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [item.from, ppf, onMove, onSelect, locked, snapFrame, onDragEnd],
  );

  /* Resize handler with snap */
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (locked) return;
      e.stopPropagation();
      resizeRef.current = { startX: e.clientX, startDur: item.durationInFrames };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = ev.clientX - resizeRef.current.startX;
        const rawDur = resizeRef.current.startDur + Math.round(dx / ppf);
        const endFrame = item.from + Math.max(1, rawDur);
        const snappedEnd = snapFrame(endFrame);
        onResize(Math.max(1, snappedEnd - item.from));
      };
      const onMouseUp = () => {
        resizeRef.current = null;
        onDragEnd();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [item.from, item.durationInFrames, ppf, onResize, locked, snapFrame, onDragEnd],
  );

  const clipWidth = Math.max(width, 4);
  const clipHeight = TRACK_HEIGHT - 8;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md cursor-grab active:cursor-grabbing overflow-hidden transition-shadow ${
        isSelected ? "ring-2 ring-foreground/60 shadow-lg" : ""
      } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ left, width: clipWidth, background: color }}
      onMouseDown={onDragStart}
    >
      {/* Transition indicator */}
      {item.transition && (
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-white/30 to-transparent z-10 pointer-events-none"
          style={{ width: Math.min(item.transition.durationInFrames * ppf, clipWidth) }}
        >
          <span className="text-[7px] text-white/60 px-1 leading-none mt-0.5 block truncate">
            {item.transition.type}
          </span>
        </div>
      )}

      {/* Waveform for audio clips */}
      {item.data.kind === "audio" && item.sourceUrl && (
        <AudioWaveform
          url={item.sourceUrl}
          width={clipWidth}
          height={clipHeight}
          color="rgba(16,185,129,0.5)"
        />
      )}

      {/* Thumbnail for video/image clips */}
      {(item.data.kind === "video" || item.data.kind === "image") && item.sourceUrl && (
        <div className="absolute inset-0 opacity-40">
          <img
            src={item.sourceUrl}
            alt=""
            className="h-full object-cover"
            style={{ width: clipWidth }}
            loading="lazy"
          />
        </div>
      )}

      {/* Color preview for background clips */}
      {item.data.kind === "background" && (
        <div
          className="absolute inset-0 opacity-60 rounded-md"
          style={{ background: item.data.color }}
        />
      )}

      {/* Label overlay */}
      <div className="relative px-1.5 py-0.5 text-[10px] text-white/90 truncate font-medium leading-tight h-full flex items-center z-10">
        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>
      </div>

      {/* Resize handle (right) */}
      {!locked && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-foreground/20 z-10"
          onMouseDown={onResizeStart}
        />
      )}

      {/* Trim handle (left) */}
      {!locked && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-foreground/20 z-10"
        />
      )}
    </div>
  );
}
