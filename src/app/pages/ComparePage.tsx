import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Clock, DollarSign, FileText, Image as ImageIcon, Video,
  Play, CheckCircle2, Circle, Loader2, Trophy, AlertTriangle,
  ChevronDown, ChevronRight, X, BarChart3, ArrowRight, Download,
  Type, Hash, MessageSquare, Sparkles, Shield, Eye,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════════════════════════════
   COMPARE PAGE — ORA Intelligence Report (Yuka for AI)
   43 AI models, real KPIs, deterministic scoring, cost transparency
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA77OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Tier type ──
type ModelTier = "economy" | "standard" | "premium";

// ── Model catalogs (enriched with providerCostEur, strengths, bestFor, tier) ──
const TEXT_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast", credits: 2, costEur: 0.20, providerCostEur: 0.008, strengths: ["speed", "instruction-following", "multilingual"], bestFor: "Fast multilingual content", tier: "standard" as ModelTier },
  { id: "gpt-5", label: "GPT-5", badge: "Smart", credits: 3, costEur: 0.30, providerCostEur: 0.015, strengths: ["reasoning", "nuance", "quality"], bestFor: "Complex briefs, nuanced copy", tier: "premium" as ModelTier },
  { id: "gpt-5.1", label: "GPT-5.1", badge: "Premium", credits: 3, costEur: 0.30, providerCostEur: 0.020, strengths: ["premium", "reasoning", "creativity"], bestFor: "Premium campaigns, top quality", tier: "premium" as ModelTier },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative", credits: 2, costEur: 0.20, providerCostEur: 0.012, strengths: ["creativity", "tone", "storytelling"], bestFor: "Creative storytelling, brand voice", tier: "standard" as ModelTier },
  { id: "claude-haiku", label: "Claude Haiku", badge: "Ultra Fast", credits: 1, costEur: 0.10, providerCostEur: 0.002, strengths: ["ultra-fast", "concise", "affordable"], bestFor: "Quick drafts, high volume", tier: "economy" as ModelTier },
  { id: "claude-opus", label: "Claude Opus", badge: "Best", credits: 5, costEur: 0.50, providerCostEur: 0.060, strengths: ["depth", "strategy", "premium"], bestFor: "Strategic content, long-form", tier: "premium" as ModelTier },
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Multimodal", credits: 2, costEur: 0.20, providerCostEur: 0.010, strengths: ["multimodal", "analysis", "factual"], bestFor: "Data-driven content, analysis", tier: "standard" as ModelTier },
  { id: "deepseek", label: "DeepSeek v3", badge: "Open Source", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["open-source", "affordable", "technical"], bestFor: "Technical content, budget-conscious", tier: "economy" as ModelTier },
  { id: "ora-writer", label: "ORA Writer", badge: "Agence", credits: 2, costEur: 0.20, providerCostEur: 0.012, strengths: ["agency-tuned", "brand-aware", "balanced"], bestFor: "Brand-aligned campaigns", tier: "standard" as ModelTier },
];

const IMAGE_MODELS = [
  { id: "ideogram-3-leo", label: "Ideogram V3", badge: "Brand + Text", credits: 5, costEur: 0.50, providerCostEur: 0.074, strengths: ["text-rendering", "branding", "logos"], bestFor: "Logos, text on images, brand assets", tier: "premium" as ModelTier },
  { id: "photon-1", label: "Luma Photon", badge: "Quality", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["realism", "lighting", "portraits"], bestFor: "Photo-realistic portraits, natural lighting", tier: "standard" as ModelTier },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast", credits: 3, costEur: 0.30, providerCostEur: 0.014, strengths: ["speed", "realism", "iteration"], bestFor: "Quick iterations, social media content", tier: "economy" as ModelTier },
  { id: "gpt-image-leo", label: "GPT Image", badge: "GPT-4o", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["instruction-following", "creative", "detail"], bestFor: "Complex prompts, creative concepts", tier: "premium" as ModelTier },
  { id: "dall-e", label: "DALL-E 3", badge: "Precise", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["precision", "instruction-following", "compositions"], bestFor: "Precise compositions, editorial content", tier: "premium" as ModelTier },
  { id: "flux-pro", label: "Flux Pro", badge: "Creative", credits: 8, costEur: 0.80, providerCostEur: 0.046, strengths: ["creative", "artistic", "detail"], bestFor: "Artistic visuals, creative campaigns", tier: "premium" as ModelTier },
  { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.023, strengths: ["quality", "detail", "creative"], bestFor: "High-end campaigns, premium content", tier: "premium" as ModelTier },
  { id: "flux-dev-leo", label: "Flux Dev", badge: "Open", credits: 5, costEur: 0.50, providerCostEur: 0.023, strengths: ["open-source", "flexible", "detail"], bestFor: "Flexible styling, custom workflows", tier: "standard" as ModelTier },
  { id: "flux-schnell-leo", label: "Flux Schnell", badge: "Ultra Fast", credits: 3, costEur: 0.30, providerCostEur: 0.003, strengths: ["ultra-fast", "iteration", "drafts"], bestFor: "Rapid prototyping, draft concepts", tier: "economy" as ModelTier },
  { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Edit", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["editing", "consistency", "variations"], bestFor: "Image editing, maintaining consistency", tier: "standard" as ModelTier },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["photo-realism", "product-shots", "e-commerce"], bestFor: "Product photography, e-commerce", tier: "standard" as ModelTier },
  { id: "leonardo-lightning", label: "Leonardo Lightning", badge: "Fast", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["speed", "drafts", "volume"], bestFor: "High-volume generation, fast drafts", tier: "economy" as ModelTier },
  { id: "leonardo-kino", label: "Leonardo Kino", badge: "Cinema", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["cinematic", "mood", "storytelling"], bestFor: "Cinematic stills, mood boards", tier: "standard" as ModelTier },
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["detail", "textures", "environments"], bestFor: "Detailed environments, textures", tier: "standard" as ModelTier },
  { id: "seedream-v4.5", label: "SeedDream v4.5", badge: "Latest", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["detail", "latest", "quality"], bestFor: "Latest quality, detailed scenes", tier: "standard" as ModelTier },
  { id: "soul", label: "Soul", badge: "Artistic", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["artistic", "stylized", "creative"], bestFor: "Artistic interpretations, stylized content", tier: "standard" as ModelTier },
  { id: "nano-banana", label: "Nano Banana", badge: "Fast", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["fast", "general", "versatile"], bestFor: "General purpose, fast generation", tier: "economy" as ModelTier },
  { id: "nano-banana-2-leo", label: "Nano Banana 2", badge: "Upgraded", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["improved", "versatile", "quality"], bestFor: "Versatile content creation", tier: "standard" as ModelTier },
  { id: "ora-vision", label: "ORA Vision", badge: "Agence", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["realism", "balanced", "agency-tuned"], bestFor: "Agency-grade balanced output", tier: "standard" as ModelTier },
];

const VIDEO_MODELS = [
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["quality", "motion", "cinematic"], bestFor: "Cinematic quality, smooth motion", tier: "premium" as ModelTier },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast", credits: 20, costEur: 2.00, providerCostEur: 0.14, strengths: ["speed", "good-quality", "iteration"], bestFor: "Fast video iteration", tier: "economy" as ModelTier },
  { id: "veo-3.1", label: "Veo 3.1", badge: "Google", credits: 30, costEur: 3.00, providerCostEur: 0.50, strengths: ["google", "quality", "latest"], bestFor: "Latest Google quality", tier: "premium" as ModelTier },
  { id: "sora-2", label: "Sora 2", badge: "OpenAI", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["openai", "creative", "narrative"], bestFor: "Creative narratives", tier: "premium" as ModelTier },
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic", credits: 40, costEur: 4.00, providerCostEur: 0.35, strengths: ["cinematic", "premium", "character"], bestFor: "Character-driven scenes", tier: "premium" as ModelTier },
  { id: "seedance-v1", label: "Seedance v1", badge: "TikTok", credits: 40, costEur: 4.00, providerCostEur: 0.28, strengths: ["tiktok", "vertical", "dance"], bestFor: "Vertical/TikTok content", tier: "standard" as ModelTier },
  { id: "seedance-2.0", label: "Seedance 2.0", badge: "Latest", credits: 30, costEur: 3.00, providerCostEur: 0.25, strengths: ["improved", "versatile", "quality"], bestFor: "Versatile video content", tier: "standard" as ModelTier },
  { id: "runway-gen3", label: "Runway Gen-3", badge: "Creative", credits: 30, costEur: 3.00, providerCostEur: 0.50, strengths: ["creative", "artistic", "style"], bestFor: "Artistic video experiments", tier: "premium" as ModelTier },
  { id: "pika", label: "Pika", badge: "Fun", credits: 20, costEur: 2.00, providerCostEur: 0.10, strengths: ["fun", "affordable", "quick"], bestFor: "Quick fun animations", tier: "economy" as ModelTier },
  { id: "dop", label: "DOP", badge: "Artistic", credits: 20, costEur: 2.00, providerCostEur: 0.09, strengths: ["artistic", "experimental", "stylized"], bestFor: "Stylized artistic video", tier: "economy" as ModelTier },
  { id: "ora-motion", label: "ORA Motion", badge: "Agence", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["agency", "balanced", "campaign"], bestFor: "Campaign video content", tier: "standard" as ModelTier },
];

