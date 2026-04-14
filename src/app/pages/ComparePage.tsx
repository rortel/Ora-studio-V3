import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Clock, DollarSign, FileText, Image as ImageIcon, Video,
  Play, CheckCircle2, Circle, Loader2, Trophy, AlertTriangle,
  ChevronDown, ChevronRight, X, BarChart3, ArrowRight, Download,
  Type, Hash, MessageSquare, Sparkles, Shield, Eye, Save, Heart,
  Maximize2, Minimize2, Mic, Square, Paperclip, Send, Music, Share2, Pencil, Plus,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";
import { PublishModal, type PublishableAsset } from "../components/PublishModal";
import { useDraftsFolder } from "../lib/editor/useDraftsFolder";

/* ═══════════════════════════════════════════════════════════
   CREATIVE LAB — Free creation playground with Yuka scoring
   Generate · Compare · Save · Download
   Layout: results scroll up, input bar fixed at bottom
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA77OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Types ──
type ModelTier = "economy" | "standard" | "premium";
type CreativeMode = "text" | "image" | "video" | "music";
type StepStatus = "pending" | "running" | "done" | "error";

// Segment id per mode — drives grouping + segment pickers
type TextSegment = "strategy" | "creative" | "multilingual" | "volume";
type ImageSegment = "product" | "creative" | "text" | "portrait" | "draft";
type VideoSegment = "cinematic" | "audio" | "character" | "draft" | "versatile";
type MusicSegment = "vocals" | "studio";
type AnySegment = TextSegment | ImageSegment | VideoSegment | MusicSegment;

interface ModelDef {
  id: string; label: string; badge: string; credits: number;
  costEur: number; providerCostEur: number;
  strengths: string[]; bestFor: string; tier: ModelTier;
  segment: AnySegment;
}

// ── Model catalogs ──
const TEXT_MODELS: ModelDef[] = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast", credits: 2, costEur: 0.20, providerCostEur: 0.008, strengths: ["speed", "multilingual"], bestFor: "Contenu rapide multilingue", tier: "standard", segment: "volume" },
  { id: "gpt-5", label: "GPT-5", badge: "Smart", credits: 3, costEur: 0.30, providerCostEur: 0.015, strengths: ["reasoning", "nuance"], bestFor: "Briefs complexes", tier: "premium", segment: "strategy" },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative", credits: 2, costEur: 0.20, providerCostEur: 0.012, strengths: ["creativity", "storytelling"], bestFor: "Storytelling créatif", tier: "standard", segment: "creative" },
  { id: "claude-opus", label: "Claude Opus", badge: "Best", credits: 5, costEur: 0.50, providerCostEur: 0.060, strengths: ["depth", "strategy"], bestFor: "Contenu stratégique", tier: "premium", segment: "strategy" },
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Google", credits: 2, costEur: 0.20, providerCostEur: 0.010, strengths: ["multimodal", "factual"], bestFor: "Contenu data-driven", tier: "standard", segment: "multilingual" },
  { id: "deepseek", label: "DeepSeek v3", badge: "Open", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["affordable", "technical"], bestFor: "Budget-friendly", tier: "economy", segment: "volume" },
  { id: "together-llama-3.3-70b", label: "Llama 3.3 70B", badge: "Open", credits: 1, costEur: 0.10, providerCostEur: 0.0008, strengths: ["multilingual", "speed"], bestFor: "Multilingue économique", tier: "economy", segment: "multilingual" },
  { id: "together-deepseek-v3", label: "DeepSeek V3 (Together)", badge: "Reasoning", credits: 1, costEur: 0.10, providerCostEur: 0.0011, strengths: ["reasoning", "affordable"], bestFor: "Raisonnement low-cost", tier: "economy", segment: "volume" },
  { id: "together-deepseek-r1", label: "DeepSeek R1", badge: "Deep Think", credits: 3, costEur: 0.30, providerCostEur: 0.0065, strengths: ["reasoning", "depth"], bestFor: "Raisonnement avancé", tier: "premium", segment: "strategy" },
  { id: "together-qwen-2.5-72b", label: "Qwen 2.5 72B", badge: "FR Native", credits: 1, costEur: 0.10, providerCostEur: 0.0011, strengths: ["multilingual", "french"], bestFor: "Contenu français natif", tier: "economy", segment: "multilingual" },
  { id: "together-kimi-k2", label: "Kimi K2", badge: "Long Ctx", credits: 2, costEur: 0.20, providerCostEur: 0.0022, strengths: ["long-context", "analysis"], bestFor: "Long contexte", tier: "standard", segment: "volume" },
  { id: "together-glm-4.5", label: "GLM 4.5", badge: "Copy", credits: 2, costEur: 0.20, providerCostEur: 0.0018, strengths: ["creative", "copy"], bestFor: "Copywriting créatif", tier: "standard", segment: "creative" },
  { id: "together-gpt-oss-120b", label: "GPT-OSS 120B", badge: "Open", credits: 2, costEur: 0.20, providerCostEur: 0.0014, strengths: ["general", "open"], bestFor: "Généraliste open-source", tier: "standard", segment: "volume" },
];

const IMAGE_MODELS: ModelDef[] = [
  { id: "ideogram-3-leo", label: "Ideogram V3", badge: "Brand + Text", credits: 5, costEur: 0.50, providerCostEur: 0.074, strengths: ["text-rendering", "branding"], bestFor: "Logos, texte sur images", tier: "premium", segment: "text" },
  { id: "photon-1", label: "Luma Photon", badge: "Quality", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["realism", "lighting"], bestFor: "Portraits réalistes", tier: "standard", segment: "portrait" },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast", credits: 3, costEur: 0.30, providerCostEur: 0.014, strengths: ["speed", "iteration"], bestFor: "Itérations rapides", tier: "economy", segment: "draft" },
  { id: "gpt-image-leo", label: "GPT Image", badge: "GPT-4o", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["creative", "detail"], bestFor: "Prompts complexes", tier: "premium", segment: "text" },
  { id: "dall-e", label: "DALL-E 3", badge: "Precise", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["precision", "compositions"], bestFor: "Compositions précises", tier: "premium", segment: "creative" },
  { id: "flux-pro", label: "Flux Pro", badge: "Creative", credits: 8, costEur: 0.80, providerCostEur: 0.046, strengths: ["artistic", "detail"], bestFor: "Visuels artistiques", tier: "premium", segment: "creative" },
  { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.023, strengths: ["quality"], bestFor: "Campagnes premium", tier: "premium", segment: "product" },
  { id: "flux-schnell-leo", label: "Flux Schnell", badge: "Ultra Fast", credits: 3, costEur: 0.30, providerCostEur: 0.003, strengths: ["ultra-fast"], bestFor: "Brouillons rapides", tier: "economy", segment: "draft" },
  { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Edit", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["editing", "consistency"], bestFor: "Édition, cohérence", tier: "standard", segment: "product" },
  { id: "nano-banana-leo", label: "Nano Banana", badge: "Gemini Edit", credits: 5, costEur: 0.50, providerCostEur: 0.020, strengths: ["product-preserve", "editing"], bestFor: "Fidélité produit, édition", tier: "standard", segment: "product" },
  { id: "nano-banana-2-leo", label: "Nano Banana 2", badge: "Gemini Pro", credits: 5, costEur: 0.50, providerCostEur: 0.025, strengths: ["product-preserve", "high-detail"], bestFor: "Packshots premium", tier: "premium", segment: "product" },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["photo-realism"], bestFor: "Photo produit", tier: "standard", segment: "product" },
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["detail", "textures"], bestFor: "Environnements détaillés", tier: "standard", segment: "creative" },
  { id: "soul", label: "Soul", badge: "Artistic", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["artistic", "stylized"], bestFor: "Style artistique", tier: "standard", segment: "creative" },
  { id: "ora-vision", label: "ORA Vision", badge: "Agence", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["balanced", "agency"], bestFor: "Qualité agence", tier: "standard", segment: "product" },
  { id: "together-flux-schnell", label: "Flux Schnell (Together)", badge: "Cheapest", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["ultra-cheap", "fast"], bestFor: "Brouillons volume", tier: "economy", segment: "draft" },
  { id: "together-flux-dev", label: "Flux Dev (Together)", badge: "Balanced", credits: 3, costEur: 0.30, providerCostEur: 0.025, strengths: ["balanced", "quality"], bestFor: "Production équilibrée", tier: "standard", segment: "product" },
  { id: "together-flux-pro-1.1", label: "Flux 1.1 Pro (Together)", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.040, strengths: ["premium", "detail"], bestFor: "Qualité premium", tier: "premium", segment: "portrait" },
];

const VIDEO_MODELS: ModelDef[] = [
  // ── Cinematic premium ──
  { id: "veo-3.1", label: "Veo 3.1", badge: "Google", credits: 35, costEur: 3.50, providerCostEur: 0.50, strengths: ["google", "quality"], bestFor: "Qualité Google ultime", tier: "premium", segment: "cinematic" },
  { id: "veo-3", label: "Veo 3", badge: "Audio", credits: 35, costEur: 3.50, providerCostEur: 0.45, strengths: ["google", "audio", "quality"], bestFor: "Vidéo + son natif Google", tier: "premium", segment: "audio" },
  { id: "sora-2-pro", label: "Sora 2 Pro", badge: "OpenAI", credits: 40, costEur: 4.00, providerCostEur: 0.40, strengths: ["creative", "narrative", "premium"], bestFor: "Scènes complexes immersives", tier: "premium", segment: "cinematic" },
  { id: "sora-2", label: "Sora 2", badge: "OpenAI", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["creative", "narrative"], bestFor: "Narrations créatives", tier: "premium", segment: "character" },
  { id: "kling-2.5", label: "Kling 2.5 Turbo", badge: "Pro", credits: 35, costEur: 3.50, providerCostEur: 0.32, strengths: ["cinematic", "motion"], bestFor: "Image-to-video pro", tier: "premium", segment: "cinematic" },
  { id: "kling-2.6", label: "Kling 2.6", badge: "Audio", credits: 35, costEur: 3.50, providerCostEur: 0.35, strengths: ["cinematic", "audio"], bestFor: "Vidéo + son synchronisé", tier: "premium", segment: "audio" },
  { id: "kling-2.1-master", label: "Kling 2.1 Master", badge: "Master", credits: 40, costEur: 4.00, providerCostEur: 0.38, strengths: ["cinematic", "character", "realism"], bestFor: "Réalisme visuel extrême", tier: "premium", segment: "cinematic" },
  { id: "kling-o1", label: "Kling O1", badge: "Multi", credits: 35, costEur: 3.50, providerCostEur: 0.35, strengths: ["multimodal", "creative"], bestFor: "Entrée multi-modale avancée", tier: "premium", segment: "character" },
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["quality", "cinematic"], bestFor: "Cinématique fluide", tier: "premium", segment: "cinematic" },
  { id: "runway-gen4", label: "Runway Gen-4", badge: "Latest", credits: 35, costEur: 3.50, providerCostEur: 0.35, strengths: ["cinematic", "creative"], bestFor: "Animation cinématique pro", tier: "premium", segment: "cinematic" },
  { id: "vidu-q3-pro", label: "Vidu Q3 Pro", badge: "Audio", credits: 35, costEur: 3.50, providerCostEur: 0.30, strengths: ["audio", "cinematic"], bestFor: "Audio-vidéo + multi-plans", tier: "premium", segment: "audio" },
  // ── Personnages & narratif ──
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["cinematic", "character"], bestFor: "Scènes à personnages", tier: "standard", segment: "character" },
  { id: "hailuo-2.3", label: "Hailuo 2.3", badge: "Realistic", credits: 25, costEur: 2.50, providerCostEur: 0.22, strengths: ["realistic", "character"], bestFor: "Mouvements naturels", tier: "standard", segment: "character" },
  { id: "hailuo-02", label: "Hailuo 02", badge: "Precise", credits: 25, costEur: 2.50, providerCostEur: 0.22, strengths: ["realistic", "physics"], bestFor: "Physique réaliste 1080p", tier: "standard", segment: "character" },
  { id: "seedance-1.5-pro", label: "Seedance 1.5 Pro", badge: "Lip-sync", credits: 30, costEur: 3.00, providerCostEur: 0.25, strengths: ["lipsync", "audio"], bestFor: "Lip-sync & audio natif", tier: "standard", segment: "audio" },
  { id: "pollo-2.0", label: "Pollo 2.0", badge: "Audio", credits: 25, costEur: 2.50, providerCostEur: 0.18, strengths: ["audio", "character"], bestFor: "Audio intégré + personnages", tier: "standard", segment: "audio" },
  // ── Polyvalent campagne ──
  { id: "ora-motion", label: "ORA Motion", badge: "Agence", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["agency", "campaign"], bestFor: "Vidéo campagne", tier: "standard", segment: "versatile" },
  { id: "seedance-2.0", label: "Seedance 2.0", badge: "Fast", credits: 25, costEur: 2.50, providerCostEur: 0.20, strengths: ["versatile", "fast"], bestFor: "Contenu polyvalent rapide", tier: "standard", segment: "versatile" },
  { id: "pixverse-5.5", label: "PixVerse 5.5", badge: "Multi-shot", credits: 25, costEur: 2.50, providerCostEur: 0.20, strengths: ["multishot", "sfx"], bestFor: "Multi-plans + effets sonores", tier: "standard", segment: "versatile" },
  { id: "wan-2.6", label: "Wan 2.6", badge: "Multi-shot", credits: 25, costEur: 2.50, providerCostEur: 0.18, strengths: ["multishot", "versatile"], bestFor: "Séquences multi-plans", tier: "standard", segment: "versatile" },
  { id: "hunyuan", label: "Hunyuan", badge: "Tencent", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["versatile", "realistic"], bestFor: "Synthèse réaliste 13B", tier: "standard", segment: "versatile" },
  { id: "runway-gen3", label: "Runway Gen-3", badge: "Creative", credits: 25, costEur: 2.50, providerCostEur: 0.22, strengths: ["creative", "animation"], bestFor: "Animation stylisée", tier: "standard", segment: "versatile" },
  // ── Itération rapide / économique ──
  { id: "veo-3.1-fast", label: "Veo 3.1 Fast", badge: "Google⚡", credits: 20, costEur: 2.00, providerCostEur: 0.30, strengths: ["google", "speed"], bestFor: "Google rapide -30%", tier: "economy", segment: "draft" },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast", credits: 15, costEur: 1.50, providerCostEur: 0.14, strengths: ["speed"], bestFor: "Itération vidéo rapide", tier: "economy", segment: "draft" },
  { id: "hailuo-2.3-fast", label: "Hailuo 2.3 Fast", badge: "Fast", credits: 15, costEur: 1.50, providerCostEur: 0.12, strengths: ["speed", "realistic"], bestFor: "Réaliste rapide", tier: "economy", segment: "draft" },
  { id: "wan-2.2-flash", label: "Wan 2.2 Flash", badge: "Ultra-fast", credits: 10, costEur: 1.00, providerCostEur: 0.08, strengths: ["speed", "camera"], bestFor: "Ultra-rapide avec caméra", tier: "economy", segment: "draft" },
  { id: "wan-2.2", label: "Wan 2.2", badge: "Open", credits: 15, costEur: 1.50, providerCostEur: 0.12, strengths: ["versatile", "open"], bestFor: "Vidéo polyvalente", tier: "economy", segment: "draft" },
  { id: "vidu-q2-turbo", label: "Vidu Q2 Turbo", badge: "Fast", credits: 15, costEur: 1.50, providerCostEur: 0.10, strengths: ["speed", "motion"], bestFor: "Motion rapide short-form", tier: "economy", segment: "draft" },
  { id: "pika", label: "Pika 2.2", badge: "Fun", credits: 15, costEur: 1.50, providerCostEur: 0.10, strengths: ["fun", "quick"], bestFor: "Animations fun", tier: "economy", segment: "draft" },
  { id: "pollo-1.6", label: "Pollo 1.6", badge: "Budget", credits: 10, costEur: 1.00, providerCostEur: 0.06, strengths: ["speed", "budget"], bestFor: "Le moins cher", tier: "economy", segment: "draft" },
  { id: "pixverse-5", label: "PixVerse 5", badge: "Versatile", credits: 15, costEur: 1.50, providerCostEur: 0.12, strengths: ["versatile", "camera"], bestFor: "Caméra dynamique", tier: "economy", segment: "draft" },
  // ── Spécialité : animation ──
  { id: "hailuo-live2d", label: "Hailuo Live2D", badge: "Animation", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["animation", "illustration"], bestFor: "Anime illustrations & logos", tier: "standard", segment: "character" },
  { id: "veo-2", label: "Veo 2", badge: "Google", credits: 25, costEur: 2.50, providerCostEur: 0.35, strengths: ["realistic", "google"], bestFor: "Google réaliste", tier: "standard", segment: "versatile" },
  { id: "pika-2.1", label: "Pika 2.1", badge: "Creative", credits: 15, costEur: 1.50, providerCostEur: 0.08, strengths: ["creative", "fun"], bestFor: "Stylisé & créatif", tier: "economy", segment: "draft" },
  // ── Nouveaux providers & modèles étendus ──
  { id: "grok-video", label: "Grok Video", badge: "xAI", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["creative", "xai"], bestFor: "Créativité xAI (jusqu'à 15s)", tier: "premium", segment: "cinematic" },
  { id: "midjourney-video", label: "Midjourney Video", badge: "MJ", credits: 35, costEur: 3.50, providerCostEur: 0.40, strengths: ["artistic", "cinematic"], bestFor: "Esthétique Midjourney en vidéo", tier: "premium", segment: "cinematic" },
  { id: "pollo-2.5", label: "Pollo 2.5", badge: "Audio", credits: 25, costEur: 2.50, providerCostEur: 0.18, strengths: ["audio", "versatile"], bestFor: "Audio natif + jusqu'à 15s", tier: "standard", segment: "audio" },
  { id: "veo-3-fast", label: "Veo 3 Fast", badge: "Google⚡", credits: 25, costEur: 2.50, providerCostEur: 0.35, strengths: ["google", "audio", "speed"], bestFor: "Veo 3 + audio, -30% temps", tier: "standard", segment: "audio" },
  { id: "wan-2.6-flash", label: "Wan 2.6 Flash", badge: "Fast", credits: 15, costEur: 1.50, providerCostEur: 0.10, strengths: ["fast", "audio"], bestFor: "Wan 2.6 rapide + audio", tier: "economy", segment: "draft" },
  { id: "wan-2.5", label: "Wan 2.5", badge: "Audio", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["audio", "versatile"], bestFor: "Audio intégré + Wan quality", tier: "standard", segment: "audio" },
  { id: "vidu-q2-pro", label: "Vidu Q2 Pro", badge: "Audio", credits: 25, costEur: 2.50, providerCostEur: 0.20, strengths: ["audio", "quality"], bestFor: "Audio + end-frame", tier: "standard", segment: "audio" },
  { id: "vidu-q2", label: "Vidu Q2", badge: "Audio", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["audio"], bestFor: "Audio natif Vidu (T2V)", tier: "standard", segment: "audio" },
  { id: "kling-2.0", label: "Kling 2.0", badge: "Standard", credits: 25, costEur: 2.50, providerCostEur: 0.22, strengths: ["cinematic"], bestFor: "Cinématique standard Kling", tier: "standard", segment: "versatile" },
  { id: "seedance-1.0-pro", label: "Seedance Pro", badge: "HD", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["hd", "camera"], bestFor: "1080p + contrôle caméra", tier: "standard", segment: "versatile" },
  { id: "pixverse-4.5", label: "PixVerse 4.5", badge: "Styles", credits: 20, costEur: 2.00, providerCostEur: 0.15, strengths: ["styles", "anime"], bestFor: "Anime, 3D, cyberpunk", tier: "standard", segment: "character" },
  { id: "pika-2.0", label: "Pika 2.0", badge: "Camera", credits: 15, costEur: 1.50, providerCostEur: 0.08, strengths: ["camera", "creative"], bestFor: "Contrôle caméra avancé", tier: "economy", segment: "draft" },
  { id: "hailuo-01", label: "Hailuo 01", badge: "Classic", credits: 15, costEur: 1.50, providerCostEur: 0.10, strengths: ["classic"], bestFor: "Hailuo classique", tier: "economy", segment: "draft" },
  { id: "pollo-1.5", label: "Pollo 1.5", badge: "Budget", credits: 8, costEur: 0.80, providerCostEur: 0.04, strengths: ["budget"], bestFor: "Ultra-économique", tier: "economy", segment: "draft" },
];

const MUSIC_MODELS: ModelDef[] = [
  { id: "suno-v5", label: "Suno v5", badge: "Vocals", credits: 3, costEur: 0.30, providerCostEur: 0.08, strengths: ["vocals", "lyrics", "versatile"], bestFor: "Chansons avec voix & paroles", tier: "premium", segment: "vocals" },
  { id: "elevenlabs-music-v1", label: "ElevenLabs Music", badge: "Studio", credits: 3, costEur: 0.30, providerCostEur: 0.09, strengths: ["studio-grade", "brand-safe", "multilingual"], bestFor: "Pistes studio cleared commercial", tier: "premium", segment: "studio" },
];

// Segment metadata per mode — icon emoji, label, description shown in picker
const SEGMENTS_BY_MODE: Record<CreativeMode, { id: AnySegment; icon: string; labelFr: string; labelEn: string; descFr: string; descEn: string }[]> = {
  text: [
    { id: "strategy",     icon: "🧠", labelFr: "Stratégie & raisonnement", labelEn: "Strategy & reasoning",  descFr: "Briefs complexes, analyses",        descEn: "Complex briefs, analyses" },
    { id: "creative",     icon: "✍️", labelFr: "Copywriting créatif",      labelEn: "Creative copywriting", descFr: "Storytelling, slogans",              descEn: "Storytelling, taglines" },
    { id: "multilingual", icon: "🌍", labelFr: "Multilingue & FR natif",   labelEn: "Multilingual & FR",    descFr: "Marchés locaux, français natif",     descEn: "Local markets, native FR" },
    { id: "volume",       icon: "⚡", labelFr: "Volume & économique",      labelEn: "Volume & budget",      descFr: "Drafts massifs, itérations rapides", descEn: "Bulk drafts, fast iteration" },
  ],
  image: [
    { id: "product",  icon: "📸", labelFr: "Photo produit fidèle",   labelEn: "Faithful product photo", descFr: "Préservation produit, e-commerce",    descEn: "Product preservation, e-commerce" },
    { id: "creative", icon: "🎨", labelFr: "Créatif & artistique",    labelEn: "Creative & artistic",     descFr: "Stylisé, illustration, concept",      descEn: "Stylized, illustration, concept" },
    { id: "text",     icon: "🔤", labelFr: "Texte & logos",           labelEn: "Text & logos",            descFr: "Typographie, packaging, affiches",    descEn: "Typography, packaging, posters" },
    { id: "portrait", icon: "👤", labelFr: "Portraits & humains",     labelEn: "Portraits & people",      descFr: "Visages, réalisme humain",            descEn: "Faces, human realism" },
    { id: "draft",    icon: "⚡",  labelFr: "Brouillons rapides",       labelEn: "Fast drafts",             descFr: "Itérations massives, volume",         descEn: "Massive iterations, volume" },
  ],
  video: [
    { id: "cinematic", icon: "🎬", labelFr: "Cinématique premium",     labelEn: "Premium cinematic",     descFr: "Ads TV, campagnes finales",           descEn: "TV ads, final campaigns" },
    { id: "audio",     icon: "🔊", labelFr: "Vidéo + audio natif",     labelEn: "Video + native audio",  descFr: "Son, dialogue, lip-sync intégrés",    descEn: "Sound, dialogue, lip-sync built-in" },
    { id: "character", icon: "👥", labelFr: "Personnages & narratif",   labelEn: "Characters & narrative", descFr: "Humains, dialogue, scènes",           descEn: "People, dialogue, scenes" },
    { id: "versatile", icon: "🎯", labelFr: "Polyvalent campagne",      labelEn: "Versatile campaign",    descFr: "Mix qualité/prix, production",        descEn: "Balanced quality/price" },
    { id: "draft",     icon: "⚡",  labelFr: "Itération rapide",          labelEn: "Fast iteration",        descFr: "Brouillons, tests, concepts",         descEn: "Drafts, tests, concepts" },
  ],
  music: [
    { id: "vocals", icon: "🎤", labelFr: "Voix & paroles",       labelEn: "Vocals & lyrics",    descFr: "Chansons avec voix",                  descEn: "Songs with vocals" },
    { id: "studio", icon: "🎼", labelFr: "Studio brand-safe",     labelEn: "Studio brand-safe", descFr: "Pistes commerciales cleared",         descEn: "Commercial cleared tracks" },
  ],
};

/* ═══════════════════════════════════════════════════════════
   INTENT PRESETS — 8 content intents that shape the creative brief
   Each preset injects a framework (copywriting recipe), visual
   direction (mood + composition) and pacing hints before we call
   the underlying models. `auto` = no preset, free creation.
   ═══════════════════════════════════════════════════════════ */
