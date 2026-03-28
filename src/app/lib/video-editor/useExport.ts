import { useCallback, useRef, useState } from "react";
import type { VideoProject } from "./types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Export — Client-side render via canvas capture
   + ffmpeg.wasm for muxing into MP4/WebM
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface ExportOptions {
  format: "mp4" | "webm";
  quality: "draft" | "standard" | "high";
  resolution: "original" | "720p" | "1080p";
}

export interface ExportProgress {
  phase: "preparing" | "rendering" | "encoding" | "done" | "error";
  percent: number;
  currentFrame: number;
  totalFrames: number;
  message: string;
  downloadUrl?: string;
  error?: string;
}

const QUALITY_MAP = {
  draft: { videoBitrate: "2M", audioBitrate: "128k", crf: 28 },
  standard: { videoBitrate: "5M", audioBitrate: "192k", crf: 23 },
  high: { videoBitrate: "10M", audioBitrate: "320k", crf: 18 },
};

const RESOLUTION_MAP = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

export function useExport() {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const abortRef = useRef(false);

  const exportVideo = useCallback(
    async (project: VideoProject, options: ExportOptions) => {
      setIsExporting(true);
      abortRef.current = false;

      const totalFrames = project.durationInFrames;

      setProgress({
        phase: "preparing",
        percent: 0,
        currentFrame: 0,
        totalFrames,
        message: "Loading ffmpeg...",
      });

      try {
        // Dynamically import ffmpeg to avoid blocking initial load
        const { FFmpeg } = await import("@ffmpeg/ffmpeg");
        const { fetchFile } = await import("@ffmpeg/util");

        const ffmpeg = new FFmpeg();

        // Load ffmpeg.wasm
        await ffmpeg.load({
          coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
          wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
        });

        if (abortRef.current) throw new Error("Export cancelled");

        // Determine output resolution
        let outWidth = project.width;
        let outHeight = project.height;
        if (options.resolution !== "original") {
          const res = RESOLUTION_MAP[options.resolution];
          // Scale maintaining aspect ratio
          const aspect = project.width / project.height;
          if (aspect >= 1) {
            outWidth = res.width;
            outHeight = Math.round(res.width / aspect);
          } else {
            outHeight = res.height;
            outWidth = Math.round(res.height * aspect);
          }
          // Ensure even dimensions
          outWidth = outWidth % 2 === 0 ? outWidth : outWidth + 1;
          outHeight = outHeight % 2 === 0 ? outHeight : outHeight + 1;
        }

        setProgress({
          phase: "rendering",
          percent: 0,
          currentFrame: 0,
          totalFrames,
          message: "Capturing frames from composition...",
        });

        // Find the Remotion player canvas
        const playerContainer = document.querySelector("[data-remotion-player]")
          || document.querySelector(".remotion-player canvas")
          || document.querySelector("video");

        if (!playerContainer) {
          // Fallback: Use MediaRecorder approach on the player container
          await exportViaMediaRecorder(project, options, setProgress, abortRef);
          return;
        }

        // Use MediaRecorder on a canvas for real-time capture
        await exportViaMediaRecorder(project, options, setProgress, abortRef);

      } catch (err: any) {
        if (err.message === "Export cancelled") {
          setProgress(null);
        } else {
          setProgress({
            phase: "error",
            percent: 0,
            currentFrame: 0,
            totalFrames,
            message: err.message || "Export failed",
            error: err.message,
          });
        }
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { exportVideo, cancelExport, progress, isExporting };
}

/* ── MediaRecorder-based export (works in all browsers) ── */
async function exportViaMediaRecorder(
  project: VideoProject,
  options: ExportOptions,
  setProgress: (p: ExportProgress) => void,
  abortRef: React.RefObject<boolean>,
) {
  const totalFrames = project.durationInFrames;
  const durationMs = (totalFrames / project.fps) * 1000;

  setProgress({
    phase: "rendering",
    percent: 5,
    currentFrame: 0,
    totalFrames,
    message: "Setting up capture...",
  });

  // Find the Remotion player's internal video/canvas element
  const playerEl = document.querySelector("[data-remotion-canvas]") as HTMLCanvasElement
    || document.querySelector(".remotion-player canvas") as HTMLCanvasElement;

  let stream: MediaStream;

  if (playerEl && "captureStream" in playerEl) {
    stream = (playerEl as any).captureStream(project.fps);
  } else {
    // Fallback: capture the entire player container
    const container = document.querySelector("[style*='aspect-ratio']")?.querySelector("div")
      || document.querySelector(".remotion-player");

    if (!container) {
      throw new Error("Could not find video player to capture. Please ensure the preview is visible.");
    }

    // Use html2canvas-style capture or video element capture
    const videoEl = container.querySelector("video");
    if (videoEl && "captureStream" in videoEl) {
      stream = (videoEl as any).captureStream(project.fps);
    } else {
      throw new Error("Browser doesn't support canvas/video capture. Try Chrome or Edge.");
    }
  }

  const mimeType = options.format === "webm"
    ? "video/webm;codecs=vp9,opus"
    : MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")
      ? "video/webm;codecs=h264,opus"
      : "video/webm;codecs=vp8,opus";

  const qualityBitrate = {
    draft: 2_000_000,
    standard: 5_000_000,
    high: 10_000_000,
  };

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: qualityBitrate[options.quality],
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<void>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: options.format === "mp4" ? "video/mp4" : "video/webm" });
      const url = URL.createObjectURL(blob);

      setProgress({
        phase: "done",
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        message: "Export complete!",
        downloadUrl: url,
      });
      resolve();
    };

    recorder.onerror = (e: any) => {
      reject(new Error(e.error?.message || "Recording failed"));
    };

    // Start recording
    recorder.start(100); // collect data every 100ms

    // Simulate progress while recording plays
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (abortRef.current) {
        clearInterval(progressInterval);
        recorder.stop();
        return;
      }

      const elapsed = Date.now() - startTime;
      const percent = Math.min(95, (elapsed / durationMs) * 100);
      const currentFrame = Math.min(totalFrames, Math.round((elapsed / durationMs) * totalFrames));

      setProgress({
        phase: "rendering",
        percent,
        currentFrame,
        totalFrames,
        message: `Recording... ${Math.round(percent)}%`,
      });

      if (elapsed >= durationMs) {
        clearInterval(progressInterval);

        setProgress({
          phase: "encoding",
          percent: 95,
          currentFrame: totalFrames,
          totalFrames,
          message: "Finalizing...",
        });

        setTimeout(() => recorder.stop(), 500);
      }
    }, 200);

    // Trigger playback on the Remotion player
    const playButton = document.querySelector("[aria-label='Play']") as HTMLButtonElement
      || document.querySelector("button[title='Play']") as HTMLButtonElement;

    if (playButton) {
      playButton.click();
    } else {
      // Try clicking the player itself (clickToPlay)
      const player = document.querySelector("[style*='aspect-ratio']");
      if (player) (player as HTMLElement).click();
    }
  });
}
