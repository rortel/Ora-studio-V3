import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Clock, DollarSign, FileText, Image as ImageIcon, Video,
  Play, CheckCircle2, Circle, Loader2, Trophy, AlertTriangle,
  ChevronDown, ChevronRight, X, BarChart3, ArrowRight, Download,
  Type, Hash, MessageSquare, Sparkles, Shield, Eye, Save, Heart,
  Maximize2, Minimize2, Mic, Square, Paperclip, Send,
  ScanLine, Layers, PaintBucket, TypeIcon, User2, LayoutGrid,
  Copy, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";
import { CampaignCompositor } from "../components/CampaignCompositor";

/* ═══════════════════════════════════════════════════════════
   CREATIVE LAB — Free creation playground with Yuka scoring
   Generate · Compare · Save · Download
   Layout: results scroll up, input bar fixed at bottom
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA77OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Types ──
type ModelTier = "economy" | "standard" | "premium";
type CreativeMode = "text" | "image" | "video";
type StepStatus = "pending" | "running" | "done" | "error";

interface ModelDef {
  id: string; label: string; badge: string; credits: number;
  costEur: number; providerCostEur: number;
  strengths: string[]; bestFor: string; tier: ModelTier;
}

// ── Model catalogs ──
const TEXT_MODELS: ModelDef[] = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast", credits: 2, costEur: 0.20, providerCostEur: 0.008, strengths: ["speed", "multilingual"], bestFor: "Contenu rapide multilingue", tier: "standard" },
  { id: "gpt-5", label: "GPT-5", badge: "Smart", credits: 3, costEur: 0.30, providerCostEur: 0.015, strengths: ["reasoning", "nuance"], bestFor: "Briefs complexes", tier: "premium" },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative", credits: 2, costEur: 0.20, providerCostEur: 0.012, strengths: ["creativity", "storytelling"], bestFor: "Storytelling créatif", tier: "standard" },
  { id: "claude-opus", label: "Claude Opus", badge: "Best", credits: 5, costEur: 0.50, providerCostEur: 0.060, strengths: ["depth", "strategy"], bestFor: "Contenu stratégique", tier: "premium" },
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Google", credits: 2, costEur: 0.20, providerCostEur: 0.010, strengths: ["multimodal", "factual"], bestFor: "Contenu data-driven", tier: "standard" },
  { id: "deepseek", label: "DeepSeek v3", badge: "Open", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["affordable", "technical"], bestFor: "Budget-friendly", tier: "economy" },
  // ── Together AI models (open-source, 5-30× cheaper) ──
  { id: "together-llama-3.3-70b", label: "Llama 3.3 70B", badge: "Open", credits: 1, costEur: 0.10, providerCostEur: 0.0008, strengths: ["multilingual", "speed", "affordable"], bestFor: "Multilingue économique", tier: "economy" },
  { id: "together-deepseek-v3", label: "DeepSeek V3", badge: "Reasoning", credits: 1, costEur: 0.10, providerCostEur: 0.0011, strengths: ["reasoning", "code"], bestFor: "Raisonnement rapide", tier: "economy" },
  { id: "together-deepseek-r1", label: "DeepSeek R1", badge: "Deep Think", credits: 3, costEur: 0.30, providerCostEur: 0.0065, strengths: ["reasoning", "depth"], bestFor: "Réflexion profonde", tier: "premium" },
  { id: "together-qwen-2.5-72b", label: "Qwen 2.5 72B", badge: "FR Native", credits: 1, costEur: 0.10, providerCostEur: 0.0011, strengths: ["multilingual", "creativity", "french"], bestFor: "Storytelling français", tier: "standard" },
  { id: "together-kimi-k2", label: "Kimi K2", badge: "Long Ctx", credits: 2, costEur: 0.20, providerCostEur: 0.0022, strengths: ["long-context", "reasoning"], bestFor: "Contextes très longs", tier: "standard" },
  { id: "together-glm-4.5", label: "GLM 4.5", badge: "Copy", credits: 2, costEur: 0.20, providerCostEur: 0.0018, strengths: ["creativity", "storytelling"], bestFor: "Copywriting créatif", tier: "standard" },
  { id: "together-gpt-oss-120b", label: "GPT-OSS 120B", badge: "Open", credits: 2, costEur: 0.20, providerCostEur: 0.0014, strengths: ["reasoning", "affordable"], bestFor: "Alternative OpenAI", tier: "standard" },
];

const IMAGE_MODELS: ModelDef[] = [
  { id: "ideogram-3-leo", label: "Ideogram V3", badge: "Brand + Text", credits: 5, costEur: 0.50, providerCostEur: 0.074, strengths: ["text-rendering", "branding"], bestFor: "Logos, texte sur images", tier: "premium" },
  { id: "photon-1", label: "Luma Photon", badge: "Quality", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["realism", "lighting"], bestFor: "Portraits réalistes", tier: "standard" },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast", credits: 3, costEur: 0.30, providerCostEur: 0.014, strengths: ["speed", "iteration"], bestFor: "Itérations rapides", tier: "economy" },
  { id: "gpt-image-leo", label: "GPT Image", badge: "GPT-4o", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["creative", "detail"], bestFor: "Prompts complexes", tier: "premium" },
  { id: "dall-e", label: "DALL-E 3", badge: "Precise", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["precision", "compositions"], bestFor: "Compositions précises", tier: "premium" },
  { id: "flux-pro", label: "Flux Pro", badge: "Creative", credits: 8, costEur: 0.80, providerCostEur: 0.046, strengths: ["artistic", "detail"], bestFor: "Visuels artistiques", tier: "premium" },
  { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.023, strengths: ["quality"], bestFor: "Campagnes premium", tier: "premium" },
  { id: "flux-schnell-leo", label: "Flux Schnell", badge: "Ultra Fast", credits: 3, costEur: 0.30, providerCostEur: 0.003, strengths: ["ultra-fast"], bestFor: "Brouillons rapides", tier: "economy" },
  { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Edit", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["editing", "consistency"], bestFor: "Édition, cohérence", tier: "standard" },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["photo-realism"], bestFor: "Photo produit", tier: "standard" },
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["detail", "textures"], bestFor: "Environnements détaillés", tier: "standard" },
  { id: "soul", label: "Soul", badge: "Artistic", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["artistic", "stylized"], bestFor: "Style artistique", tier: "standard" },
  { id: "ora-vision", label: "ORA Vision", badge: "Agence", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["balanced", "agency"], bestFor: "Qualité agence", tier: "standard" },
  // ── Together AI Flux models (direct access, 10-15× cheaper than BFL) ──
  { id: "together-flux-schnell", label: "Flux Schnell (Together)", badge: "€0.003", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["ultra-fast", "affordable"], bestFor: "Brouillons ultra-économiques", tier: "economy" },
  { id: "together-flux-dev", label: "Flux Dev (Together)", badge: "Balanced", credits: 3, costEur: 0.30, providerCostEur: 0.025, strengths: ["quality", "artistic"], bestFor: "Qualité équilibrée", tier: "standard" },
  { id: "together-flux-pro-1.1", label: "Flux 1.1 Pro (Together)", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.040, strengths: ["premium", "photo-realism"], bestFor: "Premium photoréaliste", tier: "premium" },
];

const VIDEO_MODELS: ModelDef[] = [
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["quality", "cinematic"], bestFor: "Cinématique", tier: "premium" },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast", credits: 20, costEur: 2.00, providerCostEur: 0.14, strengths: ["speed"], bestFor: "Itération vidéo rapide", tier: "economy" },
  { id: "veo-3.1", label: "Veo 3.1", badge: "Google", credits: 30, costEur: 3.00, providerCostEur: 0.50, strengths: ["google", "quality"], bestFor: "Qualité Google", tier: "premium" },
  { id: "sora-2", label: "Sora 2", badge: "OpenAI", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["creative", "narrative"], bestFor: "Narrations créatives", tier: "premium" },
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic", credits: 40, costEur: 4.00, providerCostEur: 0.35, strengths: ["cinematic", "character"], bestFor: "Scènes à personnages", tier: "premium" },
  { id: "seedance-2.0", label: "Seedance 2.0", badge: "Latest", credits: 30, costEur: 3.00, providerCostEur: 0.25, strengths: ["versatile"], bestFor: "Contenu vidéo polyvalent", tier: "standard" },
  { id: "pika", label: "Pika", badge: "Fun", credits: 20, costEur: 2.00, providerCostEur: 0.10, strengths: ["fun", "quick"], bestFor: "Animations fun", tier: "economy" },
  { id: "ora-motion", label: "ORA Motion", badge: "Agence", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["agency", "campaign"], bestFor: "Vidéo campagne", tier: "standard" },
];

// ── Result types ──
interface KpiEntry { key: string; value: number }
interface KpiCategory {
  id: "render" | "perfPro" | "usage" | "technical" | "legal" | "ethics";
  overall: number;
  kpis: KpiEntry[];
}
interface TrustScore { overall: number; waitTime: number; realism: number; cleanliness: number }
interface CreativeScores {
  overall: number;
  trust: TrustScore;
  categories: KpiCategory[];
}
interface CreativeResult {
  id: string;
  modelId: string;
  label: string;
  type: CreativeMode;
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  timeMs: number;
  success: boolean;
  error?: string;
  scores: CreativeScores;
  saved?: boolean;
}

const EMPTY_SCORES: CreativeScores = {
  overall: 0,
  trust: { overall: 0, waitTime: 0, realism: 0, cleanliness: 0 },
  categories: [],
};

// ── Scoring ──
function getGradeLabel(score: number, isFr: boolean): { label: string; color: string } {
  if (score >= 80) return { label: isFr ? "Excellent" : "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: isFr ? "Bon" : "Good", color: "#84cc16" };
  if (score >= 40) return { label: isFr ? "Médiocre" : "Mediocre", color: "#f59e0b" };
  return { label: isFr ? "Insuffisant" : "Poor", color: "#ef4444" };
}

// Provider inferred from model id, drives legal/ethics heuristics
function getProvider(modelId: string): string {
  if (/^together-/.test(modelId)) return "together";
  if (/^gpt-|^dall-|^sora/.test(modelId)) return "openai";
  if (/^claude/.test(modelId)) return "anthropic";
  if (/^gemini|^veo/.test(modelId)) return "google";
  if (/^ideogram/.test(modelId)) return "ideogram";
  if (/^photon|^ray/.test(modelId)) return "luma";
  if (/^flux|^kontext/.test(modelId)) return "bfl";
  if (/^lucid/.test(modelId)) return "leonardo";
  if (/^seedream|^seedance/.test(modelId)) return "bytedance";
  if (/^kling/.test(modelId)) return "kuaishou";
  if (/^pika/.test(modelId)) return "pika";
  if (/^ora-/.test(modelId)) return "ora";
  if (/^deepseek/.test(modelId)) return "deepseek";
  return "other";
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function tierBase(tier: ModelTier | undefined): number {
  return tier === "premium" ? 90 : tier === "standard" ? 75 : 60;
}

function computeScores(
  results: { modelId: string; timeMs: number; success: boolean }[],
  mode: CreativeMode
): Map<string, CreativeScores> {
  const map = new Map<string, CreativeScores>();
  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  const ok = results.filter(r => r.success);
  if (!ok.length) {
    for (const r of results) map.set(r.modelId, { ...EMPTY_SCORES });
    return map;
  }

  const maxT = Math.max(...ok.map(r => r.timeMs));
  const minT = Math.min(...ok.map(r => r.timeMs));
  const maxProv = Math.max(...ok.map(r => catalog.find(c => c.id === r.modelId)?.providerCostEur || 0.01));
  const minProv = Math.min(...ok.map(r => catalog.find(c => c.id === r.modelId)?.providerCostEur || 0.01));
  const maxCost = Math.max(...ok.map(r => catalog.find(c => c.id === r.modelId)?.costEur || 0.1));
  const minCost = Math.min(...ok.map(r => catalog.find(c => c.id === r.modelId)?.costEur || 0.1));

  for (const r of results) {
    if (!r.success) { map.set(r.modelId, { ...EMPTY_SCORES }); continue; }

    const m = catalog.find(c => c.id === r.modelId);
    const tier = m?.tier;
    const strengths = m?.strengths || [];
    const provider = getProvider(r.modelId);
    const has = (k: string) => strengths.some(s => s.toLowerCase().includes(k));

    // Normalized signals (0-100, higher = better)
    const speed = maxT > minT ? clamp(((maxT - r.timeMs) / (maxT - minT)) * 100) : 100;
    const costValue = maxCost > minCost ? clamp(((maxCost - (m?.costEur || 0.5)) / (maxCost - minCost)) * 100) : 100;
    const providerValue = maxProv > minProv ? clamp(((maxProv - (m?.providerCostEur || 0.01)) / (maxProv - minProv)) * 100) : 100;
    const base = tierBase(tier);

    // ── Mode-specific RENDER category ──
    let renderKpis: KpiEntry[] = [];
    if (mode === "image") {
      renderKpis = [
        { key: "anatomy", value: clamp(base + (has("realism") || has("photo") ? 8 : 0)) },
        { key: "resolution", value: clamp(base + (has("detail") || has("quality") ? 5 : 0)) },
        { key: "promptFidelity", value: clamp(base + (has("precision") || has("text-rendering") || has("editing") ? 10 : 0)) },
        { key: "noise", value: clamp(base + (tier === "premium" ? 5 : 0)) },
      ];
    } else if (mode === "video") {
      renderKpis = [
        { key: "temporalStability", value: clamp(base + (has("cinematic") || has("quality") ? 8 : 0)) },
        { key: "fluidity", value: clamp(base + 5) },
        { key: "physics", value: clamp(base + (has("cinematic") || has("character") ? 8 : 0)) },
        { key: "audio", value: has("narrative") || provider === "google" || provider === "openai" ? 75 : 35 },
      ];
    } else {
      renderKpis = [
        { key: "hallucination", value: clamp(base + (has("factual") || has("reasoning") ? 10 : 0)) },
        { key: "voice", value: clamp(base + (has("creativity") || has("storytelling") ? 12 : 0)) },
        { key: "logicalStructure", value: clamp(base + (has("reasoning") || has("depth") ? 12 : 0)) },
        { key: "perplexity", value: clamp(base + (tier === "premium" ? 5 : tier === "economy" ? -5 : 0)) },
      ];
    }
    const renderOverall = clamp(renderKpis.reduce((s, k) => s + k.value, 0) / renderKpis.length);

    // ── Performance Pro ──
    const perfProKpis: KpiEntry[] = [
      { key: "productivity", value: speed },
      { key: "unitCost", value: costValue },
      { key: "timeToMarket", value: clamp(speed * 0.7 + base * 0.3) },
      { key: "engagement", value: base },
    ];
    const perfProOverall = clamp(perfProKpis.reduce((s, k) => s + k.value, 0) / perfProKpis.length);

    // ── Usage Non-Pro ──
    const usageKpis: KpiEntry[] = [
      { key: "learningCurve", value: 80 },
      { key: "priceAccessibility", value: costValue },
      { key: "versatility", value: clamp(40 + strengths.length * 15) },
    ];
    const usageOverall = clamp(usageKpis.reduce((s, k) => s + k.value, 0) / usageKpis.length);

    // ── Technique ──
    const technicalKpis: KpiEntry[] = [
      { key: "generationTime", value: speed },
      { key: "iterationCost", value: providerValue },
      { key: "apiScalability", value: provider === "ora" ? 70 : 85 },
    ];
    const technicalOverall = clamp(technicalKpis.reduce((s, k) => s + k.value, 0) / technicalKpis.length);

    // ── Légal & Sécurité ──
    const strictProviders = ["openai", "anthropic", "google", "ora"];
    const mediumProviders = ["ideogram", "luma", "leonardo", "bfl"];
    const copyright = strictProviders.includes(provider) ? 88 : mediumProviders.includes(provider) ? 72 : 55;
    const fineTuning = ["openai", "google", "anthropic", "deepseek", "bfl"].includes(provider)
      ? (mode === "text" ? 88 : 55) : 40;
    const legalKpis: KpiEntry[] = [
      { key: "copyright", value: copyright },
      { key: "dataIsolation", value: 85 },
      { key: "brandSafety", value: clamp(base + (has("branding") || has("agency") ? 10 : 0)) },
      { key: "fineTuning", value: fineTuning },
    ];
    const legalOverall = clamp(legalKpis.reduce((s, k) => s + k.value, 0) / legalKpis.length);

    // ── Éthique & RSE ──
    const carbon = providerValue;
    const biasScore = tier === "premium" ? 78 : tier === "standard" ? 72 : 65;
    const ethicsKpis: KpiEntry[] = [
      { key: "carbon", value: carbon },
      { key: "bias", value: biasScore },
    ];
    const ethicsOverall = clamp(ethicsKpis.reduce((s, k) => s + k.value, 0) / ethicsKpis.length);

    const categories: KpiCategory[] = [
      { id: "render", overall: renderOverall, kpis: renderKpis },
      { id: "perfPro", overall: perfProOverall, kpis: perfProKpis },
      { id: "usage", overall: usageOverall, kpis: usageKpis },
      { id: "technical", overall: technicalOverall, kpis: technicalKpis },
      { id: "legal", overall: legalOverall, kpis: legalKpis },
      { id: "ethics", overall: ethicsOverall, kpis: ethicsKpis },
    ];

    // ── Trust Score (Yuka style) ──
    const waitTime = speed;
    const realism = mode === "text"
      ? clamp(base + (has("factual") ? 8 : 0))
      : clamp(base + (has("realism") || has("photo") || has("cinematic") ? 10 : 0));
    const cleanliness = clamp(base + 10);
    const trustOverall = clamp(waitTime * 0.25 + realism * 0.45 + cleanliness * 0.30);

    // ── Global overall (weighted) ──
    const overall = clamp(
      trustOverall * 0.30 +
      renderOverall * 0.35 +
      perfProOverall * 0.15 +
      technicalOverall * 0.10 +
      legalOverall * 0.05 +
      ethicsOverall * 0.05
    );

    map.set(r.modelId, {
      overall,
      trust: { overall: trustOverall, waitTime, realism, cleanliness },
      categories,
    });
  }
  return map;
}

// Trust badge (Yuka-style): circle + label
function TrustBadge({ score, isFr, size = "md" }: { score: number; isFr: boolean; size?: "sm" | "md" }) {
  const { label, color } = getGradeLabel(score, isFr);
  const dim = size === "sm" ? 28 : 38;
  const fontSize = size === "sm" ? 11 : 14;
  return (
    <div className="flex items-center gap-1.5">
      <div style={{
        width: dim, height: dim, borderRadius: "50%",
        background: `${color}18`, border: `1.5px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize, fontWeight: 800, color,
      }}>{score}</div>
      <div className="flex flex-col" style={{ lineHeight: 1.1 }}>
        <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {isFr ? "Confiance" : "Trust"}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
      </div>
    </div>
  );
}

function getCategoryMeta(id: KpiCategory["id"], isFr: boolean): { label: string; criterion: string } {
  const m: Record<KpiCategory["id"], { fr: [string, string]; en: [string, string] }> = {
    render:    { fr: ["Rendu", "Qualité visuelle & fidélité"], en: ["Render", "Visual quality & fidelity"] },
    perfPro:   { fr: ["Performance Pro", "Rentabilité et ROI mesurable"], en: ["Pro Performance", "Measurable ROI"] },
    usage:     { fr: ["Usage Non-Pro", "Facilité & satisfaction immédiate"], en: ["Consumer Use", "Ease & instant satisfaction"] },
    technical: { fr: ["Technique", "Efficacité opérationnelle"], en: ["Technical", "Operational efficiency"] },
    legal:     { fr: ["Légal & Sécurité", "Protection & personnalisation"], en: ["Legal & Security", "Protection & customization"] },
    ethics:    { fr: ["Éthique & RSE", "Responsabilité environnementale"], en: ["Ethics & CSR", "Environmental responsibility"] },
  };
  const [label, criterion] = isFr ? m[id].fr : m[id].en;
  return { label, criterion };
}

function getKpiLabel(key: string, isFr: boolean): string {
  const m: Record<string, [string, string]> = {
    anatomy: ["Anatomie", "Anatomy"],
    resolution: ["Résolution/DPI", "Resolution/DPI"],
    promptFidelity: ["Fidélité au prompt", "Prompt fidelity"],
    noise: ["Absence de bruit", "Noise-free"],
    temporalStability: ["Stabilité temporelle", "Temporal stability"],
    fluidity: ["Fluidité (FPS)", "Fluidity (FPS)"],
    physics: ["Physique des mouvements", "Motion physics"],
    audio: ["Audio", "Audio"],
    hallucination: ["Taux d'hallucination", "Hallucination rate"],
    voice: ["Ton (Voice)", "Voice (tone)"],
    logicalStructure: ["Structure logique", "Logical structure"],
    perplexity: ["Perplexité", "Perplexity"],
    productivity: ["Gain de productivité", "Productivity gain"],
    unitCost: ["Coût/unité", "Cost/unit"],
    timeToMarket: ["Time-to-market", "Time-to-market"],
    engagement: ["Engagement", "Engagement"],
    learningCurve: ["Courbe d'apprentissage", "Learning curve"],
    priceAccessibility: ["Accessibilité prix", "Price accessibility"],
    versatility: ["Polyvalence", "Versatility"],
    generationTime: ["Temps de génération", "Generation time"],
    iterationCost: ["Coût par itération", "Cost per iteration"],
    apiScalability: ["Scalabilité API", "API scalability"],
    copyright: ["Copyright", "Copyright"],
    dataIsolation: ["Isolation des données", "Data isolation"],
    brandSafety: ["Brand safety", "Brand safety"],
    fineTuning: ["Fine-tuning", "Fine-tuning"],
    carbon: ["Empreinte carbone", "Carbon footprint"],
    bias: ["Score de biais", "Bias score"],
  };
  const [fr, en] = m[key] || [key, key];
  return isFr ? fr : en;
}

// ── Score Gauge ──
function ScoreGauge({ score, size = 80, isFr = false }: { score: number; size?: number; isFr?: boolean }) {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { label, color } = getGradeLabel(score, isFr);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}12`} stroke="var(--border)" strokeWidth={1.5} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size >= 80 ? 24 : 18} fontWeight={700}>{score}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" dominantBaseline="central" fill="var(--muted-foreground)" fontSize={9}>/100</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.02em" }}>{label}</span>
    </div>
  );
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  const c = value >= 70 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 10 }}>
      <span style={{ width: 108, color: "var(--muted-foreground)", flexShrink: 0, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--background)" }}>
        <div style={{ width: `${Math.max(2, value)}%`, height: "100%", borderRadius: 2, background: c, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ width: 20, textAlign: "right", color: "var(--foreground)", fontWeight: 600, fontSize: 10 }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN: ORA Compare
   ═══════════════════════════════════════════════════════════ */

