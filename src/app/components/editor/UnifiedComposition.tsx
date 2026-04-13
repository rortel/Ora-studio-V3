/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Unified Composition — Remotion render for the unified editor
   Renders EditorProject layers with animations at each frame
   Used for server-side video export via /editor/export-video
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { AbsoluteFill, Sequence, Video, Audio, Img, useCurrentFrame } from "remotion";
import type { EditorProject, UnifiedLayer, TextLayer, ShapeLayer, AudioTrackItem } from "../../lib/editor/types";
import { interpolateSpatialAtFrame } from "../../lib/editor/interpolation";
import { generatePresetKeyframes } from "../../lib/editor/presets";

interface Props {
  project: EditorProject;
}

export function UnifiedComposition({ project }: Props) {
  const frame = useCurrentFrame();

  // Sort layers by zIndex for correct paint order
  const sortedLayers = [...project.layers]
    .filter(l => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Background image (if any) */}
      {project.backgroundImageUrl && (
        <Img
          src={project.backgroundImageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Layers */}
      {sortedLayers.map(layer => (
        <Sequence
          key={layer.id}
          from={layer.temporal.startFrame}
          durationInFrames={layer.temporal.durationInFrames}
        >
          <RenderLayer layer={layer} fps={project.fps} />
        </Sequence>
      ))}

      {/* Audio tracks */}
      {project.audioTracks.map(track => (
        <Sequence
          key={track.id}
          from={track.startFrame}
          durationInFrames={track.durationInFrames}
        >
          <Audio
            src={track.sourceUrl}
            startFrom={Math.round(track.trimStart * project.fps)}
            volume={track.volume}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

// ── Individual layer renderer ──

function RenderLayer({ layer, fps }: { layer: UnifiedLayer; fps: number }) {
  const frame = useCurrentFrame(); // relative to Sequence start

  // Compute animated spatial props
  const presetKfs = generatePresetKeyframes(layer.animationPreset, layer.temporal.durationInFrames, layer.spatial);
  const allKfs = [...presetKfs, ...layer.temporal.keyframes];
  const sp = interpolateSpatialAtFrame(layer.spatial, allKfs, frame);

  const transformStyle: React.CSSProperties = {
    position: "absolute",
    left: sp.x,
    top: sp.y,
    width: sp.width,
    height: sp.height,
    opacity: sp.opacity,
    transform: `rotate(${sp.rotation}deg) scale(${sp.scaleX}, ${sp.scaleY})`,
    transformOrigin: "top left",
  };

  switch (layer.type) {
    case "image":
      return (
        <Img
          src={layer.sourceUrl}
          style={{ ...transformStyle, objectFit: "cover" }}
        />
      );

    case "video":
      return (
        <Video
          src={layer.sourceUrl}
          startFrom={Math.round(layer.trimStart * fps)}
          volume={layer.volume}
          style={{ ...transformStyle, objectFit: "cover" }}
        />
      );

    case "text":
      return <RenderTextLayer layer={layer} style={transformStyle} />;

    case "shape":
      return <RenderShapeLayer layer={layer} style={transformStyle} />;

    case "logo":
      return (
        <Img
          src={layer.sourceUrl}
          style={{ ...transformStyle, objectFit: "contain" }}
        />
      );

    case "subject":
      return (
        <Img
          src={layer.sourceUrl}
          style={{ ...transformStyle, objectFit: "contain" }}
        />
      );

    default:
      return null;
  }
}

// ── Text layer ──

function RenderTextLayer({ layer, style }: { layer: TextLayer; style: React.CSSProperties }) {
  const textStyle: React.CSSProperties = {
    ...style,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontStyle.includes("bold") ? "bold" : "normal",
    fontStyle: layer.fontStyle.includes("italic") ? "italic" : "normal",
    color: layer.fill,
    textAlign: layer.align,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
  };

  if (layer.shadow.enabled) {
    textStyle.textShadow = `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}`;
  }

  return <div style={textStyle}>{layer.text}</div>;
}

// ── Shape layer ──

function RenderShapeLayer({ layer, style }: { layer: ShapeLayer; style: React.CSSProperties }) {
  const fill = layer.fillType === "gradient"
    ? `linear-gradient(${layer.gradientAngle}deg, ${layer.gradientStart}, ${layer.gradientEnd})`
    : layer.fill;

  const shapeStyle: React.CSSProperties = {
    ...style,
    background: fill,
    border: layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.stroke}` : "none",
  };

  if (layer.shape === "circle") {
    shapeStyle.borderRadius = "50%";
  } else if (layer.shape === "rect" || layer.shape === "patch" || layer.shape === "pill") {
    shapeStyle.borderRadius = layer.cornerRadius;
  } else if (layer.shape === "star") {
    // Stars rendered as a simple polygon via clip-path
    const points = layer.numPoints;
    const inner = layer.innerRadiusRatio;
    const pathPoints: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? 50 : 50 * inner;
      const a = (Math.PI * i) / points - Math.PI / 2;
      const x = 50 + Math.cos(a) * r;
      const y = 50 + Math.sin(a) * r;
      pathPoints.push(`${x}% ${y}%`);
    }
    shapeStyle.clipPath = `polygon(${pathPoints.join(", ")})`;
  } else if (layer.shape === "triangle") {
    shapeStyle.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
  }

  return <div style={shapeStyle} />;
}
