import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Sparkles, ImageIcon, FileText, Music, Film, Mic, Square, Paperclip,
  Loader2, Download, Columns2, RefreshCw, Rocket,
  Play, ArrowRight, Wand2, Palette, ChevronLeft, ChevronRight, X,
  Linkedin, Instagram, Facebook, Twitter, Youtube, Clapperboard,
  BookOpen, LayoutGrid, Megaphone, Smartphone, Target, Check,
  ChevronDown, Lightbulb, Package, Globe, Languages,
  Calendar, Save, Pencil, CheckCircle2, Clock, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";
import { TemplateEditor } from "../components/TemplateEditor";
import { registerTemplate, getTemplateById, getTemplatesForFormat } from "../components/templates";
import type { TemplateDefinition } from "../components/templates/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ORA STUDIO — Unified conversational creation
   "Aussi simple qu'un SMS"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type ActionType =
  | "generate-image"
  | "generate-text"
  | "generate-music"
  | "generate-video"
  | "generate-campaign"
  | "start-campaign"
  | "start-video-montage"
  | "ask-clarification";

interface StudioAction {
  type: ActionType;
  params: Record<string, any>;
  compare?: boolean;
}

interface GeneratedResult {
  type: "image" | "text" | "music" | "video" | "campaign";
  items: { url?: string; text?: string; model: string; latencyMs?: number }[];
  prompt: string;
  refImageUrl?: string;
  campaignPosts?: CampaignPost[];
  logoUrl?: string;
  campaignStartDate?: string;
  campaignDuration?: string;
}

interface CampaignPostVariant {
  model: string;
  text: string;
  hashtags?: string;
  headline?: string;
  cta?: string;
  imageUrl?: string;
  imageModel?: string;
}

interface CampaignPost {
  format: string;
  platform: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string;
  headline?: string;
  cta?: string;
  aspectRatio?: string;
  variants?: CampaignPostVariant[];
  selectedVariant?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: StudioAction | null;
  suggestions?: string[];
  result?: GeneratedResult;
  isGenerating?: boolean;
}

