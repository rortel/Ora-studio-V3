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
   COMPARE PAGE — ORA Intelligence Report
   43 AI models, real KPIs, deterministic scoring
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA77OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Model catalogs ──
const TEXT_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast", credits: 2, costEur: 0.20 },
  { id: "gpt-5", label: "GPT-5", badge: "Smart", credits: 3, costEur: 0.30 },
  { id: "gpt-5.1", label: "GPT-5.1", badge: "Premium", credits: 3, costEur: 0.30 },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative", credits: 2, costEur: 0.20 },
  { id: "claude-haiku", label: "Claude Haiku", badge: "Ultra Fast", credits: 1, costEur: 0.10 },
  { id: "claude-opus", label: "Claude Opus", badge: "Best", credits: 5, costEur: 0.50 },
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Multimodal", credits: 2, costEur: 0.20 },
  { id: "deepseek", label: "DeepSeek v3", badge: "Open Source", credits: 1, costEur: 0.10 },
  { id: "ora-writer", label: "ORA Writer", badge: "Agence", credits: 2, costEur: 0.20 },
];

const IMAGE_MODELS = [
  { id: "ideogram-3-leo", label: "Ideogram V3", badge: "Brand + Text", credits: 5, costEur: 0.50 },
  { id: "photon-1", label: "Luma Photon", badge: "Quality", credits: 5, costEur: 0.50 },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast", credits: 3, costEur: 0.30 },
  { id: "gpt-image-leo", label: "GPT Image", badge: "GPT-4o", credits: 8, costEur: 0.80 },
  { id: "dall-e", label: "DALL-E 3", badge: "Precise", credits: 8, costEur: 0.80 },
  { id: "flux-pro", label: "Flux Pro", badge: "Creative", credits: 8, costEur: 0.80 },
  { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Premium", credits: 5, costEur: 0.50 },
  { id: "flux-dev-leo", label: "Flux Dev", badge: "Open", credits: 5, costEur: 0.50 },
  { id: "flux-schnell-leo", label: "Flux Schnell", badge: "Ultra Fast", credits: 3, costEur: 0.30 },
  { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Edit", credits: 5, costEur: 0.50 },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo", credits: 5, costEur: 0.50 },
  { id: "leonardo-lightning", label: "Leonardo Lightning", badge: "Fast", credits: 5, costEur: 0.50 },
  { id: "leonardo-kino", label: "Leonardo Kino", badge: "Cinema", credits: 5, costEur: 0.50 },
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed", credits: 5, costEur: 0.50 },
  { id: "seedream-v4.5", label: "SeedDream v4.5", badge: "Latest", credits: 5, costEur: 0.50 },
  { id: "soul", label: "Soul", badge: "Artistic", credits: 5, costEur: 0.50 },
  { id: "nano-banana", label: "Nano Banana", badge: "Fast", credits: 5, costEur: 0.50 },
  { id: "nano-banana-2-leo", label: "Nano Banana 2", badge: "Upgraded", credits: 5, costEur: 0.50 },
  { id: "ora-vision", label: "ORA Vision", badge: "Agence", credits: 5, costEur: 0.50 },
];

const VIDEO_MODELS = [
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality", credits: 30, costEur: 3.00 },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast", credits: 20, costEur: 2.00 },
  { id: "veo-3.1", label: "Veo 3.1", badge: "Google", credits: 30, costEur: 3.00 },
  { id: "sora-2", label: "Sora 2", badge: "OpenAI", credits: 30, costEur: 3.00 },
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic", credits: 40, costEur: 4.00 },
  { id: "seedance-v1", label: "Seedance v1", badge: "TikTok", credits: 40, costEur: 4.00 },
  { id: "seedance-2.0", label: "Seedance 2.0", badge: "Latest", credits: 30, costEur: 3.00 },
  { id: "runway-gen3", label: "Runway Gen-3", badge: "Creative", credits: 30, costEur: 3.00 },
  { id: "pika", label: "Pika", badge: "Fun", credits: 20, costEur: 2.00 },
  { id: "dop", label: "DOP", badge: "Artistic", credits: 20, costEur: 2.00 },
  { id: "ora-motion", label: "ORA Motion", badge: "Agence", credits: 30, costEur: 3.00 },
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

// ── Scoring (deterministic, weighted) ──
function scoreTextModel(kpi: TextKPIs, allKPIs: TextKPIs[]): number {
  if (!kpi.success) return 0;
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return 0;

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));

  const speedScore = maxTime > 0 ? ((maxTime - kpi.timeMs) / maxTime) * 100 : 100;
  const costScore = maxCost > 0 ? ((maxCost - kpi.costEur) / maxCost) * 100 : 100;
  const readabilityScore = kpi.fleschScore;
  const richnessScore = Math.min(100, kpi.lexicalRichness * 200);
  const ctaBonus = kpi.hasCTA ? 10 : 0;
  const spamPenalty = kpi.spamWords.length * 5;
  const langPenalty = kpi.languageMatch ? 0 : 20;
  const repeatPenalty = Math.min(15, kpi.repeatedWords.length * 3);

  return Math.round(Math.max(0, Math.min(100,
    (speedScore * 0.20) + (costScore * 0.20) + (readabilityScore * 0.20) + (richnessScore * 0.20) + (20) // base reliability
    + ctaBonus - spamPenalty - langPenalty - repeatPenalty
  )));
}

