import { AbsoluteFill, Sequence, Video, Audio, Img, useCurrentFrame, interpolate, Easing } from "remotion";
import type { VideoProject, TrackItem, TextOverlayData, ImageOverlayData, ColorBackgroundData, Transition } from "../../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Remotion Composition — cinematic rendering
   Ken Burns, animated text, smooth transitions
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  project: VideoProject;
}

/* Simple hash from string to pick motion pattern */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
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

/* ── Transition wrapper ── */
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
      return <TextOverlay data={item.data} durationInFrames={item.durationInFrames} fps={fps} />;
    case "image":
      return <CinematicImage item={item} />;
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

/* ── Cinematic Image with Ken Burns effect ── */
function CinematicImage({ item }: { item: TrackItem }) {
  if (!item.sourceUrl || item.data.kind !== "image") return null;
  const frame = useCurrentFrame();
  const dur = item.durationInFrames;
  const progress = interpolate(frame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pick motion pattern based on item id
  const pattern = hashCode(item.id) % 4;

  let scale: number;
  let translateX: number;
  let translateY: number;

  switch (pattern) {
    case 0: // Zoom in + pan left
      scale = interpolate(progress, [0, 1], [1.0, 1.18]);
      translateX = interpolate(progress, [0, 1], [0, -3]);
      translateY = interpolate(progress, [0, 1], [0, -1]);
      break;
    case 1: // Zoom out + pan right
      scale = interpolate(progress, [0, 1], [1.18, 1.0]);
      translateX = interpolate(progress, [0, 1], [-3, 0]);
      translateY = interpolate(progress, [0, 1], [1, 0]);
      break;
    case 2: // Zoom in + pan up
      scale = interpolate(progress, [0, 1], [1.0, 1.15]);
      translateX = interpolate(progress, [0, 1], [0, 1]);
      translateY = interpolate(progress, [0, 1], [2, -2]);
      break;
    default: // Zoom out + pan down
      scale = interpolate(progress, [0, 1], [1.15, 1.0]);
      translateX = interpolate(progress, [0, 1], [1, 0]);
      translateY = interpolate(progress, [0, 1], [-2, 2]);
      break;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={item.sourceUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          willChange: "transform",
        }}
      />
    </AbsoluteFill>
  );
}

/* ── Cinematic Text overlay with slide-up animation ── */
function TextOverlay({ data, durationInFrames, fps }: { data: TextOverlayData; durationInFrames: number; fps: number }) {
  const frame = useCurrentFrame();
  const fadeInDur = Math.min(15, durationInFrames * 0.15);
  const fadeOutDur = Math.min(12, durationInFrames * 0.12);

  const opacity = interpolate(
    frame,
    [0, fadeInDur, durationInFrames - fadeOutDur, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const slideY = interpolate(
    frame,
    [0, fadeInDur],
    [20, 0],
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
        transform: `translateY(${slideY}px)`,
        fontFamily: data.fontFamily || "'Inter', sans-serif",
        fontSize: data.fontSize,
        fontWeight: data.fontWeight,
        color: data.color,
        backgroundColor: data.backgroundColor || "transparent",
        padding: data.backgroundColor ? "12px 24px" : 0,
        borderRadius: data.backgroundColor ? 8 : 0,
        lineHeight: 1.3,
        pointerEvents: "none",
        textShadow: !data.backgroundColor ? "0 2px 8px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)" : "none",
        letterSpacing: "0.01em",
      }}
    >
      {data.text}
    </div>
  );
}

/* ── Image overlay (legacy, for positioned overlays) ── */
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
