import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Upload, Link2, X, Check, Loader2, Eye, Save,
  Instagram, Linkedin, Facebook, Film,
  Image as ImageIcon, FileText, AlertCircle, Download,
  RefreshCw, Shield, Users, MessageSquare,
  Palette, Type, BookOpen, Camera,
  Calendar, Send, Clock, ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Plus, Twitter,
  Youtube, LayoutGrid, Megaphone, Clapperboard,
  Smartphone, Info, Target, Zap, TrendingUp, CheckCircle2, CircleDot,
  Pencil, Package, Lightbulb, Wand2, Compass,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { getTemplatesForFormat, getTemplateById, registerTemplate } from "./templates";
import type { TemplateDefinition } from "./templates/types";
import { TemplateEngine } from "./TemplateEngine";
import { SVGTemplateEngine } from "./SVGTemplateEngine";
import { HTMLTemplateEngine } from "./HTMLTemplateEngine";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateGallery } from "./TemplateGallery";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface BrandVault {
  brandName?: string;
  logoUrl?: string;
  logo_url?: string;
  logoStoragePath?: string;
  logo_path?: string;
  approvedTerms?: string[];
  forbiddenTerms?: string[];
  keyMessages?: string[];
  sections?: { title: string; score: number; items: { label: string; value: string }[] }[];
}

interface FormatOption {
  id: string;
  label: string;
  platform: string;
  icon: any;
  type: "image" | "text" | "video";
  aspectRatio: string;
  description: string;
}

interface CarouselSlide {
  text: string;
  imageUrl?: string;
  imagePrompt?: string;
  status?: "pending" | "generating" | "ready" | "error";
}

interface AssetVariant {
  model: string;
  modelLabel: string;
  // Text variant fields
  copy?: string;
  caption?: string;
  headline?: string;
  subject?: string;
  ctaText?: string;
  hashtags?: string;
  features?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
  carouselSlides?: CarouselSlide[];
  // Image variant fields
  imageUrl?: string;
  // Video variant fields
  videoUrl?: string;
  // Status
  status: "pending" | "generating" | "ready" | "error";
  error?: string;
}

interface GeneratedAsset {
  id: string;
  formatId: string;
  label: string;
  platform: string;
  type: "image" | "text" | "video";
  status: "pending" | "generating" | "ready" | "error";
  imageUrl?: string;
  videoUrl?: string;

  copy?: string;
  caption?: string;
  hashtags?: string;
  error?: string;
  model?: string;
  subject?: string;
  headline?: string;
  ctaText?: string;
  features?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
  metaDescription?: string;
  carouselSlides?: CarouselSlide[];

  // Multi-model variants
  variants?: AssetVariant[];
  selectedVariant?: number; // index into variants[]
}

interface CampaignLabProps {
  onAssetComplete?: (asset: any) => void;
  onSaveAssetToLibrary?: (asset: any) => void;
  initialProductId?: string | null;
}

/* ═══════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════ */

const FORMAT_OPTIONS: FormatOption[] = [
  // ── LinkedIn ──
  { id: "linkedin-post", label: "LinkedIn Post", platform: "LinkedIn", icon: Linkedin, type: "image", aspectRatio: "1.91:1", description: "1200x628 + caption" },
  { id: "linkedin-carousel", label: "LinkedIn Carousel", platform: "LinkedIn", icon: LayoutGrid, type: "image", aspectRatio: "1:1", description: "1080x1080 multi-slide" },
  { id: "linkedin-video", label: "LinkedIn Video", platform: "LinkedIn", icon: Film, type: "video", aspectRatio: "16:9", description: "1920x1080 video" },
  { id: "linkedin-text", label: "LinkedIn Text Post", platform: "LinkedIn", icon: FileText, type: "text", aspectRatio: "3:2", description: "Text-only thought leadership" },
  // ── Instagram ──
  { id: "instagram-post", label: "Instagram Post", platform: "Instagram", icon: Instagram, type: "image", aspectRatio: "1:1", description: "1080x1080 + caption" },
  { id: "instagram-carousel", label: "Instagram Carousel", platform: "Instagram", icon: LayoutGrid, type: "image", aspectRatio: "1:1", description: "1080x1080 multi-slide" },
  { id: "instagram-story", label: "Instagram Story", platform: "Instagram", icon: Smartphone, type: "image", aspectRatio: "9:16", description: "1080x1920 vertical" },
  { id: "instagram-reel", label: "Instagram Reel", platform: "Instagram", icon: Film, type: "video", aspectRatio: "9:16", description: "1080x1920 video" },
  // ── Facebook ──
  { id: "facebook-post", label: "Facebook Post", platform: "Facebook", icon: Facebook, type: "image", aspectRatio: "1:1", description: "1200x1200 + caption" },
  { id: "facebook-story", label: "Facebook Story", platform: "Facebook", icon: Smartphone, type: "image", aspectRatio: "9:16", description: "1080x1920 vertical" },
  { id: "facebook-video", label: "Facebook Video", platform: "Facebook", icon: Film, type: "video", aspectRatio: "16:9", description: "1920x1080 video" },
  { id: "facebook-ad", label: "Facebook Ad", platform: "Facebook", icon: Megaphone, type: "image", aspectRatio: "1.91:1", description: "1200x628 ad creative" },
  // ── TikTok ──
  { id: "tiktok-video", label: "TikTok Video", platform: "TikTok", icon: Clapperboard, type: "video", aspectRatio: "9:16", description: "1080x1920 short video" },
  { id: "tiktok-image", label: "TikTok Photo", platform: "TikTok", icon: ImageIcon, type: "image", aspectRatio: "9:16", description: "1080x1920 photo post" },
  // ── Twitter/X ──
  { id: "twitter-post", label: "X Post", platform: "Twitter/X", icon: Twitter, type: "image", aspectRatio: "16:9", description: "1600x900 + tweet" },
  { id: "twitter-text", label: "X Thread", platform: "Twitter/X", icon: FileText, type: "text", aspectRatio: "3:2", description: "Multi-tweet thread" },
  // ── YouTube ──
  { id: "youtube-thumbnail", label: "YouTube Thumbnail", platform: "YouTube", icon: Youtube, type: "image", aspectRatio: "16:9", description: "1280x720 thumbnail" },
  { id: "youtube-short", label: "YouTube Short", platform: "YouTube", icon: Film, type: "video", aspectRatio: "9:16", description: "1080x1920 short video" },
  // ── Pinterest ──
  { id: "pinterest-pin", label: "Pinterest Pin", platform: "Pinterest", icon: ImageIcon, type: "image", aspectRatio: "2:3", description: "1000x1500 pin" },
  // ── Blog / Articles ──
  { id: "blog-article", label: "Blog Article (SEO)", platform: "Web", icon: BookOpen, type: "text", aspectRatio: "3:2", description: "Full SEO article 800-1500 words" },
  { id: "linkedin-article", label: "LinkedIn Article", platform: "LinkedIn", icon: BookOpen, type: "text", aspectRatio: "3:2", description: "Long-form LinkedIn article 600-1200 words" },
];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#666666", LinkedIn: "#666666", Facebook: "#666666",
  "Twitter/X": "#666666", TikTok: "#666666", YouTube: "#666666",
  Pinterest: "#666666", Web: "#666666",
};

/* ── Per-format diversity suffixes to avoid visual repetition across formats ── */
const FORMAT_DIVERSITY: Record<string, string> = {
  "linkedin-post": "Wide landscape composition, professional corporate environment, cool neutral tones, clean negative space on right third.",
  "linkedin-carousel": "Square crop centered subject, editorial grid feel, muted desaturated palette, structured layout.",
  "linkedin-video": "Smooth dolly-in motion, boardroom or modern workspace setting, natural window light.",
  "instagram-post": "Square crop, vibrant warm tones, lifestyle context, soft bokeh background, golden-hour warmth.",
  "instagram-carousel": "Square crop, alternating close-up and wide establishing shots, cohesive color story across slides.",
  "instagram-story": "Vertical 9:16 framing, dramatic top-to-bottom composition, bold saturated colors, dynamic angle.",
  "instagram-reel": "Vertical 9:16 cinematic motion, energetic camera movement, trendy visual transitions.",
  "facebook-post": "Square social-friendly crop, bright daylight tones, approachable and relatable context.",
  "facebook-story": "Vertical 9:16, casual authentic feel, warm ambient lighting, lifestyle context.",
  "facebook-video": "Wide 16:9 cinematic, smooth pan or reveal, warm community-oriented setting.",
  "facebook-ad": "Wide landscape 1.91:1, high-contrast hero shot, clean background, product front-and-center with CTA space.",
  "tiktok-video": "Vertical 9:16 fast-paced energy, trendy Gen-Z aesthetic, bold colors, dynamic quick cuts.",
  "tiktok-image": "Vertical 9:16 eye-catching, bold typography-friendly layout, bright punchy colors.",
  "twitter-post": "Wide 16:9, punchy editorial composition, high contrast, newsworthy visual impact.",
  "twitter-text": "",
  "youtube-thumbnail": "Wide 16:9, dramatic lighting with high contrast, expressive close-up or bold product hero, click-worthy composition.",
  "youtube-short": "Vertical 9:16, fast-reveal cinematic motion, dramatic lighting, attention-grabbing first frame.",
  "pinterest-pin": "Tall 2:3 portrait, aspirational lifestyle flat-lay or styled vignette, soft natural palette, Pinterest-aesthetic.",
  "blog-article": "",
  "linkedin-article": "",
};

// Maps ORA platform names → Zernio API platform slugs (frontend side)
const ZERNIO_PLATFORM_MAP_FE: Record<string, string> = {
  LinkedIn: "linkedin", Instagram: "instagram", Facebook: "facebook",
  "Twitter/X": "twitter", Twitter: "twitter", TikTok: "tiktok",
  YouTube: "youtube", Pinterest: "pinterest",
};

// Group formats by platform for UI display
const PLATFORM_GROUPS = [
  { platform: "LinkedIn", icon: Linkedin },
  { platform: "Instagram", icon: Instagram },
  { platform: "Facebook", icon: Facebook },
  { platform: "TikTok", icon: Clapperboard },
  { platform: "Twitter/X", icon: Twitter },
  { platform: "YouTube", icon: Youtube },
  { platform: "Pinterest", icon: ImageIcon },
  { platform: "Web", icon: BookOpen },
];

// Platforms available for social connection
const CONNECTABLE_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#666666" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#666666" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#666666" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, color: "#666666" },
  { id: "tiktok", label: "TikTok", icon: Clapperboard, color: "#666666" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#666666" },
  { id: "pinterest", label: "Pinterest", icon: ImageIcon, color: "#666666" },
];

