import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Sparkles, ImageIcon, FileText, Music, Film, Mic, Square, Paperclip,
  Loader2, Download, Columns2, RefreshCw, Rocket,
  Play, ArrowRight, Wand2, Palette, ChevronLeft, ChevronRight, X,
  Linkedin, Instagram, Facebook, Twitter, Youtube, Clapperboard,
  BookOpen, LayoutGrid, Megaphone, Smartphone, Target, Check,
  ChevronDown, Lightbulb, Package, Globe, Languages,
  Calendar, Save, Pencil, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";

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
  const [vault, setVault] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [pendingCampaign, setPendingCampaign] = useState<{ action: StudioAction; msgId: string } | null>(null);
  const [finalizingCampaign, setFinalizingCampaign] = useState<{ posts: CampaignPost[]; logoUrl?: string; brief: string } | null>(null);

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
      if (v) setVault(v);
      if (p.length) setProducts(p);
      setVaultLoading(false);
      return { vault: v, products: p };
    } catch (e) { console.warn("[studio] vault/products load failed:", e); }
    setVaultLoading(false);
    return { vault: null, products: [] };
  }, [vault, vaultLoading, serverPost, serverGet]);

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
            // Use image-start POST per model (POST avoids URL length limits with signed URLs)
            const items: any[] = [];
            removeAttachedImage();
            for (const m of modelList) {
              try {
                const startRes = await serverPost("/generate/image-start", {
                  prompt, model: m, aspectRatio, imageRefUrl: refUrl, refSource: "upload",
                }, 180_000); // 180s timeout: Qwen isolation (~60s) + Flux img2img (~20s)
                if (startRes.success && startRes.directResult && startRes.imageUrl) {
                  // FAL Flux img2img returns result directly (no polling needed)
                  console.log(`[studio] image-start direct result from ${startRes.provider || "fal"}`);
                  items.push({ url: startRes.imageUrl, model: m, latencyMs: 0 });
                } else if (startRes.success && startRes.generationId) {
                  // Luma fallback — poll for completion
                  let imageUrl: string | null = null;
                  for (let poll = 0; poll < 30; poll++) {
                    await new Promise(r => setTimeout(r, 3000));
                    const statusRes = await serverGet(`/generate/image-status?id=${startRes.generationId}`);
                    if (statusRes.success && statusRes.state === "completed" && statusRes.imageUrl) {
                      imageUrl = statusRes.imageUrl;
                      break;
                    }
                    if (statusRes.state === "failed") break;
                  }
                  if (imageUrl) items.push({ url: imageUrl, model: m, latencyMs: 0 });
                }
              } catch (err) { console.warn(`[studio] image-start ${m} failed:`, err); }
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
          const { brief, formats = ["linkedin-post"], targetAudience, objective, toneOfVoice, contentAngle, keyMessages, callToAction, language = "auto", textModels: txtModels = ["gpt-4o"], imageModels: imgModels = ["photon-1"], productId } = action.params;

          // Build product context for the brief if a product is selected
          let productBrief = brief || "";
          if (productId && products.length) {
            const prod = products.find((p: any) => p.id === productId);
            if (prod) {
              productBrief = `${productBrief}\n\nPRODUCT FOCUS: ${prod.name}${prod.price ? ` (${prod.price})` : ""}${prod.category ? ` — ${prod.category}` : ""}${prod.description ? `\n${prod.description}` : ""}`;
            }
          }

          // Normalize models to arrays
          const textModelList: string[] = Array.isArray(txtModels) ? txtModels : [txtModels];
          const imageModelList: string[] = Array.isArray(imgModels) ? imgModels : [imgModels];

          // 1. Generate texts with all selected text models (in parallel)
          const textGenPayload = {
            brief: productBrief,
            targetAudience: targetAudience || "",
            formats: formats.join(","),
            campaignObjective: objective || "",
            toneOfVoice: toneOfVoice || "",
            contentAngle: contentAngle || "",
            keyMessages: keyMessages || "",
            callToAction: callToAction || "",
            language,
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

          // 3. Generate images for visual formats — all selected image models
          const visualFormats = posts.filter(p =>
            !p.format.includes("text") && !p.format.includes("article") && !p.format.includes("thread")
          );

          for (let i = 0; i < Math.min(visualFormats.length, 4); i++) {
            const copyEntry = (primaryText.copyMap as any)?.[visualFormats[i].format];
            const basePrompt = copyEntry?.imagePrompt || `${brief}, ${visualFormats[i].platform} ${visualFormats[i].format}, professional`;
            const enrichedPrompt = `${basePrompt}${brandVisualSuffix}`;
            const aspectRatio = visualFormats[i].format.includes("story") || visualFormats[i].format.includes("reel")
              ? "9:16"
              : visualFormats[i].format.includes("post") && visualFormats[i].platform === "instagram"
                ? "1:1"
                : "16:9";

            // Generate with all image models (in parallel)
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

            // Set primary image
            const primaryImg = imgResults.find(r => r.imageUrl);
            if (primaryImg) {
              visualFormats[i].imageUrl = primaryImg.imageUrl!;
            }

            // Add image variants to text variants
            if (imgResults.filter(r => r.imageUrl).length > 1 && visualFormats[i].variants) {
              // Attach each image model result to the first text variant that doesn't have an image yet
              for (const imgR of imgResults) {
                if (!imgR.imageUrl) continue;
                const existingV = visualFormats[i].variants!.find(v => !v.imageUrl);
                if (existingV) {
                  existingV.imageUrl = imgR.imageUrl;
                  existingV.imageModel = imgR.model;
                } else {
                  // Add as additional variant
                  visualFormats[i].variants!.push({
                    model: imgR.model,
                    text: visualFormats[i].text,
                    imageUrl: imgR.imageUrl,
                    imageModel: imgR.model,
                  });
                }
              }
            } else if (imgResults.filter(r => r.imageUrl).length > 1) {
              // No text variants but multiple image models — create image-only variants
              visualFormats[i].variants = imgResults
                .filter(r => r.imageUrl)
                .map(r => ({
                  model: r.model,
                  text: visualFormats[i].text,
                  imageUrl: r.imageUrl!,
                  imageModel: r.model,
                }));
              visualFormats[i].selectedVariant = 0;
            }
          }

          if (posts.length > 0) {
            result = {
              type: "campaign",
              prompt: brief || "",
              items: [],
              campaignPosts: posts,
              logoUrl: vault?.logo_url || vault?.logoUrl || undefined,
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
  }, [serverGet, serverPost, navigate, attachedImage, removeAttachedImage]);

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

    // ── CREATE MODE shortcut: skip AI, show welcome locally ──
    if (msg === "__CREATE_MODE__") {
      setContext(prev => ({ ...prev, mode: "create" }));
      setMessages([{
        id: `assist-welcome-${Date.now()}`,
        role: "assistant",
        content: t("studio.welcomeCreateMode"),
        suggestions: [t("studio.suggestImage"), t("studio.suggestVideoShort"), t("studio.suggestMusicShort"), t("studio.suggestTextShort")],
      }]);
      loadVault();
      return;
    }

    // ── CAMPAIGN MODE shortcut: load vault first, then show contextual welcome ──
    if (msg === "__CAMPAIGN_MODE__") {
      setContext(prev => ({ ...prev, mode: "campaign" }));
      // Wait for auth token if not ready yet (max 5s)
      let token = getAuthHeader();
      if (!token) {
        console.log("[studio] Campaign: waiting for auth token...");
        for (let i = 0; i < 50 && !token; i++) {
          await new Promise(r => setTimeout(r, 100));
          token = getAuthHeader();
        }
        console.log(`[studio] Campaign: token after wait = ${token ? "OK" : "STILL EMPTY"}`);
      }
      const loaded = await loadVault(true);
      console.log("[studio] Campaign vault loaded:", JSON.stringify(loaded.vault ? Object.keys(loaded.vault) : null), "products:", loaded.products?.length);
      const brandName = loaded.vault?.brandName || loaded.vault?.company_name || loaded.vault?.brand_platform?.brand_name;
      const productNames = loaded.products?.slice(0, 5).map((p: any) => p.name).filter(Boolean);
      const hasBrand = !!brandName;
      const hasProducts = productNames && productNames.length > 0;

      let welcomeContent = "";
      let suggestions: string[] = [];

      if (hasBrand && hasProducts) {
        welcomeContent = `Bienvenue en mode **Campagne** ! Je connais votre marque **${brandName}** et vos produits.\n\nQuel produit ou sujet souhaitez-vous mettre en avant ?\n\n📦 Vos produits : ${productNames.join(", ")}`;
        suggestions = productNames.slice(0, 3).map((n: string) => `Campagne ${n}`);
        if (suggestions.length < 3) suggestions.push("Campagne de notoriété");
      } else if (hasBrand) {
        welcomeContent = `Bienvenue en mode **Campagne** ! Je connais votre marque **${brandName}**.\n\nQuel est l'objectif de votre campagne ? Nouveau produit, promotion, notoriété, événement ?`;
        suggestions = ["Lancement produit", "Promotion saisonnière", "Campagne de notoriété"];
      } else {
        welcomeContent = "Bienvenue en mode **Campagne** !\n\nPour créer une campagne cohérente avec votre marque, je vous recommande de **compléter votre Brand Vault** d'abord (logo, couleurs, ton, produits).\n\nSinon, décrivez simplement votre campagne et je m'adapte.";
        suggestions = ["Compléter mon Brand Vault", "Lancer sans marque", "Campagne générique"];
      }

      setMessages([{
        id: `assist-campaign-welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeContent,
        suggestions,
      }]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Default to "create" mode if not explicitly set to "campaign"
      if (!context.mode) setContext(prev => ({ ...prev, mode: "create" }));
      const isCampaignMode = context.mode === "campaign";

      // Load vault + products (always — brand context enriches all generations)
      let vaultData = vault;
      let productsData = products;
      if (!vaultData) {
        const loaded = await loadVault();
        vaultData = loaded.vault;
        productsData = loaded.products;
      }

      // Count campaign exchanges to force generation after 3 user messages
      const userMsgCount = isCampaignMode
        ? messages.filter(m => m.role === "user").length + 1
        : 0;
      const forceGenerate = isCampaignMode && userMsgCount >= 3;

      const res = await serverPost("/studio/chat", {
        message: forceGenerate
          ? `${msg} [GÉNÉREZ MAINTENANT]`
          : msg,
        history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        context: {
          ...context,
          mode: context.mode || "create",
          ...((vaultData || vault)?.brand_platform ? { brand_platform: (vaultData || vault).brand_platform } : {}),
          ...((vaultData || vault)?.gammes ? { gammes: (vaultData || vault).gammes } : {}),
          ...((vaultData || vault)?.tone ? { tone: (vaultData || vault).tone } : {}),
          ...((vaultData || vault)?.logo_url || (vaultData || vault)?.logoUrl ? { logo_url: (vaultData || vault).logo_url || (vaultData || vault).logoUrl } : {}),
          ...((productsData?.length || products?.length) ? { products: (productsData?.length ? productsData : products).map((p: any) => ({ id: p.id, name: p.name, description: p.description, price: p.price, category: p.category })).slice(0, 20) } : {}),
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
          // Ref image: use image-start + polling per model (image-via-get doesn't support imageRefUrl)
          const items: any[] = [];
          for (const m of selectedModels) {
            try {
              const startRes = await serverPost("/generate/image-start", {
                prompt: result.prompt, model: m, aspectRatio: "1:1", imageRefUrl: refUrl, refSource: "upload",
              }, 180_000);
              if (startRes.success && startRes.directResult && startRes.imageUrl) {
                // FAL direct result (no polling)
                items.push({ url: startRes.imageUrl, model: m, latencyMs: 0 });
              } else if (startRes.success && startRes.generationId) {
                let imageUrl: string | null = null;
                for (let poll = 0; poll < 30; poll++) {
                  await new Promise(r => setTimeout(r, 3000));
                  const statusRes = await serverGet(`/generate/image-status?id=${startRes.generationId}`);
                  if (statusRes.success && statusRes.state === "completed" && statusRes.imageUrl) {
                    imageUrl = statusRes.imageUrl; break;
                  }
                  if (statusRes.state === "failed") break;
                }
                if (imageUrl) items.push({ url: imageUrl, model: m, latencyMs: 0 });
              }
            } catch (err) { console.warn(`[studio] compare image-start ${m} failed:`, err); }
          }
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
              <WelcomeScreen onSend={handleSend} onSetMode={(mode: string) => setContext(prev => ({ ...prev, mode }))} />
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
                        onFinalize={(posts, logoUrl, brief) => setFinalizingCampaign({ posts, logoUrl, brief })}
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
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: t("studio.pillStudioWhite"), prompt: "Professional studio photoshoot, pure white background, luxury product photography, soft diffused studio lighting, clean minimalist composition, commercial quality", type: "image" as const },
                        { label: t("studio.pillPackshot"), prompt: "Clean product packshot, neutral gradient background, professional commercial photography, sharp focus, centered composition, studio lighting", type: "image" as const },
                        { label: t("studio.pillLifestyle"), prompt: "Lifestyle product scene, natural environment, warm golden hour lighting, authentic setting, editorial photography style, depth of field", type: "image" as const },
                        { label: t("studio.pillFlatLay"), prompt: "Creative flat lay composition, top-down view, artistic arrangement with complementary props, soft shadows, pastel or neutral background, magazine style", type: "image" as const },
                        { label: t("studio.pillCinematic"), prompt: "Cinematic product shot, dramatic moody lighting, anamorphic lens flare, film grain, deep shadows, rich color grading, widescreen composition", type: "image" as const },
                        { label: t("studio.pillAnimate"), prompt: "Smooth cinematic animation, gentle camera dolly movement, professional product reveal, elegant motion, studio lighting", type: "video" as const },
                      ].map(s => (
                        <button key={s.label} onClick={async () => {
                          const refUrl = attachedImage?.signedUrl;
                          if (!refUrl) { toast.error(t("studio.photoNotUploaded")); return; }
                          const msgId = `assist-pill-${Date.now()}`;
                          const userMsg: ChatMessage = { id: `user-pill-${Date.now()}`, role: "user", content: s.label };
                          const actionType = s.type === "video" ? "generate-video" : "generate-image";
                          const actionObj: StudioAction = { type: actionType, params: { prompt: s.prompt, imageUrl: refUrl, aspectRatio: "1:1", models: ["ora-vision"], model: "ora-motion" } };
                          const assistMsg: ChatMessage = {
                            id: msgId, role: "assistant",
                            content: `Je vais utiliser votre photo comme base pour créer : ${s.label.toLowerCase()}.`,
                            isGenerating: true,
                            action: actionObj,
                          };
                          if (!context.mode) setContext(prev => ({ ...prev, mode: "create" }));
                          setMessages(prev => [...prev, userMsg, assistMsg]);
                          try {
                            await executeAction(actionObj, msgId);
                          } catch (err) {
                            console.error("[studio] pill executeAction error:", err);
                            toast.error(t("studio.generationError"));
                            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isGenerating: false } : m));
                          }
                        }}
                          className="px-2.5 py-1 rounded-full transition-all cursor-pointer"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted-foreground)" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "var(--foreground)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
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

/* ── Welcome Screen ── */
function WelcomeScreen({ onSend, onSetMode }: { onSend: (text: string) => void; onSetMode: (mode: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--foreground)" }}>
          <Sparkles size={20} style={{ color: "var(--background)" }} />
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }}>
          {t("studio.welcomeTitle")}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: 8 }}>
          {t("studio.welcomeSubtitle")}
        </p>
      </motion.div>

      {/* Two main paths */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg"
      >
        <button
          onClick={() => { onSetMode("create"); onSend("__CREATE_MODE__"); }}
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all cursor-pointer group"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--secondary)" }}>
            <Wand2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{t("studio.createMode")}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>
              {t("studio.createModeDesc")}
            </div>
          </div>
        </button>

        <button
          onClick={() => { onSetMode("campaign"); onSend("__CAMPAIGN_MODE__"); }}
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all cursor-pointer group"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--secondary)" }}>
            <Rocket size={16} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{t("studio.campaignMode")}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>
              {t("studio.campaignModeDesc")}
            </div>
          </div>
        </button>
      </motion.div>

      {/* Quick suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap gap-2 mt-6 justify-center max-w-lg"
      >
        {[
          t("studio.suggestCinematic"),
          t("studio.suggestMusic"),
          t("studio.suggestText"),
          t("studio.suggestVideo"),
        ].map(s => (
          <button key={s} onClick={() => { onSetMode("create"); onSend(s); }}
            className="px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--muted-foreground)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            {s}
          </button>
        ))}
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
  onFinalize: (posts: CampaignPost[], logoUrl: string | undefined, brief: string) => void;
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

      {/* Suggestions */}
      {msg.suggestions && msg.suggestions.length > 0 && !msg.isGenerating && (
        <div className="flex flex-wrap gap-2">
          {msg.suggestions.map((s, i) => (
            <button key={i} onClick={() => onSuggestion(s)}
              className="px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Campaign Carousel — fullscreen feel ── */
function CampaignCarousel({ posts, logoUrl }: { posts: CampaignPost[]; logoUrl?: string }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [variantIdx, setVariantIdx] = useState<Record<number, number>>({});

  const post = posts[current];
  const activeVariantIdx = variantIdx[current] || 0;
  const activeVariant = post?.variants?.[activeVariantIdx];

  // Use variant data if available, else fall back to post data
  const displayText = activeVariant?.text || post?.text;
  const displayHeadline = activeVariant?.headline || post?.headline;
  const displayHashtags = activeVariant?.hashtags || post?.hashtags;
  const displayCta = activeVariant?.cta || post?.cta;
  const displayImageUrl = activeVariant?.imageUrl || post?.imageUrl;
  const displayVideoUrl = post?.videoUrl;
  const hasVisual = !!displayImageUrl || !!displayVideoUrl;

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(posts.length - 1, i + 1));

  const switchVariant = (vi: number) => {
    setVariantIdx(prev => ({ ...prev, [current]: vi }));
  };

  return (
    <>
      {/* Inline carousel */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#000" }}>
        {/* Visual area — large */}
        {hasVisual && (
          <div className="relative cursor-pointer" onClick={() => setExpanded(true)}>
            {displayVideoUrl ? (
              <video src={displayVideoUrl} controls className="w-full" style={{ maxHeight: 420, objectFit: "cover" }} />
            ) : (
              <img src={displayImageUrl} className="w-full" style={{ maxHeight: 420, objectFit: "cover" }} alt="" />
            )}
            {/* Logo overlay */}
            {logoUrl && (
              <div className="absolute bottom-3 right-3 rounded-lg overflow-hidden"
                style={{ width: 36, height: 36, background: "rgba(255,255,255,0.9)", padding: 4 }}>
                <img src={logoUrl} className="w-full h-full object-contain" alt="logo" />
              </div>
            )}
            {/* Download */}
            <a href={displayImageUrl || displayVideoUrl} download target="_blank" rel="noreferrer"
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
              onClick={e => e.stopPropagation()}>
              <Download size={14} style={{ color: "#fff" }} />
            </a>
            {/* Platform badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {post.platform}
              </span>
              <span className="px-2 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>
                {post.format.replace(post.platform + "-", "")}
              </span>
            </div>
            {/* Image model badge */}
            {activeVariant?.imageModel && (
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)", fontSize: "10px", fontWeight: 500 }}>
                {activeVariant.imageModel}
              </div>
            )}
          </div>
        )}

        {/* Variant tabs — shown when multiple models */}
        {post?.variants && post.variants.length > 1 && (
          <div className="flex items-center gap-1 px-4 py-2.5"
            style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
            <Columns2 size={12} style={{ color: "var(--muted-foreground)", marginRight: 4 }} />
            {post.variants.map((v, vi) => (
              <button
                key={vi}
                onClick={() => switchVariant(vi)}
                className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                style={{
                  background: vi === activeVariantIdx ? "var(--foreground)" : "var(--secondary)",
                  color: vi === activeVariantIdx ? "var(--background)" : "var(--text-primary)",
                  fontSize: "10px", fontWeight: 600,
                  border: "1px solid",
                  borderColor: vi === activeVariantIdx ? "var(--foreground)" : "var(--border)",
                }}>
                {v.imageModel || v.model}
              </button>
            ))}
          </div>
        )}

        {/* Text content */}
        <div className="p-5 space-y-3" style={{ background: "var(--card)" }}>
          {!hasVisual && (
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-lg"
                style={{ background: "var(--secondary)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
                {post.platform}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                {post.format.replace(post.platform + "-", "")}
              </span>
            </div>
          )}
          {displayHeadline && (
            <div style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.3 }}>{displayHeadline}</div>
          )}
          <div style={{ fontSize: "13.5px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {displayText}
          </div>
          {displayHashtags && (
            <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 500 }}>{displayHashtags}</div>
          )}
          {displayCta && (
            <div className="flex items-center gap-1.5 pt-1">
              <ArrowRight size={12} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{displayCta}</span>
            </div>
          )}
          {/* Model label for text variant */}
          {activeVariant && (
            <div style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 4 }}>
              {t("studio.textLabel")} : {activeVariant.model}
            </div>
          )}
        </div>

        {/* Navigation bar */}
        {posts.length > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
            <button onClick={prev} disabled={current === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-20"
              style={{ background: "var(--secondary)" }}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              {posts.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className="transition-all cursor-pointer rounded-full"
                  style={{
                    width: i === current ? 20 : 6, height: 6,
                    background: i === current ? "var(--foreground)" : "var(--border)",
                  }} />
              ))}
            </div>
            <button onClick={next} disabled={current === posts.length - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-20"
              style={{ background: "var(--secondary)" }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {expanded && hasVisual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setExpanded(false)}>
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer z-10"
              style={{ background: "rgba(255,255,255,0.1)" }}
              onClick={() => setExpanded(false)}>
              <X size={20} style={{ color: "#fff" }} />
            </button>
            {/* Navigation */}
            {posts.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prev(); }}
                  disabled={current === 0}
                  className="absolute left-4 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-20 z-10"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  <ChevronLeft size={24} style={{ color: "#fff" }} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); next(); }}
                  disabled={current === posts.length - 1}
                  className="absolute right-4 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-20 z-10"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  <ChevronRight size={24} style={{ color: "#fff" }} />
                </button>
              </>
            )}
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-4xl max-h-[85vh]"
              onClick={e => e.stopPropagation()}>
              {displayVideoUrl ? (
                <video src={displayVideoUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl" />
              ) : (
                <img src={displayImageUrl} className="max-w-full max-h-[85vh] rounded-xl" alt="" />
              )}
              {logoUrl && (
                <div className="absolute bottom-4 right-4 rounded-xl overflow-hidden"
                  style={{ width: 48, height: 48, background: "rgba(255,255,255,0.9)", padding: 6 }}>
                  <img src={logoUrl} className="w-full h-full object-contain" alt="logo" />
                </div>
              )}
              {/* Counter */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "12px", fontWeight: 500 }}>
                {current + 1} / {posts.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Result card ── */
function ResultCard({ result, onCompare, onFinalize, onEdit, logoUrl }: {
  result: GeneratedResult;
  onCompare: (result: GeneratedResult) => void;
  onFinalize: (posts: CampaignPost[], logoUrl: string | undefined, brief: string) => void;
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
                        title="Éditer">
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
    return (
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl p-4 relative"
            style={{
              background: "var(--card)",
              border: selected.has(i) ? "2px solid var(--foreground)" : "1px solid var(--border)",
              cursor: result.items.length > 1 ? "pointer" : "default",
            }}
            onClick={() => result.items.length > 1 && toggleSelect(i)}>
            {result.items.length > 1 && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: selected.has(i) ? "var(--foreground)" : "var(--secondary)", border: "1.5px solid var(--border)" }}>
                  {selected.has(i) && <Check size={10} style={{ color: "var(--background)" }} />}
                </div>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  {item.model}
                </span>
              </div>
            )}
            <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {item.text}
            </div>
            {/* Copy button */}
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.text || ""); toast.success(t("studio.textCopied")); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
              title="Copier">
              <BookOpen size={12} />
            </button>
          </div>
        ))}
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
    return (
      <div className="space-y-3">
        <CampaignCarousel posts={result.campaignPosts} logoUrl={logoUrl || result.logoUrl} />
        <button
          onClick={() => onFinalize(result.campaignPosts!, logoUrl || result.logoUrl, result.prompt)}
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
  { id: "blog-article", label: "Blog SEO", platform: "Web", icon: BookOpen, type: "text" as const },
];

const CONFIG_PLATFORMS = [
  { name: "LinkedIn", icon: Linkedin },
  { name: "Instagram", icon: Instagram },
  { name: "Facebook", icon: Facebook },
  { name: "TikTok", icon: Clapperboard },
  { name: "Twitter/X", icon: Twitter },
  { name: "YouTube", icon: Youtube },
  { name: "Pinterest", icon: ImageIcon },
  { name: "Web", icon: BookOpen },
];

const CONFIG_TEXT_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast" },
  { id: "gpt-4.1", label: "GPT-4.1", badge: "Smart" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet", badge: "Creative" },
  { id: "claude-haiku-4-20250514", label: "Claude Haiku", badge: "Ultra Fast" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", badge: "Multimodal" },
];

const CONFIG_IMAGE_MODELS = [
  { id: "photon-1", label: "Luma Photon", badge: "Quality" },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast" },
  { id: "flux-pro-v1.1", label: "Flux Pro", badge: "Creative" },
  { id: "flux-schnell", label: "Flux Schnell", badge: "Ultra Fast" },
  { id: "dall-e-3", label: "DALL-E 3", badge: "Precise" },
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

function CampaignFinalizer({ posts: initialPosts, logoUrl, brief, vault, serverPost, serverGet, onClose, onSaved }: {
  posts: CampaignPost[];
  logoUrl?: string;
  brief: string;
  vault: any;
  serverPost: (path: string, body: any, timeoutMs?: number) => Promise<any>;
  serverGet: (path: string) => Promise<any>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<FinalizerStep>("review");
  const [posts, setPosts] = useState<CampaignPost[]>(initialPosts.map(p => ({ ...p })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState(`Campagne ${new Date().toLocaleDateString("fr-FR")}`);
  const [scheduling, setScheduling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<Record<number, { date: string; time: string }>>({});
  const [aiScheduling, setAiScheduling] = useState(false);

  const steps: { key: FinalizerStep; label: string; icon: any }[] = [
    { key: "review", label: t("studio.reviewAndEdit"), icon: Pencil },
    { key: "schedule", label: t("studio.calendarLabel"), icon: Calendar },
    { key: "save", label: t("studio.saveLabel"), icon: Save },
  ];

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
      const res = await serverPost("/calendar/generate", { assets, brief, campaignTheme: campaignName });
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
                      {/* Image preview */}
                      {post.imageUrl && (
                        <img src={post.imageUrl} className="w-full rounded-lg" style={{ maxHeight: 200, objectFit: "cover" }} alt="" />
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
  const [brief, setBrief] = useState(params.brief || "");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    params.formats || ["linkedin-post", "instagram-post", "facebook-post"]
  );
  const [selectedProduct, setSelectedProduct] = useState<string>(params.productId || "");
  const [objective, setObjective] = useState(params.objective || "");
  const [tone, setTone] = useState(params.toneOfVoice || "Professionnel");
  const [targetAudience, setTargetAudience] = useState(params.targetAudience || "");
  const [callToAction, setCallToAction] = useState(params.callToAction || "");
  const [contentAngle, setContentAngle] = useState(params.contentAngle || "");
  const [keyMessages, setKeyMessages] = useState(params.keyMessages || "");
  const [language, setLanguage] = useState(params.language || "auto");
  const [textModels, setTextModels] = useState<string[]>(["gpt-4o"]);
  const [imageModels, setImageModels] = useState<string[]>(["photon-1"]);
  const [inspiring, setInspiring] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const togglePlatform = (platform: string) => {
    const platformFormats = CONFIG_FORMATS.filter(f => f.platform === platform).map(f => f.id);
    const allSelected = platformFormats.every(f => selectedFormats.includes(f));
    if (allSelected) {
      setSelectedFormats(prev => prev.filter(f => !platformFormats.includes(f)));
    } else {
      setSelectedFormats(prev => [...new Set([...prev, ...platformFormats])]);
    }
  };

  const toggleTextModel = (id: string) => {
    setTextModels(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev // keep at least 1
        : [...prev, id]
    );
  };

  const toggleImageModel = (id: string) => {
    setImageModels(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );
  };

  const handleInspireMe = async () => {
    setInspiring(true);
    try {
      const res = await serverPost("/topics/suggest", {
        productId: selectedProduct || undefined,
        count: 3,
      });
      if (res.success && res.topics?.length) {
        const topic = res.topics[0];
        if (topic.brief) setBrief(topic.brief);
        if (topic.angle) setContentAngle(topic.angle);
        if (topic.objective) setObjective(topic.objective);
      }
    } catch { /* ignore */ }
    setInspiring(false);
  };

  const handleGenerate = () => {
    if (!selectedFormats.length) {
      toast.error(t("studio.selectAtLeastOneFormat"));
      return;
    }
    onGenerate({
      brief,
      formats: selectedFormats,
      productId: selectedProduct,
      objective,
      toneOfVoice: tone,
      targetAudience,
      callToAction,
      contentAngle,
      keyMessages,
      language,
      textModels,
      imageModels,
    });
  };

  const brandName = vault?.brandName || vault?.brand_name || vault?.sections?.find((s: any) =>
    s.items?.find((i: any) => i.label?.toLowerCase().includes("nom"))
  )?.items?.find((i: any) => i.label?.toLowerCase().includes("nom"))?.value || "";

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

      <div className="px-5 py-4 space-y-5" style={{ maxHeight: "60vh", overflowY: "auto" }}>

        {/* Brief */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
              {t("studio.briefLabel")}
            </label>
            <button
              onClick={handleInspireMe}
              disabled={inspiring}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              style={{ background: "var(--secondary)", fontSize: "11px", fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--secondary)"; }}>
              {inspiring ? <Loader2 size={11} className="animate-spin" /> : <Lightbulb size={11} />}
              {t("studio.inspireMe")}
            </button>
          </div>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder={t("studio.briefPlaceholder")}
            className="w-full rounded-xl px-3.5 py-2.5 resize-none outline-none transition-all"
            style={{
              background: "var(--secondary)", border: "1px solid var(--border)",
              fontSize: "13px", lineHeight: 1.6, minHeight: 72,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Product selector */}
        {products.length > 0 && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
              <Package size={11} className="inline mr-1.5" style={{ verticalAlign: "-1px" }} />
              {t("studio.productLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProduct("")}
                className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: !selectedProduct ? "var(--foreground)" : "var(--secondary)",
                  color: !selectedProduct ? "var(--background)" : "var(--text-primary)",
                  border: "1px solid",
                  borderColor: !selectedProduct ? "var(--foreground)" : "var(--border)",
                  fontSize: "12px", fontWeight: 500,
                }}>
                {t("studio.globalBrand")}
              </button>
              {products.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p.id)}
                  className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  style={{
                    background: selectedProduct === p.id ? "var(--foreground)" : "var(--secondary)",
                    color: selectedProduct === p.id ? "var(--background)" : "var(--text-primary)",
                    border: "1px solid",
                    borderColor: selectedProduct === p.id ? "var(--foreground)" : "var(--border)",
                    fontSize: "12px", fontWeight: 500,
                  }}>
                  {p.name}
                  {p.price && <span style={{ opacity: 0.6, marginLeft: 4 }}>· {p.price}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Format selection */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
            {t("studio.formatsLabel")} ({selectedFormats.length} {t("studio.formatsSelected")})
          </label>
          <div className="space-y-3">
            {CONFIG_PLATFORMS.map(platform => {
              const formats = CONFIG_FORMATS.filter(f => f.platform === platform.name);
              const selectedCount = formats.filter(f => selectedFormats.includes(f.id)).length;
              const Icon = platform.icon;
              return (
                <div key={platform.name}>
                  <button
                    onClick={() => togglePlatform(platform.name)}
                    className="flex items-center gap-2 mb-1.5 cursor-pointer group"
                    style={{ fontSize: "12px", fontWeight: 600 }}>
                    <Icon size={13} style={{ color: "var(--muted-foreground)" }} />
                    <span>{platform.name}</span>
                    {selectedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded" style={{
                        background: "var(--foreground)", color: "var(--background)",
                        fontSize: "10px", fontWeight: 700,
                      }}>
                        {selectedCount}
                      </span>
                    )}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {formats.map(fmt => {
                      const selected = selectedFormats.includes(fmt.id);
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => toggleFormat(fmt.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          style={{
                            background: selected ? "var(--foreground)" : "var(--secondary)",
                            color: selected ? "var(--background)" : "var(--text-primary)",
                            border: "1px solid",
                            borderColor: selected ? "var(--foreground)" : "var(--border)",
                            fontSize: "11px", fontWeight: 500,
                          }}>
                          {selected && <Check size={10} />}
                          {fmt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
            {t("studio.toneLabel")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TONE_OPTIONS.map(tn => (
              <button
                key={tn}
                onClick={() => setTone(tn)}
                className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: tone === tn ? "var(--foreground)" : "var(--secondary)",
                  color: tone === tn ? "var(--background)" : "var(--text-primary)",
                  border: "1px solid",
                  borderColor: tone === tn ? "var(--foreground)" : "var(--border)",
                  fontSize: "11px", fontWeight: 500,
                }}>
                {tn}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ AI MODELS — COMPARE — first-class section ═══ */}
        <div className="rounded-xl p-4" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Columns2 size={13} style={{ color: "var(--foreground)" }} />
            <label style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("studio.aiModelsLabel")}
            </label>
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 500 }}>
              — {t("studio.aiModelsCompareHint")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                {t("studio.textLabel")}
                {textModels.length > 1 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "9px", fontWeight: 700 }}>
                    {textModels.length} {t("studio.modelsCount")}
                  </span>
                )}
              </label>
              <div className="space-y-1">
                {CONFIG_TEXT_MODELS.map(m => {
                  const sel = textModels.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleTextModel(m.id)}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      style={{
                        background: sel ? "var(--foreground)" : "transparent",
                        color: sel ? "var(--background)" : "var(--text-primary)",
                        fontSize: "11px", fontWeight: 500,
                      }}>
                      {sel && <Check size={10} />}
                      <span>{m.label}</span>
                      <span style={{ fontSize: "9px", opacity: 0.6, marginLeft: "auto" }}>{m.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                Image
                {imageModels.length > 1 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "9px", fontWeight: 700 }}>
                    {imageModels.length} {t("studio.modelsCount")}
                  </span>
                )}
              </label>
              <div className="space-y-1">
                {CONFIG_IMAGE_MODELS.map(m => {
                  const sel = imageModels.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleImageModel(m.id)}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      style={{
                        background: sel ? "var(--foreground)" : "transparent",
                        color: sel ? "var(--background)" : "var(--text-primary)",
                        fontSize: "11px", fontWeight: 500,
                      }}>
                      {sel && <Check size={10} />}
                      <span>{m.label}</span>
                      <span style={{ fontSize: "9px", opacity: 0.6, marginLeft: "auto" }}>{m.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Language */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>
            <Languages size={11} className="inline mr-1.5" style={{ verticalAlign: "-1px" }} />
            {t("studio.languageLabel")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map(l => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: language === l.id ? "var(--foreground)" : "var(--secondary)",
                  color: language === l.id ? "var(--background)" : "var(--text-primary)",
                  border: "1px solid",
                  borderColor: language === l.id ? "var(--foreground)" : "var(--border)",
                  fontSize: "11px", fontWeight: 500,
                }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle — refinement fields */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 cursor-pointer transition-all w-full"
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>
          <ChevronDown size={13} style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }} />
          {t("studio.refineAdvanced")}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Objective */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  <Target size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} /> {t("studio.objectiveLabel")}
                </label>
                <input
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  placeholder={t("studio.objectivePlaceholder")}
                  className="w-full rounded-lg px-3 py-2 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Target audience */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  {t("studio.targetLabel")}
                </label>
                <input
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  placeholder={t("studio.targetPlaceholder")}
                  className="w-full rounded-lg px-3 py-2 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* CTA */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  {t("studio.ctaFieldLabel")}
                </label>
                <input
                  value={callToAction}
                  onChange={e => setCallToAction(e.target.value)}
                  placeholder={t("studio.ctaFieldPlaceholder")}
                  className="w-full rounded-lg px-3 py-2 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Content angle */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  {t("studio.contentAngleLabel")}
                </label>
                <input
                  value={contentAngle}
                  onChange={e => setContentAngle(e.target.value)}
                  placeholder={t("studio.contentAnglePlaceholder")}
                  className="w-full rounded-lg px-3 py-2 outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Key messages */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  {t("studio.keyMessagesLabel")}
                </label>
                <textarea
                  value={keyMessages}
                  onChange={e => setKeyMessages(e.target.value)}
                  placeholder={t("studio.keyMessagesPlaceholder")}
                  className="w-full rounded-lg px-3 py-2 resize-none outline-none transition-all"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px", minHeight: 56 }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — Generate button */}
      <div className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {selectedFormats.length} {selectedFormats.length > 1 ? t("studio.formatPlural") : t("studio.formatSingular")}
          {selectedProduct && ` · ${products.find((p: any) => p.id === selectedProduct)?.name || "Produit"}`}
          {(textModels.length > 1 || imageModels.length > 1) && (
            <span style={{ color: "var(--foreground)", fontWeight: 600 }}>
              {" · "}{t("studio.comparisonLabel")} {textModels.length > 1 ? `${textModels.length} ${t("studio.textsCount")}` : ""}{textModels.length > 1 && imageModels.length > 1 ? " + " : ""}{imageModels.length > 1 ? `${imageModels.length} ${t("studio.imagesCount")}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl cursor-pointer transition-all"
            style={{ background: "var(--secondary)", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            {t("studio.cancel")}
          </button>
          <button
            onClick={handleGenerate}
            disabled={!selectedFormats.length}
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
