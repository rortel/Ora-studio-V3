import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import {
  FolderOpen, FolderPlus, Search, Download, Trash2, MoreHorizontal,
  ImageIcon, FileText, Film, Music, Code2, ArrowUpDown,
  Check, X, Pencil, ChevronRight, Loader2, BookOpen,
  Plus, Grid3x3, List, Rocket, Eye, FolderInput, Sparkles,
  Instagram, Linkedin, Facebook, Camera, Clapperboard,
  Twitter, Youtube, ExternalLink, Copy, ChevronDown, ChevronUp,
  Upload, RefreshCw, Share2, Clock, CheckCircle2, Star,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { useI18n } from "../lib/i18n";
import { PHASE_1_ONLY } from "../lib/phase";
import { PublishModal, type PublishableAsset } from "../components/PublishModal";
import { bagel, COLORS } from "../components/ora/tokens";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface LibraryFolder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface Deployment {
  platform: string;
  status: "published" | "scheduled" | "failed";
  publishedAt?: string;
  scheduledFor?: string;
  url?: string;
}

interface LibraryItem {
  id: string;
  type: string;
  model: { id: string; name: string; provider: string; speed: string; quality: number };
  prompt: string;
  timestamp: string;
  preview: any;
  folderId: string | null;
  savedAt: string;
  updatedAt: string;
  customName?: string;
  classification?: {
    category: string;
    tags: string[];
    description: string;
    dominant_colors: string[];
  };
  deployments?: Deployment[];
}

/** Returns a compact badge for deployment status: "published", "scheduled", or null */
/* HealingImg — drop-in <img> replacement that auto-refreshes Supabase
 * signed URLs that have expired (400 status). On first error, calls
 * /storage/refresh-signed-url to swap in a fresh 365-day token. If the
 * second attempt also fails, shows a placeholder. Used for Library
 * thumbnails which were generated when signed URLs lived only 7 days
 * (most legacy items have already expired). */
function HealingImg(props: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackBg?: string }) {
  const { src: originalSrc, fallbackBg, onError: parentOnError, ...rest } = props;
  const [src, setSrc] = useState<string | undefined>(originalSrc as string | undefined);
  const [healed, setHealed] = useState(false);
  const [dead, setDead] = useState(false);
  // Reset when the underlying URL changes (new item).
  useEffect(() => { setSrc(originalSrc as string | undefined); setHealed(false); setDead(false); }, [originalSrc]);
  const handleError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (dead) { parentOnError?.(e); return; }
    if (healed || !originalSrc) { setDead(true); parentOnError?.(e); return; }
    try {
      const u = `${API_BASE}/storage/refresh-signed-url?url=${encodeURIComponent(originalSrc as string)}`;
      const r = await fetch(u, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      const d = await r.json().catch(() => ({}));
      if (d?.success && d.url) {
        setHealed(true);
        setSrc(d.url);
      } else {
        setDead(true); parentOnError?.(e);
      }
    } catch {
      setDead(true); parentOnError?.(e);
    }
  };
  if (dead) {
    return <div {...({ className: rest.className, style: { ...rest.style, background: fallbackBg || "linear-gradient(135deg, #EFEFF1, #F7F7F9)" } } as any)} />;
  }
  return <img {...rest} src={src} onError={handleError} />;
}

function getDeploymentBadge(item: LibraryItem): { label: string; color: string; icon: typeof CheckCircle2 } | null {
  const deps = item.deployments || [];
  if (deps.length === 0) return null;
  const published = deps.filter(d => d.status === "published");
  const scheduled = deps.filter(d => d.status === "scheduled");
  if (published.length > 0) {
    return { label: `${published.length} publié${published.length > 1 ? "s" : ""}`, color: "#22c55e", icon: CheckCircle2 };
  }
  if (scheduled.length > 0) {
    return { label: `${scheduled.length} planifié${scheduled.length > 1 ? "s" : ""}`, color: "#f59e0b", icon: Clock };
  }
  return null;
}

type SortMode = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "modified-desc";
type ViewMode = "grid" | "list";
type LibraryTab = "content" | "campaigns";

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */

function getItemName(item: LibraryItem): string {
  return item.customName || item.prompt || "Untitled";
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image": return ImageIcon;
    case "text": return FileText;
    case "code": return Code2;
    case "film": return Film;
    case "sound": return Music;
    default: return FileText;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "image": return "Image";
    case "text": return "Text";
    case "code": return "Code";
    case "film": return "Film";
    case "sound": return "Sound";
    default: return type;
  }
}

/** Resolve the best preview URL for a library item, no matter the shape:
 *  — campaigns (kind="campaign") surface their first asset's image/video
 *  — single images / films / sounds use their dedicated field
 *  — legacy items that only carry preview.imageUrl / videoUrl at the top
 *    level (no explicit kind) still render. */
function getAssetUrl(item: LibraryItem): string | null {
  const p: any = item?.preview;
  if (!p) return null;
  const kind: string = p.kind || item.type || "";
  const isCampaign =
    kind === "campaign" ||
    kind.startsWith?.("campaign") || // campaign-film, campaign-image, campaign-pack…
    Array.isArray(p.assets);

  if (isCampaign) {
    const assets = Array.isArray(p.assets) ? p.assets : Array.isArray((item as any).assets) ? (item as any).assets : [];
    const firstImg = assets.find((a: any) => a?.imageUrl);
    if (firstImg) return firstImg.imageUrl;
    const firstVid = assets.find((a: any) => a?.videoUrl);
    if (firstVid) return firstVid.videoUrl;
    return p.packshotUrl || p.lifestyleUrl || p.imageUrl || p.videoUrl || (item as any).thumbnail || null;
  }
  if (kind === "image") return p.imageUrl || p.videoUrl || p.audioUrl || null;
  if (kind === "film")  return p.videoUrl || p.imageUrl || null;
  if (kind === "sound") return p.audioUrl || null;
  // Unknown kind — salvage any URL the preview carries.
  return p.imageUrl || p.videoUrl || p.audioUrl || null;
}

/* Extract campaign data from library item (handles both old and new data shapes) */
function getCampaignData(item: LibraryItem) {
  const raw = item as any;
  const preview = raw.preview || {};
  const assets: any[] = preview.assets || raw.assets || [];
  const platforms: string[] = preview.platforms || raw.platforms || [...new Set(assets.map((a: any) => a.platform).filter(Boolean))];
  const headline = preview?.copy?.headline || raw.title || assets[0]?.headline || "";
  const deliverableCount = preview.deliverableCount || raw.formatCount || assets.length || 0;
  const imageAssets = assets.filter((a: any) => a.imageUrl);
  const videoAsset = assets.find((a: any) => a.videoUrl);
  const thumbnails = [
    preview.packshotUrl || raw.thumbnail || imageAssets[0]?.imageUrl || "",
    preview.lifestyleUrl || imageAssets[1]?.imageUrl || "",
  ].filter(Boolean);
  const videoUrl = preview.videoUrl || videoAsset?.videoUrl || "";
  const brief = raw.brief || raw.prompt || "";
  return { assets, platforms, headline, deliverableCount, thumbnails, videoUrl, brief };
}

function getPlatformIcon(p: string) {
  const lower = p.toLowerCase();
  if (lower.includes("instagram")) return Instagram;
  if (lower.includes("linkedin")) return Linkedin;
  if (lower.includes("facebook")) return Facebook;
  if (lower.includes("twitter") || lower.includes("x")) return Twitter;
  if (lower.includes("youtube")) return Youtube;
  if (lower.includes("tiktok")) return Clapperboard;
  return Sparkles;
}
function getPlatformColor(p: string) {
  const lower = p.toLowerCase();
  if (lower.includes("instagram")) return "#666666";
  if (lower.includes("linkedin")) return "#666666";
  if (lower.includes("facebook")) return "#666666";
  if (lower.includes("twitter") || lower.includes("x")) return "#666666";
  if (lower.includes("youtube")) return "#666666";
  if (lower.includes("tiktok")) return "#666666";
  return "var(--text-tertiary)";
}

function sortItems(items: LibraryItem[], mode: SortMode): LibraryItem[] {
  const sorted = [...items];
  switch (mode) {
    case "date-desc": return sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    case "date-asc": return sorted.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
    case "name-asc": return sorted.sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
    case "name-desc": return sorted.sort((a, b) => getItemName(b).localeCompare(getItemName(a)));
    case "modified-desc": return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    default: return sorted;
  }
}