const COMPARE_MODELS = {
  image: [
    { id: "ora-vision", label: "ORA Vision", badge: "Luma Photon" },
    { id: "flux-pro", label: "Flux Pro", badge: "FAL" },
    { id: "dall-e", label: "DALL·E 3", badge: "OpenAI" },
    { id: "seedream-v4", label: "SeDream v4", badge: "ByteDance" },
    { id: "nano-banana", label: "Nano Banana", badge: "Higgsfield" },
    { id: "lucid-realism", label: "Lucid Realism", badge: "Leonardo" },
    { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Leonardo" },
    { id: "ideogram-3-leo", label: "Ideogram v3", badge: "Leonardo" },
    { id: "gpt-image-leo", label: "GPT Image", badge: "Leonardo" },
    { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Leonardo" },
    { id: "phoenix-1.0", label: "Phoenix 1.0", badge: "Leonardo" },
    { id: "soul", label: "Soul", badge: "Higgsfield" },
  ],
  text: [
    { id: "gpt-5", label: "GPT-5", badge: "OpenAI" },
    { id: "claude-opus", label: "Claude Opus", badge: "Anthropic" },
    { id: "claude-sonnet", label: "Claude Sonnet", badge: "Anthropic" },
    { id: "gemini-pro", label: "Gemini Pro", badge: "Google" },
    { id: "deepseek", label: "DeepSeek", badge: "DeepSeek" },
    { id: "gpt-4o", label: "GPT-4o", badge: "OpenAI" },
  ],
  video: [
    { id: "ora-motion", label: "ORA Motion", badge: "Luma Ray 2" },
    { id: "ray-flash-2", label: "Ray Flash 2", badge: "Luma" },
    { id: "veo-3.1", label: "Veo 3.1", badge: "Google" },
    { id: "sora-2", label: "Sora 2", badge: "OpenAI" },
    { id: "kling-v2.1", label: "Kling v2.1", badge: "Kuaishou" },
    { id: "seedance-2.0", label: "Seedance 2.0", badge: "ByteDance" },
    { id: "seedance-1.5-pro", label: "Seedance 1.5 Pro", badge: "ByteDance" },
    { id: "runway-gen3", label: "Runway Gen3", badge: "Runway" },
    { id: "pika", label: "Pika", badge: "Pika" },
    { id: "dop", label: "DOP", badge: "Higgsfield" },
  ],
  music: [] as { id: string; label: string; badge: string }[],
  campaign: [] as { id: string; label: string; badge: string }[],
};

export function StudioPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { getAuthHeader, accessToken, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [context, setContext] = useState<Record<string, any>>({});
  const [vault, setVault] = useState<any>(undefined);
  const [products, setProducts] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any[] | null>(null);
  const [pendingCampaign, setPendingCampaign] = useState<{ action: StudioAction; msgId: string } | null>(null);
  const [finalizingCampaign, setFinalizingCampaign] = useState<{ posts: CampaignPost[]; logoUrl?: string; brief: string; campaignStartDate?: string; campaignDuration?: string; editIdx?: number } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Voice recording (Whisper) ──
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    if (window.self !== window.top) {
      toast.error(t("studio.micBlocked"), { description: t("studio.micBlockedDesc"), duration: 8000,
        action: { label: t("studio.micOpen"), onClick: () => window.open(window.location.href, "_blank") } });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t("studio.micUnavailable"), { description: t("studio.micUnavailableDesc") });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        setRecordingDuration(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) { setIsRecording(false); return; }
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg";
          formData.append("audio", audioBlob, `recording.${ext}`);
          const res = await fetch(`${API_BASE}/transcribe`, {
            method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}` }, body: formData, signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          if (data.success && data.text) {
            setInput(prev => (prev ? prev + " " + data.text : data.text));
            toast.success(t("studio.voiceTranscribed"), { description: data.text.slice(0, 60) + (data.text.length > 60 ? "..." : "") });
            setTimeout(() => inputRef.current?.focus(), 100);
          } else {
            toast.error(t("studio.transcriptionFailed"), { description: data.error || "Erreur inconnue" });
          }
        } catch (err: any) {
          toast.error(t("studio.transcriptionError"), { description: err?.message || "Erreur réseau" });
        }
        setIsTranscribing(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error(t("studio.micDenied"), { description: t("studio.micDeniedDesc"), duration: 8000 });
      } else if (err?.name === "NotFoundError") {
        toast.error(t("studio.noMicDetected"), { description: t("studio.noMicDetectedDesc") });
      } else {
        toast.error(t("studio.micError"), { description: err?.message || t("studio.micErrorDesc") });
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // ── Attached image (reference photo) ──
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string; signedUrl?: string; uploading: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(t("studio.fileNotSupported"), { description: t("studio.fileNotSupportedDesc") }); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("studio.imageTooLarge"), { description: t("studio.imageTooLargeDesc") }); return; }
    const preview = URL.createObjectURL(file);
    setAttachedImage({ file, preview, uploading: true });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/hub/upload-ref`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.signedUrl) {
        setAttachedImage(prev => prev ? { ...prev, signedUrl: data.signedUrl, uploading: false } : null);
        toast.success(t("studio.photoAdded"));
      } else {
        toast.error(t("studio.uploadFailed"), { description: data.error || "Erreur inconnue" });
        setAttachedImage(null);
        URL.revokeObjectURL(preview);
      }
    } catch (err: any) {
      toast.error(t("studio.uploadError"), { description: err?.message || "Erreur réseau" });
      setAttachedImage(null);
      URL.revokeObjectURL(preview);
    }
  }, []);

  const removeAttachedImage = useCallback(() => {
    if (attachedImage?.preview) URL.revokeObjectURL(attachedImage.preview);
    setAttachedImage(null);
  }, [attachedImage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isGenerating]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Always load fresh vault when auth is ready (user may have changed brand)
  useEffect(() => {
    if (accessToken) {
      console.log("[studio] auth ready, loading fresh vault...");
      loadVault(true);
    }
  }, [accessToken]);

  const serverPost = useCallback((path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    console.log(`[serverPost] ${path} token=${token ? token.slice(0, 20) + "..." : "EMPTY"}`);
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...body, _token: token }),
      signal: AbortSignal.timeout(timeoutMs),
    }).then(r => r.json());
  }, [getAuthHeader]);

  const serverGet = useCallback((path: string) => {
    return fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(180_000),
    }).then(r => r.json());
  }, []);

  // Load vault + products for brand context
  const loadVault = useCallback(async (force = false) => {
    if (!force && (vault || vaultLoading)) {
      console.log(`[studio] loadVault skip: vault=${!!vault} vaultLoading=${vaultLoading}`);
      return { vault, products };
    }
    console.log(`[studio] loadVault: fetching... (force=${force})`);
    setVaultLoading(true);
    try {
      const [vaultRes, productsRes] = await Promise.all([
        serverPost("/vault/load", {}),
        serverPost("/products/list", {}),
      ]);
      console.log("[studio] loadVault results:", JSON.stringify({ vaultSuccess: vaultRes.success, productsSuccess: productsRes.success, hasVault: !!vaultRes.vault, brandName: vaultRes.vault?.brandName || vaultRes.vault?.company_name, productsCount: productsRes.products?.length }));
      const v = vaultRes.success && vaultRes.vault ? vaultRes.vault : null;
      const p = productsRes.success && Array.isArray(productsRes.products) ? productsRes.products : [];
      setVault(v); // always set — null means "loaded but empty", undefined means "not loaded yet"
      if (p.length) setProducts(p);
      setVaultLoading(false);
      return { vault: v, products: p };
    } catch (e) { console.warn("[studio] vault/products load failed:", e); }
    setVaultLoading(false);
    return { vault: null, products: [] };
  }, [vault, vaultLoading, serverPost, serverGet]);

  // Fetch connected social accounts (silent, non-blocking)
  useEffect(() => {
    if (socialAccounts !== null) return;
    if (!accessToken) return;
    fetch(`${API_BASE}/zernio/accounts/list`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ _token: `Bearer ${accessToken}` }),
    })
      .then(r => r.json())
      .then(data => { setSocialAccounts(data.success && Array.isArray(data.accounts) ? data.accounts : []); })
      .catch(() => setSocialAccounts([]));
  }, [accessToken]);

  // No onboarding redirect — users configure their brand via Brand Vault directly

  // ── Execute generation action ──
  const executeAction = useCallback(async (action: StudioAction, msgId: string) => {
    setIsGenerating(true);
    console.log(`[studio] executeAction type=${action.type} msgId=${msgId} params=`, JSON.stringify(action.params).slice(0, 200));
    try {
      let result: GeneratedResult | null = null;

      switch (action.type) {
        case "generate-image": {
          const { prompt, aspectRatio = "1:1", models } = action.params;
          // Default to 3 models in parallel for richer creation results
          const defaultModels = ["ora-vision", "flux-pro", "seedream-v4"];
          const modelList = Array.isArray(models) ? models : models ? [models] : defaultModels;
          const refUrl = attachedImage?.signedUrl || action.params.imageUrl || "";
          console.log(`[studio] generate-image refUrl=${refUrl ? "YES" : "NO"} (${refUrl.slice(0, 80)}) models=${modelList.join(",")}`);
          if (refUrl) {
            // Product photo attached → Photoroom multi-scene (pixel-perfect product in different backgrounds)
            const GENERATE_SCENES = [
              { prompt, label: "Photoroom" },
              { prompt: "lifestyle", label: "Lifestyle" },
              { prompt: "packshot", label: "Packshot" },
            ];
            const scenesToUse = GENERATE_SCENES.slice(0, modelList.length);
            const items: any[] = [];
            removeAttachedImage();
            for (const scene of scenesToUse) {
              try {
                const startRes = await serverPost("/generate/image-start", {
                  prompt: scene.prompt, model: "photon-1", aspectRatio, imageRefUrl: refUrl, refSource: "upload",
                }, 60_000);
                if (startRes.success && startRes.directResult && startRes.imageUrl) {
                  console.log(`[studio] Photoroom scene OK [${scene.label}]`);
                  items.push({ url: startRes.imageUrl, model: scene.label, latencyMs: 0 });
                }
              } catch (err) { console.warn(`[studio] Photoroom scene ${scene.label} failed:`, err); }
            }
            result = { type: "image", prompt, items, refImageUrl: refUrl };
          } else {
            // No ref image — use batch endpoint
            const res = await serverGet(
              `/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${modelList.join(",")}&aspectRatio=${aspectRatio}`
            );
            if (res.success && res.results) {
              result = {
                type: "image",
                prompt,
                items: res.results
                  .filter((r: any) => r.success && r.result?.imageUrl)
                  .map((r: any, i: number) => ({
                    url: r.result.imageUrl,
                    model: modelList[i] || "unknown",
                    latencyMs: r.result.latencyMs,
                  })),
              };
            }
          }
          break;
        }
        case "generate-text": {
          const { prompt, style = "creative" } = action.params;
          const systemPrompt = style === "professional"
            ? "You are a world-class business writer. Write clear, polished, persuasive content. Use structured formatting when appropriate (headings, bullet points). Adapt tone and length to the platform and audience."
            : "You are a world-class creative writer. Write engaging, original, high-impact content. Adapt tone, style and length to the context. Be bold and distinctive.";
          const res = await serverGet(
            `/generate/text-multi-get?prompt=${encodeURIComponent(prompt)}&models=gpt-5&systemPrompt=${encodeURIComponent(systemPrompt)}&maxTokens=4096`
          );
          if (res.success && res.results) {
            result = {
              type: "text",
              prompt,
              items: res.results
                .filter((r: any) => r.success && r.result?.text)
                .map((r: any, i: number) => ({
                  text: r.result.text,
                  model: "gpt-5",
                  latencyMs: r.result.latencyMs,
                })),
            };
          }
          break;
        }
        case "generate-music": {
          const { prompt, instrumental = true } = action.params;
          const allModels = ["suno"];
          const startRes = await serverPost("/suno/start", {
            prompt, models: allModels, instrumental,
          });
          if (startRes.success && startRes.results) {
            // Poll each task
            const tracks: any[] = [];
            for (const r of startRes.results) {
              if (!r.success || !r.taskId) continue;
              const track = await pollAudio(r.taskId);
              if (track) tracks.push({ ...track, model: r.model || "suno" });
            }
            result = {
              type: "music",
              prompt,
              items: tracks.map(t => ({
                url: t.audioUrl,
                model: t.model,
              })),
            };
          }
          break;
        }
        case "generate-video": {
          const { prompt, model = "ora-motion" } = action.params;
          const refUrl = attachedImage?.signedUrl || action.params.imageUrl || "";
          const allModels = [model];
          const items: any[] = [];
          if (refUrl) removeAttachedImage();
          for (const m of allModels) {
            const startRes = await serverGet(
              `/generate/video-start?prompt=${encodeURIComponent(prompt)}&model=${m}${refUrl ? `&imageUrl=${encodeURIComponent(refUrl)}` : ""}`
            );
            if (startRes.success && startRes.generationId) {
              const videoUrl = await pollVideo(startRes.generationId);
              if (videoUrl) items.push({ url: videoUrl, model: m });
            }
          }
          result = { type: "video", prompt, items, refImageUrl: refUrl || undefined };
          break;
        }
        case "generate-campaign": {
          const { brief, formats = ["linkedin-post"], targetAudience, objective, toneOfVoice, contentAngle, keyMessages, callToAction, language = "auto", textModels: txtModels = ["gpt-4o"], imageModels: imgModels = ["photon-1"], videoModels: vidModels = ["ora-motion"], productId, productUrl, visualStyle: campaignVisualStyle, startDate: campaignStartDate, duration: campaignDuration, theme: campaignTheme } = action.params;

          // Build product context for the brief if a product is selected
          let productBrief = brief || "";
          let productRefUrls: string[] = [];

          // ── SCRAPE PRODUCT URL: if the AI collected a product page URL, scrape it for images ──
          if (productUrl && typeof productUrl === "string" && productUrl.startsWith("http")) {
            try {
              console.log(`[studio] Scraping product URL for images: ${productUrl.slice(0, 80)}`);
              const scrapeRes = await serverPost("/products/scrape-url", { url: productUrl });
              if (scrapeRes.success && scrapeRes.product?.imageUrls?.length) {
                productRefUrls = scrapeRes.product.imageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 5);
                console.log(`[studio] Scraped ${productRefUrls.length} product images from URL`);
                // Also enrich the brief with scraped product info
                const sp = scrapeRes.product;
                if (sp.name) productBrief += `\n\nPRODUCT: ${sp.name}`;
                if (sp.description) productBrief += `\n${sp.description}`;
                if (sp.price) productBrief += ` (${sp.price} ${sp.currency || "EUR"})`;
              }
            } catch (e: any) {
              console.warn(`[studio] Product URL scrape failed:`, e?.message);
            }
          }

          // Helper: extract image URLs from a product object
          const extractProductImages = (prod: any): string[] => {
            const urls: string[] = [];
            if (prod.images?.length > 0) {
              for (const img of prod.images) {
                if (img.signedUrl) urls.push(img.signedUrl);
              }
            }
            if (urls.length === 0 && prod.imageUrls?.length > 0) {
              for (const url of prod.imageUrls) {
                if (url && typeof url === "string" && url.startsWith("http")) urls.push(url);
              }
            }
            if (urls.length === 0 && prod.imageUrl) {
              urls.push(prod.imageUrl);
            }
            return urls;
          };

          // 1. Try specific product if productId provided (only if URL scrape didn't already get images)
          let targetProduct: any = null;
          if (productRefUrls.length === 0 && productId && products.length) {
            const prod = products.find((p: any) => p.id === productId);
            if (prod) {
              targetProduct = prod;
              productBrief = `${productBrief}\n\nPRODUCT FOCUS: ${prod.name}${prod.price ? ` (${prod.price})` : ""}${prod.category ? ` — ${prod.category}` : ""}${prod.description ? `\n${prod.description}` : ""}`;
              productRefUrls = extractProductImages(prod);
              console.log(`[studio] Product "${prod.name}": ${productRefUrls.length} ref image(s) for Photoroom`);

              // If specific product has no images, try scraping its URL
              if (productRefUrls.length === 0 && prod.url) {
                try {
                  console.log(`[studio] Scraping selected product "${prod.name}" from ${prod.url.slice(0, 60)}...`);
                  const scrapeRes = await serverPost("/products/scrape-url", { url: prod.url });
                  if (scrapeRes.success && scrapeRes.product?.imageUrls?.length) {
                    productRefUrls = scrapeRes.product.imageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 5);
                    console.log(`[studio] Scraped ${productRefUrls.length} images from "${prod.name}"`);
                  }
                } catch { /* non-blocking */ }
              }

              // If still no images, search web by product name
              if (productRefUrls.length === 0) {
                const brandName = vault?.brandName || vault?.brand_name || vault?.brand_platform?.brand_name || "";
                try {
                  console.log(`[studio] 🔍 Searching web images for selected product "${prod.name}"...`);
                  const findRes = await serverPost("/products/find-images", {
                    productName: prod.name,
                    brandName,
                    productId: prod.id,
                  }, 15_000);
                  if (findRes.success && findRes.imageUrls?.length) {
                    productRefUrls = findRes.imageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 5);
                    console.log(`[studio] Found ${productRefUrls.length} web images for "${prod.name}"`);
                  }
                } catch { /* non-blocking */ }
              }
            }
          }

          // 2. FALLBACK: if no specific product refs, collect images from ALL products in catalog
          if (productRefUrls.length === 0 && products.length > 0) {
            // Debug: log what products actually contain
            console.log(`[studio] DEBUG: ${products.length} products in catalog:`);
            for (const prod of products) {
              console.log(`[studio]   "${prod.name}" — images:${prod.images?.length || 0}, imageUrls:${prod.imageUrls?.length || 0}, imageUrl:${prod.imageUrl ? "YES" : "NO"}, url:${prod.url ? "YES" : "NO"}`);
              const imgs = extractProductImages(prod);
              productRefUrls.push(...imgs);
              if (productRefUrls.length >= 5) break;
            }
            if (productRefUrls.length > 0) {
              console.log(`[studio] Using ${productRefUrls.length} ref(s) from catalog for Photoroom`);
            } else {
              console.log(`[studio] ⚠️ No product images found — attempting fallbacks...`);

              // FALLBACK A: scrape product URLs from catalog to get images
              for (const prod of products) {
                if (prod.url && productRefUrls.length < 3) {
                  try {
                    console.log(`[studio] Scraping "${prod.name}" from ${prod.url.slice(0, 60)}...`);
                    const scrapeRes = await serverPost("/products/scrape-url", { url: prod.url });
                    if (scrapeRes.success && scrapeRes.product?.imageUrls?.length) {
                      const scraped = scrapeRes.product.imageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 3);
                      productRefUrls.push(...scraped);
                      console.log(`[studio] Scraped ${scraped.length} images from "${prod.name}"`);
                    }
                  } catch { /* non-blocking */ }
                }
              }

              // FALLBACK B: search web for product images by name (last resort)
              if (productRefUrls.length === 0) {
                const brandName = vault?.brandName || vault?.brand_name || vault?.brand_platform?.brand_name || "";
                // Try finding images for the first 3 products
                for (const prod of products.slice(0, 3)) {
                  if (productRefUrls.length >= 3) break;
                  try {
                    console.log(`[studio] 🔍 Searching web images for "${prod.name}"...`);
                    const findRes = await serverPost("/products/find-images", {
                      productName: prod.name,
                      brandName,
                      productId: prod.id,
                    }, 15_000);
                    if (findRes.success && findRes.imageUrls?.length) {
                      const found = findRes.imageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 3);
                      productRefUrls.push(...found);
                      console.log(`[studio] Found ${found.length} web images for "${prod.name}"`);
                    }
                  } catch { /* non-blocking */ }
                }
              }

              if (productRefUrls.length > 0) {
                console.log(`[studio] ✅ Total: ${productRefUrls.length} product images for Photoroom`);
              } else {
                console.log(`[studio] ❌ No product images at all — Photoroom will be skipped, using generative AI only`);
              }
            }
          }

          // Normalize models to arrays
          const textModelList: string[] = Array.isArray(txtModels) ? txtModels : [txtModels];
          const imageModelList: string[] = Array.isArray(imgModels) ? imgModels : [imgModels];

          // 1. Generate texts with all selected text models (in parallel)
          // Inject visual style into the brief so AI generates scene-appropriate imagePrompts
          const styledBrief = campaignVisualStyle
            ? `${productBrief}\n\nVISUAL DIRECTION: All imagePrompt fields MUST describe a "${campaignVisualStyle}" scene. Adapt lighting, background, composition to match this visual style.`
            : productBrief;

          const textGenPayload = {
            brief: styledBrief,
            targetAudience: targetAudience || "",
            formats: formats.join(","),
            campaignObjective: objective || "",
            toneOfVoice: toneOfVoice || "",
            contentAngle: contentAngle || "",
            keyMessages: keyMessages || "",
            callToAction: callToAction || "",
            language,
            ...(campaignStartDate ? { campaignStartDate } : {}),
            ...(campaignDuration ? { campaignDuration } : {}),
            ...(campaignTheme ? { campaignTheme } : {}),
          };

          const textResults = await Promise.all(
            textModelList.map(model =>
              serverPost("/campaign/generate-texts", { ...textGenPayload, model })
                .then(res => ({ model, success: res.success, copyMap: res.copyMap || {} }))
                .catch(() => ({ model, success: false, copyMap: {} }))
            )
          );

          // Use first successful result as primary, others as variants
          const primaryText = textResults.find(r => r.success && Object.keys(r.copyMap).length > 0) || textResults[0];
          const variantTexts = textResults.filter(r => r !== primaryText && r.success && Object.keys(r.copyMap).length > 0);

          const posts: CampaignPost[] = [];
          if (primaryText?.copyMap) {
            for (const [formatId, copy] of Object.entries(primaryText.copyMap) as [string, any][]) {
              const platform = formatId.split("-")[0];
              const extractText = (c: any) => c.caption || c.text || c.copy || c.body || c.content || c.message || "";
              const extractHashtags = (c: any) => Array.isArray(c.hashtags) ? c.hashtags.join(" ") : c.hashtags || "";
              const extractHeadline = (c: any) => c.headline || c.subject || "";
              const extractCta = (c: any) => c.ctaText || c.cta || "";

              // Build variants from other models
              const variants: CampaignPostVariant[] = [];

              // Primary model variant
              variants.push({
                model: primaryText.model,
                text: extractText(copy),
                hashtags: extractHashtags(copy),
                headline: extractHeadline(copy),
                cta: extractCta(copy),
              });

              // Other model variants
              for (const vt of variantTexts) {
                const vCopy = (vt.copyMap as any)?.[formatId];
                if (vCopy) {
                  variants.push({
                    model: vt.model,
                    text: extractText(vCopy),
                    hashtags: extractHashtags(vCopy),
                    headline: extractHeadline(vCopy),
                    cta: extractCta(vCopy),
                  });
                }
              }

              posts.push({
                format: formatId,
                platform,
                text: extractText(copy),
                hashtags: extractHashtags(copy),
                headline: extractHeadline(copy),
                cta: extractCta(copy),
                variants: variants.length > 1 ? variants : undefined,
                selectedVariant: 0,
              });
            }
          }

          // 2. Build brand visual style suffix from vault
          const brandVisualParts: string[] = [];
          if (vault) {
            const vBrandName = vault.brandName || vault.brand_name || "";
            if (vBrandName) brandVisualParts.push(`Brand: ${vBrandName}`);
            const colors = vault.colors || vault.colorPalette || vault.brand_colors;
            if (colors) brandVisualParts.push(`Brand colors: ${Array.isArray(colors) ? colors.join(", ") : colors}`);
            const photoStyle = vault.photoStyle || vault.visualStyle || vault.imageStyle;
            if (photoStyle) brandVisualParts.push(`Photo style: ${photoStyle}`);
            if (Array.isArray(vault.sections)) {
              for (const s of vault.sections) {
                if (!Array.isArray(s.items)) continue;
                for (const item of s.items) {
                  const lbl = (item.label || "").toLowerCase();
                  if (lbl.includes("couleur") || lbl.includes("color") || lbl.includes("palette")) {
                    brandVisualParts.push(`Brand colors: ${item.value}`);
                  }
                  if (lbl.includes("photo") || lbl.includes("visuel") || lbl.includes("visual") || lbl.includes("image")) {
                    brandVisualParts.push(`Visual style: ${item.value}`);
                  }
                  if (lbl.includes("typograph") || lbl.includes("font")) {
                    brandVisualParts.push(`Typography: ${item.value}`);
                  }
                }
              }
            }
          }
          const brandVisualSuffix = brandVisualParts.length > 0
            ? `. ${brandVisualParts.join(". ")}.`
            : "";

          // 3. Split visual formats into IMAGE vs VIDEO
          const VIDEO_FORMAT_KEYWORDS = ["video", "reel", "short"];
          const isVideoFormat = (f: string) => VIDEO_FORMAT_KEYWORDS.some(k => f.includes(k));

          const allVisualFormats = posts.filter(p =>
            !p.format.includes("text") && !p.format.includes("article") && !p.format.includes("thread")
          );
          const imageOnlyFormats = allVisualFormats.filter(p => !isVideoFormat(p.format));
          const videoFormats = allVisualFormats.filter(p => isVideoFormat(p.format));

          // 3a. Generate IMAGES for image formats
          // PRODUCT PRESENT → Photoroom only (pixel-perfect product, multiple scene variants)
          // NO PRODUCT → AI generative models (text-to-image)
          const PHOTOROOM_SCENE_VARIANTS = [
            { id: "lifestyle", label: "Lifestyle", prompt: "Beautiful natural lifestyle environment, warm golden hour, editorial photography" },
            { id: "packshot", label: "Packshot", prompt: "packshot" },
            { id: "cinematic", label: "Cinématique", prompt: "Dramatic cinematic scene, moody atmospheric lighting, deep contrast, cinematic color grading" },
            { id: "editorial", label: "Editorial", prompt: "High-fashion editorial setting, clean minimal studio, dramatic directional lighting" },
          ];

          for (let i = 0; i < Math.min(imageOnlyFormats.length, 4); i++) {
            const copyEntry = (primaryText.copyMap as any)?.[imageOnlyFormats[i].format];
            const basePrompt = copyEntry?.imagePrompt || `${brief}, ${imageOnlyFormats[i].platform} ${imageOnlyFormats[i].format}, professional`;
            const visualStyleDirective = campaignVisualStyle ? ` Visual style: ${campaignVisualStyle}.` : "";
            const enrichedPrompt = `${basePrompt}${visualStyleDirective}${brandVisualSuffix}`;
            const aspectRatio = imageOnlyFormats[i].format.includes("story")
              ? "9:16"
              : imageOnlyFormats[i].format.includes("post") && imageOnlyFormats[i].platform === "instagram"
                ? "1:1"
                : "16:9";

            if (productRefUrls.length > 0) {
              // ── PRODUCT MODE: Photoroom generates multiple scene variants (pixel-perfect product) ──
              const refUrl = productRefUrls[i % productRefUrls.length];

              // Primary scene: use the campaign prompt or visual style
              const primaryScenePrompt = campaignVisualStyle || enrichedPrompt;

              // Build scene list: primary prompt first, then alternate scenes
              const scenePrompts = [
                { prompt: primaryScenePrompt.slice(0, 500), label: "Photoroom" },
                ...PHOTOROOM_SCENE_VARIANTS
                  .filter(s => !primaryScenePrompt.toLowerCase().includes(s.id))
                  .slice(0, 2)
                  .map(s => ({ prompt: s.prompt, label: `Photoroom (${s.label})` })),
              ];

              // Generate all Photoroom variants in parallel
              const prResults = await Promise.all(
                scenePrompts.map(async (scene) => {
                  try {
                    console.log(`[studio] Photoroom [${imageOnlyFormats[i].format}/${scene.label}]: ref=${refUrl.slice(0, 60)}`);
                    const prRes = await fetch(`${API_BASE}/generate/image-start`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
                      body: JSON.stringify({
                        prompt: scene.prompt,
                        imageRefUrl: refUrl,
                        refSource: "upload",
                        aspectRatio,
                        model: "photon-1",
                        _token: getAuthHeader(),
                      }),
                      signal: AbortSignal.timeout(60_000),
                    });
                    const prData = await prRes.json();
                    if (prData.success && (prData.imageUrl || prData.results?.[0]?.result?.imageUrl)) {
                      const url = prData.imageUrl || prData.results[0].result.imageUrl;
                      console.log(`[studio] Photoroom OK [${scene.label}]: ${url.slice(0, 60)}`);
                      return { model: "photoroom", imageUrl: url, imageModel: scene.label };
                    }
                    return { model: "photoroom", imageUrl: null, imageModel: scene.label };
                  } catch (e: any) {
                    console.warn(`[studio] Photoroom [${scene.label}] failed:`, e?.message);
                    return { model: "photoroom", imageUrl: null, imageModel: scene.label };
                  }
                })
              );

              const successfulPr = prResults.filter(r => r.imageUrl);
              if (successfulPr.length > 0) {
                imageOnlyFormats[i].imageUrl = successfulPr[0].imageUrl!;
              }
              // Add scene variants
              if (successfulPr.length > 1) {
                imageOnlyFormats[i].variants = successfulPr.map(r => ({
                  model: r.model,
                  text: imageOnlyFormats[i].text,
                  imageUrl: r.imageUrl!,
                  imageModel: r.imageModel,
                }));
                imageOnlyFormats[i].selectedVariant = 0;
              }
            } else {
              // ── NO PRODUCT: AI generative models (text-to-image) ──
              const imgResults = await Promise.all(
                imageModelList.map(model =>
                  serverGet(
                    `/generate/image-via-get?prompt=${encodeURIComponent(enrichedPrompt)}&models=${model}&aspectRatio=${aspectRatio}`
                  ).then(res => ({
                    model,
                    imageUrl: res.success && res.results?.[0]?.result?.imageUrl ? res.results[0].result.imageUrl : null,
                  })).catch(() => ({ model, imageUrl: null }))
                )
              );

              const primaryImg = imgResults.find(r => r.imageUrl);
              if (primaryImg) {
                imageOnlyFormats[i].imageUrl = primaryImg.imageUrl!;
              }
              if (imgResults.filter(r => r.imageUrl).length > 1) {
                imageOnlyFormats[i].variants = imgResults
                  .filter(r => r.imageUrl)
                  .map(r => ({ model: r.model, text: imageOnlyFormats[i].text, imageUrl: r.imageUrl!, imageModel: r.model }));
                imageOnlyFormats[i].selectedVariant = 0;
              }
            }
          }

          // 3b. Generate VIDEOS for video formats (reel, tiktok-video, linkedin-video, youtube-short, facebook-video)
          if (videoFormats.length > 0) {
            console.log(`[studio] Generating ${videoFormats.length} video(s) for formats: ${videoFormats.map(v => v.format).join(", ")}`);

            // Launch all video generations in parallel (start + poll)
            const videoPromises = videoFormats.slice(0, 3).map(async (vf, i) => {
              const copyEntry = (primaryText.copyMap as any)?.[vf.format];
              const videoPrompt = copyEntry?.videoPrompt || copyEntry?.imagePrompt || `${brief}, ${vf.platform} ${vf.format}, professional cinematic`;
              const visualStyleDirective = campaignVisualStyle ? ` Visual style: ${campaignVisualStyle}.` : "";
              const fullVideoPrompt = `${videoPrompt}${visualStyleDirective}${brandVisualSuffix}`.slice(0, 500);
              const aspectRatio = vf.format.includes("reel") || vf.format.includes("short") || vf.format.includes("tiktok")
                ? "9:16" : "16:9";

              // If we have a product image, use it as image-to-video source
              const imageUrlForVideo = productRefUrls.length > 0 ? productRefUrls[i % productRefUrls.length] : undefined;

              try {
                console.log(`[studio] Video START [${vf.format}]: prompt="${fullVideoPrompt.slice(0, 80)}...", imageRef=${imageUrlForVideo ? "yes" : "no"}`);
                const videoModel = Array.isArray(vidModels) && vidModels.length > 0 ? vidModels[0] : "ora-motion";
                const startRes = await serverGet(
                  `/generate/video-start?prompt=${encodeURIComponent(fullVideoPrompt)}&model=${videoModel}${imageUrlForVideo ? `&imageUrl=${encodeURIComponent(imageUrlForVideo)}` : ""}&aspectRatio=${aspectRatio}`
                );
                if (startRes.success && startRes.generationId) {
                  console.log(`[studio] Video POLLING [${vf.format}]: genId=${startRes.generationId}`);
                  const videoUrl = await pollVideo(startRes.generationId);
                  if (videoUrl) {
                    console.log(`[studio] Video OK [${vf.format}]: ${videoUrl.slice(0, 80)}`);
                    vf.videoUrl = videoUrl;
                  } else {
                    console.warn(`[studio] Video TIMEOUT/FAIL [${vf.format}]`);
                  }
                } else {
                  console.warn(`[studio] Video START failed [${vf.format}]:`, startRes.error || "no generationId");
                }
              } catch (e: any) {
                console.warn(`[studio] Video error [${vf.format}]:`, e?.message);
              }

              // Also generate a thumbnail image for the video card (non-blocking for UX)
              try {
                const thumbPrompt = copyEntry?.imagePrompt || fullVideoPrompt;
                const thumbRes = await serverGet(
                  `/generate/image-via-get?prompt=${encodeURIComponent(thumbPrompt)}&models=${imageModelList[0] || "photon-1"}&aspectRatio=${aspectRatio}`
                );
                if (thumbRes.success && thumbRes.results?.[0]?.result?.imageUrl) {
                  vf.imageUrl = thumbRes.results[0].result.imageUrl;
                }
              } catch { /* thumbnail is optional */ }
            });

            await Promise.all(videoPromises);
          }

          if (posts.length > 0) {
            result = {
              type: "campaign",
              prompt: brief || "",
              items: [],
              campaignPosts: posts,
              logoUrl: vault?.logo_url || vault?.logoUrl || undefined,
              campaignStartDate: campaignStartDate as string | undefined,
              campaignDuration: campaignDuration as string | undefined,
            };
          }
          break;
        }
        case "start-campaign": {
          setContext(prev => ({ ...prev, mode: "campaign", campaignBrief: action.params }));
          break;
        }
        case "start-video-montage": {
          navigate(`/hub/video-editor`);
          break;
        }
      }

      if (result && (result.items.length > 0 || (result.campaignPosts && result.campaignPosts.length > 0))) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, result, isGenerating: false } : m
        ));
      } else if (action.type !== "start-campaign" && action.type !== "start-video-montage") {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, isGenerating: false } : m
        ));
      }
    } catch (err) {
      console.error("[studio] generation error:", err);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isGenerating: false } : m
      ));
      toast.error(t("studio.generationError"));
    }
    setIsGenerating(false);
  }, [serverGet, serverPost, navigate, attachedImage, removeAttachedImage, products, vault]);

  // Polling helpers
  async function pollVideo(genId: string): Promise<string | null> {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${API_BASE}/generate/video-status?id=${genId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }).then(r => r.json());
        if (res.state === "completed" && res.videoUrl) return res.videoUrl;
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }

  async function pollAudio(taskId: string): Promise<any | null> {
    for (let i = 0; i < 72; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${API_BASE}/suno/poll?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }).then(r => r.json());
        if (res.status === "DONE" && res.track) return res.track;
        if (res.status === "FAILED") return null;
      } catch { /* continue */ }
    }
    return null;
  }

  // ── Send message ──
  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isThinking) return;
    if (!text) setInput("");

    // ── INSPIRE → CAMPAIGN: idea from welcome screen, switch to campaign mode and send ──
    if (msg.startsWith("__INSPIRE__:")) {
      const idea = msg.slice("__INSPIRE__:".length).trim();
      setContext(prev => ({ ...prev, mode: "campaign" }));
      // Small delay to let mode update, then re-send as campaign message
      await new Promise(r => setTimeout(r, 50));
      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: idea };
      setMessages(prev => [...prev, userMsg]);
      setIsThinking(true);
      try {
        let vaultData = vault;
        let productsData = products;
        if (!vaultData) {
          const loaded = await loadVault(true);
          vaultData = loaded.vault;
          productsData = loaded.products;
        }
        const res = await serverPost("/studio/chat", {
          message: idea,
          history: [],
          context: {
            mode: "campaign",
            ...((vaultData || vault)?.brand_platform ? { brand_platform: (vaultData || vault).brand_platform } : {}),
            ...((vaultData || vault)?.gammes ? { gammes: (vaultData || vault).gammes } : {}),
            ...((vaultData || vault)?.tone ? { tone: (vaultData || vault).tone } : {}),
            ...((vaultData || vault)?.logo_url || (vaultData || vault)?.logoUrl ? { logo_url: (vaultData || vault).logo_url || (vaultData || vault).logoUrl } : {}),
            ...((vaultData || vault)?.voice_profile ? { voice_profile: (vaultData || vault).voice_profile } : {}),
            ...((vaultData || vault)?.universes?.length ? { universes: (vaultData || vault).universes } : {}),
            ...((vaultData || vault)?.product_universes?.length ? { product_universes: (vaultData || vault).product_universes } : {}),
            ...((vaultData || vault)?.competitors_list?.length ? { competitors_list: (vaultData || vault).competitors_list } : {}),
            ...((vaultData || vault)?.text_calibration ? { text_calibration: (vaultData || vault).text_calibration } : {}),
            ...((vaultData || vault)?.tagline ? { tagline: (vaultData || vault).tagline } : {}),
            ...((vaultData || vault)?.mission ? { mission: (vaultData || vault).mission } : {}),
            ...((vaultData || vault)?.values ? { values: (vaultData || vault).values } : {}),
            ...((vaultData || vault)?.target_audiences?.length ? { target_audiences: (vaultData || vault).target_audiences } : {}),
            ...((productsData?.length || products?.length) ? { products: (productsData?.length ? productsData : products).map((p: any) => ({ id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, tagline: p.tagline, features: p.features, url: p.url })).slice(0, 20) } : {}),
          },
        });
        if (res.success) {
          const assistMsg: ChatMessage = {
            id: `assist-${Date.now()}`,
            role: "assistant",
            content: res.reply || "",
            action: res.action || null,
            suggestions: res.suggestions || [],
            isGenerating: false,
          };
          setMessages(prev => [...prev, assistMsg]);
          if (res.action?.type === "generate-campaign") {
            setPendingCampaign({ action: res.action, msgId: assistMsg.id });
          } else if (res.action?.type === "start-campaign") {
            setContext(prev => ({ ...prev, mode: "campaign", campaignBrief: res.action.params }));
          }
        }
      } catch { /* silent */ }
      setIsThinking(false);
      return;
    }

    // ── CAMPAIGN MODE shortcut: load vault first, then show contextual welcome ──
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Always campaign mode — Studio = agence
      if (!context.mode) setContext(prev => ({ ...prev, mode: "campaign" }));
      const isCampaignMode = true;

      // Load vault + products (always — brand context enriches all generations)
      let vaultData = vault;
      let productsData = products;
      if (!vaultData) {
        const loaded = await loadVault();
        vaultData = loaded.vault;
        productsData = loaded.products;
      }

      // Count campaign exchanges to force generation after enough brief questions
      const userMsgCount = isCampaignMode
        ? messages.filter(m => m.role === "user").length + 1
        : 0;
      const forceGenerate = isCampaignMode && userMsgCount >= 8;

      const res = await serverPost("/studio/chat", {
        message: forceGenerate
          ? `${msg} [GÉNÉREZ MAINTENANT]`
          : msg,
        history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        context: {
          ...context,
          mode: "campaign",
          ...((vaultData || vault)?.brand_platform ? { brand_platform: (vaultData || vault).brand_platform } : {}),
          ...((vaultData || vault)?.gammes ? { gammes: (vaultData || vault).gammes } : {}),
          ...((vaultData || vault)?.tone ? { tone: (vaultData || vault).tone } : {}),
          ...((vaultData || vault)?.logo_url || (vaultData || vault)?.logoUrl ? { logo_url: (vaultData || vault).logo_url || (vaultData || vault).logoUrl } : {}),
          ...((vaultData || vault)?.voice_profile ? { voice_profile: (vaultData || vault).voice_profile } : {}),
          ...((vaultData || vault)?.universes?.length ? { universes: (vaultData || vault).universes } : {}),
          ...((vaultData || vault)?.product_universes?.length ? { product_universes: (vaultData || vault).product_universes } : {}),
          ...((vaultData || vault)?.competitors_list?.length ? { competitors_list: (vaultData || vault).competitors_list } : {}),
          ...((vaultData || vault)?.text_calibration ? { text_calibration: (vaultData || vault).text_calibration } : {}),
          ...((vaultData || vault)?.tagline ? { tagline: (vaultData || vault).tagline } : {}),
          ...((vaultData || vault)?.mission ? { mission: (vaultData || vault).mission } : {}),
          ...((vaultData || vault)?.values ? { values: (vaultData || vault).values } : {}),
          ...((vaultData || vault)?.target_audiences?.length ? { target_audiences: (vaultData || vault).target_audiences } : {}),
          ...((productsData?.length || products?.length) ? { products: (productsData?.length ? productsData : products).map((p: any) => ({ id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, tagline: p.tagline, features: p.features, url: p.url })).slice(0, 20) } : {}),
          ...(forceGenerate ? { force_generate: true } : {}),
          ...(attachedImage?.signedUrl ? { hasReferenceImage: true, referenceImageUrl: attachedImage.signedUrl } : {}),
        },
      });

      if (res.success) {
        const assistMsg: ChatMessage = {
          id: `assist-${Date.now()}`,
          role: "assistant",
          content: res.reply || "",
          action: res.action || null,
          suggestions: res.suggestions || [],
          isGenerating: !!res.action && ["generate-image", "generate-text", "generate-music", "generate-video"].includes(res.action?.type),
        };
        setMessages(prev => [...prev, assistMsg]);

        // Auto-execute generation actions (except campaign — show config panel first)
        if (res.action?.type === "generate-campaign") {
          // Show config panel instead of auto-generating
          setPendingCampaign({ action: res.action, msgId: assistMsg.id });
          setMessages(prev => prev.map(m => m.id === assistMsg.id ? { ...m, isGenerating: false } : m));
        } else if (res.action && ["generate-image", "generate-text", "generate-music", "generate-video"].includes(res.action.type)) {
          executeAction(res.action, assistMsg.id);
        } else if (res.action?.type === "start-campaign") {
          setContext(prev => ({ ...prev, mode: "campaign", campaignBrief: res.action.params }));
        } else if (res.action?.type === "start-video-montage") {
          navigate("/hub/video-editor");
        }
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: t("studio.oopsError"),
          suggestions: [t("studio.suggestImage"), t("studio.suggestMusicShort"), t("studio.suggestTextShort")],
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: t("studio.connectionLost"),
        suggestions: [],
      }]);
    }
    setIsThinking(false);
  }, [input, isThinking, messages, context, vault, products, serverPost, serverGet, loadVault, executeAction, navigate, attachedImage]);

  // ── Compare handler — opens model picker ──
  const [comparePicker, setComparePicker] = useState<{ result: GeneratedResult; selectedModels: string[] } | null>(null);

  const handleCompare = useCallback((result: GeneratedResult) => {
    const defaults = COMPARE_MODELS[result.type as keyof typeof COMPARE_MODELS] || [];
    setComparePicker({ result, selectedModels: defaults.map(m => m.id) });
  }, []);

  const handleCompareGenerate = useCallback(async () => {
    if (!comparePicker) return;
    const { result, selectedModels } = comparePicker;
    if (selectedModels.length < 2) { toast.error(t("studio.selectAtLeast2")); return; }
    setComparePicker(null);
    setIsGenerating(true);

    try {
      let compareResult: GeneratedResult | null = null;

      if (result.type === "image") {
        const refUrl = result.refImageUrl || "";
        if (refUrl) {
          // Product ref → Photoroom multi-scene compare (pixel-perfect product, different backgrounds)
          const COMPARE_SCENES = [
            { prompt: result.prompt, label: "Original" },
            { prompt: "lifestyle", label: "Lifestyle" },
            { prompt: "packshot", label: "Packshot" },
            { prompt: "cinematic", label: "Cinématique" },
            { prompt: "editorial", label: "Editorial" },
          ];
          // Use as many scenes as selectedModels.length
          const scenesToGenerate = COMPARE_SCENES.slice(0, selectedModels.length);
          const items: any[] = [];
          const prPromises = scenesToGenerate.map(async (scene) => {
            try {
              const startRes = await serverPost("/generate/image-start", {
                prompt: scene.prompt, model: "photon-1", aspectRatio: "1:1",
                imageRefUrl: refUrl, refSource: "upload",
              }, 60_000);
              if (startRes.success && startRes.directResult && startRes.imageUrl) {
                return { url: startRes.imageUrl, model: scene.label, latencyMs: 0 };
              }
              return null;
            } catch (err) { console.warn(`[studio] compare Photoroom ${scene.label} failed:`, err); return null; }
          });
          const prResults = await Promise.all(prPromises);
          for (const r of prResults) { if (r) items.push(r); }
          compareResult = { type: "image", prompt: result.prompt, items, refImageUrl: refUrl };
        } else {
          // No ref image: use batch endpoint
          const res = await serverGet(
            `/generate/image-via-get?prompt=${encodeURIComponent(result.prompt)}&models=${selectedModels.join(",")}&aspectRatio=1:1`
          );
          if (res.success && res.results) {
            compareResult = {
              type: "image", prompt: result.prompt,
              items: res.results.filter((r: any) => r.success && r.result?.imageUrl)
                .map((r: any, i: number) => ({ url: r.result.imageUrl, model: selectedModels[i] || "unknown", latencyMs: r.result.latencyMs })),
            };
          }
        }
      } else if (result.type === "text") {
        const res = await serverGet(
          `/generate/text-multi-get?prompt=${encodeURIComponent(result.prompt)}&models=${selectedModels.join(",")}&maxTokens=4096`
        );
        if (res.success && res.results) {
          compareResult = {
            type: "text", prompt: result.prompt,
            items: res.results.filter((r: any) => r.success && r.result?.text)
              .map((r: any, i: number) => ({ text: r.result.text, model: selectedModels[i] || "unknown", latencyMs: r.result.latencyMs })),
          };
        }
      } else if (result.type === "video") {
        const refUrl = result.refImageUrl || "";
        const items: any[] = [];
        for (const m of selectedModels) {
          const startRes = await serverGet(
            `/generate/video-start?prompt=${encodeURIComponent(result.prompt)}&model=${m}${refUrl ? `&imageUrl=${encodeURIComponent(refUrl)}` : ""}`
          );
          if (startRes.success && startRes.generationId) {
            const videoUrl = await pollVideo(startRes.generationId);
            if (videoUrl) items.push({ url: videoUrl, model: m });
          }
        }
        compareResult = { type: "video", prompt: result.prompt, items, refImageUrl: refUrl || undefined };
      }

      if (compareResult && compareResult.items.length > 0) {
        const msg: ChatMessage = {
          id: `compare-${Date.now()}`, role: "assistant",
          content: `Voici ${compareResult.items.length} versions à comparer :`,
          result: compareResult,
        };
        setMessages(prev => [...prev, msg]);
      } else {
        toast.error(t("studio.comparisonFailed"));
      }
    } catch (err) {
      toast.error(t("studio.comparisonFailed"));
    }
    setIsGenerating(false);
  }, [comparePicker, serverGet]);

  const showWelcome = messages.length === 0;

  return (
    <RouteGuard requiredPlan="free">
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {showWelcome ? (
              <WelcomeScreen onSend={handleSend} onFillInput={(text: string) => { setInput(text); setTimeout(() => inputRef.current?.focus(), 50); }} onSetMode={(mode: string) => setContext(prev => ({ ...prev, mode }))} vault={vault} products={products} socialAccounts={socialAccounts} onAccountConnected={() => {
                // Refresh social accounts after connection
                setTimeout(() => {
                  fetch(`${API_BASE}/zernio/accounts/list`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
                    body: JSON.stringify({ _token: `Bearer ${accessToken}` }),
                  })
                    .then(r => r.json())
                    .then(data => { if (data.success && Array.isArray(data.accounts)) setSocialAccounts(data.accounts); })
                    .catch(() => {});
                }, 1500);
              }} />
            ) : (
              <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <UserBubble content={msg.content} />
                    ) : (
                      <AssistantMessage
                        msg={msg}
                        onSuggestion={handleSend}
                        onCompare={handleCompare}
                        onFinalize={(posts, logoUrl, brief, startDate, duration, editIdx) => setFinalizingCampaign({ posts, logoUrl, brief, campaignStartDate: startDate, campaignDuration: duration, editIdx })}
                        onEdit={(item, type, prompt) => {
                          if (type === "image" && item.url) {
                            handleSend(`Édite cette image : garde le même sujet mais propose une variante différente. Image originale: ${item.url}`);
                          } else if (type === "text" && item.text) {
                            handleSend(`Réécris ce texte avec une approche différente : "${item.text.slice(0, 200)}"`);
                          }
                        }}
                      />
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
                      className="flex items-center gap-2">
                      <Sparkles size={14} className="text-muted-foreground" />
                      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{t("studio.thinking")}</span>
                    </motion.div>
                  </div>
                )}

                {/* Campaign finalizer */}
                {finalizingCampaign && (
                  <CampaignFinalizer
                    posts={finalizingCampaign.posts}
                    logoUrl={finalizingCampaign.logoUrl}
                    brief={finalizingCampaign.brief}
                    vault={vault}
                    serverPost={serverPost}
                    serverGet={serverGet}
                    onClose={() => setFinalizingCampaign(null)}
                    onSaved={() => { setFinalizingCampaign(null); toast.success(t("studio.campaignSaved")); }}
                    campaignStartDate={finalizingCampaign.campaignStartDate}
                    campaignDuration={finalizingCampaign.campaignDuration}
                    initialEditIdx={finalizingCampaign.editIdx}
                  />
                )}

                {/* Campaign config panel */}
                {pendingCampaign && (
                  <CampaignConfigPanel
                    params={pendingCampaign.action.params}
                    products={products}
                    vault={vault}
                    onGenerate={(finalParams) => {
                      const action = { ...pendingCampaign.action, params: finalParams };
                      const msgId = pendingCampaign.msgId;
                      setPendingCampaign(null);
                      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isGenerating: true } : m));
                      executeAction(action, msgId);
                    }}
                    onCancel={() => setPendingCampaign(null)}
                    serverPost={serverPost}
                  />
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* ── Input bar ── */}
          <div className="flex-shrink-0 px-5 pb-5 pt-2">
            <div className="max-w-2xl mx-auto">
              {/* Attached image preview + quick suggestions */}
              {attachedImage && (
                <div className="mb-2 px-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <img src={attachedImage.preview} className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid var(--border)" }} alt="" />
                      {attachedImage.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <Loader2 size={16} className="animate-spin text-white" />
                        </div>
                      )}
                      <button onClick={removeAttachedImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "var(--foreground)", color: "var(--background)" }}>
                        <X size={10} />
                      </button>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {attachedImage.uploading ? t("studio.uploadInProgress") : t("studio.refPhotoQuestion")}
                    </span>
                  </div>
                  {!attachedImage.uploading && attachedImage.signedUrl && (
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {t("studio.photoReadyHint")}
                    </span>
                  )}
                </div>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachImage(f); e.target.value = ""; }} />
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                  title={t("studio.attachPhoto")}>
                  <Paperclip size={15} />
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t("studio.placeholder")}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: "14px" }}
                />
                {isTranscribing ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--foreground)" }} />
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 500 }}>{t("studio.transcription")}</span>
                  </div>
                ) : isRecording ? (
                  <button onClick={stopRecording}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all flex-shrink-0"
                    style={{ background: "rgba(212, 24, 61, 0.1)" }}
                    title={t("studio.stopRecording")}>
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Square size={12} style={{ color: "#d4183d", fill: "#d4183d" }} />
                    </motion.div>
                    <span style={{ fontSize: "11px", color: "#d4183d", fontWeight: 600 }}>
                      {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                    </span>
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={isThinking || isGenerating}
                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t("studio.voicePrompt")}>
                    <Mic size={15} />
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isThinking || isGenerating}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 transition-all"
                  style={{
                    background: input.trim() ? "var(--foreground)" : "transparent",
                    color: input.trim() ? "var(--background)" : "var(--muted-foreground)",
                  }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compare Model Picker Modal ── */}
      <AnimatePresence>
        {comparePicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setComparePicker(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="rounded-2xl p-6 w-full max-w-md mx-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>{t("studio.compareModelsTitle")}</h3>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>
                    {t("studio.compareModelsDesc")} ({comparePicker.selectedModels.length} {t("studio.compareSelectedSuffix")})
                  </p>
                </div>
                <button onClick={() => setComparePicker(null)} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-5" style={{ maxHeight: 320, overflowY: "auto" }}>
                {(COMPARE_MODELS[comparePicker.result.type as keyof typeof COMPARE_MODELS] || []).map(model => {
                  const selected = comparePicker.selectedModels.includes(model.id);
                  return (
                    <button key={model.id}
                      onClick={() => setComparePicker(prev => {
                        if (!prev) return null;
                        const models = selected
                          ? prev.selectedModels.filter(id => id !== model.id)
                          : [...prev.selectedModels, model.id];
                        return { ...prev, selectedModels: models };
                      })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer"
                      style={{
                        background: selected ? "var(--secondary)" : "transparent",
                        border: `1px solid ${selected ? "var(--foreground)" : "var(--border)"}`,
                      }}>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: selected ? "var(--foreground)" : "transparent",
                          border: `2px solid ${selected ? "var(--foreground)" : "var(--border)"}`,
                        }}>
                        {selected && <Check size={12} style={{ color: "var(--background)" }} />}
                      </div>
                      <div className="flex-1 text-left">
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>{model.label}</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase" }}>
                        {model.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleCompareGenerate}
                disabled={comparePicker.selectedModels.length < 2}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
                <Columns2 size={14} />
                {t("studio.compareBtn")} {comparePicker.selectedModels.length} {t("studio.compareModelsSuffix")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RouteGuard>
  );
}

/* ── Welcome Screen — 3 bubbles like SMS ── */
const SOCIAL_PLATFORMS_STUDIO = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "X", icon: Twitter },
];

function WelcomeScreen({ onSend, onFillInput, onSetMode, vault, products, socialAccounts, onAccountConnected }: { onSend: (text: string) => void; onFillInput: (text: string) => void; onSetMode: (mode: string) => void; vault?: any; products?: any[]; socialAccounts?: any[] | null; onAccountConnected?: () => void }) {
  const { t, locale } = useI18n();
  const { session, accessToken } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [inspiring, setInspiring] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);

  const hasConnectedAccounts = Array.isArray(socialAccounts) && socialAccounts.length > 0;
  const accountsLoaded = socialAccounts !== null;

  const handleConnect = useCallback(async (platform: string) => {
    setConnecting(platform);
    try {
      const token = accessToken || "";
      const res = await fetch(`${API_BASE}/zernio/connect/${platform}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: token, redirectUrl: `${API_BASE}/zernio/callback` }),
      });
      const data = await res.json();
      if (!data.success || !data.authUrl) { setConnecting(null); return; }
      const popup = window.open(data.authUrl, `connect_${platform}`, "width=600,height=700,left=200,top=100");
      if (!popup) { setConnecting(null); return; }
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting(null);
          onAccountConnected?.();
        }
      }, 500);
      setTimeout(() => { clearInterval(poll); if (!popup.closed) popup.close(); setConnecting(null); }, 300_000);
    } catch { setConnecting(null); }
  }, [onAccountConnected]);

  const brandName = vault?.brandName || vault?.brand_name || vault?.company_name || vault?.brand_platform?.brand_name || "";

  const handleInspire = async () => {
    setInspiring(true);
    try {
      // Build rich brand context from vault
      const ctx: string[] = [];
      if (brandName) ctx.push(`Brand: ${brandName}`);
      const sector = vault?.sector || vault?.industry || vault?.brand_platform?.sector || "";
      if (sector) ctx.push(`Sector: ${sector}`);
      if (vault?.tagline) ctx.push(`Tagline: "${vault.tagline}"`);
      if (vault?.mission) ctx.push(`Mission: ${vault.mission}`);
      if (vault?.values) ctx.push(`Values: ${Array.isArray(vault.values) ? vault.values.join(", ") : vault.values}`);
      // Tone
      const tone = vault?.tone;
      if (tone) {
        const parts = [];
        if (tone.primary_tone) parts.push(tone.primary_tone);
        if (tone.adjectives?.length) parts.push(tone.adjectives.join(", "));
        if (parts.length) ctx.push(`Tone: ${parts.join(" — ")}`);
      }
      // Brand platform
      const bp = vault?.brand_platform;
      if (bp?.promise) ctx.push(`Promise: ${bp.promise}`);
      if (bp?.narrative_register) ctx.push(`Register: ${bp.narrative_register}`);
      if (bp?.creative_tension) ctx.push(`Creative tension: ${bp.creative_tension}`);
      // Target audiences
      const audiences = vault?.target_audiences || vault?.targetAudiences || [];
      if (Array.isArray(audiences) && audiences.length > 0) {
        ctx.push(`Target audiences: ${audiences.map((a: any) => typeof a === "string" ? a : a.name || a.label || "").filter(Boolean).slice(0, 3).join(", ")}`);
      }
      // Products
      const prods = (products || []).filter((p: any) => p.name).slice(0, 5);
      if (prods.length > 0) {
        ctx.push(`Products: ${prods.map((p: any) => `${p.name}${p.tagline ? ` — ${p.tagline}` : ""}${p.price ? ` (${p.price})` : ""}`).join("; ")}`);
      }
      // Connected platforms
      const connectedPlatforms = (socialAccounts || []).map((a: any) => a.platform).filter(Boolean);
      if (connectedPlatforms.length) ctx.push(`Connected platforms: ${connectedPlatforms.join(", ")}`);

      const brandContext = ctx.length > 0 ? ctx.join("\n") : "No brand context available.";

      const systemPrompt = `You are a senior social media strategist working for a creative agency. You have deep knowledge of this brand:\n\n${brandContext}\n\nGenerate exactly 3 different campaign ideas. Each idea = 1 short sentence (max 15 words), specific and actionable. Each must reference a concrete angle (product, event, value, audience). Format: one idea per line, numbered 1. 2. 3. — nothing else. Reply in ${locale === "fr" ? "French" : "English"}.`;

      const res = await fetch(`${API_BASE}/generate/text-multi-get?prompt=${encodeURIComponent("Generate 3 campaign ideas for this brand.")}&models=gpt-5&systemPrompt=${encodeURIComponent(systemPrompt)}&maxTokens=200`, {
        headers: { Authorization: `Bearer ${session?.access_token || ""}`, apikey: publicAnonKey },
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.result?.text) {
        const raw = data.results[0].result.text.trim();
        const parsed = raw.split(/\n/).map((l: string) => l.replace(/^\d+[\.\)\-]\s*/, "").trim()).filter((l: string) => l.length > 5);
        setIdeas(parsed.slice(0, 3));
      }
    } catch { /* silent */ }
    setInspiring(false);
  };

  return (
    <div className="h-full flex flex-col justify-center items-center px-6 pb-4 max-w-xl mx-auto w-full">
      {/* Headline — personalized with brand name */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-3 text-center"
        style={{ fontSize: "26px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3 }}
      >
        {brandName
          ? (locale === "fr" ? `${brandName}, engagez votre communauté` : `${brandName}, engage your community`)
          : (locale === "fr" ? "Engagez votre communauté" : "Engage your community")}
      </motion.h1>

      {/* Subtitle — contextual brand insight */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-4 text-center"
        style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.5 }}
      >
        {locale === "fr"
          ? "Décrivez votre prochaine campagne ou laissez ORA vous inspirer"
          : "Describe your next campaign or let ORA inspire you"}
      </motion.p>

      {/* Brand insight strip — shows we know the brand */}
      {brandName && (vault?.sector || vault?.industry || vault?.tone || vault?.brand_platform?.promise) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6 flex flex-col items-center gap-2"
        >
          {/* Color palette strip */}
          {(() => {
            const colors = vault?.colors || vault?.colorPalette || vault?.brand_platform?.colors || [];
            return Array.isArray(colors) && colors.length > 0 ? (
              <div className="flex items-center gap-1">
                {colors.slice(0, 5).map((c: string, i: number) => (
                  <span key={i} className="w-4 h-4 rounded-full" style={{ background: c.startsWith("#") ? c : `#${c}`, border: "1px solid var(--border)" }} />
                ))}
              </div>
            ) : null;
          })()}
          {/* Brand context sentence */}
          <p className="text-center px-6" style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5, maxWidth: 420 }}>
            {(() => {
              const sector = vault?.sector || vault?.industry || vault?.brand_platform?.sector || "";
              const tonePrimary = vault?.tone?.primary_tone || "";
              const promise = vault?.brand_platform?.promise || "";
              const tagline = vault?.tagline || "";

              if (locale === "fr") {
                const parts: string[] = [];
                if (sector) parts.push(`${sector}`);
                if (tonePrimary) parts.push(`ton ${tonePrimary.toLowerCase()}`);
                const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
                const promiseText = promise ? `. ${promise}` : tagline ? `. "${tagline}"` : "";
                return `ORA connaît l'univers ${brandName}${detail}${promiseText}`;
              } else {
                const parts: string[] = [];
                if (sector) parts.push(`${sector}`);
                if (tonePrimary) parts.push(`${tonePrimary.toLowerCase()} tone`);
                const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
                const promiseText = promise ? `. ${promise}` : tagline ? `. "${tagline}"` : "";
                return `ORA knows ${brandName}'s universe${detail}${promiseText}`;
              }
            })()}
          </p>
        </motion.div>
      )}

      {/* Inspire me button + idea bubbles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-col items-center gap-4 mb-8 w-full"
      >
        <button
          onClick={handleInspire}
          disabled={inspiring}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
          style={{
            background: "var(--foreground)",
            color: "var(--background)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {inspiring ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {inspiring
            ? (locale === "fr" ? "Réflexion en cours..." : "Thinking...")
            : (locale === "fr" ? "Inspirez-moi" : "Inspire me")}
        </button>

        {/* Idea bubbles — appear after inspire */}
        <AnimatePresence>
          {ideas.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2 w-full max-w-md"
            >
              {ideas.map((idea, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onSend(`__INSPIRE__:${idea}`)}
                  className="text-left px-4 py-3 rounded-2xl rounded-bl-md cursor-pointer transition-all hover:shadow-md active:scale-[0.98] group"
                  style={{
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    color: "var(--foreground)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                    <span>{idea}</span>
                    <ArrowRight size={13} className="flex-shrink-0 mt-0.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Social accounts bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-center gap-2 flex-wrap"
      >
        {accountsLoaded && hasConnectedAccounts ? (
          <>
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", marginRight: 4 }}>
              {locale === "fr" ? "Comptes connectés :" : "Connected accounts:"}
            </span>
            {socialAccounts!.map((acc: any, i: number) => {
              const plat = SOCIAL_PLATFORMS_STUDIO.find(p => p.id === acc.platform);
              const Icon = plat?.icon;
              return (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {Icon && <Icon size={11} />}
                  {acc.username || acc.name || plat?.label || acc.platform}
                </span>
              );
            })}
          </>
        ) : accountsLoaded && !hasConnectedAccounts ? (
          <>
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", marginRight: 4 }}>
              {t("studio.connectAccountsCTA")}
            </span>
            {SOCIAL_PLATFORMS_STUDIO.map(p => {
              const Icon = p.icon;
              const isConnecting = connecting === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleConnect(p.id)}
                  disabled={!!connecting}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-all hover:shadow-sm active:scale-95"
                  style={{
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    opacity: connecting && !isConnecting ? 0.4 : 1,
                  }}
                >
                  {isConnecting ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                  {p.label}
                </button>
              );
            })}
          </>
        ) : null}
      </motion.div>
    </div>
  );
}

/* ── User bubble ── */
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%]"
        style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "14px" }}>
        {content}
      </div>
    </div>
  );
}