type CompareMode = "text" | "image" | "video";
type StepStatus = "pending" | "running" | "done" | "error";

interface TextKPIs {
  model: string;
  label: string;
  timeMs: number;
  costEur: number;
  credits: number;
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  fleschScore: number;
  lexicalRichness: number; // TTR
  repeatedWords: { word: string; count: number }[];
  hasCTA: boolean;
  hashtagCount: number;
  emojiCount: number;
  questionCount: number;
  spamWords: string[];
  languageMatch: boolean;
  output: string;
  success: boolean;
  error?: string;
}

interface ImageKPIs {
  model: string;
  label: string;
  timeMs: number;
  costEur: number;
  credits: number;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSizeKB: number;
  format: string;
  retries: number;
  imageUrl: string;
  success: boolean;
  error?: string;
}

interface VideoKPIs {
  model: string;
  label: string;
  timeMs: number;
  costEur: number;
  credits: number;
  resolution: string;
  durationSec: number;
  fileSizeMB: number;
  pollCount: number;
  videoUrl: string;
  success: boolean;
  error?: string;
}

// ── Category scores for detailed breakdowns ──
interface CategoryScores {
  speed: number;
  value: number;
  quality: number;
  reliability: number;
  overall: number;
}

// ── Text analysis (pure computation, zero AI) ──
function analyzeText(text: string, requestedLang: string): Omit<TextKPIs, "model" | "label" | "timeMs" | "costEur" | "credits" | "success" | "error"> {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;

  // Flesch Reading Ease (adapted)
  const syllableCount = words.reduce((acc, w) => {
    const s = w.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿæœç]/g, "");
    let count = 0;
    let prevVowel = false;
    for (const ch of s) {
      const isVowel = "aeiouyàâäéèêëïîôùûüÿæœ".includes(ch);
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }
    return acc + Math.max(1, count);
  }, 0);
  const fleschScore = sentenceCount > 0 && wordCount > 0
    ? Math.round(Math.max(0, Math.min(100, 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount))))
    : 0;

  // Lexical richness (TTR - Type-Token Ratio)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿæœç0-9]/g, "")));
  const lexicalRichness = wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 100) / 100 : 0;

  // Repeated words (>2 occurrences, excluding stop words)
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither", "each", "every", "all", "any", "few", "more", "most", "other", "some", "such", "no", "only", "own", "same", "than", "too", "very", "just", "because", "if", "when", "where", "how", "what", "which", "who", "whom", "this", "that", "these", "those", "it", "its", "my", "your", "his", "her", "our", "their", "me", "him", "us", "them", "i", "you", "he", "she", "we", "they",
    "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux", "et", "ou", "mais", "donc", "car", "ni", "que", "qui", "quoi", "dont", "ce", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "votre", "leur", "nous", "vous", "ils", "elles", "je", "tu", "il", "elle", "on", "en", "dans", "par", "pour", "sur", "avec", "est", "sont", "être", "avoir", "fait", "plus", "pas"]);
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const lw = w.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿæœç0-9]/g, "");
    if (lw.length > 2 && !stopWords.has(lw)) wordFreq[lw] = (wordFreq[lw] || 0) + 1;
  }
  const repeatedWords = Object.entries(wordFreq)
    .filter(([, c]) => c > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  // CTA detection (imperative verbs at end)
  const lastSentence = sentences[sentences.length - 1]?.trim().toLowerCase() || "";
  const ctaVerbs = ["click", "buy", "shop", "order", "subscribe", "sign up", "join", "get", "start", "try", "discover", "learn", "download", "book", "reserve", "contact", "call", "visit", "apply",
    "cliquez", "achetez", "commandez", "inscrivez", "rejoignez", "obtenez", "commencez", "essayez", "découvrez", "apprenez", "téléchargez", "réservez", "contactez", "appelez", "visitez"];
  const hasCTA = ctaVerbs.some(v => lastSentence.includes(v)) || /👉|➡️|→|↗️/.test(text.slice(-100));

  // Counts
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;

  // Spam words
  const spamList = ["gratuit", "free", "urgent", "incroyable", "amazing", "incredible", "exceptionnel", "exceptional", "révolutionnaire", "revolutionary", "meilleur", "best", "#1", "n°1", "garanti", "guaranteed", "offre limitée", "limited offer", "exclusif", "exclusive", "sensationnel", "leader"];
  const spamWords = spamList.filter(sw => text.toLowerCase().includes(sw));

  // Language match
  const frPatterns = /\b(le|la|les|des|est|sont|nous|vous|avec|dans|pour|cette|votre|notre)\b/gi;
  const enPatterns = /\b(the|is|are|this|that|with|your|our|their|have|from)\b/gi;
  const frCount = (text.match(frPatterns) || []).length;
  const enCount = (text.match(enPatterns) || []).length;
  const detectedLang = frCount > enCount ? "fr" : "en";
  const languageMatch = detectedLang === requestedLang;

  return { output: text, wordCount, charCount, sentenceCount, avgSentenceLength, fleschScore, lexicalRichness, repeatedWords, hasCTA, hashtagCount, emojiCount, questionCount, spamWords, languageMatch };
}

// ── Scoring functions ──

function scoreTextModel(kpi: TextKPIs, allKPIs: TextKPIs[]): CategoryScores {
  if (!kpi.success) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const minTime = Math.min(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));
  const minCost = Math.min(...successfulKPIs.map(k => k.costEur));

  const speed = maxTime > minTime ? Math.round(((maxTime - kpi.timeMs) / (maxTime - minTime)) * 100) : 100;
  const value = maxCost > minCost ? Math.round(((maxCost - kpi.costEur) / (maxCost - minCost)) * 100) : 100;
  const readabilityScore = kpi.fleschScore;
  const richnessScore = Math.min(100, Math.round(kpi.lexicalRichness * 200));
  const ctaBonus = kpi.hasCTA ? 10 : 0;
  const spamPenalty = kpi.spamWords.length * 5;
  const langPenalty = kpi.languageMatch ? 0 : 20;
  const repeatPenalty = Math.min(15, kpi.repeatedWords.length * 3);
  const quality = Math.round(Math.max(0, Math.min(100,
    (readabilityScore * 0.5) + (richnessScore * 0.5) + ctaBonus - spamPenalty - langPenalty - repeatPenalty
  )));
  const reliability = 100;

  const overall = Math.round(Math.max(0, Math.min(100,
    (speed * 0.25) + (value * 0.20) + (quality * 0.35) + (reliability * 0.20)
  )));

  return { speed, value, quality, reliability, overall };
}

function scoreImageModel(kpi: ImageKPIs, allKPIs: ImageKPIs[]): CategoryScores {
  if (!kpi.success) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const minTime = Math.min(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));
  const minCost = Math.min(...successfulKPIs.map(k => k.costEur));
  const maxPixels = Math.max(...successfulKPIs.map(k => k.width * k.height));

  const speed = maxTime > minTime ? Math.round(((maxTime - kpi.timeMs) / (maxTime - minTime)) * 100) : 100;

  // Value: providerCostEur ratio — lower provider cost relative to ORA cost = better value
  const modelInfo = IMAGE_MODELS.find(m => m.id === kpi.model);
  const providerCost = modelInfo?.providerCostEur || 0;
  const maxProviderCost = Math.max(...successfulKPIs.map(k => IMAGE_MODELS.find(m => m.id === k.model)?.providerCostEur || 0));
  const minProviderCost = Math.min(...successfulKPIs.map(k => IMAGE_MODELS.find(m => m.id === k.model)?.providerCostEur || 0));
  const value = maxCost > minCost ? Math.round(((maxCost - kpi.costEur) / (maxCost - minCost)) * 100) : 100;

  // Resolution score
  const resolutionScore = maxPixels > 0 ? Math.round(((kpi.width * kpi.height) / maxPixels) * 100) : 100;

  // Reliability
  const reliability = kpi.success ? 100 : 0;

  // ORA margin score: higher margin = lower score for user (less value for money)
  const marginPct = kpi.costEur > 0 ? (kpi.costEur - providerCost) / kpi.costEur : 0;
  const marginScore = Math.round(Math.max(0, (1 - marginPct) * 100));

  const overall = Math.round(Math.max(0, Math.min(100,
    (speed * 0.30) + (value * 0.20) + (reliability * 0.20) + (resolutionScore * 0.15) + (marginScore * 0.15)
  )));

  // "quality" in the card will show resolution score
  return { speed, value, quality: resolutionScore, reliability, overall };
}