export function ComparePage() {
  const { t, locale } = useI18n();
  const { getAuthHeader } = useAuth();
  const isFr = locale === "fr";

  const [mode, setMode] = useState<CreativeMode>("image");
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: StepStatus; timeMs?: number }[]>([]);
  const [results, setResults] = useState<CreativeResult[]>([]);
  const [lightbox, setLightbox] = useState<CreativeResult | null>(null);
  const [showScores, setShowScores] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // ── Voice recording (Whisper) ──
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Attached product photo ──
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string; signedUrl?: string; uploading: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Visual Blueprint Analyzer ──
  const [showBlueprintPanel, setShowBlueprintPanel] = useState(false);
  const [blueprintAnalyzing, setBlueprintAnalyzing] = useState(false);
  const [blueprintResult, setBlueprintResult] = useState<any>(null);
  const [blueprintId, setBlueprintId] = useState<string | null>(null);
  const [blueprintPreviewImage, setBlueprintPreviewImage] = useState<string | null>(null);
  const [blueprintOriginalDataUri, setBlueprintOriginalDataUri] = useState<string | null>(null);
  const blueprintFileRef = useRef<HTMLInputElement>(null);

  // ── Compositor ──
  const [showCompositor, setShowCompositor] = useState(false);
  const [compositorTokens, setCompositorTokens] = useState<any>(null);
  const [compositorBaseImage, setCompositorBaseImage] = useState<string | null>(null);
  const [extractingTokens, setExtractingTokens] = useState(false);

  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  const maxModels = mode === "text" ? 4 : mode === "image" ? 6 : 4;

  useEffect(() => { setSelectedModels([]); setResults([]); setSteps([]); }, [mode]);

  // Scroll to bottom when new results appear
  useEffect(() => {
    if (results.length > 0) resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results]);

  const toggleModel = (id: string) => {
    setSelectedModels(prev => prev.includes(id) ? prev.filter(m => m !== id) : prev.length >= maxModels ? prev : [...prev, id]);
  };

  // ── Voice recording ──
  const startRecording = useCallback(async () => {
    if (window.self !== window.top) {
      toast.error(isFr ? "Micro bloqué" : "Mic blocked", { description: isFr ? "Ouvrez dans un nouvel onglet" : "Open in new tab" });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(isFr ? "Micro indisponible" : "Mic unavailable");
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
            setPrompt(prev => (prev ? prev + " " + data.text : data.text));
            toast.success(isFr ? "Transcription OK" : "Voice transcribed", { description: data.text.slice(0, 60) + (data.text.length > 60 ? "..." : "") });
            setTimeout(() => textareaRef.current?.focus(), 100);
          } else {
            toast.error(isFr ? "Transcription échouée" : "Transcription failed");
          }
        } catch {
          toast.error(isFr ? "Erreur transcription" : "Transcription error");
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
        toast.error(isFr ? "Accès micro refusé" : "Mic access denied");
      } else if (err?.name === "NotFoundError") {
        toast.error(isFr ? "Aucun micro détecté" : "No mic detected");
      } else {
        toast.error(isFr ? "Erreur micro" : "Mic error");
      }
    }
  }, [isFr]);

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

  // ── Attached product photo ──
  const handleAttachImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Format non supporté" : "Unsupported format"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (max 10 MB)" : "Image too large (max 10 MB)"); return; }
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
        toast.success(isFr ? "Photo produit ajoutée" : "Product photo added");
      } else {
        toast.error(isFr ? "Échec upload" : "Upload failed");
        setAttachedImage(null);
        URL.revokeObjectURL(preview);
      }
    } catch {
      toast.error(isFr ? "Erreur réseau" : "Network error");
      setAttachedImage(null);
      URL.revokeObjectURL(preview);
    }
  }, [isFr]);

  const removeAttachedImage = useCallback(() => {
    if (attachedImage?.preview) URL.revokeObjectURL(attachedImage.preview);
    setAttachedImage(null);
  }, [attachedImage]);

  // ── Server calls (CORS-safe: text/plain avoids preflight for most browsers) ──
  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    // Retry once on network/CORS failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ ...body, _token: token }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const text = await r.text();
        try { return JSON.parse(text); } catch { return { success: false, error: `Server error (${r.status})` }; }
      } catch (err: any) {
        if (attempt === 0) {
          console.warn(`[serverPost] ${path} attempt 1 failed (${err?.message}), retrying...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return { success: false, error: err?.message || "Network error" };
      }
    }
    return { success: false, error: "Request failed" };
  }, [getAuthHeader]);

  const serverGet = useCallback(async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { Authorization: `Bearer ${publicAnonKey}` }, signal: AbortSignal.timeout(180_000) });
    return r.json();
  }, []);

  const pollVideo = useCallback(async (genId: string): Promise<string | null> => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await serverGet(`/generate/video-status?id=${genId}`);
        if (res.state === "completed" && res.videoUrl) return res.videoUrl;
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }, [serverGet]);

  // ── Blueprint & Compositor callbacks (need serverPost) ──
  const extractTokensFromBlueprint = useCallback(async (bpId: string) => {
    setExtractingTokens(true);
    try {
      const res = await serverPost("/vault/tokens/from-blueprint", { blueprintId: bpId });
      if (res.success && res.tokens?.tokens) {
        setCompositorTokens(res.tokens.tokens);
        setShowCompositor(true);
        setShowBlueprintPanel(false);
        toast.success(isFr ? "Tokens extraits ! Compositor ouvert." : "Tokens extracted! Compositor opened.");
      } else {
        toast.error(isFr ? "Extraction échouée" : "Extraction failed", { description: res.error || "" });
      }
    } catch (err: any) {
      toast.error(isFr ? "Erreur" : "Error", { description: err?.message });
    }
    setExtractingTokens(false);
  }, [serverPost, isFr]);

  const analyzeCampaignVisual = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Format non supporté" : "Unsupported format"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (max 20 MB)" : "Image too large (max 20 MB)"); return; }

    const preview = URL.createObjectURL(file);
    setBlueprintPreviewImage(preview);
    setBlueprintAnalyzing(true);
    setBlueprintResult(null);

    // Convert to data URI for comparison later
    const reader = new FileReader();
    reader.onload = () => setBlueprintOriginalDataUri(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const token = getAuthHeader();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("_token", token);

      const res = await fetch(`${API_BASE}/vault/analyze-visual`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
        signal: AbortSignal.timeout(120_000),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { success: false, error: `Invalid response: ${text.slice(0, 200)}` }; }
      if (data.success && data.blueprint) {
        setBlueprintResult(data.blueprint);
        if (data.blueprintId) setBlueprintId(data.blueprintId);
        toast.success(isFr ? "Blueprint extrait !" : "Blueprint extracted!", {
          description: data.blueprint.metadata?.project_name || file.name,
        });
      } else {
        toast.error(isFr ? "Analyse échouée" : "Analysis failed", { description: data.error || "" });
      }
    } catch (err: any) {
      toast.error(isFr ? "Erreur réseau" : "Network error", { description: err?.message });
    }
    setBlueprintAnalyzing(false);
  }, [isFr, getAuthHeader]);

  // ── Generate ──
  const runGeneration = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length < 1 || isRunning) return;
    setIsRunning(true);
    setResults([]);

    const modelSteps = selectedModels.map(id => ({ label: catalog.find(m => m.id === id)?.label || id, status: "pending" as StepStatus }));
    setSteps(modelSteps);

    const rawResults: { modelId: string; timeMs: number; success: boolean; imageUrl?: string; videoUrl?: string; text?: string; error?: string }[] = [];

    // If product photo attached (image mode only), use Photoroom for each model slot
    const hasProductRef = mode === "image" && attachedImage?.signedUrl;

    if (mode === "image") {
      const BATCH = 3;
      for (let b = 0; b < selectedModels.length; b += BATCH) {
        const batch = selectedModels.slice(b, b + BATCH);
        const batchRes = await Promise.all(batch.map(async (modelId) => {
          const idx = selectedModels.indexOf(modelId);
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
          const t0 = Date.now();
          try {
            let url = "";
            if (hasProductRef) {
              // Product mode → Photoroom with the model's style direction
              const r = await serverPost("/generate/image-start", {
                prompt: prompt.slice(0, 500),
                model: "photon-1",
                aspectRatio: "1:1",
                imageRefUrl: attachedImage!.signedUrl,
                refSource: "upload",
              }, 60_000);
              url = r.success && (r.imageUrl || r.results?.[0]?.result?.imageUrl) ? (r.imageUrl || r.results[0].result.imageUrl) : "";
            } else {
              const res = await serverGet(`/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${modelId}&aspectRatio=1:1`);
              url = res.success && res.results?.[0]?.result?.imageUrl ? res.results[0].result.imageUrl : "";
            }
            const timeMs = Date.now() - t0;
            setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: url ? "done" : "error", timeMs } : s));
            return { modelId, timeMs, success: !!url, imageUrl: url || undefined };
          } catch (err: any) {
            const timeMs = Date.now() - t0;
            setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
            return { modelId, timeMs, success: false, error: err?.message };
          }
        }));
        rawResults.push(...batchRes);
      }
    } else if (mode === "text") {
      const batchRes = await Promise.all(selectedModels.map(async (modelId, idx) => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          const res = await serverPost("/campaign/generate-texts", { brief: prompt, formats: "instagram-post", model: modelId, language: locale }, 60_000);
          const timeMs = Date.now() - t0;
          const copyMap = res.copyMap || {};
          const first = Object.values(copyMap)[0] as any;
          const text = first?.caption || first?.text || first?.copy || first?.body || "";
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: text ? "done" : "error", timeMs } : s));
          return { modelId, timeMs, success: !!text, text: text || undefined };
        } catch (err: any) {
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
          return { modelId, timeMs, success: false, error: err?.message };
        }
      }));
      rawResults.push(...batchRes);
    } else {
      // Video — sequential to avoid overload
      for (const modelId of selectedModels) {
        const idx = selectedModels.indexOf(modelId);
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          const startRes = await serverGet(`/generate/video-start?prompt=${encodeURIComponent(prompt)}&model=${modelId}&aspectRatio=16:9&duration=5`);
          if (!startRes.success || !startRes.generationId) throw new Error(startRes.error || "No generationId");
          const videoUrl = await pollVideo(startRes.generationId);
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: videoUrl ? "done" : "error", timeMs } : s));
          rawResults.push({ modelId, timeMs, success: !!videoUrl, videoUrl: videoUrl || undefined });
        } catch (err: any) {
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
          rawResults.push({ modelId, timeMs, success: false, error: err?.message });
        }
      }
    }

    // Compute scores
    const scoreMap = computeScores(rawResults, mode);
    const creativeResults: CreativeResult[] = rawResults.map(r => {
      const m = catalog.find(c => c.id === r.modelId);
      return {
        id: `${r.modelId}-${Date.now()}`,
        modelId: r.modelId,
        label: m?.label || r.modelId,
        type: mode,
        imageUrl: r.imageUrl,
        videoUrl: r.videoUrl,
        text: r.text,
        timeMs: r.timeMs,
        success: r.success,
        error: r.error,
        scores: scoreMap.get(r.modelId) || { ...EMPTY_SCORES },
      };
    });

    setResults(creativeResults);
    setIsRunning(false);
  }, [prompt, selectedModels, mode, isRunning, catalog, locale, serverGet, serverPost, pollVideo, attachedImage]);

  const bestResult = results.filter(r => r.success).sort((a, b) => b.scores.overall - a.scores.overall)[0];

  const totalCredits = selectedModels.reduce((s, id) => s + (catalog.find(c => c.id === id)?.credits || 0), 0);

  // Bottom bar height (for scroll padding)
  const BOTTOM_BAR_H = attachedImage ? 180 : 140;

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>

        {/* ═══ HEADER — minimal, just branding + score toggle ═══ */}
        <div className="flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "#FFFFFF" }}>
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                  <Sparkles size={16} style={{ color: "#fff" }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>ORA Compare</h1>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {isFr ? "Créez librement · Comparez les IA · Sauvegardez" : "Create freely · Compare AI · Save favorites"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Blueprint Analyzer button */}
                <button onClick={() => setShowBlueprintPanel(!showBlueprintPanel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: showBlueprintPanel ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "var(--secondary)",
                    color: showBlueprintPanel ? "#fff" : "var(--foreground)",
                    fontSize: 11, fontWeight: 600, border: showBlueprintPanel ? "none" : "1px solid var(--border)",
                  }}>
                  <ScanLine size={12} /> {isFr ? "Analyser un visuel" : "Analyze visual"}
                </button>

                {/* Score toggle (only when results exist) */}
                {results.length > 0 && (
                  <button onClick={() => setShowScores(!showScores)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: showScores ? "var(--foreground)" : "var(--secondary)", color: showScores ? "var(--background)" : "var(--foreground)", fontSize: 11, fontWeight: 600, border: "1px solid var(--border)" }}>
                    <BarChart3 size={12} /> Scores
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ BLUEPRINT ANALYZER PANEL ═══ */}
        <AnimatePresence>
          {showBlueprintPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 overflow-hidden"
              style={{ borderBottom: "1px solid var(--border)", background: "#FAFAFA" }}
            >
              <div className="max-w-7xl mx-auto px-6 py-5">
                {!blueprintResult ? (
                  /* ── Upload zone ── */
                  <div className="flex items-start gap-6">
                    <input ref={blueprintFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) analyzeCampaignVisual(f); e.target.value = ""; }} />

                    {/* Drop zone / preview */}
                    <div
                      className="relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all hover:border-[#7C3AED]"
                      style={{
                        width: 200, height: 200,
                        background: blueprintPreviewImage ? "transparent" : "var(--secondary)",
                        border: `2px dashed ${blueprintPreviewImage ? "#7C3AED" : "var(--border)"}`,
                        overflow: "hidden",
                      }}
                      onClick={() => !blueprintAnalyzing && blueprintFileRef.current?.click()}
                    >
                      {blueprintPreviewImage ? (
                        <>
                          <img src={blueprintPreviewImage} className="w-full h-full object-cover" alt="campaign" />
                          {blueprintAnalyzing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                              <Loader2 size={28} className="animate-spin" style={{ color: "#fff" }} />
                              <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, marginTop: 8 }}>
                                {isFr ? "Analyse en cours..." : "Analyzing..."}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: "var(--muted-foreground)", marginBottom: 8 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                            {isFr ? "Uploader un visuel" : "Upload a visual"}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}>
                            {isFr ? "Campagne, affiche, post..." : "Campaign, poster, post..."}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="flex-1">
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                        {isFr ? "Visual Blueprint Analyzer" : "Visual Blueprint Analyzer"}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, maxWidth: 500 }}>
                        {isFr
                          ? "Uploadez un visuel de campagne existant. L'IA va le décomposer en layers : textes exacts, logos, couleurs, sujets, composition... Le blueprint JSON résultant peut servir à décliner la campagne sur d'autres formats."
                          : "Upload an existing campaign visual. AI will decompose it into layers: exact texts, logos, colors, subjects, composition... The resulting JSON blueprint can be used to declinate the campaign across formats."}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {[
                          { icon: Layers, label: isFr ? "Layers & composition" : "Layers & composition" },
                          { icon: TypeIcon, label: isFr ? "Textes verbatim" : "Verbatim texts" },
                          { icon: PaintBucket, label: isFr ? "Couleurs hex" : "Hex colors" },
                          { icon: User2, label: isFr ? "Sujets & vêtements" : "Subjects & clothing" },
                          { icon: LayoutGrid, label: isFr ? "Positions & tailles" : "Positions & sizes" },
                        ].map(tag => (
                          <span key={tag.label} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{ background: "var(--secondary)", fontSize: 10, fontWeight: 500, color: "var(--muted-foreground)" }}>
                            <tag.icon size={10} /> {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Blueprint Result ── */
                  <div className="flex gap-6">
                    {/* Left: Source image + metadata */}
                    <div className="flex-shrink-0" style={{ width: 220 }}>
                      {blueprintPreviewImage && (
                        <img src={blueprintPreviewImage} className="w-full rounded-xl mb-3" style={{ border: "1px solid var(--border)" }} alt="source" />
                      )}
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        {blueprintResult.metadata?.project_name || "Campaign Blueprint"}
                      </h3>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
                        {blueprintResult.metadata?.style}
                      </p>

                      {/* Colors */}
                      {blueprintResult.metadata?.branding_colors && (
                        <div className="mb-3">
                          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                            {isFr ? "Couleurs" : "Colors"}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {Object.entries(blueprintResult.metadata.branding_colors).map(([name, hex]) => (
                              <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                                style={{ background: "var(--secondary)", fontSize: 9 }}>
                                <div className="w-3 h-3 rounded-sm" style={{ background: hex as string, border: "1px solid var(--border)" }} />
                                <span style={{ fontWeight: 600 }}>{hex as string}</span>
                                <span style={{ color: "var(--muted-foreground)" }}>{name.replace(/_/g, " ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mood + Composition */}
                      {(blueprintResult.metadata?.mood || blueprintResult.metadata?.composition_style) && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {blueprintResult.metadata.mood && (
                            <span className="px-2 py-0.5 rounded-lg" style={{ fontSize: 9, fontWeight: 600, background: "#7C3AED15", color: "#7C3AED" }}>
                              {blueprintResult.metadata.mood}
                            </span>
                          )}
                          {blueprintResult.metadata.composition_style && (
                            <span className="px-2 py-0.5 rounded-lg" style={{ fontSize: 9, fontWeight: 600, background: "#EC489915", color: "#EC4899" }}>
                              {blueprintResult.metadata.composition_style}
                            </span>
                          )}
                          {blueprintResult.metadata.aspect_ratio && (
                            <span className="px-2 py-0.5 rounded-lg" style={{ fontSize: 9, fontWeight: 600, background: "var(--secondary)", color: "var(--foreground)" }}>
                              {blueprintResult.metadata.aspect_ratio}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(blueprintResult, null, 2));
                          toast.success(isFr ? "JSON copié !" : "JSON copied!");
                        }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                          style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 11, fontWeight: 600 }}>
                          <Copy size={10} /> JSON
                        </button>
                        <button onClick={() => {
                          if (blueprintResult.generation_prompt) {
                            setPrompt(blueprintResult.generation_prompt);
                            setShowBlueprintPanel(false);
                            if (mode !== "image") setMode("image");
                            toast.success(isFr ? "Prompt injecté dans le brief !" : "Prompt injected into brief!");
                          }
                        }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                          style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 11, fontWeight: 600 }}>
                          <ArrowRight size={10} /> {isFr ? "Générer" : "Generate"}
                        </button>
                        {blueprintId && (
                          <button onClick={() => extractTokensFromBlueprint(blueprintId)}
                            disabled={extractingTokens}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                            {extractingTokens ? <Loader2 size={10} className="animate-spin" /> : <Layers size={10} />}
                            {isFr ? "Compositor" : "Compositor"}
                          </button>
                        )}
                        <button onClick={() => { setBlueprintResult(null); setBlueprintPreviewImage(null); setBlueprintId(null); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}>
                          <X size={10} /> {isFr ? "Nouveau" : "New"}
                        </button>
                      </div>
                    </div>

                    {/* Right: Blueprint details */}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 400 }}>
                      {/* Text elements */}
                      {blueprintResult.elements?.text_elements?.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <TypeIcon size={12} style={{ color: "#7C3AED" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isFr ? "Textes extraits" : "Extracted texts"} ({blueprintResult.elements.text_elements.length})
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {blueprintResult.elements.text_elements.map((te: any) => (
                              <div key={te.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: te.color || "#000", border: "1px solid var(--border)" }} />
                                <span style={{ fontSize: 12, fontWeight: te.font_weight === "bold" || te.font_weight === "black" ? 700 : 400 }}>
                                  {te.text}
                                </span>
                                <span className="ml-auto" style={{ fontSize: 9, color: "var(--muted-foreground)", flexShrink: 0 }}>
                                  {te.font_style} · {te.size_relative?.toFixed(1)}x
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subjects */}
                      {blueprintResult.subjects?.main_subject && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <User2 size={12} style={{ color: "#EC4899" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isFr ? "Sujet principal" : "Main subject"}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                              {blueprintResult.subjects.main_subject.type === "person" ? "👤" : "📦"} {blueprintResult.subjects.main_subject.description || blueprintResult.subjects.main_subject.type}
                            </div>
                            {blueprintResult.subjects.main_subject.attributes && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {Object.entries(blueprintResult.subjects.main_subject.attributes).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, background: "var(--secondary)", color: "var(--foreground)" }}>
                                    {k}: {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {blueprintResult.subjects.main_subject.clothing && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(blueprintResult.subjects.main_subject.clothing).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, background: "#EC489910", color: "#EC4899" }}>
                                    {k}: {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Logos */}
                      {blueprintResult.elements?.logos_elements?.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Shield size={12} style={{ color: "#22c55e" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Logos ({blueprintResult.elements.logos_elements.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {blueprintResult.elements.logos_elements.map((logo: any) => (
                              <div key={logo.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                style={{ background: "#FFFFFF", border: "1px solid var(--border)", fontSize: 12 }}>
                                <Shield size={12} style={{ color: "#22c55e" }} />
                                <span style={{ fontWeight: 600 }}>{logo.brand_name || logo.id}</span>
                                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{logo.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Graphics elements */}
                      {blueprintResult.elements?.graphics_elements?.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Layers size={12} style={{ color: "#f59e0b" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isFr ? "Éléments graphiques" : "Graphic elements"} ({blueprintResult.elements.graphics_elements.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {blueprintResult.elements.graphics_elements.map((ge: any) => (
                              <span key={ge.id} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                style={{ background: "#FFFFFF", border: "1px solid var(--border)", fontSize: 10 }}>
                                {ge.color && <div className="w-2.5 h-2.5 rounded-sm" style={{ background: ge.color }} />}
                                {ge.description || ge.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generation prompt */}
                      {blueprintResult.generation_prompt && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={12} style={{ color: "#7C3AED" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isFr ? "Prompt de régénération" : "Regeneration prompt"}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid var(--border)", fontSize: 11, lineHeight: 1.6, color: "var(--muted-foreground)", maxHeight: 100, overflowY: "auto" }}>
                            {blueprintResult.generation_prompt}
                          </div>
                        </div>
                      )}

                      {/* Layer order */}
                      {blueprintResult.layout?.layers?.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Layers size={12} style={{ color: "var(--muted-foreground)" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isFr ? "Ordre des layers" : "Layer order"} ({blueprintResult.layout.layers.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {blueprintResult.layout.layers.map((layer: any, i: number) => (
                              <span key={layer.id || i} className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 600, background: "var(--secondary)" }}>
                                  {i + 1}. {layer.id || layer.type}
                                </span>
                                {i < blueprintResult.layout.layers.length - 1 && <ArrowRight size={8} style={{ color: "var(--muted-foreground)" }} />}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ SCROLLABLE RESULTS AREA ═══ */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: BOTTOM_BAR_H + 24 }}>
          <div className="max-w-7xl mx-auto px-6 py-6">

            {/* ── EMPTY STATE ── */}
            {results.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #7C3AED15, #EC489915)" }}>
                  <Sparkles size={28} style={{ color: "#7C3AED" }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {isFr ? "Votre atelier créatif" : "Your creative workshop"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 420, lineHeight: 1.6 }}>
                  {isFr
                    ? "Décrivez votre idée ci-dessous, choisissez vos modèles IA, et comparez les résultats. Vous pouvez dicter votre brief ou joindre une photo produit."
                    : "Describe your idea below, pick your AI models, and compare results. You can dictate your brief or attach a product photo."}
                </p>
              </div>
            )}

            {/* ── PROGRESS ── */}
            <AnimatePresence>
              {isRunning && steps.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap"
                  style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {s.status === "done" ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                        : s.status === "running" ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                          : s.status === "error" ? <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                            : <Circle size={14} style={{ color: "var(--border)" }} />}
                      <span style={{ fontSize: 12, fontWeight: s.status === "running" ? 600 : 400, color: s.status === "pending" ? "var(--muted-foreground)" : "var(--foreground)" }}>
                        {s.label}
                      </span>
                      {s.timeMs && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{(s.timeMs / 1000).toFixed(1)}s</span>}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── RESULTS GRID ── */}
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                {/* Results header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {results.filter(r => r.success).length} {isFr ? "créations" : "creations"}
                    </span>
                    {bestResult && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: "#22c55e15", fontSize: 11, fontWeight: 600, color: "#22c55e" }}>
                        <Trophy size={11} /> {isFr ? "Meilleur :" : "Best:"} {bestResult.label} ({bestResult.scores.overall}/100)
                      </span>
                    )}
                  </div>
                </div>

                {/* ── IMAGE GRID ── */}
                {mode === "image" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : results.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { label: grade, color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      const mInfo = catalog.find(c => c.id === r.modelId);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="rounded-2xl overflow-hidden group relative cursor-pointer"
                          style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}
                          onClick={() => r.success && setLightbox(r)}>

                          {r.success && r.imageUrl ? (
                            <div className="relative" style={{ aspectRatio: "1" }}>
                              <img src={r.imageUrl} className="w-full h-full object-cover" alt={r.label} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.95)" }}
                                    onClick={e => { e.stopPropagation(); setLightbox(r); }}>
                                    <Maximize2 size={16} />
                                  </button>
                                  <a href={r.imageUrl} download target="_blank" rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(255,255,255,0.95)" }}>
                                    <Download size={16} />
                                  </a>
                                  {compositorTokens && (
                                    <button className="w-10 h-10 rounded-full flex items-center justify-center"
                                      style={{ background: "rgba(255,255,255,0.95)" }}
                                      title={isFr ? "Envoyer au Compositor" : "Send to Compositor"}
                                      onClick={e => { e.stopPropagation(); setCompositorBaseImage(r.imageUrl || null); setShowCompositor(true); }}>
                                      <Layers size={16} style={{ color: "#7C3AED" }} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {isBest && (
                                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg"
                                  style={{ background: gradeColor, color: "#fff", fontSize: 10, fontWeight: 700 }}>
                                  <Trophy size={10} /> {isFr ? "Recommandé" : "Best"}
                                </div>
                              )}
                              {showScores && (
                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
                                  <span style={{ fontSize: 16, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>/100</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center" style={{ aspectRatio: "1", background: "var(--secondary)" }}>
                              <div className="text-center">
                                <AlertTriangle size={24} style={{ color: "#ef4444", margin: "0 auto 8px" }} />
                                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{r.error || "Failed"}</span>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                                {mInfo && (
                                  <span style={{
                                    fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                                    background: mInfo.tier === "premium" ? "#7C3AED15" : mInfo.tier === "economy" ? "#22c55e15" : "var(--secondary)",
                                    color: mInfo.tier === "premium" ? "#7C3AED" : mInfo.tier === "economy" ? "#22c55e" : "var(--muted-foreground)",
                                  }}>{mInfo.tier}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {r.success && (
                                  <button onClick={e => { e.stopPropagation(); setResults(prev => prev.map(x => x.id === r.id ? { ...x, saved: !x.saved } : x)); toast.success(r.saved ? (isFr ? "Retiré des favoris" : "Removed") : (isFr ? "Sauvegardé !" : "Saved!")); }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                                    style={{ background: r.saved ? "#ef444415" : "var(--secondary)" }}>
                                    <Heart size={13} fill={r.saved ? "#ef4444" : "none"} style={{ color: r.saved ? "#ef4444" : "var(--muted-foreground)" }} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {showScores && r.success && (
                              <div className="mt-2">
                                <TrustBadge score={r.scores.trust.overall} isFr={isFr} size="sm" />
                              </div>
                            )}
                            {mInfo && r.success && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mInfo.strengths.slice(0, 3).map(s => (
                                  <span key={s} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "var(--secondary)", color: "var(--muted-foreground)", fontWeight: 500 }}>{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ── TEXT RESULTS ── */}
                {mode === "text" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : "repeat(2, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                              {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: gradeColor, color: "#fff" }}>{isFr ? "MEILLEUR" : "BEST"}</span>}
                            </div>
                            {showScores && <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>}
                          </div>
                          <div className="px-4 py-3" style={{ fontSize: 13, lineHeight: 1.7, maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                            {r.success ? r.text : <span style={{ color: "#ef4444" }}>{r.error || "Failed"}</span>}
                          </div>
                          {r.success && (
                            <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                              <button onClick={() => { navigator.clipboard.writeText(r.text || ""); toast.success(isFr ? "Copié !" : "Copied!"); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                style={{ background: "var(--secondary)", fontSize: 11, fontWeight: 500 }}>
                                <FileText size={10} /> {isFr ? "Copier" : "Copy"}
                              </button>
                              <button onClick={() => setResults(prev => prev.map(x => x.id === r.id ? { ...x, saved: !x.saved } : x))}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                style={{ background: r.saved ? "#ef444415" : "var(--secondary)", fontSize: 11, fontWeight: 500 }}>
                                <Heart size={10} fill={r.saved ? "#ef4444" : "none"} style={{ color: r.saved ? "#ef4444" : "var(--muted-foreground)" }} /> {r.saved ? (isFr ? "Favori" : "Saved") : (isFr ? "Sauvegarder" : "Save")}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ── VIDEO RESULTS ── */}
                {mode === "video" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : "repeat(2, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}>
                          {r.success && r.videoUrl ? (
                            <video src={r.videoUrl} controls className="w-full" style={{ aspectRatio: "16/9" }} />
                          ) : (
                            <div className="flex items-center justify-center" style={{ aspectRatio: "16/9", background: "var(--secondary)" }}>
                              <AlertTriangle size={24} style={{ color: "#ef4444" }} />
                            </div>
                          )}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                              {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: gradeColor, color: "#fff" }}>BEST</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {showScores && <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>}
                              {r.success && (
                                <a href={r.videoUrl} download target="_blank" rel="noreferrer"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: "var(--secondary)" }}>
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            <div ref={resultsEndRef} />
          </div>
        </div>

        {/* ═══ BOTTOM INPUT BAR — fixed at bottom ═══ */}
        <div className="flex-shrink-0 fixed bottom-0 right-0 z-40" style={{ left: 52 }}>
          <div className="max-w-7xl mx-auto px-6 pb-5 pt-3">
            <div className="rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid var(--border)", boxShadow: "0 -4px 24px rgba(0,0,0,0.06)" }}>

              {/* Attached product photo preview */}
              <AnimatePresence>
                {attachedImage && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-3">
                    <div className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      <img src={attachedImage.preview} className="w-10 h-10 rounded-lg object-cover" alt="product" />
                      <div className="flex flex-col">
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
                          {isFr ? "Photo produit" : "Product photo"}
                        </span>
                        {attachedImage.uploading ? (
                          <span className="flex items-center gap-1" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                            <Loader2 size={9} className="animate-spin" /> {isFr ? "Upload..." : "Uploading..."}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 500 }}>{isFr ? "Prêt" : "Ready"}</span>
                        )}
                      </div>
                      <button onClick={removeAttachedImage} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--secondary)" }}>
                        <X size={10} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode tabs + Model pills — all in one row */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {/* Mode tabs — inline in bottom bar */}
                <div className="flex gap-0.5 p-0.5 rounded-lg flex-shrink-0" style={{ background: "var(--secondary)" }}>
                  {([
                    { id: "image" as CreativeMode, icon: ImageIcon, label: "Image" },
                    { id: "text" as CreativeMode, icon: Type, label: isFr ? "Texte" : "Text" },
                    { id: "video" as CreativeMode, icon: Video, label: "Vidéo" },
                  ] as const).map(tab => (
                    <button key={tab.id} onClick={() => setMode(tab.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                      style={{
                        background: mode === tab.id ? "#FFFFFF" : "transparent",
                        color: mode === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                        fontWeight: mode === tab.id ? 600 : 400, fontSize: 11,
                        boxShadow: mode === tab.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}>
                      <tab.icon size={11} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Separator */}
                <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--border)" }} />
                <button onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex-shrink-0"
                  style={{ background: showModelPicker ? "var(--foreground)" : "var(--secondary)", color: showModelPicker ? "var(--background)" : "var(--muted-foreground)", fontSize: 11, fontWeight: 600, border: "1px solid var(--border)" }}>
                  <Zap size={10} />
                  {selectedModels.length > 0 ? `${selectedModels.length} ${isFr ? "modèle(s)" : "model(s)"}` : (isFr ? "Modèles" : "Models")}
                  <ChevronDown size={10} style={{ transform: showModelPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {selectedModels.map(id => {
                  const m = catalog.find(c => c.id === id);
                  return m ? (
                    <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 10, fontWeight: 600 }}>
                      {m.label}
                      <button onClick={() => toggleModel(id)} className="cursor-pointer opacity-60 hover:opacity-100"><X size={8} /></button>
                    </span>
                  ) : null;
                })}
                {selectedModels.length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>{totalCredits} cr</span>
                )}
              </div>

              {/* Model picker dropdown */}
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2 overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {catalog.map(m => {
                        const on = selectedModels.includes(m.id);
                        const dis = !on && selectedModels.length >= maxModels;
                        const tierC = m.tier === "premium" ? "#7C3AED" : m.tier === "economy" ? "#22c55e" : "var(--muted-foreground)";
                        return (
                          <button key={m.id} onClick={() => !dis && toggleModel(m.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer transition-all"
                            style={{
                              fontSize: 10, fontWeight: on ? 700 : 500,
                              background: on ? "var(--foreground)" : "var(--secondary)",
                              color: on ? "var(--background)" : "var(--foreground)",
                              border: `1px solid ${on ? "var(--foreground)" : "var(--border)"}`,
                              opacity: dis ? 0.3 : 1, cursor: dis ? "not-allowed" : "pointer",
                            }}>
                            {on && <CheckCircle2 size={9} />}
                            {m.label}
                            <span style={{ fontSize: 7, color: on ? "var(--background)" : tierC, opacity: on ? 0.7 : 1, fontWeight: 700 }}>{m.credits}cr</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="px-4 pb-3 flex items-end gap-2">
                {/* Attach button (image mode only) */}
                {mode === "image" && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachImage(f); e.target.value = ""; }} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                      style={{ background: attachedImage ? "var(--accent-warm-light)" : "var(--secondary)", color: attachedImage ? "var(--accent)" : "var(--muted-foreground)", border: "1px solid var(--border)" }}
                      title={isFr ? "Joindre une photo produit" : "Attach product photo"}>
                      <Paperclip size={14} />
                    </button>
                  </>
                )}

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGeneration(); } }}
                    placeholder={mode === "image"
                      ? (isFr ? "Décrivez votre visuel... (ou dictez avec le micro)" : "Describe your visual... (or dictate)")
                      : mode === "text"
                        ? (isFr ? "Décrivez votre contenu..." : "Describe your content...")
                        : (isFr ? "Décrivez votre vidéo..." : "Describe your video...")}
                    className="w-full resize-none outline-none"
                    rows={2}
                    style={{ fontSize: 14, color: "var(--foreground)", background: "transparent", lineHeight: 1.5 }}
                  />
                </div>

                {/* Voice button */}
                {isTranscribing ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1.5">
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--foreground)" }} />
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>{isFr ? "Transcription..." : "Transcribing..."}</span>
                  </div>
                ) : isRecording ? (
                  <button onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all flex-shrink-0"
                    style={{ background: "rgba(212, 24, 61, 0.1)" }}>
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Square size={11} style={{ color: "#d4183d", fill: "#d4183d" }} />
                    </motion.div>
                    <span style={{ fontSize: 11, color: "#d4183d", fontWeight: 600 }}>
                      {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                    </span>
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={isRunning}
                    className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 disabled:opacity-30"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                    title={isFr ? "Dicter votre brief" : "Dictate your brief"}>
                    <Mic size={14} />
                  </button>
                )}

                {/* Send button */}
                <button onClick={runGeneration}
                  disabled={!prompt.trim() || selectedModels.length < 1 || isRunning}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: (prompt.trim() && selectedModels.length > 0) ? "var(--foreground)" : "var(--secondary)",
                    color: (prompt.trim() && selectedModels.length > 0) ? "var(--background)" : "var(--muted-foreground)",
                  }}>
                  {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIGHTBOX — Full-screen image with KPI panel ═══ */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightbox(null)}
          >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
              {lightbox.imageUrl && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={lightbox.imageUrl}
                  className="max-w-full max-h-full object-contain rounded-2xl"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
                  alt={lightbox.label}
                />
              )}
              {lightbox.videoUrl && (
                <video src={lightbox.videoUrl} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
              )}
            </div>

            {/* KPI Panel */}
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-96 flex-shrink-0 overflow-y-auto"
              style={{ background: "#FFFFFF", borderLeft: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{lightbox.label}</span>
                <button onClick={() => setLightbox(null)} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-6">
                <div className="flex justify-center">
                  <ScoreGauge score={lightbox.scores.overall} size={120} isFr={isFr} />
                </div>

                {/* Trust Score (Yuka-style) */}
                <div className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <TrustBadge score={lightbox.scores.trust.overall} isFr={isFr} />
                  <div className="space-y-1 mt-3">
                    <CategoryBar label={isFr ? "Temps d'attente" : "Wait time"} value={lightbox.scores.trust.waitTime} />
                    <CategoryBar label={isFr ? "Réalisme" : "Realism"} value={lightbox.scores.trust.realism} />
                    <CategoryBar label={isFr ? "Propreté" : "Cleanliness"} value={lightbox.scores.trust.cleanliness} />
                  </div>
                </div>

                {/* 6-category KPI breakdown */}
                <div className="space-y-4">
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                    {isFr ? "Grille de validation" : "Validation grid"}
                  </span>
                  {lightbox.scores.categories.map(cat => {
                    const meta = getCategoryMeta(cat.id, isFr);
                    const { color } = getGradeLabel(cat.overall, isFr);
                    return (
                      <div key={cat.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
                            <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{meta.criterion}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color }}>{cat.overall}</span>
                        </div>
                        <div className="space-y-0.5 pl-1">
                          {cat.kpis.map(k => (
                            <CategoryBar key={k.key} label={getKpiLabel(k.key, isFr)} value={k.value} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const mInfo = catalog.find(c => c.id === lightbox.modelId);
                  if (!mInfo) return null;
                  return (
                    <div className="space-y-3">
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                          {isFr ? "À propos de ce modèle" : "About this model"}
                        </span>
                        <div style={{ fontSize: 12, color: "var(--foreground)", marginTop: 4, lineHeight: 1.5 }}>
                          {mInfo.bestFor}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mInfo.strengths.map(s => (
                          <span key={s} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--secondary)", color: "var(--foreground)", fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        <span>{mInfo.credits} {isFr ? "crédits" : "credits"}</span>
                        <span>·</span>
                        <span>{(lightbox.timeMs / 1000).toFixed(1)}s</span>
                        <span>·</span>
                        <span style={{
                          padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                          background: mInfo.tier === "premium" ? "#7C3AED15" : mInfo.tier === "economy" ? "#22c55e15" : "var(--secondary)",
                          color: mInfo.tier === "premium" ? "#7C3AED" : mInfo.tier === "economy" ? "#22c55e" : "var(--muted-foreground)",
                        }}>{mInfo.tier}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  {lightbox.imageUrl && (
                    <a href={lightbox.imageUrl} download target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 13, fontWeight: 600 }}>
                      <Download size={14} /> {isFr ? "Télécharger" : "Download"}
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setResults(prev => prev.map(x => x.id === lightbox.id ? { ...x, saved: !x.saved } : x));
                      setLightbox(prev => prev ? { ...prev, saved: !prev.saved } : null);
                      toast.success(lightbox.saved ? (isFr ? "Retiré des favoris" : "Removed") : (isFr ? "Sauvegardé !" : "Saved!"));
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all cursor-pointer"
                    style={{ background: lightbox.saved ? "#ef444415" : "var(--secondary)", color: lightbox.saved ? "#ef4444" : "var(--foreground)", fontSize: 13, fontWeight: 600, border: "1px solid var(--border)" }}>
                    <Heart size={14} fill={lightbox.saved ? "#ef4444" : "none"} /> {lightbox.saved ? (isFr ? "Favori" : "Saved") : (isFr ? "Sauvegarder" : "Save to Library")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ COMPOSITOR MODAL ═══ */}
      <AnimatePresence>
        {showCompositor && compositorTokens && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[90vw] max-w-[1200px] rounded-2xl overflow-hidden"
              style={{ background: "#FFFFFF", maxHeight: "90vh", height: 700 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                    <Layers size={14} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700 }}>Campaign Compositor</h2>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      {compositorTokens.brand?.name || "Campaign"} — {isFr ? "Textes, logos, éléments graphiques sur image IA" : "Text, logos, graphics over AI image"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCompositor(false)} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6" style={{ height: "calc(100% - 52px)", overflow: "hidden" }}>
                <CampaignCompositor
                  tokens={compositorTokens}
                  blueprintId={blueprintId || ""}
                  originalImageDataUri={blueprintOriginalDataUri || undefined}
                  baseImageUrl={compositorBaseImage || undefined}
                  serverPost={serverPost}
                  onClose={() => setShowCompositor(false)}
                  onExport={(dataUrl) => {
                    toast.success(isFr ? "Asset exporté !" : "Asset exported!");
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RouteGuard>
  );
}