/* ── Assistant message ── */
function AssistantMessage({ msg, onSuggestion, onCompare, onFinalize, onEdit }: {
  msg: ChatMessage;
  onSuggestion: (text: string) => void;
  onCompare: (result: GeneratedResult) => void;
  onFinalize: (posts: CampaignPost[], logoUrl: string | undefined, brief: string, campaignStartDate?: string, campaignDuration?: string, editIdx?: number) => void;
  onEdit?: (item: { url?: string; text?: string; model: string }, type: string, prompt: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {/* Text reply */}
      {msg.content && (
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]"
          style={{ background: "var(--secondary)", fontSize: "14px", lineHeight: 1.6 }}>
          {msg.content}
        </div>
      )}

      {/* Loading state */}
      {msg.isGenerating && (
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
          <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {msg.action?.type === "generate-image" ? t("studio.generatingImages")
              : msg.action?.type === "generate-text" ? t("studio.generatingText")
              : msg.action?.type === "generate-music" ? t("studio.generatingMusic")
              : msg.action?.type === "generate-video" ? t("studio.generatingVideo")
              : msg.action?.type === "generate-campaign" ? t("studio.generatingCampaign")
              : t("studio.generatingGeneric")}
          </span>
        </div>
      )}

      {/* Generated results */}
      {msg.result && (
        <ResultCard result={msg.result} onCompare={onCompare} onFinalize={onFinalize} onEdit={onEdit} logoUrl={msg.result.logoUrl} />
      )}

      {/* Suggestions removed — pure conversational, no buttons */}
    </div>
  );
}