type IntentId =
  | "auto"
  | "promo"
  | "brand-ad"
  | "product-launch"
  | "social-organic"
  | "editorial"
  | "ugc"
  | "lookbook"
  | "b2b";

interface IntentPreset {
  id: IntentId;
  icon: string;
  labelFr: string;
  labelEn: string;
  descFr: string;
  descEn: string;
  // Framework / copy recipe (FR) — injected into the prompt
  copyFramework: string;
  // Visual direction (FR) — injected into image/video prompts
  visualDirection: string;
  // Pacing / tone hints (FR)
  pacing: string;
}

const INTENT_PRESETS: IntentPreset[] = [
  {
    id: "auto",
    icon: "✨",
    labelFr: "Auto",
    labelEn: "Auto",
    descFr: "Création libre, sans template",
    descEn: "Free creation, no template",
    copyFramework: "",
    visualDirection: "",
    pacing: "",
  },
  {
    id: "promo",
    icon: "🏷️",
    labelFr: "Promo / Offre",
    labelEn: "Promo / Offer",
    descFr: "Réduction, offre limitée, urgence",
    descEn: "Discount, limited offer, urgency",
    copyFramework: "Framework PAS (Problème · Agitation · Solution). Hook direct avec le bénéfice chiffré. Prix visible. Deadline explicite. CTA impératif (Profitez, Découvrez, Commandez).",
    visualDirection: "Packshot clean, fond uni ou légèrement texturé, lumière studio crisp, produit frontal ou 3/4, price tag intégré, couleurs vives. Composition centrée, règle des tiers lâche. Ambiance commerciale premium (pas cheap).",
    pacing: "Impact immédiat, message court, punch.",
  },
  {
    id: "brand-ad",
    icon: "🎬",
    labelFr: "Pub Marque",
    labelEn: "Brand Ad",
    descFr: "Storytelling de marque, émotion",
    descEn: "Brand storytelling, emotion",
    copyFramework: "Framework BAB (Before · After · Bridge). Ouverture sur une tension émotionnelle, résolution par la marque, bridge vers le manifesto. Ton élevé, rythme cinématique.",
    visualDirection: "Lifestyle éditorial, lumière naturelle directionnelle (golden hour, soft overcast), narration visuelle, profondeur de champ cinéma, cadrage large, grain film subtil. Palette cohérente avec la marque.",
    pacing: "Lent, posé, émotionnel. Laisser respirer le silence / le vide.",
  },
  {
    id: "product-launch",
    icon: "🚀",
    labelFr: "Lancement Produit",
    labelEn: "Product Launch",
    descFr: "Révélation hero d'un nouveau produit",
    descEn: "Hero reveal of a new product",
    copyFramework: "Framework AIDA (Attention · Intérêt · Désir · Action). Hook choc sur la nouveauté. Mise en avant des features différenciantes. Désir par la démonstration. CTA: précommande / découvrir.",
    visualDirection: "Hero shot dramatique, éclairage studio rim light, fond gradient ou noir profond, produit en majesté, reflets maîtrisés, angle héroïque légèrement contre-plongée. Effet produit-sacré.",
    pacing: "Révélation, crescendo, reveal final net.",
  },
  {
    id: "social-organic",
    icon: "📱",
    labelFr: "Social Organique",
    labelEn: "Social Organic",
    descFr: "Natif social, scroll-stopper, conversationnel",
    descEn: "Native social, scroll-stopper, conversational",
    copyFramework: "Hook 1ère seconde obligatoire (question, stat, POV, contre-intuition). Ton conversationnel, tutoiement possible. Valeur-first, pas de vente frontale. CTA soft (commente, partage, save).",
    visualDirection: "Authentique, POV iPhone-like, lumière naturelle, cadrage vertical 9:16 ou carré, pas de sur-léchage, mouvement léger, expressivité. Feel UGC-but-clean.",
    pacing: "Ultra-rapide 0-1s, hook visuel fort, cuts punchy.",
  },
  {
    id: "editorial",
    icon: "📰",
    labelFr: "Éditorial",
    labelEn: "Editorial",
    descFr: "Magazine premium, storytelling visuel",
    descEn: "Premium magazine, visual storytelling",
    copyFramework: "Ton journalistique, narration posée, vocabulaire riche, structure chapitrée (accroche · développement · chute). Pas de CTA agressif.",
    visualDirection: "Composition magazine, règle des tiers stricte, typographie espacée, lumière narrative, palette sobre, détails matières. Cadrage intentionnel, chaque plan raconte quelque chose.",
    pacing: "Contemplatif, lent, chapitré.",
  },
  {
    id: "ugc",
    icon: "🤳",
    labelFr: "UGC Style",
    labelEn: "UGC Style",
    descFr: "Témoignage POV, look iPhone vrai",
    descEn: "Testimonial POV, real iPhone look",
    copyFramework: "Voix à la première personne, tutoiement, imperfections assumées, mini-histoire vécue, proof social. Pas de jargon marketing, parler comme un vrai client.",
    visualDirection: "Look iPhone front-camera ou handheld, lumière disponible, grain naturel, flou léger, cadrage approximatif volontaire, feel selfie ou vlog. ZÉRO studio.",
    pacing: "Naturel, parlé, coupes bruts, overlays texte façon TikTok.",
  },
  {
    id: "lookbook",
    icon: "👗",
    labelFr: "Lookbook",
    labelEn: "Lookbook",
    descFr: "Mode / saison, plans séquencés",
    descEn: "Fashion / seasonal, sequenced shots",
    copyFramework: "Minimal, presque silencieux. Nom de la collection, saison, 1-2 mots clés. Priorité au visuel.",
    visualDirection: "Série de plans cohérents: plein pied / mi-corps / détail tissu / accessoire. Lumière constante sur la série, palette dominante, stylisme net. Mannequin posé, regard absent ou franc. Décor minimaliste ou texturé.",
    pacing: "Séquentiel, rythme posé, cuts fluides entre plans.",
  },
  {
    id: "b2b",
    icon: "🏢",
    labelFr: "B2B / Corpo",
    labelEn: "B2B / Corporate",
    descFr: "Professionnel, data-driven, expertise",
    descEn: "Professional, data-driven, expertise",
    copyFramework: "Ton expert, factuel, data-driven. Structure: problème métier · solution · proof (chiffres, cas client). Vocabulaire sectoriel précis. CTA: demander une démo, télécharger le white paper.",
    visualDirection: "Clean editorial corporate, lumière neutre, cadrage architectural, environnement bureau moderne ou abstraction data-viz. Couleurs sobres (bleus, gris, blancs). Pas de lifestyle frivole.",
    pacing: "Sobre, informatif, pauses sur les chiffres clés.",
  },
];