/* ═══════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════ */

export function LibraryPage() {
  return (
    <RouteGuard requireAuth requireFeature="hub">
      <LibraryPageContent />
    </RouteGuard>
  );
}

function LibraryPageContent() {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";
  const { getAuthHeader } = useAuth();
  const [searchParams] = useSearchParams();
  // Phase 1: campaigns tab is hidden — force content tab regardless of query param.
  const initialTab = !PHASE_1_ONLY && searchParams.get("tab") === "campaigns" ? "campaigns" : "content";
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [moveTargetItem, setMoveTargetItem] = useState<string | null>(null);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null); // which campaign folder is open
  const [downloadingCampaign, setDownloadingCampaign] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PublishableAsset | null>(null);
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const navigate = useNavigate();
  const [repurposeItem, setRepurposeItem] = useState<LibraryItem | null>(null);
  const [repurposeFormats, setRepurposeFormats] = useState<string[]>(["linkedin-post", "instagram-caption", "newsletter-intro"]);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeResult, setRepurposeResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Server call helper with proper Authorization header
  const serverPost = useCallback((path: string, bodyData: any) => {
    const token = getAuthHeader();
    const url = `${API_BASE}${path}`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...bodyData, _token: token }),
    }).then(res => res.json());
  }, [getAuthHeader]);

  // Fetch library data
  const fetchData = useCallback(async () => {
    try {
      console.log("[Library] Fetching items + folders...");
      const [itemsData, foldersData] = await Promise.all([
        serverPost("/library/list", {}),
        serverPost("/library/folders-list", {}),
      ]);
      console.log("[Library] Loaded:", itemsData.items?.length || 0, "items,", foldersData.folders?.length || 0, "folders");
      if (itemsData.success) setItems(itemsData.items || []);
      if (foldersData.success) setFolders(foldersData.folders || []);
    } catch (err) {
      console.error("[Library] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [serverPost]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handle = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showSortMenu]);

  // Close context menu on click
  useEffect(() => {
    if (!contextMenu) return;
    const handle = () => setContextMenu(null);
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [contextMenu]);

  // Create folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      const data = await serverPost("/library/folders-create", { name: newFolderName.trim() });
      if (data.success && data.folder) {
        setFolders((prev) => [...prev, data.folder]);
      }
    } catch (err) {
      console.error("[Library] create folder error:", err);
    }
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName, serverPost]);

  // Rename folder
  const handleRenameFolder = useCallback(async (folderId: string) => {
    if (!editFolderName.trim()) { setEditingFolderId(null); return; }
    try {
      const data = await serverPost("/library/folders-rename", { folderId, name: editFolderName.trim() });
      if (data.success) {
        setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, name: editFolderName.trim() } : f));
      }
    } catch (err) {
      console.error("[Library] rename folder error:", err);
    }
    setEditingFolderId(null);
  }, [editFolderName, serverPost]);

  // Delete folder
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      await serverPost("/library/folders-delete", { folderId });
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setItems((prev) => prev.map((item) => item.folderId === folderId ? { ...item, folderId: null } : item));
      if (activeFolderId === folderId) setActiveFolderId(null);
    } catch (err) {
      console.error("[Library] delete folder error:", err);
    }
  }, [serverPost, activeFolderId]);

  // Delete item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      await serverPost("/library/items-delete", { itemId });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("[Library] delete item error:", err);
    }
  }, [serverPost]);

  // Toggle selection for an item
  const toggleSelected = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  // Exit select mode
  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk delete selected items
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmMsg = isFr
      ? `Supprimer définitivement ${count} élément${count > 1 ? "s" : ""} ? Cette action est irréversible.`
      : `Delete ${count} item${count > 1 ? "s" : ""} permanently? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try {
        await serverPost("/library/items-delete", { itemId: id });
      } catch (err) {
        failed++;
        console.error("[Library] bulk delete error:", err);
      }
    }
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setBulkDeleting(false);
    exitSelectMode();
    if (failed === 0) {
      toast.success(isFr ? `${count} élément${count > 1 ? "s supprimés" : " supprimé"}` : `${count} item${count > 1 ? "s deleted" : " deleted"}`);
    } else {
      toast.error(isFr ? `${failed} suppression${failed > 1 ? "s" : ""} échoué${failed > 1 ? "es" : "e"}` : `${failed} deletion${failed > 1 ? "s" : ""} failed`);
    }
  }, [selectedIds, serverPost, exitSelectMode, isFr]);

  // Move item to folder
  const handleMoveItem = useCallback(async (itemId: string, folderId: string | null) => {
    try {
      await serverPost("/library/items-update", { itemId, updates: { folderId } });
      setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, folderId } : item));
    } catch (err) {
      console.error("[Library] move item error:", err);
    }
    setMoveTargetItem(null);
  }, [serverPost]);

  // Upload files to library
  const ACCEPTED_TYPES = "image/*,video/*,audio/*";
  const handleUploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => {
      return f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/");
    });
    if (fileArray.length === 0) { toast.error("Format non supporté. Utilisez des images, vidéos ou sons."); return; }
    if (fileArray.some((f) => f.size > 200 * 1024 * 1024)) { toast.error("Fichier trop volumineux (max 200 Mo)"); return; }

    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;

    for (const file of fileArray) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const data = await serverPost("/library/upload", {
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          folderId: activeFolderId,
        });

        if (data.success && data.item) {
          setItems((prev) => [data.item, ...prev]);
          uploaded++;
        } else {
          console.error("[Upload] Failed:", data.error);
        }
      } catch (err) {
        console.error("[Upload] Error:", err);
      }
      setUploadProgress(Math.round(((fileArray.indexOf(file) + 1) / fileArray.length) * 100));
    }

    setUploading(false);
    setUploadProgress(0);
    if (uploaded > 0) {
      const typeLabel = uploaded === 1 ? "fichier importé" : "fichiers importés";
      toast.success(`${uploaded} ${typeLabel}`);
    }
  }, [serverPost, activeFolderId]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleUploadFiles(e.dataTransfer.files);
  }, [handleUploadFiles]);

  // Download asset
  const handleDownload = useCallback(async (item: LibraryItem) => {
    const url = getAssetUrl(item);
    if (!url) {
      // For text/code, download as text file
      if (item.preview?.kind === "text" || item.preview?.kind === "code") {
        const text = item.preview.kind === "text" ? item.preview.excerpt : item.preview.snippet;
        const ext = item.preview.kind === "code" ? ".ts" : ".txt";
        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${getItemName(item).slice(0, 40)}${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      return;
    }
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = item.type === "image" ? ".png" : item.type === "film" ? ".mp4" : item.type === "sound" ? ".mp3" : "";
      a.download = `${getItemName(item).slice(0, 40)}${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(t("library.downloadStarted"));
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  }, []);

  // Download a single campaign asset (image/video/text)
  const downloadAssetFile = useCallback(async (asset: any, campaignTitle: string) => {
    const url = asset.imageUrl || asset.videoUrl;
    if (url) {
      try {
        const res = await fetch(url, { mode: "cors" });
        const blob = await res.blob();
        const ext = asset.videoUrl ? "mp4" : "png";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${campaignTitle.slice(0, 30)}-${asset.platform || "asset"}-${asset.formatId || ""}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        window.open(url, "_blank");
      }
    } else if (asset.copy || asset.caption) {
      const text = [asset.headline, asset.caption || asset.copy, asset.hashtags].filter(Boolean).join("\n\n");
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${campaignTitle.slice(0, 30)}-${asset.platform || "text"}-${asset.formatId || ""}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }, []);

  // Download all campaign assets as ZIP
  const handleDownloadCampaign = useCallback(async (item: LibraryItem) => {
    const { assets, brief } = getCampaignData(item);
    if (assets.length === 0) { toast.error("Nothing to download here."); return; }
    setDownloadingCampaign(item.id);
    const title = (item as any).title || getItemName(item);
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    try {
      const zip = new JSZip();
      // Add brief as text file
      if (brief) {
        zip.file("brief.txt", brief);
      }
      // Download and add each asset.
      // When assets carry platform + semantic filenames (Surprise Me packs),
      // we organise the ZIP as /<platform>/<fileName>.jpg + <videoFileName>.mp4
      // and drop caption alongside. Otherwise we fall back to the legacy
      // flat naming.
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const platformFolder = typeof asset.platform === "string" && asset.platform
          ? asset.platform.replace(/[^a-zA-Z0-9_-]/g, "-")
          : null;
        const targetDir = platformFolder ? zip.folder(platformFolder)! : zip;

        // Image
        if (asset.imageUrl) {
          try {
            const r = await fetch(asset.imageUrl);
            const blob = await r.blob();
            const name = asset.fileName || `${asset.label || asset.platform || "asset"}_${i + 1}.jpg`;
            targetDir.file(name.replace(/[^a-zA-Z0-9_.-]/g, "_"), blob);
          } catch (err) { console.warn(`[ZIP] image fail ${i}:`, err); }
        }
        // Video (paired with the image under the same platform folder)
        if (asset.videoUrl) {
          try {
            const r = await fetch(asset.videoUrl);
            const blob = await r.blob();
            const name = asset.videoFileName || `${asset.label || asset.platform || "asset"}_${i + 1}.mp4`;
            targetDir.file(name.replace(/[^a-zA-Z0-9_.-]/g, "_"), blob);
          } catch (err) { console.warn(`[ZIP] video fail ${i}:`, err); }
        }
        // Audio fallback (for legacy items)
        if (!asset.imageUrl && !asset.videoUrl && asset.audioUrl) {
          try {
            const r = await fetch(asset.audioUrl);
            const blob = await r.blob();
            const name = `${asset.label || asset.platform || "asset"}_${i + 1}.mp3`;
            targetDir.file(name.replace(/[^a-zA-Z0-9_.-]/g, "_"), blob);
          } catch (err) { console.warn(`[ZIP] audio fail ${i}:`, err); }
        }
        // Caption / copy alongside
        if (asset.caption || asset.headline || asset.body) {
          const baseName = (asset.fileName?.replace(/\.[^.]+$/, "") || asset.label || asset.platform || `asset_${i + 1}`)
            .replace(/[^a-zA-Z0-9_.-]/g, "_");
          const textContent = [
            asset.headline ? `# ${asset.headline}` : "",
            asset.caption || asset.body || "",
            asset.hashtags ? `\n${asset.hashtags}` : "",
            asset.cta ? `\nCTA: ${asset.cta}` : "",
          ].filter(Boolean).join("\n\n");
          if (textContent) targetDir.file(`${baseName}_caption.txt`, textContent);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${assets.length} fichier(s) téléchargé(s)`);
    } catch (err) {
      console.error("[Library] campaign ZIP download error:", err);
      toast.error("Download error");
    } finally {
      setDownloadingCampaign(null);
    }
  }, []);

  // Toggle an item as "Featured on landing" — surfaced on ora-studio.app
  const handleToggleFeature = useCallback(async (item: LibraryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !(item as any).featured;
    // Optimistic update
    setItems((prev) => prev.map((x) => (x.id === item.id ? ({ ...x, featured: next } as any) : x)));
    try {
      const token = getAuthHeader();
      const r = await fetch(`${API_BASE}/library/feature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ itemId: item.id, featured: next, _token: token }),
      });
      const data = await r.json().catch(() => ({}));
      if (!data.success) throw new Error(data.error || "feature failed");
      toast.success(next ? "Featured on landing" : "Removed from landing");
    } catch (err: any) {
      // Revert
      setItems((prev) => prev.map((x) => (x.id === item.id ? ({ ...x, featured: !next } as any) : x)));
      toast.error(String(err?.message || err));
    }
  }, [getAuthHeader]);

  // Duplicate a campaign
  const handleDuplicateCampaign = useCallback(async (item: LibraryItem) => {
    try {
      const campaignData = getCampaignData(item);
      const duplicateItem = {
        ...item,
        id: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customName: `${getItemName(item)} (copy)`,
      };
      // Save via API
      const res = await serverPost("/library/save", {
        item: duplicateItem,
      });
      if (res.success) {
        setItems(prev => [duplicateItem, ...prev]);
        toast.success(t("library.duplicated"));
      } else {
        toast.error(res.error || "Duplication failed");
      }
    } catch (err: any) {
      console.error("[Library] duplicate error:", err);
      toast.error("Duplication failed");
    }
  }, [serverPost, t]);

  // Copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(t("library.copied"))).catch(() => {});
  }, []);

  // Repurpose formats
  const REPURPOSE_FORMATS = [
    { id: "linkedin-post", label: "LinkedIn Post", icon: "\u{1F4BC}" },
    { id: "instagram-caption", label: "Instagram Caption", icon: "\u{1F4F8}" },
    { id: "newsletter-intro", label: "Newsletter", icon: "\u{1F4E7}" },
    { id: "twitter-thread", label: "Thread X/Twitter", icon: "\u{1F426}" },
    { id: "blog-intro", label: "Article Blog", icon: "\u{1F4DD}" },
    { id: "facebook-post", label: "Facebook Post", icon: "\u{1F465}" },
    { id: "story-text", label: "Story Text", icon: "\u{1F4F1}" },
  ];

  const toggleRepurposeFormat = (formatId: string) => {
    setRepurposeFormats(prev =>
      prev.includes(formatId) ? prev.filter(f => f !== formatId) : [...prev, formatId]
    );
  };

  const handleRepurpose = useCallback(async () => {
    if (!repurposeItem || repurposeFormats.length === 0) return;
    setRepurposing(true);
    setRepurposeResult(null);
    try {
      const data = await serverPost("/library/repurpose", {
        itemId: repurposeItem.id,
        targetFormats: repurposeFormats,
      });
      if (data.success && data.repurposed) {
        setRepurposeResult(data.repurposed);
        toast.success(`${data.count} format${data.count > 1 ? "s" : ""} generated`);
      } else {
        toast.error(data.error || "Repurpose failed");
      }
    } catch (err: any) {
      console.error("[Repurpose] Error:", err);
      toast.error("Repurpose error");
    } finally {
      setRepurposing(false);
    }
  }, [repurposeItem, repurposeFormats, serverPost]);

  // Split items by type
  const contentItems = items.filter((item) => item.type !== "campaign");
  const campaignItems = items.filter((item) => item.type === "campaign");

  // Filtered + sorted items (content only)
  const filteredItems = sortItems(
    contentItems.filter((item) => {
      if (activeFolderId === "__unfiled__" && item.folderId) return false;
      if (activeFolderId !== null && activeFolderId !== "__unfiled__" && item.folderId !== activeFolderId) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (categoryFilter !== "all" && (item.classification?.category || "") !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = getItemName(item).toLowerCase();
        const model = (item.model?.name || "").toLowerCase();
        const classifTags = (item.classification?.tags || []).join(" ").toLowerCase();
        const classifDesc = (item.classification?.description || "").toLowerCase();
        const classifCat = (item.classification?.category || "").toLowerCase();
        if (!name.includes(q) && !model.includes(q) && !classifTags.includes(q) && !classifDesc.includes(q) && !classifCat.includes(q)) return false;
      }
      return true;
    }),
    sortMode,
  );

  const folderItemCounts = folders.reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = items.filter((item) => item.folderId === f.id).length;
    return acc;
  }, {});
  const unfiledCount = items.filter((item) => !item.folderId).length;

  const sortLabels: Record<SortMode, string> = {
    "date-desc": t("library.sortNewest"),
    "date-asc": t("library.sortOldest"),
    "name-asc": t("library.sortNameAZ"),
    "name-desc": t("library.sortNameZA"),
    "modified-desc": t("library.sortModified"),
  };

  const typeOptions = [
    { id: "all", label: t("library.typeAll") },
    { id: "image", label: t("library.typeImages") },
    { id: "text", label: t("library.typeText") },
    { id: "code", label: t("library.typeCode") },
    { id: "film", label: t("library.typeFilm") },
    { id: "sound", label: t("library.typeSound") },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const typeBg: Record<string, string> = { image: "var(--accent)", film: "#444444", text: "#888888", code: "#666666", sound: "#999999" };

  return (
    <div className="min-h-screen relative" style={{ background: COLORS.cream, color: COLORS.ink }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <AppTabs active="library" />
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--foreground)" }}>
                <Upload size={32} style={{ color: "var(--background)" }} />
              </div>
              <p style={{ fontSize: "20px", fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>Déposez vos fichiers ici</p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>Images, vidéos, sons</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-14">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
          <div>
            <h1 className="leading-none mb-2" style={{ ...bagel, fontSize: "clamp(48px, 7vw, 96px)", color: COLORS.ink }}>
              {t("library.title")}
            </h1>
            <p style={{ fontSize: "14px", color: COLORS.muted, fontWeight: 500 }}>
              {contentItems.length} {contentItems.length !== 1 ? t("library.assets") : t("library.asset")}{!PHASE_1_ONLY && <>, {campaignItems.length} {campaignItems.length !== 1 ? t("library.campaigns") : t("library.campaign")}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-full transition-all hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: "#FFFFFF", color: COLORS.ink, fontSize: "13px", fontWeight: 600, border: `1px solid ${COLORS.line}` }}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? `${uploadProgress}%` : "Importer"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleUploadFiles(e.target.files); e.target.value = ""; }}
            />
            <Link
              to="/hub/surprise"
              className="inline-flex items-center gap-2 px-5 h-11 rounded-full transition-all hover:opacity-90"
              style={{ background: COLORS.coral, color: "#FFFFFF", fontSize: "13px", fontWeight: 700 }}
            >
              <Plus size={14} />
              {t("library.generateNew")}
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("content")}
            className="px-5 py-2.5 rounded-full cursor-pointer transition-all"
            style={{
              fontSize: "13px", fontWeight: 500,
              background: activeTab === "content" ? "var(--foreground)" : "var(--secondary)",
              color: activeTab === "content" ? "var(--background)" : "var(--text-secondary)",
              border: activeTab === "content" ? "none" : "1px solid var(--border)",
            }}
          >
            {t("library.contentTab")}
            <span className="ml-1.5" style={{ fontSize: "11px", opacity: 0.6 }}>({contentItems.length})</span>
          </button>
          {!PHASE_1_ONLY && (
            <button
              onClick={() => setActiveTab("campaigns")}
              className="px-5 py-2.5 rounded-full cursor-pointer transition-all"
              style={{
                fontSize: "13px", fontWeight: 500,
                background: activeTab === "campaigns" ? "var(--foreground)" : "var(--secondary)",
                color: activeTab === "campaigns" ? "var(--background)" : "var(--text-secondary)",
                border: activeTab === "campaigns" ? "none" : "1px solid var(--border)",
              }}
            >
              {t("library.campaignsTab")}
              <span className="ml-1.5" style={{ fontSize: "11px", opacity: 0.6 }}>({campaignItems.length})</span>
            </button>
          )}
        </div>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        {activeTab === "campaigns" && (
          <div>
            {campaignItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "rgba(124, 92, 224, 0.06)" }}>
                  <Sparkles size={28} style={{ color: "#7C5CE0" }} />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--foreground)", marginBottom: "8px" }}>
                  {t("library.noCampaigns")}
                </h2>
                <p style={{ fontSize: "15px", color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 24px" }}>
                  {t("library.noCampaignsDesc")}
                </p>
                <Link
                  to="/hub/surprise"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:scale-105"
                  style={{ background: COLORS.coral, color: "#FFFFFF", fontSize: "13px", fontWeight: 700 }}
                >
                  <Rocket size={14} />
                  {t("library.openAiHub")}
                </Link>
              </div>
            ) : !openCampaignId ? (
              /* ── FOLDER GRID VIEW ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortItems(campaignItems, sortMode).map((item, i) => {
                  const { assets: cAssets, platforms, headline, deliverableCount, thumbnails, videoUrl } = getCampaignData(item);
                  const isDownloading = downloadingCampaign === item.id;
                  const coverUrl = thumbnails[0] || "";

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3) }}
                      className="rounded-2xl overflow-hidden cursor-pointer group"
                      style={{ background: "#FFFFFF", border: `1px solid ${COLORS.line}`, boxShadow: "0 1px 2px rgba(17,17,17,0.03)" }}
                      onClick={() => setOpenCampaignId(item.id)}
                    >
                      {/* Cover image — mosaic of up to 4 thumbnails */}
                      <div className="relative h-[160px] overflow-hidden bg-black/20">
                        {/* Feature-on-landing star (admin only, persistent). */}
                        {(item as any).canFeature && (
                          <button
                            onClick={(e) => handleToggleFeature(item, e)}
                            className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full transition-all"
                            style={{
                              background: (item as any).featured ? COLORS.butter : "rgba(255,255,255,0.92)",
                              color: (item as any).featured ? COLORS.ink : COLORS.muted,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                              backdropFilter: "blur(6px)",
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                            }}
                            title={(item as any).featured ? "Featured on landing — click to remove" : "Feature on landing"}
                          >
                            <Star size={12} fill={(item as any).featured ? "currentColor" : "none"} />
                            {(item as any).featured ? "On landing" : "Feature"}
                          </button>
                        )}
                        {cAssets.filter((a: any) => a.imageUrl || a.videoUrl).length >= 4 ? (
                          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                            {cAssets.filter((a: any) => a.imageUrl || a.videoUrl).slice(0, 4).map((a: any, ti: number) => (
                              <div key={ti} className="overflow-hidden">
                                {a.videoUrl ? (
                                  <video src={a.videoUrl} className="w-full h-full object-cover" muted playsInline preload="none" />
                                ) : (
                                  <HealingImg src={a.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" loading="lazy" decoding="async" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : coverUrl ? (
                          <HealingImg src={coverUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen size={32} style={{ color: "#3d3c3b" }} />
                          </div>
                        )}
                        {/* Overlay with count */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <div className="flex items-center gap-1.5">
                            {platforms.slice(0, 5).map((p: string, pi: number) => {
                              const PIcon = getPlatformIcon(p);
                              const pColor = getPlatformColor(p);
                              return (
                                <div key={pi} className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(0,0,0,0.08)", backdropFilter: "blur(4px)" }}>
                                  <PIcon size={10} style={{ color: pColor }} />
                                </div>
                              );
                            })}
                          </div>
                          <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.08)", backdropFilter: "blur(4px)", fontSize: "10px", fontWeight: 600, color: "#fff" }}>
                            {deliverableCount} {deliverableCount !== 1 ? t("library.assets") : t("library.asset")}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3.5">
                        <p className="truncate mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                          {headline || getItemName(item)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: "11px", color: "#7A7572" }}>
                            {new Date(item.savedAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadCampaign(item); }}
                              disabled={isDownloading}
                              className="w-6 h-6 flex items-center justify-center rounded cursor-pointer"
                              style={{ background: "var(--border)" }}
                              title="Download all HD"
                            >
                              {isDownloading ? <Loader2 size={11} className="animate-spin" style={{ color: "var(--text-tertiary)" }} /> : <Download size={11} style={{ color: "var(--text-tertiary)" }} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(item); }}
                              className="w-6 h-6 flex items-center justify-center rounded cursor-pointer"
                              style={{ background: "var(--border)" }}
                              title={t("library.duplicate")}
                            >
                              <Copy size={11} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                              className="w-6 h-6 flex items-center justify-center rounded cursor-pointer"
                              style={{ background: "var(--border)" }}
                            >
                              <Trash2 size={11} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (() => {
              /* ── OPEN CAMPAIGN — CampaignLab-style cards ── */
              const openItem = campaignItems.find(it => it.id === openCampaignId);
              if (!openItem) { setOpenCampaignId(null); return null; }
              const { assets: cAssets, platforms, headline, deliverableCount, brief: cBrief } = getCampaignData(openItem);
              const isDownloading = downloadingCampaign === openItem.id;

              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Header with back button */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setOpenCampaignId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                      style={{ background: "rgba(17,17,17,0.03)", border: "1px solid rgba(17,17,17,0.04)", fontSize: "12px", fontWeight: 500, color: "var(--text-tertiary)" }}
                    >
                      <ChevronRight size={12} className="rotate-180" /> {t("library.back")}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate" style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
                        {headline || getItemName(openItem)}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span style={{ fontSize: "11px", color: "#7A7572" }}>{deliverableCount} {t("library.assets")}</span>
                        <div className="flex items-center gap-1">
                          {platforms.map((p: string, pi: number) => {
                            const PIcon = getPlatformIcon(p);
                            const pColor = getPlatformColor(p);
                            return <PIcon key={pi} size={12} style={{ color: pColor }} />;
                          })}
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {new Date(openItem.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadCampaign(openItem)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer"
                      style={{ background: "rgba(17,17,17,0.1)", border: "1px solid rgba(17,17,17,0.2)", color: "var(--accent)", fontSize: "12px", fontWeight: 600 }}
                    >
                      {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      {t("library.downloadAll")}
                    </button>
                    <button
                      onClick={() => handleDuplicateCampaign(openItem)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer"
                      style={{ background: "rgba(17,17,17,0.05)", border: "1px solid rgba(17,17,17,0.1)", color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}
                    >
                      <Copy size={12} />
                      {t("library.duplicate")}
                    </button>
                  </div>

                  {/* Brief */}
                  {cBrief && (
                    <div className="mb-5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#7A7572", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("library.brief")}</p>
                      <p style={{ fontSize: "13px", color: "#C4BEB8", lineHeight: 1.6 }}>{cBrief.slice(0, 500)}{cBrief.length > 500 ? "..." : ""}</p>
                    </div>
                  )}

                  {/* Asset cards grid — same layout as CampaignLab results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cAssets.map((asset: any, ai: number) => {
                      const PIcon = getPlatformIcon(asset.platform || "");
                      const pColor = getPlatformColor(asset.platform || "");
                      const isText = !asset.imageUrl && !asset.videoUrl;
                      const aspectRatio = asset.type === "text" || isText ? "3/2" : (asset.aspectRatio || "1/1");

                      return (
                        <motion.div
                          key={ai}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: ai * 0.04 }}
                          className="rounded-xl overflow-hidden group/card"
                          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                        >
                          {/* Preview area */}
                          <div className="relative" style={{ aspectRatio, background: "#0e0d0c", maxHeight: 280 }}>
                            {asset.imageUrl ? (
                              <HealingImg src={asset.imageUrl} alt={asset.label} className="w-full h-full object-cover" crossOrigin="anonymous" loading="lazy" decoding="async" />
                            ) : asset.videoUrl ? (
                              <div className="relative w-full h-full">
                                <video
                                  src={asset.videoUrl}
                                  className="w-full h-full object-cover"
                                  muted playsInline preload="none"
                                  onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                                  onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full p-4 overflow-hidden">
                                {asset.headline && (
                                  <p className="line-clamp-2 mb-2" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3 }}>
                                    {asset.headline}
                                  </p>
                                )}
                                <p className="line-clamp-6" style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                                  {asset.caption || asset.copy || ""}
                                </p>
                              </div>
                            )}

                            {/* Platform badge */}
                            <div className="absolute top-3 left-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                                <PIcon size={10} style={{ color: pColor }} />
                                <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{asset.platform}</span>
                              </span>
                            </div>

                            {/* Video badge */}
                            {asset.videoUrl && (
                              <div className="absolute top-3 right-3">
                                <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", fontSize: "9px", fontWeight: 500, color: "#fff" }}>
                                  <Film size={8} className="inline mr-0.5 -mt-px" /> Video
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info section */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{asset.label || asset.formatId}</span>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                {(asset.caption || asset.copy) && (
                                  <button
                                    onClick={() => copyToClipboard(asset.caption || asset.copy)}
                                    className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                                    style={{ background: "rgba(17,17,17,0.03)" }}
                                    title="Copy text"
                                  >
                                    <Copy size={12} style={{ color: "#7A7572" }} />
                                  </button>
                                )}
                                <button
                                  onClick={() => downloadAssetFile(asset, getItemName(openItem))}
                                  className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                                  style={{ background: "rgba(17,17,17,0.03)" }}
                                  title="Download HD"
                                >
                                  <Download size={12} style={{ color: "#7A7572" }} />
                                </button>
                              </div>
                            </div>

                            {/* Headline */}
                            {asset.headline && !isText && (
                              <p className="line-clamp-1 mb-1" style={{ fontSize: "12px", fontWeight: 600, color: "#C4BEB8", lineHeight: 1.4 }}>{asset.headline}</p>
                            )}

                            {/* Caption */}
                            {(asset.caption || asset.copy) && (
                              <p className="line-clamp-3" style={{ fontSize: "12px", color: "#7A7572", lineHeight: 1.5 }}>{asset.caption || asset.copy}</p>
                            )}

                            {/* Hashtags */}
                            {asset.hashtags && (
                              <p className="line-clamp-1 mt-1" style={{ fontSize: "11px", color: "var(--accent)", lineHeight: 1.4 }}>{asset.hashtags}</p>
                            )}

                            {/* Brand-compliant badge */}
                            <div className="flex items-center gap-1 mt-2">
                              <Check size={11} style={{ color: "#666666" }} />
                              <span style={{ fontSize: "10px", color: "#666666", fontWeight: 600 }}>{t("library.brandCompliant")}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}

        {/* ═══ CONTENT TAB ═══ */}
        {activeTab === "content" && (
        <div className="flex gap-6">
          {/* Sidebar — Folders */}
          <div className="w-[220px] flex-shrink-0 hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                {t("library.collections")}
              </span>
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <FolderPlus size={13} />
              </button>
            </div>

            {/* New folder input */}
            <AnimatePresence>
              {showNewFolder && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary">
                    <FolderOpen size={13} className="text-ora-signal flex-shrink-0" />
                    <input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                      placeholder={t("library.newFolderPlaceholder")}
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 min-w-0"
                      style={{ fontSize: "12px" }}
                    />
                    <button onClick={handleCreateFolder} className="w-5 h-5 rounded flex items-center justify-center text-ora-signal hover:bg-ora-signal-light cursor-pointer"><Check size={11} /></button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary cursor-pointer"><X size={11} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* All items */}
            <button
              onClick={() => setActiveFolderId(null)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer mb-0.5 ${activeFolderId === null ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <FolderOpen size={14} />
              <span className="flex-1 text-left truncate" style={{ fontSize: "13px", fontWeight: activeFolderId === null ? 500 : 400 }}>{t("library.allItems")}</span>
              <span style={{ fontSize: "10px", color: activeFolderId === null ? "var(--ora-signal)" : "var(--muted-foreground)" }}>{items.length}</span>
            </button>

            {/* Unfiled */}
            {unfiledCount > 0 && unfiledCount !== items.length && (
              <button
                onClick={() => setActiveFolderId("__unfiled__")}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer mb-0.5 ${activeFolderId === "__unfiled__" ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <FolderOpen size={14} />
                <span className="flex-1 text-left truncate" style={{ fontSize: "13px", fontWeight: activeFolderId === "__unfiled__" ? 500 : 400 }}>{t("library.unfiled")}</span>
                <span style={{ fontSize: "10px", color: activeFolderId === "__unfiled__" ? "var(--ora-signal)" : "var(--muted-foreground)" }}>{unfiledCount}</span>
              </button>
            )}

            {/* User folders */}
            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary mb-0.5">
                    <FolderOpen size={13} className="text-ora-signal flex-shrink-0" />
                    <input
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameFolder(folder.id); if (e.key === "Escape") setEditingFolderId(null); }}
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none text-foreground min-w-0"
                      style={{ fontSize: "12px" }}
                    />
                    <button onClick={() => handleRenameFolder(folder.id)} className="w-5 h-5 rounded flex items-center justify-center text-ora-signal cursor-pointer"><Check size={11} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer mb-0.5 ${activeFolderId === folder.id ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                  >
                    <FolderOpen size={14} />
                    <span className="flex-1 text-left truncate" style={{ fontSize: "13px", fontWeight: activeFolderId === folder.id ? 500 : 400 }}>{folder.name}</span>
                    <span style={{ fontSize: "10px", color: activeFolderId === folder.id ? "var(--ora-signal)" : "var(--muted-foreground)" }}>
                      {folderItemCounts[folder.id] || 0}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-secondary/80 cursor-pointer"
                      ><Pencil size={9} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-secondary/80 text-destructive cursor-pointer"
                      ><Trash2 size={9} /></button>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {/* Search */}
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 border border-border bg-card min-w-[200px] max-w-[360px]"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("library.searchPlaceholder")}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 min-w-0"
                  style={{ fontSize: "13px" }}
                />
              </div>

              {/* Type filter pills */}
              <div className="flex items-center gap-1.5">
                {typeOptions.map((opt) => {
                  const pillColor = typeBg[opt.id] || "var(--foreground)";
                  const isActive = typeFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTypeFilter(opt.id)}
                      className="px-3 py-1.5 rounded-full cursor-pointer transition-all"
                      style={{
                        fontSize: "11px", fontWeight: isActive ? 800 : 600,
                        background: isActive ? (opt.id === "all" ? "var(--foreground)" : pillColor) : "var(--secondary)",
                        color: isActive ? "var(--background)" : "var(--text-secondary)",
                        border: isActive ? "none" : "1px solid var(--border)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* AI Category filter */}
              {(() => {
                const categories = Array.from(new Set(contentItems.map(i => i.classification?.category).filter(Boolean))) as string[];
                if (categories.length === 0) return null;
                return (
                  <>
                    <div className="w-px h-5 bg-border" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className="px-2.5 py-1 rounded-full cursor-pointer transition-all"
                        style={{
                          fontSize: "10px", fontWeight: categoryFilter === "all" ? 700 : 500,
                          background: categoryFilter === "all" ? "rgba(124, 92, 224, 0.12)" : "var(--secondary)",
                          color: categoryFilter === "all" ? "#7C5CE0" : "var(--text-secondary)",
                          border: categoryFilter === "all" ? "1px solid rgba(124, 92, 224, 0.2)" : "1px solid var(--border)",
                        }}
                      >
                        AI: All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className="px-2.5 py-1 rounded-full cursor-pointer transition-all capitalize"
                          style={{
                            fontSize: "10px", fontWeight: categoryFilter === cat ? 700 : 500,
                            background: categoryFilter === cat ? "rgba(124, 92, 224, 0.12)" : "var(--secondary)",
                            color: categoryFilter === cat ? "#7C5CE0" : "var(--text-secondary)",
                            border: categoryFilter === cat ? "1px solid rgba(124, 92, 224, 0.2)" : "1px solid var(--border)",
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div className="w-px h-5 bg-border" />

              {/* Sort */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                  style={{ fontSize: "11px", fontWeight: 400 }}
                >
                  <ArrowUpDown size={12} />
                  {sortLabels[sortMode]}
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-8 bg-card border border-border rounded-xl py-1.5 z-30 min-w-[160px]"
                    style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
                    {(Object.entries(sortLabels) as [SortMode, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortMode(key); setShowSortMenu(false); }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2 transition-colors cursor-pointer ${sortMode === key ? "text-ora-signal bg-ora-signal-light" : "text-foreground hover:bg-secondary"}`}
                        style={{ fontSize: "12px", fontWeight: sortMode === key ? 500 : 400 }}
                      >
                        {sortMode === key && <Check size={11} />}
                        <span className={sortMode === key ? "" : "pl-[19px]"}>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-secondary rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${viewMode === "grid" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={{ boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.04)" : "none" }}
                >
                  <Grid3x3 size={13} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${viewMode === "list" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={{ boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.04)" : "none" }}
                >
                  <List size={13} />
                </button>
              </div>

              {/* Select mode toggle */}
              <button
                onClick={() => { if (selectMode) { exitSelectMode(); } else { setSelectMode(true); } }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  background: selectMode ? "rgba(124, 92, 224, 0.12)" : "transparent",
                  color: selectMode ? "#7C5CE0" : "var(--muted-foreground)",
                  border: selectMode ? "1px solid rgba(124, 92, 224, 0.3)" : "1px solid transparent",
                }}
              >
                {selectMode ? <X size={12} /> : <Check size={12} />}
                {selectMode ? (isFr ? "Annuler" : "Cancel") : (isFr ? "Sélectionner" : "Select")}
              </button>
            </div>

            {/* Bulk action bar (visible in select mode) */}
            <AnimatePresence>
              {selectMode && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl"
                  style={{
                    background: "rgba(124, 92, 224, 0.06)",
                    border: "1px solid rgba(124, 92, 224, 0.18)",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#7C5CE0" }}>
                    {selectedIds.size} {isFr ? "sélectionné" + (selectedIds.size > 1 ? "s" : "") : "selected"}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      if (selectedIds.size === filteredItems.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredItems.map((it) => it.id)));
                      }
                    }}
                    className="px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {selectedIds.size === filteredItems.length && filteredItems.length > 0
                      ? (isFr ? "Tout désélectionner" : "Clear selection")
                      : (isFr ? "Tout sélectionner" : "Select all")}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0 || bulkDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      background: selectedIds.size > 0 ? "#DC2626" : "var(--secondary)",
                      color: selectedIds.size > 0 ? "#fff" : "var(--muted-foreground)",
                      border: "1px solid transparent",
                    }}
                  >
                    {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {isFr ? "Supprimer" : "Delete"} {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile folder filter */}
            <div className="flex md:hidden items-center gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveFolderId(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${activeFolderId === null ? "bg-ora-signal-light border-ora-signal/30 text-ora-signal" : "border-border text-muted-foreground"}`}
                style={{ fontSize: "12px", fontWeight: activeFolderId === null ? 500 : 400 }}
              >All ({items.length})</button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${activeFolderId === f.id ? "bg-ora-signal-light border-ora-signal/30 text-ora-signal" : "border-border text-muted-foreground"}`}
                  style={{ fontSize: "12px", fontWeight: activeFolderId === f.id ? 500 : 400 }}
                >{f.name} ({folderItemCounts[f.id] || 0})</button>
              ))}
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground cursor-pointer"
                style={{ fontSize: "12px" }}
              ><FolderPlus size={11} /></button>
            </div>

            {/* Empty state */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "rgba(124, 92, 224, 0.06)" }}>
                  <BookOpen size={28} style={{ color: "#7C5CE0" }} />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--foreground)", marginBottom: "8px" }}>
                  {items.length === 0 ? t("library.noContent") : t("library.noResults")}
                </h2>
                <p style={{ fontSize: "15px", color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 24px" }}>
                  {items.length === 0
                    ? t("library.noContentDesc")
                    : t("library.noResultsDesc")}
                </p>
                {items.length === 0 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:scale-105 cursor-pointer"
                      style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: "14px", fontWeight: 500, border: "1px solid var(--border)" }}
                    >
                      <Upload size={14} />
                      Importer vos fichiers
                    </button>
                    <Link
                      to="/hub/surprise"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:scale-105"
                      style={{ background: COLORS.coral, color: "#FFFFFF", fontSize: "13px", fontWeight: 700 }}
                    >
                      <Rocket size={14} />
                      {t("library.openAiHub")}
                    </Link>
                  </div>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* ═══ MASONRY GRID VIEW ═══ */
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {filteredItems.map((item, i) => {
                  const Icon = getTypeIcon(item.type);
                  const url = getAssetUrl(item);
                  const isVisual = item.type === "image" || item.type === "film";
                  const typeColor = typeBg[item.type] || "#888";
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      whileHover={{ y: -3, boxShadow: "0 14px 40px rgba(17,17,17,0.08)" }}
                      className="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer relative"
                      style={{
                        border: selectMode && selectedIds.has(item.id) ? `2px solid ${COLORS.coral}` : `1px solid ${COLORS.line}`,
                        background: "#FFFFFF",
                        boxShadow: selectMode && selectedIds.has(item.id) ? `0 0 0 3px rgba(255,92,57,0.15), 0 2px 8px rgba(17,17,17,0.03)` : "0 1px 2px rgba(17,17,17,0.03)",
                      }}
                    >
                      {/* Selection checkbox (visible in select mode) */}
                      {selectMode && (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelected(item.id); }}
                          className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            background: selectedIds.has(item.id) ? "#7C5CE0" : "rgba(255,255,255,0.9)",
                            border: selectedIds.has(item.id) ? "2px solid #7C5CE0" : "2px solid rgba(0,0,0,0.25)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          {selectedIds.has(item.id) && <Check size={12} style={{ color: "#fff", strokeWidth: 3 }} />}
                        </div>
                      )}
                      {/* Thumbnail */}
                      <div className={`relative ${isVisual ? "" : "aspect-[4/3]"}`} style={{ background: isVisual ? undefined : "var(--secondary)" }} onClick={() => { if (selectMode) { toggleSelected(item.id); } else { setPreviewItem(item); } }}>
                        {/* Feature on landing (admin only — persistent, top-right). */}
                        {(item as any).canFeature && !selectMode && (
                          <button
                            onClick={(e) => handleToggleFeature(item, e)}
                            className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full transition-all"
                            style={{
                              background: (item as any).featured ? COLORS.butter : "rgba(255,255,255,0.92)",
                              color: (item as any).featured ? COLORS.ink : COLORS.muted,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                              backdropFilter: "blur(6px)",
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                            }}
                            title={(item as any).featured ? "Featured on landing — click to remove" : "Feature on landing"}
                          >
                            <Star size={12} fill={(item as any).featured ? "currentColor" : "none"} />
                            {(item as any).featured ? "On landing" : "Feature"}
                          </button>
                        )}
                        {/* Deployment badge (top-left) */}
                        {(() => {
                          const badge = getDeploymentBadge(item);
                          if (!badge) return null;
                          const BadgeIcon = badge.icon;
                          return (
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full pointer-events-none"
                              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", fontSize: 9, fontWeight: 700, color: "#fff", border: `1px solid ${badge.color}` }}>
                              <BadgeIcon size={9} style={{ color: badge.color }} />
                              <span>{badge.label}</span>
                            </div>
                          );
                        })()}
                        {(() => {
                          // Media kind detection — prefer the URL extension over the item.type
                          // so campaign packs, legacy items, etc. all preview correctly.
                          const isVideoUrl = typeof url === "string" && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
                          const isVideo = item.type === "film" || isVideoUrl;
                          const isImage = !isVideo && !!url && item.type !== "sound";
                          if (isImage) {
                            return <HealingImg src={url!} alt={getItemName(item)} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" crossOrigin="anonymous" loading="lazy" decoding="async" />;
                          }
                          if (isVideo && url) {
                            return (
                              <div className="relative">
                                <video src={url} className="w-full object-cover" muted playsInline preload="none"
                                  onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                  onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                              </div>
                            );
                          }
                          if (item.type === "sound" && item.preview?.audioUrl) {
                            return (
                              <div className="w-full flex flex-col items-center justify-center gap-3 p-5">
                                <Music size={22} style={{ color: typeColor, opacity: 0.5 }} />
                                <audio src={item.preview.audioUrl} controls className="w-full" style={{ height: 32 }} onClick={(e) => e.stopPropagation()} />
                                <span style={{ fontSize: "10px", fontWeight: 500, color: typeColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sound</span>
                              </div>
                            );
                          }
                          const isText = item.preview?.kind === "text";
                          const isCode = item.preview?.kind === "code";
                          // Cream fallback tile for items without resolvable media —
                          // feels like part of the Library rather than a broken card.
                          return (
                            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 p-6" style={{ background: COLORS.warm }}>
                              <Icon size={28} style={{ color: COLORS.ink, opacity: 0.55 }} />
                              <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.ink, textTransform: "uppercase", letterSpacing: "0.12em" }}>{getTypeLabel(item.type)}</span>
                              {isText && (
                                <p className="text-center line-clamp-4" style={{ fontSize: "11px", color: COLORS.muted, lineHeight: 1.5 }}>
                                  {(item.preview as any).excerpt?.slice(0, 200)}
                                </p>
                              )}
                              {isCode && (
                                <pre className="text-left w-full line-clamp-4 font-mono" style={{ fontSize: "10px", color: COLORS.muted, lineHeight: 1.4 }}>
                                  {(item.preview as any).snippet?.slice(0, 200)}
                                </pre>
                              )}
                            </div>
                          );
                        })()}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                            <Eye size={18} style={{ color: "var(--background)" }} />
                          </div>
                        </div>
                        {/* Type badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full" style={{ fontSize: "10px", fontWeight: 900, background: typeColor, color: "var(--background)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="px-4 py-3">
                        <p className="truncate mb-1" style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                          {getItemName(item)}
                        </p>
                        {item.classification && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, background: "rgba(124, 92, 224, 0.12)", color: "#7C5CE0", textTransform: "capitalize" }}>
                              {item.classification.category}
                            </span>
                            {item.classification.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 400, background: "rgba(124, 92, 224, 0.06)", color: "#7C5CE0" }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)" }}>{item.model?.name || "AI"}</span>
                            <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                              {new Date(item.savedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(item.preview?.kind === "image" || item.preview?.kind === "film") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPublishTarget({
                                    imageUrl: item.preview?.imageUrl,
                                    videoUrl: item.preview?.videoUrl,
                                    defaultCaption: item.prompt,
                                    libraryItemId: item.id,
                                  });
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer"
                                title={isFr ? "Publier sur les réseaux" : "Publish to networks"}
                              >
                                <Share2 size={12} style={{ color: "#7C5CE0" }} />
                              </button>
                            )}
                            {item.preview?.kind === "image" && item.preview?.imageUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/hub/editor", { state: { assetUrl: item.preview.imageUrl, assetId: item.id } });
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer"
                                title={isFr ? "Modifier dans l'éditeur" : "Edit in editor"}
                              >
                                <Pencil size={12} style={{ color: "#7C5CE0" }} />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer" title="Download HD">
                              <Download size={12} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                            {(item.preview?.kind === "text" || item.preview?.kind === "code") && (
                              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.preview.kind === "text" ? item.preview.excerpt : item.preview.snippet); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer" title="Copy text">
                                <Copy size={12} style={{ color: "var(--text-tertiary)" }} />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setRepurposeItem(item); setRepurposeResult(null); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer" title="Décliner en multi-format">
                              <RefreshCw size={12} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setMoveTargetItem(item.id); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)] cursor-pointer" title="Move to folder">
                              <FolderInput size={12} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(196,91,74,0.1)] cursor-pointer" title="Remove">
                              <Trash2 size={12} style={{ color: "#DC2626" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* ═══ LIST VIEW ═══ */
              <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                {/* Header */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-secondary/30">
                  <span className="flex-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Name</span>
                  <span className="w-20 hidden sm:block" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Type</span>
                  <span className="w-24 hidden md:block" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Model</span>
                  <span className="w-24 hidden lg:block" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Saved</span>
                  <span className="w-24" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Actions</span>
                </div>
                {filteredItems.map((item, i) => {
                  const Icon = getTypeIcon(item.type);
                  const folder = folders.find((f) => f.id === item.folderId);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors group cursor-pointer"
                      style={selectMode && selectedIds.has(item.id) ? { background: "rgba(124,58,237,0.06)" } : undefined}
                      onClick={() => { if (selectMode) { toggleSelected(item.id); } else { setPreviewItem(item); } }}
                    >
                      {/* Selection checkbox (select mode) */}
                      {selectMode && (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelected(item.id); }}
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                          style={{
                            background: selectedIds.has(item.id) ? "#7C5CE0" : "transparent",
                            border: selectedIds.has(item.id) ? "2px solid #7C5CE0" : "2px solid var(--border)",
                          }}
                        >
                          {selectedIds.has(item.id) && <Check size={11} style={{ color: "#fff", strokeWidth: 3 }} />}
                        </div>
                      )}
                      {/* Name */}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{getItemName(item)}</p>
                          {folder && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <FolderOpen size={9} className="text-muted-foreground" />
                              <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{folder.name}</span>
                            </div>
                          )}
                          {item.classification && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, background: "rgba(124, 92, 224, 0.12)", color: "#7C5CE0", textTransform: "capitalize" }}>
                                {item.classification.category}
                              </span>
                              {item.classification.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 400, background: "rgba(124, 92, 224, 0.06)", color: "#7C5CE0" }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="w-20 hidden sm:block" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{getTypeLabel(item.type)}</span>
                      <span className="w-24 hidden md:block truncate" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{item.model?.name || "AI"}</span>
                      <span className="w-24 hidden lg:block" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{new Date(item.savedAt).toLocaleDateString()}</span>
                      <div className="w-28 flex items-center gap-1">
                        {(item.preview?.kind === "image" || item.preview?.kind === "film") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPublishTarget({
                                imageUrl: item.preview?.imageUrl,
                                videoUrl: item.preview?.videoUrl,
                                defaultCaption: item.prompt,
                                libraryItemId: item.id,
                              });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer"
                            style={{ color: "#7C5CE0" }}
                            title={isFr ? "Publier" : "Publish"}
                          >
                            <Share2 size={13} />
                          </button>
                        )}
                        {item.preview?.kind === "image" && item.preview?.imageUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/hub/editor", { state: { assetUrl: item.preview.imageUrl, assetId: item.id } });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer"
                            style={{ color: "#7C5CE0" }}
                            title={isFr ? "Modifier" : "Edit"}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" title="Download HD">
                          <Download size={13} />
                        </button>
                        {(item.preview?.kind === "text" || item.preview?.kind === "code") && (
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.preview.kind === "text" ? item.preview.excerpt : item.preview.snippet); }} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" title="Copy text">
                            <Copy size={13} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setRepurposeItem(item); setRepurposeResult(null); }} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" title="Décliner">
                          <RefreshCw size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setMoveTargetItem(item.id); }} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" title="Move">
                          <FolderInput size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-secondary cursor-pointer" title="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ═══ MOVE TO FOLDER MODAL ═══ */}
      <AnimatePresence>
        {moveTargetItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={() => setMoveTargetItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-[360px] max-w-[90vw] mx-6 overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 24px 80px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-border">
                <h3 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)" }}>{t("library.moveTo")}</h3>
              </div>
              <div className="p-3 max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => handleMoveItem(moveTargetItem, null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                >
                  <FolderOpen size={15} className="text-muted-foreground" />
                  <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{t("library.unfiled")}</span>
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleMoveItem(moveTargetItem, folder.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <FolderOpen size={15} className="text-ora-signal" />
                    <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{folder.name}</span>
                    <span className="ml-auto" style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{folderItemCounts[folder.id] || 0}</span>
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setMoveTargetItem(null)}
                  className="px-4 py-2 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  style={{ fontSize: "13px" }}
                >{t("calendar.cancel")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PREVIEW MODAL ═══ */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: previewItem.type === "image" || previewItem.type === "film" ? "rgba(0,0,0,0.95)" : "rgba(0,0,0,0.06)" }}
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className={`relative ${previewItem.type === "image" || previewItem.type === "film" ? "max-w-[90vw] max-h-[85vh]" : "bg-card rounded-2xl max-w-2xl w-full mx-6"}`}
              style={previewItem.type !== "image" && previewItem.type !== "film" ? { boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 24px 80px rgba(0,0,0,0.12)" } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {(previewItem.type === "image" || previewItem.type === "film") && getAssetUrl(previewItem) ? (
                <>
                  {previewItem.type === "image" ? (
                    <img src={getAssetUrl(previewItem)!} alt={getItemName(previewItem)} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" crossOrigin="anonymous" />
                  ) : (
                    <video src={getAssetUrl(previewItem)!} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" controls autoPlay muted loop playsInline />
                  )}
                  {/* Floating actions */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(previewItem)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white transition-all cursor-pointer hover:scale-105"
                      style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", fontSize: "12px", fontWeight: 500 }}
                    >
                      <Download size={14} /> {t("library.download")}
                    </button>
                    <button
                      onClick={() => setPreviewItem(null)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors"
                      style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {previewItem.preview?.kind === "text" && (
                      <p style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{previewItem.preview.excerpt}</p>
                    )}
                    {previewItem.preview?.kind === "code" && (
                      <pre className="font-mono rounded-lg p-4" style={{ fontSize: "12px", color: "#e2e2e2", background: "#1a1a1a", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {previewItem.preview.snippet}
                      </pre>
                    )}
                    {previewItem.preview?.kind === "sound" && previewItem.preview.audioUrl && (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <Music size={32} className="text-ora-signal" />
                        <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{getItemName(previewItem)}</p>
                        <audio src={previewItem.preview.audioUrl} controls autoPlay className="w-full" />
                        {previewItem.preview.duration && (
                          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{previewItem.preview.duration}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-border flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{getItemName(previewItem)}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{previewItem.model?.name} - {new Date(previewItem.savedAt).toLocaleDateString()}</p>
                    </div>
                    {(previewItem.preview?.kind === "text" || previewItem.preview?.kind === "code") && (
                      <button
                        onClick={() => copyToClipboard(previewItem.preview.kind === "text" ? previewItem.preview.excerpt : previewItem.preview.snippet)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                        style={{ background: "rgba(17,17,17,0.04)", color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
                      >
                        <Copy size={14} /> {t("library.copyText")}
                      </button>
                    )}
                    <button
                      onClick={() => { setPreviewItem(null); setRepurposeItem(previewItem); setRepurposeResult(null); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ background: "rgba(17,17,17,0.04)", color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
                    >
                      <RefreshCw size={14} /> Décliner
                    </button>
                    <button
                      onClick={() => handleDownload(previewItem)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-white hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ background: "var(--ora-signal)", fontSize: "13px", fontWeight: 500 }}
                    >
                      <Download size={14} /> {t("library.download")}
                    </button>
                    <button
                      onClick={() => setPreviewItem(null)}
                      className="px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                      style={{ fontSize: "13px" }}
                    >{t("calendar.cancel")}</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ REPURPOSE MODAL ═══ */}
      <AnimatePresence>
        {repurposeItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={() => { if (!repurposing) { setRepurposeItem(null); setRepurposeResult(null); } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl w-[520px] max-w-[90vw] mx-6 overflow-hidden max-h-[85vh] flex flex-col"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 24px 80px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--ora-signal)", opacity: 0.9 }}>
                  <RefreshCw size={14} style={{ color: "#fff" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
                    Décliner en multi-format
                  </h3>
                  <p className="truncate" style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: 2 }}>
                    {getItemName(repurposeItem).slice(0, 80)}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Source preview */}
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>
                    Contenu source
                  </p>
                  <div className="rounded-xl px-4 py-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <p className="line-clamp-4" style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.6 }}>
                      {(repurposeItem.preview?.excerpt || repurposeItem.preview?.snippet || repurposeItem.prompt || "").slice(0, 300)}
                      {(repurposeItem.preview?.excerpt || repurposeItem.preview?.snippet || repurposeItem.prompt || "").length > 300 ? "..." : ""}
                    </p>
                  </div>
                </div>

                {!repurposeResult ? (
                  <>
                    {/* Format selection */}
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>
                        Formats cibles ({repurposeFormats.length} sélectionné{repurposeFormats.length > 1 ? "s" : ""})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {REPURPOSE_FORMATS.map(fmt => {
                          const selected = repurposeFormats.includes(fmt.id);
                          return (
                            <button
                              key={fmt.id}
                              onClick={() => toggleRepurposeFormat(fmt.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium cursor-pointer transition-all"
                              style={{
                                background: selected ? "var(--ora-signal)" : "var(--secondary)",
                                color: selected ? "#fff" : "var(--text-secondary)",
                                border: `1px solid ${selected ? "var(--ora-signal)" : "var(--border)"}`,
                              }}
                            >
                              {selected && <Check size={10} />}
                              <span>{fmt.icon}</span>
                              <span>{fmt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cost info */}
                    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        Coût : <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{repurposeFormats.length} crédit{repurposeFormats.length > 1 ? "s" : ""}</span> ({repurposeFormats.length} format{repurposeFormats.length > 1 ? "s" : ""})
                      </p>
                    </div>
                  </>
                ) : (
                  /* Results */
                  <div className="space-y-3">
                    <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 4 }}>
                      Résultats ({Object.keys(repurposeResult).length} formats)
                    </p>
                    {Object.entries(repurposeResult).map(([formatId, data]: [string, any]) => {
                      const fmt = REPURPOSE_FORMATS.find(f => f.id === formatId);
                      return (
                        <div key={formatId} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--secondary)" }}>
                          <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
                            <span style={{ fontSize: "14px" }}>{fmt?.icon || ""}</span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{data.title || fmt?.label || formatId}</span>
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(data.content + (data.hashtags?.length ? "\n\n" + data.hashtags.join(" ") : ""))}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--border)] cursor-pointer"
                                title="Copier"
                              >
                                <Copy size={12} style={{ color: "var(--text-tertiary)" }} />
                              </button>
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <p style={{ fontSize: "12px", color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                              {data.content}
                            </p>
                            {data.hashtags && data.hashtags.length > 0 && (
                              <p className="mt-2" style={{ fontSize: "11px", color: "var(--accent)", lineHeight: 1.4 }}>
                                {data.hashtags.join(" ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex items-center gap-3">
                {!repurposeResult ? (
                  <>
                    <button
                      onClick={() => { setRepurposeItem(null); setRepurposeResult(null); }}
                      disabled={repurposing}
                      className="px-4 py-2.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      style={{ fontSize: "13px" }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleRepurpose}
                      disabled={repurposing || repurposeFormats.length === 0}
                      className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--ora-signal)", fontSize: "13px", fontWeight: 600 }}
                    >
                      {repurposing ? (
                        <><Loader2 size={14} className="animate-spin" /> Génération...</>
                      ) : (
                        <><RefreshCw size={14} /> Décliner en {repurposeFormats.length} format{repurposeFormats.length > 1 ? "s" : ""}</>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setRepurposeItem(null); setRepurposeResult(null); fetchData(); }}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-white hover:opacity-90 transition-all cursor-pointer"
                    style={{ background: "var(--ora-signal)", fontSize: "13px", fontWeight: 600 }}
                  >
                    <Check size={14} /> Fermer
                  </button>
                )}
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
          fetchData();
        }}
      />
    </div>
  );
}