function scoreVideoModel(kpi: VideoKPIs, allKPIs: VideoKPIs[]): CategoryScores {
  if (!kpi.success) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 };

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const minTime = Math.min(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));
  const minCost = Math.min(...successfulKPIs.map(k => k.costEur));

  const speed = maxTime > minTime ? Math.round(((maxTime - kpi.timeMs) / (maxTime - minTime)) * 100) : 100;
  const value = maxCost > minCost ? Math.round(((maxCost - kpi.costEur) / (maxCost - minCost)) * 100) : 100;
  const reliability = 100;
  const quality = 80; // base for successful video

  const overall = Math.round(Math.max(0, Math.min(100,
    (speed * 0.30) + (value * 0.25) + (reliability * 0.25) + (quality * 0.20)
  )));

  return { speed, value, quality, reliability, overall };
}

// ── Helper: get model info from any catalog ──
function getModelInfo(modelId: string, mode: CompareMode) {
  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  return catalog.find(m => m.id === modelId);
}

// ── Recommendation engine ──
interface Recommendation {
  winnerId: string;
  winnerLabel: string;
  winnerScore: number;
  winnerCategories: CategoryScores;
  reason: string;
  whyBullets: string[];
  insights: string[];
  useCaseInsights: string[];
  allScores: { modelId: string; label: string; scores: CategoryScores }[];
}

function generateTextRecommendation(results: TextKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, winnerCategories: { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 }, reason: isFr ? "Aucun modele n'a produit de resultat." : "No model produced a result.", whyBullets: [], insights: [], useCaseInsights: [], allScores: [] };

  const allScores = results.map(r => ({ modelId: r.model, label: r.label, scores: scoreTextModel(r, results) }));
  const scoredResults = successful.map(r => ({ ...r, scores: scoreTextModel(r, results) }));
  scoredResults.sort((a, b) => b.scores.overall - a.scores.overall);
  const winner = scoredResults[0];
  const insights: string[] = [];
  const whyBullets: string[] = [];

  // Speed insight
  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    const ratio = (slowest.timeMs / fastest.timeMs).toFixed(1);
    insights.push(isFr
      ? `**Vitesse** -- ${fastest.label} a genere en ${(fastest.timeMs / 1000).toFixed(1)}s, soit **${ratio}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
      : `**Speed** -- ${fastest.label} generated in ${(fastest.timeMs / 1000).toFixed(1)}s, **${ratio}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
    );
  }

  // Cost insight
  const cheapest = successful.reduce((a, b) => a.costEur < b.costEur ? a : b);
  const priciest = successful.reduce((a, b) => a.costEur > b.costEur ? a : b);
  if (cheapest.costEur !== priciest.costEur) {
    const saving = ((priciest.costEur - cheapest.costEur) * 100).toFixed(0);
    insights.push(isFr
      ? `**Cout** -- ${cheapest.label} coute ${cheapest.costEur.toFixed(2)}EUR, contre ${priciest.costEur.toFixed(2)}EUR pour ${priciest.label}. Sur 100 textes/mois : **${saving}EUR d'economie**.`
      : `**Cost** -- ${cheapest.label} costs EUR${cheapest.costEur.toFixed(2)}, vs EUR${priciest.costEur.toFixed(2)} for ${priciest.label}. Over 100 texts/month: **EUR${saving} saved**.`
    );
  }

  // Richness insight
  const richest = successful.reduce((a, b) => a.lexicalRichness > b.lexicalRichness ? a : b);
  const poorest = successful.reduce((a, b) => a.lexicalRichness < b.lexicalRichness ? a : b);
  if (richest.lexicalRichness - poorest.lexicalRichness > 0.05) {
    insights.push(isFr
      ? `**Richesse lexicale** -- ${richest.label} (TTR ${richest.lexicalRichness.toFixed(2)}) utilise un vocabulaire ${((richest.lexicalRichness / poorest.lexicalRichness - 1) * 100).toFixed(0)}% plus varie que ${poorest.label} (${poorest.lexicalRichness.toFixed(2)}).`
      : `**Lexical richness** -- ${richest.label} (TTR ${richest.lexicalRichness.toFixed(2)}) uses ${((richest.lexicalRichness / poorest.lexicalRichness - 1) * 100).toFixed(0)}% more varied vocabulary than ${poorest.label} (${poorest.lexicalRichness.toFixed(2)}).`
    );
  }

  // Readability insight
  const mostReadable = successful.reduce((a, b) => a.fleschScore > b.fleschScore ? a : b);
  insights.push(isFr
    ? `**Lisibilite** -- ${mostReadable.label} produit des phrases de ${mostReadable.avgSentenceLength} mots en moyenne (Flesch: ${mostReadable.fleschScore}/100).`
    : `**Readability** -- ${mostReadable.label} produces sentences of ${mostReadable.avgSentenceLength} words on average (Flesch: ${mostReadable.fleschScore}/100).`
  );

  // CTA insight
  const withCTA = successful.filter(r => r.hasCTA);
  const withoutCTA = successful.filter(r => !r.hasCTA);
  if (withCTA.length > 0 && withoutCTA.length > 0) {
    insights.push(isFr
      ? `**Call-to-Action** -- ${withCTA.map(r => r.label).join(", ")} ${withCTA.length === 1 ? "inclut" : "incluent"} un CTA. ${withoutCTA.map(r => r.label).join(", ")} n'en ${withoutCTA.length === 1 ? "a" : "ont"} pas.`
      : `**Call-to-Action** -- ${withCTA.map(r => r.label).join(", ")} ${withCTA.length === 1 ? "includes" : "include"} a CTA. ${withoutCTA.map(r => r.label).join(", ")} ${withoutCTA.length === 1 ? "does" : "do"} not.`
    );
  }

  // Spam words
  const spammy = successful.filter(r => r.spamWords.length > 0);
  if (spammy.length > 0) {
    insights.push(isFr
      ? `**Mots spam** -- ${spammy.map(r => `${r.label} (${r.spamWords.join(", ")})`).join(" / ")} -- risque de filtrage email.`
      : `**Spam words** -- ${spammy.map(r => `${r.label} (${r.spamWords.join(", ")})`).join(" / ")} -- email filtering risk.`
    );
  }

  // Language match
  const langMismatch = successful.filter(r => !r.languageMatch);
  if (langMismatch.length > 0) {
    insights.push(isFr
      ? `**Langue** -- ${langMismatch.map(r => r.label).join(", ")} ${langMismatch.length === 1 ? "a repondu" : "ont repondu"} dans une langue differente de celle demandee.`
      : `**Language** -- ${langMismatch.map(r => r.label).join(", ")} responded in a different language than requested.`
    );
  }

  // Margin transparency
  const providerCosts = successful.map(r => TEXT_MODELS.find(m => m.id === r.model)?.providerCostEur || 0);
  const minProvider = Math.min(...providerCosts);
  const maxProvider = Math.max(...providerCosts);
  const avgMargin = successful.reduce((sum, r) => {
    const prov = TEXT_MODELS.find(m => m.id === r.model)?.providerCostEur || 0;
    return sum + (r.costEur > 0 ? ((r.costEur - prov) / r.costEur) * 100 : 0);
  }, 0) / successful.length;
  insights.push(isFr
    ? `**Transparence cout** -- Cout fournisseur de ${minProvider.toFixed(3)}EUR a ${maxProvider.toFixed(3)}EUR. Marge ORA moyenne : ${avgMargin.toFixed(0)}%.`
    : `**Cost transparency** -- Provider cost ranges from EUR${minProvider.toFixed(3)} to EUR${maxProvider.toFixed(3)}. Average ORA margin: ${avgMargin.toFixed(0)}%.`
  );

  // Why bullets for winner
  if (winner.model === fastest.model) whyBullets.push(isFr ? "Le plus rapide du test" : "Fastest in this test");
  if (winner.model === richest.model) whyBullets.push(isFr ? "Vocabulaire le plus riche" : "Richest vocabulary");
  if (winner.model === mostReadable.model) whyBullets.push(isFr ? "Meilleure lisibilite" : "Best readability");
  if (winner.hasCTA) whyBullets.push(isFr ? "CTA present" : "CTA included");
  if (winner.spamWords.length === 0) whyBullets.push(isFr ? "Zero mot spam" : "Zero spam words");
  if (whyBullets.length === 0) whyBullets.push(isFr ? "Meilleur equilibre global" : "Best overall balance");

  // Use-case insights for text
  const useCaseInsights: string[] = [];
  // Instagram: hashtags + emoji + CTA
  const bestInstagram = [...scoredResults].sort((a, b) => (b.hashtagCount + b.emojiCount + (b.hasCTA ? 5 : 0)) - (a.hashtagCount + a.emojiCount + (a.hasCTA ? 5 : 0)))[0];
  if (bestInstagram) useCaseInsights.push(isFr ? `Pour les captions Instagram -> **${bestInstagram.label}** (hashtags, emoji, CTA)` : `For Instagram captions -> **${bestInstagram.label}** (hashtags, emoji, CTA)`);
  // LinkedIn: readability + no spam
  const bestLinkedIn = [...scoredResults].sort((a, b) => (b.fleschScore + (b.spamWords.length === 0 ? 20 : 0)) - (a.fleschScore + (a.spamWords.length === 0 ? 20 : 0)))[0];
  if (bestLinkedIn) useCaseInsights.push(isFr ? `Pour les posts LinkedIn -> **${bestLinkedIn.label}** (lisibilite + zero spam)` : `For LinkedIn posts -> **${bestLinkedIn.label}** (readability + no spam)`);
  // Email: no spam + CTA + readability
  const bestEmail = [...scoredResults].sort((a, b) => ((b.spamWords.length === 0 ? 30 : 0) + (b.hasCTA ? 20 : 0) + b.fleschScore) - ((a.spamWords.length === 0 ? 30 : 0) + (a.hasCTA ? 20 : 0) + a.fleschScore))[0];
  if (bestEmail) useCaseInsights.push(isFr ? `Pour les campagnes email -> **${bestEmail.label}** (zero spam + CTA + lisibilite)` : `For email campaigns -> **${bestEmail.label}** (no spam + CTA + readability)`);

  const reason = isFr
    ? `Meilleur equilibre vitesse/qualite${winner.hasCTA ? ", CTA present" : ""}${winner.spamWords.length === 0 ? ", zero mot spam" : ""}.`
    : `Best speed/quality balance${winner.hasCTA ? ", CTA included" : ""}${winner.spamWords.length === 0 ? ", zero spam words" : ""}.`;

  return { winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.scores.overall, winnerCategories: winner.scores, reason, whyBullets, insights, useCaseInsights, allScores };
}