function scoreImageModel(kpi: ImageKPIs, allKPIs: ImageKPIs[]): number {
  if (!kpi.success) return 0;
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return 0;

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));
  const maxPixels = Math.max(...successfulKPIs.map(k => k.width * k.height));
  const maxSize = Math.max(...successfulKPIs.map(k => k.fileSizeKB));

  const speedScore = maxTime > 0 ? ((maxTime - kpi.timeMs) / maxTime) * 100 : 100;
  const costScore = maxCost > 0 ? ((maxCost - kpi.costEur) / maxCost) * 100 : 100;
  const resolutionScore = maxPixels > 0 ? ((kpi.width * kpi.height) / maxPixels) * 100 : 100;
  const detailScore = maxSize > 0 ? (kpi.fileSizeKB / maxSize) * 100 : 100;
  const retryPenalty = kpi.retries * 10;

  return Math.round(Math.max(0, Math.min(100,
    (speedScore * 0.25) + (costScore * 0.25) + (resolutionScore * 0.25) + (detailScore * 0.15) + 10
    - retryPenalty
  )));
}

function scoreVideoModel(kpi: VideoKPIs, allKPIs: VideoKPIs[]): number {
  if (!kpi.success) return 0;
  const successfulKPIs = allKPIs.filter(k => k.success);
  if (successfulKPIs.length === 0) return 0;

  const maxTime = Math.max(...successfulKPIs.map(k => k.timeMs));
  const maxCost = Math.max(...successfulKPIs.map(k => k.costEur));

  const speedScore = maxTime > 0 ? ((maxTime - kpi.timeMs) / maxTime) * 100 : 100;
  const costScore = maxCost > 0 ? ((maxCost - kpi.costEur) / maxCost) * 100 : 100;
  const successScore = 100; // succeeded

  return Math.round(Math.max(0, Math.min(100,
    (speedScore * 0.30) + (costScore * 0.30) + (successScore * 0.30) + 10
  )));
}

// ── Recommendation engine (if/else, no AI) ──
interface Recommendation {
  winnerId: string;
  winnerLabel: string;
  winnerScore: number;
  reason: string;
  insights: string[];
}