function getIntentPreset(id: IntentId): IntentPreset {
  return INTENT_PRESETS.find(p => p.id === id) || INTENT_PRESETS[0];
}

// ── Brand DNA from backend /compare/scrape-urls ──
interface BrandDNA {
  logo: string | null;
  palette: { primary: string | null; secondary: string | null; accent: string | null; all: string[] };
  themeColor: string | null;
  fonts: string[];
  meta: { title: string; description: string; ogImage: string | null; favicon: string | null; appleTouchIcon: string | null; keywords: string };
  socialUrls: { platform: string; url: string }[];
}

// ── Result types ──
interface CreativeResult {
  id: string;
  modelId: string;
  label: string;
  type: CreativeMode;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  text?: string;
  timeMs: number;
  success: boolean;
  error?: string;
  scores: { speed: number; value: number; quality: number; reliability: number; overall: number };
  saved?: boolean;
  // VLM post-gen validation (Sprint 1 — anti-hallucination)
  validation?: {
    status: "pending" | "done" | "skipped" | "error";
    score?: number;
    verdict?: "excellent" | "good" | "drift" | "wrong";
    match?: boolean;
    differences?: string[];
    hallucinations?: string[];
    summary?: string;
  };
}

// ── Scoring ──
function getGradeLabel(score: number, isFr: boolean): { label: string; color: string } {
  if (score >= 80) return { label: isFr ? "Excellent" : "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: isFr ? "Bon" : "Good", color: "#84cc16" };
  if (score >= 40) return { label: isFr ? "Médiocre" : "Mediocre", color: "#f59e0b" };
  return { label: isFr ? "Insuffisant" : "Poor", color: "#ef4444" };
}

function computeScores(results: { modelId: string; timeMs: number; success: boolean }[], mode: CreativeMode): Map<string, CreativeResult["scores"]> {
  const map = new Map<string, CreativeResult["scores"]>();
  const ok = results.filter(r => r.success);
  if (!ok.length) return map;

  const maxT = Math.max(...ok.map(r => r.timeMs));
  const minT = Math.min(...ok.map(r => r.timeMs));
  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : mode === "video" ? VIDEO_MODELS : MUSIC_MODELS;

  for (const r of results) {
    if (!r.success) { map.set(r.modelId, { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 }); continue; }
    const m = catalog.find(c => c.id === r.modelId);
    const speed = maxT > minT ? Math.round(((maxT - r.timeMs) / (maxT - minT)) * 100) : 100;
    const maxC = Math.max(...ok.map(s => catalog.find(c => c.id === s.modelId)?.costEur || 1));
    const minC = Math.min(...ok.map(s => catalog.find(c => c.id === s.modelId)?.costEur || 0));
    const value = maxC > minC ? Math.round(((maxC - (m?.costEur || 0.5)) / (maxC - minC)) * 100) : 100;
    const quality = m?.tier === "premium" ? 90 : m?.tier === "standard" ? 75 : 60;
    const overall = Math.round(Math.max(0, Math.min(100, speed * 0.25 + value * 0.20 + 100 * 0.20 + quality * 0.35)));
    map.set(r.modelId, { speed, value, quality, reliability: 100, overall });
  }
  return map;
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

/* ── Glassmorphism KPI overlay (hover) ── */

function MiniGauge({ value, size = 38 }: { value: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const color = value >= 75 ? "#4ade80" : value >= 55 ? "#facc15" : value >= 35 ? "#fb923c" : "#f87171";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={2.8} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={2.8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={size >= 44 ? 12 : 10} fontWeight={800}>{value}</text>
    </svg>
  );
}

function KpiOverlay({ result, mInfo, mode, isFr }: { result: CreativeResult; mInfo: ModelDef | undefined; mode: CreativeMode; isFr: boolean }) {
  const { color: gradeColor, label: gradeLabel } = getGradeLabel(result.scores.overall, isFr);
  const strengths = mInfo?.strengths || [];
  const has = (s: string) => strengths.includes(s);
  const cost = mInfo?.credits ?? 5;
  const timeStr = (result.timeMs / 1000).toFixed(1);
  const q = result.scores.quality;

  // ── Client-facing metrics derived from scores + model DNA ──
  const metrics: { label: string; value: number; icon: string }[] = [];

  if (mode === "image" || mode === "video") {
    // Realism: base quality + boost for realism-oriented models
    const realism = Math.min(100, q + (has("photo-realism") || has("realism") ? 12 : 0) + (has("lighting") ? 5 : 0) + (has("realistic") || has("physics") ? 8 : 0));
    metrics.push({ label: isFr ? "Réalisme" : "Realism", value: realism, icon: "📷" });

    // Detail & sharpness
    const detail = Math.min(100, q + (has("detail") || has("high-detail") ? 10 : 0) + (has("textures") ? 8 : 0) + (has("precision") ? 5 : 0));
    metrics.push({ label: isFr ? "Détails" : "Detail", value: detail, icon: "🔍" });

    // Creativity / artistic quality
    const creativity = Math.min(100, q + (has("artistic") || has("creative") ? 12 : 0) + (has("cinematic") ? 8 : 0) + (has("stylized") ? 10 : 0) + (has("narrative") ? 5 : 0));
    metrics.push({ label: isFr ? "Créativité" : "Creativity", value: creativity, icon: "🎨" });

    // Text rendering (critical for branding clients)
    if (mode === "image") {
      const text = has("text-rendering") ? 92 : has("branding") ? 85 : has("precision") ? 55 : 30;
      metrics.push({ label: isFr ? "Rendu texte" : "Text rendering", value: text, icon: "🔤" });
    }
  } else if (mode === "text") {
    const creativity = Math.min(100, q + (has("creativity") || has("storytelling") || has("creative") || has("copy") ? 12 : 0));
    metrics.push({ label: isFr ? "Créativité" : "Creativity", value: creativity, icon: "✍️" });
    const precision = Math.min(100, q + (has("reasoning") || has("depth") || has("factual") ? 10 : 0) + (has("nuance") ? 8 : 0));
    metrics.push({ label: isFr ? "Précision" : "Precision", value: precision, icon: "🎯" });
    const multi = Math.min(100, q + (has("multilingual") || has("french") ? 15 : 0));
    metrics.push({ label: isFr ? "Multilingue" : "Multilingual", value: multi, icon: "🌍" });
  } else {
    // Music
    const quality = Math.min(100, q + (has("studio-grade") ? 12 : 0) + (has("vocals") ? 8 : 0));
    metrics.push({ label: isFr ? "Qualité audio" : "Audio quality", value: quality, icon: "🎵" });
    const versatility = Math.min(100, q + (has("versatile") ? 12 : 0) + (has("multilingual") ? 8 : 0));
    metrics.push({ label: isFr ? "Polyvalence" : "Versatility", value: versatility, icon: "🎼" });
  }

  // Universal metrics: speed & value
  metrics.push({ label: isFr ? "Rapidité" : "Speed", value: result.scores.speed, icon: "⚡" });
  metrics.push({ label: isFr ? "Rapport prix" : "Value", value: result.scores.value, icon: "💰" });

  // Best-for description from model metadata
  const bestFor = mInfo?.bestFor || (isFr ? "Polyvalent" : "Versatile");

  return (
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col pointer-events-none group-hover:pointer-events-auto"
      style={{
        background: "linear-gradient(135deg, rgba(15,10,30,0.82) 0%, rgba(40,15,50,0.88) 100%)",
        backdropFilter: "blur(22px) saturate(140%)",
        WebkitBackdropFilter: "blur(22px) saturate(140%)",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      {/* Header — score + model name */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="min-w-0">
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }} className="truncate">{result.label}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{cost} cr · {timeStr}s</div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <MiniGauge value={result.scores.overall} size={48} />
          <span style={{ fontSize: 8.5, color: gradeColor, fontWeight: 700 }}>{gradeLabel}</span>
        </div>
      </div>

      {/* Client-facing metrics */}
      <div className="px-4 py-3 space-y-1.5 flex-1 overflow-hidden">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-2">
            <span style={{ fontSize: 11, width: 16, textAlign: "center", flexShrink: 0 }}>{m.icon}</span>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", width: 80, flexShrink: 0 }}>{m.label}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full" style={{
                width: `${m.value}%`,
                background: m.value >= 80 ? "linear-gradient(90deg, #22c55e, #4ade80)" : m.value >= 60 ? "linear-gradient(90deg, #84cc16, #a3e635)" : m.value >= 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)",
                transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", width: 22, textAlign: "right", flexShrink: 0 }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Best for — from model catalog */}
      <div className="px-4 pb-3 mt-auto">
        <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
          {isFr ? "Idéal pour" : "Best for"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, lineHeight: 1.4 }}>{bestFor}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN: Creative Lab
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
  const [composerExpanded, setComposerExpanded] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [textFormat, setTextFormat] = useState<string>("instagram-post");
  // URL scraping (auto-detects product/company URLs in the brief and scrapes them)
  const [scrapedUrls, setScrapedUrls] = useState<{ pagesScraped: number; imagesFound: number } | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  // Brand DNA extracted from the scraped site (logo, palette, fonts, meta) —
  // drives the brand preview banner AND is injected as a brand block into every generation.
  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);
  // Intent preset — shapes the copy framework + visual direction. "auto" = no template.
  const [intent, setIntent] = useState<IntentId>("auto");
  // Dropdown open state for compact toolbar (intent + models popovers)
  const [showIntentDropdown, setShowIntentDropdown] = useState(false);
  const intentDropdownRef = useRef<HTMLDivElement>(null);
  // "Inspire me" — contextual scene suggestions after scraping
  const [sceneSuggestions, setSceneSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // Persisted brief enrichment from scraping — reused by "Inspire me" when brandDNA already exists
  const [storedEnrichment, setStoredEnrichment] = useState("");

  // ── Music options (used when mode === "music") ──
  const [musicDurationSec, setMusicDurationSec] = useState(30);       // 10–180s
  const [musicInstrumental, setMusicInstrumental] = useState(false);
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicStyle, setMusicStyle] = useState("");
  const [showMusicOptions, setShowMusicOptions] = useState(false);

  // ── Publish modal ──
  const [publishTarget, setPublishTarget] = useState<PublishableAsset | null>(null);
  const navigate = useNavigate();

  // ── Voice recording (Whisper) ──
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Attached product photos (multi-ref: up to 4 reference images) ──
  interface AttachedImage { file: File; preview: string; signedUrl?: string; uploading: boolean }
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  // Live ref — always points to the latest attachedImages (for async callbacks that outlive renders)
  const attachedImagesRef = useRef<AttachedImage[]>([]);
  attachedImagesRef.current = attachedImages;
  // Convenience: first image (backward compat for single-ref consumers)
  const attachedImage = attachedImages[0] || null;
  // Ref type:
  //   "product"       = generative img2img (Nano Banana / Kontext / Flux Pro 2) — fast, creative, near-perfect
  //   "pixel-perfect" = non-generative cutout (Photoroom Studio / Bria / IC-Light) — 0% drift, commercial packshots
  //   "location"      = ControlNet Depth (FAL Flux Depth) — preserve architecture for hotels/venues
  const [refType, setRefType] = useState<"product" | "pixel-perfect" | "location">("product");
  // VLM-derived factual description of what the reference shows. Populated asynchronously when an image is attached
  // and then injected into the preservation prefix so non-vision models know what to preserve.
  const [refSubject, setRefSubject] = useState<{ subject: string; category: string } | null>(null);
  // True when the brief contains a URL → enables ref-type toggle even without an uploaded image,
  // so the user can pick "Location" mode for URL-scraped hotel/venue references.
  const promptHasUrl = useMemo(() => /https?:\/\/[^\s<>"')]+/i.test(prompt), [prompt]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : mode === "video" ? VIDEO_MODELS : MUSIC_MODELS;
  const maxModels = mode === "text" ? 4 : mode === "image" ? 6 : mode === "video" ? 4 : 2;

  useEffect(() => {
    setSelectedModels([]); setResults([]); setSteps([]);
    // Reset format to mode-specific default
    if (mode === "image") setAspectRatio("1:1");
    else if (mode === "video") setAspectRatio("16:9");
    else if (mode === "text") setTextFormat("instagram-post");
  }, [mode]);

  // Auto-collapse composer once client has picked their AIs.
  // Triggers as soon as the first model is selected — gives immediate "choice locked in" feedback.
  const prevModelCountRef = useRef(0);
  useEffect(() => {
    const prev = prevModelCountRef.current;
    if (prev === 0 && selectedModels.length > 0 && composerExpanded) {
      // small delay so the user sees the pill confirm the selection
      const t = setTimeout(() => { setShowModelPicker(false); setComposerExpanded(false); }, 450);
      prevModelCountRef.current = selectedModels.length;
      return () => clearTimeout(t);
    }
    prevModelCountRef.current = selectedModels.length;
  }, [selectedModels, composerExpanded]);

  // Format catalog per mode — what clients can pick
  const FORMAT_OPTIONS = useMemo(() => {
    if (mode === "image") return [
      { id: "1:1", label: isFr ? "Carré" : "Square", sub: "Post" },
      { id: "4:5", label: "Portrait", sub: "Feed" },
      { id: "9:16", label: "Story", sub: "Story / Reel" },
      { id: "16:9", label: isFr ? "Paysage" : "Landscape", sub: "Cover" },
      { id: "3:2", label: "Photo", sub: "Photo" },
    ];
    if (mode === "video") return [
      { id: "16:9", label: "YouTube · LinkedIn", sub: "YouTube" },
      { id: "9:16", label: "Reel · TikTok · Shorts", sub: "Reel / TikTok" },
      { id: "1:1", label: isFr ? "Carré" : "Square", sub: "Post" },
    ];
    if (mode === "text") return [
      { id: "instagram-post", label: "Instagram", sub: "Post" },
      { id: "instagram-story", label: "Instagram", sub: "Story" },
      { id: "linkedin-post", label: "LinkedIn", sub: "Post" },
      { id: "twitter-post", label: "X / Twitter", sub: "Post" },
      { id: "facebook-post", label: "Facebook", sub: "Post" },
    ];
    return [];
  }, [mode, isFr]);

  const currentFormat = mode === "text" ? textFormat : aspectRatio;
  const setCurrentFormat = (id: string) => { if (mode === "text") setTextFormat(id); else setAspectRatio(id); };

  // Scroll to bottom when new results appear
  useEffect(() => {
    if (results.length > 0) resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results]);

  // Close dropdowns on click outside
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showIntentDropdown && intentDropdownRef.current && !intentDropdownRef.current.contains(e.target as Node)) {
        setShowIntentDropdown(false);
      }
      if (showModelPicker && modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showIntentDropdown, showModelPicker]);

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

  // ── Attached product photos (multi-ref upload, max 4) ──
  const MAX_REF_IMAGES = 4;
  const handleAttachImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Format non supporté" : "Unsupported format"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (max 10 MB)" : "Image too large (max 10 MB)"); return; }
    // Block if already at capacity
    setAttachedImages(prev => {
      if (prev.length >= MAX_REF_IMAGES) {
        toast.error(isFr ? `Max ${MAX_REF_IMAGES} photos` : `Max ${MAX_REF_IMAGES} photos`);
        return prev;
      }
      return prev; // actual append is below (async needs to be outside)
    });
    // Re-check synchronously
    // (Note: we can't read state directly inside useCallback, so we use a ref-like pattern)
    const preview = URL.createObjectURL(file);
    const newEntry: AttachedImage = { file, preview, uploading: true };
    setAttachedImages(prev => {
      if (prev.length >= MAX_REF_IMAGES) {
        URL.revokeObjectURL(preview);
        return prev;
      }
      return [...prev, newEntry];
    });
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
        // Update THIS entry (match by preview URL since it's unique per blob)
        setAttachedImages(prev => prev.map(img =>
          img.preview === preview ? { ...img, signedUrl: data.signedUrl, uploading: false } : img
        ));
        toast.success(isFr ? "Photo produit ajoutée" : "Product photo added");
        // VLM subject description — only run for the FIRST image (defines what to preserve)
        setAttachedImages(prev => {
          if (prev.findIndex(img => img.preview === preview) === 0) {
            setRefSubject(null);
            (async () => {
              try {
                const j = await serverPost("/compare/describe-subject", { imageUrl: data.signedUrl });
                if (j?.success && j.subject) {
                  setRefSubject({ subject: String(j.subject), category: String(j.category || "other") });
                  console.log(`[compare] VLM described subject: "${j.subject}" (${j.category})`);
                }
              } catch (err) {
                console.warn("[compare] describe-subject failed:", err);
              }
            })();
          }
          return prev;
        });
      } else {
        toast.error(isFr ? "Échec upload" : "Upload failed");
        setAttachedImages(prev => prev.filter(img => img.preview !== preview));
        URL.revokeObjectURL(preview);
      }
    } catch {
      toast.error(isFr ? "Erreur réseau" : "Network error");
      setAttachedImages(prev => prev.filter(img => img.preview !== preview));
      URL.revokeObjectURL(preview);
    }
  }, [isFr]);

  const removeAttachedImage = useCallback((index?: number) => {
    if (index !== undefined) {
      // Remove specific image by index
      setAttachedImages(prev => {
        const removed = prev[index];
        if (removed?.preview) URL.revokeObjectURL(removed.preview);
        const next = prev.filter((_, i) => i !== index);
        if (index === 0) setRefSubject(null); // subject was from first image
        return next;
      });
    } else {
      // Remove all
      setAttachedImages(prev => {
        prev.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview); });
        return [];
      });
      setRefSubject(null);
    }
  }, []);

  // ── Server calls (CORS-safe: text/plain avoids preflight for most browsers) ──
  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    // Retry once on network/CORS failure — but ONLY for short (<150s) calls.
    // Long calls (location cascade, video) should NOT retry on timeout since that
    // doubles the user wait time for no reason (the backend already cascades internally).
    const allowRetry = timeoutMs < 150_000;
    const maxAttempts = allowRetry ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
        if (allowRetry && attempt === 0) {
          console.warn(`[serverPost] ${path} attempt 1 failed (${err?.message}), retrying...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        console.warn(`[serverPost] ${path} failed (${err?.message}) — no retry`);
        return { success: false, error: err?.message || "Network error" };
      }
    }
    return { success: false, error: "Request failed" };
  }, [getAuthHeader]);

  const serverGet = useCallback(async (path: string) => {
    const sep = path.includes("?") ? "&" : "?";
    const token = getAuthHeader();
    const r = await fetch(`${API_BASE}${path}${sep}apikey=${publicAnonKey}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(180_000),
    });
    return r.json();
  }, [getAuthHeader]);

  // ── Auto-save: resolve "Brouillons" folder for generated assets ──
  const draftsFolderId = useDraftsFolder(serverGet, serverPost);

  const pollVideo = useCallback(async (genId: string): Promise<string | null> => {
    // Fast polling: webhook populates KV so server responds instantly once done
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, i < 10 ? 2000 : 4000)); // 2s first 20s, then 4s
      try {
        const r = await fetch(`${API_BASE}/generate/video-status?id=${encodeURIComponent(genId)}&apikey=${publicAnonKey}`, { signal: AbortSignal.timeout(30_000) });
        const res = await r.json();
        if (res.state === "completed" && res.videoUrl) return res.videoUrl;
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }, []);

  const pollSuno = useCallback(async (taskId: string): Promise<string | null> => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await serverGet(`/generate/audio-poll?taskId=${taskId}`);
        if (res.status === "DONE" && res.track?.audioUrl) return res.track.audioUrl;
        if (res.status === "FAILED") return null;
      } catch { /* continue */ }
    }
    return null;
  }, [serverGet]);

  // ── "Inspire me" — scrape URL + get scene suggestions ──
  const runInspireMe = useCallback(async () => {
    const urlRe = /https?:\/\/[^\s<>"')]+/gi;
    const urls = (prompt.match(urlRe) || []).slice(0, 3);
    if (urls.length === 0 && !brandDNA) return;

    setIsLoadingSuggestions(true);
    setSceneSuggestions([]);
    try {
      // Step 1: scrape if not already done, or reuse stored enrichment
      let enrichment = storedEnrichment;
      let brand = brandDNA;
      if (urls.length > 0 && !brandDNA) {
        setIsScraping(true);
        const scrapeRes = await serverPost("/compare/scrape-urls", { urls }, 45_000);
        setIsScraping(false);
        if (scrapeRes?.success) {
          enrichment = String(scrapeRes.briefEnrichment || "");
          setStoredEnrichment(enrichment);
          if (scrapeRes.brand) { brand = scrapeRes.brand as BrandDNA; setBrandDNA(brand); }
          if (scrapeRes.productImages?.length > 0) {
            setScrapedUrls({ pagesScraped: scrapeRes.pagesScraped || 0, imagesFound: scrapeRes.imagesFound || 0 });
          }
        }
      }

      // Step 2: get scene suggestions
      const intentPreset = intent !== "auto" ? getIntentPreset(intent) : null;
      const res = await serverPost("/compare/suggest-scenes", {
        briefEnrichment: enrichment,
        brandName: brand?.meta?.title || "",
        brandDescription: brand?.meta?.description || "",
        intentId: intent,
        intentLabel: intentPreset ? (isFr ? intentPreset.labelFr : intentPreset.labelEn) : "",
        locale,
      }, 15_000);

      if (res?.success && res.scenes?.length > 0) {
        setSceneSuggestions(res.scenes);
      } else {
        toast.error(isFr ? "Pas de suggestions trouvées" : "No suggestions found");
      }
    } catch (err) {
      console.warn("[inspire-me] failed:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [prompt, brandDNA, storedEnrichment, intent, isFr, locale, serverPost]);

  // ── Generate ──
  const runGeneration = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length < 1 || isRunning) return;

    // ── GUARD: wait for all uploads to finish before generating ──
    // If the user attached images and clicked generate before signedUrls are ready,
    // poll the ref until all uploads complete (max 15s) to avoid the silent text-to-image fallback.
    if (attachedImagesRef.current.length > 0 && attachedImagesRef.current.some(img => img.uploading)) {
      toast.info(isFr ? "Upload en cours, un instant..." : "Uploading, one moment...");
      const start = Date.now();
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!attachedImagesRef.current.some(img => img.uploading) || Date.now() - start > 15_000) { resolve(); return; }
          setTimeout(check, 500);
        };
        check();
      });
    }

    setIsRunning(true);
    setResults([]);
    setScrapedUrls(null);
    setBrandDNA(null);
    setStoredEnrichment("");

    const modelSteps = selectedModels.map(id => ({ label: catalog.find(m => m.id === id)?.label || id, status: "pending" as StepStatus }));
    setSteps(modelSteps);

    // ── AUTO-DETECT URLs in the brief → scrape pages + extract product images ──
    // Real product facts get injected into every prompt, and the first scraped image
    // is used as img2img reference for image/video modes.
    const urlRegex = /https?:\/\/[^\s<>"')]+/gi;
    const urlsInBrief = Array.from(new Set((prompt.match(urlRegex) || []).slice(0, 3)));
    let briefEnrichment = "";
    let scrapedProductImages: string[] = [];
    if (urlsInBrief.length > 0) {
      setIsScraping(true);
      try {
        const scrapeRes = await serverPost("/compare/scrape-urls", { urls: urlsInBrief }, 45_000);
        if (scrapeRes?.success) {
          briefEnrichment = String(scrapeRes.briefEnrichment || "");
          setStoredEnrichment(briefEnrichment);
          scrapedProductImages = Array.isArray(scrapeRes.productImages) ? scrapeRes.productImages : [];
          setScrapedUrls({ pagesScraped: scrapeRes.pagesScraped || 0, imagesFound: scrapeRes.imagesFound || 0 });
          // Persist the brand DNA so the preview banner + downstream prompts can use it.
          if (scrapeRes.brand) setBrandDNA(scrapeRes.brand as BrandDNA);
          else setBrandDNA(null);
          // User-facing feedback on scrape outcome
          if (scrapedProductImages.length > 0) {
            toast.success(isFr
              ? `${scrapeRes.pagesScraped || 1} page(s) analysée(s) — ${scrapedProductImages.length} image(s) trouvée(s)`
              : `Scraped ${scrapeRes.pagesScraped || 1} page(s) — ${scrapedProductImages.length} image(s) found`);
          } else if ((scrapeRes.pagesScraped || 0) > 0) {
            toast.warning(isFr
              ? "Contenu trouvé mais aucune image exploitable sur cette URL"
              : "Content scraped but no usable images found");
          }
        }
      } catch (err) {
        console.warn("[compare] URL scrape failed:", err);
      } finally {
        setIsScraping(false);
      }
    }

    // ── HARD STOP: URL + location mode but scraper found no image ──
    // Falling through to text-to-image GET would hit 403 (URL too long with full enrichment).
    // Better to tell the user clearly and abort rather than show 4 cryptic "Failed to fetch" cards.
    if (
      (mode === "image" || mode === "video") &&
      refType === "location" &&
      !attachedImage &&
      urlsInBrief.length > 0 &&
      scrapedProductImages.length === 0
    ) {
      toast.error("Aucune image exploitable n'a pu être extraite de l'URL. Attachez une photo manuellement ou désactivez le mode Location.");
      setIsRunning(false);
      setSteps([]);
      return;
    }

    // ── Build INTENT block (if the user picked a preset other than "auto") ──
    // The block is deliberately short and mode-specific so we don't blow past
    // GET URL limits on fallback paths.
    let intentBlock = "";
    if (intent !== "auto") {
      const preset = getIntentPreset(intent);
      const parts: string[] = [];
      // Copy framework only for text mode (the LLM needs the recipe)
      if (mode === "text" && preset.copyFramework) parts.push(`COPY FRAMEWORK: ${preset.copyFramework}`);
      // Visual direction for image / video
      if ((mode === "image" || mode === "video") && preset.visualDirection) parts.push(`VISUAL DIRECTION: ${preset.visualDirection}`);
      // Pacing only for video (and text as rhythm hint)
      if ((mode === "video" || mode === "text") && preset.pacing) parts.push(`PACING/TONE: ${preset.pacing}`);
      if (parts.length > 0) {
        intentBlock = `\n\n=== INTENT: ${preset.labelFr.toUpperCase()} (${preset.id}) ===\n${parts.join("\n")}\nMANDATORY: follow this intent strictly unless the user explicitly overrides it in the brief below.`;
      }
    }

    // Enriched prompt — brief + intent + scraped real product context (when URLs detected)
    // For GET fallback paths, briefEnrichment must stay small (URL query string limit ~8KB).
    // When we have a real ref image, img2img POST can take the full enrichment.
    const fullEnrichment = `${intentBlock}${briefEnrichment}`;
    const enrichedPromptFull = fullEnrichment ? `${prompt}${fullEnrichment}` : prompt;
    const shortEnrichment = fullEnrichment ? fullEnrichment.slice(0, 1200) + (fullEnrichment.length > 1200 ? "\n[...truncated for GET]" : "") : "";
    const enrichedPromptShort = shortEnrichment ? `${prompt}${shortEnrichment}` : prompt;

    const rawResults: { modelId: string; timeMs: number; success: boolean; imageUrl?: string; videoUrl?: string; audioUrl?: string; text?: string; error?: string }[] = [];

    // Prefer client-uploaded photos; fallback to scraped product images
    // Multi-ref: all uploaded signed URLs, plus scraped images to fill up to 4.
    // Read from ref (always fresh) — closure `attachedImages` may be stale if uploads
    // completed asynchronously after this callback was created.
    const uploadedRefs = attachedImagesRef.current.filter(img => img.signedUrl).map(img => img.signedUrl!);
    const allProductRefs = uploadedRefs.length > 0
      ? [...uploadedRefs, ...scrapedProductImages.filter(u => !uploadedRefs.includes(u))].slice(0, MAX_REF_IMAGES)
      : scrapedProductImages.slice(0, MAX_REF_IMAGES);
    const effectiveProductRef = allProductRefs[0] || null;
    const hasProductRef = (mode === "image" || mode === "video") && !!effectiveProductRef;

    // Alias kept for readability below — img2img paths use the full enriched prompt.
    const enrichedPrompt = enrichedPromptFull;

    // ── REFERENCE PRESERVATION — when a reference image is attached ──
    // Three modes, selected by the user via refType:
    //   "product"       → generative img2img with VLM-derived subject injection
    //   "pixel-perfect" → non-generative cutout pipeline (no prompt prefix needed, handled backend-side)
    //   "location"      → ControlNet Depth with architecture-preserve language
    let preservationPrefix = "";
    if (hasProductRef && refType !== "pixel-perfect") {
      if (refType === "location") {
        // Location preservation: lock the ARCHITECTURE (walls, windows, ceiling, floor, perspective)
        // but allow the model to change lighting, mood, styling, decor AND furniture arrangement
        // (the user should be able to add a dining table, candles, etc.).
        // Original prefix was too strict ("furniture positions EXACTLY") and blocked scene edits.
        preservationPrefix = `LOCATION PRESERVATION — keep the same ROOM architecture from the reference image: same walls, windows, ceiling, floor, wall colors/textures, and spatial perspective so the place is instantly recognizable. You MAY change everything else the user asks for: lighting, mood, time of day, decor, styling, added furniture (dining tables, candles, food, props), added people, atmosphere. Do NOT invent a different room.\n\nUSER REQUEST: `;
      } else {
        // Object-agnostic subject preservation, with VLM-derived factual description injected.
        // This avoids biasing the model toward people (old prefix said "person's face, body, outfit"
        // which made models hallucinate a person on a perfume-bottle reference).
        const subjectLine = refSubject?.subject
          ? `REFERENCE SUBJECT (factual description from vision model): "${refSubject.subject}"`
          : `REFERENCE SUBJECT: the exact item shown in the attached reference image`;
        preservationPrefix = `STRICT PRESERVATION RULE — The attached reference image shows a SPECIFIC subject that must be preserved exactly in the generated scene.

${subjectLine}

YOU MUST:
1. Place THAT EXACT subject (described above) in the new scene
2. Preserve its exact shape, proportions, colors, materials, logos, labels, and distinguishing features
3. If the description mentions a person + outfit → keep both the person AND the outfit recognizable
4. If the description mentions an object → keep it as an object, DO NOT add people or clothing around it
5. If the description mentions text or a logo → preserve it exactly, DO NOT invent new text

YOU MUST NOT:
- Replace the subject with a different item or category
- Add a person if the description does not mention a person
- Add clothing or accessories if the description does not mention them
- Hallucinate additional objects, logos, or text
- Transform the subject into something it isn't

ONLY change what the user's request below explicitly asks to change (scene, background, lighting, mood, placement). The subject itself must stay 100% recognizable as the exact item described above.

USER REQUEST: `;
      }
    }
    const preservedPrompt = preservationPrefix + enrichedPrompt;

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
              if (refType === "pixel-perfect") {
                // Pixel-perfect pipeline: Photoroom cutout → Studio AI bg / Bria / IC-Light
                // The product pixels are preserved NON-GENERATIVELY — 0% drift by design.
                // Note: all models in the batch run the SAME pixel-perfect pipeline but with slight
                // variations (different strategies in the fallback cascade produce different scenes).
                const r = await serverPost("/compare/pixel-perfect-product", {
                  productImageUrl: effectiveProductRef!,
                  prompt: enrichedPrompt.slice(0, 4000),
                  aspectRatio,
                }, 120_000);
                url = r?.success && r.imageUrl ? r.imageUrl : "";
              } else {
                // Image-to-image edit: use the selected model with generative img2img.
                // CRITICAL: img2img models are VISUAL models, not LLMs. They can't parse
                // 3000-char instruction blocks. The preservation prefix and brand DNA block
                // HURT fidelity by drowning the actual scene description in noise.
                // → Send ONLY the user's brief + a short visual scene description.
                // Subject preservation comes from the IMAGE REFERENCE WEIGHT, not from text.
                const timeoutMs = refType === "location" ? 240_000 : 120_000;
                // Build a short, SCENE-DIRECTIVE prompt for img2img:
                // Edit models (Kontext, Leonardo) need explicit instructions to CHANGE THE SCENE.
                // Without a scene directive, they just do minimal edits on the reference.
                // Formula: "Place [subject] in [user's scene]. Keep the exact [product]. [Style hint]"
                const subjectDesc = refSubject?.subject || "the product from the reference image";
                const intentPreset = intent !== "auto" ? getIntentPreset(intent) : null;
                const intentHint = intentPreset?.visualDirection
                  ? ` Visual style: ${intentPreset.visualDirection.slice(0, 150)}.`
                  : "";
                // Strip URLs from user prompt — they're not scene descriptions.
                // Also strip common French/English task-instructions that aren't scenes.
                let sceneFromPrompt = prompt
                  .replace(/https?:\/\/[^\s<>"')]+/gi, "")
                  .replace(/\b(fais|crée|créer|génère|générer|make|create|generate|lance|lancer)\s+(une?\s+)?(campagne|pub|publicité|ad|campaign|visuel|visuels|contenu|content)\s*(pour|for|de|d')?\s*/gi, "")
                  .replace(/\s*:\s*/g, " ")
                  .trim();
                // If no scene description left, auto-generate from intent preset
                const INTENT_DEFAULT_SCENES: Record<string, string> = {
                  "promo": "clean studio setting with soft white background and professional lighting",
                  "brand-ad": "cinematic lifestyle scene with natural golden hour light and depth of field",
                  "product-launch": "dramatic dark studio with rim lighting and gradient background",
                  "social-organic": "casual natural setting with bright daylight, authentic feel",
                  "editorial": "elegant minimalist interior with magazine-style composition and narrative light",
                  "ugc": "casual home environment with natural window light, iPhone-style perspective",
                  "lookbook": "minimalist textured backdrop with consistent fashion photography lighting",
                  "b2b": "modern clean office environment with neutral corporate lighting",
                };
                if (sceneFromPrompt.length < 10) {
                  // When we have scraped enrichment (from URL), build a scene from brand context
                  // instead of falling back to generic intent scenes. This ensures hotel URLs
                  // generate scenes that match the actual venue (lobby, rooms, spa, etc.).
                  if (briefEnrichment.length > 50) {
                    // Extract brand name + description from enrichment for a contextual scene
                    const brandTitle = brandDNA?.meta?.title || "";
                    const brandDesc = (brandDNA?.meta?.description || "")
                      .replace(/https?:\/\/[^\s]+/gi, "").slice(0, 200);
                    sceneFromPrompt = brandTitle && brandDesc
                      ? `${brandTitle}: ${brandDesc}`
                      : briefEnrichment
                          .replace(/={2,}/g, " ").replace(/\n+/g, " ").replace(/\s{2,}/g, " ")
                          .slice(0, 250).trim();
                  } else {
                    sceneFromPrompt = INTENT_DEFAULT_SCENES[intent] || "elegant professional setting with beautiful natural light";
                  }
                }
                const img2imgPrompt = `Place ${subjectDesc} in this scene: ${sceneFromPrompt}. Change the background and environment completely to match the scene description. Keep the exact product/subject from the reference photo — same shape, colors, textures, details.${intentHint} Photorealistic photography.`.slice(0, 1500);
                const r = await serverPost("/generate/image-start", {
                  prompt: img2imgPrompt,
                  model: modelId,
                  aspectRatio,
                  imageRefUrl: effectiveProductRef!,
                  // Multi-ref: pass all reference URLs so providers that support arrays
                  // (Luma image_ref, Leonardo image_reference) can use multiple angles.
                  imageRefUrls: allProductRefs.length > 1 ? allProductRefs : undefined,
                  refSource: attachedImagesRef.current.some(img => img.signedUrl) ? "upload" : "scrape",
                  refType, // "product" or "location" — drives backend dispatch (depth ControlNet for location)
                  provider: "ai",
                  preserveSubject: refType === "product",
                  // Pass full intent metadata so backend can apply it to Photoroom/AI providers
                  intentId: intent,
                  intentVisualDirection: intentPreset?.visualDirection || "",
                  intentPacing: intentPreset?.pacing || "",
                }, timeoutMs);
                url = r.success && (r.imageUrl || r.results?.[0]?.result?.imageUrl) ? (r.imageUrl || r.results[0].result.imageUrl) : "";
                if (!url) {
                  const msg = r?.error || r?.results?.[0]?.error || r?.message || "image-start returned no URL";
                  console.warn(`[compare] image-start failed for ${modelId}`, { refType, error: msg, response: r });
                  const timeMs = Date.now() - t0;
                  setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
                  return { modelId, timeMs, success: false, error: String(msg).slice(0, 200) };
                }
              }
            } else {
              // GET path — use the SHORT enriched prompt (briefEnrichment capped at 1200 chars)
              // to stay under URL length limits (~8KB). Full enrichment is only sent via POST
              // when we have an img ref (img2img path above).
              const res = await serverGet(`/generate/image-via-get?prompt=${encodeURIComponent(enrichedPromptShort.slice(0, 3000))}&models=${modelId}&aspectRatio=${encodeURIComponent(aspectRatio)}`);
              const first = res.results?.[0];
              url = res.success && first?.result?.imageUrl ? first.result.imageUrl : "";
              if (!url) {
                const modelErr = first?.error || res.error || "";
                const timeMs = Date.now() - t0;
                setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
                return { modelId, timeMs, success: false, error: modelErr ? String(modelErr).slice(0, 160) : "Generation failed" };
              }
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
          const res = await serverPost("/campaign/generate-texts", { brief: enrichedPrompt, formats: textFormat, model: modelId, language: locale }, 60_000);
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
    } else if (mode === "video") {
      // Video — sequential to avoid overload
      for (const modelId of selectedModels) {
        const idx = selectedModels.indexOf(modelId);
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          // Video uses POST to avoid URI Too Long with large _token
          const startRes = await serverPost("/generate/video-start", {
            prompt: enrichedPromptShort,
            model: modelId,
            aspectRatio,
            duration: "5",
            ...(effectiveProductRef ? { imageUrl: effectiveProductRef } : {}),
          });
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
    } else {
      // Music — parallel, each model has its own provider flow
      const batchRes = await Promise.all(selectedModels.map(async (modelId, idx) => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          let audioUrl: string | null = null;
          if (modelId === "suno-v5") {
            // Suno: start → poll. Passes lyrics / instrumental / style when provided.
            const sunoPayload: Record<string, unknown> = {
              prompt,
              models: ["suno"],
              instrumental: musicInstrumental,
            };
            if (musicLyrics.trim()) sunoPayload.lyrics = musicLyrics.trim();
            if (musicStyle.trim()) sunoPayload.style = musicStyle.trim();
            const startRes = await serverPost("/generate/audio-start", sunoPayload, 30_000);
            const first = startRes?.results?.[0];
            if (!first?.success || !first?.taskId) throw new Error(first?.error || startRes?.error || "Suno start failed");
            audioUrl = await pollSuno(first.taskId);
          } else if (modelId === "elevenlabs-music-v1") {
            // ElevenLabs: synchronous compose. Lyrics are inlined into the prompt
            // since /v1/music takes a single natural-language brief.
            const briefParts = [prompt];
            if (musicStyle.trim()) briefParts.push(`Style: ${musicStyle.trim()}`);
            if (musicLyrics.trim() && !musicInstrumental) briefParts.push(`Lyrics:\n${musicLyrics.trim()}`);
            const elBrief = briefParts.join("\n\n");
            const res = await serverPost("/generate/music-elevenlabs", {
              prompt: elBrief,
              durationMs: Math.max(10, Math.min(300, musicDurationSec)) * 1000,
              instrumental: musicInstrumental,
            }, 180_000);
            if (!res.success || !res.audioUrl) throw new Error(res.error || "ElevenLabs compose failed");
            audioUrl = res.audioUrl;
          }
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: audioUrl ? "done" : "error", timeMs } : s));
          return { modelId, timeMs, success: !!audioUrl, audioUrl: audioUrl || undefined };
        } catch (err: any) {
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
          return { modelId, timeMs, success: false, error: err?.message || "Generation failed" };
        }
      }));
      rawResults.push(...batchRes);
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
        audioUrl: r.audioUrl,
        text: r.text,
        timeMs: r.timeMs,
        success: r.success,
        error: r.error,
        scores: scoreMap.get(r.modelId) || { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 },
      };
    });

    setResults(creativeResults);
    setIsRunning(false);

    // ── Sprint 1: VLM post-gen validation ──
    // For each successful image result, compare it against the reference and attach a verdict badge.
    if (mode === "image" && effectiveProductRef) {
      creativeResults
        .filter(r => r.success && r.imageUrl)
        .forEach(r => {
          // Mark pending
          setResults(prev => prev.map(x => x.id === r.id
            ? { ...x, validation: { status: "pending" } }
            : x));
          // Fire validation (non-blocking, independent per result)
          serverPost("/compare/validate-image", {
            generatedImageUrl: r.imageUrl,
            referenceImageUrl: effectiveProductRef,
            userBrief: prompt.slice(0, 500),
            // VLM audits against product or location criteria; pixel-perfect collapses to product mode
            mode: refType === "location" ? "location" : "product",
          }, 60_000).then((v: any) => {
            if (!v || v.skipped || !v.success) {
              setResults(prev => prev.map(x => x.id === r.id
                ? { ...x, validation: { status: "skipped" } }
                : x));
              return;
            }
            setResults(prev => prev.map(x => x.id === r.id
              ? {
                  ...x,
                  validation: {
                    status: "done",
                    score: v.score,
                    verdict: v.verdict,
                    match: v.match,
                    differences: v.differences || [],
                    hallucinations: v.hallucinations || [],
                    summary: v.summary || "",
                  },
                }
              : x));
          }).catch(() => {
            setResults(prev => prev.map(x => x.id === r.id
              ? { ...x, validation: { status: "error" } }
              : x));
          });
        });
    }

    // ── Auto-save all successful results to Library (fire-and-forget) ──
    // Shape expected by POST /library/items: { id, type, model, prompt, timestamp, preview, folderId }
    // Type mapping: image→"image", video→"film", music→"sound", text→"text"
    const libraryTypeFor = (m: CreativeMode) =>
      m === "video" ? "film" : m === "music" ? "sound" : m; // "image" | "text"
    const previewKindFor = (m: CreativeMode) =>
      m === "video" ? "film" : m === "music" ? "sound" : m === "image" ? "image" : "text";
    creativeResults
      .filter(r => r.success)
      .forEach(r => {
        const mInfo = catalog.find(c => c.id === r.modelId);
        const libItem: Record<string, unknown> = {
          id: r.id,
          type: libraryTypeFor(mode),
          model: {
            id: r.modelId,
            name: mInfo?.label || r.modelId,
            provider: (mInfo?.label || "").split(" ")[0] || "unknown",
            speed: r.timeMs < 5000 ? "fast" : r.timeMs < 20000 ? "medium" : "slow",
            quality: Math.round((r.scores.quality || 0) * 10),
          },
          prompt,
          timestamp: new Date().toISOString(),
          preview: {
            kind: previewKindFor(mode),
            imageUrl: r.imageUrl,
            videoUrl: r.videoUrl,
            audioUrl: r.audioUrl,
            text: r.text,
          },
          folderId: draftsFolderId || null,
          scores: r.scores,
          source: "compare",
        };
        serverPost("/library/items", { item: libItem }).catch(err => {
          console.warn(`[compare] auto-save failed for ${r.modelId}:`, err);
        });
      });
  }, [prompt, selectedModels, mode, isRunning, catalog, locale, serverGet, serverPost, pollVideo, pollSuno, attachedImages, refType, refSubject, musicDurationSec, musicInstrumental, musicLyrics, musicStyle, aspectRatio, textFormat, intent]);

  const bestResult = results.filter(r => r.success).sort((a, b) => b.scores.overall - a.scores.overall)[0];

  const totalCredits = selectedModels.reduce((s, id) => s + (catalog.find(c => c.id === id)?.credits || 0), 0);

  // Bottom bar height (for scroll padding) — collapsed pill vs expanded composer
  const BOTTOM_BAR_H = composerExpanded ? (attachedImages.length > 0 ? 280 : 240) : 80;

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>