/* ── AI Model Options ── */
const TEXT_MODELS = [
  { id: "gpt-4o",                    label: "GPT-4o",          badge: "Fast",       color: "#666666" },
  { id: "gpt-4.1",                   label: "GPT-4.1",         badge: "Smart",      color: "#666666" },
  { id: "claude-sonnet-4-20250514",  label: "Claude Sonnet",   badge: "Creative",   color: "#888888" },
  { id: "claude-haiku-4-20250514",   label: "Claude Haiku",    badge: "Ultra Fast", color: "#888888" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", badge: "Multimodal", color: "#666666" },
];
const IMAGE_MODELS = [
  { id: "photon-1",        label: "Luma Photon",       badge: "Quality",    color: "#666666" },
  { id: "photon-flash-1",  label: "Luma Photon Flash", badge: "Fast",       color: "#666666" },
  { id: "flux-pro-v1.1",   label: "Flux Pro",          badge: "Creative",   color: "#999999" },
  { id: "flux-schnell",    label: "Flux Schnell",      badge: "Ultra Fast", color: "#999999" },
  { id: "dall-e-3",        label: "DALL-E 3",          badge: "Precise",    color: "#666666" },
];
const VIDEO_MODELS = [
  { id: "ray-flash-2", label: "Ray Flash 2",  badge: "Fast · $0.08",    color: "#666666" },
  { id: "ray-2",       label: "Ray 2",        badge: "Premium · $0.15", color: "#666666" },
  { id: "kling-v2.1",  label: "Kling v2.1",  badge: "Alt",             color: "#666666" },
  { id: "seedance-v1", label: "SeedAnce v1",  badge: "Alt",             color: "#666666" },
];

const VAULT_PILLS = [
  { key: "tone", label: "Tone", icon: MessageSquare },
  { key: "vocabulary", label: "Vocabulary", icon: Type },
  { key: "guardrails", label: "Guardrails", icon: Shield },
  { key: "logo", label: "Logo", icon: BookOpen },
  { key: "colors", label: "Colors", icon: Palette },
  { key: "photoStyle", label: "Photo Style", icon: Camera },
];

/* ═══════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════ */

export function CampaignLab({ onAssetComplete, onSaveAssetToLibrary, initialProductId }: CampaignLabProps) {
  const auth = useAuth();
  const getAuthToken = useCallback(() => auth.getAuthHeader(), [auth]);

  // ── POST helper: text/plain Content-Type avoids CORS preflight ──
  // Authorization header triggers preflight → Supabase gateway blocks OPTIONS
  // Solution: text/plain + Authorization (simple content-type reduces preflight triggers)
  // If still blocked, the server Deno.serve wrapper guarantees CORS headers on all responses
  const serverPost = useCallback((path: string, bodyData: any, timeoutMs?: number) => {
    const token = getAuthToken();
    const payload = token ? { ...bodyData, _token: token } : bodyData;
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    }).then(res => res.json());
  }, [getAuthToken]);

  // ── GET-like helper — uses POST with _token in body because JWT is >8KB (too large for URL or header) ──
  const serverGet = useCallback((path: string, timeoutMs?: number) => {
    const token = getAuthToken();
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ _token: token }),
      signal: AbortSignal.timeout(timeoutMs || 15_000),
    }).then(r => r.json());
  }, [getAuthToken]);

  // ── Form state ──
  const [refPhotos, setRefPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [productUrls, setProductUrls] = useState("");
  const [brief, setBrief] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [toneOverride, setToneOverride] = useState("");
  const [keyMessages, setKeyMessages] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [contentAngle, setContentAngle] = useState("");
  const [language, setLanguage] = useState("auto");
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignDuration, setCampaignDuration] = useState("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["linkedin-post", "instagram-post", "instagram-story", "facebook-post", "instagram-reel", "linkedin-video"]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scanningUrl, setScanningUrl] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{ name: string; description: string; price?: string; currency?: string; category?: string; features?: string[] } | null>(null);
  const [vault, setVault] = useState<BrandVault | null>(null);
  const [vaultLoading, setVaultLoading] = useState(true);

  // ── Generation state ──
  const [phase, setPhase] = useState<"input" | "generating" | "results">("input");
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showLogoOverlay, setShowLogoOverlay] = useState(false);
  const [retryingTexts, setRetryingTexts] = useState(false);
  const [repromptText, setRepromptText] = useState("");
  const [regeneratingAsset, setRegeneratingAsset] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignSavedId, setCampaignSavedId] = useState<string | null>(null); // tracks auto-saved campaign ID

  // ── Model selection ──
  const [textModel, setTextModel] = useState("gpt-4o");
  const [imageModel, setImageModel] = useState("photon-1");
  const [videoModel, setVideoModel] = useState("ray-flash-2");

  // ── Multi-model variants (aggregator mode) ──
  const [multiModelEnabled, setMultiModelEnabled] = useState(true);
  const [textModelsSelected, setTextModelsSelected] = useState<string[]>(["gpt-4o", "claude-sonnet-4-20250514"]);
  const [imageModelsSelected, setImageModelsSelected] = useState<string[]>(["photon-1", "flux-pro-v1.1"]);

  // ── Brand Engine: Territories ──
  const [territories, setTerritories] = useState<{ id: string; name: string; description: string; angle: string; emotion: string; example_prompts: string[]; best_for: string[] }[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<typeof territories[number] | null>(null);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);

  // ── Template state ──
  const [assetTemplates, setAssetTemplates] = useState<Record<string, string>>({});
  const [editorAsset, setEditorAsset] = useState<GeneratedAsset | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFormatId, setGalleryFormatId] = useState("");

  // ── Calendar + Deploy state ──
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarGenerated, setCalendarGenerated] = useState(false);
  const [deployingAssets, setDeployingAssets] = useState<Record<string, "deploying" | "deployed" | "scheduled" | "skipped" | "error">>({});
  const [deployingAll, setDeployingAll] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState(new Date().getMonth());
  const [calendarViewYear, setCalendarViewYear] = useState(new Date().getFullYear());
  const [zernioAccounts, setZernioAccounts] = useState<any[]>([]);
  const [zernioLoading, setZernioLoading] = useState(false);
  const zernioLoadedRef = useRef(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // ── Product state ──
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const productsLoadedRef = useRef(false);

  // ── Topic suggestions state ──
  const [topicSuggestions, setTopicSuggestions] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [topicsUpcoming, setTopicsUpcoming] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const vaultLoadedRef = useRef(false);

  // Resolved brand logo URL (only shown if toggle is on)
  const rawLogoUrl = logoUrl || vault?.logoUrl || vault?.logo_url || null;
  const brandLogoUrl = showLogoOverlay ? rawLogoUrl : null;

  // ── Fetch Brand Vault on mount via POST /user/init (single call, avoids CORS rate-limit) ──
  useEffect(() => {
    const token = getAuthToken();
    if (!token || vaultLoadedRef.current) return;
    vaultLoadedRef.current = true;
    console.log("[CampaignLab] Loading vault...");
    // Fire-and-forget health check (same pattern as Hub)
    fetch(`${API_BASE}/health`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(5_000),
    }).then(r => r.json()).then(d => console.log("[CampaignLab] Server health:", d)).catch(() => {});

    const fetchVault = async (attempt: number) => {
      try {
        // POST with _token in body — JWT is >8KB, too large for URL query or HTTP header
        const res = await fetch(`${API_BASE}/user/init`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ _token: token }),
          signal: AbortSignal.timeout(15_000),
        });
        const data = await res.json();
        if (data.vault) {
          // Sync: VaultPage uses company_name, CampaignLab uses brandName — ensure both exist
          if (data.vault.company_name && !data.vault.brandName) data.vault.brandName = data.vault.company_name;
          if (data.vault.brandName && !data.vault.company_name) data.vault.company_name = data.vault.brandName;
          // If both exist but differ, company_name wins (it's what VaultPage writes)
          if (data.vault.company_name && data.vault.brandName && data.vault.company_name !== data.vault.brandName) {
            data.vault.brandName = data.vault.company_name;
          }
          const vaultLogo = data.vault.logoUrl || data.vault.logo_url || null;
          console.log(`[CampaignLab] Vault loaded (attempt ${attempt}):`, data.vault.brandName || "unnamed", "logo:", vaultLogo ? vaultLogo.slice(0, 80) : "NONE");
          setVault(data.vault);
          if (vaultLogo) setLogoUrl(vaultLogo);
        } else {
          console.log("[CampaignLab] No vault found");
        }
      } catch (err) {
        console.error(`[CampaignLab] Vault fetch error (attempt ${attempt}):`, err);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 3000));
          return fetchVault(attempt + 1);
        }
      }
    };
    fetchVault(1).finally(() => setVaultLoading(false));
  }, [getAuthToken]);

  // ── Brand Engine: load cached narrative territories ──
  useEffect(() => {
    serverPost("/vault/load", {}).then(vaultRes => {
      const cached = vaultRes?.vault?.narrative_territories;
      if (cached && Array.isArray(cached) && cached.length > 0) setTerritories(cached);
    }).catch(() => {});
  }, [serverPost]);

  const loadTerritories = useCallback(async () => {
    setTerritoriesLoading(true);
    try {
      const res = await serverPost("/brand-engine/territories", {});
      if (res?.success && res.territories) setTerritories(res.territories);
    } catch (e) { console.warn("[CampaignLab] Territories load failed:", e); }
    setTerritoriesLoading(false);
  }, [serverPost]);

  // ── Select a product: auto-fill brief + add product images as ref photos ──
  const handleSelectProduct = useCallback((product: any) => {
    setSelectedProduct(product);
    // Auto-fill brief with product info
    const parts: string[] = [];
    if (product.name) parts.push(`Product: ${product.name}`);
    if (product.description) parts.push(product.description);
    if (product.features?.length) parts.push(`Key features: ${product.features.join(", ")}`);
    if (product.price) parts.push(`Price: ${product.price} ${product.currency || "EUR"}`);
    if (product.category) parts.push(`Category: ${product.category}`);
    setBrief(parts.join("\n"));
    if (product.url) setProductUrls(product.url);
    // Add product images as ref photos
    if (product.images?.length > 0) {
      const imagePhotos = product.images
        .filter((img: any) => img.signedUrl)
        .slice(0, 10)
        .map((img: any) => ({ file: null as any, preview: img.signedUrl }));
      setRefPhotos(imagePhotos);
    }
    toast.success(`Product "${product.name}" loaded`);
  }, []);

  // ── Load products on mount ──
  useEffect(() => {
    const token = getAuthToken();
    if (!token || productsLoadedRef.current) return;
    productsLoadedRef.current = true;
    setProductsLoading(true);
    serverGet("/products/list")
      .then((data: any) => {
        if (data.success && data.products) {
          setProducts(data.products);
          // Auto-select product if initialProductId is provided
          if (initialProductId) {
            const match = data.products.find((p: any) => p.id === initialProductId);
            if (match) handleSelectProduct(match);
          }
        }
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, [getAuthToken, serverGet, handleSelectProduct, initialProductId]);

  // ── Photo upload handlers (client-side only — used as visual ref in UI) ──
  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).slice(0, 10 - refPhotos.length);
    const newPhotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setRefPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
  }, [refPhotos.length]);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/")).slice(0, 10 - refPhotos.length);
    const newPhotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setRefPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [refPhotos.length]);

  const removePhoto = useCallback((index: number) => {
    setRefPhotos(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  }, []);

  // ── Logo upload (uses vault/upload-logo endpoint) ──
  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      if (token) formData.append("_token", token);
      const res = await fetch(`${API_BASE}/vault/upload-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.logoUrl) {
        setLogoUrl(data.logoUrl);
        toast.success("Logo uploaded");
      } else {
        toast.error(data.error || "Logo upload failed");
      }
    } catch (err) {
      console.error("[CampaignLab] Logo upload error:", err);
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [getAuthToken]);

  // ── Format toggle ──
  const toggleFormat = useCallback((id: string) => {
    setSelectedFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  /* ═══════════════════════════════════
     GENERATION — V2 PIPELINE (high-fidelity when refs exist, fallback to classic)
     ═══════════════════════════════════ */

  // ── Helper: Resize image to max dimension (avoids Edge Function body limit) ──
  const resizeImage = (file: File, maxDim = 2048): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size < 1_500_000) {
          resolve(file); return;
        }
        if (width > height) {
          if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        } else {
          if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
          "image/jpeg", 0.85
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  };

  // ── Upload ref photos ONE-BY-ONE (same pattern as Hub handleRefUpload) ──
  const uploadRefPhotos = async (): Promise<string[]> => {
    if (refPhotos.length === 0) return [];
    console.log(`[CampaignLab] Uploading ${refPhotos.length} ref photos...`);
    const urls: string[] = [];

    for (let i = 0; i < refPhotos.length; i++) {
      try {
        // If ref photo is a URL (from product images), use it directly
        if (!refPhotos[i].file && refPhotos[i].preview) {
          urls.push(refPhotos[i].preview);
          console.log(`[CampaignLab] Ref ${i + 1}/${refPhotos.length} using existing URL`);
          continue;
        }
        const resized = await resizeImage(refPhotos[i].file);
        const sizeKB = (resized.size / 1024).toFixed(0);
        const fd = new FormData();
        fd.append("file0", resized, refPhotos[i].file.name);
        const tok = getAuthToken();
        if (tok) fd.append("_token", tok);
        // Authorization for gateway, _token in FormData for user auth
        const res = await fetch(`${API_BASE}/campaign/upload-refs`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          body: fd,
          signal: AbortSignal.timeout(30_000),
        });
        const data = await res.json();
        if (data.success && data.refs?.length) {
          urls.push(data.refs[0].signedUrl);
          console.log(`[CampaignLab] Ref ${i + 1}/${refPhotos.length} uploaded (${sizeKB}KB)`);
        } else {
          console.warn(`[CampaignLab] Ref ${i + 1}:`, data?.error || "no refs");
        }
      } catch (err: any) {
        console.error(`[CampaignLab] Ref ${i + 1} failed:`, err?.message);
      }
    }
    console.log(`[CampaignLab] Upload: ${urls.length}/${refPhotos.length} refs ready`);
    return urls;
  };

  // ── Topic suggestion handler ──
  const handleSuggestTopics = async () => {
    setTopicsLoading(true);
    setShowTopics(true);
    try {
      const res = await serverPost("/topics/suggest", {
        productId: selectedProduct?.id || null,
        count: 8,
      }, 60_000);
      if (res.success && res.topics) {
        setTopicSuggestions(res.topics);
        setTopicsUpcoming(res.upcomingEvents || []);
      } else {
        toast.error(res.error || "Failed to suggest topics");
      }
    } catch (err: any) {
      toast.error("Topic suggestion failed");
      console.error("[topics]", err);
    } finally {
      setTopicsLoading(false);
    }
  };

  const handlePickTopic = (topic: any) => {
    const parts: string[] = [];
    if (topic.hook) parts.push(topic.hook);
    if (topic.angle) parts.push(`Angle: ${topic.angle}`);
    if (topic.why_now) parts.push(`Timing: ${topic.why_now}`);
    setBrief(parts.join("\n"));

    // Auto-select the suggested format if available
    if (topic.format) {
      const formatId = topic.format;
      if (!selectedFormats.includes(formatId)) {
        setSelectedFormats(prev => [...new Set([...prev, formatId])]);
      }
    }

    // If topic targets a product, select it
    if (topic.product && products.length > 0) {
      const match = products.find((p: any) =>
        p.name?.toLowerCase().includes(topic.product.toLowerCase()) ||
        topic.product.toLowerCase().includes(p.name?.toLowerCase())
      );
      if (match) setSelectedProduct(match);
    }

    setShowTopics(false);
    toast.success("Topic applied!");
  };

  // ── Helper: Scan product/service URL → extract info and pre-fill brief ──
  const handleScanUrl = async (url?: string) => {
    const targetUrl = (url || productUrls || "").trim();
    if (!targetUrl) return;
    // Basic URL validation
    if (!/^https?:\/\/.+\..+/.test(targetUrl)) {
      toast.error("Enter a valid URL (https://...)");
      return;
    }
    setScanningUrl(true);
    try {
      console.log(`[CampaignLab] Scanning URL: ${targetUrl}`);
      const data = await serverPost("/products/scrape-url", { url: targetUrl }, 20_000);
      if (data.success && data.product) {
        const p = data.product;
        setScannedProduct(p);
        console.log(`[CampaignLab] URL scanned: name="${p.name}", features=${p.features?.length}`);

        // Auto-fill brief if empty
        if (!brief.trim() && p.name) {
          const parts: string[] = [];
          parts.push(`Promote ${p.name}.`);
          if (p.description) parts.push(p.description);
          if (p.price && p.currency) parts.push(`Price: ${p.price} ${p.currency}.`);
          setBrief(parts.join(" "));
        }

        // Auto-fill key messages from features
        if (!keyMessages.trim() && p.features?.length) {
          setKeyMessages(p.features.map((f: string) => `- ${f}`).join("\n"));
        }

        toast.success(`${p.name || "Page"} scanned — brief pre-filled`);
      } else {
        toast.error("Could not extract info from this page");
      }
    } catch (err: any) {
      console.warn("[CampaignLab] URL scan failed:", err?.message);
      toast.error("Scan failed — check the URL");
    } finally {
      setScanningUrl(false);
    }
  };

  // ── Helper: Vision Analysis of ref photos → Visual DNA ──
  const analyzeRefs = async (imageUrls: string[]): Promise<any | null> => {
    if (imageUrls.length === 0) return null;
    // Send max 3 images to avoid timeout
    const urls = imageUrls.slice(0, 3);
    console.log(`[CampaignLab] Analyzing ${urls.length} ref images (Vision)...`);
    try {
      const data = await serverPost("/campaign/analyze-refs", {
        imageUrls: urls,
        brief: brief.slice(0, 500),
        targetAudience: targetAudience.slice(0, 200),
        campaignObjective: campaignObjective?.slice(0, 300) || "",
        toneOverride: toneOverride?.slice(0, 300) || "",
        contentAngle: contentAngle?.slice(0, 500) || "",
        keyMessages: keyMessages?.slice(0, 800) || "",
        callToAction: ctaText?.slice(0, 300) || "",
      }, 30_000);
      if (data.success && data.visualDNA) {
        console.log("[CampaignLab] Visual DNA extracted:", Object.keys(data.visualDNA));
        return data.visualDNA;
      }
      console.warn("[CampaignLab] Vision analysis no DNA:", data.reason || "unknown");
      return null;
    } catch (err: any) {
      console.warn("[CampaignLab] Vision analysis failed:", err?.message);
      return null;
    }
  };

  // ── Helper: Build enriched prompt from Visual DNA ──
  const buildEnrichedPrompt = async (visualDNA: any, platform: string, formatType: string): Promise<string | null> => {
    try {
      const data = await serverPost("/campaign/build-prompt", {
        visualDNA,
        brief: brief.slice(0, 500),
        platform,
        formatType,
        targetAudience: targetAudience.slice(0, 200),
        campaignObjective: campaignObjective?.slice(0, 300) || "",
        toneOverride: toneOverride?.slice(0, 300) || "",
        contentAngle: contentAngle?.slice(0, 500) || "",
        keyMessages: keyMessages?.slice(0, 800) || "",
        callToAction: ctaText?.slice(0, 300) || "",
        language: language || "",
      }, 10_000);
      return data.success ? data.prompt : null;
    } catch { return null; }
  };

  // ── Helper: detect carousel format IDs ──
  const isCarouselFormat = (formatId: string) => formatId.includes("carousel");

  // ── Helper: parse carousel slides from caption text ──
  const parseCarouselSlides = (text: string): CarouselSlide[] => {
    if (!text) return [];
    // Try to split by "Slide N:" patterns
    const slidePattern = /Slide\s*\d+\s*[:.\-]\s*/gi;
    const parts = text.split(slidePattern).filter(s => s.trim());
    if (parts.length >= 3) return parts.map(t => ({ text: t.trim(), status: "pending" as const }));
    // Fallback: split by numbered lines "1." "2." etc.
    const numPattern = /^\d+[.)]\s*/gm;
    const numParts = text.split(numPattern).filter(s => s.trim());
    if (numParts.length >= 3) return numParts.map(t => ({ text: t.trim(), status: "pending" as const }));
    // Fallback: split by double newlines
    const nlParts = text.split(/\n\n+/).filter(s => s.trim());
    if (nlParts.length >= 3) return nlParts.map(t => ({ text: t.trim(), status: "pending" as const }));
    // Last resort: treat entire text as one slide
    return [{ text: text.trim(), status: "pending" as const }];
  };

  // ── Photorealistic suffix for all campaign image prompts ──
  // V2 pipeline uses FAL Flux img2img at strength=0.85 — generates COMPLETELY NEW scenes from the brief.
  // The ref image seeds the product shape/colors (15% preserved), prompt drives the new scene.
  const REALISM_SUFFIX = ". Photorealistic commercial photography, natural lighting. No text overlay, no watermark.";

  // ── Helper: Generate image via GET routes (CORS-safe, no preflight issues) ──
  // Uses /generate/image-ref-via-get with FAL Flux img2img (strength=0.85, preserveContent) when refs exist.
  // Falls back to /generate/image-via-get when no ref.
  const generateImageViaHub = async (prompt: string, aspectRatio: string, imageRefUrl: string | null, models: string[] = ["photon-1"]): Promise<{ imageUrl: string; index: number }[]> => {
    try {
      const realisticPrompt = prompt + REALISM_SUFFIX;
      if (imageRefUrl && !imageRefUrl.startsWith("data:")) {
        // ── GET route with image ref — FAL Flux img2img (strength=0.25, preserveContent) ──
        const encodedPrompt = encodeURIComponent(realisticPrompt.slice(0, 400));
        const encodedRef = encodeURIComponent(imageRefUrl);
        const url = `${API_BASE}/generate/image-ref-via-get?prompt=${encodedPrompt}&models=${encodeURIComponent("photon-1")}&imageRefUrl=${encodedRef}&strength=0.80&mode=content&aspectRatio=${encodeURIComponent(aspectRatio)}`;
        console.log(`[CampaignLab] Image GET+ref: ar=${aspectRatio}, strength=0.80 (FAL img2img — new scene + brand name in prompt), ref=${imageRefUrl.slice(0, 60)}`);
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(140_000),
        });
        const data = await res.json();
        if (data.success && data.results) {
          const ok = data.results
            .filter((r: any) => r.success && r.result?.imageUrl)
            .map((r: any, i: number) => ({ imageUrl: r.result.imageUrl, index: i }));
          if (ok.length > 0) return ok;
        }
        console.warn("[CampaignLab] GET+ref returned no images");
      }
      // No ref OR ref was base64 (can't pass in URL) → standard generation
      const encodedPrompt = encodeURIComponent(realisticPrompt.slice(0, 600));
      const url = `${API_BASE}/generate/image-via-get?prompt=${encodedPrompt}&models=${encodeURIComponent(models[0] || imageModel)}&aspectRatio=${encodeURIComponent(aspectRatio)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(180_000),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.success && data.results[0].result.imageUrl) {
        return [{ imageUrl: data.results[0].result.imageUrl, index: 0 }];
      }
      return [];
    } catch (err: any) {
      console.error("[CampaignLab] Image generation failed:", err?.message);
      return [];
    }
  };

  // ── Helper: Select best image via Vision scoring ──
  const selectBestImage = async (referenceUrl: string, candidateUrls: string[]): Promise<number> => {
    if (candidateUrls.length <= 1) return 0;
    try {
      const data = await serverPost("/campaign/select-best", {
        referenceUrl, candidateUrls,
      }, 25_000);
      if (data.success && typeof data.bestIndex === "number") {
        console.log(`[CampaignLab] Vision selected best=${data.bestIndex}, scores=${JSON.stringify(data.scores?.map((s: any) => s.total))}`);
        return data.bestIndex;
      }
      return 0;
    } catch { return 0; }
  };

  // ── Generate text copy via POST (no URL length limit) ──
  const generateCopyWithModel = async (formats: FormatOption[], briefShort: string, urlsShort: string, model: string): Promise<Record<string, any>> => {
    try {
      const formatIds = formats.map(f => f.id).join(",");
      const postBody = {
        brief: briefShort.slice(0, 2000),
        targetAudience: targetAudience.slice(0, 300),
        productUrls: urlsShort.slice(0, 500),
        formats: formatIds,
        campaignObjective: campaignObjective || "",
        toneOfVoice: toneOverride || "",
        contentAngle: contentAngle.trim().slice(0, 500),
        keyMessages: keyMessages.trim().slice(0, 800),
        callToAction: ctaText.trim().slice(0, 300),
        language: language || "auto",
        campaignStartDate: campaignStartDate || "",
        campaignDuration: campaignDuration || "",
        model,
      };
      const url = `${API_BASE}/campaign/generate-texts`;
      const token = getAuthToken();
      const fullBody = { ...postBody, _token: token || undefined };
      console.log(`[CampaignLab] POST texts [${model}]: ${formats.length} formats, brief=${briefShort.length}c`);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(fullBody),
        signal: AbortSignal.timeout(120_000),
      });
      const rawText = await res.text();
      console.log(`[CampaignLab] Text [${model}]: HTTP ${res.status}, ${rawText.length}c`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 200)}`);
      const data = JSON.parse(rawText);
      if (data.success && data.copyMap && Object.keys(data.copyMap).length > 0) {
        console.log(`[CampaignLab] Text OK [${model}]: ${data.formatCount} formats, ${data.latencyMs}ms`);
        return data.copyMap;
      }
      console.warn(`[CampaignLab] Text [${model}] returned empty copyMap`);
    } catch (err: any) {
      console.error(`[CampaignLab] Text [${model}] FAILED:`, err?.message);
    }
    return {};
  };

  // ── Multi-model text generation (aggregator) ──
  const generateCopy = async (formats: FormatOption[], briefShort: string, urlsShort: string): Promise<{ primary: Record<string, any>; allVariants: { model: string; copyMap: Record<string, any> }[] }> => {
    const models = multiModelEnabled && textModelsSelected.length > 1
      ? textModelsSelected
      : [textModel];

    console.log(`[CampaignLab] Generating text with ${models.length} model(s): ${models.join(", ")}`);
    const results = await Promise.all(
      models.map(async (m) => ({
        model: m,
        copyMap: await generateCopyWithModel(formats, briefShort, urlsShort, m),
      }))
    );

    // Primary = first model with non-empty results, or first overall
    const primary = results.find(r => Object.keys(r.copyMap).length > 0)?.copyMap || {};
    return { primary, allVariants: results };
  };

  // ── Helper: Classic image generation (fallback — same as before) ──
  const generateImageClassic = async (fmt: FormatOption, imgPrompt: string) => {
    const arMap: Record<string, string> = { "1:1": "1:1", "1.91:1": "16:9", "9:16": "9:16", "16:9": "16:9" };
    const ar = arMap[fmt.aspectRatio] || "1:1";
    const encodedPrompt = encodeURIComponent(imgPrompt.slice(0, 400));
    const imageGetUrl = `${API_BASE}/generate/image-via-get?prompt=${encodedPrompt}&models=${encodeURIComponent(imageModel)}&aspectRatio=${ar}`;
    console.log(`[CampaignLab] Image GET [${fmt.id}]:`, imageGetUrl.slice(0, 150));
    const res = await fetch(imageGetUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(180_000),
    });
    const rawText = await res.text();
    const data = JSON.parse(rawText);
    if (data.success && data.results?.[0]?.success && data.results[0].result.imageUrl) {
      return data.results[0].result.imageUrl;
    }
    throw new Error(data.results?.[0]?.error || data.error || "Image generation failed");
  };

  // ── Helper: Video generation with optional first-frame image ──
  const generateVideoWithKeyframe = async (fmt: FormatOption, vidPrompt: string, keyframeImageUrl?: string) => {
    const params = new URLSearchParams({ prompt: vidPrompt.slice(0, 400), model: videoModel });
    if (keyframeImageUrl) params.set("imageUrl", keyframeImageUrl);
    const startUrl = `${API_BASE}/generate/video-start?${params.toString()}`;
    console.log(`[CampaignLab] Video START [${fmt.id}]: hasKeyframe=${!!keyframeImageUrl}`, startUrl.slice(0, 150));

    const startRes = await fetch(startUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    const startData = JSON.parse(await startRes.text());
    if (!startData.success || !startData.generationId) throw new Error(startData.error || "Failed to start video");

    const generationId = startData.generationId;
    console.log(`[CampaignLab] Video [${fmt.id}] submitted:`, generationId);

    // Poll
    const MAX_POLLS = 60;
    for (let poll = 0; poll < MAX_POLLS; poll++) {
      await new Promise(r => setTimeout(r, 5_000));
      try {
        const statusUrl = `${API_BASE}/generate/video-status?id=${encodeURIComponent(generationId)}`;
        const statusRes = await fetch(statusUrl, { method: "GET", headers: { Authorization: `Bearer ${publicAnonKey}` }, signal: AbortSignal.timeout(10_000) });
        const statusData = JSON.parse(await statusRes.text());
        console.log(`[CampaignLab] Video [${fmt.id}] poll #${poll + 1}: state=${statusData.state || statusData.status}`);
        if ((statusData.state === "completed" || statusData.status === "completed") && statusData.videoUrl) {
          return statusData.videoUrl;
        }
        if (statusData.state === "failed" || statusData.status === "failed") {
          throw new Error(statusData.error || "Video generation failed");
        }
      } catch (pollErr: any) {
        if (pollErr?.message?.includes("failed")) throw pollErr;
      }
    }
    throw new Error("Video timeout (300s)");
  };

  const handleGenerate = async () => {
    if (!brief.trim() && !productUrls.trim()) {
      toast.error("Add a brief or product URL to start");
      return;
    }
    if (selectedFormats.length === 0) {
      toast.error("Select at least one format");
      return;
    }

    setPhase("generating");
    setGenerationProgress(0);

    const formats = FORMAT_OPTIONS.filter(f => selectedFormats.includes(f.id));
    const placeholders: GeneratedAsset[] = formats.map(f => ({
      id: `asset-${f.id}-${Date.now()}`,
      formatId: f.id,
      label: f.label,
      platform: f.platform,
      type: f.type,
      status: "pending",
    }));
    setAssets(placeholders);

    const hasRefs = refPhotos.length > 0;
    // Compose enriched brief from all fields
    const enrichedParts: string[] = [];
    if (brief.trim()) enrichedParts.push(brief.trim());
    if (campaignObjective) enrichedParts.push(`CAMPAIGN OBJECTIVE: ${campaignObjective}`);
    if (toneOverride) enrichedParts.push(`TONE OF VOICE: ${toneOverride}`);
    if (contentAngle.trim()) enrichedParts.push(`CONTENT ANGLE / HOOK: ${contentAngle.trim()}`);
    if (keyMessages.trim()) enrichedParts.push(`KEY MESSAGES:\n${keyMessages.trim()}`);
    if (ctaText.trim()) enrichedParts.push(`CALL TO ACTION: ${ctaText.trim()}`);
    if (language !== "auto") enrichedParts.push(`LANGUAGE: ${language}`);
    if (campaignStartDate) enrichedParts.push(`CAMPAIGN START DATE: ${campaignStartDate}`);
    if (campaignDuration) enrichedParts.push(`CAMPAIGN DURATION: ${campaignDuration}`);
    let briefShort = enrichedParts.join("\n\n").slice(0, 2000);
    const urlsShort = (productUrls || "").slice(0, 300);

    // ── Brand Engine: Brief-to-Story enrichment ──
    try {
      const vaultRes = await serverPost("/vault/load", {});
      const bp = vaultRes?.vault?.brand_platform;
      if (bp) {
        const enrichRes = await serverPost("/brand-engine/enrich", {
          prompt: briefShort,
          contentType: "campaign",
          brand_platform: bp,
          territory: selectedTerritory || undefined,
        });
        if (enrichRes?.success && enrichRes.wasEnriched && enrichRes.enrichedPrompt) {
          console.log("[CampaignLab][BrandEngine] Brief enriched:", enrichRes.brief?.angle?.slice(0, 80));
          briefShort = enrichRes.enrichedPrompt.slice(0, 2000);
        }
      }
    } catch (e) {
      console.warn("[CampaignLab][BrandEngine] Enrichment skipped:", e);
    }

    try {
      // ═══ PHASE 0: Upload ref photos (if any) ═══
      let refSignedUrls: string[] = [];
      if (hasRefs) {
        setGenerationProgress(5);
        refSignedUrls = await uploadRefPhotos();
        console.log(`[CampaignLab] ${refSignedUrls.length} ref URLs obtained`);
      }

      const useV2Pipeline = refSignedUrls.length > 0;
      console.log(`[CampaignLab] Pipeline: ${useV2Pipeline ? "V2 (high-fidelity)" : "CLASSIC (text-only)"}, ${refSignedUrls.length} refs`);

      // ═══ PHASE 1: Vision Analysis + Text Copy in PARALLEL ═══
      setGenerationProgress(10);
      const [visualDNA, textResult] = await Promise.all([
        useV2Pipeline ? analyzeRefs(refSignedUrls) : Promise.resolve(null),
        generateCopy(formats, briefShort, urlsShort),
      ]);
      const copyMap = textResult.primary;
      const allTextVariants = textResult.allVariants;
      setGenerationProgress(35);

      // Build ultra-precise product description from Visual DNA for image/video prompts
      let productDescription = "";
      if (visualDNA) {
        console.log("[CampaignLab] Visual DNA keys:", Object.keys(visualDNA));
        const dna = visualDNA;
        const parts: string[] = [];
        if (dna.subject) parts.push(`SUBJECT: ${dna.subject}`);
        if (dna.distinctive_elements) parts.push(`MUST REPRODUCE: ${dna.distinctive_elements}`);
        if (dna.environment) parts.push(`Environment: ${dna.environment}`);
        if (dna.color_palette) parts.push(`Colors: ${dna.color_palette}`);
        if (dna.lighting) parts.push(`Lighting: ${dna.lighting}`);
        if (dna.texture) parts.push(`Texture: ${dna.texture}`);
        if (dna.composition) parts.push(`Composition: ${dna.composition}`);
        if (dna.photography_style) parts.push(`Style: ${dna.photography_style}`);
        if (dna.mood) parts.push(`Mood: ${dna.mood}`);
        if (dna.post_processing) parts.push(`Post-processing: ${dna.post_processing}`);
        if (parts.length === 0 && dna.raw_analysis) {
          const raw = typeof dna.raw_analysis === "string" ? dna.raw_analysis : JSON.stringify(dna.raw_analysis);
          parts.push(raw.slice(0, 600));
        }
        if (parts.length > 0) {
          productDescription = `[PRODUCT REFERENCE — reproduce EXACTLY as described, do NOT alter the product]: ${parts.join(". ")}. `;
          console.log(`[CampaignLab] Product description (${productDescription.length}c): ${productDescription.slice(0, 300)}...`);
        }
      }
      const textSuccess = Object.keys(copyMap).length > 0;
      if (!textSuccess) {
        toast.error("Text generation failed. Images will still generate.");
      }
      console.log("[CampaignLab] copyMap keys:", Object.keys(copyMap));

      // ═══ PHASE 2: Update assets with copy data + text variants ═══
      const extractCopyFields = (fc: any) => {
        const captionText = fc.caption || fc.text || fc.copy || fc.body || fc.content || fc.message || "";
        const hashtagsText = typeof fc.hashtags === "string" ? fc.hashtags : Array.isArray(fc.hashtags) ? fc.hashtags.join(" ") : "";
        return {
          caption: captionText,
          copy: captionText,
          hashtags: hashtagsText,
          subject: fc.subject || "",
          headline: fc.headline || "",
          ctaText: fc.ctaText || fc.cta || "",
          features: fc.features || [],
          imagePrompt: fc.imagePrompt || "",
          videoPrompt: fc.videoPrompt || "",
          metaDescription: fc.metaDescription || "",
        };
      };

      setAssets(prev => prev.map(a => {
        const fc = copyMap[a.formatId] || {};
        const fields = extractCopyFields(fc);
        const hasCopy = !!(fields.caption || fields.headline);

        // Parse carousel slides for carousel formats
        let carouselSlides: CarouselSlide[] | undefined;
        if (isCarouselFormat(a.formatId) && fields.caption) {
          if (Array.isArray(fc.slides) && fc.slides.length > 0) {
            carouselSlides = fc.slides.map((s: any) => ({
              text: typeof s === "string" ? s : (s.text || s.caption || ""),
              imagePrompt: s.imagePrompt || "",
              status: "pending" as const,
            }));
          } else {
            carouselSlides = parseCarouselSlides(fields.caption);
          }
          carouselSlides = carouselSlides.map((slide, idx) => ({
            ...slide,
            imagePrompt: slide.imagePrompt || `Slide ${idx + 1} for ${a.platform} carousel: ${slide.text.slice(0, 120)}. Professional brand visual matching the slide content.`,
          }));
        }

        // Build text variants from all models
        const textVariants: AssetVariant[] = allTextVariants
          .filter(v => Object.keys(v.copyMap).length > 0)
          .map(v => {
            const vfc = v.copyMap[a.formatId] || {};
            const vFields = extractCopyFields(vfc);
            const modelInfo = TEXT_MODELS.find(m => m.id === v.model);
            return {
              model: v.model,
              modelLabel: modelInfo?.label || v.model,
              ...vFields,
              status: (vFields.caption || vFields.headline) ? "ready" as const : "error" as const,
            };
          });

        return {
          ...a,
          ...fields,
          carouselSlides,
          variants: textVariants.length > 1 ? textVariants : undefined,
          selectedVariant: 0,
          status: a.type === "text"
            ? (hasCopy ? "ready" as const : "error" as const)
            : "generating" as const,
          error: (a.type === "text" && !hasCopy) ? "Text generation failed" : undefined,
        };
      }));

      // ═══ PHASE 3: IMAGE GENERATION ═══
      const imageFormats = formats.filter(f => f.type === "image");
      const generatedImageUrls: Record<string, string> = {}; // formatId → best imageUrl (for video keyframes)

      if (imageFormats.length > 0) {
        console.log(`[CampaignLab] Image generation: ${imageFormats.length} formats, v2=${useV2Pipeline}`);
        setGenerationProgress(40);

        await Promise.all(imageFormats.map(async (fmt) => {
          try {
            const fc = copyMap[fmt.id] || {};
            const arMap: Record<string, string> = { "1:1": "1:1", "1.91:1": "16:9", "9:16": "9:16", "16:9": "16:9", "2:3": "2:3" };
            const ar = arMap[fmt.aspectRatio] || "1:1";

            // ── CAROUSEL: generate one image per slide ──
            if (isCarouselFormat(fmt.id)) {
              // Build slides from copyMap directly (reliable, no state dependency)
              let currentSlides: CarouselSlide[] = [];
              const captionText = fc.caption || fc.text || fc.copy || fc.body || fc.content || fc.message || "";
              if (Array.isArray(fc.slides) && fc.slides.length > 0) {
                currentSlides = fc.slides.map((s: any, idx: number) => ({
                  text: typeof s === "string" ? s : (s.text || s.caption || ""),
                  imagePrompt: s.imagePrompt || `Slide ${idx + 1} for ${fmt.platform} carousel: ${(typeof s === "string" ? s : (s.text || "")).slice(0, 120)}. Professional brand visual.`,
                  status: "pending" as const,
                }));
              } else if (captionText) {
                currentSlides = parseCarouselSlides(captionText).map((s, idx) => ({
                  ...s,
                  imagePrompt: `Slide ${idx + 1} for ${fmt.platform} carousel: ${s.text.slice(0, 120)}. Professional brand visual matching the slide content.`,
                }));
              }
              if (currentSlides.length === 0) currentSlides = [{ text: briefShort, status: "pending" }];

              console.log(`[CampaignLab] Carousel [${fmt.id}]: ${currentSlides.length} slides to illustrate`);

              const updatedSlides = [...currentSlides];
              // Generate images for each slide (in parallel batches of 3 to not overwhelm)
              const batchSize = 3;
              for (let batchStart = 0; batchStart < updatedSlides.length; batchStart += batchSize) {
                const batch = updatedSlides.slice(batchStart, batchStart + batchSize);
                await Promise.all(batch.map(async (slide, batchIdx) => {
                  const slideIdx = batchStart + batchIdx;
                  const carouselDiversity = FORMAT_DIVERSITY[fmt.id] || "";
                  // V2: FAL img2img at 0.75 — describe a vivid NEW scene for each slide
                  const slideScene = slide.imagePrompt || `${slide.text.slice(0, 120)}. ${fmt.platform} visual.`;
                  const slideBriefCtx = contentAngle.trim() ? `Campaign context: ${contentAngle.trim().slice(0, 80)}. ` : (brief.trim() ? `Campaign: ${brief.trim().slice(0, 80)}. ` : "");
                  const slidePrompt = useV2Pipeline && refSignedUrls.length > 0
                    ? `${slideBriefCtx}${slideScene.slice(0, 200)}.${carouselDiversity ? ` ${carouselDiversity}` : ""} Photorealistic, new scene, professional lighting.`
                    : productDescription + slideScene + ` ${briefShort.slice(0, 100)}.` + (carouselDiversity ? ` ${carouselDiversity}` : "") + REALISM_SUFFIX;
                  try {
                    if (useV2Pipeline && refSignedUrls.length > 0) {
                      const refUrl = refSignedUrls[slideIdx % refSignedUrls.length];
                      const candidates = await generateImageViaHub(slidePrompt, ar, refUrl, ["photon-1"]);
                      if (candidates.length > 0) {
                        updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], imageUrl: candidates[0].imageUrl, status: "ready" };
                      } else {
                        const url = await generateImageClassic(fmt, slidePrompt);
                        updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], imageUrl: url, status: "ready" };
                      }
                    } else {
                      const url = await generateImageClassic(fmt, slidePrompt);
                      updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], imageUrl: url, status: "ready" };
                    }
                    console.log(`[CampaignLab] Carousel [${fmt.id}] slide ${slideIdx + 1}/${updatedSlides.length} OK`);
                  } catch (slideErr: any) {
                    console.error(`[CampaignLab] Carousel [${fmt.id}] slide ${slideIdx + 1} error:`, slideErr?.message);
                    updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], status: "error" };
                  }
                  // Update asset with progress
                  setAssets(prev => prev.map(a => a.formatId === fmt.id ? {
                    ...a, carouselSlides: [...updatedSlides],
                    imageUrl: updatedSlides.find(s => s.imageUrl)?.imageUrl || a.imageUrl,
                  } : a));
                }));
              }

              const allDone = updatedSlides.every(s => s.status === "ready" || s.status === "error");
              const firstImageUrl = updatedSlides.find(s => s.imageUrl)?.imageUrl;
              setAssets(prev => prev.map(a => a.formatId === fmt.id ? {
                ...a, status: allDone ? "ready" : "generating",
                carouselSlides: updatedSlides,
                imageUrl: firstImageUrl || a.imageUrl,
                model: "photon-1",
              } : a));
              if (firstImageUrl) generatedImageUrls[fmt.id] = firstImageUrl;
              console.log(`[CampaignLab] Carousel [${fmt.id}] complete: ${updatedSlides.filter(s => s.imageUrl).length}/${updatedSlides.length} slides`);
              return;
            }

            // ── SINGLE IMAGE (non-carousel) — multi-model variants ──
            const diversitySuffix = FORMAT_DIVERSITY[fmt.id] || "";
            const sceneContext = fc.imagePrompt
              ? fc.imagePrompt.trim().slice(0, 300)
              : `Product in a scene that illustrates: ${briefShort.slice(0, 200)}. ${fmt.platform} format.`;
            const briefContext = contentAngle.trim() ? `Campaign context: ${contentAngle.trim().slice(0, 100)}. ` : (brief.trim() ? `Campaign: ${brief.trim().slice(0, 100)}. ` : "");
            const finalPrompt = `${briefContext}${sceneContext}. ${diversitySuffix} Photorealistic commercial photography, new environment, professional lighting.`;

            const modelsToUse = multiModelEnabled && imageModelsSelected.length > 1
              ? imageModelsSelected : [imageModel];

            if (useV2Pipeline) {
              const fmtIdx = imageFormats.indexOf(fmt);
              const refUrl = refSignedUrls.length > 0
                ? refSignedUrls[fmtIdx % refSignedUrls.length]
                : null;

              console.log(`[CampaignLab] V2 Image [${fmt.id}]: ${modelsToUse.length} models, ref=${refUrl ? `#${(fmtIdx % refSignedUrls.length) + 1}/${refSignedUrls.length}` : "NONE"}`);

              // Generate with all selected models in parallel
              const modelResults = await Promise.all(modelsToUse.map(async (mdl) => {
                try {
                  const candidates = await generateImageViaHub(finalPrompt, ar, refUrl, [mdl]);
                  if (candidates.length > 0) {
                    return { model: mdl, imageUrl: candidates[0].imageUrl, status: "ready" as const };
                  }
                  // Fallback to classic for this model
                  const classicUrl = await generateImageClassic(fmt, finalPrompt + REALISM_SUFFIX);
                  return { model: mdl, imageUrl: classicUrl, status: "ready" as const };
                } catch (e: any) {
                  console.warn(`[CampaignLab] Image [${fmt.id}] model ${mdl} failed:`, e?.message);
                  return { model: mdl, imageUrl: "", status: "error" as const, error: e?.message };
                }
              }));

              const imageVariants: AssetVariant[] = modelResults.map(r => {
                const modelInfo = IMAGE_MODELS.find(m => m.id === r.model);
                return { model: r.model, modelLabel: modelInfo?.label || r.model, imageUrl: r.imageUrl, status: r.status };
              });
              const bestResult = modelResults.find(r => r.imageUrl) || modelResults[0];

              setAssets(prev => prev.map(a => a.formatId === fmt.id ? {
                ...a, status: "ready", imageUrl: bestResult.imageUrl, model: bestResult.model,
                variants: [
                  ...(a.variants || []),
                  ...imageVariants.filter(v => v.status === "ready"),
                ],
                selectedVariant: 0,
              } : a));
              if (bestResult.imageUrl) generatedImageUrls[fmt.id] = bestResult.imageUrl;
              console.log(`[CampaignLab] V2 Image [${fmt.id}] OK: ${modelResults.filter(r => r.imageUrl).length}/${modelsToUse.length} models`);

            } else {
              const imgPrompt = (fc.imagePrompt || `Professional ${fmt.platform} post. ${briefShort.slice(0, 120)}. Cinematic brand photography, no text.`) + (diversitySuffix ? ` ${diversitySuffix}` : "") + REALISM_SUFFIX;
              const classicUrl = await generateImageClassic(fmt, imgPrompt);
              setAssets(prev => prev.map(a =>
                a.formatId === fmt.id ? { ...a, status: "ready", imageUrl: classicUrl, model: imageModel } : a
              ));
              generatedImageUrls[fmt.id] = classicUrl;
              console.log(`[CampaignLab] Classic Image [${fmt.id}] OK:`, classicUrl.slice(0, 60));
            }
          } catch (err: any) {
            const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
            console.error(`[CampaignLab] Image [${fmt.id}] error:`, err?.message);
            setAssets(prev => prev.map(a =>
              a.formatId === fmt.id ? { ...a, status: "error", error: isTimeout ? "Timed out (180s)" : String(err?.message || err) } : a
            ));
          }
          setGenerationProgress(prev => Math.min(prev + Math.floor(40 / imageFormats.length), 90));
        }));
      }

      // ═══ PHASE 4: VIDEO GENERATION (with keyframe from best image) ═══
      const videoFormats = formats.filter(f => f.type === "video");

      // Switch to results — images + text done. Videos update live.
      setGenerationProgress(100);
      setPhase("results");

      // Auto-assign first available template per image format
      const autoTemplates: Record<string, string> = {};
      for (const fmt of formats.filter(f => f.type === "image")) {
        const tmplsForFmt = getTemplatesForFormat(fmt.id);
        if (tmplsForFmt.length > 0) {
          autoTemplates[fmt.id] = tmplsForFmt[0].id;
        }
      }
      if (Object.keys(autoTemplates).length > 0) {
        setAssetTemplates(prev => ({ ...prev, ...autoTemplates }));
      }

      toast.success(`Campaign generated: ${formats.length} assets${videoFormats.length > 0 ? ` (${videoFormats.length} videos still rendering...)` : ""}`);

      if (videoFormats.length > 0) {
        console.log(`[CampaignLab] Video generation: ${videoFormats.length} formats (background)`);
        await Promise.all(videoFormats.map(async (fmt) => {
          try {
            const fc = copyMap[fmt.id] || {};
            const vidDiversity = FORMAT_DIVERSITY[fmt.id] || "";
            const vidPrompt = productDescription + (fc.videoPrompt || fc.imagePrompt || `Cinematic video. ${briefShort.slice(0, 120)}. Smooth motion.`) + (vidDiversity ? ` ${vidDiversity}` : "");

            // ── Find best keyframe image for video: PRIORITIZE ref photos for product fidelity ──
            let keyframeUrl: string | undefined;

            // Priority 1: Use ref photo directly (best for product fidelity)
            if (refSignedUrls.length > 0) {
              const vidIdx = videoFormats.indexOf(fmt);
              keyframeUrl = refSignedUrls[vidIdx % refSignedUrls.length];
              console.log(`[CampaignLab] Video [${fmt.id}]: using ref photo #${(vidIdx % refSignedUrls.length) + 1} as keyframe (product fidelity)`);
            }

            // Priority 2: Same-platform generated image
            if (!keyframeUrl) {
              const samePlatformImage = Object.entries(generatedImageUrls).find(([fid]) => {
                const f = FORMAT_OPTIONS.find(fo => fo.id === fid);
                return f?.platform === fmt.platform;
              });
              if (samePlatformImage) {
                keyframeUrl = samePlatformImage[1];
                console.log(`[CampaignLab] Video [${fmt.id}]: using same-platform image as keyframe`);
              }
            }

            // Priority 3: Any available generated image
            if (!keyframeUrl) {
              const anyImage = Object.values(generatedImageUrls)[0];
              if (anyImage) {
                keyframeUrl = anyImage;
                console.log(`[CampaignLab] Video [${fmt.id}]: using first available image as keyframe`);
              }
            }

            const videoUrl = await generateVideoWithKeyframe(fmt, vidPrompt, keyframeUrl);
            setAssets(prev => prev.map(a =>
              a.formatId === fmt.id ? { ...a, status: "ready", videoUrl, model: "ray-flash-2" } : a
            ));
          } catch (err: any) {
            console.error(`[CampaignLab] Video [${fmt.id}] error:`, err?.message);
            setAssets(prev => prev.map(a =>
              a.formatId === fmt.id ? { ...a, status: "error", error: err?.message || "Video failed" } : a
            ));
          }
        }));
      }

    } catch (err: any) {
      console.error("[CampaignLab] Generation error:", err);
      toast.error(err.message || "Campaign generation failed");
      setPhase("input");
    }
  };

  // ── Save asset to library ──
  const handleSaveAsset = (asset: GeneratedAsset) => {
    if (!onSaveAssetToLibrary) return;
    onSaveAssetToLibrary({
      id: asset.id,
      type: asset.type,
      imageUrl: asset.imageUrl,
      videoUrl: asset.videoUrl,
      prompt: asset.copy || brief,
      model: asset.model || "gpt-4o",
      campaignTheme: brief,
      copy: asset.copy,
      caption: asset.caption,
      hashtags: asset.hashtags,
      platform: asset.platform,
      formatName: asset.label,
      subject: asset.subject,
      headline: asset.headline,
      ctaText: asset.ctaText,
      features: asset.features,
      imagePrompt: asset.imagePrompt,
      videoPrompt: asset.videoPrompt,
    });
  };

  // ── Download asset ──
  const handleDownload = async (asset: GeneratedAsset) => {
    const url = asset.imageUrl || asset.videoUrl;
    if (url) {
      // External CDN URLs (Luma, FAL, etc.) don't support CORS fetch — open in new tab
      // For Supabase-hosted URLs, try blob download first
      const isSupabaseUrl = url.includes("supabase.co");
      if (isSupabaseUrl) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `ora-${asset.formatId}-${Date.now()}.${asset.type === "video" ? "mp4" : "png"}`;
          a.click();
          URL.revokeObjectURL(a.href);
          return;
        } catch { /* fall through to window.open */ }
      }
      window.open(url, "_blank");
    } else if (asset.copy) {
      const blob = new Blob([`${asset.caption || ""}\n\n${asset.hashtags || ""}`], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ora-${asset.formatId}-${Date.now()}.txt`;
      a.click();
    }
  };

  // ── Retry text generation for failed text assets ──
  const retryTextGeneration = async () => {
    if (retryingTexts) return;
    setRetryingTexts(true);
    toast("Retrying text generation...");
    try {
      const textAssets = assets.filter(a => a.type === "text" || (!a.caption && !a.copy));
      const formats = textAssets
        .map(a => FORMAT_OPTIONS.find(f => f.id === a.formatId))
        .filter(Boolean) as FormatOption[];
      if (formats.length === 0) {
        // Retry all formats
        const allFmtIds = assets.map(a => a.formatId);
        formats.push(...FORMAT_OPTIONS.filter(f => allFmtIds.includes(f.id)));
      }
      const briefShort = (brief || "").slice(0, 800);
      const urlsShort = (productUrls || "").slice(0, 300);
      const copyMap = await generateCopy(formats, briefShort, urlsShort);
      const textOk = Object.keys(copyMap).length > 0;
      if (textOk) {
        setAssets(prev => prev.map(a => {
          const fc = copyMap[a.formatId] || {};
          const captionText = fc.caption || fc.text || fc.copy || fc.body || fc.content || fc.message || "";
          const hashtagsText = typeof fc.hashtags === "string" ? fc.hashtags : Array.isArray(fc.hashtags) ? fc.hashtags.join(" ") : "";
          const hasCopy = !!(captionText || fc.headline);
          if (!hasCopy && a.status === "ready" && (a.caption || a.copy)) return a; // keep existing good data
          return {
            ...a,
            caption: captionText || a.caption || "",
            copy: captionText || a.copy || "",
            hashtags: hashtagsText || a.hashtags || "",
            subject: fc.subject || a.subject || "",
            headline: fc.headline || a.headline || "",
            ctaText: fc.ctaText || fc.cta || a.ctaText || "",
            features: fc.features || a.features || [],
            imagePrompt: fc.imagePrompt || a.imagePrompt || "",
            videoPrompt: fc.videoPrompt || a.videoPrompt || "",
            metaDescription: fc.metaDescription || a.metaDescription || "",
            status: a.type === "text" ? (hasCopy ? "ready" as const : a.status) : a.status,
            error: (a.type === "text" && hasCopy) ? undefined : a.error,
          };
        }));
        toast.success(`Text generated: ${Object.keys(copyMap).length} formats`);
      } else {
        toast.error("Text generation failed again. Check console for details.");
      }
    } catch (err: any) {
      console.error("[CampaignLab] Retry text failed:", err);
      toast.error(`Retry failed: ${err?.message || "unknown error"}`);
    } finally {
      setRetryingTexts(false);
    }
  };

  // ── Regenerate a single asset with custom prompt (re-prompt) ──
  const handleRegenerateAsset = async (asset: GeneratedAsset, customPrompt: string) => {
    if (!customPrompt.trim() || regeneratingAsset) return;
    setRegeneratingAsset(asset.formatId);
    const fmt = FORMAT_OPTIONS.find(f => f.id === asset.formatId);
    if (!fmt) { setRegeneratingAsset(null); return; }
    const diversitySuffix = FORMAT_DIVERSITY[fmt.id] || "";
    const fullPrompt = customPrompt.trim() + (diversitySuffix ? ` ${diversitySuffix}` : "");

    try {
      if (asset.type === "image" || (asset.type !== "video" && asset.type !== "text")) {
        const arMap: Record<string, string> = { "1:1": "1:1", "1.91:1": "16:9", "9:16": "9:16", "16:9": "16:9", "2:3": "2:3" };
        const ar = arMap[fmt.aspectRatio] || "1:1";
        toast("Regenerating image...");
        const results = await generateImageViaHub(fullPrompt, ar, null, ["photon-1"]);
        if (results.length > 0) {
          setAssets(prev => prev.map(a => a.formatId === asset.formatId ? { ...a, imageUrl: results[0].imageUrl, imagePrompt: customPrompt } : a));
          setSelectedAsset(prev => prev && prev.formatId === asset.formatId ? { ...prev, imageUrl: results[0].imageUrl, imagePrompt: customPrompt } : prev);
          toast.success("Image regenerated");
        } else {
          const classicUrl = await generateImageClassic(fmt, fullPrompt + REALISM_SUFFIX);
          setAssets(prev => prev.map(a => a.formatId === asset.formatId ? { ...a, imageUrl: classicUrl, imagePrompt: customPrompt } : a));
          setSelectedAsset(prev => prev && prev.formatId === asset.formatId ? { ...prev, imageUrl: classicUrl, imagePrompt: customPrompt } : prev);
          toast.success("Image regenerated (fallback)");
        }
      } else if (asset.type === "video") {
        toast("Regenerating video (this may take a few minutes)...");
        const videoUrl = await generateVideoWithKeyframe(fmt, fullPrompt + ". " + diversitySuffix, undefined);
        setAssets(prev => prev.map(a => a.formatId === asset.formatId ? { ...a, videoUrl, videoPrompt: customPrompt } : a));
        setSelectedAsset(prev => prev && prev.formatId === asset.formatId ? { ...prev, videoUrl, videoPrompt: customPrompt } : prev);
        toast.success("Video regenerated");
      }
    } catch (err: any) {
      console.error("[CampaignLab] Regenerate error:", err);
      toast.error(`Regeneration failed: ${err?.message || "Unknown error"}`);
    } finally {
      setRegeneratingAsset(null);
      setRepromptText("");
    }
  };

  // ── Build campaign item for library (reused by manual save + auto-save) ──
  const buildCampaignItem = useCallback((readyAssets: GeneratedAsset[], existingId?: string) => {
    const campaignId = existingId || `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const imageAssets = readyAssets.filter(a => a.imageUrl);
    const videoAsset = readyAssets.find(a => a.videoUrl);
    const assetsList = readyAssets.map(a => ({
      formatId: a.formatId,
      label: a.label,
      platform: a.platform,
      type: a.type,
      imageUrl: a.imageUrl || "",
      videoUrl: a.videoUrl || "",
      copy: a.copy || a.caption || "",
      caption: a.caption || "",
      hashtags: a.hashtags || "",
      headline: a.headline || "",
      ctaText: a.ctaText || "",
      subject: a.subject || "",
      imagePrompt: a.imagePrompt || "",
      videoPrompt: a.videoPrompt || "",
    }));
    return {
      id: campaignId,
      type: "campaign",
      title: brief.trim().slice(0, 100) || "Untitled Campaign",
      brief: brief.trim(),
      objective: campaignObjective,
      tone: toneOverride,
      language,
      platforms: [...new Set(readyAssets.map(a => a.platform))],
      formatCount: readyAssets.length,
      thumbnail: imageAssets[0]?.imageUrl || "",
      assets: assetsList,
      createdAt: new Date().toISOString(),
      model: "multi-agent",
      prompt: brief.trim(),
      // preview field — LibraryPage reads campaign data from here
      preview: {
        kind: "campaign",
        platforms: [...new Set(readyAssets.map(a => a.platform))],
        deliverableCount: readyAssets.length,
        packshotUrl: imageAssets[0]?.imageUrl || "",
        lifestyleUrl: imageAssets[1]?.imageUrl || "",
        videoUrl: videoAsset?.videoUrl || "",
        copy: { headline: assetsList[0]?.headline || brief.trim().slice(0, 80) },
        assets: assetsList,
      },
    };
  }, [brief, campaignObjective, toneOverride, language]);

  // ── Save entire campaign to Library ──
  const handleSaveCampaign = async (silent = false) => {
    if (savingCampaign) return;
    setSavingCampaign(true);
    try {
      const readyAssets = assets.filter(a => a.status === "ready");
      if (readyAssets.length === 0) { if (!silent) toast.error("No ready assets to save"); setSavingCampaign(false); return; }
      const campaignItem = buildCampaignItem(readyAssets, campaignSavedId || undefined);
      await serverPost("/library/items", { item: campaignItem });
      setCampaignSavedId(campaignItem.id);
      if (!silent) toast.success(`Campaign saved to Library (${readyAssets.length} assets)`);
      else console.log(`[CampaignLab] Auto-saved campaign ${campaignItem.id} (${readyAssets.length} assets)`);
    } catch (err: any) {
      console.error("[CampaignLab] Save campaign error:", err);
      if (!silent) toast.error(`Save failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingCampaign(false);
    }
  };

  // ── Auto-save: save/update campaign whenever an asset becomes ready ──
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (phase !== "results") return;
    const readyCount = assets.filter(a => a.status === "ready").length;
    const pendingCount = assets.filter(a => a.status === "generating" || a.status === "pending").length;
    if (readyCount === 0) return;
    // Debounce: wait 3s after last status change, then auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      console.log(`[CampaignLab] Auto-save triggered: ${readyCount} ready, ${pendingCount} pending`);
      await handleSaveCampaign(true);
      if (pendingCount === 0) {
        toast.success(`Campagne sauvegardée dans Library (${readyCount} assets)`, {
          duration: 3000,
          action: { label: "Voir", onClick: () => window.location.href = "/hub/library" },
        });
      }
    }, pendingCount === 0 ? 1500 : 5000); // faster save when all done
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [phase, assets]);

  // ── Refresh Zernio accounts list (must be before useEffect and handleConnectPlatform that use it) ──
  const refreshZernioAccounts = useCallback(() => {
    setZernioLoading(true);
    serverGet("/zernio/accounts/list")
      .then(data => {
        if (data.success && data.accounts) {
          setZernioAccounts(data.accounts);
          console.log(`[CampaignLab] Refreshed accounts:`, data.accounts.map((a: any) => `${a.platform}:${a._id}`));
        }
      })
      .catch(err => console.log("[CampaignLab] Accounts refresh:", err))
      .finally(() => setZernioLoading(false));
  }, [serverGet]);

  // Load Zernio accounts when entering results phase
  useEffect(() => {
    if (phase !== "results" || zernioLoadedRef.current) return;
    zernioLoadedRef.current = true;
    setZernioLoading(true);
    serverGet("/zernio/accounts/list")
      .then(data => {
        if (data.success && data.accounts) {
          setZernioAccounts(data.accounts);
        }
      })
      .catch(err => console.log("[CampaignLab] Zernio accounts fetch:", err))
      .finally(() => setZernioLoading(false));
  }, [phase, serverGet]);

  // ── Connect a social platform via OAuth popup (transparent — no Zernio branding) ──
  const handleConnectPlatform = useCallback(async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      // Get OAuth URL from backend (auto-creates Zernio profile if needed)
      const token = getAuthToken();
      const qp = new URLSearchParams({ redirectUrl: window.location.origin + "/hub" });
      if (token) qp.set("_token", token);
      const data = await serverGet(`/zernio/connect/${platform}?${qp.toString()}`);
      if (!data.success || !data.authUrl) {
        toast.error(data.error || `Failed to initiate ${platform} connection`);
        setConnectingPlatform(null);
        return;
      }

      // Open OAuth popup
      const popup = window.open(data.authUrl, `connect_${platform}`, "width=600,height=700,left=200,top=100");
      if (!popup) {
        toast.error("Popup blocked. Please allow popups for this site.");
        setConnectingPlatform(null);
        return;
      }

      // Poll for popup close
      const pollInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollInterval);
          setConnectingPlatform(null);
          // Refresh accounts after OAuth completes
          setTimeout(() => refreshZernioAccounts(), 1500);
          toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully`);
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!popup.closed) popup.close();
        setConnectingPlatform(null);
      }, 300_000);
    } catch (err: any) {
      console.error(`[CampaignLab] Connect ${platform} error:`, err);
      toast.error(`Connection failed: ${err?.message || "Unknown error"}`);
      setConnectingPlatform(null);
    }
  }, [serverGet, getAuthToken, refreshZernioAccounts]);

  // ── Generate editorial calendar from ready assets (frontend-only, deterministic) ──
  const handleGenerateCalendar = () => {
    const readyAssets = assets.filter(a => a.status === "ready");
    if (readyAssets.length === 0) { toast.error("No ready assets to schedule"); return; }
    setCalendarLoading(true);
    setShowCalendarPanel(true);

    // Best posting times per platform (day-of-week preferences + time slots)
    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const platformSchedule: Record<string, { days: number[]; times: string[] }> = {
      LinkedIn:    { days: [2, 3, 4], times: ["09:00", "10:00", "11:00"] },
      Instagram:   { days: [1, 3, 5], times: ["12:00", "18:00", "20:00"] },
      Facebook:    { days: [2, 4, 6], times: ["13:00", "15:00", "19:00"] },
      "Twitter/X": { days: [1, 2, 3, 4, 5], times: ["08:00", "12:30", "17:00"] },
      TikTok:      { days: [2, 4, 6], times: ["19:00", "20:00", "21:00"] },
      YouTube:     { days: [4, 5, 6], times: ["14:00", "16:00", "17:00"] },
      Pinterest:   { days: [1, 3, 5, 6], times: ["14:00", "20:00", "21:00"] },
      Email:       { days: [2, 4], times: ["09:30", "10:00", "14:00"] },
    };

    const calChannelColors: Record<string, string> = {
      LinkedIn: "#666666", Instagram: "#666666", Facebook: "#666666",
      Email: "#666666", "Twitter/X": "#666666", TikTok: "#666666",
      YouTube: "#666666", Pinterest: "#666666",
    };

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Group assets by platform
    const byPlatform: Record<string, GeneratedAsset[]> = {};
    readyAssets.forEach(a => {
      if (!byPlatform[a.platform]) byPlatform[a.platform] = [];
      byPlatform[a.platform].push(a);
    });

    const usedSlots = new Set<string>();
    const events: any[] = [];
    const platforms = Object.keys(byPlatform);
    let dayOffset = 0;
    const maxDays = 28;

    // Interleave platforms for variety
    const queue: GeneratedAsset[] = [];
    const maxLen = Math.max(...platforms.map(p => byPlatform[p].length));
    for (let i = 0; i < maxLen; i++) {
      for (const p of platforms) {
        if (byPlatform[p][i]) queue.push(byPlatform[p][i]);
      }
    }

    for (const asset of queue) {
      const sched = platformSchedule[asset.platform] || { days: [1, 3, 5], times: ["10:00", "14:00"] };
      let scheduled = false;

      for (let d = dayOffset; d < dayOffset + maxDays && !scheduled; d++) {
        const candidate = new Date(startDate);
        candidate.setDate(candidate.getDate() + d);
        const dow = candidate.getDay();
        if (!sched.days.includes(dow)) continue;

        const slotKey = `${candidate.toDateString()}-${asset.platform}`;
        if (usedSlots.has(slotKey)) continue;
        usedSlots.add(slotKey);

        const timeIdx = events.filter(e => e.channel === asset.platform).length % sched.times.length;
        const time = sched.times[timeIdx];
        const title = asset.label || `${asset.platform} post`;
        const postingNote = asset.type === "video" ? "Video content — ensure thumbnail is set"
          : asset.type === "image" ? "Visual post — review image before publishing"
          : "Text post — proofread copy";

        events.push({
          id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title, channel: asset.platform, time,
          day: candidate.getDate(), month: candidate.getMonth(), year: candidate.getFullYear(),
          color: calChannelColors[asset.platform] || "var(--text-secondary)",
          postingNote, formatId: asset.formatId,
          assetType: asset.type,
          copy: asset.copy || "",
          caption: asset.caption || "",
          hashtags: asset.hashtags || "",
          headline: asset.headline || "",
          imageUrl: asset.imageUrl || "",
          videoUrl: asset.videoUrl || "",
        });
        scheduled = true;
        if (d === dayOffset) dayOffset = d + 1;
      }

      if (!scheduled) {
        dayOffset += 1;
        const fallback = new Date(startDate);
        fallback.setDate(fallback.getDate() + dayOffset);
        events.push({
          id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: asset.label || `${asset.platform} post`,
          channel: asset.platform,
          time: (platformSchedule[asset.platform]?.times || ["10:00"])[0],
          day: fallback.getDate(), month: fallback.getMonth(), year: fallback.getFullYear(),
          color: calChannelColors[asset.platform] || "var(--text-secondary)",
          postingNote: "Overflow slot — consider rescheduling",
          formatId: asset.formatId,
          assetType: asset.type,
          copy: asset.copy || "",
          caption: asset.caption || "",
          hashtags: asset.hashtags || "",
          headline: asset.headline || "",
          imageUrl: asset.imageUrl || "",
          videoUrl: asset.videoUrl || "",
        });
      }
    }

    events.sort((a, b) => {
      const da = new Date(a.year, a.month, a.day, ...a.time.split(":").map(Number) as [number, number]);
      const db = new Date(b.year, b.month, b.day, ...b.time.split(":").map(Number) as [number, number]);
      return da.getTime() - db.getTime();
    });

    setCalendarEvents(events);
    setCalendarGenerated(true);
    if (events.length > 0) {
      setCalendarViewMonth(events[0].month);
      setCalendarViewYear(events[0].year);
    }
    toast.success(`Editorial calendar: ${events.length} posts planned`);
    setCalendarLoading(false);

    // Persist events to server so CalendarPage can display them
    // Update local IDs with server-generated IDs for deploy to work
    const persistEvents = async () => {
      const updatedEvents = [...events];
      for (let i = 0; i < events.length; i++) {
        try {
          const data = await serverPost("/calendar", {
            title: events[i].title,
            channel: events[i].channel,
            channelIcon: events[i].channel,
            time: events[i].time,
            status: "scheduled",
            score: 0,
            color: events[i].color,
            day: events[i].day,
            month: events[i].month,
            year: events[i].year,
            postingNote: events[i].postingNote || "",
            campaignTheme: brief || "Campaign",
            assetType: events[i].assetType || "",
            copy: events[i].copy || "",
            caption: events[i].caption || "",
            hashtags: events[i].hashtags || "",
            headline: events[i].headline || "",
            imageUrl: events[i].imageUrl || "",
            videoUrl: events[i].videoUrl || "",
          }, 10_000);
          if (data.success && data.event?.id) {
            updatedEvents[i] = { ...updatedEvents[i], id: data.event.id };
          }
        } catch { /* best-effort */ }
      }
      setCalendarEvents(updatedEvents);
    };
    persistEvents();
  };

  // ── Deploy a single asset via Zernio ──
  const handleDeployAsset = async (asset: GeneratedAsset, scheduledAt?: string) => {
    setDeployingAssets(prev => ({ ...prev, [asset.formatId]: "deploying" }));
    try {
      // Find matching calendar event
      const matchingEvent = calendarEvents.find(ev =>
        ev.channel === asset.platform || ev.title?.toLowerCase().includes(asset.platform.toLowerCase())
      );
      const data = await serverPost("/campaign/deploy", {
        platform: asset.platform,
        caption: asset.caption || asset.copy || "",
        hashtags: asset.hashtags || "",
        headline: asset.headline || "",
        imageUrl: asset.imageUrl || undefined,
        videoUrl: asset.videoUrl || undefined,
        scheduledAt: scheduledAt || undefined,
        calendarEventId: matchingEvent?.id || undefined,
      }, 35_000);

      if (data.status === "skipped") {
        setDeployingAssets(prev => ({ ...prev, [asset.formatId]: "skipped" }));
        toast(`${asset.label}: ${data.reason || "Skipped"}`);
      } else if (data.success) {
        const status = data.status === "scheduled" ? "scheduled" : "deployed";
        setDeployingAssets(prev => ({ ...prev, [asset.formatId]: status }));
        toast.success(`${asset.label} ${status === "scheduled" ? "scheduled" : "deployed"} to ${asset.platform}${data.zernioPostUrl ? "" : ""}`);
      } else if (data.needsConnect) {
        setDeployingAssets(prev => ({ ...prev, [asset.formatId]: "error" }));
        const zernioPlatform = ZERNIO_PLATFORM_MAP_FE[asset.platform] || asset.platform.toLowerCase();
        toast.error(`No ${asset.platform} account connected. Click "Connect" to link your account.`, { action: { label: `Connect ${asset.platform}`, onClick: () => handleConnectPlatform(zernioPlatform) } });
      } else {
        setDeployingAssets(prev => ({ ...prev, [asset.formatId]: "error" }));
        toast.error(`Deploy failed: ${data.error || "Unknown error"}`);
        console.error("[CampaignLab] Deploy error:", data.error);
      }
    } catch (err: any) {
      setDeployingAssets(prev => ({ ...prev, [asset.formatId]: "error" }));
      toast.error(`Deploy error: ${err?.message || "Network error"}`);
      console.error("[CampaignLab] Deploy error:", err);
    }
  };

  // ── Deploy all ready assets ──
  const handleDeployAll = async () => {
    const readyAssets = assets.filter(a => a.status === "ready");
    if (readyAssets.length === 0) return;
    setDeployingAll(true);

    // Build deployments with calendar-matched scheduling
    const usedEventIds = new Set<string>();
    const deployments = readyAssets.map(a => {
      const matchingEvent = calendarEvents.find(ev =>
        (ev.channel === a.platform || ev.title?.toLowerCase().includes(a.platform.toLowerCase())) &&
        !usedEventIds.has(ev.id)
      );
      if (matchingEvent) usedEventIds.add(matchingEvent.id);
      const scheduledAt = matchingEvent
        ? new Date(matchingEvent.year, matchingEvent.month, matchingEvent.day, parseInt(matchingEvent.time?.split(":")[0] || "9"), parseInt(matchingEvent.time?.split(":")[1] || "0")).toISOString()
        : undefined;
      return {
        formatId: a.formatId,
        platform: a.platform,
        caption: a.caption || a.copy || "",
        hashtags: a.hashtags || "",
        headline: a.headline || "",
        imageUrl: a.imageUrl || undefined,
        videoUrl: a.videoUrl || undefined,
        scheduledAt: calendarGenerated ? scheduledAt : undefined,
        calendarEventId: matchingEvent?.id || undefined,
      };
    });

    try {
      readyAssets.forEach(a => setDeployingAssets(prev => ({ ...prev, [a.formatId]: "deploying" })));
      const data = await serverPost("/campaign/deploy-batch", { deployments, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, 60_000);
      if (data.success && data.results) {
        for (const r of data.results) {
          setDeployingAssets(prev => ({
            ...prev,
            [r.formatId]: r.status === "skipped" ? "skipped" : r.success ? (r.status === "scheduled" ? "scheduled" : "deployed") : "error",
          }));
        }
        const skipped = data.results.filter((r: any) => r.status === "skipped").length;
        const failed = data.results.filter((r: any) => !r.success && r.status !== "skipped").length;
        const needConnect = data.results.filter((r: any) => r.needsConnect).length;
        let msg = `${data.successCount}/${data.totalCount} assets deployed`;
        if (skipped > 0) msg += ` (${skipped} skipped: Email/Web)`;
        if (needConnect > 0) msg += ` -- ${needConnect} need social account connection`;
        toast.success(msg);
      } else {
        toast.error(data.error || "Batch deploy failed");
        readyAssets.forEach(a => setDeployingAssets(prev => ({ ...prev, [a.formatId]: "error" })));
      }
    } catch (err: any) {
      console.error("[CampaignLab] Batch deploy error:", err);
      toast.error("Batch deploy failed");
      readyAssets.forEach(a => setDeployingAssets(prev => ({ ...prev, [a.formatId]: "error" })));
    } finally {
      setDeployingAll(false);
    }
  };

  const canGenerate = (brief.trim() || productUrls.trim()) && selectedFormats.length > 0;

  // ── Brief Completeness Score ──
  const briefScoreItems = [
    { key: "brief", label: "Campaign brief", filled: brief.trim().length > 20, weight: 25 },
    { key: "objective", label: "Objective", filled: !!campaignObjective, weight: 15 },
    { key: "audience", label: "Target audience", filled: targetAudience.trim().length > 5, weight: 12 },
    { key: "tone", label: "Tone of voice", filled: !!toneOverride, weight: 8 },
    { key: "cta", label: "Call to action", filled: ctaText.trim().length > 2, weight: 10 },
    { key: "messages", label: "Key messages", filled: keyMessages.trim().length > 10, weight: 10 },
    { key: "angle", label: "Content angle", filled: contentAngle.trim().length > 3, weight: 5 },
    { key: "dates", label: "Period & duration", filled: !!(campaignStartDate || campaignDuration), weight: 5 },
    { key: "formats", label: "Formats selected", filled: selectedFormats.length > 0, weight: 5 },
    { key: "vault", label: "Brand Vault", filled: !!vault, weight: 5 },
  ];
  const briefScore = briefScoreItems.reduce((acc, item) => acc + (item.filled ? item.weight : 0), 0);
  const briefScoreLabel = briefScore < 30 ? "Minimal" : briefScore < 55 ? "Basic" : briefScore < 80 ? "Good" : "Expert";
  const briefScoreColor = briefScore < 30 ? "#d4183d" : briefScore < 55 ? "#999999" : briefScore < 80 ? "#666666" : "#333333";

  // ── Contextual objective tips ──
  const OBJECTIVE_TIPS: Record<string, { tip: string; suggestedFormats: string[]; suggestedTone: string }> = {
    "Brand Awareness": {
      tip: "Focus on visual storytelling and broad reach. Prioritize video and carousel formats for maximum impressions. Use aspirational messaging.",
      suggestedFormats: ["instagram-post", "instagram-reel", "linkedin-post", "facebook-video", "youtube-short", "tiktok-video"],
      suggestedTone: "Inspirational",
    },
    "Lead Generation": {
      tip: "Lead with a clear value proposition and strong CTA. Gated content works well. Facebook/LinkedIn ads perform best for B2B leads.",
      suggestedFormats: ["linkedin-post", "facebook-ad", "instagram-post", "twitter-post", "linkedin-text"],
      suggestedTone: "Professional",
    },
    "Product Launch": {
      tip: "Build anticipation with teaser content, then reveal. Use countdown mechanics. Multi-format cascade creates buzz across channels.",
      suggestedFormats: ["instagram-story", "instagram-reel", "linkedin-post", "facebook-post", "tiktok-video", "twitter-post", "youtube-short"],
      suggestedTone: "Bold & Confident",
    },
    "Engagement & Community": {
      tip: "Ask questions, share stories, use polls. Conversational content drives comments. Carousel and text posts get highest engagement.",
      suggestedFormats: ["linkedin-text", "instagram-carousel", "facebook-post", "twitter-text", "tiktok-video"],
      suggestedTone: "Casual & Friendly",
    },
    "Conversion & Sales": {
      tip: "Lead with benefits, social proof, and urgency. Direct response copy with clear CTAs. A/B test ad variations.",
      suggestedFormats: ["facebook-ad", "instagram-post", "instagram-story", "linkedin-post", "twitter-post", "pinterest-pin"],
      suggestedTone: "Bold & Confident",
    },
    "Thought Leadership": {
      tip: "Share unique insights, data, and expert perspectives. Long-form content positions authority. LinkedIn is your primary channel.",
      suggestedFormats: ["linkedin-article", "linkedin-text", "blog-article", "linkedin-carousel", "linkedin-post", "twitter-text"],
      suggestedTone: "Professional",
    },
    "Event Promotion": {
      tip: "Create urgency with dates and limited spots. Visual countdown content works well. Cross-platform reminders increase attendance.",
      suggestedFormats: ["instagram-story", "linkedin-post", "facebook-post", "twitter-post", "instagram-post"],
      suggestedTone: "Bold & Confident",
    },
    "Recruitment": {
      tip: "Show culture, team stories, and growth opportunities. Authentic behind-the-scenes content attracts talent. LinkedIn is essential.",
      suggestedFormats: ["linkedin-post", "linkedin-text", "instagram-post", "instagram-story", "facebook-post", "tiktok-video"],
      suggestedTone: "Casual & Friendly",
    },
    "Retention & Loyalty": {
      tip: "Celebrate customers, share tips and exclusive content. Personalized messaging increases retention. Email and social reinforce each other.",
      suggestedFormats: ["linkedin-post", "instagram-post", "facebook-post", "instagram-carousel"],
      suggestedTone: "Casual & Friendly",
    },
  };
  const currentObjectiveTip = campaignObjective ? OBJECTIVE_TIPS[campaignObjective] : null;

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(17,17,17,0.12)" }}>
            <Sparkles size={16} style={{ color: "var(--ora-signal)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              Campaign Lab
            </h2>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: 1 }}>
              One brief. Every format. Brand-compliant.
            </p>
          </div>
        </div>
        {phase === "results" && (
          <div className="flex items-center gap-2">
            <Link
              to="/hub/video-editor"
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer"
              style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
            >
              <Film size={13} />
              Video Editor
            </Link>
            <button
              onClick={handleSaveCampaign}
              disabled={savingCampaign || assets.filter(a => a.status === "ready").length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer"
              style={{ background: "rgba(17,17,17,0.12)", border: "1px solid rgba(17,17,17,0.25)", color: "var(--ora-signal)", fontSize: "13px", fontWeight: 600, opacity: savingCampaign ? 0.6 : 1 }}
            >
              {savingCampaign ? <Loader2 size={13} className="animate-spin" /> : campaignSavedId ? <Check size={13} /> : <Save size={13} />}
              {savingCampaign ? "Saving..." : campaignSavedId ? "Saved" : "Save Campaign"}
            </button>
            <button
              onClick={() => { setPhase("input"); setAssets([]); setCalendarEvents([]); setCalendarGenerated(false); setDeployingAssets({}); setShowCalendarPanel(false); zernioLoadedRef.current = false; setZernioAccounts([]); setConnectingPlatform(null); setSelectedProduct(null); setCampaignSavedId(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer"
              style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
            >
              <RefreshCw size={13} />
              New Campaign
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* ═══ INPUT PHASE ═══ */}
          {phase === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 py-8 space-y-6">

              {/* ═══ SECTION 1: ESSENTIAL — Brief + Formats ═══ */}

              {/* ── Narrative Territories ── */}
              {territories.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 mr-1">
                    <Compass size={12} className="text-muted-foreground" />
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Territory</span>
                  </div>
                  <button onClick={() => setSelectedTerritory(null)}
                    className="px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    style={{ fontSize: "11px", fontWeight: 500, background: !selectedTerritory ? "var(--foreground)" : "var(--secondary)", color: !selectedTerritory ? "var(--background)" : "var(--muted-foreground)", border: "1px solid " + (!selectedTerritory ? "var(--foreground)" : "var(--border)") }}>
                    Free
                  </button>
                  {territories.map(t => (
                    <button key={t.id} onClick={() => setSelectedTerritory(selectedTerritory?.id === t.id ? null : t)}
                      className="px-2.5 py-1 rounded-full transition-all cursor-pointer" title={t.description}
                      style={{ fontSize: "11px", fontWeight: 500, background: selectedTerritory?.id === t.id ? "var(--foreground)" : "var(--secondary)", color: selectedTerritory?.id === t.id ? "var(--background)" : "var(--muted-foreground)", border: "1px solid " + (selectedTerritory?.id === t.id ? "var(--foreground)" : "var(--border)") }}>
                      {t.name}
                    </button>
                  ))}
                  <button onClick={loadTerritories} disabled={territoriesLoading}
                    className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30"
                    title="Refresh territories">
                    <RefreshCw size={10} className={territoriesLoading ? "animate-spin" : ""} />
                  </button>
                  {selectedTerritory && (
                    <div className="w-full pl-7 mt-0.5" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      <span style={{ fontWeight: 500 }}>{selectedTerritory.angle}</span>
                      <span className="mx-1.5">·</span>
                      <span style={{ fontStyle: "italic" }}>{selectedTerritory.emotion}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Campaign Brief — THE main field */}
              <div>
                <textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder={"Describe your campaign...\ne.g. Launch our new summer collection -- luxury, minimalist, target 25-45 professionals."}
                  className="w-full rounded-xl px-5 py-4 resize-none transition-all"
                  style={{
                    background: "var(--card)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)",
                    fontSize: "15px", lineHeight: 1.6, minHeight: 110, outline: "none",
                  }}
                  onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                  onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                />
                {/* "Inspire me" button */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleSuggestTopics}
                    disabled={topicsLoading}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: showTopics ? "rgba(17,17,17,0.12)" : "rgba(17,17,17,0.06)",
                      border: `1px solid ${showTopics ? "rgba(17,17,17,0.3)" : "rgba(17,17,17,0.15)"}`,
                      color: "#999999", fontSize: "12px", fontWeight: 600,
                      opacity: topicsLoading ? 0.7 : 1,
                    }}
                  >
                    {topicsLoading ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                    {topicsLoading ? "Generating ideas..." : "Inspire me"}
                  </button>
                  {topicsUpcoming.length > 0 && !showTopics && (
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      <Calendar size={10} className="inline mr-1" />
                      {topicsUpcoming[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* ═══ TOPIC SUGGESTIONS PANEL ═══ */}
              <AnimatePresence>
                {showTopics && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl p-4" style={{ background: "rgba(17,17,17,0.04)", border: "1px solid rgba(17,17,17,0.12)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wand2 size={13} style={{ color: "#999999" }} />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>
                            Content Ideas{selectedProduct ? ` for ${selectedProduct.name}` : ""}
                          </span>
                        </div>
                        <button onClick={() => setShowTopics(false)} className="p-1 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                          <X size={12} />
                        </button>
                      </div>

                      {/* Upcoming events nudge */}
                      {topicsUpcoming.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {topicsUpcoming.slice(0, 4).map((ev, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 500, color: "#999999", background: "rgba(17,17,17,0.08)" }}>
                              <Calendar size={8} className="inline mr-1" />{ev}
                            </span>
                          ))}
                        </div>
                      )}

                      {topicsLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2">
                          <Loader2 size={16} className="animate-spin" style={{ color: "#999999" }} />
                          <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Analyzing your brand, products & trends...</span>
                        </div>
                      ) : topicSuggestions.length === 0 ? (
                        <div className="text-center py-6" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          No suggestions yet. Click "Inspire me" to generate ideas.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topicSuggestions.map((topic, i) => {
                            const typeColors: Record<string, string> = {
                              educate: "#111111", inspire: "#444444", sell: "#666666",
                              entertain: "#888888", "behind-the-scenes": "#AAAAAA",
                            };
                            const typeColor = typeColors[topic.type] || "var(--text-secondary)";
                            return (
                              <button
                                key={i}
                                onClick={() => handlePickTopic(topic)}
                                className="text-left rounded-lg p-3 transition-all cursor-pointer group"
                                style={{
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid var(--border)",
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                  e.currentTarget.style.borderColor = "rgba(17,17,17,0.3)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                  e.currentTarget.style.borderColor = "var(--border)";
                                }}
                              >
                                <div className="flex items-start gap-2 mb-1.5">
                                  <span className="flex-1" style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4 }}>
                                    {topic.title}
                                  </span>
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full" style={{ fontSize: "9px", fontWeight: 600, color: typeColor, background: `${typeColor}15`, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    {topic.type}
                                  </span>
                                </div>
                                {topic.hook && (
                                  <p className="mb-1.5" style={{ fontSize: "11px", color: "#c4b5a0", lineHeight: 1.4, fontStyle: "italic" }}>
                                    "{topic.hook}"
                                  </p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {topic.format && (
                                    <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: 500 }}>
                                      {topic.format}
                                    </span>
                                  )}
                                  {topic.product && (
                                    <span style={{ fontSize: "9px", color: "#666666", fontWeight: 500 }}>
                                      <Package size={8} className="inline mr-0.5" />{topic.product}
                                    </span>
                                  )}
                                  {topic.why_now && (
                                    <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                                      {topic.why_now}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Refresh button */}
                      {topicSuggestions.length > 0 && !topicsLoading && (
                        <div className="flex justify-center mt-3">
                          <button
                            onClick={handleSuggestTopics}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            style={{ fontSize: "11px", fontWeight: 600, color: "#999999", background: "rgba(17,17,17,0.06)" }}
                          >
                            <RefreshCw size={11} /> Other ideas
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reference Photos — compact inline */}
              <div>
                <div
                  className="rounded-xl border-2 border-dashed transition-colors cursor-pointer"
                  style={{ borderColor: "rgba(26,23,20,0.04)", background: "rgba(255,255,255,0.02)" }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(17,17,17,0.4)"; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(26,23,20,0.04)"; }}
                  onDrop={e => { e.currentTarget.style.borderColor = "rgba(26,23,20,0.04)"; handlePhotoDrop(e); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {refPhotos.length === 0 ? (
                    <div className="flex items-center justify-center py-5 gap-3">
                      <Camera size={16} style={{ color: "var(--text-secondary)" }} />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>Drop reference photos or click to upload</span>
                    </div>
                  ) : (
                    <div className="p-3 flex flex-wrap gap-2">
                      {refPhotos.map((photo, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                          <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={e => { e.stopPropagation(); removePhoto(i); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X size={10} style={{ color: "#fff" }} />
                          </button>
                        </div>
                      ))}
                      {refPhotos.length < 10 && (
                        <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          <Upload size={12} style={{ color: "var(--text-secondary)" }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
              </div>

              {/* ── Product / Service URL with auto-scan ── */}
              <div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                    <input
                      value={productUrls}
                      onChange={e => { setProductUrls(e.target.value); setScannedProduct(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleScanUrl(); } }}
                      placeholder="Paste your product or service page URL..."
                      className="w-full rounded-xl pl-10 pr-4 py-3 transition-all"
                      style={{ background: "var(--card)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "14px", outline: "none" }}
                      onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                      onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                    />
                  </div>
                  {productUrls.trim() && !scannedProduct && (
                    <button
                      onClick={() => handleScanUrl()}
                      disabled={scanningUrl}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer"
                      style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "13px", fontWeight: 600, opacity: scanningUrl ? 0.6 : 1 }}
                    >
                      {scanningUrl ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {scanningUrl ? "Scanning..." : "Scan"}
                    </button>
                  )}
                </div>
                {/* Scanned product summary */}
                {scannedProduct && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 rounded-xl px-4 py-3 flex items-start gap-3"
                    style={{ background: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.15)" }}
                  >
                    <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#666666" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{scannedProduct.name}</span>
                        {scannedProduct.price && (
                          <span style={{ fontSize: "11px", color: "#666666", fontWeight: 600 }}>
                            {scannedProduct.price} {scannedProduct.currency || ""}
                          </span>
                        )}
                      </div>
                      {scannedProduct.description && (
                        <p className="mt-1 line-clamp-2" style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                          {scannedProduct.description}
                        </p>
                      )}
                      {scannedProduct.features && scannedProduct.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {scannedProduct.features.slice(0, 4).map((f, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 500, color: "#666666", background: "rgba(17,17,17,0.1)" }}>
                              {f}
                            </span>
                          ))}
                          {scannedProduct.features.length > 4 && (
                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>+{scannedProduct.features.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setScannedProduct(null); setProductUrls(""); setBrief(""); setKeyMessages(""); }}
                      className="p-1 rounded-md cursor-pointer" style={{ color: "var(--text-secondary)" }}
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* ── Product Selector (only if products exist) ── */}
              {products.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {products.map((product: any) => {
                    const isSelected = selectedProduct?.id === product.id;
                    const mainImage = product.images?.[0]?.signedUrl;
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: isSelected ? "rgba(17,17,17,0.12)" : "var(--card)",
                          border: `1px solid ${isSelected ? "rgba(17,17,17,0.4)" : "rgba(26,23,20,0.04)"}`,
                        }}
                      >
                        {mainImage ? (
                          <img src={mainImage} alt="" className="w-7 h-7 rounded-md object-cover" />
                        ) : (
                          <Package size={12} style={{ color: "#3B3936" }} />
                        )}
                        <span style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "var(--ora-signal)" : "var(--foreground)" }}>
                          {product.name}
                        </span>
                        {isSelected && <Check size={12} style={{ color: "var(--ora-signal)" }} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Format Selection — grouped by platform */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Output Formats
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedFormats(FORMAT_OPTIONS.map(f => f.id))}
                      className="px-2 py-0.5 rounded cursor-pointer" style={{ fontSize: "10px", fontWeight: 600, color: "var(--ora-signal)", background: "rgba(17,17,17,0.08)" }}>
                      All
                    </button>
                    <button onClick={() => setSelectedFormats([])}
                      className="px-2 py-0.5 rounded cursor-pointer" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", background: "rgba(26,23,20,0.03)" }}>
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-3" style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
                  {PLATFORM_GROUPS.map(group => {
                    const groupFormats = FORMAT_OPTIONS.filter(f => f.platform === group.platform);
                    if (groupFormats.length === 0) return null;
                    const color = PLATFORM_COLORS[group.platform] || "var(--text-secondary)";
                    const allSelected = groupFormats.every(f => selectedFormats.includes(f.id));
                    const someSelected = groupFormats.some(f => selectedFormats.includes(f.id));
                    const PlatIcon = group.icon;
                    return (
                      <div key={group.platform}>
                        <button
                          onClick={() => {
                            if (allSelected) {
                              setSelectedFormats(prev => prev.filter(id => !groupFormats.some(f => f.id === id)));
                            } else {
                              setSelectedFormats(prev => [...new Set([...prev, ...groupFormats.map(f => f.id)])]);
                            }
                          }}
                          className="flex items-center gap-2 mb-1.5 cursor-pointer"
                          style={{ fontSize: "11px", fontWeight: 600, color: someSelected ? color : "var(--text-secondary)" }}>
                          <PlatIcon size={11} />
                          {group.platform}
                          <span style={{ fontSize: "9px", fontWeight: 400, color: "var(--text-secondary)" }}>
                            ({groupFormats.filter(f => selectedFormats.includes(f.id)).length}/{groupFormats.length})
                          </span>
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                          {groupFormats.map(fmt => {
                            const Icon = fmt.icon;
                            const isSelected = selectedFormats.includes(fmt.id);
                            return (
                              <button
                                key={fmt.id}
                                onClick={() => toggleFormat(fmt.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                style={{
                                  background: isSelected ? `${color}15` : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${isSelected ? `${color}40` : "var(--border)"}`,
                                  color: isSelected ? color : "var(--text-secondary)",
                                  fontSize: "11px", fontWeight: isSelected ? 600 : 400,
                                }}
                                title={fmt.description}
                              >
                                <Icon size={10} />
                                {fmt.label.replace(`${fmt.platform} `, "")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button — RIGHT AFTER formats */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all cursor-pointer"
                style={{
                  background: canGenerate ? "var(--ora-signal)" : "rgba(26,23,20,0.03)",
                  color: canGenerate ? "#fff" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: "15px",
                  cursor: canGenerate ? "pointer" : "not-allowed",
                }}
              >
                <Sparkles size={18} />
                Generate Campaign ({selectedFormats.length} format{selectedFormats.length !== 1 ? "s" : ""})
              </button>

              {/* ═══ SECTION 2: ADVANCED — Collapsible ═══ */}
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer transition-all"
                  style={{ background: showAdvanced ? "rgba(17,17,17,0.04)" : "transparent" }}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={14} style={{ color: showAdvanced ? "var(--ora-signal)" : "var(--text-secondary)" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: showAdvanced ? "var(--foreground)" : "var(--text-tertiary)" }}>
                      Refine campaign
                    </span>
                    {/* Count of filled advanced fields */}
                    {(() => {
                      const filledCount = [campaignObjective, toneOverride, contentAngle, keyMessages, targetAudience, ctaText, campaignStartDate, campaignDuration, language !== "auto" ? language : ""].filter(Boolean).length;
                      return filledCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, color: "var(--ora-signal)", background: "rgba(17,17,17,0.12)" }}>
                          {filledCount} option{filledCount > 1 ? "s" : ""} set
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} style={{ color: "var(--text-secondary)" }} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-6" style={{ borderTop: "1px solid rgba(26,23,20,0.03)" }}>

                        {/* Campaign Objective + Language — side by side */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Megaphone size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Objective</span>
                            </div>
                            <select
                              value={campaignObjective}
                              onChange={e => setCampaignObjective(e.target.value)}
                              className="w-full rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                              style={{
                                background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: campaignObjective ? "var(--foreground)" : "var(--text-secondary)",
                                fontSize: "13px", outline: "none", appearance: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235C5856' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                              }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            >
                              <option value="">Select objective...</option>
                              <option value="Brand Awareness">Brand Awareness</option>
                              <option value="Lead Generation">Lead Generation</option>
                              <option value="Product Launch">Product Launch</option>
                              <option value="Engagement & Community">Engagement & Community</option>
                              <option value="Conversion & Sales">Conversion & Sales</option>
                              <option value="Thought Leadership">Thought Leadership</option>
                              <option value="Event Promotion">Event Promotion</option>
                              <option value="Recruitment">Recruitment</option>
                              <option value="Retention & Loyalty">Retention & Loyalty</option>
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Language</span>
                            </div>
                            <select
                              value={language}
                              onChange={e => setLanguage(e.target.value)}
                              className="w-full rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                              style={{
                                background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)",
                                fontSize: "13px", outline: "none", appearance: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235C5856' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                              }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            >
                              <option value="auto">Auto-detect</option>
                              <option value="English">English</option>
                              <option value="French">French</option>
                              <option value="Spanish">Spanish</option>
                              <option value="German">German</option>
                              <option value="Italian">Italian</option>
                              <option value="Portuguese">Portuguese</option>
                              <option value="Dutch">Dutch</option>
                              <option value="Arabic">Arabic</option>
                              <option value="Japanese">Japanese</option>
                              <option value="Chinese">Chinese</option>
                            </select>
                          </div>
                        </div>

                        {/* Objective Smart Tip */}
                        {currentObjectiveTip && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="rounded-xl px-4 py-3"
                            style={{ background: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.12)" }}
                          >
                            <div className="flex items-start gap-3">
                              <Zap size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ora-signal)" }} />
                              <div>
                                <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.55 }}>
                                  {currentObjectiveTip.tip}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {!toneOverride && (
                                    <button
                                      onClick={() => setToneOverride(currentObjectiveTip.suggestedTone)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer"
                                      style={{ background: "rgba(17,17,17,0.1)", border: "1px solid rgba(17,17,17,0.2)", fontSize: "10px", fontWeight: 500, color: "var(--ora-signal)" }}
                                    >
                                      <TrendingUp size={9} /> {currentObjectiveTip.suggestedTone}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedFormats(currentObjectiveTip.suggestedFormats)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer"
                                    style={{ background: "rgba(17,17,17,0.1)", border: "1px solid rgba(17,17,17,0.2)", fontSize: "10px", fontWeight: 500, color: "var(--ora-signal)" }}
                                  >
                                    <LayoutGrid size={9} /> Optimal formats ({currentObjectiveTip.suggestedFormats.length})
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Tone Override */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={12} style={{ color: "var(--text-secondary)" }} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Tone of voice</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {["", "Professional", "Casual & Friendly", "Bold & Confident", "Inspirational", "Educational", "Provocative", "Humorous", "Luxury & Refined", "Technical"].map(tone => {
                              const isSelected = toneOverride === tone;
                              const label = tone || "Vault Default";
                              return (
                                <button
                                  key={tone}
                                  onClick={() => setToneOverride(tone)}
                                  className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                  style={{
                                    background: isSelected ? "rgba(17,17,17,0.15)" : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${isSelected ? "rgba(17,17,17,0.4)" : "var(--border)"}`,
                                    color: isSelected ? "var(--ora-signal)" : "var(--text-secondary)",
                                    fontSize: "11px", fontWeight: isSelected ? 600 : 400,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Target Audience + CTA — side by side */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Users size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Target audience</span>
                            </div>
                            <input
                              value={targetAudience}
                              onChange={e => setTargetAudience(e.target.value)}
                              placeholder="e.g. Tech professionals 25-45"
                              className="w-full rounded-xl px-4 py-2.5 transition-all"
                              style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Send size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Call to action</span>
                            </div>
                            <input
                              value={ctaText}
                              onChange={e => setCtaText(e.target.value)}
                              placeholder='e.g. "Start free trial"'
                              className="w-full rounded-xl px-4 py-2.5 transition-all"
                              style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            />
                          </div>
                        </div>

                        {/* Content Angle */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={12} style={{ color: "var(--text-secondary)" }} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Content angle / Hook</span>
                          </div>
                          <input
                            value={contentAngle}
                            onChange={e => setContentAngle(e.target.value)}
                            placeholder='e.g. "3 reasons why...", customer success story, data-driven insight'
                            className="w-full rounded-xl px-4 py-2.5 transition-all"
                            style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                            onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                            onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                          />
                        </div>

                        {/* Key Messages */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Type size={12} style={{ color: "var(--text-secondary)" }} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Key messages</span>
                          </div>
                          <textarea
                            value={keyMessages}
                            onChange={e => setKeyMessages(e.target.value)}
                            placeholder={"- Product saves 10 hours/week\n- Used by 500+ companies\n- Free trial, no credit card"}
                            className="w-full rounded-xl px-4 py-3 resize-none transition-all"
                            style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", lineHeight: 1.6, minHeight: 70, outline: "none" }}
                            onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                            onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                          />
                        </div>

                        {/* Dates + Duration — side by side */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Start date</span>
                            </div>
                            <input
                              type="date"
                              value={campaignStartDate}
                              onChange={e => setCampaignStartDate(e.target.value)}
                              className="w-full rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                              style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: campaignStartDate ? "var(--foreground)" : "var(--text-secondary)", fontSize: "13px", outline: "none", colorScheme: "dark" }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock size={12} style={{ color: "var(--text-secondary)" }} />
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Duration</span>
                            </div>
                            <select
                              value={campaignDuration}
                              onChange={e => setCampaignDuration(e.target.value)}
                              className="w-full rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                              style={{
                                background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: campaignDuration ? "var(--foreground)" : "var(--text-secondary)",
                                fontSize: "13px", outline: "none", appearance: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235C5856' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                              }}
                              onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                              onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                            >
                              <option value="">Select duration...</option>
                              <option value="1 day (flash)">1 day (flash)</option>
                              <option value="3 days">3 days</option>
                              <option value="1 week">1 week</option>
                              <option value="2 weeks">2 weeks</option>
                              <option value="1 month">1 month</option>
                              <option value="6 weeks">6 weeks</option>
                              <option value="2 months">2 months</option>
                              <option value="3 months (quarter)">3 months (quarter)</option>
                              <option value="6 months">6 months</option>
                              <option value="Ongoing / Evergreen">Ongoing / Evergreen</option>
                            </select>
                          </div>
                        </div>

                        {/* Product URLs — kept in advanced for manual override */}

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Brand Vault Status — compact */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Shield size={13} style={{ color: vault ? "#666666" : "var(--text-secondary)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: vault ? "#666666" : "var(--text-secondary)" }}>
                    {vaultLoading ? "Loading Vault..." : vault ? `${vault.brandName || vault.company_name || "Brand Vault"} active` : "No Brand Vault"}
                  </span>
                  {vault && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: "10px", color: "var(--ora-signal)", background: "rgba(17,17,17,0.08)" }}>
                      <Check size={8} /> tone + vocabulary + guardrails
                    </span>
                  )}
                </div>
                {/* Logo */}
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded object-contain" style={{ background: "var(--secondary)" }} />
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--text-secondary)", fontSize: "11px" }}
                    >
                      {uploadingLogo ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                      Logo
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  {rawLogoUrl && (
                    <button
                      onClick={() => setShowLogoOverlay(!showLogoOverlay)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all"
                      style={{ background: showLogoOverlay ? "rgba(17,17,17,0.1)" : "rgba(26,23,20,0.03)", border: `1px solid ${showLogoOverlay ? "rgba(17,17,17,0.2)" : "var(--border)"}`, fontSize: "10px", fontWeight: 600, color: showLogoOverlay ? "#666666" : "var(--text-secondary)" }}
                    >
                      {showLogoOverlay ? <Check size={9} /> : <Eye size={9} />}
                      Overlay
                    </button>
                  )}
                </div>
              </div>

              {/* AI Model Selector — compact inside advanced area */}
              <div className="rounded-xl px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Models</span>
                  <button onClick={() => setMultiModelEnabled(!multiModelEnabled)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg cursor-pointer"
                    style={{
                      background: multiModelEnabled ? "rgba(17,17,17,0.15)" : "rgba(26,23,20,0.03)",
                      border: `1px solid ${multiModelEnabled ? "rgba(17,17,17,0.4)" : "rgba(26,23,20,0.04)"}`,
                    }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: multiModelEnabled ? "var(--ora-signal)" : "#3d3c3b" }} />
                    <span style={{ fontSize: "9px", fontWeight: 600, color: multiModelEnabled ? "var(--foreground)" : "var(--text-secondary)" }}>Compare</span>
                  </button>
                </div>
                {[
                  { label: "Text", models: TEXT_MODELS, value: textModel, set: setTextModel, icon: FileText, multiSelected: textModelsSelected, setMulti: setTextModelsSelected, canMulti: true },
                  { label: "Images", models: IMAGE_MODELS, value: imageModel, set: setImageModel, icon: ImageIcon, multiSelected: imageModelsSelected, setMulti: setImageModelsSelected, canMulti: true },
                  { label: "Videos", models: VIDEO_MODELS, value: videoModel, set: setVideoModel, icon: Film, multiSelected: [] as string[], setMulti: null as any, canMulti: false },
                ].map(({ label, models, value, set, icon: Icon, multiSelected, setMulti, canMulti }) => (
                  <div key={label} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={10} style={{ color: "var(--text-secondary)" }} />
                      <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {models.map(m => {
                        const isMulti = multiModelEnabled && canMulti;
                        const active = isMulti ? multiSelected.includes(m.id) : value === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              if (isMulti && setMulti) {
                                if (multiSelected.includes(m.id)) {
                                  if (multiSelected.length > 1) { setMulti(multiSelected.filter((id: string) => id !== m.id)); set(multiSelected.filter((id: string) => id !== m.id)[0]); }
                                } else {
                                  if (multiSelected.length < 3) setMulti([...multiSelected, m.id]);
                                  else toast.error("Max 3 models");
                                }
                              } else { set(m.id); }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all"
                            style={{
                              background: active ? `${m.color}18` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${active ? m.color + "50" : "var(--border)"}`,
                              color: active ? m.color : "var(--text-secondary)",
                              fontSize: "11px", fontWeight: active ? 600 : 400,
                            }}
                          >
                            {active && isMulti && <Check size={9} />}
                            {m.label}
                            <span style={{ fontSize: "8px", fontWeight: 500, opacity: 0.7 }}>{m.badge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ GENERATING PHASE ═══ */}
          {phase === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
              <div className="text-center">
                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
                  Generating campaign...
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {refPhotos.length > 0
                    ? generationProgress < 10 ? "Uploading reference photos..."
                    : generationProgress < 35 ? "Analyzing visual DNA + generating copy..."
                    : generationProgress < 90 ? "Generating visuals with reference matching..."
                    : "Finalizing campaign..."
                    : "15 agents working: copy, visuals, compliance, adaptation"
                  }
                </p>
              </div>
              <div className="w-80 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <motion.div className="h-full rounded-full" style={{ background: "var(--ora-signal)" }}
                  animate={{ width: `${generationProgress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {assets.map(asset => {
                  const color = PLATFORM_COLORS[asset.platform] || "var(--text-secondary)";
                  const isReady = asset.status === "ready";
                  const isError = asset.status === "error";
                  return (
                    <span key={asset.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
                      background: isReady ? `${color}15` : isError ? "rgba(212,24,61,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isReady ? `${color}30` : isError ? "rgba(212,24,61,0.2)" : "var(--border)"}`,
                    }}>
                      {isReady ? <Check size={10} style={{ color }} /> : isError ? <AlertCircle size={10} style={{ color: "#d4183d" }} /> : <Loader2 size={10} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
                      <span style={{ fontSize: "10px", fontWeight: 500, color: isReady ? color : isError ? "#d4183d" : "var(--text-secondary)" }}>{asset.label}</span>
                    </span>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ RESULTS PHASE ═══ */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                    Campaign Ready
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: 2 }}>
                    {assets.filter(a => a.status === "ready").length}/{assets.length} assets generated
                    {(vault?.brandName || vault?.company_name) ? ` for ${vault.brandName || vault.company_name}` : ""}
                    {Object.values(deployingAssets).filter(s => s === "deployed" || s === "scheduled").length > 0 && (
                      <span style={{ color: "#666666", marginLeft: 8 }}>
                        {Object.values(deployingAssets).filter(s => s === "deployed" || s === "scheduled").length} deployed
                      </span>
                    )}
                  </p>
                </div>
                {assets.some(a => a.status === "error" || (!a.caption && !a.copy && a.status !== "generating")) && (
                  <button
                    onClick={retryTextGeneration}
                    disabled={retryingTexts}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
                    style={{
                      background: retryingTexts ? "rgba(255,255,255,0.03)" : "var(--ora-signal)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      opacity: retryingTexts ? 0.6 : 1,
                    }}
                  >
                    {retryingTexts ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {retryingTexts ? "Generating texts..." : "Retry Texts"}
                  </button>
                )}
              </div>

              {/* Social Accounts — transparent integration */}
              <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "rgba(17,17,17,0.12)" }}>
                    <Send size={11} style={{ color: "var(--ora-signal)" }} />
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: 600 }}>Social Accounts</span>
                  {zernioLoading && <Loader2 size={10} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
                  {!zernioLoading && zernioAccounts.length > 0 && (
                    <button onClick={refreshZernioAccounts} className="ml-auto cursor-pointer" title="Refresh accounts">
                      <RefreshCw size={10} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  )}
                </div>
                {/* Connected accounts */}
                {zernioAccounts.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-2 ml-9">
                    {zernioAccounts.map((acc: any, i: number) => {
                      const pName = acc.platform?.charAt(0).toUpperCase() + acc.platform?.slice(1);
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{ background: `${PLATFORM_COLORS[pName] || "var(--text-secondary)"}15`, fontSize: "11px", fontWeight: 600, color: PLATFORM_COLORS[pName] || "var(--text-tertiary)" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#666666" }} />
                          {pName} {acc.username ? `@${acc.username}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Connect buttons for unconnected platforms */}
                <div className="flex items-center gap-2 flex-wrap ml-9">
                  {CONNECTABLE_PLATFORMS.filter(p => !zernioAccounts.some((a: any) => a.platform === p.id)).map(p => {
                    const isConnecting = connectingPlatform === p.id;
                    return (
                      <button key={p.id} onClick={() => handleConnectPlatform(p.id)}
                        disabled={isConnecting || !!connectingPlatform}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                        style={{
                          background: isConnecting ? `${p.color}20` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isConnecting ? `${p.color}40` : "rgba(26,23,20,0.04)"}`,
                          fontSize: "11px", fontWeight: 500, color: isConnecting ? p.color : "var(--text-secondary)",
                          opacity: connectingPlatform && !isConnecting ? 0.4 : 1,
                        }}>
                        {isConnecting ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                        {isConnecting ? `Connecting ${p.label}...` : p.label}
                      </button>
                    );
                  })}
                  {CONNECTABLE_PLATFORMS.filter(p => !zernioAccounts.some((a: any) => a.platform === p.id)).length === 0 && zernioAccounts.length > 0 && (
                    <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>All platforms connected</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset, i) => {
                  const fmt = FORMAT_OPTIONS.find(f => f.id === asset.formatId);
                  const Icon = fmt?.icon || ImageIcon;
                  const color = PLATFORM_COLORS[asset.platform] || "var(--text-secondary)";

                  return (
                    <motion.div key={asset.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }} className="rounded-xl overflow-hidden group"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                      {/* Preview area */}
                      <div className="relative cursor-pointer"
                        style={{ aspectRatio: asset.type === "text" ? "3/2" : (fmt?.aspectRatio || "1/1"), background: "#0e0d0c", maxHeight: 280 }}
                        onClick={() => setSelectedAsset(asset)}>
                        {asset.status === "ready" && asset.videoUrl ? (
                          <div className="relative w-full h-full">
                            <video
                              src={asset.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              autoPlay
                              loop
                              playsInline
                              data-asset-id={asset.id}
                            />
                            {/* Brand logo overlay on video */}
                            {brandLogoUrl && (
                              <img src={brandLogoUrl} alt="Brand logo" className="absolute"
                                style={{ bottom: 10, right: 10, width: "14%", maxWidth: 56, minWidth: 24, height: "auto", objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))", opacity: 0.9, borderRadius: 3 }} />
                            )}
                          </div>
                        ) : asset.status === "ready" && asset.imageUrl ? (
                          <div className="relative w-full h-full">
                            {/* Carousel: show first slide with slide count badge */}
                            {asset.carouselSlides && asset.carouselSlides.length > 1 ? (
                              <div className="relative w-full h-full">
                                <img src={asset.carouselSlides[0]?.imageUrl || asset.imageUrl} alt={asset.label} className="w-full h-full object-cover" />
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
                                  <LayoutGrid size={9} style={{ color: "var(--foreground)" }} />
                                  <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--foreground)" }}>
                                    {asset.carouselSlides.filter(s => s.imageUrl).length} slides
                                  </span>
                                </div>
                              </div>
                            ) : assetTemplates[asset.formatId] && getTemplateById(assetTemplates[asset.formatId]) ? (
                              /* Template-based rendering */
                              <div className="w-full h-full">
                                {getTemplateById(assetTemplates[asset.formatId])!.htmlTemplate ? (
                                  <HTMLTemplateEngine
                                    template={getTemplateById(assetTemplates[asset.formatId])!}
                                    asset={asset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                                    width={380}
                                  />
                                ) : getTemplateById(assetTemplates[asset.formatId])!.svgTemplate ? (
                                  <SVGTemplateEngine
                                    template={getTemplateById(assetTemplates[asset.formatId])!}
                                    asset={asset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                                    width={380}
                                  />
                                ) : (
                                  <TemplateEngine
                                    template={getTemplateById(assetTemplates[asset.formatId])!}
                                    asset={asset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                                    width={380}
                                  />
                                )}
                              </div>
                            ) : (
                              <>
                                <img src={asset.imageUrl} alt={asset.label} className="w-full h-full object-cover" />
                                {/* Brand logo overlay (raw mode) */}
                                {brandLogoUrl && (
                                  <img
                                    src={brandLogoUrl}
                                    alt="Brand logo"
                                    className="absolute"
                                    style={{
                                      bottom: 10, right: 10,
                                      width: "14%", maxWidth: 56, minWidth: 24,
                                      height: "auto",
                                      objectFit: "contain",
                                      filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))",
                                      opacity: 0.9,
                                      borderRadius: 3,
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        ) : asset.status === "ready" && asset.type === "text" ? (
                          <div className="w-full h-full p-4 overflow-hidden">
                            {asset.subject && (
                              <p className="line-clamp-1 mb-2" style={{ fontSize: "11px", fontWeight: 600, color: "var(--ora-signal)", lineHeight: 1.3 }}>
                                {asset.subject}
                              </p>
                            )}
                            {asset.headline && (
                              <p className="line-clamp-2 mb-2" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3 }}>
                                {asset.headline}
                              </p>
                            )}
                            <p className="line-clamp-5" style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                              {asset.caption || asset.copy || ""}
                            </p>
                            {!asset.caption && !asset.copy && !asset.headline && (
                              <div className="flex flex-col items-center justify-center gap-2 py-4">
                                <FileText size={20} style={{ color: "var(--text-secondary)" }} />
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No text generated</span>
                                <button onClick={(e) => { e.stopPropagation(); retryTextGeneration(); }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer"
                                  style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "11px", fontWeight: 600 }}>
                                  <RefreshCw size={10} /> Retry
                                </button>
                              </div>
                            )}
                            {asset.ctaText && (
                              <span className="inline-block mt-2 px-3 py-1 rounded text-xs" style={{ background: "var(--ora-signal)", color: "#fff", fontWeight: 600, fontSize: "10px" }}>
                                {asset.ctaText}
                              </span>
                            )}
                          </div>
                        ) : asset.status === "generating" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Loader2 size={20} className="animate-spin" style={{ color }} />
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Generating...</span>
                          </div>
                        ) : asset.status === "error" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                            <AlertCircle size={20} style={{ color: "#d4183d" }} />
                            <span style={{ fontSize: "11px", color: "#d4183d" }}>{asset.error?.slice(0, 50) || "Error"}</span>
                            <button onClick={(e) => { e.stopPropagation(); retryTextGeneration(); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer"
                              style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "11px", fontWeight: 600 }}>
                              <RefreshCw size={10} /> Retry Texts
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon size={28} style={{ color: "#3d3c3b" }} />
                          </div>
                        )}

                        {asset.status === "ready" && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={18} style={{ color: "white" }} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                            <Icon size={10} style={{ color }} />
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{asset.platform}</span>
                          </span>
                        </div>
                      </div>

                      {/* Variant selector */}
                      {asset.variants && asset.variants.length > 1 && (
                        <div className="px-4 pt-3 pb-0">
                          <div className="flex items-center gap-1">
                            {asset.variants.map((v, vi) => {
                              const isSelected = (asset.selectedVariant ?? 0) === vi;
                              const isImage = !!v.imageUrl;
                              return (
                                <button key={vi} onClick={(e) => {
                                  e.stopPropagation();
                                  setAssets(prev => prev.map(a => a.id === asset.id ? {
                                    ...a,
                                    selectedVariant: vi,
                                    ...(isImage ? { imageUrl: v.imageUrl } : {}),
                                    ...(!isImage && v.caption ? {
                                      caption: v.caption, copy: v.copy, headline: v.headline,
                                      subject: v.subject, ctaText: v.ctaText, hashtags: v.hashtags,
                                      model: v.model,
                                    } : {}),
                                  } : a));
                                }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer"
                                  style={{
                                    background: isSelected ? "rgba(17,17,17,0.2)" : "rgba(26,23,20,0.03)",
                                    border: isSelected ? "1px solid rgba(17,17,17,0.5)" : "1px solid var(--border)",
                                  }}>
                                  {isImage && v.imageUrl ? (
                                    <img src={v.imageUrl} alt={v.modelLabel} className="w-5 h-5 rounded object-cover" />
                                  ) : null}
                                  <span style={{
                                    fontSize: "9px", fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? "var(--foreground)" : "var(--text-secondary)",
                                  }}>{v.modelLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{asset.label}</span>
                          {asset.status === "ready" && (
                            <div className="flex items-center gap-1">
                              {/* Edit template button */}
                              {asset.type === "image" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (assetTemplates[asset.formatId] && getTemplateById(assetTemplates[asset.formatId])) {
                                      setEditorAsset(asset);
                                    } else {
                                      setGalleryFormatId(asset.formatId);
                                      setGalleryOpen(true);
                                    }
                                  }}
                                  className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                                  title={assetTemplates[asset.formatId] ? "Edit template" : "Choose template"}
                                  style={{ background: assetTemplates[asset.formatId] ? "rgba(17,17,17,0.15)" : "rgba(26,23,20,0.03)" }}
                                >
                                  <Pencil size={12} style={{ color: assetTemplates[asset.formatId] ? "var(--ora-signal)" : "var(--text-secondary)" }} />
                                </button>
                              )}
                              <button onClick={() => handleDeployAsset(asset)}
                                disabled={deployingAssets[asset.formatId] === "deploying" || deployingAssets[asset.formatId] === "deployed"}
                                className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                                title={deployingAssets[asset.formatId] === "deployed" ? "Published" : deployingAssets[asset.formatId] === "scheduled" ? "Scheduled" : "Publish to platform"}
                                style={{ background: deployingAssets[asset.formatId] === "deployed" ? "rgba(17,17,17,0.15)" : deployingAssets[asset.formatId] === "scheduled" ? "rgba(17,17,17,0.15)" : "rgba(26,23,20,0.03)" }}>
                                {deployingAssets[asset.formatId] === "deploying" ? <Loader2 size={12} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                                  : deployingAssets[asset.formatId] === "deployed" ? <Check size={12} style={{ color: "#666666" }} />
                                  : deployingAssets[asset.formatId] === "scheduled" ? <Clock size={12} style={{ color: "var(--ora-signal)" }} />
                                  : <Send size={12} style={{ color: "var(--text-secondary)" }} />}
                              </button>
                              <button onClick={() => handleSaveAsset(asset)} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                                <Save size={12} style={{ color: "var(--text-secondary)" }} />
                              </button>
                              <button onClick={() => handleDownload(asset)} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                                <Download size={12} style={{ color: "var(--text-secondary)" }} />
                              </button>
                            </div>
                          )}
                        </div>
                        {asset.headline && (
                          <p className="line-clamp-1 mb-1" style={{ fontSize: "12px", fontWeight: 600, color: "#C4BEB8", lineHeight: 1.4 }}>{asset.headline}</p>
                        )}
                        {(asset.caption || asset.copy) && (
                          <p className="line-clamp-3" style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{asset.caption || asset.copy}</p>
                        )}
                        {asset.hashtags && (
                          <p className="line-clamp-1 mt-1" style={{ fontSize: "11px", color: "var(--ora-signal)", lineHeight: 1.4 }}>{asset.hashtags}</p>
                        )}
                        {asset.status === "ready" && (
                          <div className="flex items-center gap-1 mt-2">
                            <Check size={11} style={{ color: "#666666" }} />
                            <span style={{ fontSize: "10px", color: "#666666", fontWeight: 600 }}>Brand-compliant</span>
                          </div>
                        )}

                        {deployingAssets[asset.formatId] && (
                          <div className="flex items-center gap-1 mt-1">
                            {deployingAssets[asset.formatId] === "deployed" && <><Send size={9} style={{ color: "#666666" }} /><span style={{ fontSize: "9px", color: "#666666", fontWeight: 600 }}>Published</span></>}
                            {deployingAssets[asset.formatId] === "scheduled" && <><Clock size={9} style={{ color: "var(--ora-signal)" }} /><span style={{ fontSize: "9px", color: "var(--ora-signal)", fontWeight: 600 }}>Scheduled</span></>}
                            {deployingAssets[asset.formatId] === "deploying" && <><Loader2 size={9} className="animate-spin" style={{ color: "var(--text-secondary)" }} /><span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: 600 }}>Deploying...</span></>}
                            {deployingAssets[asset.formatId] === "skipped" && <><Check size={9} style={{ color: "var(--text-secondary)" }} /><span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: 600 }}>Skipped (not supported)</span></>}
                            {deployingAssets[asset.formatId] === "error" && <><AlertCircle size={9} style={{ color: "#d4183d" }} /><span style={{ fontSize: "9px", color: "#d4183d", fontWeight: 600 }}>Deploy failed</span></>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* ═══ CALENDAR + DEPLOY PANEL ═══ */}
              <div className="mt-8 space-y-4">
                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleGenerateCalendar}
                    disabled={calendarLoading || assets.filter(a => a.status === "ready").length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: calendarGenerated ? "rgba(17,17,17,0.08)" : "rgba(17,17,17,0.1)",
                      border: `1px solid ${calendarGenerated ? "rgba(17,17,17,0.2)" : "rgba(17,17,17,0.2)"}`,
                      color: calendarGenerated ? "#666666" : "var(--ora-signal)",
                      fontSize: "13px", fontWeight: 600,
                      opacity: calendarLoading ? 0.6 : 1,
                    }}
                  >
                    {calendarLoading ? <Loader2 size={14} className="animate-spin" /> : calendarGenerated ? <Check size={14} /> : <Calendar size={14} />}
                    {calendarLoading ? "Generating schedule..." : calendarGenerated ? `${calendarEvents.length} posts planned` : "Plan Editorial Calendar"}
                  </button>

                  {calendarGenerated && (
                    <button
                      onClick={() => setShowCalendarPanel(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--text-tertiary)", fontSize: "12px", fontWeight: 500 }}
                    >
                      <ChevronRight size={12} style={{ transform: showCalendarPanel ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                      {showCalendarPanel ? "Hide calendar" : "Show calendar"}
                    </button>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    {calendarGenerated && (
                      <Link
                        to="/hub/calendar"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all"
                        style={{ background: "rgba(26,23,20,0.03)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--text-tertiary)", fontSize: "12px", fontWeight: 500 }}
                      >
                        <ExternalLink size={12} />
                        Open Calendar
                      </Link>
                    )}
                    <button
                      onClick={handleDeployAll}
                      disabled={deployingAll || assets.filter(a => a.status === "ready").length === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                      style={{
                        background: deployingAll ? "rgba(26,23,20,0.03)" : "var(--ora-signal)",
                        color: "#fff", fontSize: "13px", fontWeight: 600,
                        opacity: (deployingAll || assets.filter(a => a.status === "ready").length === 0) ? 0.5 : 1,
                      }}
                    >
                      {deployingAll ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {deployingAll ? "Deploying..." : calendarGenerated ? "Deploy All (Scheduled)" : "Deploy All Now"}
                    </button>
                  </div>
                </div>

                {/* Calendar preview — real monthly grid */}
                <AnimatePresence>
                  {showCalendarPanel && calendarGenerated && calendarEvents.length > 0 && (() => {
                    const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const channelColors: Record<string, string> = {
                      LinkedIn: "#666666", Instagram: "#666666", Facebook: "#666666",
                      Email: "#666666", "Twitter/X": "#666666", TikTok: "#666666",
                      YouTube: "#666666", Pinterest: "#666666", Web: "#666666",
                    };

                    // Build grid for current view month
                    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
                    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
                    // Monday = 0
                    let startDow = firstDay.getDay() - 1;
                    if (startDow < 0) startDow = 6;
                    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

                    // Events for this month
                    const monthEvents = calendarEvents.filter(ev => ev.month === calendarViewMonth && ev.year === calendarViewYear);
                    const eventsByDay: Record<number, typeof calendarEvents> = {};
                    monthEvents.forEach(ev => {
                      if (!eventsByDay[ev.day]) eventsByDay[ev.day] = [];
                      eventsByDay[ev.day].push(ev);
                    });

                    // Count events per month for navigation dots
                    const monthsWithEvents = new Set(calendarEvents.map(ev => `${ev.year}-${ev.month}`));

                    const navigateMonth = (dir: -1 | 1) => {
                      let m = calendarViewMonth + dir;
                      let y = calendarViewYear;
                      if (m < 0) { m = 11; y--; }
                      if (m > 11) { m = 0; y++; }
                      setCalendarViewMonth(m);
                      setCalendarViewYear(y);
                    };

                    const today = new Date();
                    const isToday = (d: number) => d === today.getDate() && calendarViewMonth === today.getMonth() && calendarViewYear === today.getFullYear();

                    return (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                          {/* Header */}
                          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-3">
                              <Calendar size={14} style={{ color: "var(--ora-signal)" }} />
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Editorial Calendar</span>
                              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, color: "var(--ora-signal)", background: "rgba(17,17,17,0.1)" }}>
                                {calendarEvents.length} posts
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-md cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                                <ChevronLeft size={14} style={{ color: "var(--text-tertiary)" }} />
                              </button>
                              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", minWidth: 140, textAlign: "center" }}>
                                {MONTHS_FULL[calendarViewMonth]} {calendarViewYear}
                                {monthsWithEvents.has(`${calendarViewYear}-${calendarViewMonth}`) && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full ml-2" style={{ background: "var(--ora-signal)", verticalAlign: "middle" }} />
                                )}
                              </span>
                              <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-md cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                                <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                              </button>
                            </div>
                          </div>

                          {/* Day-of-week headers */}
                          <div className="grid grid-cols-7 px-2 pt-2" style={{ borderBottom: "1px solid rgba(26,23,20,0.03)" }}>
                            {DOW.map(d => (
                              <div key={d} className="text-center py-2" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* Grid cells */}
                          <div className="grid grid-cols-7 px-2 pb-2">
                            {Array.from({ length: totalCells }).map((_, idx) => {
                              const dayNum = idx - startDow + 1;
                              const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                              const dayEvents = inMonth ? (eventsByDay[dayNum] || []) : [];
                              const todayMark = inMonth && isToday(dayNum);

                              return (
                                <div key={idx} className="relative min-h-[72px] p-1" style={{ border: "1px solid rgba(255,255,255,0.03)" }}>
                                  {inMonth && (
                                    <>
                                      <span style={{
                                        fontSize: "11px", fontWeight: todayMark ? 700 : 400,
                                        color: todayMark ? "var(--ora-signal)" : dayEvents.length > 0 ? "var(--foreground)" : "#3a3836",
                                        display: "block", textAlign: "right", paddingRight: 2, paddingTop: 1,
                                      }}>
                                        {dayNum}
                                      </span>
                                      <div className="mt-0.5 space-y-0.5">
                                        {dayEvents.slice(0, 3).map((ev, ei) => {
                                          const color = channelColors[ev.channel] || ev.color || "var(--text-secondary)";
                                          return (
                                            <motion.div
                                              key={ev.id || ei}
                                              initial={{ opacity: 0, scale: 0.9 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: ei * 0.05 }}
                                              className="rounded px-1 py-0.5 truncate cursor-default group relative"
                                              style={{ background: `${color}18`, borderLeft: `2px solid ${color}` }}
                                              title={`${ev.time} — ${ev.channel}: ${ev.title}${ev.postingNote ? "\n" + ev.postingNote : ""}`}
                                            >
                                              <span style={{ fontSize: "8px", fontWeight: 600, color, display: "block", lineHeight: 1.2 }}>
                                                {ev.time} {ev.channel}
                                              </span>
                                              <span className="truncate block" style={{ fontSize: "8px", color: "var(--text-tertiary)", lineHeight: 1.2 }}>
                                                {ev.title}
                                              </span>
                                            </motion.div>
                                          );
                                        })}
                                        {dayEvents.length > 3 && (
                                          <span style={{ fontSize: "8px", fontWeight: 600, color: "var(--text-secondary)", paddingLeft: 2 }}>
                                            +{dayEvents.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Legend + list summary below grid */}
                          <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                            <div className="flex flex-wrap gap-3 mb-3">
                              {[...new Set(calendarEvents.map(e => e.channel))].map(ch => (
                                <span key={ch} className="inline-flex items-center gap-1.5" style={{ fontSize: "10px", fontWeight: 500, color: channelColors[ch] || "var(--text-secondary)" }}>
                                  <span className="w-2 h-2 rounded-full" style={{ background: channelColors[ch] || "var(--text-secondary)" }} />
                                  {ch} ({calendarEvents.filter(e => e.channel === ch).length})
                                </span>
                              ))}
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                              {[...calendarEvents].sort((a, b) => {
                                const da = new Date(a.year, a.month, a.day);
                                const db = new Date(b.year, b.month, b.day);
                                return da.getTime() - db.getTime();
                              }).map((ev, i) => {
                                const color = channelColors[ev.channel] || ev.color || "var(--text-secondary)";
                                const evDate = new Date(ev.year, ev.month, ev.day);
                                const dateStr = evDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                                return (
                                  <div key={ev.id || i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", minWidth: 90 }}>{dateStr}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${color}15`, fontSize: "9px", fontWeight: 600, color }}>{ev.time}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${color}15`, fontSize: "9px", fontWeight: 600, color }}>{ev.channel}</span>
                                    <span className="truncate flex-1" style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)" }}>{ev.title}</span>
                                    {ev.postingNote && <span className="truncate hidden sm:block" style={{ fontSize: "9px", color: "var(--text-secondary)", maxWidth: 200 }}>{ev.postingNote}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ ASSET DETAIL MODAL ═══ */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => setSelectedAsset(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="max-w-4xl w-full max-h-[90vh] overflow-auto rounded-xl"
              style={{ background: "var(--background)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>{selectedAsset.label}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, color: PLATFORM_COLORS[selectedAsset.platform] || "var(--text-secondary)", background: `${PLATFORM_COLORS[selectedAsset.platform] || "var(--text-secondary)"}15` }}>
                    {selectedAsset.platform}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { handleDeployAsset(selectedAsset); }}
                    disabled={deployingAssets[selectedAsset.formatId] === "deploying" || deployingAssets[selectedAsset.formatId] === "deployed"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: deployingAssets[selectedAsset.formatId] === "deployed" ? "rgba(17,17,17,0.15)" : deployingAssets[selectedAsset.formatId] === "deploying" ? "var(--border)" : "#666666",
                      color: "#fff", fontSize: "12px", fontWeight: 600,
                      opacity: deployingAssets[selectedAsset.formatId] === "deploying" ? 0.6 : 1,
                    }}
                  >
                    {deployingAssets[selectedAsset.formatId] === "deploying" ? <><Loader2 size={12} className="animate-spin" /> Deploying...</>
                      : deployingAssets[selectedAsset.formatId] === "deployed" ? <><Check size={12} /> Deployed</>
                      : <><Send size={12} /> Deploy to {selectedAsset.platform}</>}
                  </button>
                  {/* Edit / Template buttons */}
                  {selectedAsset.type === "image" && (
                    <>
                      <button
                        onClick={() => {
                          setGalleryFormatId(selectedAsset.formatId);
                          setGalleryOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                        style={{ background: "var(--border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}
                      >
                        <LayoutGrid size={12} /> Templates
                      </button>
                      {assetTemplates[selectedAsset.formatId] && getTemplateById(assetTemplates[selectedAsset.formatId]) && (
                        <button
                          onClick={() => { setEditorAsset(selectedAsset); setSelectedAsset(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                          style={{ background: "rgba(17,17,17,0.15)", color: "var(--ora-signal)", fontSize: "12px", fontWeight: 600, border: "1px solid rgba(17,17,17,0.3)" }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => handleSaveAsset(selectedAsset)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "12px", fontWeight: 600 }}>
                    <Save size={12} /> Save to Library
                  </button>
                  <button onClick={() => handleDownload(selectedAsset)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: "var(--border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>
                    <Download size={12} /> Export
                  </button>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                    <X size={16} style={{ color: "var(--text-secondary)" }} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {/* Carousel slides browser */}
                {selectedAsset.carouselSlides && selectedAsset.carouselSlides.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutGrid size={14} style={{ color: "var(--ora-signal)" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                        Carousel — {selectedAsset.carouselSlides.length} slides
                      </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
                      {selectedAsset.carouselSlides.map((slide, idx) => (
                        <div key={idx} className="flex-shrink-0 rounded-xl overflow-hidden relative" style={{ width: 220, background: "#0e0d0c", border: "1px solid var(--border)" }}>
                          {slide.imageUrl ? (
                            <img src={slide.imageUrl} alt={`Slide ${idx + 1}`} className="w-full" style={{ aspectRatio: "1/1", objectFit: "cover" }} />
                          ) : (
                            <div className="flex items-center justify-center" style={{ aspectRatio: "1/1", background: "var(--background)" }}>
                              {slide.status === "generating" ? <Loader2 size={16} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                                : <AlertCircle size={16} style={{ color: "var(--text-secondary)" }} />}
                            </div>
                          )}
                          {brandLogoUrl && slide.imageUrl && (
                            <img src={brandLogoUrl} alt="Logo" className="absolute" style={{ bottom: 6, right: 6, width: "16%", maxWidth: 32, height: "auto", objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))", opacity: 0.9, borderRadius: 2 }} />
                          )}
                          <div className="p-3">
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--ora-signal)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Slide {idx + 1}</span>
                            <p className="line-clamp-3 mt-1" style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>{slide.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Single image (non-carousel) */}
                {selectedAsset.imageUrl && !selectedAsset.videoUrl && (!selectedAsset.carouselSlides || selectedAsset.carouselSlides.length <= 1) && (
                  <div className="relative inline-block w-full">
                    {assetTemplates[selectedAsset.formatId] && getTemplateById(assetTemplates[selectedAsset.formatId]) ? (
                      <div className="rounded-xl overflow-hidden" style={{ background: "#0e0d0c" }}>
                        {getTemplateById(assetTemplates[selectedAsset.formatId])!.htmlTemplate ? (
                          <HTMLTemplateEngine
                            template={getTemplateById(assetTemplates[selectedAsset.formatId])!}
                            asset={selectedAsset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                            width={700} showExport onExport={(url) => {
                              const a = document.createElement("a"); a.href = url;
                              a.download = `${selectedAsset.label || "asset"}.png`; a.click();
                            }}
                          />
                        ) : getTemplateById(assetTemplates[selectedAsset.formatId])!.svgTemplate ? (
                          <SVGTemplateEngine
                            template={getTemplateById(assetTemplates[selectedAsset.formatId])!}
                            asset={selectedAsset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                            width={700} showExport onExport={(url) => {
                              const a = document.createElement("a"); a.href = url;
                              a.download = `${selectedAsset.label || "asset"}.png`; a.click();
                            }}
                          />
                        ) : (
                          <TemplateEngine
                            template={getTemplateById(assetTemplates[selectedAsset.formatId])!}
                            asset={selectedAsset as any} vault={vault as any} brandLogoUrl={brandLogoUrl}
                            width={700} showExport onExport={(url) => {
                              const a = document.createElement("a"); a.href = url;
                              a.download = `${selectedAsset.label || "asset"}.png`; a.click();
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <img src={selectedAsset.imageUrl} alt={selectedAsset.label} className="w-full rounded-xl max-h-[50vh] object-contain" style={{ background: "#0e0d0c" }} />
                        {brandLogoUrl && (
                          <img src={brandLogoUrl} alt="Brand logo" className="absolute" style={{ bottom: 12, right: 12, width: "10%", maxWidth: 64, minWidth: 28, height: "auto", objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))", opacity: 0.9, borderRadius: 3 }} />
                        )}
                      </>
                    )}
                  </div>
                )}
                {selectedAsset.videoUrl && (
                  <div className="space-y-2">
                    <div className="relative">
                      <video
                        id={`modal-video-${selectedAsset.id}`}
                        src={selectedAsset.videoUrl}
                        className="w-full rounded-xl" controls autoPlay
                        muted
                        loop playsInline
                        style={{ maxHeight: "50vh", background: "#0e0d0c" }}
                      />
                      {brandLogoUrl && (
                        <img src={brandLogoUrl} alt="Brand logo" className="absolute" style={{ bottom: 16, right: 16, width: "10%", maxWidth: 64, minWidth: 28, height: "auto", objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))", opacity: 0.9, borderRadius: 3 }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Subject line (email) */}
                {selectedAsset.subject && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Subject Line
                    </span>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.5 }}>
                      {selectedAsset.subject}
                    </p>
                  </div>
                )}

                {/* Headline */}
                {selectedAsset.headline && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Headline
                    </span>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
                      {selectedAsset.headline}
                    </p>
                  </div>
                )}

                {/* Meta Description (SEO articles) */}
                {selectedAsset.metaDescription && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid rgba(17,17,17,0.15)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--ora-signal)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Meta Description (SEO)
                    </span>
                    <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5, fontStyle: "italic" }}>
                      {selectedAsset.metaDescription}
                    </p>
                    <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: 4, display: "block" }}>
                      {selectedAsset.metaDescription.length}/155 chars
                    </span>
                  </div>
                )}

                {/* Main copy / caption */}
                {(selectedAsset.caption || selectedAsset.copy) && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                      {(selectedAsset.formatId === "blog-article" || selectedAsset.formatId === "linkedin-article") ? "Article" : selectedAsset.type === "text" ? "Body Copy" : "Caption"}
                    </span>
                    <div style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}
                      dangerouslySetInnerHTML={(selectedAsset.formatId === "blog-article" || selectedAsset.formatId === "linkedin-article")
                        ? { __html: (selectedAsset.caption || selectedAsset.copy || "")
                            .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:var(--foreground);margin:20px 0 8px">$1</h3>')
                            .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:var(--foreground);margin:24px 0 10px">$1</h2>')
                            .replace(/^- (.+)$/gm, '<li style="margin-left:16px;margin-bottom:4px">$1</li>')
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n\n/g, '<br/><br/>')
                          }
                        : undefined
                      }
                    >
                      {(selectedAsset.formatId === "blog-article" || selectedAsset.formatId === "linkedin-article") ? undefined : (selectedAsset.caption || selectedAsset.copy)}
                    </div>
                    {(selectedAsset.formatId === "blog-article" || selectedAsset.formatId === "linkedin-article") && (
                      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {((selectedAsset.caption || selectedAsset.copy || "").split(/\s+/).length)} words
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          ~{Math.ceil((selectedAsset.caption || selectedAsset.copy || "").split(/\s+/).length / 250)} min read
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hashtags */}
                {selectedAsset.hashtags && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Hashtags
                    </span>
                    <p style={{ fontSize: "13px", color: "var(--ora-signal)", lineHeight: 1.6 }}>{selectedAsset.hashtags}</p>
                  </div>
                )}

                {/* Features (landing page) */}
                {selectedAsset.features && selectedAsset.features.length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                      Key Features
                    </span>
                    <ul className="space-y-2">
                      {selectedAsset.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2">
                          <Check size={12} style={{ color: "var(--ora-signal)", marginTop: 3, flexShrink: 0 }} />
                          <span style={{ fontSize: "13px", color: "#C4BEB8", lineHeight: 1.5 }}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA */}
                {selectedAsset.ctaText && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                      Call to Action
                    </span>
                    <span className="inline-flex items-center px-5 py-2.5 rounded-lg" style={{ background: "var(--ora-signal)", color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                      {selectedAsset.ctaText}
                    </span>
                  </div>
                )}

                {/* Re-prompt / Regenerate */}
                {selectedAsset.type !== "text" && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                      Re-prompt & Regenerate
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={repromptText}
                        onChange={e => setRepromptText(e.target.value)}
                        placeholder={`Describe what you want instead... (current: ${selectedAsset.imagePrompt?.slice(0, 60) || selectedAsset.videoPrompt?.slice(0, 60) || "auto-generated"})`}
                        className="flex-1 rounded-lg px-4 py-2.5 transition-all"
                        style={{ background: "var(--background)", border: "1px solid rgba(26,23,20,0.04)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                        onFocus={e => (e.target.style.border = "1px solid rgba(17,17,17,0.4)")}
                        onBlur={e => (e.target.style.border = "1px solid rgba(26,23,20,0.04)")}
                        onKeyDown={e => { if (e.key === "Enter" && repromptText.trim()) handleRegenerateAsset(selectedAsset, repromptText); }}
                      />
                      <button
                        onClick={() => handleRegenerateAsset(selectedAsset, repromptText)}
                        disabled={!repromptText.trim() || regeneratingAsset === selectedAsset.formatId}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg cursor-pointer transition-all flex-shrink-0"
                        style={{
                          background: regeneratingAsset === selectedAsset.formatId ? "rgba(26,23,20,0.03)" : "var(--ora-signal)",
                          color: "#fff", fontSize: "13px", fontWeight: 600,
                          opacity: (!repromptText.trim() || regeneratingAsset === selectedAsset.formatId) ? 0.5 : 1,
                        }}
                      >
                        {regeneratingAsset === selectedAsset.formatId ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {regeneratingAsset === selectedAsset.formatId ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                    {selectedAsset.imagePrompt && (
                      <p className="mt-2" style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Current prompt: {selectedAsset.imagePrompt.slice(0, 150)}{selectedAsset.imagePrompt.length > 150 ? "..." : ""}
                      </p>
                    )}
                    {selectedAsset.videoPrompt && !selectedAsset.imagePrompt && (
                      <p className="mt-2" style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Current prompt: {selectedAsset.videoPrompt.slice(0, 150)}{selectedAsset.videoPrompt.length > 150 ? "..." : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Template selector chips */}
                {selectedAsset.type === "image" && getTemplatesForFormat(selectedAsset.formatId).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                      Layout Template
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAssetTemplates(prev => { const next = { ...prev }; delete next[selectedAsset.formatId]; return next; })}
                        className="px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: !assetTemplates[selectedAsset.formatId] ? "var(--ora-signal)" : "rgba(26,23,20,0.03)",
                          color: !assetTemplates[selectedAsset.formatId] ? "#fff" : "var(--text-secondary)",
                          fontSize: "11px", fontWeight: 600,
                          border: `1px solid ${!assetTemplates[selectedAsset.formatId] ? "var(--ora-signal)" : "rgba(26,23,20,0.04)"}`,
                        }}
                      >Raw</button>
                      {getTemplatesForFormat(selectedAsset.formatId).map(tmpl => (
                        <button
                          key={tmpl.id}
                          onClick={() => setAssetTemplates(prev => ({ ...prev, [selectedAsset.formatId]: tmpl.id }))}
                          className="px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                          style={{
                            background: assetTemplates[selectedAsset.formatId] === tmpl.id ? "var(--ora-signal)" : "rgba(26,23,20,0.03)",
                            color: assetTemplates[selectedAsset.formatId] === tmpl.id ? "#fff" : "var(--text-tertiary)",
                            fontSize: "11px", fontWeight: 600,
                            border: `1px solid ${assetTemplates[selectedAsset.formatId] === tmpl.id ? "var(--ora-signal)" : "rgba(26,23,20,0.04)"}`,
                          }}
                        >{tmpl.name}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.12)" }}>
                  <Shield size={14} style={{ color: "#666666" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#666666" }}>Brand-compliant</span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>-- Validated by Compliance Guard agent</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TEMPLATE GALLERY DIALOG ═══ */}
      <TemplateGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        formatId={galleryFormatId}
        currentTemplateId={assetTemplates[galleryFormatId]}
        onSelect={(tmplId) => {
          if (tmplId) {
            setAssetTemplates(prev => ({ ...prev, [galleryFormatId]: tmplId }));
          } else {
            setAssetTemplates(prev => { const next = { ...prev }; delete next[galleryFormatId]; return next; });
          }
        }}
      />

      {/* ═══ TEMPLATE EDITOR DIALOG ═══ */}
      {editorAsset && assetTemplates[editorAsset.formatId] && getTemplateById(assetTemplates[editorAsset.formatId]) && (
        <TemplateEditor
          open={!!editorAsset}
          onOpenChange={(open) => { if (!open) setEditorAsset(null); }}
          template={getTemplateById(assetTemplates[editorAsset.formatId])!}
          asset={editorAsset as any}
          vault={vault as any}
          brandLogoUrl={brandLogoUrl}
          onSave={(updatedTemplate) => {
            registerTemplate(updatedTemplate);
            setAssetTemplates(prev => ({ ...prev, [editorAsset.formatId]: updatedTemplate.id }));
            setEditorAsset(null);
          }}
        />
      )}

    </div>
  );
}