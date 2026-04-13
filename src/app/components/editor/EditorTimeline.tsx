/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Editor Timeline — Multi-track timeline with playhead
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Play, Pause, SkipBack, Volume2, Image, Type, Film, Shapes, Scissors } from "lucide-react";
import type { UnifiedLayer, AudioTrackItem, AnimationPreset } from "../../lib/editor/types";
import { ANIMATION_PRESET_OPTIONS } from "../../lib/editor/presets";
import { AudioWaveform } from "../video-editor/AudioWaveform";

const PIXELS_PER_FRAME = 3;
const TRACK_HEIGHT = 32;
const RULER_HEIGHT = 26;
const SIDEBAR_WIDTH = 150;
const SNAP_THRESHOLD_PX = 6;
const MIN_CLIP_FRAMES = 5;

const LAYER_COLORS: Record<string, string> = {
  image: "#3B82F6",
  video: "#8B5CF6",
  text: "#F59E0B",
  logo: "#10B981",
  shape: "#EC4899",
  subject: "#06B6D4",
  audio: "#EF4444",
};

interface EditorTimelineProps {
  layers: UnifiedLayer[];
  audioTracks: AudioTrackItem[];
  fps: number;
  durationInFrames: number;
  playheadFrame: number;
  isPlaying: boolean;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onPlayheadChange: (frame: number) => void;
  onTogglePlay: () => void;
  onLayerTemporalChange: (layerId: string, startFrame: number, durationInFrames: number) => void;
  onLayerAnimationChange: (layerId: string, preset: AnimationPreset) => void;
  onAudioTemporalChange: (trackId: string, startFrame: number, durationInFrames: number) => void;
  isFr: boolean;
}

