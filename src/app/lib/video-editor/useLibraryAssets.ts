import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth-context";
import { API_BASE, publicAnonKey } from "../supabase";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Fetch Ora Studio library assets for video editor
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface VideoLibraryAsset {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  name: string;
  thumbnail?: string;
  durationInFrames?: number;
  prompt?: string;
  model?: string;
}

export function useLibraryAssets(fps: number) {
  const { getAuthHeader } = useAuth();
  const [assets, setAssets] = useState<VideoLibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const serverPost = useCallback(
    (path: string, body: any) => {
      const token = getAuthHeader();
      return fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, _token: token }),
      }).then((r) => r.json());
    },
    [getAuthHeader],
  );

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await serverPost("/library/list", {});
      if (!data.success || !Array.isArray(data.items)) {
        setAssets([]);
        return;
      }

      const mapped: VideoLibraryAsset[] = [];

      for (const item of data.items) {
        const preview = item.preview;
        if (!preview) continue;

        if (item.type === "image" && preview.kind === "image" && preview.imageUrl) {
          mapped.push({
            id: item.id,
            type: "image",
            url: preview.imageUrl,
            name: item.customName || item.prompt?.slice(0, 40) || "Image",
            thumbnail: preview.imageUrl,
            prompt: item.prompt,
            model: item.model?.name,
          });
        } else if (item.type === "film" && preview.kind === "film" && preview.videoUrl) {
          const durSec = parseDuration(preview.duration);
          mapped.push({
            id: item.id,
            type: "video",
            url: preview.videoUrl,
            name: item.customName || item.prompt?.slice(0, 40) || "Video",
            thumbnail: preview.frames?.[0],
            durationInFrames: durSec ? Math.round(durSec * fps) : undefined,
            prompt: item.prompt,
            model: item.model?.name,
          });
        } else if (item.type === "sound" && preview.kind === "sound" && preview.audioUrl) {
          const durSec = parseDuration(preview.duration);
          mapped.push({
            id: item.id,
            type: "audio",
            url: preview.audioUrl,
            name: preview.title || item.customName || item.prompt?.slice(0, 40) || "Audio",
            thumbnail: preview.imageUrl,
            durationInFrames: durSec ? Math.round(durSec * fps) : undefined,
            prompt: item.prompt,
            model: item.model?.name,
          });
        } else if (item.type === "campaign" && preview.kind === "campaign") {
          // Extract individual assets from campaigns
          const campaignAssets = preview.assets || [];
          for (const asset of campaignAssets) {
            if (asset.imageUrl) {
              mapped.push({
                id: `${item.id}-${asset.id || asset.formatId}`,
                type: "image",
                url: asset.imageUrl,
                name: `${asset.label || asset.platform || "Campaign"} image`,
                thumbnail: asset.imageUrl,
                prompt: asset.imagePrompt,
              });
            }
            if (asset.videoUrl) {
              mapped.push({
                id: `${item.id}-${asset.id || asset.formatId}-video`,
                type: "video",
                url: asset.videoUrl,
                name: `${asset.label || asset.platform || "Campaign"} video`,
                prompt: asset.videoPrompt,
              });
            }
          }
        }
      }

      setAssets(mapped);
    } catch (err) {
      console.error("[VideoEditor] Failed to load library:", err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [serverPost, fps]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, loading, refresh: fetchAssets };
}

/* Parse "M:SS" or "MM:SS" duration string to seconds */
function parseDuration(dur?: string): number | null {
  if (!dur) return null;
  const parts = dur.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return null;
}