function generateImageRecommendation(results: ImageKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, winnerCategories: { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 }, reason: isFr ? "Aucun modele n'a produit de resultat." : "No model produced a result.", whyBullets: [], insights: [], useCaseInsights: [], allScores: [] };

  const allScores = results.map(r => ({ modelId: r.model, label: r.label, scores: scoreImageModel(r, results) }));
  const scoredResults = successful.map(r => ({ ...r, scores: scoreImageModel(r, results) }));
  scoredResults.sort((a, b) => b.scores.overall - a.scores.overall);
  const winner = scoredResults[0];
  const insights: string[] = [];
  const whyBullets: string[] = [];

  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    insights.push(isFr
      ? `**Vitesse** -- ${fastest.label} en ${(fastest.timeMs / 1000).toFixed(1)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
      : `**Speed** -- ${fastest.label} in ${(fastest.timeMs / 1000).toFixed(1)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
    );
  }

  const highestRes = successful.reduce((a, b) => (a.width * a.height) > (b.width * b.height) ? a : b);
  const lowestRes = successful.reduce((a, b) => (a.width * a.height) < (b.width * b.height) ? a : b);
  if (highestRes.resolution !== lowestRes.resolution) {
    insights.push(isFr
      ? `**Resolution** -- ${highestRes.label} (${highestRes.resolution}) vs ${lowestRes.label} (${lowestRes.resolution}).`
      : `**Resolution** -- ${highestRes.label} (${highestRes.resolution}) vs ${lowestRes.label} (${lowestRes.resolution}).`
    );
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    insights.push(isFr
      ? `**Fiabilite** -- ${failed.map(r => r.label).join(", ")} ${failed.length === 1 ? "a echoue" : "ont echoue"} sur ce brief.`
      : `**Reliability** -- ${failed.map(r => r.label).join(", ")} failed on this brief.`
    );
  }

  // Margin transparency
  const providerCosts = successful.map(r => IMAGE_MODELS.find(m => m.id === r.model)?.providerCostEur || 0);
  const minProvider = Math.min(...providerCosts);
  const maxProvider = Math.max(...providerCosts);
  const avgMargin = successful.reduce((sum, r) => {
    const prov = IMAGE_MODELS.find(m => m.id === r.model)?.providerCostEur || 0;
    return sum + (r.costEur > 0 ? ((r.costEur - prov) / r.costEur) * 100 : 0);
  }, 0) / successful.length;
  insights.push(isFr
    ? `**Transparence cout** -- Cout fournisseur de ${minProvider.toFixed(3)}EUR a ${maxProvider.toFixed(3)}EUR. Marge ORA moyenne : ${avgMargin.toFixed(0)}%.`
    : `**Cost transparency** -- Provider cost ranges from EUR${minProvider.toFixed(3)} to EUR${maxProvider.toFixed(3)}. Average ORA margin: ${avgMargin.toFixed(0)}%.`
  );

  // Why bullets
  if (winner.model === fastest.model) whyBullets.push(isFr ? "Le plus rapide" : "Fastest");
  if (winner.model === highestRes.model) whyBullets.push(isFr ? "Meilleure resolution" : "Best resolution");
  const winnerInfo = IMAGE_MODELS.find(m => m.id === winner.model);
  if (winnerInfo) whyBullets.push(winnerInfo.bestFor);
  if (whyBullets.length === 0) whyBullets.push(isFr ? "Meilleur equilibre global" : "Best overall balance");

  // Use-case insights
  const useCaseInsights: string[] = [];
  const productModel = scoredResults.find(r => IMAGE_MODELS.find(m => m.id === r.model)?.strengths.includes("product-shots"));
  if (productModel) useCaseInsights.push(isFr ? `Pour les photos produit e-commerce -> **${productModel.label}**` : `For e-commerce product shots -> **${productModel.label}**`);
  const fastModel = [...scoredResults].sort((a, b) => a.timeMs - b.timeMs)[0];
  if (fastModel) useCaseInsights.push(isFr ? `Pour la rapidite social media -> **${fastModel.label}** (${(fastModel.timeMs / 1000).toFixed(1)}s)` : `For social media speed -> **${fastModel.label}** (${(fastModel.timeMs / 1000).toFixed(1)}s)`);
  const premiumModel = scoredResults.find(r => IMAGE_MODELS.find(m => m.id === r.model)?.tier === "premium");
  if (premiumModel) useCaseInsights.push(isFr ? `Pour les campagnes premium -> **${premiumModel.label}**` : `For premium campaigns -> **${premiumModel.label}**`);
  const cheapModel = [...scoredResults].sort((a, b) => a.costEur - b.costEur)[0];
  if (cheapModel) useCaseInsights.push(isFr ? `Pour les budgets serres -> **${cheapModel.label}** (${cheapModel.costEur.toFixed(2)}EUR)` : `For budget-conscious -> **${cheapModel.label}** (EUR${cheapModel.costEur.toFixed(2)})`);

  const reason = isFr
    ? `${winner.resolution}, ${(winner.timeMs / 1000).toFixed(1)}s, ${winner.costEur.toFixed(2)}EUR.`
    : `${winner.resolution}, ${(winner.timeMs / 1000).toFixed(1)}s, EUR${winner.costEur.toFixed(2)}.`;

  return { winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.scores.overall, winnerCategories: winner.scores, reason, whyBullets, insights, useCaseInsights, allScores };
}

