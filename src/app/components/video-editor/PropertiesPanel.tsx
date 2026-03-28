import { useCallback } from "react";
import type { VideoProjectActions } from "../../lib/video-editor/useVideoProject";
import type {
  TrackItem,
  TextOverlayData,
  ImageOverlayData,
  AudioClipData,
  VideoClipData,
  Transition,
} from "../../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Properties Panel — Right sidebar for editing
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  actions: VideoProjectActions;
}

export function PropertiesPanel({ actions }: Props) {
  const { selectedItemId, getItem, getTrackForItem, updateItem, updateItemData, removeItem, splitAtPlayhead } =
    actions;

  const item = selectedItemId ? getItem(selectedItemId) : undefined;
  const track = selectedItemId ? getTrackForItem(selectedItemId) : undefined;

  if (!item) {
    return (
      <div className="h-full bg-card border-l border-border flex items-center justify-center p-6">
        <p className="text-muted-foreground text-xs text-center">Select a clip to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card border-l border-border overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground capitalize">{item.data.kind}</span>
          <span className="text-[10px] text-muted-foreground">{track?.label}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Timing ── */}
        <Section title="Timing">
          <NumberField
            label="Start (frames)"
            value={item.from}
            onChange={(v) => updateItem(item.id, { from: Math.max(0, v) })}
          />
          <NumberField
            label="Duration (frames)"
            value={item.durationInFrames}
            onChange={(v) => updateItem(item.id, { durationInFrames: Math.max(1, v) })}
          />
        </Section>

        {/* ── Type-specific properties ── */}
        {item.data.kind === "text" && <TextProperties item={item} onUpdate={updateItemData} />}
        {item.data.kind === "image" && <ImageProperties item={item} onUpdate={updateItemData} />}
        {item.data.kind === "video" && <VideoProperties item={item} onUpdate={updateItemData} />}
        {item.data.kind === "audio" && <AudioProperties item={item} onUpdate={updateItemData} />}
        {item.data.kind === "background" && (
          <Section title="Color">
            <ColorField
              label="Background"
              value={item.data.color}
              onChange={(color) => updateItemData(item.id, { color })}
            />
          </Section>
        )}

        {/* ── Transition ── */}
        <Section title="Transition (in)">
          <SelectField
            label="Type"
            value={item.transition?.type || "none"}
            options={[
              { value: "none", label: "None" },
              { value: "crossfade", label: "Crossfade" },
              { value: "fade-black", label: "Fade to black" },
              { value: "fade-white", label: "Fade to white" },
              { value: "wipe-left", label: "Wipe left" },
              { value: "wipe-right", label: "Wipe right" },
            ]}
            onChange={(v) => {
              if (v === "none") {
                actions.setTransition(item.id, undefined);
              } else {
                actions.setTransition(item.id, {
                  type: v as Transition["type"],
                  durationInFrames: item.transition?.durationInFrames || 15,
                });
              }
            }}
          />
          {item.transition && (
            <NumberField
              label="Duration (frames)"
              value={item.transition.durationInFrames}
              onChange={(v) =>
                actions.setTransition(item.id, {
                  ...item.transition!,
                  durationInFrames: Math.max(1, v),
                })
              }
            />
          )}
        </Section>

        {/* ── Actions ── */}
        <div className="border-t border-border pt-4 space-y-2">
          <button
            onClick={() => splitAtPlayhead(item.id)}
            className="w-full py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground/70 text-xs border border-border transition-colors"
          >
            Split at playhead
          </button>
          <button
            onClick={() => actions.duplicateItem(item.id)}
            className="w-full py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground/70 text-xs border border-border transition-colors"
          >
            Duplicate clip
          </button>
          <button
            onClick={() => removeItem(item.id)}
            className="w-full py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs border border-red-200 transition-colors"
          >
            Delete clip
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Text properties ── */
function TextProperties({
  item,
  onUpdate,
}: {
  item: TrackItem;
  onUpdate: (id: string, data: Partial<TextOverlayData>) => void;
}) {
  const d = item.data as TextOverlayData;
  return (
    <>
      <Section title="Text">
        <textarea
          value={d.text}
          onChange={(e) => onUpdate(item.id, { text: e.target.value })}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
          rows={3}
        />
      </Section>
      <Section title="Font">
        <NumberField label="Size" value={d.fontSize} onChange={(v) => onUpdate(item.id, { fontSize: v })} />
        <SelectField
          label="Weight"
          value={String(d.fontWeight)}
          options={[
            { value: "300", label: "Light" },
            { value: "400", label: "Regular" },
            { value: "500", label: "Medium" },
            { value: "600", label: "Semibold" },
            { value: "700", label: "Bold" },
            { value: "900", label: "Black" },
          ]}
          onChange={(v) => onUpdate(item.id, { fontWeight: Number(v) })}
        />
        <SelectField
          label="Align"
          value={d.align}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          onChange={(v) => onUpdate(item.id, { align: v as "left" | "center" | "right" })}
        />
        <ColorField label="Color" value={d.color} onChange={(color) => onUpdate(item.id, { color })} />
        <ColorField
          label="Background"
          value={d.backgroundColor || "transparent"}
          onChange={(backgroundColor) =>
            onUpdate(item.id, { backgroundColor: backgroundColor === "transparent" ? undefined : backgroundColor })
          }
        />
      </Section>
      <Section title="Position">
        <SliderField label="X %" value={d.x} min={0} max={100} onChange={(x) => onUpdate(item.id, { x })} />
        <SliderField label="Y %" value={d.y} min={0} max={100} onChange={(y) => onUpdate(item.id, { y })} />
        <SliderField label="Width %" value={d.width} min={5} max={100} onChange={(width) => onUpdate(item.id, { width })} />
      </Section>
    </>
  );
}

/* ── Image properties ── */
function ImageProperties({
  item,
  onUpdate,
}: {
  item: TrackItem;
  onUpdate: (id: string, data: Partial<ImageOverlayData>) => void;
}) {
  const d = item.data as ImageOverlayData;
  return (
    <Section title="Position & Size">
      <SliderField label="X %" value={d.x} min={0} max={100} onChange={(x) => onUpdate(item.id, { x })} />
      <SliderField label="Y %" value={d.y} min={0} max={100} onChange={(y) => onUpdate(item.id, { y })} />
      <SliderField label="Width %" value={d.width} min={5} max={100} onChange={(width) => onUpdate(item.id, { width })} />
      <SliderField label="Height %" value={d.height} min={5} max={100} onChange={(height) => onUpdate(item.id, { height })} />
      <SliderField
        label="Opacity"
        value={Math.round(d.opacity * 100)}
        min={0}
        max={100}
        onChange={(v) => onUpdate(item.id, { opacity: v / 100 })}
      />
    </Section>
  );
}

/* ── Video properties ── */
function VideoProperties({
  item,
  onUpdate,
}: {
  item: TrackItem;
  onUpdate: (id: string, data: Partial<VideoClipData>) => void;
}) {
  const d = item.data as VideoClipData;
  return (
    <Section title="Video">
      <SliderField
        label="Volume %"
        value={Math.round(d.volume * 100)}
        min={0}
        max={100}
        onChange={(v) => onUpdate(item.id, { volume: v / 100 })}
      />
      {item.sourceUrl && (
        <div className="mt-2">
          <span className="text-[10px] text-muted-foreground/60 break-all">{item.sourceUrl.split("/").pop()}</span>
        </div>
      )}
    </Section>
  );
}

/* ── Audio properties ── */
function AudioProperties({
  item,
  onUpdate,
}: {
  item: TrackItem;
  onUpdate: (id: string, data: Partial<AudioClipData>) => void;
}) {
  const d = item.data as AudioClipData;
  return (
    <>
      <Section title="Audio">
        <SliderField
          label="Volume %"
          value={Math.round(d.volume * 100)}
          min={0}
          max={100}
          onChange={(v) => onUpdate(item.id, { volume: v / 100 })}
        />
      </Section>
      <Section title="Fades">
        <SliderField
          label="Fade in (s)"
          value={d.fadeIn ?? 0}
          min={0}
          max={10}
          step={0.1}
          onChange={(fadeIn) => onUpdate(item.id, { fadeIn })}
        />
        <SliderField
          label="Fade out (s)"
          value={d.fadeOut ?? 0}
          min={0}
          max={10}
          step={0.1}
          onChange={(fadeOut) => onUpdate(item.id, { fadeOut })}
        />
      </Section>
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Shared field components
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground text-right"
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground/70">{typeof value === "number" ? (step < 1 ? value.toFixed(1) : value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none bg-border rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value === "transparent" ? "#000000" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
        />
        <span className="text-[10px] text-muted-foreground/60">{value}</span>
      </div>
    </div>
  );
}