function generateTextRecommendation(results: TextKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, reason: isFr ? "Aucun modèle n'a produit de résultat." : "No model produced a result.", insights: [] };

  const scores = successful.map(r => ({ ...r, score: scoreTextModel(r, results) }));
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];
  const insights: string[] = [];

  // Speed insight
  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    const ratio = (slowest.timeMs / fastest.timeMs).toFixed(1);
    insights.push(isFr
      ? `**Vitesse** — ${fastest.label} a généré en ${(fastest.timeMs / 1000).toFixed(1)}s, soit **${ratio}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
      : `**Speed** — ${fastest.label} generated in ${(fastest.timeMs / 1000).toFixed(1)}s, **${ratio}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
    );
  }

  // Cost insight
  const cheapest = successful.reduce((a, b) => a.costEur < b.costEur ? a : b);
  const priciest = successful.reduce((a, b) => a.costEur > b.costEur ? a : b);
  if (cheapest.costEur !== priciest.costEur) {
    const saving = ((priciest.costEur - cheapest.costEur) * 100).toFixed(0);
    insights.push(isFr
      ? `**Coût** — ${cheapest.label} coûte ${cheapest.costEur.toFixed(2)}€, contre ${priciest.costEur.toFixed(2)}€ pour ${priciest.label}. Sur 100 textes/mois : **${saving}€ d'économie**.`
      : `**Cost** — ${cheapest.label} costs €${cheapest.costEur.toFixed(2)}, vs €${priciest.costEur.toFixed(2)} for ${priciest.label}. Over 100 texts/month: **€${saving} saved**.`
    );
  }

  // Richness insight
  const richest = successful.reduce((a, b) => a.lexicalRichness > b.lexicalRichness ? a : b);
  const poorest = successful.reduce((a, b) => a.lexicalRichness < b.lexicalRichness ? a : b);
  if (richest.lexicalRichness - poorest.lexicalRichness > 0.05) {
    insights.push(isFr
      ? `**Richesse lexicale** — ${richest.label} (TTR ${richest.lexicalRichness.toFixed(2)}) utilise un vocabulaire ${((richest.lexicalRichness / poorest.lexicalRichness - 1) * 100).toFixed(0)}% plus varié que ${poorest.label} (${poorest.lexicalRichness.toFixed(2)}).`
      : `**Lexical richness** — ${richest.label} (TTR ${richest.lexicalRichness.toFixed(2)}) uses ${((richest.lexicalRichness / poorest.lexicalRichness - 1) * 100).toFixed(0)}% more varied vocabulary than ${poorest.label} (${poorest.lexicalRichness.toFixed(2)}).`
    );
  }

  // Readability insight
  const mostReadable = successful.reduce((a, b) => a.fleschScore > b.fleschScore ? a : b);
  insights.push(isFr
    ? `**Lisibilité** — ${mostReadable.label} produit des phrases de ${mostReadable.avgSentenceLength} mots en moyenne (Flesch: ${mostReadable.fleschScore}/100).`
    : `**Readability** — ${mostReadable.label} produces sentences of ${mostReadable.avgSentenceLength} words on average (Flesch: ${mostReadable.fleschScore}/100).`
  );

  // CTA insight
  const withCTA = successful.filter(r => r.hasCTA);
  const withoutCTA = successful.filter(r => !r.hasCTA);
  if (withCTA.length > 0 && withoutCTA.length > 0) {
    insights.push(isFr
      ? `**Call-to-Action** — ${withCTA.map(r => r.label).join(", ")} ${withCTA.length === 1 ? "inclut" : "incluent"} un CTA. ${withoutCTA.map(r => r.label).join(", ")} n'en ${withoutCTA.length === 1 ? "a" : "ont"} pas.`
      : `**Call-to-Action** — ${withCTA.map(r => r.label).join(", ")} ${withCTA.length === 1 ? "includes" : "include"} a CTA. ${withoutCTA.map(r => r.label).join(", ")} ${withoutCTA.length === 1 ? "does" : "do"} not.`
    );
  }

  // Spam words
  const spammy = successful.filter(r => r.spamWords.length > 0);
  if (spammy.length > 0) {
    insights.push(isFr
      ? `**Mots spam** — ⚠️ ${spammy.map(r => `${r.label} (${r.spamWords.join(", ")})`).join(" · ")} — risque de filtrage email.`
      : `**Spam words** — ⚠️ ${spammy.map(r => `${r.label} (${r.spamWords.join(", ")})`).join(" · ")} — email filtering risk.`
    );
  }

  // Language match
  const langMismatch = successful.filter(r => !r.languageMatch);
  if (langMismatch.length > 0) {
    insights.push(isFr
      ? `**Langue** — ⚠️ ${langMismatch.map(r => r.label).join(", ")} ${langMismatch.length === 1 ? "a répondu" : "ont répondu"} dans une langue différente de celle demandée.`
      : `**Language** — ⚠️ ${langMismatch.map(r => r.label).join(", ")} responded in a different language than requested.`
    );
  }

  const reason = isFr
    ? `Meilleur équilibre vitesse/qualité${winner.hasCTA ? ", CTA présent" : ""}${winner.spamWords.length === 0 ? ", zéro mot spam" : ""}.`
    : `Best speed/quality balance${winner.hasCTA ? ", CTA included" : ""}${winner.spamWords.length === 0 ? ", zero spam words" : ""}.`;

  return { winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.score, reason, insights };
}