function generateVideoRecommendation(results: VideoKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, winnerCategories: { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 }, reason: isFr ? "Aucun modele n'a produit de resultat." : "No model produced a result.", whyBullets: [], insights: [], useCaseInsights: [], allScores: [] };

  const allScores = results.map(r => ({ modelId: r.model, label: r.label, scores: scoreVideoModel(r, results) }));
  const scoredResults = successful.map(r => ({ ...r, scores: scoreVideoModel(r, results) }));
  scoredResults.sort((a, b) => b.scores.overall - a.scores.overall);
  const winner = scoredResults[0];
  const insights: string[] = [];
  const whyBullets: string[] = [];

  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    insights.push(isFr
      ? `**Vitesse** -- ${fastest.label} en ${(fastest.timeMs / 1000).toFixed(0)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(0)}s).`
      : `**Speed** -- ${fastest.label} in ${(fastest.timeMs / 1000).toFixed(0)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(0)}s).`
    );
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    insights.push(isFr
      ? `**Fiabilite** -- ${failed.map(r => r.label).join(", ")} ${failed.length === 1 ? "a echoue" : "ont echoue"}.`
      : `**Reliability** -- ${failed.map(r => r.label).join(", ")} failed.`
    );
  }

  // Margin transparency
  const providerCosts = successful.map(r => VIDEO_MODELS.find(m => m.id === r.model)?.providerCostEur || 0);
  const minProvider = Math.min(...providerCosts);
  const maxProvider = Math.max(...providerCosts);
  const avgMargin = successful.reduce((sum, r) => {
    const prov = VIDEO_MODELS.find(m => m.id === r.model)?.providerCostEur || 0;
    return sum + (r.costEur > 0 ? ((r.costEur - prov) / r.costEur) * 100 : 0);
  }, 0) / successful.length;
  insights.push(isFr
    ? `**Transparence cout** -- Cout fournisseur de ${minProvider.toFixed(2)}EUR a ${maxProvider.toFixed(2)}EUR. Marge ORA moyenne : ${avgMargin.toFixed(0)}%.`
    : `**Cost transparency** -- Provider cost ranges from EUR${minProvider.toFixed(2)} to EUR${maxProvider.toFixed(2)}. Average ORA margin: ${avgMargin.toFixed(0)}%.`
  );

  // Why bullets
  if (winner.model === fastest.model) whyBullets.push(isFr ? "Le plus rapide" : "Fastest");
  const winnerInfo = VIDEO_MODELS.find(m => m.id === winner.model);
  if (winnerInfo) whyBullets.push(winnerInfo.bestFor);
  if (whyBullets.length === 0) whyBullets.push(isFr ? "Meilleur equilibre global" : "Best overall balance");

  // Use-case insights
  const useCaseInsights: string[] = [];
  const tiktokModel = scoredResults.find(r => VIDEO_MODELS.find(m => m.id === r.model)?.strengths.includes("tiktok"));
  if (tiktokModel) useCaseInsights.push(isFr ? `Pour TikTok/vertical -> **${tiktokModel.label}**` : `For TikTok/vertical -> **${tiktokModel.label}**`);
  const cinematicModel = scoredResults.find(r => VIDEO_MODELS.find(m => m.id === r.model)?.strengths.includes("cinematic"));
  if (cinematicModel) useCaseInsights.push(isFr ? `Pour les scenes cinematiques -> **${cinematicModel.label}**` : `For cinematic scenes -> **${cinematicModel.label}**`);
  const budgetModel = [...scoredResults].sort((a, b) => a.costEur - b.costEur)[0];
  if (budgetModel) useCaseInsights.push(isFr ? `Pour les budgets serres -> **${budgetModel.label}** (${budgetModel.costEur.toFixed(2)}EUR)` : `For budget-conscious -> **${budgetModel.label}** (EUR${budgetModel.costEur.toFixed(2)})`);

  return {
    winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.scores.overall, winnerCategories: winner.scores,
    reason: isFr ? `${(winner.timeMs / 1000).toFixed(0)}s, ${winner.costEur.toFixed(2)}EUR.` : `${(winner.timeMs / 1000).toFixed(0)}s, EUR${winner.costEur.toFixed(2)}.`,
    whyBullets, insights, useCaseInsights, allScores,
  };
}

/* ═══════════════════════════════════════════════════════════
   SCORE GAUGE SVG COMPONENT
   ═══════════════════════════════════════════════════════════ */

