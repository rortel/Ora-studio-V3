/**
 * Campaign Templates — shared definitions for Campaign Lab
 * Defines available templates, their formats, and metadata.
 *
 * LinkedIn was removed from the platform set per the focus call: Ora's
 * strength is brand-locked visual generation (4:5, 1:1, 9:16), which
 * doesn't match LinkedIn's text-heavy long-form preference. Removing it
 * simplifies onboarding and reduces support load. The "Professional"
 * template was rebuilt around Facebook + Instagram carousel for B2B
 * authority instead.
 */

export interface FormatDef {
  id: string;
  platform: string;
  formatName: string;
  type: "image" | "video" | "text";
  aspectRatio: string;
  dimensions: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  /** lucide icon name (mapped in UI) */
  icon: string;
  formats: string[];
  /** Strategy badge shown on card */
  badge?: string;
}

export const ALL_FORMATS: Record<string, FormatDef> = {
  "instagram-post":    { id: "instagram-post",    platform: "Instagram", formatName: "Instagram Post",    type: "image", aspectRatio: "1:1",   dimensions: "1080x1080" },
  "instagram-story":   { id: "instagram-story",   platform: "Instagram", formatName: "Instagram Story",   type: "image", aspectRatio: "9:16",  dimensions: "1080x1920" },
  "instagram-carousel":{ id: "instagram-carousel",platform: "Instagram", formatName: "Instagram Carousel",type: "image", aspectRatio: "1:1",   dimensions: "1080x1080" },
  "facebook-post":     { id: "facebook-post",     platform: "Facebook",  formatName: "Facebook Post",     type: "image", aspectRatio: "16:9",  dimensions: "1200x630" },
  "instagram-reel":    { id: "instagram-reel",    platform: "Instagram", formatName: "Instagram Reel",    type: "video", aspectRatio: "9:16",  dimensions: "1080x1920" },
  "tiktok-video":      { id: "tiktok-video",      platform: "TikTok",    formatName: "TikTok Video",      type: "video", aspectRatio: "9:16",  dimensions: "1080x1920" },
  "x-post":            { id: "x-post",            platform: "X",         formatName: "X Post",            type: "image", aspectRatio: "16:9",  dimensions: "1200x675" },
  "pinterest-pin":     { id: "pinterest-pin",     platform: "Pinterest", formatName: "Pinterest Pin",     type: "image", aspectRatio: "2:3",   dimensions: "1000x1500" },
  "youtube-thumbnail": { id: "youtube-thumbnail", platform: "YouTube",   formatName: "YouTube Thumbnail", type: "image", aspectRatio: "16:9",  dimensions: "1280x720" },
};

export const TEMPLATES: CampaignTemplate[] = [
  {
    id: "full-blast",
    name: "Full Blast",
    description: "All platforms, all formats. Maximum social reach.",
    icon: "Zap",
    badge: "5 formats",
    formats: ["instagram-post", "instagram-story", "facebook-post", "instagram-reel", "tiktok-video"],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Tease, reveal, convert. Full social coverage.",
    icon: "Rocket",
    badge: "5 formats",
    formats: ["instagram-post", "instagram-story", "facebook-post", "instagram-reel", "tiktok-video"],
  },
  {
    id: "social-only",
    name: "Social Only",
    description: "Instagram-focused. Visual impact + trending hooks.",
    icon: "Camera",
    badge: "3 formats",
    formats: ["instagram-post", "instagram-story", "instagram-reel"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "B2B authority. Facebook + Instagram carousel focused.",
    icon: "Briefcase",
    badge: "3 formats",
    formats: ["facebook-post", "instagram-carousel", "instagram-post"],
  },
  {
    id: "video-first",
    name: "Video First",
    description: "Motion-driven storytelling. Reels + TikTok.",
    icon: "Film",
    badge: "2 formats",
    formats: ["instagram-reel", "tiktok-video"],
  },
  {
    id: "awareness",
    name: "Awareness",
    description: "Maximize brand visibility. Image-first, multi-platform.",
    icon: "Eye",
    badge: "4 formats",
    formats: ["instagram-post", "facebook-post", "instagram-story", "x-post"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Pick your own formats.",
    icon: "Settings",
    badge: "Your mix",
    formats: [],
  },
];

export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#666666",
  Facebook:  "#666666",
  TikTok:    "#666666",
  X:         "#E8E4DF",
  Pinterest: "#666666",
  YouTube:   "#666666",
};

export const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "Ig",
  Facebook:  "Fb",
  TikTok:    "Tk",
  X:         "X",
  Pinterest: "Pn",
  YouTube:   "Yt",
};
