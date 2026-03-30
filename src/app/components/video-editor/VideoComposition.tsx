import { AbsoluteFill, Sequence, Video, Audio, Img, useCurrentFrame, interpolate } from "remotion";
import type { VideoProject, TrackItem, TextOverlayData, ImageOverlayData, ColorBackgroundData, Transition } from "../../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Remotion Composition — renders all tracks/items
   with crossfade transition support
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  project: VideoProject;
}

export function VideoComposition({ project }: Props) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {project.tracks
        .filter((t) => t.visible && !t.muted)
        .map((track) =>
          track.items.map((item) => (
            <Sequence
              key={item.id}
              from={item.from}
              durationInFrames={item.durationInFrames}
            >
              <TransitionWrapper item={item} fps={project.fps}>
                <RenderItem item={item} fps={project.fps} />
              </TransitionWrapper>
            </Sequence>
          ))
        )}
    </AbsoluteFill>
  );
}

/* ── Transition wrapper — applies fade/wipe to entering clip ── */
function TransitionWrapper({
  item,
  fps,
  children,
}: {
  item: TrackItem;
  fps: number;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const t = item.transition;

  if (!t || t.durationInFrames <= 0) return <>{children}</>;

  const transitionFrames = t.durationInFrames;

  switch (t.type) {
    case "crossfade": {
      const opacity = interpolate(frame, [0, transitionFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
    }
    case "fade-black": {
      const opacity = interpolate(frame, [0, transitionFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <>
          <AbsoluteFill style={{ background: "#000", opacity: 1 - opacity }} />
          <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
        </>
      );
    }
    case "fade-white": {
      const opacity = interpolate(frame, [0, transitionFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <>
          <AbsoluteFill style={{ background: "#fff", opacity: 1 - opacity }} />
          <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
        </>
      );
    }
    case "wipe-left": {
      const progress = interpolate(frame, [0, transitionFrames], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <AbsoluteFill style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>
          {children}
        </AbsoluteFill>
      );
    }
    case "wipe-right": {
      const progress = interpolate(frame, [0, transitionFrames], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${100 - progress}%)` }}>
          {children}
        </AbsoluteFill>
      );
    }
    default:
      return <>{children}</>;
  }
}

function RenderItem({ item, fps }: { item: TrackItem; fps: number }) {
  switch (item.data.kind) {
    case "video":
      return <VideoClip item={item} />;
    case "audio":
      return <AudioClip item={item} fps={fps} />;
    case "text":
      return <TextOverlay data={item.data} durationInFrames={item.durationInFrames} />;
    case "image":
      return <ImageOverlay item={item} />;
    case "background":
      return <BackgroundLayer data={item.data} />;
    default:
      return null;
  }
}

/* ── Video clip ── */
function VideoClip({ item }: { item: TrackItem }) {
  if (!item.sourceUrl) return null;
  return (
    <AbsoluteFill>
      <Video
        src={item.sourceUrl}
        startFrom={item.trimStart ?? 0}
        volume={item.data.kind === "video" ? item.data.volume : 1}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}

/* ── Audio clip ── */
function AudioClip({ item, fps }: { item: TrackItem; fps: number }) {
  if (!item.sourceUrl || item.data.kind !== "audio") return null;
  const frame = useCurrentFrame();
  const { volume, fadeIn = 0, fadeOut = 0 } = item.data;

  let vol = volume;
  if (fadeIn > 0) {
    vol *= interpolate(frame, [0, fadeIn * fps], [0, 1], { extrapolateRight: "clamp" });
  }
  if (fadeOut > 0) {
    const fadeOutStart = item.durationInFrames - fadeOut * fps;
    vol *= interpolate(frame, [fadeOutStart, item.durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  }

  return (
    <Audio
      src={item.sourceUrl}
      startFrom={item.trimStart ?? 0}
      volume={vol}
    />
  );
}

/* ── Text overlay ── */
function TextOverlay({ data, durationInFrames }: { data: TextOverlayData; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: `${data.x}%`,
        top: `${data.y}%`,
        width: `${data.width}%`,
        textAlign: data.align,
        opacity,
        fontFamily: data.fontFamily || "'Inter', sans-serif",
        fontSize: data.fontSize,
        fontWeight: data.fontWeight,
        color: data.color,
        backgroundColor: data.backgroundColor || "transparent",
        padding: data.backgroundColor ? "8px 16px" : 0,
        borderRadius: data.backgroundColor ? 8 : 0,
        lineHeight: 1.3,
        pointerEvents: "none",
      }}
    >
      {data.text}
    </div>
  );
}

/* ── Image overlay ── */
function ImageOverlay({ item }: { item: TrackItem }) {
  if (!item.sourceUrl || item.data.kind !== "image") return null;
  const { x, y, width, height, opacity } = item.data;
  return (
    <Img
      src={item.sourceUrl}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        objectFit: "contain",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Solid color background ── */
function BackgroundLayer({ data }: { data: ColorBackgroundData }) {
  return <AbsoluteFill style={{ background: data.color }} />;
}
