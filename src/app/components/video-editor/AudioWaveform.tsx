import { useEffect, useRef, memo } from "react";
import WaveSurfer from "wavesurfer.js";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Audio Waveform — renders inside timeline clips
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface Props {
  url: string;
  width: number;
  height: number;
  color?: string;
  progressColor?: string;
}

export const AudioWaveform = memo(function AudioWaveform({
  url,
  width,
  height,
  color = "rgba(16,185,129,0.6)",
  progressColor = "rgba(16,185,129,0.9)",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const urlRef = useRef(url);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Avoid re-creating for same URL
    if (wsRef.current && urlRef.current === url) return;
    urlRef.current = url;

    // Destroy previous instance
    if (wsRef.current) {
      wsRef.current.destroy();
      wsRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      url,
      height,
      waveColor: color,
      progressColor: "transparent",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      interact: false,
      fillParent: true,
      autoplay: false,
      backend: "WebAudio",
    });

    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [url, height, color]);

  // Update width when clip is resized
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.width = `${width}px`;
    }
  }, [width]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none opacity-80"
      style={{ width, height, overflow: "hidden" }}
    />
  );
});