{/* HEADER removed — no top bar. Only floating glass composer at bottom. */}

        {/* ═══ RESULTS AREA — full-screen above prompt bar ═══ */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: BOTTOM_BAR_H + 16 }}>
          <div
            className="max-w-7xl mx-auto px-6 py-4 flex flex-col"
            style={{ minHeight: `calc(100vh - ${BOTTOM_BAR_H + 80}px)` }}
          >

            {/* ── EMPTY STATE — minimal, invite à écrire ── */}
            {results.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #7C3AED15, #EC489915)" }}>
                  <Sparkles size={28} style={{ color: "#7C3AED" }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
                  {isFr ? "Créez ce que vous voulez" : "Create whatever you want"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 440, lineHeight: 1.6 }}>
                  {isFr
                    ? "Décrivez votre idée. Choisissez vos modèles. Comparez."
                    : "Describe your idea. Pick your models. Compare."}
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

            {/* ── RESULTS GRID — full-screen, glassmorphism hover ── */}
            {results.length > 0 && (() => {
              const n = results.length;
              const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
              const rows = n <= 2 ? 1 : n <= 6 ? 2 : Math.ceil(n / 3);
              const gridTemplate = {
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              } as const;
              return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col min-h-0">

                {/* Results header — compact */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {results.filter(r => r.success).length} {isFr ? "créations" : "creations"}
                    </span>
                    {bestResult && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: "#22c55e15", fontSize: 11, fontWeight: 600, color: "#22c55e" }}>
                        <Trophy size={11} /> {isFr ? "Meilleur :" : "Best:"} {bestResult.label} ({bestResult.scores.overall}/100)
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      {isFr ? "Survolez pour voir les KPI" : "Hover to reveal KPIs"}
                    </span>
                  </div>
                </div>

                {/* ── UNIFIED FULL-SCREEN GRID (image · video · text) ── */}
                <div className="flex-1 grid gap-4 min-h-0" style={{ ...gridTemplate, minHeight: `calc(100vh - ${BOTTOM_BAR_H + 180}px)` }}>
                  {results.map(r => {
                    const isBest = r.modelId === bestResult?.modelId;
                    const { color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                    const mInfo = catalog.find(c => c.id === r.modelId);
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-2xl overflow-hidden group cursor-pointer"
                        style={{
                          background: mode === "text" ? "#FFFFFF" : mode === "music" ? "linear-gradient(135deg, #1a0a2e 0%, #2d1a3e 50%, #4a1a3a 100%)" : "#0a0a0a",
                          border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)",
                          boxShadow: isBest ? `0 0 0 3px ${gradeColor}22` : "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                        onClick={() => r.success && (mode !== "text" && mode !== "music") && setLightbox(r)}
                      >
                        {/* ── Media / Text content (absolute fill) ── */}
                        {r.success && mode === "image" && r.imageUrl && (
                          <img src={r.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt={r.label} />
                        )}
                        {r.success && mode === "video" && r.videoUrl && (
                          <div className="absolute inset-0">
                            <video
                              src={r.videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="metadata"
                              className="absolute inset-0 w-full h-full object-cover"
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                v.play().catch((err) => {
                                  console.warn("[compare] video autoplay blocked:", err?.message);
                                });
                              }}
                              onError={(e) => {
                                console.warn("[compare] video load error", e.currentTarget.error?.message, "src=", r.videoUrl?.slice(0, 80));
                              }}
                            />
                            {/* Unmute button — overlaid on video card */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const video = e.currentTarget.parentElement?.querySelector("video");
                                if (video) { video.muted = !video.muted; e.currentTarget.textContent = video.muted ? "🔇" : "🔊"; }
                              }}
                              className="absolute bottom-2 right-2 z-10 rounded-full cursor-pointer"
                              style={{ background: "rgba(0,0,0,0.55)", color: "#fff", width: 28, height: 28, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", border: "none", backdropFilter: "blur(4px)" }}
                              title="Toggle sound"
                            >🔇</button>
                          </div>
                        )}
                        {r.success && mode === "music" && r.audioUrl && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-5 gap-4" onClick={e => e.stopPropagation()}>
                            {/* Animated waveform visual */}
                            <div className="flex items-end gap-1 h-20">
                              {Array.from({ length: 24 }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 rounded-full"
                                  style={{ background: `linear-gradient(to top, ${gradeColor}, #EC4899)` }}
                                  animate={{ height: ["20%", "90%", "40%", "70%", "30%"] }}
                                  transition={{ duration: 1.2 + (i % 5) * 0.15, repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
                                />
                              ))}
                            </div>
                            <div className="text-center">
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{r.label}</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{(r.timeMs / 1000).toFixed(1)}s · {mInfo?.badge}</div>
                            </div>
                            <audio
                              src={r.audioUrl}
                              controls
                              className="w-full max-w-xs"
                              style={{ height: 36 }}
                            />
                            <a
                              href={r.audioUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 600, color: "#fff" }}
                            >
                              <Download size={12} /> {isFr ? "Télécharger" : "Download"}
                            </a>
                          </div>
                        )}
                        {r.success && mode === "text" && (
                          <div className="absolute inset-0 overflow-y-auto px-5 py-4">
                            <div className="flex items-center justify-between mb-3">
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{r.label}</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                              {r.text}
                            </div>
                          </div>
                        )}
                        {!r.success && (
                          <div className="absolute inset-0 flex items-center justify-center px-4" style={{ background: "var(--secondary)" }}>
                            <div className="text-center max-w-full">
                              <AlertTriangle size={28} style={{ color: "#ef4444", margin: "0 auto 8px" }} />
                              <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4, wordBreak: "break-word", maxHeight: 120, overflow: "auto" }}>
                                {r.error || "Failed"}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Best badge (always visible) ── */}
                        {isBest && r.success && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg z-10"
                            style={{ background: gradeColor, color: "#fff", fontSize: 10, fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                            <Trophy size={10} /> {isFr ? "Recommandé" : "Best"}
                          </div>
                        )}

                        {/* ── Sprint 1: VLM validation verdict badge (top-right) ── */}
                        {r.success && mode === "image" && r.validation && (
                          (() => {
                            const v = r.validation!;
                            if (v.status === "pending") {
                              return (
                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg z-10"
                                  style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", fontSize: 9, fontWeight: 700, color: "#fff" }}
                                  title={isFr ? "Validation fidélité produit..." : "Validating product fidelity..."}>
                                  <Loader2 size={9} className="animate-spin" />
                                  {isFr ? "Vérif." : "Check"}
                                </div>
                              );
                            }
                            if (v.status !== "done" || !v.verdict) return null;
                            const verdictMap: Record<string, { bg: string; icon: string; labelFr: string; labelEn: string }> = {
                              excellent: { bg: "#22c55e", icon: "✓", labelFr: "Fidèle", labelEn: "Match" },
                              good:      { bg: "#84cc16", icon: "✓", labelFr: "OK",     labelEn: "OK" },
                              drift:     { bg: "#f59e0b", icon: "!", labelFr: "Dérive", labelEn: "Drift" },
                              wrong:     { bg: "#ef4444", icon: "✗", labelFr: "HS",     labelEn: "Wrong" },
                            };
                            const vd = verdictMap[v.verdict];
                            const tooltip = v.summary || (v.differences && v.differences.length > 0 ? v.differences.join(" • ") : "");
                            return (
                              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg z-10"
                                style={{ background: vd.bg, color: "#fff", fontSize: 9, fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
                                title={tooltip}>
                                <span style={{ fontSize: 10 }}>{vd.icon}</span>
                                {isFr ? vd.labelFr : vd.labelEn}
                                <span style={{ opacity: 0.85, marginLeft: 2 }}>{v.score}</span>
                              </div>
                            );
                          })()
                        )}

                        {/* ── Model label badge (bottom, visible when not hovering) ── */}
                        {r.success && mode !== "text" && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg z-10 group-hover:opacity-0 transition-opacity"
                            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{r.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>
                          </div>
                        )}

                        {/* ── Action buttons on hover (image/video only) ── */}
                        {r.success && (mode === "image" || mode === "video") && (r.imageUrl || r.videoUrl) && (
                          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Download */}
                            <a
                              href={r.imageUrl || r.videoUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                              style={{
                                background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
                                border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                fontSize: 11, fontWeight: 700, color: "#1a1a1a",
                              }}
                            >
                              <Download size={11} /> {isFr ? "Télécharger" : "Download"}
                            </a>
                            {/* Edit in Editor */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/hub/editor", {
                                  state: {
                                    assetUrl: r.imageUrl || r.videoUrl,
                                    assetId: r.id,
                                    assetType: mode,
                                    prompt,
                                    model: r.modelId,
                                  },
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                              style={{
                                background: "rgba(124,58,237,0.92)", backdropFilter: "blur(12px)",
                                border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
                                fontSize: 11, fontWeight: 700, color: "#fff",
                              }}
                            >
                              <Pencil size={11} /> {isFr ? "Éditer" : "Edit"}
                            </button>
                            {/* Publish */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPublishTarget({ imageUrl: (r.imageUrl || r.videoUrl)!, defaultCaption: prompt });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                              style={{
                                background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                fontSize: 11, fontWeight: 700, color: "#fff",
                              }}
                            >
                              <Share2 size={11} /> {isFr ? "Publier" : "Publish"}
                            </button>
                          </div>
                        )}

                        {/* ── Glassmorphism KPI overlay on hover ── */}
                        {r.success && (
                          <KpiOverlay result={r} mInfo={mInfo} mode={mode} isFr={isFr} />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              );
            })()}

            <div ref={resultsEndRef} />
          </div>
        </div>

        {/* ═══ FLOATING GLASS COMPOSER — expandable/collapsible ═══ */}
        <div className="flex-shrink-0 fixed bottom-0 right-0 z-40" style={{ left: 52 }}>
          <div className="max-w-5xl mx-auto px-6 pb-5 pt-3">
            {/* Collapsed pill */}
            <AnimatePresence mode="wait">
              {!composerExpanded ? (
                <motion.button
                  key="collapsed"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => { setComposerExpanded(true); setTimeout(() => textareaRef.current?.focus(), 150); }}
                  className="w-full rounded-full flex items-center gap-3 px-5 py-3.5 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(22px) saturate(160%)",
                    WebkitBackdropFilter: "blur(22px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                    <Sparkles size={14} style={{ color: "#fff" }} />
                  </div>
                  <span className="flex-1 text-left truncate" style={{ fontSize: 14, fontWeight: 500, color: prompt ? "var(--foreground)" : "var(--muted-foreground)" }}>
                    {prompt || (isFr ? "Décrivez votre idée..." : "Describe your idea...")}
                  </span>
                  {selectedModels.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 10, fontWeight: 700 }}>
                      <Zap size={9} /> {selectedModels.length}
                    </span>
                  )}
                  {scrapedUrls && scrapedUrls.pagesScraped > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", fontSize: 9, fontWeight: 700 }}
                      title={isFr ? `${scrapedUrls.pagesScraped} page(s) analysée(s), ${scrapedUrls.imagesFound} image(s) produit` : `${scrapedUrls.pagesScraped} page(s) scraped, ${scrapedUrls.imagesFound} product image(s)`}>
                      🔗 {scrapedUrls.pagesScraped}
                    </span>
                  )}
                  <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)" }}>
                    {mode === "image" ? <ImageIcon size={13} /> : mode === "text" ? <Type size={13} /> : mode === "video" ? <Video size={13} /> : <Music size={13} />}
                    {mode !== "music" && <span>{mode === "text" ? FORMAT_OPTIONS.find(f => f.id === textFormat)?.label?.split(" ")[0] || textFormat : FORMAT_OPTIONS.find(f => f.id === aspectRatio)?.sub || aspectRatio}</span>}
                  </span>
                </motion.button>
              ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl relative"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(28px) saturate(170%)",
                  WebkitBackdropFilter: "blur(28px) saturate(170%)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)",
                }}
              >
              {/* Collapse button — top right of expanded composer */}
              <button
                onClick={() => setComposerExpanded(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer z-10 transition-all"
                style={{ background: "rgba(0,0,0,0.05)", color: "var(--muted-foreground)" }}
                title={isFr ? "Réduire" : "Collapse"}
              >
                <ChevronDown size={14} />
              </button>

              {/* Mode tabs — inside expanded composer */}
              <div className="px-4 pt-4 pb-2 flex items-center gap-1">
                {([
                  { id: "image" as CreativeMode, icon: ImageIcon, label: "Image" },
                  { id: "text" as CreativeMode, icon: Type, label: isFr ? "Texte" : "Text" },
                  { id: "video" as CreativeMode, icon: Video, label: "Vidéo" },
                  { id: "music" as CreativeMode, icon: Music, label: isFr ? "Musique" : "Music" },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setMode(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    style={{
                      background: mode === tab.id ? "var(--foreground)" : "rgba(255,255,255,0.5)",
                      color: mode === tab.id ? "var(--background)" : "var(--muted-foreground)",
                      fontWeight: mode === tab.id ? 700 : 500, fontSize: 11,
                      border: mode === tab.id ? "1px solid var(--foreground)" : "1px solid rgba(0,0,0,0.06)",
                    }}>
                    <tab.icon size={11} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* ═══ Compact toolbar: Format + Intent + Models — one row ═══ */}
              <div className="px-4 pt-1 pb-1 flex items-center gap-2 flex-wrap">

                {/* FORMAT — segmented control */}
                {FORMAT_OPTIONS.length > 0 && (
                  <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}>
                    {FORMAT_OPTIONS.map(f => {
                      const on = currentFormat === f.id;
                      return (
                        <button key={f.id} onClick={() => setCurrentFormat(f.id)}
                          className="flex items-center gap-1 px-2 py-1 cursor-pointer transition-all"
                          style={{
                            background: on ? "var(--foreground)" : "transparent",
                            color: on ? "var(--background)" : "var(--muted-foreground)",
                            fontSize: 10, fontWeight: on ? 700 : 500,
                            borderRight: "1px solid rgba(0,0,0,0.06)",
                          }}>
                          <span>{f.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Separator */}
                {FORMAT_OPTIONS.length > 0 && mode !== "music" && (
                  <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />
                )}

                {/* INTENT — dropdown trigger + popover */}
                {mode !== "music" && (
                  <div ref={intentDropdownRef} className="relative flex-shrink-0">
                    <button
                      onClick={() => { setShowIntentDropdown(!showIntentDropdown); setShowModelPicker(false); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: intent !== "auto" ? "var(--foreground)" : "rgba(0,0,0,0.02)",
                        color: intent !== "auto" ? "var(--background)" : "var(--muted-foreground)",
                        border: `1px solid ${intent !== "auto" ? "var(--foreground)" : "rgba(0,0,0,0.08)"}`,
                        fontSize: 10, fontWeight: 600,
                      }}>
                      <span style={{ fontSize: 11 }}>{getIntentPreset(intent).icon}</span>
                      <span>{isFr ? getIntentPreset(intent).labelFr : getIntentPreset(intent).labelEn}</span>
                      <ChevronDown size={9} style={{ opacity: 0.6, transform: showIntentDropdown ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>
                    <AnimatePresence>
                      {showIntentDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-0 bottom-full mb-1 z-50 rounded-xl overflow-hidden"
                          style={{
                            background: "rgba(255,255,255,0.97)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            boxShadow: "0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.06)",
                            minWidth: 220,
                          }}>
                          {INTENT_PRESETS.map(p => {
                            const on = intent === p.id;
                            return (
                              <button key={p.id}
                                onClick={() => { setIntent(p.id); setShowIntentDropdown(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer transition-all text-left"
                                style={{
                                  background: on ? "var(--foreground)" : "transparent",
                                  color: on ? "var(--background)" : "var(--foreground)",
                                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                                }}>
                                <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{p.icon}</span>
                                <div className="flex flex-col min-w-0">
                                  <span style={{ fontSize: 11, fontWeight: on ? 700 : 600 }}>
                                    {isFr ? p.labelFr : p.labelEn}
                                  </span>
                                  <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400 }}>
                                    {isFr ? p.descFr : p.descEn}
                                  </span>
                                </div>
                                {on && <CheckCircle2 size={10} className="ml-auto flex-shrink-0" style={{ opacity: 0.7 }} />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Separator before models */}
                <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />

                {/* MODELS — dropdown trigger */}
                <div ref={modelDropdownRef} className="relative flex-shrink-0">
                  <button onClick={() => { setShowModelPicker(!showModelPicker); setShowIntentDropdown(false); }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all flex-shrink-0"
                    style={{
                      background: selectedModels.length > 0 ? "var(--foreground)" : "rgba(0,0,0,0.02)",
                      color: selectedModels.length > 0 ? "var(--background)" : "var(--muted-foreground)",
                      border: `1px solid ${selectedModels.length > 0 ? "var(--foreground)" : "rgba(0,0,0,0.08)"}`,
                      fontSize: 10, fontWeight: 600,
                    }}>
                    <Zap size={9} />
                    {selectedModels.length > 0
                      ? `${selectedModels.length} ${isFr ? "modèle(s)" : "model(s)"} · ${totalCredits}cr`
                      : (isFr ? "Modèles" : "Models")}
                    <ChevronDown size={9} style={{ opacity: 0.6, transform: showModelPicker ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                  <AnimatePresence>
                    {showModelPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 bottom-full mb-1 z-50 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.97)",
                          border: "1px solid rgba(0,0,0,0.08)",
                          boxShadow: "0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.06)",
                          minWidth: 340, maxWidth: 420, maxHeight: 360, overflowY: "auto",
                        }}>
                        <div className="flex flex-col gap-1 p-2.5">
                          {SEGMENTS_BY_MODE[mode].map(seg => {
                            const modelsInSeg = catalog.filter(m => m.segment === seg.id);
                            if (modelsInSeg.length === 0) return null;
                            return (
                              <div key={seg.id} className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 px-1 pt-1">
                                  <span style={{ fontSize: 10 }}>{seg.icon}</span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    {isFr ? seg.labelFr : seg.labelEn}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {modelsInSeg.map(m => {
                                    const on = selectedModels.includes(m.id);
                                    const dis = !on && selectedModels.length >= maxModels;
                                    const tierC = m.tier === "premium" ? "#7C3AED" : m.tier === "economy" ? "#22c55e" : "var(--muted-foreground)";
                                    return (
                                      <button key={m.id} onClick={() => !dis && toggleModel(m.id)}
                                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 cursor-pointer transition-all"
                                        style={{
                                          fontSize: 10, fontWeight: on ? 700 : 500,
                                          background: on ? "var(--foreground)" : "rgba(0,0,0,0.03)",
                                          color: on ? "var(--background)" : "var(--foreground)",
                                          border: `1px solid ${on ? "var(--foreground)" : "rgba(0,0,0,0.06)"}`,
                                          opacity: dis ? 0.3 : 1, cursor: dis ? "not-allowed" : "pointer",
                                        }}>
                                        {on && <CheckCircle2 size={8} />}
                                        {m.label}
                                        <span style={{ fontSize: 7, color: on ? "var(--background)" : tierC, opacity: on ? 0.7 : 1, fontWeight: 700 }}>{m.credits}cr</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Music options toggle — only in music mode */}
                {mode === "music" && (
                  <button onClick={() => setShowMusicOptions(!showMusicOptions)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all flex-shrink-0"
                    style={{
                      background: showMusicOptions ? "var(--foreground)" : "rgba(0,0,0,0.02)",
                      color: showMusicOptions ? "var(--background)" : "var(--muted-foreground)",
                      border: `1px solid ${showMusicOptions ? "var(--foreground)" : "rgba(0,0,0,0.08)"}`,
                      fontSize: 10, fontWeight: 600,
                    }}>
                    <Music size={9} />
                    {musicDurationSec}s{musicInstrumental ? " · instru" : ""}{musicLyrics.trim() ? " · paroles" : ""}
                    <ChevronDown size={9} style={{ opacity: 0.6, transform: showMusicOptions ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                )}

                {/* Selected model pills — inline */}
                {selectedModels.map(id => {
                  const m = catalog.find(c => c.id === id);
                  return m ? (
                    <span key={id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: "rgba(0,0,0,0.06)", color: "var(--foreground)", fontSize: 9, fontWeight: 600 }}>
                      {m.label}
                      <button onClick={() => toggleModel(id)} className="cursor-pointer opacity-40 hover:opacity-100"><X size={7} /></button>
                    </span>
                  ) : null;
                })}

              </div>

              {/* Brand preview banner — shown once URL scraping has returned a brand DNA.
                  Compact inline card: logo thumbnail + palette dots + brand name + font. */}
              <AnimatePresence>
                {brandDNA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-2"
                  >
                    <div
                      className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(59,130,246,0.06) 100%)",
                        border: "1px solid rgba(34,197,94,0.25)",
                      }}
                    >
                      {/* Logo thumbnail */}
                      {brandDNA.logo ? (
                        <img
                          src={brandDNA.logo}
                          alt="brand logo"
                          className="w-9 h-9 rounded-md object-contain flex-shrink-0"
                          style={{ background: "#fff", padding: 2, border: "1px solid rgba(0,0,0,0.06)" }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(0,0,0,0.05)", fontSize: 14 }}>🎨</div>
                      )}

                      {/* Brand info */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>
                            {brandDNA.meta.title ? brandDNA.meta.title.slice(0, 40) : (isFr ? "Marque détectée" : "Brand detected")}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {isFr ? "DNA extrait" : "DNA extracted"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Palette dots */}
                          <div className="flex items-center gap-0.5">
                            {brandDNA.palette.all.slice(0, 5).map((hex, idx) => (
                              <div
                                key={`${hex}-${idx}`}
                                className="w-3 h-3 rounded-full"
                                style={{ background: hex, border: "1px solid rgba(0,0,0,0.1)" }}
                                title={hex}
                              />
                            ))}
                            {brandDNA.palette.all.length === 0 && (
                              <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>—</span>
                            )}
                          </div>
                          {/* Font name */}
                          {brandDNA.fonts.length > 0 && (
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 500 }}>
                              · {brandDNA.fonts[0]}
                            </span>
                          )}
                          {/* Socials */}
                          {brandDNA.socialUrls.length > 0 && (
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 500 }}>
                              · {brandDNA.socialUrls.length} {isFr ? "réseaux" : "socials"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => { setBrandDNA(null); setStoredEnrichment(""); }}
                        className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                        style={{ background: "rgba(0,0,0,0.05)" }}
                        title={isFr ? "Ignorer la marque" : "Ignore brand"}
                      >
                        <X size={10} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attached reference preview + type toggle (Product / Pixel-Perfect / Location)
                  Shown whenever a reference will be used: either uploaded image OR URL detected in prompt */}
              <AnimatePresence>
                {(attachedImages.length > 0 || (promptHasUrl && (mode === "image" || mode === "video"))) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-3">
                    <div className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      {/* Multi-ref thumbnails */}
                      {attachedImages.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {attachedImages.map((img, idx) => (
                            <div key={img.preview} className="relative group">
                              <img src={img.preview} className="w-10 h-10 rounded-lg object-cover" alt={`ref ${idx + 1}`}
                                style={{ opacity: img.uploading ? 0.5 : 1, border: idx === 0 ? "2px solid var(--accent)" : "1px solid var(--border)" }} />
                              {img.uploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent)" }} />
                                </div>
                              )}
                              <button onClick={() => removeAttachedImage(idx)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center cursor-pointer hidden group-hover:flex"
                                style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 8 }}>
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                          {/* Add more button */}
                          {attachedImages.length < MAX_REF_IMAGES && (
                            <button onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                              style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}
                              title={isFr ? `Ajouter (${attachedImages.length}/${MAX_REF_IMAGES})` : `Add (${attachedImages.length}/${MAX_REF_IMAGES})`}>
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", fontSize: 16 }}>
                          🔗
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
                          {refType === "location"
                            ? (isFr ? "Photo du lieu" : "Location photo")
                            : refType === "pixel-perfect"
                              ? (isFr ? "Pixel-Perfect" : "Pixel-Perfect")
                              : attachedImages.length > 1
                                ? (isFr ? `${attachedImages.length} photos produit` : `${attachedImages.length} product photos`)
                                : (isFr ? "Photo produit" : "Product photo")}
                        </span>
                        {attachedImages.length > 0 ? (
                          attachedImages.some(img => img.uploading) ? (
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                              <Loader2 size={9} className="animate-spin" /> {isFr ? "Upload..." : "Uploading..."}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 500 }}>
                              {attachedImages.length > 1
                                ? (isFr ? `${attachedImages.length} refs prêtes` : `${attachedImages.length} refs ready`)
                                : (isFr ? "Prêt" : "Ready")}
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 500 }}>{isFr ? "URL détectée" : "URL detected"}</span>
                        )}
                      </div>
                      {/* Ref type segmented toggle — 3 modes */}
                      <div className="flex items-center rounded-lg overflow-hidden ml-1" style={{ border: "1px solid var(--border)" }}>
                        <button
                          type="button"
                          onClick={() => setRefType("product")}
                          className="px-2 py-1 cursor-pointer transition-all"
                          style={{
                            background: refType === "product" ? "var(--foreground)" : "transparent",
                            color: refType === "product" ? "var(--background)" : "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                          title={isFr ? "Génératif — Nano Banana / Kontext / Flux Pro 2" : "Generative — Nano Banana / Kontext / Flux Pro 2"}
                        >
                          {isFr ? "Produit" : "Product"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefType("pixel-perfect")}
                          className="px-2 py-1 cursor-pointer transition-all"
                          style={{
                            background: refType === "pixel-perfect" ? "var(--foreground)" : "transparent",
                            color: refType === "pixel-perfect" ? "var(--background)" : "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 600,
                            borderLeft: "1px solid var(--border)",
                            borderRight: "1px solid var(--border)",
                          }}
                          title={isFr ? "0% dérive — découpe non-générative + scène AI (Photoroom Studio / Bria / IC-Light)" : "0% drift — non-generative cutout + AI scene (Photoroom Studio / Bria / IC-Light)"}
                        >
                          {isFr ? "Pixel-Perfect" : "Pixel-Perfect"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefType("location")}
                          className="px-2 py-1 cursor-pointer transition-all"
                          style={{
                            background: refType === "location" ? "var(--foreground)" : "transparent",
                            color: refType === "location" ? "var(--background)" : "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                          title={isFr ? "Préserve l'architecture / le lieu (ControlNet Depth)" : "Preserve architecture / venue (Depth ControlNet)"}
                        >
                          {isFr ? "Lieu" : "Location"}
                        </button>
                      </div>
                      {attachedImages.length > 0 && (
                        <button onClick={() => removeAttachedImage()} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ml-1"
                          style={{ background: "var(--secondary)" }}
                          title={isFr ? "Retirer toutes les photos" : "Remove all photos"}>
                          <X size={10} style={{ color: "var(--muted-foreground)" }} />
                        </button>
                      )}
                    </div>
                    {/* VLM-detected subject — shows what the AI understood the reference to be */}
                    {refSubject?.subject && (
                      <div className="mt-1 text-[10px] leading-tight" style={{ color: "var(--muted-foreground)", maxWidth: 480 }}>
                        <span style={{ fontWeight: 600 }}>{isFr ? "Sujet détecté :" : "Detected subject:"}</span>{" "}
                        <span style={{ fontStyle: "italic" }}>{refSubject.subject}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* (Models picker is now integrated in the compact toolbar above) */}

              {/* Music options panel */}
              <AnimatePresence>
                {mode === "music" && showMusicOptions && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2 overflow-hidden">
                    <div className="pt-1 flex flex-col gap-2.5">
                      {/* Duration slider + instrumental toggle */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", minWidth: 52 }}>
                            {isFr ? "Durée" : "Length"}
                          </span>
                          <input
                            type="range"
                            min={10}
                            max={180}
                            step={5}
                            value={musicDurationSec}
                            onChange={e => setMusicDurationSec(Number(e.target.value))}
                            className="flex-1"
                            style={{ accentColor: "var(--foreground)" }}
                          />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", minWidth: 36, textAlign: "right" }}>
                            {musicDurationSec}s
                          </span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg"
                          style={{ background: musicInstrumental ? "var(--foreground)" : "var(--secondary)", color: musicInstrumental ? "var(--background)" : "var(--muted-foreground)", fontSize: 10, fontWeight: 600, border: "1px solid var(--border)" }}>
                          <input
                            type="checkbox"
                            checked={musicInstrumental}
                            onChange={e => setMusicInstrumental(e.target.checked)}
                            className="hidden"
                          />
                          {musicInstrumental && <CheckCircle2 size={10} />}
                          {isFr ? "Instrumental" : "Instrumental"}
                        </label>
                      </div>

                      {/* Style input */}
                      <input
                        type="text"
                        value={musicStyle}
                        onChange={e => setMusicStyle(e.target.value)}
                        placeholder={isFr ? "Style (optionnel) — ex: synthwave, lo-fi, orchestral..." : "Style (optional) — e.g. synthwave, lo-fi, orchestral..."}
                        className="w-full px-2.5 py-1.5 rounded-lg outline-none"
                        style={{ fontSize: 11, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                      />

                      {/* Lyrics textarea — disabled when instrumental */}
                      <div className="relative">
                        <textarea
                          value={musicLyrics}
                          onChange={e => setMusicLyrics(e.target.value)}
                          disabled={musicInstrumental}
                          placeholder={musicInstrumental
                            ? (isFr ? "Paroles désactivées (mode instrumental)" : "Lyrics disabled (instrumental mode)")
                            : (isFr ? "Paroles (optionnel) — laissez vide pour que l'IA les écrive" : "Lyrics (optional) — leave empty for AI-written lyrics")}
                          className="w-full resize-none outline-none px-2.5 py-1.5 rounded-lg"
                          rows={3}
                          style={{ fontSize: 11, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", opacity: musicInstrumental ? 0.4 : 1 }}
                        />
                        {!musicInstrumental && musicLyrics.trim() && (
                          <span className="absolute bottom-1 right-2" style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                            {musicLyrics.trim().split(/\s+/).length} {isFr ? "mots" : "words"}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 9, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                        {isFr
                          ? "Suno accepte paroles et style séparément. ElevenLabs fusionne tout dans un brief unique."
                          : "Suno accepts lyrics and style as separate fields. ElevenLabs merges everything into a single brief."}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="px-4 pb-3 flex items-end gap-2">
                {/* Attach button (image & video modes) */}
                {(mode === "image" || mode === "video") && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { const files = e.target.files; if (files) { Array.from(files).forEach(f => handleAttachImage(f)); } e.target.value = ""; }} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                      style={{ background: attachedImages.length > 0 ? "var(--accent-warm-light)" : "var(--secondary)", color: attachedImages.length > 0 ? "var(--accent)" : "var(--muted-foreground)", border: "1px solid var(--border)" }}
                      title={isFr ? `Joindre photo(s) produit (${attachedImages.length}/${MAX_REF_IMAGES})` : `Attach product photo(s) (${attachedImages.length}/${MAX_REF_IMAGES})`}>
                      <Paperclip size={14} />
                    </button>
                  </>
                )}

                {/* Textarea */}
                <div className="flex-1 relative">
                  {/* URL detection + Inspire me + scene suggestions */}
                  {(() => {
                    const urlRe = /https?:\/\/[^\s<>"')]+/gi;
                    const urls = (prompt.match(urlRe) || []).slice(0, 3);
                    const hasUrl = urls.length > 0;
                    const showInspire = (hasUrl || brandDNA) && (mode === "image" || mode === "video") && !isRunning;
                    if (!hasUrl && sceneSuggestions.length === 0 && !showInspire) return null;
                    return (
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {hasUrl && isScraping ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(124, 58, 237, 0.1)", color: "#7C3AED", fontSize: 9, fontWeight: 700 }}>
                            <Loader2 size={8} className="animate-spin" />
                            {isFr ? "Analyse..." : "Scraping..."}
                          </span>
                        ) : hasUrl ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", fontSize: 9, fontWeight: 700 }}>
                            🔗 {urls.length} {isFr ? `URL${urls.length > 1 ? "s" : ""} — seront analysées` : `URL${urls.length > 1 ? "s" : ""} — will be scraped`}
                          </span>
                        ) : null}
                        {/* Inspire me button */}
                        {showInspire && sceneSuggestions.length === 0 && (
                          <button
                            onClick={runInspireMe}
                            disabled={isLoadingSuggestions}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition-all disabled:opacity-50"
                            style={{ background: "rgba(124, 58, 237, 0.08)", color: "#7C3AED", fontSize: 9, fontWeight: 700, border: "1px solid rgba(124, 58, 237, 0.15)" }}>
                            {isLoadingSuggestions ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                            {isLoadingSuggestions ? (isFr ? "Inspiration..." : "Inspiring...") : (isFr ? "Inspire-moi" : "Inspire me")}
                          </button>
                        )}
                        {/* Scene suggestion chips */}
                        {sceneSuggestions.map((scene, idx) => (
                          <button key={idx}
                            onClick={() => { setPrompt(prev => { const stripped = prev.replace(/https?:\/\/[^\s<>"')]+/gi, "").trim(); return stripped ? `${stripped} ${scene}` : scene; }); setSceneSuggestions([]); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition-all"
                            style={{ background: "rgba(124, 58, 237, 0.06)", color: "#7C3AED", fontSize: 9, fontWeight: 600, border: "1px solid rgba(124, 58, 237, 0.12)" }}>
                            <Sparkles size={7} />
                            {scene}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGeneration(); } }}
                    placeholder={mode === "image"
                      ? (isFr ? "Décrivez votre visuel... (ou dictez avec le micro)" : "Describe your visual... (or dictate)")
                      : mode === "text"
                        ? (isFr ? "Décrivez votre contenu..." : "Describe your content...")
                        : mode === "video"
                          ? (isFr ? "Décrivez votre vidéo..." : "Describe your video...")
                          : (isFr ? "Décrivez votre musique... (genre, tempo, mood, instruments)" : "Describe your music... (genre, tempo, mood, instruments)")}
                    className="w-full resize-none outline-none"
                    rows={3}
                    style={{ fontSize: 16, color: "var(--foreground)", background: "transparent", lineHeight: 1.55 }}
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
              </motion.div>
              )}
            </AnimatePresence>
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
                <video
                  src={lightbox.videoUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  className="max-w-full max-h-full rounded-2xl"
                  onLoadedMetadata={(e) => {
                    // Browser autoplay policy requires muted for unattended autoplay.
                    // User can unmute via the controls once playback starts.
                    const v = e.currentTarget;
                    v.play().catch((err) => {
                      console.warn("[compare] lightbox video autoplay blocked:", err?.message);
                    });
                  }}
                  onError={(e) => {
                    console.warn("[compare] lightbox video load error", e.currentTarget.error?.message, "src=", lightbox.videoUrl?.slice(0, 80));
                  }}
                />
              )}
            </div>

            {/* KPI Panel */}
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 flex-shrink-0 overflow-y-auto"
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

                <div className="space-y-2">
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                    {isFr ? "Détail des scores" : "Score breakdown"}
                  </span>
                  {([
                    { label: isFr ? "Vitesse" : "Speed", value: lightbox.scores.speed },
                    { label: isFr ? "Valeur" : "Value", value: lightbox.scores.value },
                    { label: isFr ? "Qualité" : "Quality", value: lightbox.scores.quality },
                    { label: isFr ? "Fiabilité" : "Rely.", value: lightbox.scores.reliability },
                  ] as const).map(m => (
                    <div key={m.label} className="flex items-center gap-2" style={{ fontSize: 11 }}>
                      <span style={{ width: 56, color: "var(--muted-foreground)", flexShrink: 0, fontWeight: 500 }}>{m.label}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--secondary)" }}>
                        <div style={{ width: `${Math.max(2, m.value)}%`, height: "100%", borderRadius: 3, background: m.value >= 70 ? "#22c55e" : m.value >= 50 ? "#f59e0b" : "#ef4444", transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ width: 24, textAlign: "right", color: "var(--foreground)", fontWeight: 600, fontSize: 10 }}>{m.value}</span>
                    </div>
                  ))}
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
                  {(lightbox.imageUrl || lightbox.videoUrl) && (
                    <button
                      onClick={() => {
                        setPublishTarget({
                          imageUrl: lightbox.imageUrl,
                          videoUrl: lightbox.videoUrl,
                          defaultCaption: prompt,
                          libraryItemId: lightbox.id,
                        });
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all cursor-pointer"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>
                      <Share2 size={14} /> {isFr ? "Publier sur les réseaux" : "Publish to networks"}
                    </button>
                  )}
                  {(lightbox.imageUrl || lightbox.videoUrl) && (
                    <button
                      onClick={() => navigate("/hub/editor", {
                        state: {
                          assetUrl: lightbox.imageUrl || lightbox.videoUrl,
                          assetId: lightbox.id,
                          assetType: lightbox.videoUrl && !lightbox.imageUrl ? "video" : "image",
                          prompt,
                          model: lightbox.modelId,
                        },
                      })}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all cursor-pointer"
                      style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, border: "1px solid var(--border)" }}>
                      <Pencil size={14} /> {isFr ? "Modifier dans l'éditeur" : "Edit in editor"}
                    </button>
                  )}
                  {(lightbox.imageUrl || lightbox.videoUrl) && (
                    <a href={lightbox.imageUrl || lightbox.videoUrl} download target="_blank" rel="noreferrer"
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

      {/* ═══ PUBLISH MODAL ═══ */}
      <PublishModal
        open={!!publishTarget}
        asset={publishTarget || { defaultCaption: "" }}
        onClose={() => setPublishTarget(null)}
        onPublished={outcomes => {
          const published = outcomes.filter(o => o.status === "published").length;
          const scheduled = outcomes.filter(o => o.status === "scheduled").length;
          if (published > 0) toast.success(isFr ? `Publié sur ${published} réseau(x)` : `Published to ${published} network(s)`);
          if (scheduled > 0) toast.success(isFr ? `Planifié sur ${scheduled} réseau(x)` : `Scheduled on ${scheduled} network(s)`);
        }}
      />
    </RouteGuard>
  );
}