export function EditorTimeline({
  layers, audioTracks, fps, durationInFrames,
  playheadFrame, isPlaying, selectedLayerId,
  onSelectLayer, onPlayheadChange, onTogglePlay,
  onLayerTemporalChange, onLayerAnimationChange,
  onAudioTemporalChange, isFr,
}: EditorTimelineProps) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: "move" | "resize-end";
    id: string;
    isAudio: boolean;
    startX: number;
    originalStart: number;
    originalDuration: number;
  } | null>(null);

  const ppf = PIXELS_PER_FRAME * zoom;
  const totalWidth = Math.max(durationInFrames * ppf + 200, 800);

  const snapPoints = useMemo(() => {
    const pts: number[] = [0, playheadFrame];
    for (const l of layers) {
      pts.push(l.temporal.startFrame);
      pts.push(l.temporal.startFrame + l.temporal.durationInFrames);
    }
    for (const a of audioTracks) {
      pts.push(a.startFrame);
      pts.push(a.startFrame + a.durationInFrames);
    }
    return [...new Set(pts)];
  }, [layers, audioTracks, playheadFrame]);

  const snapFrame = useCallback((frame: number): number => {
    let best = frame;
    let bestDist = Infinity;
    const threshold = SNAP_THRESHOLD_PX / ppf;
    for (const p of snapPoints) {
      const d = Math.abs(frame - p);
      if (d < threshold && d < bestDist) { bestDist = d; best = p; }
    }
    return Math.max(0, Math.round(best));
  }, [snapPoints, ppf]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = e.clientX - d.startX;
    const dFrames = dx / ppf;
    if (d.type === "move") {
      const newStart = snapFrame(d.originalStart + dFrames);
      if (d.isAudio) onAudioTemporalChange(d.id, newStart, d.originalDuration);
      else onLayerTemporalChange(d.id, newStart, d.originalDuration);
    } else {
      const newDur = Math.max(MIN_CLIP_FRAMES, Math.round(d.originalDuration + dFrames));
      const snappedEnd = snapFrame(d.originalStart + newDur);
      const finalDur = Math.max(MIN_CLIP_FRAMES, snappedEnd - d.originalStart);
      if (d.isAudio) onAudioTemporalChange(d.id, d.originalStart, finalDur);
      else onLayerTemporalChange(d.id, d.originalStart, finalDur);
    }
  }, [ppf, snapFrame, onLayerTemporalChange, onAudioTemporalChange]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const startDrag = useCallback((
    e: React.MouseEvent, id: string, isAudio: boolean,
    type: "move" | "resize-end", startFrame: number, duration: number,
  ) => {
    e.stopPropagation();
    dragRef.current = { type, id, isAudio, startX: e.clientX, originalStart: startFrame, originalDuration: duration };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const x = e.clientX - rect.left + scrollLeft;
    onPlayheadChange(Math.max(0, Math.round(x / ppf)));
  }, [ppf, onPlayheadChange]);

  const formatTime = useCallback((frame: number) => {
    const s = frame / fps;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
  }, [fps]);

  const rulerMarks = useMemo(() => {
    const marks: { frame: number; label: string; major: boolean }[] = [];
    const step = zoom < 0.5 ? fps * 5 : zoom < 1 ? fps * 2 : zoom < 2 ? fps : Math.round(fps / 2);
    for (let f = 0; f <= durationInFrames + step; f += step) {
      marks.push({ frame: f, label: formatTime(f), major: f % (fps * (zoom < 1 ? 10 : 5)) === 0 });
    }
    return marks;
  }, [durationInFrames, fps, zoom, formatTime]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); onTogglePlay(); }
      if (e.key === "Home") { e.preventDefault(); onPlayheadChange(0); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onTogglePlay, onPlayheadChange]);

  const sortedLayers = useMemo(() => [...layers].sort((a, b) => b.zIndex - a.zIndex), [layers]);

  return (
    <div style={{
      background: "#fafafa", borderTop: "1px solid #e8e8e8",
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
    }}>
      {/* Toolbar */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", gap: 6,
        padding: "0 12px", borderBottom: "1px solid #e8e8e8",
        background: "#fff", flexShrink: 0,
      }}>
        <button onClick={() => onPlayheadChange(0)} style={tbBtn} title={isFr ? "Début" : "Go to start"}>
          <SkipBack size={13} />
        </button>
        <button
          onClick={onTogglePlay}
          style={{ ...tbBtn, background: isPlaying ? "#7C3AED" : "transparent", color: isPlaying ? "#fff" : "#888" }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <span style={{ fontSize: 11, color: "#666", fontFamily: "monospace", minWidth: 60 }}>
          {formatTime(playheadFrame)}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#bbb", marginRight: 4 }}>Zoom</span>
        <input
          type="range" min={25} max={400}
          value={Math.round(zoom * 100)}
          onChange={e => setZoom(Number(e.target.value) / 100)}
          style={{ width: 80, accentColor: "#7C3AED" }}
        />
        <span style={{ fontSize: 10, color: "#999", width: 32, textAlign: "right" }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Tracks */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar labels */}
        <div style={{
          width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: "1px solid #e8e8e8",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ height: RULER_HEIGHT, borderBottom: "1px solid #f0f0f0" }} />
          {sortedLayers.map(layer => (
            <TrackLabel key={layer.id} layer={layer} selected={selectedLayerId === layer.id} onClick={() => onSelectLayer(layer.id)} isFr={isFr} />
          ))}
          {audioTracks.map(track => (
            <div key={track.id} style={{
              height: TRACK_HEIGHT, display: "flex", alignItems: "center", gap: 6,
              padding: "0 10px", borderBottom: "1px solid #f0f0f0",
              fontSize: 11, color: "#999",
            }}>
              <Volume2 size={11} style={{ color: LAYER_COLORS.audio, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {track.name || "Audio"}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable canvas */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "auto", position: "relative" }}>
          <div style={{ width: totalWidth, minHeight: "100%" }}>
            {/* Ruler */}
            <div onClick={handleRulerClick} style={{
              height: RULER_HEIGHT, position: "sticky", top: 0, zIndex: 10,
              background: "#fff", borderBottom: "1px solid #e8e8e8", cursor: "pointer",
            }}>
              {rulerMarks.map(m => (
                <div key={m.frame} style={{
                  position: "absolute", left: m.frame * ppf,
                  height: m.major ? 12 : 6, width: 1,
                  background: m.major ? "#ccc" : "#e0e0e0", bottom: 0,
                }}>
                  {m.major && (
                    <span style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}>
                      {m.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Layer tracks */}
            {sortedLayers.map(layer => (
              <div key={layer.id} onClick={() => onSelectLayer(layer.id)} style={{
                height: TRACK_HEIGHT, position: "relative",
                borderBottom: "1px solid #f0f0f0",
                background: selectedLayerId === layer.id ? "rgba(124,58,237,0.03)" : "transparent",
              }}>
                <ClipBlock
                  id={layer.id}
                  startFrame={layer.temporal.startFrame}
                  durationInFrames={layer.temporal.durationInFrames}
                  color={LAYER_COLORS[layer.type] || "#888"}
                  label={layer.name || layer.type}
                  ppf={ppf}
                  selected={selectedLayerId === layer.id}
                  onStartDrag={(e, type) => startDrag(e, layer.id, false, type, layer.temporal.startFrame, layer.temporal.durationInFrames)}
                  preset={layer.animationPreset}
                  onPresetChange={preset => onLayerAnimationChange(layer.id, preset)}
                  isFr={isFr}
                />
              </div>
            ))}

            {/* Audio tracks */}
            {audioTracks.map(track => (
              <div key={track.id} style={{ height: TRACK_HEIGHT, position: "relative", borderBottom: "1px solid #f0f0f0" }}>
                <ClipBlock
                  id={track.id}
                  startFrame={track.startFrame}
                  durationInFrames={track.durationInFrames}
                  color={LAYER_COLORS.audio}
                  label={track.name || "Audio"}
                  ppf={ppf}
                  selected={false}
                  onStartDrag={(e, type) => startDrag(e, track.id, true, type, track.startFrame, track.durationInFrames)}
                  audioUrl={track.sourceUrl}
                  isFr={isFr}
                />
              </div>
            ))}

            {/* Playhead */}
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: playheadFrame * ppf, width: 1,
              background: "#7C3AED", zIndex: 20, pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute", top: 0, left: -4,
                width: 9, height: 9, borderRadius: "50%",
                background: "#7C3AED", border: "2px solid #c4b5fd",
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const tbBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "none",
  background: "transparent", color: "#888", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function TrackLabel({ layer, selected, onClick, isFr }: {
  layer: UnifiedLayer; selected: boolean; onClick: () => void; isFr: boolean;
}) {
  const IconMap: Record<string, typeof Image> = {
    image: Image, video: Film, text: Type, logo: Image, shape: Shapes, subject: Scissors,
  };
  const Icon = IconMap[layer.type] || Image;
  const color = LAYER_COLORS[layer.type] || "#888";

  return (
    <div onClick={onClick} style={{
      height: TRACK_HEIGHT, display: "flex", alignItems: "center", gap: 6,
      padding: "0 10px", borderBottom: "1px solid #f0f0f0",
      background: selected ? "rgba(124,58,237,0.04)" : "transparent",
      cursor: "pointer", fontSize: 11, color: selected ? "#1a1a1a" : "#999",
    }}>
      <Icon size={11} style={{ color, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {layer.name || layer.type}
      </span>
    </div>
  );
}

function ClipBlock({ id, startFrame, durationInFrames, color, label, ppf, selected, onStartDrag, preset, onPresetChange, audioUrl, isFr }: {
  id: string; startFrame: number; durationInFrames: number; color: string; label: string;
  ppf: number; selected: boolean;
  onStartDrag: (e: React.MouseEvent, type: "move" | "resize-end") => void;
  preset?: AnimationPreset; onPresetChange?: (preset: AnimationPreset) => void;
  audioUrl?: string; isFr: boolean;
}) {
  const left = startFrame * ppf;
  const width = Math.max(durationInFrames * ppf, 4);
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div
      onMouseDown={e => onStartDrag(e, "move")}
      style={{
        position: "absolute", left, width, top: 2, bottom: 2,
        background: `${color}14`,
        border: `1px solid ${color}${selected ? "66" : "33"}`,
        borderRadius: 4, cursor: "grab",
        display: "flex", alignItems: "center", overflow: "hidden",
        paddingLeft: 6, fontSize: 10, color: "#666",
        userSelect: "none",
      }}
      onDoubleClick={e => {
        if (onPresetChange) { e.stopPropagation(); setShowPresets(s => !s); }
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, position: "relative", zIndex: 2 }}>
        {label}
        {preset && preset !== "none" && (
          <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 9 }}>
            ({ANIMATION_PRESET_OPTIONS.find(o => o.value === preset)?.label || preset})
          </span>
        )}
      </span>

      {audioUrl && width > 20 && (
        <AudioWaveform url={audioUrl} width={width - 8} height={TRACK_HEIGHT - 6} color={`${color}44`} />
      )}

      <div
        onMouseDown={e => { e.stopPropagation(); onStartDrag(e, "resize-end"); }}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: 6, cursor: "ew-resize",
          background: `${color}33`, borderRadius: "0 4px 4px 0",
        }}
      />

      {showPresets && onPresetChange && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: "absolute", top: TRACK_HEIGHT, left: 0, zIndex: 50,
            background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8,
            padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            display: "flex", flexDirection: "column", gap: 1, minWidth: 140,
          }}
        >
          {ANIMATION_PRESET_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onPresetChange(opt.value); setShowPresets(false); }}
              style={{
                padding: "4px 8px", borderRadius: 4, border: "none",
                background: preset === opt.value ? "rgba(124,58,237,0.08)" : "transparent",
                color: preset === opt.value ? "#7C3AED" : "#666",
                fontSize: 11, textAlign: "left", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