function generateImageRecommendation(results: ImageKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, reason: isFr ? "Aucun modèle n'a produit de résultat." : "No model produced a result.", insights: [] };

  const scores = successful.map(r => ({ ...r, score: scoreImageModel(r, results) }));
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];
  const insights: string[] = [];

  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    insights.push(isFr
      ? `**Vitesse** — ${fastest.label} en ${(fastest.timeMs / 1000).toFixed(1)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
      : `**Speed** — ${fastest.label} in ${(fastest.timeMs / 1000).toFixed(1)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(1)}s).`
    );
  }

  const highestRes = successful.reduce((a, b) => (a.width * a.height) > (b.width * b.height) ? a : b);
  const lowestRes = successful.reduce((a, b) => (a.width * a.height) < (b.width * b.height) ? a : b);
  if (highestRes.resolution !== lowestRes.resolution) {
    insights.push(isFr
      ? `**Résolution** — ${highestRes.label} (${highestRes.resolution}) vs ${lowestRes.label} (${lowestRes.resolution}).`
      : `**Resolution** — ${highestRes.label} (${highestRes.resolution}) vs ${lowestRes.label} (${lowestRes.resolution}).`
    );
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    insights.push(isFr
      ? `**Fiabilité** — ⚠️ ${failed.map(r => r.label).join(", ")} ${failed.length === 1 ? "a échoué" : "ont échoué"} sur ce brief.`
      : `**Reliability** — ⚠️ ${failed.map(r => r.label).join(", ")} failed on this brief.`
    );
  }

  const reason = isFr
    ? `${winner.resolution}, ${(winner.timeMs / 1000).toFixed(1)}s, ${winner.costEur.toFixed(2)}€.`
    : `${winner.resolution}, ${(winner.timeMs / 1000).toFixed(1)}s, €${winner.costEur.toFixed(2)}.`;

  return { winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.score, reason, insights };
}

function generateVideoRecommendation(results: VideoKPIs[], locale: string): Recommendation {
  const isFr = locale === "fr";
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return { winnerId: "", winnerLabel: "", winnerScore: 0, reason: isFr ? "Aucun modèle n'a produit de résultat." : "No model produced a result.", insights: [] };

  const scores = successful.map(r => ({ ...r, score: scoreVideoModel(r, results) }));
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];
  const insights: string[] = [];

  const fastest = successful.reduce((a, b) => a.timeMs < b.timeMs ? a : b);
  const slowest = successful.reduce((a, b) => a.timeMs > b.timeMs ? a : b);
  if (fastest.model !== slowest.model) {
    insights.push(isFr
      ? `**Vitesse** — ${fastest.label} en ${(fastest.timeMs / 1000).toFixed(0)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x plus rapide** que ${slowest.label} (${(slowest.timeMs / 1000).toFixed(0)}s).`
      : `**Speed** — ${fastest.label} in ${(fastest.timeMs / 1000).toFixed(0)}s, **${(slowest.timeMs / fastest.timeMs).toFixed(1)}x faster** than ${slowest.label} (${(slowest.timeMs / 1000).toFixed(0)}s).`
    );
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    insights.push(isFr
      ? `**Fiabilité** — ⚠️ ${failed.map(r => r.label).join(", ")} ${failed.length === 1 ? "a échoué" : "ont échoué"}.`
      : `**Reliability** — ⚠️ ${failed.map(r => r.label).join(", ")} failed.`
    );
  }

  return { winnerId: winner.model, winnerLabel: winner.label, winnerScore: winner.score, reason: isFr ? `${(winner.timeMs / 1000).toFixed(0)}s, ${winner.costEur.toFixed(2)}€.` : `${(winner.timeMs / 1000).toFixed(0)}s, €${winner.costEur.toFixed(2)}.`, insights };
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ kpis: true, insights: true, outputs: true });

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
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await serverGet(`/generate/video-poll?generationId=${genId}`);
        if (res.success && res.videoUrl) return { url: res.videoUrl, pollCount: i + 1 };
        if (res.status === "failed") return null;
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

    const briefStep = { label: isFr ? "Brief analysé" : "Brief analyzed", status: "done" as StepStatus, timeMs: 0 };
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
        const results = await Promise.all(selectedModels.map(async (modelId, idx) => {
          setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "running" } : s));
          const modelInfo = modelCatalog.find(m => m.id === modelId)!;
          const start = Date.now();
          let retries = 0;
          try {
            const res = await serverGet(`/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${modelId}&aspectRatio=1:1`);
            const timeMs = Date.now() - start;
            const imageUrl = res.success && res.results?.[0]?.result?.imageUrl ? res.results[0].result.imageUrl : "";
            const imgMeta = res.results?.[0]?.result || {};

            // Probe image for size
            let fileSizeKB = 0;
            let width = imgMeta.width || 1024;
            let height = imgMeta.height || 1024;
            // Skip HEAD probe — many image hosts (OpenAI, Leonardo) block CORS HEAD requests

            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: imageUrl ? "done" : "error", timeMs } : s));
            return {
              model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
              resolution: `${width}×${height}`, width, height, aspectRatio: "1:1",
              fileSizeKB, format: "webp", retries, imageUrl, success: !!imageUrl,
            } as ImageKPIs;
          } catch (err: any) {
            const timeMs = Date.now() - start;
            setSteps(prev => prev.map((s, i) => i === idx + 1 ? { ...s, status: "error", timeMs } : s));
            return {
              model: modelId, label: modelInfo.label, timeMs, costEur: modelInfo.costEur, credits: modelInfo.credits,
              resolution: "0×0", width: 0, height: 0, aspectRatio: "1:1",
              fileSizeKB: 0, format: "", retries, imageUrl: "", success: false, error: err?.message,
            } as ImageKPIs;
          }
        }));
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
                  {isFr ? "Analysez et comparez les modèles IA sur des KPIs réels." : "Analyze and compare AI models on real KPIs."}
                </p>
              </div>
            </div>
          </div>

          {/* ── MODE TABS ── */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--secondary)", width: "fit-content" }}>
            {([
              { id: "text" as CompareMode, icon: Type, label: isFr ? "Texte" : "Text", count: TEXT_MODELS.length },
              { id: "image" as CompareMode, icon: ImageIcon, label: "Image", count: IMAGE_MODELS.length },
              { id: "video" as CompareMode, icon: Video, label: isFr ? "Vidéo" : "Video", count: VIDEO_MODELS.length },
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
                    ? (isFr ? "Ex: Produit cosmétique sur fond de nature, lumière dorée, style éditorial..." : "Ex: Cosmetic product on nature background, golden light, editorial style...")
                    : (isFr ? "Ex: Séquence cinématique d'un fleuriste arrangeant un bouquet, lumière naturelle..." : "Ex: Cinematic sequence of a florist arranging a bouquet, natural light...")}
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
                      {l === "fr" ? "Français" : "English"}
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
                {isFr ? `Modèles (${selectedModels.length}/${maxModels})` : `Models (${selectedModels.length}/${maxModels})`}
              </span>
              {selectedModels.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {totalCredits} {isFr ? "crédits" : "credits"} · {selectedModels.reduce((s, id) => s + (modelCatalog.find(m => m.id === id)?.costEur || 0), 0).toFixed(2)}€
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

          {/* ═══ RESULTS: ORA INTELLIGENCE REPORT ═══ */}
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
                  {new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} · {new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} · {mode === "text" ? (isFr ? "Texte" : "Text") : mode === "image" ? "Image" : (isFr ? "Vidéo" : "Video")} · {selectedModels.length} {isFr ? "modèles" : "models"}
                </div>
              </div>

              {/* ── VERDICT ── */}
              <div className="mb-6 rounded-2xl p-6" style={{ background: "linear-gradient(135deg, var(--accent-warm-light), #FFFFFF)", border: "1px solid var(--accent)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={18} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                    {isFr ? "Recommandé pour votre usage" : "Recommended for your use"}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {recommendation.winnerLabel}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                  {recommendation.reason}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: "var(--accent)", color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}>
                  {isFr ? "Score global" : "Overall score"}: {recommendation.winnerScore}/100
                </div>
              </div>

              {/* ── OUTPUTS SIDE BY SIDE ── */}
              <div className="mb-6">
                <button onClick={() => toggleSection("outputs")} className="flex items-center gap-2 mb-4 cursor-pointer">
                  {expandedSections.outputs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "Résultats côte à côte" : "Side-by-side results"}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSections.outputs && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 4)}, 1fr)` }}>
                        {mode === "text" && textResults.map(r => (
                          <div key={r.model} className="rounded-xl p-4" style={{
                            background: "#FFFFFF", border: `1.5px solid ${r.model === recommendation.winnerId ? "var(--accent)" : "var(--border)"}`,
                          }}>
                            <div className="flex items-center gap-2 mb-3">
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                              {r.model === recommendation.winnerId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>
                                  {isFr ? "RECOMMANDÉ" : "RECOMMENDED"}
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
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>★</span>
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
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent)", color: "#FFF" }}>★</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── KPI TABLE ── */}
              <div className="mb-6">
                <button onClick={() => toggleSection("kpis")} className="flex items-center gap-2 mb-4 cursor-pointer">
                  {expandedSections.kpis ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isFr ? "KPIs détaillés" : "Detailed KPIs"}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSections.kpis && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <table className="w-full" style={{ fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: "var(--secondary)" }}>
                              <th className="text-left px-4 py-2.5" style={{ fontWeight: 600, color: "var(--text-tertiary)" }}>KPI</th>
                              {selectedModels.map(id => {
                                const m = modelCatalog.find(c => c.id === id);
                                return <th key={id} className="text-center px-3 py-2.5" style={{ fontWeight: 600, color: id === recommendation.winnerId ? "var(--accent)" : "var(--text-primary)" }}>{m?.label}</th>;
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {mode === "text" && textResults.length > 0 && (
                              <>
                                <KPIRow label={isFr ? "Score global" : "Overall score"} icon={<Trophy size={12} />}
                                  values={textResults.map(r => ({ value: r.success ? `${scoreTextModel(r, textResults)}/100` : "—", highlight: r.model === recommendation.winnerId }))} />
                                <KPIRow label={isFr ? "Temps" : "Time"} icon={<Clock size={12} />}
                                  values={textResults.map(r => ({ value: `${(r.timeMs / 1000).toFixed(1)}s`, highlight: r.timeMs === Math.min(...textResults.filter(x => x.success).map(x => x.timeMs)) }))} />
                                <KPIRow label={isFr ? "Coût" : "Cost"} icon={<DollarSign size={12} />}
                                  values={textResults.map(r => ({ value: `${r.costEur.toFixed(2)}€ (${r.credits} cr)`, highlight: r.costEur === Math.min(...textResults.map(x => x.costEur)) }))} />
                                <KPIRow label={isFr ? "Mots" : "Words"} icon={<FileText size={12} />}
                                  values={textResults.map(r => ({ value: `${r.wordCount}`, highlight: false }))} />
                                <KPIRow label={isFr ? "Phrases" : "Sentences"} icon={<Type size={12} />}
                                  values={textResults.map(r => ({ value: `${r.sentenceCount} (ø${r.avgSentenceLength})`, highlight: false }))} />
                                <KPIRow label="Flesch" icon={<Eye size={12} />}
                                  values={textResults.map(r => ({ value: `${r.fleschScore}/100`, highlight: r.fleschScore === Math.max(...textResults.filter(x => x.success).map(x => x.fleschScore)) }))} />
                                <KPIRow label="TTR" icon={<Sparkles size={12} />}
                                  values={textResults.map(r => ({ value: r.lexicalRichness.toFixed(2), highlight: r.lexicalRichness === Math.max(...textResults.filter(x => x.success).map(x => x.lexicalRichness)) }))} />
                                <KPIRow label="CTA" icon={<ArrowRight size={12} />}
                                  values={textResults.map(r => ({ value: r.hasCTA ? "✅" : "❌", highlight: r.hasCTA }))} />
                                <KPIRow label={isFr ? "Hashtags" : "Hashtags"} icon={<Hash size={12} />}
                                  values={textResults.map(r => ({ value: `${r.hashtagCount}`, highlight: false }))} />
                                <KPIRow label={isFr ? "Questions" : "Questions"} icon={<MessageSquare size={12} />}
                                  values={textResults.map(r => ({ value: `${r.questionCount}`, highlight: false }))} />
                                <KPIRow label={isFr ? "Mots spam" : "Spam words"} icon={<Shield size={12} />}
                                  values={textResults.map(r => ({ value: r.spamWords.length > 0 ? `⚠️ ${r.spamWords.length}` : "✅ 0", highlight: r.spamWords.length === 0 }))} />
                                <KPIRow label={isFr ? "Langue OK" : "Language OK"} icon={<Zap size={12} />}
                                  values={textResults.map(r => ({ value: r.languageMatch ? "✅" : "⚠️", highlight: r.languageMatch }))} />
                                <KPIRow label={isFr ? "Répétitions" : "Repeats"} icon={<Type size={12} />}
                                  values={textResults.map(r => ({ value: r.repeatedWords.length > 0 ? r.repeatedWords.map(w => `${w.word}(${w.count})`).join(", ") : "✅", highlight: r.repeatedWords.length === 0 }))} />
                              </>
                            )}
                            {mode === "image" && imageResults.length > 0 && (
                              <>
                                <KPIRow label={isFr ? "Score global" : "Overall score"} icon={<Trophy size={12} />}
                                  values={imageResults.map(r => ({ value: r.success ? `${scoreImageModel(r, imageResults)}/100` : "—", highlight: r.model === recommendation.winnerId }))} />
                                <KPIRow label={isFr ? "Temps" : "Time"} icon={<Clock size={12} />}
                                  values={imageResults.map(r => ({ value: `${(r.timeMs / 1000).toFixed(1)}s`, highlight: r.success && r.timeMs === Math.min(...imageResults.filter(x => x.success).map(x => x.timeMs)) }))} />
                                <KPIRow label={isFr ? "Coût" : "Cost"} icon={<DollarSign size={12} />}
                                  values={imageResults.map(r => ({ value: `${r.costEur.toFixed(2)}€ (${r.credits} cr)`, highlight: r.costEur === Math.min(...imageResults.map(x => x.costEur)) }))} />
                                <KPIRow label={isFr ? "Résolution" : "Resolution"} icon={<ImageIcon size={12} />}
                                  values={imageResults.map(r => ({ value: r.resolution || "—", highlight: r.success && (r.width * r.height) === Math.max(...imageResults.filter(x => x.success).map(x => x.width * x.height)) }))} />
                                <KPIRow label={isFr ? "Poids" : "File size"} icon={<FileText size={12} />}
                                  values={imageResults.map(r => ({ value: r.fileSizeKB > 0 ? `${r.fileSizeKB} KB` : "—", highlight: false }))} />
                                <KPIRow label={isFr ? "Succès" : "Success"} icon={<CheckCircle2 size={12} />}
                                  values={imageResults.map(r => ({ value: r.success ? "✅" : "❌", highlight: r.success }))} />
                              </>
                            )}
                            {mode === "video" && videoResults.length > 0 && (
                              <>
                                <KPIRow label={isFr ? "Score global" : "Overall score"} icon={<Trophy size={12} />}
                                  values={videoResults.map(r => ({ value: r.success ? `${scoreVideoModel(r, videoResults)}/100` : "—", highlight: r.model === recommendation.winnerId }))} />
                                <KPIRow label={isFr ? "Temps" : "Time"} icon={<Clock size={12} />}
                                  values={videoResults.map(r => ({ value: `${(r.timeMs / 1000).toFixed(0)}s`, highlight: r.success && r.timeMs === Math.min(...videoResults.filter(x => x.success).map(x => x.timeMs)) }))} />
                                <KPIRow label={isFr ? "Coût" : "Cost"} icon={<DollarSign size={12} />}
                                  values={videoResults.map(r => ({ value: `${r.costEur.toFixed(2)}€ (${r.credits} cr)`, highlight: r.costEur === Math.min(...videoResults.map(x => x.costEur)) }))} />
                                <KPIRow label={isFr ? "Polls" : "Polls"} icon={<Clock size={12} />}
                                  values={videoResults.map(r => ({ value: r.pollCount > 0 ? `${r.pollCount}` : "—", highlight: false }))} />
                                <KPIRow label={isFr ? "Succès" : "Success"} icon={<CheckCircle2 size={12} />}
                                  values={videoResults.map(r => ({ value: r.success ? "✅" : "❌", highlight: r.success }))} />
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── INSIGHTS ── */}
              {recommendation.insights.length > 0 && (
                <div className="mb-8">
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

              {/* ── FOOTER ── */}
              <div className="py-6" style={{ borderTop: "2px solid var(--text-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
                  {isFr
                    ? "Généré par ORA Studio · Analyse basée sur des KPIs mesurés (temps, coût, comptage). Aucune donnée subjective."
                    : "Generated by ORA Studio · Analysis based on measured KPIs (time, cost, counts). No subjective data."}
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

/* ── KPI Table Row component ── */
function KPIRow({ label, icon, values }: { label: string; icon: React.ReactNode; values: { value: string; highlight: boolean }[] }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border)" }}>
      <td className="px-4 py-2.5 flex items-center gap-2" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        {icon} {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="text-center px-3 py-2.5" style={{
          color: v.highlight ? "var(--accent)" : "var(--text-primary)",
          fontWeight: v.highlight ? 700 : 400,
        }}>
          {v.value}
        </td>
      ))}
    </tr>
  );
}
