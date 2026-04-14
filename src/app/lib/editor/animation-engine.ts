/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Animation Engine — rAF playback loop
   Drives Konva canvas + video/audio elements in sync
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type Konva from "konva";
import type { EditorProject, UnifiedLayer, AudioTrackItem } from "./types";
import { interpolateSpatialAtFrame } from "./interpolation";
import { generatePresetKeyframes } from "./presets";

export interface AnimationEngineCallbacks {
  onFrameChange: (frame: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onEnd: () => void;
}

export class AnimationEngine {
  private project: EditorProject | null = null;
  private callbacks: AnimationEngineCallbacks;
  private playing = false;
  private currentFrame = 0;
  private rafId: number | null = null;
  private startTime = 0;
  private startFrame = 0;

  // Registry: layerId → Konva.Node
  private konvaNodes = new Map<string, Konva.Node>();
  // Registry: layerId → HTMLVideoElement
  private videoElements = new Map<string, HTMLVideoElement>();
  // Registry: trackId → HTMLAudioElement
  private audioElements = new Map<string, HTMLAudioElement>();

  constructor(callbacks: AnimationEngineCallbacks) {
    this.callbacks = callbacks;
  }

  // ── Project sync ──

  setProject(project: EditorProject) {
    this.project = project;
  }

  // ── Registration ──

  registerNode(layerId: string, node: Konva.Node) { this.konvaNodes.set(layerId, node); }
  unregisterNode(layerId: string) { this.konvaNodes.delete(layerId); }

  registerVideo(layerId: string, el: HTMLVideoElement) { this.videoElements.set(layerId, el); }
  unregisterVideo(layerId: string) { this.videoElements.delete(layerId); }

  registerAudio(trackId: string, el: HTMLAudioElement) { this.audioElements.set(trackId, el); }
  unregisterAudio(trackId: string) { this.audioElements.delete(trackId); }

  // ── Playback controls ──

  play() {
    if (this.playing || !this.project) return;
    this.playing = true;
    this.startTime = performance.now();
    this.startFrame = this.currentFrame;
    this.callbacks.onPlayStateChange(true);
    this.tick();
  }

  pause() {
    this.playing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callbacks.onPlayStateChange(false);
    // Pause all media
    this.videoElements.forEach(v => v.pause());
    this.audioElements.forEach(a => a.pause());
  }

  toggle() {
    if (this.playing) this.pause(); else this.play();
  }

  seek(frame: number) {
    if (!this.project) return;
    this.currentFrame = Math.max(0, Math.min(frame, this.project.durationInFrames));
    if (this.playing) {
      this.startTime = performance.now();
      this.startFrame = this.currentFrame;
    }
    this.applyFrame(this.currentFrame);
    this.callbacks.onFrameChange(this.currentFrame);
  }

  getCurrentFrame() { return this.currentFrame; }
  isPlaying() { return this.playing; }

  // ── Core loop ──

  private tick = () => {
    if (!this.playing || !this.project) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    const frame = Math.round(this.startFrame + elapsed * this.project.fps);

    if (frame >= this.project.durationInFrames) {
      this.currentFrame = this.project.durationInFrames;
      this.applyFrame(this.currentFrame);
      this.callbacks.onFrameChange(this.currentFrame);
      this.pause();
      this.callbacks.onEnd();
      return;
    }

    if (frame !== this.currentFrame) {
      this.currentFrame = frame;
      this.applyFrame(frame);
      this.callbacks.onFrameChange(frame);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  // ── Apply frame to all registered nodes/media ──

  private applyFrame(frame: number) {
    if (!this.project) return;

    for (const layer of this.project.layers) {
      if (!layer.visible) continue;

      const relFrame = frame - layer.temporal.startFrame;
      const inRange = relFrame >= 0 && relFrame <= layer.temporal.durationInFrames;

      const node = this.konvaNodes.get(layer.id);
      if (node) {
        // Hide nodes outside their temporal range
        node.visible(inRange);
        if (inRange) {
          this.applyLayerToNode(layer, relFrame, node);
        }
      }

      // Video element sync — play when in range, pause + seek when out
      if (layer.type === "video") {
        const vid = this.videoElements.get(layer.id);
        if (vid) {
          if (inRange) {
            const targetTime = layer.trimStart + relFrame / this.project.fps;
            // Only seek if drift > 0.1s to avoid stuttering during playback
            if (Math.abs(vid.currentTime - targetTime) > 0.1) {
              vid.currentTime = targetTime;
            }
            if (this.playing && vid.paused) vid.play().catch(() => {});
          } else {
            // Pause videos outside their temporal range (CapCut/Premiere behavior)
            if (!vid.paused) vid.pause();
          }
        }
      }
    }

    // Audio tracks
    for (const track of this.project.audioTracks) {
      const relFrame = frame - track.startFrame;
      const inRange = relFrame >= 0 && relFrame <= track.durationInFrames;
      const audio = this.audioElements.get(track.id);
      if (!audio) continue;

      if (inRange) {
        const targetTime = track.trimStart + relFrame / this.project.fps;
        if (Math.abs(audio.currentTime - targetTime) > 0.15) {
          audio.currentTime = targetTime;
        }
        // Compute volume with fade
        const relSec = relFrame / this.project.fps;
        const totalSec = track.durationInFrames / this.project.fps;
        let vol = track.volume;
        if (track.fadeIn > 0 && relSec < track.fadeIn) vol *= relSec / track.fadeIn;
        if (track.fadeOut > 0 && (totalSec - relSec) < track.fadeOut) vol *= (totalSec - relSec) / track.fadeOut;
        audio.volume = Math.max(0, Math.min(1, vol));
        if (this.playing && audio.paused) audio.play().catch(() => {});
      } else {
        if (!audio.paused) audio.pause();
      }
    }
  }

  private applyLayerToNode(layer: UnifiedLayer, relFrame: number, node: Konva.Node) {
    // Merge preset keyframes with custom keyframes
    const presetKfs = generatePresetKeyframes(layer.animationPreset, layer.temporal.durationInFrames, layer.spatial);
    const allKeyframes = [...presetKfs, ...layer.temporal.keyframes];

    const spatial = interpolateSpatialAtFrame(layer.spatial, allKeyframes, relFrame);

    node.setAttrs({
      x: spatial.x,
      y: spatial.y,
      width: spatial.width,
      height: spatial.height,
      rotation: spatial.rotation,
      opacity: spatial.opacity,
      scaleX: spatial.scaleX,
      scaleY: spatial.scaleY,
    });
  }

  // ── Cleanup ──

  destroy() {
    this.pause();
    this.konvaNodes.clear();
    this.videoElements.clear();
    this.audioElements.clear();
  }
}