/* ── Campaign Carousel — fullscreen feel ── */
function CampaignCarousel({ posts, logoUrl, onEdit, onEditVisual }: { posts: CampaignPost[]; logoUrl?: string; onEdit?: (item: { url?: string; text?: string; model: string }, type: string, prompt: string) => void; onEditVisual?: (postIdx: number) => void }) {
  const { t } = useI18n();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Platform colors
  const platformColor: Record<string, string> = {
    linkedin: "#0A66C2", instagram: "#E4405F", facebook: "#1877F2",
    twitter: "#1DA1F2", tiktok: "#000000", youtube: "#FF0000",
    pinterest: "#E60023", email: "#6B7280", press: "#374151",
    blog: "#059669", landing: "#7C3AED",
  };

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "var(--secondary)" }}>
        <Sparkles size={14} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: "13px", fontWeight: 600 }}>{posts.length} contenus</span>
        <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
          {[...new Set(posts.map(p => p.platform))].length} plateformes
        </span>
        <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
          {posts.filter(p => p.imageUrl || p.videoUrl).length} visuels
        </span>
      </div>

      {/* Grid of all posts */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {posts.map((post, idx) => {
          const hasVisual = !!post.imageUrl || !!post.videoUrl;
          const color = platformColor[post.platform.toLowerCase()] || "#6B7280";
          const isExpanded = expandedIdx === idx;

          return (
            <div
              key={idx}
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                ...(isExpanded ? { gridColumn: "1 / -1" } : {}),
              }}>
              {/* Visual thumbnail or text-only */}
              {hasVisual && !isExpanded && (
                <div className="relative group/thumb" style={{ height: 120 }}>
                  {post.videoUrl ? (
                    <video src={post.videoUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                  )}
                  {post.videoUrl && (
                    <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Film size={10} style={{ color: "#fff" }} />
                    </div>
                  )}
                  {/* Edit overlay on hover */}
                  {onEditVisual && post.imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.5)" }}>
                      <button
                        onClick={e => { e.stopPropagation(); onEditVisual(idx); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.95)", color: "#000", fontSize: "11px", fontWeight: 600 }}>
                        <Pencil size={11} />
                        Éditer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Platform badge + format */}
              <div className="px-2.5 py-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded"
                    style={{ background: color, color: "#fff", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {post.platform}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                    {post.format.replace(post.platform.toLowerCase() + "-", "")}
                  </span>
                  {post.variants && post.variants.length > 1 && (
                    <span style={{ fontSize: "9px", color: "var(--muted-foreground)", marginLeft: "auto" }}>
                      {post.variants.length} var.
                    </span>
                  )}
                </div>

                {/* Headline or truncated text */}
                {!isExpanded && (
                  <div style={{ fontSize: "11px", lineHeight: 1.4, color: "var(--text-primary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.headline || post.text?.slice(0, 80)}
                  </div>
                )}
              </div>

              {/* Expanded detail view */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {hasVisual && (
                    <div className="relative rounded-lg overflow-hidden group/expanded">
                      {post.videoUrl ? (
                        <video src={post.videoUrl} controls className="w-full" style={{ maxHeight: 300, objectFit: "cover" }} />
                      ) : (
                        <img src={post.imageUrl} className="w-full" style={{ maxHeight: 300, objectFit: "cover" }} alt="" />
                      )}
                      {logoUrl && (
                        <div className="absolute bottom-2 right-2 rounded-md overflow-hidden"
                          style={{ width: 28, height: 28, background: "rgba(255,255,255,0.9)", padding: 3 }}>
                          <img src={logoUrl} className="w-full h-full object-contain" alt="" />
                        </div>
                      )}
                      {/* Edit + Download buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        {onEditVisual && post.imageUrl && (
                          <button
                            onClick={e => { e.stopPropagation(); onEditVisual(idx); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                            style={{ background: "rgba(255,255,255,0.95)", color: "#000", fontSize: "11px", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                            <Pencil size={11} />
                            Éditer le visuel
                          </button>
                        )}
                        <a href={post.imageUrl || post.videoUrl} download target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                          onClick={e => e.stopPropagation()}>
                          <Download size={12} style={{ color: "#fff" }} />
                        </a>
                      </div>
                    </div>
                  )}
                  {post.headline && (
                    <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>{post.headline}</div>
                  )}
                  <div style={{ fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.text}</div>
                  {post.hashtags && (
                    <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 500 }}>{post.hashtags}</div>
                  )}
                  {post.cta && (
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={11} />
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>{post.cta}</span>
                    </div>
                  )}
                  {/* Edit buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {onEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); onEdit({ text: post.text, model: post.variants?.[0]?.model || "unknown" }, "text", post.text || ""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px", fontWeight: 500 }}>
                        <RefreshCw size={10} />
                        Réécrire le texte
                      </button>
                    )}
                    {onEdit && (post.imageUrl || post.videoUrl) && (
                      <button
                        onClick={e => { e.stopPropagation(); onEdit({ url: post.imageUrl || post.videoUrl, model: post.variants?.[0]?.model || "unknown" }, "image", post.text || ""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px", fontWeight: 500 }}>
                        <RefreshCw size={10} />
                        Régénérer le visuel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Result card ── */
function ResultCard({ result, onCompare, onFinalize, onEdit, logoUrl }: {
  result: GeneratedResult;
  onCompare: (result: GeneratedResult) => void;
  onFinalize: (posts: CampaignPost[], logoUrl: string | undefined, brief: string, campaignStartDate?: string, campaignDuration?: string, editIdx?: number) => void;
  onEdit?: (item: { url?: string; text?: string; model: string }, type: string, prompt: string) => void;
  logoUrl?: string;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = (i: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const selectAll = () => setSelected(new Set(result.items.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());

  if (result.type === "image") {
    return (
      <div className="space-y-2">
        {/* Selection bar */}
        {result.items.length > 1 && (
          <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            <button onClick={selected.size === result.items.length ? clearSelection : selectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {selected.size === result.items.length ? <X size={10} /> : <CheckCircle2 size={10} />}
              {selected.size === result.items.length ? t("studio.deselectAll") : t("studio.selectAll")}
            </button>
            {selected.size > 0 && (
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {selected.size}/{result.items.length} {selected.size > 1 ? t("studio.selectedPlural") : t("studio.selected")}
              </span>
            )}
          </div>
        )}
        <div className={`grid gap-2 ${result.items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {result.items.map((item, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden group cursor-pointer"
              style={{ background: "#111", aspectRatio: "1", outline: selected.has(i) ? "3px solid var(--foreground)" : "none", outlineOffset: "-3px" }}
              onClick={() => result.items.length > 1 && toggleSelect(i)}>
              <img src={item.url} className="w-full h-full object-cover" alt="" />
              {/* Selection indicator */}
              {result.items.length > 1 && (
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                  style={{ background: selected.has(i) ? "var(--foreground)" : "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.8)" }}>
                  {selected.has(i) && <Check size={12} style={{ color: "var(--background)" }} />}
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "10px", color: "#fff", fontWeight: 500 }}>{item.model}</span>
                  <div className="flex gap-1">
                    {onEdit && (
                      <button onClick={e => { e.stopPropagation(); onEdit(item, "image", result.prompt); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                        title={t("studio.edit")}>
                        <Pencil size={10} style={{ color: "#fff" }} />
                      </button>
                    )}
                    <a href={item.url} download target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.2)" }}>
                      <Download size={10} style={{ color: "#fff" }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onCompare(result)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <Columns2 size={12} /> {t("studio.compareWithOtherAI")}
          </button>
          {selected.size > 0 && (
            <button onClick={() => {
              const selectedItems = result.items.filter((_, i) => selected.has(i));
              selectedItems.forEach(item => {
                if (item.url) {
                  const a = document.createElement("a");
                  a.href = item.url;
                  a.download = "";
                  a.target = "_blank";
                  a.click();
                }
              });
              toast.success(`${selected.size} ${selected.size > 1 ? t("studio.visualPlural") : t("studio.visualSingular")} ${selected.size > 1 ? t("studio.downloadedCountPlural") : t("studio.downloadedCount")}`);
            }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "12px", fontWeight: 600 }}>
              <Download size={12} /> {t("studio.downloadCount")} {selected.size} {selected.size > 1 ? t("studio.visualPlural") : t("studio.visualSingular")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (result.type === "text") {
    // --- Platform detection: parse text into platform sections ---
    const PLATFORM_META: Record<string, { icon: typeof Instagram; color: string; label: string }> = {
      instagram: { icon: Instagram, color: "#E1306C", label: "Instagram" },
      linkedin: { icon: Linkedin, color: "#0A66C2", label: "LinkedIn" },
      facebook: { icon: Facebook, color: "#1877F2", label: "Facebook" },
      twitter: { icon: Twitter, color: "#1DA1F2", label: "X (Twitter)" },
      x: { icon: Twitter, color: "#1DA1F2", label: "X (Twitter)" },
    };

    const parsePlatformSections = (text: string): { platform: string | null; content: string }[] => {
      const platformRegex = /^(Instagram|LinkedIn|Facebook|Twitter|X)\s*[:\-–—]/gim;
      const matches: { index: number; platform: string }[] = [];
      let m;
      while ((m = platformRegex.exec(text)) !== null) {
        matches.push({ index: m.index, platform: m[1].toLowerCase() === "x" ? "twitter" : m[1].toLowerCase() });
      }
      if (matches.length === 0) return [{ platform: null, content: text }];
      const sections: { platform: string | null; content: string }[] = [];
      if (matches[0].index > 0) {
        const pre = text.slice(0, matches[0].index).trim();
        if (pre) sections.push({ platform: null, content: pre });
      }
      matches.forEach((match, idx) => {
        const start = match.index;
        const end = idx < matches.length - 1 ? matches[idx + 1].index : text.length;
        sections.push({ platform: match.platform, content: text.slice(start, end).trim() });
      });
      return sections;
    };

    // --- Expandable card sub-component ---
    const TEXT_TRUNCATE_LENGTH = 280;
    const TextCard = ({ item, index, isGrid }: { item: typeof result.items[0]; index: number; isGrid: boolean }) => {
      const [expanded, setExpanded] = useState(false);
      const sections = parsePlatformSections(item.text || "");
      const fullText = item.text || "";
      const needsTruncation = fullText.length > TEXT_TRUNCATE_LENGTH;

      return (
        <div className="rounded-xl overflow-hidden relative group"
          style={{
            background: "var(--card)",
            border: selected.has(index) ? "2px solid var(--foreground)" : "1px solid var(--border)",
            cursor: result.items.length > 1 ? "pointer" : "default",
          }}
          onClick={() => result.items.length > 1 && toggleSelect(index)}>
          {/* Model header */}
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
            <div className="flex items-center gap-2">
              {result.items.length > 1 && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: selected.has(index) ? "var(--foreground)" : "transparent", border: "1.5px solid var(--border)" }}>
                  {selected.has(index) && <Check size={10} style={{ color: "var(--background)" }} />}
                </div>
              )}
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {item.model}
              </span>
              {item.latencyMs && (
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                  {(item.latencyMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.text || ""); toast.success(t("studio.textCopied")); }}
              className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-opacity opacity-60 hover:opacity-100"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              title={t("studio.copy")}>
              <BookOpen size={11} />
            </button>
          </div>

          {/* Content with platform sections */}
          <div className="px-4 py-3 space-y-3">
            {sections.length > 1 ? (
              // Multiple platform sections — render as separate mini-cards
              sections.map((section, si) => {
                const meta = section.platform ? PLATFORM_META[section.platform] : null;
                const PlatformIcon = meta?.icon;
                const displayText = !expanded && needsTruncation && si === 0
                  ? section.content.slice(0, TEXT_TRUNCATE_LENGTH)
                  : section.content;
                return (
                  <div key={si} className="rounded-lg p-3" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    {meta && PlatformIcon && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: meta.color + "18" }}>
                          <PlatformIcon size={11} style={{ color: meta.color }} />
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      </div>
                    )}
                    <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--foreground)" }}>
                      {!expanded && needsTruncation && si > 0 ? null : displayText}
                    </div>
                  </div>
                );
              }).filter(Boolean)
            ) : (
              // Single block — no platform sections detected
              <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {!expanded && needsTruncation ? fullText.slice(0, TEXT_TRUNCATE_LENGTH) + "…" : fullText}
              </div>
            )}
          </div>

          {/* Expand/collapse toggle */}
          {needsTruncation && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 cursor-pointer transition-all"
              style={{ borderTop: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", background: "var(--secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}>
              <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }} />
              {expanded ? "Réduire" : "Voir plus"}
            </button>
          )}
        </div>
      );
    };

    const isMultiModel = result.items.length > 1;

    return (
      <div className="space-y-3">
        {/* Selection bar for multi-model */}
        {isMultiModel && (
          <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            <button onClick={selected.size === result.items.length ? clearSelection : selectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {selected.size === result.items.length ? <X size={10} /> : <CheckCircle2 size={10} />}
              {selected.size === result.items.length ? t("studio.deselectAll") : t("studio.selectAll")}
            </button>
            {selected.size > 0 && (
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {selected.size}/{result.items.length} {selected.size > 1 ? t("studio.selectedPlural") : t("studio.selected")}
              </span>
            )}
          </div>
        )}

        {/* Model comparison grid (side-by-side when multiple models) */}
        <div className={isMultiModel ? "grid grid-cols-1 md:grid-cols-2 gap-3" : ""}>
          {result.items.map((item, i) => (
            <TextCard key={i} item={item} index={i} isGrid={isMultiModel} />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onCompare(result)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <Columns2 size={12} /> {t("studio.compareWithOtherAI")}
          </button>
        </div>
      </div>
    );
  }

  if (result.type === "music") {
    return (
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--secondary)" }}>
              <Music size={16} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.model}</div>
              <audio controls src={item.url} className="w-full mt-1" style={{ height: 28 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "campaign" && result.campaignPosts) {
    const openKonvaForPost = (postIdx: number) => {
      // Open Finalizer with Konva editor on the specific post
      onFinalize(result.campaignPosts!, logoUrl || result.logoUrl, result.prompt, result.campaignStartDate, result.campaignDuration, postIdx);
    };
    return (
      <div className="space-y-3">
        <CampaignCarousel posts={result.campaignPosts} logoUrl={logoUrl || result.logoUrl} onEdit={onEdit} onEditVisual={openKonvaForPost} />
        <button
          onClick={() => onFinalize(result.campaignPosts!, logoUrl || result.logoUrl, result.prompt, result.campaignStartDate, result.campaignDuration)}
          className="flex items-center gap-2.5 w-full px-5 py-3 rounded-xl cursor-pointer transition-all group"
          style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
          <Rocket size={15} />
          <span>{t("studio.finalizeCampaign")}</span>
          <span style={{ fontSize: "11px", opacity: 0.7, marginLeft: "auto" }}>{t("studio.finalizeDesc")}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (result.type === "video") {
    return (
      <div className="space-y-2">
        {result.items.length > 1 && (
          <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            <button onClick={selected.size === result.items.length ? clearSelection : selectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {selected.size === result.items.length ? <X size={10} /> : <CheckCircle2 size={10} />}
              {selected.size === result.items.length ? t("studio.deselectAll") : t("studio.selectAll")}
            </button>
            {selected.size > 0 && (
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {selected.size}/{result.items.length} {selected.size > 1 ? t("studio.selectedPlural") : t("studio.selected")}
              </span>
            )}
          </div>
        )}
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden"
            style={{ background: "#111", border: selected.has(i) ? "2px solid var(--foreground)" : "1px solid var(--border)" }}>
            <video controls src={item.url} className="w-full" style={{ maxHeight: 400 }} />
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.items.length > 1 && (
                  <button onClick={() => toggleSelect(i)}
                    className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: selected.has(i) ? "var(--foreground)" : "var(--secondary)", border: "1.5px solid var(--border)" }}>
                    {selected.has(i) && <Check size={10} style={{ color: "var(--background)" }} />}
                  </button>
                )}
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{item.model}</span>
              </div>
              <a href={item.url} download target="_blank" rel="noreferrer"
                className="flex items-center gap-1"
                style={{ fontSize: "11px", color: "var(--foreground)" }}>
                <Download size={10} /> {t("studio.download")}
              </a>
            </div>
          </div>
        ))}
        <button onClick={() => onCompare(result)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
          <Columns2 size={12} /> Comparer avec d'autres IA
        </button>
      </div>
    );
  }

  return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CAMPAIGN CONFIG PANEL — Format selection, models, refinement
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CONFIG_FORMATS = [
  { id: "linkedin-post", label: "Post", platform: "LinkedIn", icon: Linkedin, type: "image" as const },
  { id: "linkedin-carousel", label: "Carousel", platform: "LinkedIn", icon: LayoutGrid, type: "image" as const },
  { id: "linkedin-video", label: "Video", platform: "LinkedIn", icon: Film, type: "video" as const },
  { id: "linkedin-text", label: "Text Post", platform: "LinkedIn", icon: FileText, type: "text" as const },
  { id: "linkedin-article", label: "Article", platform: "LinkedIn", icon: BookOpen, type: "text" as const },
  { id: "instagram-post", label: "Post", platform: "Instagram", icon: Instagram, type: "image" as const },
  { id: "instagram-carousel", label: "Carousel", platform: "Instagram", icon: LayoutGrid, type: "image" as const },
  { id: "instagram-story", label: "Story", platform: "Instagram", icon: Smartphone, type: "image" as const },
  { id: "instagram-reel", label: "Reel", platform: "Instagram", icon: Film, type: "video" as const },
  { id: "facebook-post", label: "Post", platform: "Facebook", icon: Facebook, type: "image" as const },
  { id: "facebook-story", label: "Story", platform: "Facebook", icon: Smartphone, type: "image" as const },
  { id: "facebook-video", label: "Video", platform: "Facebook", icon: Film, type: "video" as const },
  { id: "facebook-ad", label: "Ad", platform: "Facebook", icon: Megaphone, type: "image" as const },
  { id: "tiktok-video", label: "Video", platform: "TikTok", icon: Clapperboard, type: "video" as const },
  { id: "tiktok-image", label: "Photo", platform: "TikTok", icon: ImageIcon, type: "image" as const },
  { id: "twitter-post", label: "Post", platform: "Twitter/X", icon: Twitter, type: "image" as const },
  { id: "twitter-text", label: "Thread", platform: "Twitter/X", icon: FileText, type: "text" as const },
  { id: "youtube-thumbnail", label: "Thumbnail", platform: "YouTube", icon: Youtube, type: "image" as const },
  { id: "youtube-short", label: "Short", platform: "YouTube", icon: Film, type: "video" as const },
  { id: "pinterest-pin", label: "Pin", platform: "Pinterest", icon: ImageIcon, type: "image" as const },
  { id: "blog-article", label: "Article de blog", platform: "Blog", icon: BookOpen, type: "text" as const },
  { id: "press-release", label: "Communiqué de presse", platform: "PR", icon: FileText, type: "text" as const },
];

const CONFIG_PLATFORMS = [
  { name: "LinkedIn", icon: Linkedin },
  { name: "Instagram", icon: Instagram },
  { name: "Facebook", icon: Facebook },
  { name: "TikTok", icon: Clapperboard },
  { name: "Twitter/X", icon: Twitter },
  { name: "YouTube", icon: Youtube },
  { name: "Pinterest", icon: ImageIcon },
];

// Formats longs (non social media)
const CONFIG_LONG_FORMATS = [
  { id: "blog-article", label: "Article de blog", icon: BookOpen },
  { id: "press-release", label: "Communiqué de presse", icon: FileText },
];

const OBJECTIVE_PRESETS = [
  { id: "awareness", label: "Notoriété", icon: "📣" },
  { id: "conversion", label: "Conversion", icon: "🛒" },
  { id: "engagement", label: "Engagement", icon: "💬" },
  { id: "traffic", label: "Trafic", icon: "🔗" },
  { id: "launch", label: "Lancement", icon: "🚀" },
  { id: "loyalty", label: "Fidélisation", icon: "💎" },
  { id: "event", label: "Événement", icon: "🎁" },
];

const AUDIENCE_PRESETS = [
  "Grand public", "Pros / B2B", "Jeunes 18-25", "Familles", "Premium / Luxe", "Seniors 55+",
];

const CTA_PRESETS = [
  "Acheter", "Découvrir", "S'inscrire", "Télécharger", "Prendre RDV", "En savoir plus",
];

const MOMENT_PRESETS = [
  "Lancement produit", "Soldes / Promo", "Noël", "Saint-Valentin", "Été", "Rentrée", "Black Friday", "Marronnier",
];

const CONFIG_TEXT_MODELS = [
  // OpenAI
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast" },
  { id: "gpt-5", label: "GPT-5", badge: "Smart" },
  { id: "gpt-5.1", label: "GPT-5.1", badge: "Premium" },
  // Anthropic
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative" },
  { id: "claude-haiku", label: "Claude Haiku", badge: "Ultra Fast" },
  { id: "claude-opus", label: "Claude Opus", badge: "Best" },
  // Google
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Multimodal" },
  // DeepSeek
  { id: "deepseek", label: "DeepSeek v3", badge: "Open Source" },
];

const CONFIG_IMAGE_MODELS = [
  // Luma
  { id: "photon-1", label: "Luma Photon", badge: "Quality" },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast" },
  // FAL / Flux
  { id: "flux-pro", label: "Flux Pro (FAL)", badge: "Creative" },
  { id: "flux-schnell", label: "Flux Schnell (FAL)", badge: "Ultra Fast" },
  // OpenAI
  { id: "dall-e", label: "DALL-E 3", badge: "Precise" },
  // Leonardo
  { id: "phoenix-1.0", label: "Leonardo Phoenix", badge: "Versatile" },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo" },
  // Higgsfield
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed" },
  { id: "soul", label: "Soul (Higgsfield)", badge: "Artistic" },
  { id: "nano-banana", label: "Nano Banana", badge: "Fast" },
];

const CONFIG_VIDEO_MODELS = [
  // Luma
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality" },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast" },
  // Higgsfield
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic" },
  { id: "seedance-v1", label: "Seedance v1", badge: "TikTok" },
  { id: "dop", label: "DOP (Higgsfield)", badge: "Creative" },
];

const TONE_OPTIONS = [
  "Professionnel", "Inspirant", "Décontracté", "Éducatif",
  "Persuasif", "Humoristique", "Authentique", "Premium",
];

const LANGUAGE_OPTIONS = [
  { id: "auto", label: "Auto-detect" },
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "nl", label: "Nederlands" },
  { id: "ar", label: "العربية" },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CAMPAIGN FINALIZER — Edit, Schedule, Save
   3-step tunnel after generation
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type FinalizerStep = "review" | "schedule" | "save";

const CHANNEL_OPTIONS = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "twitter", label: "Twitter/X", icon: Twitter },
  { id: "tiktok", label: "TikTok", icon: Clapperboard },
  { id: "youtube", label: "YouTube", icon: Youtube },
];

function CampaignFinalizer({ posts: initialPosts, logoUrl, brief, vault, serverPost, serverGet, onClose, onSaved, campaignStartDate, campaignDuration, initialEditIdx }: {
  posts: CampaignPost[];
  logoUrl?: string;
  brief: string;
  vault: any;
  serverPost: (path: string, body: any, timeoutMs?: number) => Promise<any>;
  serverGet: (path: string) => Promise<any>;
  onClose: () => void;
  onSaved: () => void;
  campaignStartDate?: string;
  campaignDuration?: string;
  initialEditIdx?: number;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<FinalizerStep>("review");
  const [posts, setPosts] = useState<CampaignPost[]>(initialPosts.map(p => ({ ...p })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState(`Campagne ${new Date().toLocaleDateString("fr-FR")}`);

  // ── Konva editor state ──
  const [editorPostIdx, setEditorPostIdx] = useState<number | null>(null);
  const [editorTemplateId, setEditorTemplateId] = useState<string | null>(null);

  const openKonvaEditor = (idx: number) => {
    const post = posts[idx];
    if (!post.imageUrl) return;
    // Auto-create a template for this post's format
    const formatId = post.format || "generic";
    const existing = getTemplatesForFormat(formatId);
    let templateId: string;
    if (existing.length > 0) {
      templateId = existing[0].id;
    } else {
      const arParts = (post.aspectRatio || "1:1").split(/[:/]/);
      const arW = parseFloat(arParts[0]) || 1;
      const arH = parseFloat(arParts[1]) || 1;
      const canvasW = arW >= arH ? 1080 : Math.round(1080 * (arW / arH));
      const canvasH = arH >= arW ? 1080 : Math.round(1080 * (arH / arW));
      templateId = `auto-finalizer-${formatId}-${Date.now()}`;
      const autoTemplate: TemplateDefinition = {
        id: templateId, name: "Éditeur direct", formatId,
        aspectRatio: post.aspectRatio || "1:1", canvasWidth: canvasW, canvasHeight: canvasH,
        category: "minimal", source: "ai-generated",
        layers: [
          { id: "bg", type: "background-image", x: 0, y: 0, width: 100, height: 100, dataBinding: { source: "asset", field: "imageUrl" }, zIndex: 0 },
          { id: "grad", type: "gradient-overlay", x: 0, y: 50, width: 100, height: 50, style: { gradientDirection: "bottom", gradientStops: [{ offset: 0, color: "#000000", opacity: 0 }, { offset: 1, color: "#000000", opacity: 0.7 }] }, zIndex: 1 },
          { id: "headline", type: "text", x: 5, y: 70, width: 65, height: 15, dataBinding: { source: "asset", field: "headline" }, style: { fontSize: 5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2, lineHeight: 1.15 }, visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
          { id: "cta", type: "text", x: 5, y: 88, width: 35, height: 6, dataBinding: { source: "asset", field: "ctaText" }, style: { fontSize: 2.2, fontWeight: 600, color: "#FFFFFF", textAlign: "left", textTransform: "uppercase", letterSpacing: 1.5 }, visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 4 },
          { id: "logo", type: "logo", x: 88, y: 5, width: 8, height: 8, dataBinding: { source: "vault", field: "logoUrl" }, style: { objectFit: "contain", opacity: 0.9 }, visible: { when: "vault.logoUrl", notEmpty: true }, zIndex: 5 },
        ],
      };
      registerTemplate(autoTemplate);
    }
    setEditorTemplateId(templateId);
    setEditorPostIdx(idx);
  };
  const [scheduling, setScheduling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<Record<number, { date: string; time: string }>>({});
  const [aiScheduling, setAiScheduling] = useState(false);
  const [autoScheduled, setAutoScheduled] = useState(false);

  const steps: { key: FinalizerStep; label: string; icon: any }[] = [
    { key: "review", label: t("studio.reviewAndEdit"), icon: Pencil },
    { key: "schedule", label: t("studio.calendarLabel"), icon: Calendar },
    { key: "save", label: t("studio.saveLabel"), icon: Save },
  ];

  // Auto-open Konva editor if initialEditIdx provided
  React.useEffect(() => {
    if (initialEditIdx !== undefined && initialEditIdx >= 0 && initialEditIdx < posts.length) {
      openKonvaEditor(initialEditIdx);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Step 1: Review ---
  const updatePost = (idx: number, updates: Partial<CampaignPost>) => {
    setPosts(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const removePost = (idx: number) => {
    setPosts(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  // --- Step 2: AI Schedule ---
  const handleAiSchedule = async () => {
    setAiScheduling(true);
    try {
      const assets = posts.map(p => ({
        formatId: p.format,
        platform: p.platform,
        headline: p.headline || "",
        caption: p.text,
        imageUrl: p.imageUrl || "",
        videoUrl: p.videoUrl || "",
      }));
      const res = await serverPost("/calendar/generate", { assets, brief, campaignTheme: campaignName, ...(campaignStartDate ? { campaignStartDate } : {}), ...(campaignDuration ? { campaignDuration } : {}) });
      if (res.success && res.events) {
        const newDates: Record<number, { date: string; time: string }> = {};
        (res.events as any[]).forEach((evt: any, i: number) => {
          if (i < posts.length && evt.day && evt.month && evt.year) {
            const d = `${evt.year}-${String(evt.month).padStart(2, "0")}-${String(evt.day).padStart(2, "0")}`;
            newDates[i] = { date: d, time: evt.time || "09:00" };
          }
        });
        setScheduledDates(newDates);
        toast.success(`${Object.keys(newDates).length} ${t("studio.aiScheduled")}`);
      }
    } catch { toast.error(t("studio.aiScheduleError")); }
    setAiScheduling(false);
  };

  // --- Auto-schedule when entering Calendar step ---
  React.useEffect(() => {
    if (step === "schedule" && !autoScheduled && Object.keys(scheduledDates).length === 0 && !aiScheduling) {
      setAutoScheduled(true);
      handleAiSchedule();
    }
  }, [step]);

  // --- Step 3: Save ---
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save campaign as library item
      const campaignId = `campaign-${Date.now()}`;
      const campaignItem = {
        id: campaignId,
        type: "campaign",
        model: "multi",
        prompt: brief,
        preview: {
          assets: posts.map(p => ({
            formatId: p.format,
            platform: p.platform,
            type: p.videoUrl ? "video" : p.imageUrl ? "image" : "text",
            headline: p.headline || "",
            caption: p.text || "",
            hashtags: p.hashtags || "",
            ctaText: p.cta || "",
            imageUrl: p.imageUrl || "",
            videoUrl: p.videoUrl || "",
          })),
          platforms: [...new Set(posts.map(p => p.platform))],
          headline: campaignName,
          deliverableCount: posts.length,
          thumbnails: posts.filter(p => p.imageUrl).map(p => p.imageUrl!).slice(0, 4),
          videoUrl: posts.find(p => p.videoUrl)?.videoUrl || "",
          brief,
        },
        customName: campaignName,
      };
      await serverPost("/library/items", { item: campaignItem });

      // 2. Create calendar events for scheduled posts
      const scheduledEntries = Object.entries(scheduledDates);
      if (scheduledEntries.length > 0) {
        for (const [idxStr, sched] of scheduledEntries) {
          const idx = parseInt(idxStr);
          const post = posts[idx];
          if (!post) continue;
          const [y, m, d] = sched.date.split("-").map(Number);
          await serverPost("/calendar", {
            title: post.headline || `${campaignName} — ${post.platform}`,
            channel: post.platform.toLowerCase(),
            channelIcon: post.platform.toLowerCase(),
            time: sched.time,
            status: "scheduled",
            day: d,
            month: m,
            year: y,
            campaignTheme: campaignName,
            copy: post.text,
            caption: post.text,
            hashtags: post.hashtags || "",
            headline: post.headline || "",
            imageUrl: post.imageUrl || "",
            videoUrl: post.videoUrl || "",
          });
        }
      }

      onSaved();
    } catch (err) {
      console.error("[finalizer] save failed:", err);
      toast.error(t("studio.saveError"));
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header with step indicator */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket size={16} style={{ color: "var(--foreground)" }} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{t("studio.finalizeCampaign")}</span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "var(--secondary)" }}>
            <X size={14} />
          </button>
        </div>
        {/* Step tabs */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isDone = steps.findIndex(x => x.key === step) > i;
            return (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex-1 justify-center"
                style={{
                  background: isActive ? "var(--foreground)" : isDone ? "var(--secondary)" : "transparent",
                  color: isActive ? "var(--background)" : isDone ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: "11px", fontWeight: 600,
                  border: "1px solid",
                  borderColor: isActive ? "var(--foreground)" : isDone ? "var(--border)" : "transparent",
                }}>
                {isDone ? <CheckCircle2 size={11} /> : <Icon size={11} />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="px-5 py-4" style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: REVIEW & EDIT ═══ */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 8 }}>
                {posts.length} {posts.length > 1 ? t("studio.postsCountPlural") : t("studio.postsCount")} — {t("studio.clickToEdit")}
              </div>
              {posts.map((post, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden transition-all"
                  style={{ border: "1px solid", borderColor: editingIdx === idx ? "var(--foreground)" : "var(--border)" }}>
                  {/* Post header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer"
                    style={{ background: "var(--secondary)" }}
                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded" style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>
                        {post.platform}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>{post.format.split("-").slice(1).join(" ")}</span>
                      {post.imageUrl && <ImageIcon size={11} style={{ color: "var(--muted-foreground)" }} />}
                      {post.videoUrl && <Film size={11} style={{ color: "var(--muted-foreground)" }} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {post.variants && post.variants.length > 1 && (
                        <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                          {post.variants.length} {t("studio.variants")}
                        </span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); removePost(idx); }}
                        className="w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{ color: "var(--muted-foreground)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "red"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}>
                        <X size={12} />
                      </button>
                      <ChevronDown size={13} style={{ transform: editingIdx === idx ? "rotate(180deg)" : "rotate(0)", transition: "0.2s", color: "var(--muted-foreground)" }} />
                    </div>
                  </div>

                  {/* Expanded edit area */}
                  {editingIdx === idx && (
                    <div className="p-3.5 space-y-3">
                      {/* Image preview with edit button */}
                      {post.imageUrl && (
                        <div className="relative group/img">
                          <img src={post.imageUrl} className="w-full rounded-lg" style={{ maxHeight: 200, objectFit: "cover" }} alt="" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                            <button
                              onClick={() => openKonvaEditor(idx)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.95)", color: "#111", fontSize: "11px", fontWeight: 600 }}>
                              <Pencil size={12} /> {t("studio.editVisual")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Variant selector */}
                      {post.variants && post.variants.length > 1 && (
                        <div>
                          <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{t("studio.variantLabel")}</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {post.variants.map((v, vi) => (
                              <button
                                key={vi}
                                onClick={() => {
                                  updatePost(idx, {
                                    text: v.text,
                                    headline: v.headline || post.headline,
                                    hashtags: v.hashtags || post.hashtags,
                                    cta: v.cta || post.cta,
                                    imageUrl: v.imageUrl || post.imageUrl,
                                    selectedVariant: vi,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                style={{
                                  background: (post.selectedVariant || 0) === vi ? "var(--foreground)" : "var(--secondary)",
                                  color: (post.selectedVariant || 0) === vi ? "var(--background)" : "var(--text-primary)",
                                  fontSize: "10px", fontWeight: 600,
                                  border: "1px solid",
                                  borderColor: (post.selectedVariant || 0) === vi ? "var(--foreground)" : "var(--border)",
                                }}>
                                {v.imageModel || v.model}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Headline */}
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("studio.headlineLabel")}</label>
                        <input
                          value={post.headline || ""}
                          onChange={e => updatePost(idx, { headline: e.target.value })}
                          placeholder={t("studio.headlinePlaceholder")}
                          className="w-full rounded-lg px-3 py-2 outline-none"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px" }}
                        />
                      </div>

                      {/* Text */}
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("studio.textFieldLabel")}</label>
                        <textarea
                          value={post.text}
                          onChange={e => updatePost(idx, { text: e.target.value })}
                          className="w-full rounded-lg px-3 py-2 resize-none outline-none"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px", lineHeight: 1.6, minHeight: 100 }}
                        />
                      </div>

                      {/* Hashtags + CTA row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("studio.hashtagsLabel")}</label>
                          <input
                            value={post.hashtags || ""}
                            onChange={e => updatePost(idx, { hashtags: e.target.value })}
                            className="w-full rounded-lg px-3 py-2 outline-none"
                            style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("studio.ctaLabel")}</label>
                          <input
                            value={post.cta || ""}
                            onChange={e => updatePost(idx, { cta: e.target.value })}
                            className="w-full rounded-lg px-3 py-2 outline-none"
                            style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ STEP 2: SCHEDULE ═══ */}
          {step === "schedule" && (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {t("studio.scheduleDesc")}
                </div>
                <button
                  onClick={handleAiSchedule}
                  disabled={aiScheduling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "11px", fontWeight: 600 }}>
                  {aiScheduling ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {t("studio.scheduleWithAI")}
                </button>
              </div>

              {posts.map((post, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <span className="px-2 py-0.5 rounded flex-shrink-0" style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>
                    {post.platform}
                  </span>
                  <span className="flex-1 truncate" style={{ fontSize: "12px" }}>
                    {post.headline || post.text.slice(0, 50)}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="date"
                      value={scheduledDates[idx]?.date || ""}
                      onChange={e => setScheduledDates(prev => ({ ...prev, [idx]: { ...prev[idx], date: e.target.value, time: prev[idx]?.time || "09:00" } }))}
                      className="rounded-lg px-2 py-1 outline-none"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "11px" }}
                    />
                    <input
                      type="time"
                      value={scheduledDates[idx]?.time || "09:00"}
                      onChange={e => setScheduledDates(prev => ({ ...prev, [idx]: { ...prev[idx], time: e.target.value, date: prev[idx]?.date || "" } }))}
                      className="rounded-lg px-2 py-1 outline-none"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "11px", width: 80 }}
                    />
                    {scheduledDates[idx]?.date && (
                      <CheckCircle2 size={14} style={{ color: "var(--foreground)" }} />
                    )}
                  </div>
                </div>
              ))}

              {Object.keys(scheduledDates).length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "var(--secondary)" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    <Clock size={11} className="inline mr-1" style={{ verticalAlign: "-1px" }} />
                    {Object.values(scheduledDates).filter(s => s.date).length} post{Object.values(scheduledDates).filter(s => s.date).length > 1 ? "s" : ""} planifié{Object.values(scheduledDates).filter(s => s.date).length > 1 ? "s" : ""}
                    {Object.values(scheduledDates).filter(s => !s.date).length > 0 && ` · ${posts.length - Object.values(scheduledDates).filter(s => s.date).length} sans date (seront en brouillon)`}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 3: SAVE ═══ */}
          {step === "save" && (
            <motion.div key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Campaign name */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
                  {t("studio.campaignNameLabel")}
                </label>
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "14px", fontWeight: 600 }}
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--secondary)" }}>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>{t("studio.summaryLabel")}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "12px" }}>{posts.length} {t("studio.contents")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "12px" }}>{[...new Set(posts.map(p => p.platform))].length} {t("studio.platforms")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "12px" }}>{posts.filter(p => p.imageUrl).length} {t("studio.visuals")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "12px" }}>{Object.values(scheduledDates).filter(s => s.date).length} {t("studio.scheduledLabel")}</span>
                  </div>
                </div>

                {/* Platform breakdown */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[...new Set(posts.map(p => p.platform))].map(plat => (
                    <span key={plat} className="px-2.5 py-1 rounded-lg"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "10px", fontWeight: 600 }}>
                      {plat} ({posts.filter(p => p.platform === plat).length})
                    </span>
                  ))}
                </div>
              </div>

              {/* Thumbnails preview */}
              {posts.some(p => p.imageUrl) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {posts.filter(p => p.imageUrl).slice(0, 6).map((p, i) => (
                    <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden relative" style={{ width: 80, height: 80 }}>
                      <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                      {logoUrl && (
                        <div className="absolute bottom-1 right-1 rounded overflow-hidden" style={{ width: 16, height: 16, background: "rgba(255,255,255,0.9)", padding: 1 }}>
                          <img src={logoUrl} className="w-full h-full object-contain" alt="" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Save destinations */}
              <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                <CheckCircle2 size={12} />
                <span>{t("studio.savedToLibrary")}</span>
              </div>
              {Object.values(scheduledDates).filter(s => s.date).length > 0 && (
                <div className="flex items-center gap-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  <CheckCircle2 size={12} />
                  <span>{Object.values(scheduledDates).filter(s => s.date).length} post{Object.values(scheduledDates).filter(s => s.date).length > 1 ? "s" : ""} ajouté{Object.values(scheduledDates).filter(s => s.date).length > 1 ? "s" : ""} à votre calendrier</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — navigation + action buttons */}
      <div className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => {
            const idx = steps.findIndex(s => s.key === step);
            if (idx > 0) setStep(steps[idx - 1].key);
            else onClose();
          }}
          className="px-4 py-2 rounded-xl cursor-pointer transition-all"
          style={{ background: "var(--secondary)", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border)" }}>
          {step === "review" ? t("studio.cancel") : t("studio.back")}
        </button>

        {step === "save" ? (
          <button
            onClick={handleSave}
            disabled={saving || !campaignName.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("studio.saveCampaign")}
          </button>
        ) : (
          <button
            onClick={() => {
              const idx = steps.findIndex(s => s.key === step);
              if (idx < steps.length - 1) setStep(steps[idx + 1].key);
            }}
            disabled={step === "review" && posts.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
            {t("studio.next")}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* ── Konva Template Editor ── */}
      {editorPostIdx !== null && editorTemplateId && getTemplateById(editorTemplateId) && (() => {
        const post = posts[editorPostIdx];
        const editorAsset = {
          formatId: post.format || "generic",
          imageUrl: post.imageUrl || "",
          headline: post.headline || "",
          caption: post.text || "",
          ctaText: post.cta || "",
          hashtags: post.hashtags || "",
          label: post.platform || "",
          type: "image" as const,
        };
        return (
          <TemplateEditor
            open={true}
            onOpenChange={(open) => { if (!open) { setEditorPostIdx(null); setEditorTemplateId(null); } }}
            template={getTemplateById(editorTemplateId)!}
            asset={editorAsset as any}
            vault={vault}
            brandLogoUrl={logoUrl || vault?.logo_url || vault?.logo?.url || ""}
            onSave={(updatedTemplate) => {
              registerTemplate(updatedTemplate);
              setEditorPostIdx(null);
              setEditorTemplateId(null);
            }}
          />
        );
      })()}
    </motion.div>
  );
}

function CampaignConfigPanel({ params, products, vault, onGenerate, onCancel, serverPost }: {
  params: Record<string, any>;
  products: any[];
  vault: any;
  onGenerate: (finalParams: Record<string, any>) => void;
  onCancel: () => void;
  serverPost: (path: string, body: any, timeoutMs?: number) => Promise<any>;
}) {
  const { t } = useI18n();

  // ── State ──
  const [brief, setBrief] = useState(params.brief || "");
  const [selectedProduct, setSelectedProduct] = useState<string>(params.productId || "");
  const [objective, setObjective] = useState(params.objective || "awareness");
  // Deduce networks from formats passed by chat
  const initialFormats = params.formats || ["linkedin-post", "instagram-post", "facebook-post"];
  const deduceNetworks = (fmts: string[]) => {
    const nets = new Set<string>();
    for (const f of fmts) {
      if (f.startsWith("linkedin")) nets.add("LinkedIn");
      else if (f.startsWith("instagram")) nets.add("Instagram");
      else if (f.startsWith("facebook")) nets.add("Facebook");
      else if (f.startsWith("twitter")) nets.add("Twitter");
      else if (f.startsWith("tiktok")) nets.add("TikTok");
      else if (f.startsWith("youtube")) nets.add("YouTube");
      else if (f.startsWith("pinterest")) nets.add("Pinterest");
    }
    return nets.size > 0 ? Array.from(nets) : ["LinkedIn", "Instagram", "Facebook"];
  };
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(deduceNetworks(initialFormats));
  const [selectedFormats, setSelectedFormats] = useState<string[]>(initialFormats);
  const [visualStyle, setVisualStyle] = useState(params.visualStyle || "");
  const [tone, setTone] = useState(params.toneOfVoice || "");
  const [targetAudience, setTargetAudience] = useState(params.targetAudience || "");
  const [callToAction, setCallToAction] = useState(params.callToAction || "");
  const [moment, setMoment] = useState(params.theme || "");
  const [isSponsored, setIsSponsored] = useState(false);
  const [postCount, setPostCount] = useState("3");
  const [contentAngle, setContentAngle] = useState(params.contentAngle || "");
  const [keyMessages, setKeyMessages] = useState(params.keyMessages || "");
  const [language, setLanguage] = useState(params.language || "auto");
  const [textModels, setTextModels] = useState<string[]>(params.textModels || ["gpt-4o"]);
  const [imageModels, setImageModels] = useState<string[]>(params.imageModels || ["photon-1"]);
  const [videoModels, setVideoModels] = useState<string[]>(params.videoModels || ["ora-motion"]);
  const [startDate, setStartDate] = useState(params.startDate || "");
  const [duration, setDuration] = useState(params.duration || "");
  const [inspiring, setInspiring] = useState(false);
  // showAdvanced removed — all fields always visible

  // Visual scene presets
  const SCENE_PRESETS = [
    { id: "", label: "Auto", desc: "IA choisit", icon: "✨" },
    { id: "Studio Photoshoot", label: "Studio", desc: "Fond blanc, pro", icon: "📸" },
    { id: "Packshot", label: "Packshot", desc: "E-commerce", icon: "📦" },
    { id: "Lifestyle", label: "Lifestyle", desc: "Golden hour", icon: "🌿" },
    { id: "Flat Lay", label: "Flat Lay", desc: "Vue dessus", icon: "🎨" },
    { id: "UGC / Authentic", label: "UGC", desc: "Authentique", icon: "🤳" },
    { id: "Cinematic", label: "Cinéma", desc: "Dramatique", icon: "🎬" },
    { id: "Editorial / Fashion", label: "Editorial", desc: "Magazine", icon: "✂️" },
    { id: "Close-up / Macro", label: "Close-up", desc: "Détail", icon: "🔍" },
    { id: "3D Render", label: "3D", desc: "Rendu 3D", icon: "💎" },
    { id: "Aerial / Drone", label: "Aérien", desc: "Drone", icon: "🚁" },
  ];

  // ── Auto-select formats when networks change ──
  const toggleNetwork = (network: string) => {
    setSelectedNetworks(prev => {
      const next = prev.includes(network) ? prev.filter(n => n !== network) : [...prev, network];
      // Auto-update formats based on selected networks
      const autoFormats: string[] = [];
      for (const net of next) {
        const netFormats = CONFIG_FORMATS.filter(f => f.platform === net);
        // Select smart defaults per platform (post + 1 visual format)
        const post = netFormats.find(f => f.id.includes("post"));
        const visual = netFormats.find(f => f.type === "image" && !f.id.includes("post") && !f.id.includes("ad"));
        if (post) autoFormats.push(post.id);
        if (visual) autoFormats.push(visual.id);
      }
      setSelectedFormats([...new Set(autoFormats)]);
      return next;
    });
  };

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleTextModel = (id: string) => {
    setTextModels(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]);
  };
  const toggleImageModel = (id: string) => {
    setImageModels(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]);
  };
  const toggleVideoModel = (id: string) => {
    setVideoModels(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]);
  };

  const handleInspireMe = async () => {
    setInspiring(true);
    try {
      const res = await serverPost("/topics/suggest", { productId: selectedProduct || undefined, count: 3 });
      if (res.success && res.topics?.length) {
        const topic = res.topics[0];
        if (topic.brief) setBrief(topic.brief);
        if (topic.angle) setContentAngle(topic.angle);
        if (topic.objective) setObjective(topic.objective);
      }
    } catch { /* ignore */ }
    setInspiring(false);
  };

  // Placeholder dynamique selon l'objectif
  const briefPlaceholder = {
    awareness: "Ex: Faire connaître notre gamme verveine auprès des 25-45 ans...",
    conversion: "Ex: Soldes d'été -30%, pousser à l'achat immédiat...",
    engagement: "Ex: Créer du lien avec notre communauté, partage d'expérience...",
    traffic: "Ex: Diriger vers notre nouvelle page produit...",
    launch: "Ex: Nouveau packaging, mettre en avant le côté premium...",
    loyalty: "Ex: Remercier nos clients fidèles, programme de fidélité...",
    event: "Ex: Salon Maison & Objet, stand H42, invitation...",
  }[objective] || t("studio.briefPlaceholder");

  const handleGenerate = () => {
    if (!selectedFormats.length) { toast.error(t("studio.selectAtLeastOneFormat")); return; }
    onGenerate({
      brief: `${brief}${moment ? `\nMoment: ${moment}` : ""}${isSponsored ? "\nContenu sponsorisé — CTA direct" : ""}${postCount !== "3" ? `\nNombre de posts souhaité: ${postCount}` : ""}`,
      formats: selectedFormats,
      productId: selectedProduct,
      objective: OBJECTIVE_PRESETS.find(o => o.id === objective)?.label || objective,
      toneOfVoice: tone,
      targetAudience,
      callToAction,
      contentAngle,
      keyMessages,
      language,
      textModels,
      imageModels,
      videoModels,
      visualStyle,
      ...(startDate ? { startDate } : {}),
      ...(duration ? { duration } : {}),
      ...(moment ? { theme: moment } : {}),
    });
  };

  const brandName = vault?.brandName || vault?.brand_name || vault?.sections?.find((s: any) =>
    s.items?.find((i: any) => i.label?.toLowerCase().includes("nom"))
  )?.items?.find((i: any) => i.label?.toLowerCase().includes("nom"))?.value || "";

  // ── Extract vault brand intelligence ──
  const vaultSector = vault?.sector || vault?.industry || vault?.brand_platform?.sector || "";
  const vaultTone = vault?.tone;
  const vaultTonePrimary = vaultTone?.primary_tone || "";
  const vaultToneAdj = vaultTone?.adjectives || [];
  const vaultPromise = vault?.brand_platform?.promise || "";
  const vaultCreativeTension = vault?.brand_platform?.creative_tension || "";
  const vaultNarrativeRegister = vault?.brand_platform?.narrative_register || "";
  const vaultTagline = vault?.tagline || "";
  const vaultMission = vault?.mission || "";
  const vaultValues = vault?.values || [];
  const vaultColors = vault?.colors || vault?.colorPalette || vault?.brand_platform?.colors || [];
  const vaultLogoUrl = vault?.logo_url || vault?.logoUrl || vault?.logo?.url || "";
  const vaultAudiences: string[] = (() => {
    const raw = vault?.target_audiences || vault?.targetAudiences || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((a: any) => typeof a === "string" ? a : a.name || a.label || "").filter(Boolean).slice(0, 4);
  })();

  // ── Pre-fill from vault on mount ──
  useEffect(() => {
    // Tone: map vault primary_tone to closest TONE_OPTIONS
    if (!tone && vaultTonePrimary) {
      const mapping: Record<string, string> = {
        professional: "Professionnel", professionnel: "Professionnel",
        inspiring: "Inspirant", inspirant: "Inspirant",
        casual: "Décontracté", décontracté: "Décontracté", decontracte: "Décontracté",
        educational: "Éducatif", éducatif: "Éducatif", educatif: "Éducatif",
        persuasive: "Persuasif", persuasif: "Persuasif",
        humorous: "Humoristique", humoristique: "Humoristique",
        authentic: "Authentique", authentique: "Authentique",
        premium: "Premium", luxe: "Premium",
      };
      const matched = mapping[vaultTonePrimary.toLowerCase()];
      if (matched) setTone(matched);
    }
    // Audience: pre-fill from vault first audience
    if (!targetAudience && vaultAudiences.length > 0) {
      setTargetAudience(vaultAudiences[0]);
    }
    // Key messages: seed from vault values + promise
    if (!keyMessages) {
      const seeds: string[] = [];
      if (vaultPromise) seeds.push(vaultPromise);
      if (Array.isArray(vaultValues) && vaultValues.length) seeds.push(...vaultValues.slice(0, 3));
      if (seeds.length) setKeyMessages(seeds.join(", "));
    }
  }, [vault]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chip helper
  const Chip = ({ selected, onClick, children, size = "md" }: { selected: boolean; onClick: () => void; children: React.ReactNode; size?: "sm" | "md" }) => (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5"}`}
      style={{
        background: selected ? "var(--foreground)" : "var(--secondary)",
        color: selected ? "var(--background)" : "var(--text-primary)",
        border: "1px solid", borderColor: selected ? "var(--foreground)" : "var(--border)",
        fontSize: size === "sm" ? "10px" : "11px", fontWeight: 500,
      }}>
      {selected && <Check size={size === "sm" ? 8 : 10} />}
      {children}
    </button>
  );

  const SectionLabel = ({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) => (
    <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
      {Icon && <Icon size={11} className="inline mr-1.5" style={{ verticalAlign: "-1px" }} />}
      {children}
    </label>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--foreground)" }}>
            <Rocket size={14} style={{ color: "var(--background)" }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>{t("studio.configTitle")}</div>
            <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
              {brandName ? `${t("studio.campaignFor")} ${brandName}` : t("studio.adjustParams")}
            </div>
          </div>
        </div>
        <button onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
          style={{ background: "var(--secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--secondary)"; }}>
          <X size={14} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-5" style={{ maxHeight: "65vh", overflowY: "auto" }}>

        {/* ═══ BRAND DNA CARD — "On connaît votre marque" ═══ */}
        {brandName && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--secondary) 0%, var(--card) 100%)", border: "1px solid var(--border)" }}
          >
            {/* Subtle brand color accents */}
            {Array.isArray(vaultColors) && vaultColors.length > 0 && (
              <div className="absolute top-0 left-0 right-0 h-1 flex">
                {vaultColors.slice(0, 5).map((c: string, i: number) => (
                  <div key={i} className="flex-1" style={{ background: c.startsWith("#") ? c : `#${c}` }} />
                ))}
              </div>
            )}
            <div className="flex items-start gap-3" style={{ marginTop: Array.isArray(vaultColors) && vaultColors.length > 0 ? 4 : 0 }}>
              {/* Logo */}
              {vaultLogoUrl && (
                <img src={vaultLogoUrl} alt="" className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
                  style={{ background: "var(--background)", padding: 2, border: "1px solid var(--border)" }} />
              )}
              <div className="flex-1 min-w-0">
                {/* Brand name + sector */}
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>{brandName}</span>
                  {vaultSector && (
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "9px", fontWeight: 600, background: "var(--border)", color: "var(--muted-foreground)" }}>
                      {vaultSector}
                    </span>
                  )}
                </div>
                {/* Brand insight sentence */}
                {(vaultPromise || vaultTagline) && (
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 6 }}>
                    {vaultTagline ? `"${vaultTagline}"` : ""}
                    {vaultTagline && vaultPromise ? " — " : ""}
                    {vaultPromise || ""}
                  </p>
                )}
                {/* Compact brand attributes */}
                <div className="flex flex-wrap gap-1.5">
                  {vaultTonePrimary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ fontSize: "10px", fontWeight: 500, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                      🎙 {vaultTonePrimary}{vaultToneAdj.length > 0 ? `, ${vaultToneAdj.slice(0, 2).join(", ")}` : ""}
                    </span>
                  )}
                  {vaultNarrativeRegister && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ fontSize: "10px", fontWeight: 500, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                      📖 {vaultNarrativeRegister}
                    </span>
                  )}
                  {vaultAudiences.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ fontSize: "10px", fontWeight: 500, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                      👥 {vaultAudiences.slice(0, 2).join(", ")}
                    </span>
                  )}
                  {/* Color swatches inline */}
                  {Array.isArray(vaultColors) && vaultColors.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                      {vaultColors.slice(0, 5).map((c: string, i: number) => (
                        <span key={i} className="inline-block w-3 h-3 rounded-full" style={{ background: c.startsWith("#") ? c : `#${c}`, border: "1px solid var(--border)" }} />
                      ))}
                    </span>
                  )}
                </div>
                {/* Creative tension */}
                {vaultCreativeTension && (
                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                    💡 {vaultCreativeTension}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ NIVEAU 1 — Essentiel (toujours visible) ═══ */}

        {/* Produit */}
        {products.length > 0 && (
          <div>
            <SectionLabel icon={Package}>Produit</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!selectedProduct} onClick={() => setSelectedProduct("")}>Marque globale</Chip>
              {products.map((p: any) => (
                <Chip key={p.id} selected={selectedProduct === p.id} onClick={() => setSelectedProduct(p.id)}>
                  {p.name}{p.price && <span style={{ opacity: 0.6 }}>· {p.price}</span>}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Objectif */}
        <div>
          <SectionLabel icon={Target}>Objectif de communication</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVE_PRESETS.map(obj => (
              <button key={obj.id} onClick={() => setObjective(obj.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer"
                style={{
                  background: objective === obj.id ? "var(--foreground)" : "var(--secondary)",
                  color: objective === obj.id ? "var(--background)" : "var(--text-primary)",
                  border: `1.5px solid ${objective === obj.id ? "var(--foreground)" : "var(--border)"}`,
                  fontSize: "12px", fontWeight: 500,
                }}>
                <span style={{ fontSize: "14px" }}>{obj.icon}</span>
                {obj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brief */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>{t("studio.briefLabel")}</SectionLabel>
            <button onClick={handleInspireMe} disabled={inspiring}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              style={{ background: "var(--secondary)", fontSize: "11px", fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--secondary)"; }}>
              {inspiring ? <Loader2 size={11} className="animate-spin" /> : <Lightbulb size={11} />}
              {t("studio.inspireMe")}
            </button>
          </div>
          <textarea value={brief} onChange={e => setBrief(e.target.value)}
            placeholder={briefPlaceholder}
            className="w-full rounded-xl px-3.5 py-2.5 resize-none outline-none transition-all"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "13px", lineHeight: 1.6, minHeight: 64 }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* ═══ NIVEAU 2 — Visible, pré-rempli ═══ */}

        {/* Réseaux sociaux (toggles visuels) */}
        <div>
          <SectionLabel>Réseaux sociaux</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {CONFIG_PLATFORMS.map(platform => {
              const Icon = platform.icon;
              const isOn = selectedNetworks.includes(platform.name);
              const formatCount = CONFIG_FORMATS.filter(f => f.platform === platform.name && selectedFormats.includes(f.id)).length;
              return (
                <button key={platform.name} onClick={() => toggleNetwork(platform.name)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: isOn ? "var(--foreground)" : "var(--secondary)",
                    color: isOn ? "var(--background)" : "var(--text-primary)",
                    border: `1.5px solid ${isOn ? "var(--foreground)" : "var(--border)"}`,
                    fontSize: "12px", fontWeight: 500,
                  }}>
                  <Icon size={14} />
                  {platform.name}
                  {isOn && formatCount > 0 && (
                    <span style={{ fontSize: "9px", fontWeight: 700, opacity: 0.7 }}>{formatCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formats détaillés par réseau sélectionné */}
        {selectedNetworks.length > 0 && (
          <div>
            <SectionLabel>Formats ({selectedFormats.length} {t("studio.formatsSelected")})</SectionLabel>
            <div className="space-y-2.5">
              {selectedNetworks.map(network => {
                const formats = CONFIG_FORMATS.filter(f => f.platform === network);
                if (!formats.length) return null;
                return (
                  <div key={network}>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>{network}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {formats.map(fmt => (
                        <Chip key={fmt.id} size="sm" selected={selectedFormats.includes(fmt.id)} onClick={() => toggleFormat(fmt.id)}>
                          {fmt.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Formats longs */}
        <div>
          <SectionLabel icon={BookOpen}>Formats longs</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {CONFIG_LONG_FORMATS.map(fmt => (
              <Chip key={fmt.id} selected={selectedFormats.includes(fmt.id)} onClick={() => toggleFormat(fmt.id)}>
                {fmt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Mise en situation */}
        <div>
          <SectionLabel icon={Camera}>
            Mise en situation
            {visualStyle && (
              <span className="ml-2 px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, color: "var(--background)", background: "var(--foreground)", textTransform: "none", letterSpacing: "normal" }}>
                {SCENE_PRESETS.find(s => s.id === visualStyle)?.label || visualStyle}
              </span>
            )}
          </SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {SCENE_PRESETS.map(scene => {
              const isSelected = visualStyle === scene.id;
              return (
                <button key={scene.id} onClick={() => setVisualStyle(scene.id)}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all cursor-pointer text-center"
                  style={{
                    background: isSelected ? "var(--foreground)" : "var(--secondary)",
                    color: isSelected ? "var(--background)" : "var(--text-primary)",
                    border: `1.5px solid ${isSelected ? "var(--foreground)" : "var(--border)"}`,
                  }}>
                  <span style={{ fontSize: "16px" }}>{scene.icon}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, lineHeight: 1.2 }}>{scene.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ NIVEAU 3 — Audience, ton, CTA, moment, modèles IA ═══ */}
        <div className="space-y-4">
              {/* Audience — vault audiences first, then generic fallbacks */}
              <div>
                <SectionLabel>Audience cible{vaultAudiences.length > 0 ? " (depuis votre vault)" : ""}</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {/* Vault audiences first — highlighted */}
                  {vaultAudiences.map(a => (
                    <Chip key={`v-${a}`} size="sm" selected={targetAudience === a} onClick={() => setTargetAudience(targetAudience === a ? "" : a)}>
                      <span style={{ fontSize: "9px" }}>⭐</span> {a}
                    </Chip>
                  ))}
                  {/* Generic presets (exclude duplicates from vault) */}
                  {AUDIENCE_PRESETS.filter(a => !vaultAudiences.some(v => v.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(v.toLowerCase()))).map(a => (
                    <Chip key={a} size="sm" selected={targetAudience === a} onClick={() => setTargetAudience(targetAudience === a ? "" : a)}>{a}</Chip>
                  ))}
                </div>
                <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                  placeholder={t("studio.audiencePlaceholder")}
                  className="w-full rounded-lg px-3 py-1.5 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Ton */}
              <div>
                <SectionLabel>Ton {vaultTonePrimary ? `(vault : ${vaultTonePrimary})` : ""}</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {TONE_OPTIONS.map(tn => (
                    <Chip key={tn} size="sm" selected={tone === tn} onClick={() => setTone(tone === tn ? "" : tn)}>{tn}</Chip>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div>
                <SectionLabel>Call-to-action</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CTA_PRESETS.map(c => (
                    <Chip key={c} size="sm" selected={callToAction === c} onClick={() => setCallToAction(callToAction === c ? "" : c)}>{c}</Chip>
                  ))}
                </div>
                <input value={callToAction} onChange={e => setCallToAction(e.target.value)}
                  placeholder={t("studio.customCtaPlaceholder")}
                  className="w-full rounded-lg px-3 py-1.5 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Moment / Date */}
              <div>
                <SectionLabel icon={Calendar}>Moment / Contexte</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {MOMENT_PRESETS.map(m => (
                    <Chip key={m} size="sm" selected={moment === m} onClick={() => setMoment(moment === m ? "" : m)}>{m}</Chip>
                  ))}
                </div>
              </div>

              {/* Organique / Sponsorisé */}
              <div>
                <SectionLabel>Diffusion</SectionLabel>
                <div className="flex gap-2">
                  <Chip selected={!isSponsored} onClick={() => setIsSponsored(false)}>Organique</Chip>
                  <Chip selected={isSponsored} onClick={() => setIsSponsored(true)}>Sponsorisé (ads)</Chip>
                </div>
              </div>

              {/* Nombre de posts */}
              <div>
                <SectionLabel>Nombre de posts</SectionLabel>
                <div className="flex gap-1.5">
                  {["1", "3", "5", "7", "10"].map(n => (
                    <Chip key={n} size="sm" selected={postCount === n} onClick={() => setPostCount(n)}>{n}</Chip>
                  ))}
                </div>
              </div>

              {/* Angle / Messages clés */}
              <div>
                <SectionLabel>Angle éditorial</SectionLabel>
                <input value={contentAngle} onChange={e => setContentAngle(e.target.value)}
                  placeholder={t("studio.directionPlaceholder")}
                  className="w-full rounded-lg px-3 py-1.5 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div>
                <SectionLabel>Messages clés</SectionLabel>
                <textarea value={keyMessages} onChange={e => setKeyMessages(e.target.value)}
                  placeholder={t("studio.keyPointsPlaceholder")}
                  className="w-full rounded-lg px-3 py-1.5 resize-none outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px", minHeight: 48 }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* AI Models */}
              <div className="rounded-xl p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                  <Columns2 size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} /> Modèles IA
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Texte</label>
                    <div className="space-y-0.5">
                      {CONFIG_TEXT_MODELS.map(m => {
                        const sel = textModels.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleTextModel(m.id)}
                            className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg transition-all cursor-pointer"
                            style={{ background: sel ? "var(--foreground)" : "transparent", color: sel ? "var(--background)" : "var(--text-primary)", fontSize: "10px", fontWeight: 500 }}>
                            {sel && <Check size={9} />}
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Image</label>
                    <div className="space-y-0.5">
                      {CONFIG_IMAGE_MODELS.map(m => {
                        const sel = imageModels.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleImageModel(m.id)}
                            className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg transition-all cursor-pointer"
                            style={{ background: sel ? "var(--foreground)" : "transparent", color: sel ? "var(--background)" : "var(--text-primary)", fontSize: "10px", fontWeight: 500 }}>
                            {sel && <Check size={9} />}
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Vidéo</label>
                    <div className="space-y-0.5">
                      {CONFIG_VIDEO_MODELS.map(m => {
                        const sel = videoModels.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleVideoModel(m.id)}
                            className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg transition-all cursor-pointer"
                            style={{ background: sel ? "var(--foreground)" : "transparent", color: sel ? "var(--background)" : "var(--text-primary)", fontSize: "10px", fontWeight: 500 }}>
                            {sel && <Check size={9} />}
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div>
                <SectionLabel icon={Languages}>Langue</SectionLabel>
                <div className="flex flex-wrap gap-1">
                  {LANGUAGE_OPTIONS.map(l => (
                    <Chip key={l.id} size="sm" selected={language === l.id} onClick={() => setLanguage(l.id)}>{l.label}</Chip>
                  ))}
                </div>
              </div>

              {/* Planning — Start date + Duration */}
              <div className="rounded-xl p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                  <Calendar size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} /> Planning
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Date de début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-lg px-3 py-1.5 outline-none transition-all"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--foreground)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Durée</label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: "1 week", label: "1 sem." },
                        { id: "2 weeks", label: "2 sem." },
                        { id: "1 month", label: "1 mois" },
                        { id: "3 months", label: "3 mois" },
                      ].map(d => (
                        <Chip key={d.id} size="sm" selected={duration === d.id} onClick={() => setDuration(duration === d.id ? "" : d.id)}>{d.label}</Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </div>

      {/* Footer — Generate button */}
      <div className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {selectedFormats.length} format{selectedFormats.length > 1 ? "s" : ""}
          {selectedProduct && ` · ${products.find((p: any) => p.id === selectedProduct)?.name || "Produit"}`}
          {selectedNetworks.length > 0 && ` · ${selectedNetworks.join(", ")}`}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl cursor-pointer transition-all"
            style={{ background: "var(--secondary)", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            {t("studio.cancel")}
          </button>
          <button onClick={handleGenerate} disabled={!selectedFormats.length}
            className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
            <Sparkles size={14} />
            {t("studio.generateCampaign")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