// Yuka-style grade labels
function getGradeLabel(score: number, isFr: boolean): { label: string; color: string } {
  if (score >= 80) return { label: isFr ? "Excellent" : "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: isFr ? "Bon" : "Good", color: "#84cc16" };
  if (score >= 40) return { label: isFr ? "Médiocre" : "Mediocre", color: "#f59e0b" };
  return { label: isFr ? "Insuffisant" : "Poor", color: "#ef4444" };
}

function ScoreGauge({ score, size = 100, isFr = false, showLabel = false }: { score: number; size?: number; isFr?: boolean; showLabel?: boolean }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const { label, color } = getGradeLabel(score, isFr);
  const bgColor = `${color}15`;
  const fontSize = size >= 100 ? 28 : size >= 70 ? 20 : 16;
  const labelSize = size >= 100 ? 11 : 9;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={bgColor} stroke="var(--border)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={fontSize} fontWeight={700}>
          {score}
        </text>
        <text x={size / 2} y={size / 2 + fontSize / 2 + 4} textAnchor="middle" dominantBaseline="central" fill="var(--text-tertiary)" fontSize={labelSize - 2}>
          /100
        </text>
      </svg>
      {showLabel && (
        <span style={{ fontSize: labelSize, fontWeight: 700, color, letterSpacing: "0.02em" }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY BAR COMPONENT
   ═══════════════════════════════════════════════════════════ */

function CategoryBar({ label, value, color, hint }: { label: string; value: number; color?: string; hint?: string }) {
  const barColor = color || (value >= 70 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444");
  return (
    <div style={{ fontSize: 11 }}>
      <div className="flex items-center gap-2">
        <span style={{ width: 70, color: "var(--text-tertiary)", flexShrink: 0, fontWeight: 500 }}>{label}</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--secondary)" }}>
          <div style={{ width: `${Math.max(2, value)}%`, height: "100%", borderRadius: 3, background: barColor, transition: "width 0.5s ease" }} />
        </div>
        <span style={{ width: 28, textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{value}</span>
      </div>
      {hint && <div style={{ fontSize: 9.5, color: "var(--text-tertiary)", marginLeft: 72, marginTop: 1, lineHeight: 1.3 }}>{hint}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STRENGTH TAG COMPONENT
   ═══════════════════════════════════════════════════════════ */

function StrengthTag({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 500,
      background: "var(--accent-warm-light)", color: "var(--accent)", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   VALUE GRADE HELPER
   ═══════════════════════════════════════════════════════════ */

function getValueGrade(marginPct: number): { grade: string; color: string } {
  if (marginPct <= 50) return { grade: "A+", color: "#22c55e" };
  if (marginPct <= 70) return { grade: "A", color: "#22c55e" };
  if (marginPct <= 85) return { grade: "B", color: "#f59e0b" };
  if (marginPct <= 92) return { grade: "C", color: "#f59e0b" };
  return { grade: "D", color: "#ef4444" };
}

/* ═══════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */

export function ComparePage() {
  const { t, locale } = useI18n();
  const { getAuthHeader } = useAuth();
  const isFr = locale === "fr";

  const [mode, setMode] = useState<CompareMode>("text");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState(locale === "fr" ? "fr" : "en");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: StepStatus; timeMs?: number }[]>([]);

  const [textResults, setTextResults] = useState<TextKPIs[]>([]);
  const [imageResults, setImageResults] = useState<ImageKPIs[]>([]);
  const [videoResults, setVideoResults] = useState<VideoKPIs[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ outputs: true, insights: true, costs: true, usecases: true });

  const abortRef = useRef<AbortController | null>(null);

  const maxModels = mode === "text" ? 4 : mode === "image" ? 6 : 3;
  const modelCatalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;

  // Reset selection when switching mode
  useEffect(() => {
    setSelectedModels([]);
    setTextResults([]);
    setImageResults([]);
    setVideoResults([]);
    setRecommendation(null);
    setSteps([]);
  }, [mode]);

  const toggleModel = (id: string) => {
    setSelectedModels(prev => {
      if (prev.includes(id)) return prev.filter(m => m !== id);
      if (prev.length >= maxModels) return prev;
      return [...prev, id];
    });
  };

  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...body, _token: token }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { success: false, error: `Server error (${r.status})` }; }
  }, [getAuthHeader]);

  const serverGet = useCallback(async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(120_000),
    });
    return r.json();
  }, []);

  // ── Poll video helper ──
  const pollVideo = useCallback(async (genId: string, maxPolls = 60): Promise<{ url: string; pollCount: number } | null> => {
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await serverGet(`/generate/video-status?id=${genId}`);
        if (res.state === "completed" && res.videoUrl) return { url: res.videoUrl, pollCount: i + 1 };
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }, [serverGet]);

  // ── LAUNCH ANALYSIS ──
  const runAnalysis = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length < 2 || isRunning) return;
    setIsRunning(true);
    setTextResults([]);
    setImageResults([]);
    setVideoResults([]);
    setRecommendation(null);

    const briefStep = { label: isFr ? "Brief analyse" : "Brief analyzed", status: "done" as StepStatus, timeMs: 0 };
    const modelSteps = selectedModels.map(id => ({
      label: modelCatalog.find(m => m.id === id)?.label || id,
      status: "pending" as StepStatus,
    }));
    const analysisStep = { label: isFr ? "Analyse comparative" : "Comparative analysis", status: "pending" as StepStatus };
    setSteps([briefStep, ...modelSteps, analysisStep]);

    try {
      if (mode === "text") {
        // ── TEXT COMPARISON ──
        const results = await Promise.all(selectedModels.map(async (modelId, idx) => {
          setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "running" } : s));
          const modelInfo = modelCatalog.find(m => m.id === modelId)!;
          const start = Date.now();
          try {
            const res = await serverPost("/campaign/generate-texts", {
              brief: prompt,
              formats: "instagram-post",
              model: modelId,
              language,
              targetAudience: "",
              campaignObjective: "",
              toneOfVoice: "",
            }, 60_000);
            const timeMs = Date.now() - start;
            const copyMap = res.copyMap || {};
            const firstFormat = Object.values(copyMap)[0] as any;
            const text = firstFormat?.caption || firstFormat?.text || firstFormat?.copy || firstFormat?.body || "";
            const analysis = analyzeText(text, language);
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "done", timeMs } : s));
            return { model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits, success: !!text, ...analysis } as TextKPIs;
          } catch (err: any) {
            const timeMs = Date.now() - start;
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "error", timeMs } : s));
            return { model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits, success: false, error: err?.message || "Timeout", output: "", wordCount: 0, charCount: 0, sentenceCount: 0, avgSentenceLength: 0, fleschScore: 0, lexicalRichness: 0, repeatedWords: [], hasCTA: false, hashtagCount: 0, emojiCount: 0, questionCount: 0, spamWords: [], languageMatch: true } as TextKPIs;
          }
        }));
        setTextResults(results);

        // Analysis step
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "running" } : s));
        const reco = generateTextRecommendation(results, locale);
        setRecommendation(reco);
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "done" } : s));

      } else if (mode === "image") {
        // ── IMAGE COMPARISON ──
        // Launch in batches of 3 to avoid overwhelming Supabase edge functions (503 on too many concurrent)
        const BATCH_SIZE = 3;
        const results: ImageKPIs[] = [];
        for (let b = 0; b < selectedModels.length; b += BATCH_SIZE) {
          const batch = selectedModels.slice(b, b + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(async (modelId) => {
            const idx = selectedModels.indexOf(modelId);
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "running" } : s));
            const modelInfo = modelCatalog.find(m => m.id === modelId)!;
            const start = Date.now();
            let retries = 0;
            try {
              const res = await serverGet(`/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${modelId}&aspectRatio=1:1`);
              const timeMs = Date.now() - start;
              const imageUrl = res.success && res.results?.[0]?.result?.imageUrl ? res.results[0].result.imageUrl : "";
              const imgMeta = res.results?.[0]?.result || {};

              let fileSizeKB = 0;
              let width = imgMeta.width || 1024;
              let height = imgMeta.height || 1024;

              setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: imageUrl ? "done" : "error", timeMs } : s));
              return {
                model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
                resolution: `${width}x${height}`, width, height, aspectRatio: "1:1",
                fileSizeKB, format: "webp", retries, imageUrl, success: !!imageUrl,
              } as ImageKPIs;
            } catch (err: any) {
              const timeMs = Date.now() - start;
              setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "error", timeMs } : s));
              return {
                model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
                resolution: "0x0", width: 0, height: 0, aspectRatio: "1:1",
                fileSizeKB: 0, format: "", retries, imageUrl: "", success: false, error: err?.message,
              } as ImageKPIs;
            }
          }));
          results.push(...batchResults);
        }
        setImageResults(results);
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "running" } : s));
        const reco = generateImageRecommendation(results, locale);
        setRecommendation(reco);
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "done" } : s));

      } else {
        // ── VIDEO COMPARISON ──
        const results = await Promise.all(selectedModels.map(async (modelId, idx) => {
          setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "running" } : s));
          const modelInfo = modelCatalog.find(m => m.id === modelId)!;
          const start = Date.now();
          try {
            const startRes = await serverGet(`/generate/video-start?prompt=${encodeURIComponent(prompt)}&model=${modelId}&aspectRatio=16:9&duration=5`);
            if (!startRes.success || !startRes.generationId) throw new Error(startRes.error || "No generationId");
            const pollResult = await pollVideo(startRes.generationId, 60);
            const timeMs = Date.now() - start;
            if (!pollResult) throw new Error("Timeout");
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "done", timeMs } : s));
            return {
              model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
              resolution: "1080p", durationSec: 5, fileSizeMB: 0, pollCount: pollResult.pollCount,
              videoUrl: pollResult.url, success: true,
            } as VideoKPIs;
          } catch (err: any) {
            const timeMs = Date.now() - start;
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "error", timeMs } : s));
            return {
              model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
              resolution: "", durationSec: 0, fileSizeMB: 0, pollCount: 0,
              videoUrl: "", success: false, error: err?.message,
            } as VideoKPIs;
          }
        }));
        setVideoResults(results);
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "running" } : s));
        const reco = generateVideoRecommendation(results, locale);
        setRecommendation(reco);
        setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "done" } : s));
      }
    } catch (err: any) {
      console.error("[compare] Error:", err);
    } finally {
      setIsRunning(false);
    }
  }, [prompt, selectedModels, mode, isRunning, locale, language, serverPost, serverGet, pollVideo, isFr, modelCatalog]);

  const hasResults = textResults.length > 0 || imageResults.length > 0 || videoResults.length > 0;

  const totalCredits = selectedModels.reduce((sum, id) => {
    const m = modelCatalog.find(c => c.id === id);
    return sum + (m?.credits || 0);
  }, 0);

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Format markdown-style bold
  const renderInsight = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} style={{ color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  // Get all scored results for card display
  const getScoredModels = () => {
    if (mode === "text") return textResults.map(r => ({ id: r.model, label: r.label, scores: scoreTextModel(r, textResults), success: r.success, costEur: r.costEur, timeMs: r.timeMs }));
    if (mode === "image") return imageResults.map(r => ({ id: r.model, label: r.label, scores: scoreImageModel(r, imageResults), success: r.success, costEur: r.costEur, timeMs: r.timeMs }));
    return videoResults.map(r => ({ id: r.model, label: r.label, scores: scoreVideoModel(r, videoResults), success: r.success, costEur: r.costEur, timeMs: r.timeMs }));
  };

  return (
    <RouteGuard>
      <div className="min-h-screen" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* ── HEADER ── */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-warm-light)" }}>
                <BarChart3 size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {isFr ? "Comparateur IA" : "AI Compare"}
                </h1>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  {isFr ? "Analysez et comparez les modeles IA sur des KPIs reels." : "Analyze and compare AI models on real KPIs."}
                </p>
              </div>
            </div>
          </div>

          {/* ── MODE TABS ── */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--secondary)", width: "fit-content" }}>
            {([
              { id: "text" as CompareMode, icon: Type, label: isFr ? "Texte" : "Text", count: TEXT_MODELS.length },
              { id: "image" as CompareMode, icon: ImageIcon, label: "Image", count: IMAGE_MODELS.length },
              { id: "video" as CompareMode, icon: Video, label: isFr ? "Video" : "Video", count: VIDEO_MODELS.length },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: mode === tab.id ? "#FFFFFF" : "transparent",
                  color: mode === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: mode === tab.id ? 600 : 400,
                  fontSize: 13,
                  boxShadow: mode === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                <span style={{ fontSize: 11, opacity: 0.6 }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* ── PROMPT INPUT ── */}
          <div className="mb-6">
            <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isFr ? "Votre brief" : "Your brief"}
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={mode === "text"
                  ? (isFr ? "Ex: Un post Instagram pour promouvoir notre nouvelle gamme de soins naturels..." : "Ex: An Instagram post to promote our new natural skincare line...")
                  : mode === "image"
                    ? (isFr ? "Ex: Produit cosmetique sur fond de nature, lumiere doree, style editorial..." : "Ex: Cosmetic product on nature background, golden light, editorial style...")
                    : (isFr ? "Ex: Sequence cinematique d'un fleuriste arrangeant un bouquet, lumiere naturelle..." : "Ex: Cinematic sequence of a florist arranging a bouquet, natural light...")}
                className="w-full mt-2 resize-none outline-none"
                rows={3}
                style={{ fontSize: 14, color: "var(--text-primary)", background: "transparent", lineHeight: 1.6 }}
              />
              {mode === "text" && (
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{isFr ? "Langue :" : "Language:"}</span>
                  {["fr", "en"].map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className="px-2.5 py-1 rounded-md transition-all" style={{
                        fontSize: 12, fontWeight: language === l ? 600 : 400,
                        background: language === l ? "var(--accent-warm-light)" : "transparent",
                        color: language === l ? "var(--accent)" : "var(--text-tertiary)",
                      }}>
                      {l === "fr" ? "Francais" : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── MODEL SELECTION ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {isFr ? `Modeles (${selectedModels.length}/${maxModels})` : `Models (${selectedModels.length}/${maxModels})`}
              </span>
              {selectedModels.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {totalCredits} {isFr ? "credits" : "credits"} · {selectedModels.reduce((s, id) => s + (modelCatalog.find(m => m.id === id)?.costEur || 0), 0).toFixed(2)}EUR
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {modelCatalog.map(m => {
                const selected = selectedModels.includes(m.id);
                const disabled = !selected && selectedModels.length >= maxModels;
                return (
                  <button
                    key={m.id}
                    onClick={() => !disabled && toggleModel(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: selected ? "var(--accent)" : "#FFFFFF",
                      color: selected ? "#FFFFFF" : disabled ? "var(--text-tertiary)" : "var(--text-primary)",
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      fontSize: 12,
                      fontWeight: selected ? 600 : 400,
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {m.label}
                    <span style={{ fontSize: 10, opacity: 0.7, background: selected ? "rgba(255,255,255,0.2)" : "var(--secondary)", padding: "1px 5px", borderRadius: 4 }}>
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── LAUNCH BUTTON ── */}
          <div className="mb-8">
            <button
              onClick={runAnalysis}
              disabled={!prompt.trim() || selectedModels.length < 2 || isRunning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
              style={{
                background: (!prompt.trim() || selectedModels.length < 2 || isRunning)
                  ? "var(--secondary)" : "var(--accent)",
                color: (!prompt.trim() || selectedModels.length < 2 || isRunning)
                  ? "var(--text-tertiary)" : "#FFFFFF",
                fontWeight: 600,
                fontSize: 14,
                cursor: (!prompt.trim() || selectedModels.length < 2 || isRunning) ? "not-allowed" : "pointer",
              }}
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isRunning
                ? (isFr ? "Analyse en cours..." : "Analyzing...")
                : (isFr ? "Lancer l'analyse" : "Run analysis")}
            </button>
          </div>

          {/* ── TIMELINE (during generation) ── */}
          <AnimatePresence>
            {steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 rounded-2xl p-5"
                style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "Progression" : "Progress"}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {step.status === "done" ? <CheckCircle2 size={15} style={{ color: "#22c55e" }} />
                        : step.status === "running" ? <Loader2 size={15} className="animate-spin" style={{ color: "var(--accent)" }} />
                          : step.status === "error" ? <AlertTriangle size={15} style={{ color: "var(--destructive)" }} />
                            : <Circle size={15} style={{ color: "var(--border)" }} />}
                      <span style={{ fontSize: 13, color: step.status === "pending" ? "var(--text-tertiary)" : "var(--text-primary)", fontWeight: step.status === "running" ? 600 : 400 }}>
                        {step.label}
                      </span>
                      {step.timeMs !== undefined && (
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                          {(step.timeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ RESULTS: ORA INTELLIGENCE REPORT (Yuka for AI) ═══ */}
          {hasResults && recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Report header */}
              <div className="mb-6 pb-4" style={{ borderBottom: "2px solid var(--text-primary)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                  ORA INTELLIGENCE REPORT
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                  {new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} · {new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} · {mode === "text" ? (isFr ? "Texte" : "Text") : mode === "image" ? "Image" : (isFr ? "Video" : "Video")} · {selectedModels.length} {isFr ? "modeles" : "models"}
                </div>
              </div>

              {/* ── WINNER SECTION ── */}
              <div className="mb-8 rounded-2xl p-6" style={{ background: "linear-gradient(135deg, var(--accent-warm-light), #FFFFFF)", border: "2px solid var(--accent)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={18} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                    {isFr ? "Recommande pour votre usage" : "Recommended for your use"}
                  </span>
                </div>
                <div className="flex items-start gap-6">
                  <ScoreGauge score={recommendation.winnerScore} size={120} isFr={isFr} showLabel={true} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                      {recommendation.winnerLabel}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      {recommendation.reason}
                    </div>
                    {/* Winner strengths */}
                    {(() => {
                      const winnerModel = getModelInfo(recommendation.winnerId, mode);
                      return winnerModel ? (
                        <>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {winnerModel.strengths.map(s => <StrengthTag key={s} label={s} />)}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
                            {isFr ? "Ideal pour : " : "Best for: "}{winnerModel.bestFor}
                          </div>
                        </>
                      ) : null;
                    })()}
                    {/* Why this model? */}
                    {recommendation.whyBullets.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                          {isFr ? "Pourquoi ce modele ?" : "Why this model?"}
                        </div>
                        {recommendation.whyBullets.slice(0, 3).map((b, i) => (
                          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                            <span style={{ color: "var(--accent)" }}>-</span> {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── EDUCATION: COMPRENDRE LES SCORES ── */}
              <div className="mb-6 rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "Comment lire ce rapport ?" : "How to read this report?"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ fontSize: 11, lineHeight: 1.6 }}>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>80-100 · {isFr ? "Excellent" : "Excellent"}</span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>{isFr ? "Performances de premier plan. Idéal pour du contenu professionnel." : "Top-tier performance. Ideal for professional content."}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#84cc16" }} />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>60-79 · {isFr ? "Bon" : "Good"}</span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>{isFr ? "Solide pour la plupart des usages. Bon compromis." : "Solid for most uses. Good compromise."}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>40-59 · {isFr ? "Médiocre" : "Mediocre"}</span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>{isFr ? "Des limites sur certains critères. À utiliser en complément." : "Limited on some criteria. Best as a complement."}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>0-39 · {isFr ? "Insuffisant" : "Poor"}</span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>{isFr ? "Ne convient pas pour ce type de brief. Testez un autre modèle." : "Not suited for this brief. Try another model."}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--text-tertiary)" }}>
                  <div><strong style={{ color: "var(--text-secondary)" }}>{isFr ? "Rapidité" : "Speed"}</strong> — {isFr ? "Combien de temps vous attendez. Plus c'est rapide, plus vous êtes productif." : "How long you wait. Faster means more productive."}</div>
                  <div><strong style={{ color: "var(--text-secondary)" }}>{isFr ? "Rapport Q/P" : "Value"}</strong> — {isFr ? "Ce que vous obtenez par rapport à ce que vous payez. Comme le rapport qualité-prix d'un produit." : "What you get vs. what you pay. Like a product's value for money."}</div>
                  <div><strong style={{ color: "var(--text-secondary)" }}>{isFr ? "Qualité" : "Quality"}</strong> — {isFr ? (mode === "text" ? "Richesse du vocabulaire, lisibilité, et pertinence du texte." : mode === "image" ? "Résolution, détail et fidélité au brief demandé." : "Résolution et fluidité de la vidéo.") : (mode === "text" ? "Vocabulary richness, readability, and relevance." : mode === "image" ? "Resolution, detail and brief adherence." : "Resolution and video smoothness.")}</div>
                  <div><strong style={{ color: "var(--text-secondary)" }}>{isFr ? "Fiabilité" : "Reliability"}</strong> — {isFr ? "Est-ce que le modèle a fonctionné sans bug ? Un modèle fiable = moins de frustration." : "Did the model work without errors? Reliable model = less frustration."}</div>
                </div>
              </div>

              {/* ── MODEL SCORE CARDS ── */}
              <div className="mb-8">
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
                  {isFr ? "Scores par modèle" : "Scores by model"}
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(getScoredModels().length, 3)}, 1fr)` }}>
                  {getScoredModels().map(m => {
                    const modelInfo = getModelInfo(m.id, mode);
                    const isWinner = m.id === recommendation.winnerId;
                    const providerCost = modelInfo?.providerCostEur || 0;
                    const marginPct = m.costEur > 0 ? ((m.costEur - providerCost) / m.costEur) * 100 : 0;
                    return (
                      <div key={m.id} className="rounded-xl p-4" style={{
                        background: "#FFFFFF",
                        border: isWinner ? "2px solid var(--accent)" : "1px solid var(--border)",
                        boxShadow: isWinner ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                      }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</span>
                            {modelInfo && (
                              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--secondary)", color: "var(--text-tertiary)" }}>
                                {modelInfo.badge}
                              </span>
                            )}
                          </div>
                          {isWinner && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--accent)", color: "#FFF" }}>
                              {isFr ? "RECOMMANDE" : "RECOMMENDED"}
                            </span>
                          )}
                        </div>
                        {/* Score gauge + category bars */}
                        {m.success ? (
                          <div className="flex items-start gap-4">
                            <ScoreGauge score={m.scores.overall} size={70} isFr={isFr} showLabel={true} />
                            <div style={{ flex: 1 }} className="space-y-2">
                              <CategoryBar label={isFr ? "Rapidité" : "Speed"} value={m.scores.speed}
                                hint={m.scores.speed >= 70 ? (isFr ? "Génère vite — idéal pour du volume" : "Fast generation — ideal for volume") : m.scores.speed >= 40 ? (isFr ? "Temps de génération moyen" : "Average generation time") : (isFr ? "Lent — mieux pour du contenu premium" : "Slow — better for premium content")} />
                              <CategoryBar label={isFr ? "Rapport Q/P" : "Value"} value={m.scores.value}
                                hint={m.scores.value >= 70 ? (isFr ? "Bon rapport qualité-prix" : "Great quality-price ratio") : m.scores.value >= 40 ? (isFr ? "Prix correct pour la qualité" : "Fair price for quality") : (isFr ? "Coûteux — à réserver aux projets clés" : "Expensive — reserve for key projects")} />
                              <CategoryBar label={isFr ? "Qualité" : "Quality"} value={m.scores.quality}
                                hint={mode === "text" ? (isFr ? "Richesse du vocabulaire et lisibilité" : "Vocabulary richness and readability") : (isFr ? "Résolution et niveau de détail" : "Resolution and detail level")} />
                              <CategoryBar label={isFr ? "Fiabilité" : "Reliability"} value={m.scores.reliability}
                                hint={m.scores.reliability >= 100 ? (isFr ? "A fonctionné sans erreur" : "Worked without errors") : (isFr ? "Échec sur ce test" : "Failed on this test")} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-4" style={{ color: "var(--destructive)", fontSize: 12 }}>
                            <AlertTriangle size={14} /> {isFr ? "Echec" : "Failed"}
                          </div>
                        )}
                        {/* Strengths */}
                        {modelInfo && m.success && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {modelInfo.strengths.map(s => <StrengthTag key={s} label={s} />)}
                          </div>
                        )}
                        {/* Best for + practical explanation */}
                        {modelInfo && m.success && (
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.5 }}>
                            <div style={{ fontWeight: 500 }}>{isFr ? "💡 Idéal pour : " : "💡 Best for: "}{modelInfo.bestFor}</div>
                            <div style={{ marginTop: 3 }}>
                              {(() => {
                                const timeSec = (m.timeMs / 1000).toFixed(0);
                                if (m.scores.speed >= 70 && m.scores.value >= 60) return isFr ? `Génère en ${timeSec}s avec un bon rapport qualité-prix — parfait pour du contenu quotidien.` : `Generates in ${timeSec}s with good value — perfect for daily content.`;
                                if (m.scores.speed >= 70) return isFr ? `Génère en seulement ${timeSec}s — idéal quand vous avez besoin de volume.` : `Generates in just ${timeSec}s — ideal when you need volume.`;
                                if (m.scores.quality >= 70) return isFr ? `Qualité supérieure, prend ${timeSec}s — privilégiez-le pour vos campagnes clés.` : `Superior quality, takes ${timeSec}s — prioritize for key campaigns.`;
                                if (m.scores.value >= 70) return isFr ? `Très bon rapport qualité-prix à ${m.costEur.toFixed(2)}€ par génération.` : `Great value at €${m.costEur.toFixed(2)} per generation.`;
                                return isFr ? `Génère en ${timeSec}s à ${m.costEur.toFixed(2)}€ par utilisation.` : `Generates in ${timeSec}s at €${m.costEur.toFixed(2)} per use.`;
                              })()}
                            </div>
                          </div>
                        )}
                        {/* Cost breakdown */}
                        {m.success && (
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                            <span>ORA: {m.costEur.toFixed(2)}EUR</span>
                            <span style={{ margin: "0 6px", color: "var(--border)" }}>|</span>
                            <span>{isFr ? "Fournisseur" : "Provider"}: {providerCost.toFixed(3)}EUR</span>
                            <span style={{ margin: "0 6px", color: "var(--border)" }}>|</span>
                            <span style={{ color: "var(--text-tertiary)" }}>{isFr ? "Marge" : "Margin"}: {marginPct.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── OUTPUTS SIDE BY SIDE ── */}
              <div className="mb-6">
                <button onClick={() => toggleSection("outputs")} className="flex items-center gap-2 mb-4 cursor-pointer">
                  {expandedSections.outputs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "Resultats cote a cote" : "Side-by-side results"}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSections.outputs && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 4)}, 1fr)` }}>
                        {mode === "text" && textResults.map(r => (
                          <div key={r.model} className="rounded-xl p-4" style={{
                            background: "#FFFFFF", border: `1.5px solid ${r.model === recommendation.winnerId ? "var(--accent)" : "var(--border)"}`,
                          }}>
                            <div className="flex items-center gap-2 mb-3">
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                              {r.model === recommendation.winnerId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>
                                  {isFr ? "RECOMMANDE" : "RECOMMENDED"}
                                </span>
                              )}
                            </div>
                            {r.success ? (
                              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--text-secondary)", maxHeight: 300, overflow: "auto" }}>
                                {r.output}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2" style={{ color: "var(--destructive)", fontSize: 12 }}>
                                <AlertTriangle size={13} /> {r.error || "Failed"}
                              </div>
                            )}
                          </div>
                        ))}
                        {mode === "image" && imageResults.map(r => (
                          <div key={r.model} className="rounded-xl overflow-hidden" style={{
                            border: `1.5px solid ${r.model === recommendation.winnerId ? "var(--accent)" : "var(--border)"}`,
                          }}>
                            {r.success && r.imageUrl ? (
                              <img src={r.imageUrl} alt={r.label} className="w-full aspect-square object-cover" />
                            ) : (
                              <div className="w-full aspect-square flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                                <AlertTriangle size={24} style={{ color: "var(--destructive)" }} />
                              </div>
                            )}
                            <div className="p-3 flex items-center gap-2" style={{ background: "#FFFFFF" }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</span>
                              {r.model === recommendation.winnerId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>BEST</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {mode === "video" && videoResults.map(r => (
                          <div key={r.model} className="rounded-xl overflow-hidden" style={{
                            border: `1.5px solid ${r.model === recommendation.winnerId ? "var(--accent)" : "var(--border)"}`,
                          }}>
                            {r.success && r.videoUrl ? (
                              <video src={r.videoUrl} controls className="w-full aspect-video" />
                            ) : (
                              <div className="w-full aspect-video flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                                <AlertTriangle size={24} style={{ color: "var(--destructive)" }} />
                              </div>
                            )}
                            <div className="p-3 flex items-center gap-2" style={{ background: "#FFFFFF" }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</span>
                              {r.model === recommendation.winnerId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>BEST</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── INSIGHTS ── */}
              {recommendation.insights.length > 0 && (
                <div className="mb-6">
                  <button onClick={() => toggleSection("insights")} className="flex items-center gap-2 mb-4 cursor-pointer">
                    {expandedSections.insights ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {isFr ? "Insights" : "Insights"}
                    </span>
                  </button>
                  <AnimatePresence>
                    {expandedSections.insights && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3">
                        {recommendation.insights.map((insight, i) => (
                          <div key={i} className="rounded-xl px-5 py-3.5" style={{ background: "#FFFFFF", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                            {renderInsight(insight)}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── USE-CASE INSIGHTS ── */}
              {recommendation.useCaseInsights.length > 0 && (
                <div className="mb-6">
                  <button onClick={() => toggleSection("usecases")} className="flex items-center gap-2 mb-4 cursor-pointer">
                    {expandedSections.usecases ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {isFr ? "Recommandations par usage" : "Use-case recommendations"}
                    </span>
                  </button>
                  <AnimatePresence>
                    {expandedSections.usecases && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="rounded-xl p-4 space-y-2.5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                          {recommendation.useCaseInsights.map((uc, i) => (
                            <div key={i} className="flex items-start gap-2" style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                              <ArrowRight size={13} style={{ color: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
                              <span>{renderInsight(uc)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── COST TRANSPARENCY TABLE ── */}
              <div className="mb-8">
                <button onClick={() => toggleSection("costs")} className="flex items-center gap-2 mb-4 cursor-pointer">
                  {expandedSections.costs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "Transparence des couts" : "Cost transparency"}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSections.costs && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <table className="w-full" style={{ fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: "var(--secondary)" }}>
                              <th className="text-left px-4 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>{isFr ? "Modele" : "Model"}</th>
                              <th className="text-center px-3 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>{isFr ? "Prix ORA" : "ORA Price"}</th>
                              <th className="text-center px-3 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>{isFr ? "Cout fournisseur" : "Provider Cost"}</th>
                              <th className="text-center px-3 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>{isFr ? "Marge ORA" : "ORA Margin"}</th>
                              <th className="text-center px-3 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>{isFr ? "Valeur" : "Value"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedModels.map(id => {
                              const modelInfo = getModelInfo(id, mode);
                              if (!modelInfo) return null;
                              const providerCost = modelInfo.providerCostEur;
                              const marginPct = modelInfo.costEur > 0 ? ((modelInfo.costEur - providerCost) / modelInfo.costEur) * 100 : 0;
                              const { grade, color } = getValueGrade(marginPct);
                              const isWinner = id === recommendation.winnerId;
                              return (
                                <tr key={id} style={{ borderTop: "1px solid var(--border)", background: isWinner ? "var(--accent-warm-light)" : "transparent" }}>
                                  <td className="px-4 py-2.5" style={{ fontWeight: isWinner ? 600 : 400, color: isWinner ? "var(--accent)" : "var(--text-primary)" }}>
                                    {modelInfo.label}
                                    {isWinner && <span style={{ fontSize: 10, marginLeft: 6, color: "var(--accent)" }}>BEST</span>}
                                  </td>
                                  <td className="text-center px-3 py-2.5" style={{ color: "var(--text-primary)" }}>{modelInfo.costEur.toFixed(2)}EUR</td>
                                  <td className="text-center px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{providerCost.toFixed(3)}EUR</td>
                                  <td className="text-center px-3 py-2.5" style={{ color: "var(--text-tertiary)" }}>{marginPct.toFixed(0)}%</td>
                                  <td className="text-center px-3 py-2.5">
                                    <span style={{ fontWeight: 700, color, fontSize: 13 }}>{grade}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── FOOTER ── */}
              <div className="py-6" style={{ borderTop: "2px solid var(--text-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
                  {isFr
                    ? "Genere par ORA Studio · Analyse basee sur des KPIs mesures (temps, cout, comptage). Aucune donnee subjective. Couts fournisseur bases sur les tarifs publics API."
                    : "Generated by ORA Studio · Analysis based on measured KPIs (time, cost, counts). No subjective data. Provider costs based on public API pricing."}
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
