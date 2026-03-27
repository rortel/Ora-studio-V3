import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Stage, Layer, Rect, Text, Image as KonvaImage, Group,
  Circle as KonvaCircle, Path as KonvaPath, Line as KonvaLine,
} from "react-konva";
import { Transformer } from "react-konva";
import type Konva from "konva";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Save, X, Type, Palette, Trash2, Eye, EyeOff, Download, Copy,
  ChevronUp, ChevronDown, Undo2, Redo2, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight, Bold,
  Circle, Minus, ImagePlus, Layers, GripVertical, Pipette,
} from "lucide-react";
import type { TemplateDefinition, TemplateLayer } from "./templates/types";
import { registerTemplate } from "./templates";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

interface VaultBrandAsset {
  id: string;
  role: string;
  label: string;
  usage: string;
  signedUrl: string | null;
}

interface VaultBrandImage {
  id: string;
  fileName: string;
  signedUrl: string | null;
  category: string;
  tags: string[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════════════════════════════ */
interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateDefinition;
  asset: Record<string, any>;
  vault: Record<string, any> | null;
  brandLogoUrl?: string | null;
  onSave?: (template: TemplateDefinition) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS  (ported from TemplateEngine — read-only reference)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Recursively collect image layers (including inside groups) */
function collectImageLayers(layers: TemplateLayer[]): TemplateLayer[] {
  const result: TemplateLayer[] = [];
  for (const layer of layers) {
    if ((layer.type === "background-image" || layer.type === "logo" || layer.type === "image") && layer.dataBinding) {
      result.push(layer);
    }
    if (layer.type === "group" && layer.children) {
      result.push(...collectImageLayers(layer.children));
    }
  }
  return result;
}

/** Resolve "vault:primary" / "vault:accent" → hex color */
function resolveColorStatic(color: string | undefined, vault: Record<string, any> | null): string {
  if (!color) return "#FFFFFF";
  if (!color.startsWith("vault:")) return color;
  const role = color.slice(6);
  const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
  if (!colors?.length) return "#111111";
  const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
  return match?.hex || colors[0]?.hex || "#111111";
}

/** Cover-fit crop (like CSS object-fit:cover) */
function coverCrop(img: HTMLImageElement, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let cropW = img.width, cropH = img.height, cropX = 0, cropY = 0;
  if (imgRatio > boxRatio) { cropW = img.height * boxRatio; cropX = (img.width - cropW) / 2; }
  else { cropH = img.width / boxRatio; cropY = (img.height - cropH) / 2; }
  return { x: cropX, y: cropY, width: cropW, height: cropH };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function TemplateEditor({ open, onOpenChange, template, asset, vault, brandLogoUrl, onSave }: TemplateEditorProps) {
  // ── State ──
  const [layers, setLayers] = useState<TemplateLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [history, setHistory] = useState<TemplateLayer[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());

  // ── Brand assets from vault ──
  const [brandAssets, setBrandAssets] = useState<VaultBrandAsset[]>([]);
  const [brandImages, setBrandImages] = useState<VaultBrandImage[]>([]);
  const [vaultAssetsLoading, setVaultAssetsLoading] = useState(false);
  const auth = useAuth();
  const getAuthToken = useCallback(() => auth.getAuthHeader(), [auth]);

  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<any>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const cw = template?.canvasWidth || 1200;
  const ch = template?.canvasHeight || 628;

  // ── Resolve data binding ──
  const resolveBinding = useCallback((binding: TemplateLayer["dataBinding"]): string => {
    if (!binding) return "";
    if (binding.source === "asset") return asset?.[binding.field] || "";
    if (binding.source === "vault") {
      if (binding.field === "logoUrl") return brandLogoUrl || vault?.logo_url || vault?.logoUrl || "";
      return vault?.[binding.field] || "";
    }
    if (binding.source === "static") return binding.field || "";
    return binding.field || "";
  }, [asset, vault, brandLogoUrl]);

  // ── Resolve color ──
  const resolveColor = useCallback((color: string | undefined): string => {
    return resolveColorStatic(color, vault);
  }, [vault]);

  // ── Common props (stroke, shadow, opacity) ──
  const commonProps = useCallback((layer: TemplateLayer) => ({
    stroke: layer.style?.stroke ? resolveColor(layer.style.stroke) : undefined,
    strokeWidth: layer.style?.strokeWidth || 0,
    shadowColor: layer.style?.shadowColor || undefined,
    shadowBlur: layer.style?.shadowBlur || 0,
    shadowOffsetX: layer.style?.shadowOffsetX || 0,
    shadowOffsetY: layer.style?.shadowOffsetY || 0,
    opacity: layer.style?.opacity ?? 1,
  }), [resolveColor]);

  // ── Rotation props (centered rotation via offset) ──
  const rotationProps = useCallback((layer: TemplateLayer, px: number, py: number, pw: number, ph: number) => {
    if (!layer.style?.rotation) return { x: px, y: py };
    return { x: px + pw / 2, y: py + ph / 2, offsetX: pw / 2, offsetY: ph / 2, rotation: layer.style.rotation };
  }, []);

  // ── Visibility check ──
  const isVisible = useCallback((layer: TemplateLayer): boolean => {
    if (!layer.visible) return true;
    const field = layer.visible.when.replace("asset.", "").replace("vault.", "");
    const source = layer.visible.when.startsWith("vault.") ? vault : asset;
    const value = source?.[field];
    if (layer.visible.notEmpty) return !!value && value !== "";
    return true;
  }, [asset, vault]);

  /* ───────────────────────────────────────────────────────────────────────
     INIT LAYERS
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (template && open) {
      const sorted = [...template.layers].sort((a, b) => a.zIndex - b.zIndex);
      setLayers(sorted);
      setSelectedId(null);
      setHistory([sorted]);
      setHistoryIdx(0);
      setHiddenLayers(new Set());
      setEditingTextId(null);
    }
  }, [template, open]);

  /* ───────────────────────────────────────────────────────────────────────
     FETCH VAULT BRAND ASSETS + IMAGE BANK
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const token = getAuthToken();
    if (!token) return;
    setVaultAssetsLoading(true);

    // Fetch brand assets — /brand-assets endpoint doesn't exist, use vault/brand-dna instead
    // Skip this for now — brand assets come from the vault passed as prop
    const fetchAssets = Promise.resolve();

    // Fetch image bank (first 20 images)
    const fetchImages = fetch(`${API_BASE}/vault/images/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ _token: token }),
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.json()).then(data => {
      if (data.success && data.images) setBrandImages(data.images.slice(0, 20));
    }).catch(() => {});

    Promise.allSettled([fetchAssets, fetchImages]).finally(() => setVaultAssetsLoading(false));
  }, [open, getAuthToken]);

  /* ───────────────────────────────────────────────────────────────────────
     PRELOAD IMAGES (ported from TemplateEngine)
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open || !template) return;
    const imageUrls: Record<string, string> = {};
    const imageLayers = collectImageLayers(layers.length > 0 ? layers : template.layers);
    for (const layer of imageLayers) {
      const url = resolveBinding(layer.dataBinding);
      if (url) imageUrls[layer.id] = url;
    }
    const keys = Object.keys(imageUrls);
    if (keys.length === 0) return;

    const loaded: Record<string, HTMLImageElement> = {};
    let remaining = keys.length;
    const done = () => {
      remaining--;
      if (remaining === 0) setLoadedImages(prev => ({ ...prev, ...loaded }));
    };

    for (const [id, url] of Object.entries(imageUrls)) {
      // Skip if already loaded with same URL
      if (loadedImages[id]?.src?.includes(url.slice(0, 40))) { remaining--; if (remaining === 0) setLoadedImages(prev => ({ ...prev, ...loaded })); continue; }
      fetch(url, { mode: "cors" })
        .then(r => { if (!r.ok) throw new Error("not ok"); return r.blob(); })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          const img = new window.Image();
          img.onload = () => { loaded[id] = img; done(); };
          img.onerror = () => done();
          img.src = objectUrl;
        })
        .catch(() => {
          const img = new window.Image();
          img.onload = () => { loaded[id] = img; done(); };
          img.onerror = () => done();
          img.src = url;
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template, resolveBinding]);

  /* ───────────────────────────────────────────────────────────────────────
     STAGE SCALE (auto-fit to container)
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || !template || !open) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const padX = 40, padY = 40;
      const containerW = containerRef.current.clientWidth - padX;
      const containerH = containerRef.current.clientHeight - padY;
      const scale = Math.min(containerW / cw, containerH / ch, 1);
      setStageScale(scale);
    });
    resizeObserver.observe(containerRef.current);
    // Initial
    const padX = 40, padY = 40;
    const containerW = containerRef.current.clientWidth - padX;
    const containerH = containerRef.current.clientHeight - padY;
    setStageScale(Math.min(containerW / cw, containerH / ch, 1));
    return () => resizeObserver.disconnect();
  }, [template, open, cw, ch]);

  /* ───────────────────────────────────────────────────────────────────────
     TRANSFORMER
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const node = selectedId ? stageRef.current.findOne(`#${selectedId}`) : null;
    if (node && selectedId !== editingTextId) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, editingTextId, layers]);

  /* ───────────────────────────────────────────────────────────────────────
     UNDO/REDO
     ─────────────────────────────────────────────────────────────────────── */
  const pushHistory = useCallback((newLayers: TemplateLayer[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIdx + 1);
      const next = [...sliced, newLayers].slice(-30);
      return next;
    });
    setHistoryIdx(prev => Math.min(prev + 1, 29));
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setLayers(history[newIdx]);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setLayers(history[newIdx]);
  }, [history, historyIdx]);

  /* ───────────────────────────────────────────────────────────────────────
     LAYER UPDATES
     ─────────────────────────────────────────────────────────────────────── */
  const updateLayer = useCallback((id: string, updates: Partial<TemplateLayer>) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updates } : l);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const updateLayerStyle = useCallback((id: string, styleUpdates: Partial<NonNullable<TemplateLayer["style"]>>) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, style: { ...l.style, ...styleUpdates } } : l);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [pushHistory, selectedId]);

  const duplicateLayer = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const clone: TemplateLayer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: `${layer.type}-${Date.now()}`,
      x: layer.x + 3,
      y: layer.y + 3,
      zIndex: Math.max(...layers.map(l => l.zIndex)) + 1,
    };
    setLayers(prev => {
      const next = [...prev, clone];
      pushHistory(next);
      return next;
    });
    setSelectedId(clone.id);
  }, [layers, pushHistory]);

  const moveLayerZ = useCallback((id: string, direction: "up" | "down") => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      if (direction === "up" && idx < next.length - 1) {
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      } else if (direction === "down" && idx > 0) {
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      }
      // Re-assign zIndex
      next.forEach((l, i) => l.zIndex = i);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const toggleLayerVisibility = useCallback((id: string) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ───────────────────────────────────────────────────────────────────────
     ADD LAYERS
     ─────────────────────────────────────────────────────────────────────── */
  const addTextLayer = useCallback(() => {
    const newLayer: TemplateLayer = {
      id: `text-${Date.now()}`,
      type: "text",
      x: 10, y: 50, width: 40, height: 10,
      dataBinding: { source: "static", field: "New Text" },
      style: { fontSize: 3.5, fontWeight: 600, color: "#FFFFFF", textAlign: "left", fontFamily: "Inter, Helvetica, Arial, sans-serif", lineHeight: 1.3, letterSpacing: 0, maxLines: 2 },
      zIndex: layers.length + 1,
    };
    setLayers(prev => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory]);

  const addShapeLayer = useCallback(() => {
    const newLayer: TemplateLayer = {
      id: `shape-${Date.now()}`,
      type: "shape",
      x: 20, y: 30, width: 30, height: 20,
      style: { fill: resolveColor("vault:primary"), opacity: 0.8, cornerRadius: 0 },
      zIndex: layers.length + 1,
    };
    setLayers(prev => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory, resolveColor]);

  const addCircleLayer = useCallback(() => {
    const newLayer: TemplateLayer = {
      id: `circle-${Date.now()}`,
      type: "circle",
      x: 30, y: 30, width: 20, height: 20,
      style: { fill: resolveColor("vault:primary"), opacity: 0.7, radius: 10 },
      zIndex: layers.length + 1,
    };
    setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory, resolveColor]);

  const addGradientLayer = useCallback(() => {
    const newLayer: TemplateLayer = {
      id: `grad-${Date.now()}`,
      type: "gradient-overlay",
      x: 0, y: 50, width: 100, height: 50,
      style: { gradientDirection: "bottom", gradientStops: [{ offset: 0, color: "#000000", opacity: 0 }, { offset: 1, color: "#000000", opacity: 0.75 }] },
      zIndex: layers.length + 1,
    };
    setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory]);

  const addLineLayer = useCallback(() => {
    const newLayer: TemplateLayer = {
      id: `line-${Date.now()}`,
      type: "line",
      x: 10, y: 50, width: 80, height: 1,
      style: { stroke: "#FFFFFF", strokeWidth: 2, points: [0, 50, 100, 50], opacity: 0.6 },
      zIndex: layers.length + 1,
    };
    setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const newId = `img-${Date.now()}`;
      setLoadedImages(prev => ({ ...prev, [newId]: img }));
      const newLayer: TemplateLayer = {
        id: newId,
        type: "image",
        x: 10, y: 10, width: 30, height: 30,
        dataBinding: { source: "static", field: url },
        style: { objectFit: "cover", opacity: 1 },
        zIndex: layers.length + 1,
      };
      setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
      setSelectedId(newId);
    };
    img.src = url;
    e.target.value = "";
  }, [layers, pushHistory]);

  /* ───────────────────────────────────────────────────────────────────────
     VAULT ASSET HELPERS
     ─────────────────────────────────────────────────────────────────────── */
  const addVaultLogo = useCallback(() => {
    const logoSrc = brandLogoUrl || vault?.logo_url || vault?.logoUrl;
    if (!logoSrc) return;
    const newId = `vault-logo-${Date.now()}`;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImages(prev => ({ ...prev, [newId]: img }));
      const newLayer: TemplateLayer = {
        id: newId,
        type: "logo",
        x: 5, y: 5, width: 15, height: 15,
        dataBinding: { source: "vault", field: "logoUrl" },
        style: { objectFit: "contain", opacity: 0.95 },
        zIndex: layers.length + 1,
      };
      setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
      setSelectedId(newId);
    };
    img.onerror = () => {};
    // Try CORS fetch first for CDN images
    fetch(logoSrc, { mode: "cors" })
      .then(r => r.blob())
      .then(blob => { img.src = URL.createObjectURL(blob); })
      .catch(() => { img.src = logoSrc; });
  }, [brandLogoUrl, vault, layers, pushHistory]);

  const addVaultText = useCallback((text: string, fontSize = 3.5) => {
    const newLayer: TemplateLayer = {
      id: `vtext-${Date.now()}`,
      type: "text",
      x: 10, y: 40, width: 50, height: 12,
      dataBinding: { source: "static", field: text },
      style: {
        fontSize, fontWeight: 600, color: "#FFFFFF", textAlign: "left",
        fontFamily: (vault?.fonts as string[])?.[0] ? `'${(vault.fonts as string[])[0]}', sans-serif` : "Inter, Helvetica, Arial, sans-serif",
        lineHeight: 1.3, letterSpacing: 0, maxLines: 3,
      },
      zIndex: layers.length + 1,
    };
    setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
    setSelectedId(newLayer.id);
  }, [vault, layers, pushHistory]);

  const addVaultAssetImage = useCallback((url: string, label: string, isLogo = false) => {
    if (!url) return;
    const newId = `vasset-${Date.now()}`;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImages(prev => ({ ...prev, [newId]: img }));
      const newLayer: TemplateLayer = {
        id: newId,
        type: isLogo ? "logo" : "image",
        x: 10, y: 10, width: isLogo ? 15 : 25, height: isLogo ? 15 : 25,
        dataBinding: { source: "static", field: url },
        style: { objectFit: isLogo ? "contain" : "cover", opacity: 1 },
        zIndex: layers.length + 1,
      };
      setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
      setSelectedId(newId);
    };
    img.onerror = () => {};
    fetch(url, { mode: "cors" })
      .then(r => r.blob())
      .then(blob => { img.src = URL.createObjectURL(blob); })
      .catch(() => { img.src = url; });
  }, [layers, pushHistory]);

  const addColorBlock = useCallback((hex: string) => {
    const newLayer: TemplateLayer = {
      id: `cblock-${Date.now()}`,
      type: "shape",
      x: 0, y: 75, width: 100, height: 25,
      style: { fill: hex, opacity: 0.9, cornerRadius: 0 },
      zIndex: layers.length + 1,
    };
    setLayers(prev => { const next = [...prev, newLayer]; pushHistory(next); return next; });
    setSelectedId(newLayer.id);
  }, [layers, pushHistory]);

  /* ───────────────────────────────────────────────────────────────────────
     INLINE TEXT EDITING (must be before keyboard shortcuts that reference these)
     ─────────────────────────────────────────────────────────────────────── */
  const startTextEdit = useCallback((layerId: string) => {
    setEditingTextId(layerId);
    setSelectedId(layerId);
  }, []);

  const finishTextEdit = useCallback(() => {
    if (!editingTextId || !textareaRef.current) return;
    const value = textareaRef.current.value;
    const layer = layers.find(l => l.id === editingTextId);
    if (layer) {
      updateLayer(editingTextId, {
        dataBinding: { source: "static", field: value },
      });
    }
    setEditingTextId(null);
  }, [editingTextId, layers, updateLayer]);

  /* ───────────────────────────────────────────────────────────────────────
     KEYBOARD SHORTCUTS
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      // Undo
      if (isMeta && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); return; }
      // Redo
      if (isMeta && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); return; }
      // Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingTextId) {
        const layer = layers.find(l => l.id === selectedId);
        if (layer && layer.type !== "background-image") { e.preventDefault(); deleteLayer(selectedId); }
        return;
      }
      // Duplicate
      if (isMeta && e.key === "d" && selectedId) { e.preventDefault(); duplicateLayer(selectedId); return; }
      // Arrow keys — nudge position
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedId && !editingTextId) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
        const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
        setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, x: l.x + dx * 0.5, y: l.y + dy * 0.5 } : l));
        return;
      }
      // Escape — deselect
      if (e.key === "Escape") { setSelectedId(null); if (editingTextId) finishTextEdit(); return; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedId, editingTextId, layers, undo, redo, deleteLayer, duplicateLayer, finishTextEdit]);

  /* ───────────────────────────────────────────────────────────────────────
     MOUSE WHEEL ZOOM
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const el = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setStageScale(s => Math.max(0.15, Math.min(3, s + delta)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open]);

  /* ───────────────────────────────────────────────────────────────────────
     SAVE & EXPORT
     ─────────────────────────────────────────────────────────────────────── */
  const handleSave = useCallback(() => {
    const customTemplate: TemplateDefinition = {
      ...template,
      id: `custom-${template.formatId}-${Date.now()}`,
      name: `Custom ${template.name}`,
      category: "complex",
      source: "ai-generated",
      layers: layers,
      createdAt: new Date().toISOString(),
    };
    registerTemplate(customTemplate);
    onSave?.(customTemplate);
    onOpenChange(false);
  }, [template, layers, onSave, onOpenChange]);

  const handleExport = useCallback(() => {
    if (!stageRef.current) return;
    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: cw / (cw * stageScale),
        mimeType: "image/png",
        quality: 1,
      });
      const link = document.createElement("a");
      link.download = `${template.name || "export"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Export not available for external CDN images.");
    }
  }, [template, cw, stageScale]);

  /* ───────────────────────────────────────────────────────────────────────
     DRAG / TRANSFORM HANDLERS
     ─────────────────────────────────────────────────────────────────────── */
  const handleDragEnd = useCallback((id: string, e: any) => {
    const node = e.target;
    updateLayer(id, {
      x: (node.x() / cw) * 100,
      y: (node.y() / ch) * 100,
    });
  }, [cw, ch, updateLayer]);

  const handleTransformEnd = useCallback((id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    updateLayer(id, {
      x: (node.x() / cw) * 100,
      y: (node.y() / ch) * 100,
      width: ((node.width() * scaleX) / cw) * 100,
      height: ((node.height() * scaleY) / ch) * 100,
    });
  }, [cw, ch, updateLayer]);

  /* ───────────────────────────────────────────────────────────────────────
     RENDER LAYER (ported from TemplateEngine + interactive props)
     ─────────────────────────────────────────────────────────────────────── */
  const renderLayer = useCallback((layer: TemplateLayer): React.ReactNode => {
    if (!isVisible(layer)) return null;
    if (hiddenLayers.has(layer.id)) return null;

    const x = (layer.x / 100) * cw;
    const y = (layer.y / 100) * ch;
    const w = (layer.width / 100) * cw;
    const h = (layer.height / 100) * ch;
    const draggable = layer.type !== "background-image";

    const interactiveProps = {
      id: layer.id,
      draggable,
      onClick: () => setSelectedId(layer.id),
      onTap: () => setSelectedId(layer.id),
      onDragEnd: (e: any) => handleDragEnd(layer.id, e),
      onTransformEnd: (e: any) => handleTransformEnd(layer.id, e),
    };

    switch (layer.type) {
      // ── Background image (cover fit, full bleed) ──
      case "background-image": {
        const img = loadedImages[layer.id];
        if (!img) {
          // Fallback: dark rect while image loads
          return (
            <Rect
              key={layer.id} id={layer.id}
              x={x} y={y} width={w} height={h}
              fill="#201F23"
              onClick={() => setSelectedId(null)}
            />
          );
        }
        return (
          <KonvaImage
            key={layer.id} id={layer.id}
            image={img}
            {...rotationProps(layer, x, y, w, h)}
            width={w} height={h}
            crop={coverCrop(img, w, h)}
            {...commonProps(layer)}
            onClick={() => setSelectedId(layer.id)}
            onTap={() => setSelectedId(layer.id)}
          />
        );
      }

      // ── Additional image (cover fit + clip mask) ──
      case "image": {
        const img = loadedImages[layer.id];
        if (!img) return null;
        const crop = coverCrop(img, w, h);
        const cp = commonProps(layer);
        const rp = rotationProps(layer, x, y, w, h);

        if (layer.style?.clipType === "circle") {
          const clipFunc = (ctx: any) => { ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); };
          return (
            <Group key={layer.id} clipFunc={clipFunc} {...rp} {...cp} {...interactiveProps}>
              <KonvaImage image={img} x={0} y={0} width={w} height={h} crop={crop} />
            </Group>
          );
        }
        if (layer.style?.clipType === "roundedRect") {
          const cr = ((layer.style?.clipRadius || 5) / 100) * Math.min(w, h);
          const clipFunc = (ctx: any) => {
            ctx.moveTo(cr, 0); ctx.arcTo(w, 0, w, h, cr); ctx.arcTo(w, h, 0, h, cr);
            ctx.arcTo(0, h, 0, 0, cr); ctx.arcTo(0, 0, w, 0, cr); ctx.closePath();
          };
          return (
            <Group key={layer.id} clipFunc={clipFunc} {...rp} {...cp} {...interactiveProps}>
              <KonvaImage image={img} x={0} y={0} width={w} height={h} crop={crop} />
            </Group>
          );
        }

        return (
          <KonvaImage key={layer.id} image={img}
            {...rp} width={w} height={h} crop={crop} {...cp} {...interactiveProps}
          />
        );
      }

      // ── Text ──
      case "text": {
        const rawText = resolveBinding(layer.dataBinding);
        if (!rawText && !editingTextId) return null;
        let text = rawText || "";
        if (layer.style?.textTransform === "uppercase") text = text.toUpperCase();
        else if (layer.style?.textTransform === "lowercase") text = text.toLowerCase();
        if (layer.style?.maxLines) {
          const lines = text.split("\n").slice(0, layer.style.maxLines);
          text = lines.join("\n");
        }
        const fontSize = ((layer.style?.fontSize || 3) / 100) * ch;
        return (
          <Text
            key={layer.id}
            {...interactiveProps}
            {...rotationProps(layer, x, y, w, h)}
            width={w} height={h}
            text={editingTextId === layer.id ? "" : text}
            fontSize={fontSize}
            fontFamily={layer.style?.fontFamily || "Inter, Helvetica, Arial, sans-serif"}
            fontStyle={layer.style?.fontWeight ? `${layer.style.fontWeight >= 700 ? "bold" : "normal"}` : "normal"}
            fill={resolveColor(layer.style?.color)}
            align={layer.style?.textAlign || "left"}
            verticalAlign="middle"
            lineHeight={layer.style?.lineHeight || 1.3}
            letterSpacing={layer.style?.letterSpacing || 0}
            wrap="word"
            ellipsis={true}
            {...commonProps(layer)}
            onDblClick={() => startTextEdit(layer.id)}
            onDblTap={() => startTextEdit(layer.id)}
          />
        );
      }

      // ── Shape (rectangle) ──
      case "shape": {
        return (
          <Rect
            key={layer.id}
            {...interactiveProps}
            {...rotationProps(layer, x, y, w, h)}
            width={w} height={h}
            fill={resolveColor(layer.style?.fill)}
            cornerRadius={layer.style?.cornerRadius || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Circle ──
      case "circle": {
        const radius = layer.style?.radius
          ? (layer.style.radius / 100) * cw
          : Math.min(w, h) / 2;
        return (
          <KonvaCircle
            key={layer.id}
            {...interactiveProps}
            x={x + w / 2} y={y + h / 2}
            radius={radius}
            fill={layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            rotation={layer.style?.rotation || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Path (SVG path data) ──
      case "path": {
        if (!layer.style?.pathData) return null;
        const pathScl = layer.style?.pathScale || 1;
        return (
          <KonvaPath
            key={layer.id}
            {...interactiveProps}
            x={x} y={y}
            data={layer.style.pathData}
            fill={layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            scaleX={pathScl * (w / 100)} scaleY={pathScl * (h / 100)}
            rotation={layer.style?.rotation || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Line (polyline / curve) ──
      case "line": {
        if (!layer.style?.points || layer.style.points.length < 4) return null;
        const absPoints = layer.style.points.map((p, i) =>
          i % 2 === 0 ? (p / 100) * cw : (p / 100) * ch
        );
        return (
          <KonvaLine
            key={layer.id}
            id={layer.id}
            points={absPoints}
            stroke={resolveColor(layer.style?.stroke || layer.style?.fill)}
            strokeWidth={layer.style?.strokeWidth || 2}
            lineCap={layer.style?.lineCap || "round"}
            lineJoin={layer.style?.lineJoin || "round"}
            tension={layer.style?.tension || 0}
            closed={layer.style?.closed || false}
            dash={layer.style?.dash}
            fill={layer.style?.closed && layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            opacity={layer.style?.opacity ?? 1}
            shadowColor={layer.style?.shadowColor}
            shadowBlur={layer.style?.shadowBlur || 0}
            draggable
            onClick={() => setSelectedId(layer.id)}
            onDragEnd={(e: any) => handleDragEnd(layer.id, e)}
          />
        );
      }

      // ── Gradient overlay ──
      case "gradient-overlay": {
        const stops = layer.style?.gradientStops || [];
        const flatStops: (number | string)[] = [];
        if (stops.length > 0) {
          for (const s of stops) {
            flatStops.push(s.offset);
            const r = parseInt(s.color.slice(1, 3), 16);
            const g = parseInt(s.color.slice(3, 5), 16);
            const b = parseInt(s.color.slice(5, 7), 16);
            flatStops.push(`rgba(${r},${g},${b},${s.opacity})`);
          }
        } else {
          // Default gradient if no stops defined
          flatStops.push(0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.7)");
        }
        return (
          <Rect
            key={layer.id}
            {...interactiveProps}
            x={x} y={y} width={w} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: h }}
            fillLinearGradientColorStops={flatStops}
            {...commonProps(layer)}
          />
        );
      }

      // ── Logo (contain fit) ──
      case "logo": {
        const img = loadedImages[layer.id];
        if (!img) {
          // Fallback: subtle placeholder while loading
          return (
            <Rect
              key={layer.id} {...interactiveProps}
              x={x} y={y} width={w} height={h}
              fill="rgba(26,23,20,0.04)"
              cornerRadius={4}
            />
          );
        }
        const imgRatio = img.width / img.height;
        const boxRatio = w / h;
        let drawW = w, drawH = h, drawX = x, drawY = y;
        if (imgRatio > boxRatio) { drawH = w / imgRatio; drawY = y + (h - drawH) / 2; }
        else { drawW = h * imgRatio; drawX = x + (w - drawW) / 2; }
        return (
          <KonvaImage
            key={layer.id} {...interactiveProps}
            image={img}
            x={drawX} y={drawY} width={drawW} height={drawH}
            {...commonProps(layer)}
          />
        );
      }

      // ── Group (recursive children) ──
      case "group": {
        if (!layer.children || layer.children.length === 0) return null;
        return (
          <Group key={layer.id} id={layer.id}
            {...rotationProps(layer, x, y, w, h)}
            opacity={layer.style?.opacity ?? 1}
            draggable
            onClick={() => setSelectedId(layer.id)}
            onDragEnd={(e: any) => handleDragEnd(layer.id, e)}
          >
            {[...layer.children]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(renderLayer)}
          </Group>
        );
      }
    }
    return null;
  }, [loadedImages, cw, ch, resolveBinding, resolveColor, isVisible, commonProps, rotationProps, hiddenLayers, editingTextId, handleDragEnd, handleTransformEnd, startTextEdit]);

  // ── Selected layer ──
  const selectedLayer = selectedId ? layers.find(l => l.id === selectedId) : null;

  // ── Vault color presets ──
  const vaultColors = (vault?.colors as { hex: string; name: string; role: string }[] | undefined) || [];

  if (!template) return null;

  /* ═══════════════════════════════════════════════════════════════════════
     INLINE TEXT EDITOR OVERLAY
     ═══════════════════════════════════════════════════════════════════════ */
  const editingLayer = editingTextId ? layers.find(l => l.id === editingTextId) : null;
  let textOverlay: React.ReactNode = null;
  if (editingLayer && editingTextId) {
    const ex = (editingLayer.x / 100) * cw * stageScale;
    const ey = (editingLayer.y / 100) * ch * stageScale;
    const ew = (editingLayer.width / 100) * cw * stageScale;
    const eh = (editingLayer.height / 100) * ch * stageScale;
    const fontSize = ((editingLayer.style?.fontSize || 3) / 100) * ch * stageScale;
    const currentText = resolveBinding(editingLayer.dataBinding);

    textOverlay = (
      <textarea
        ref={textareaRef}
        defaultValue={currentText}
        autoFocus
        onBlur={finishTextEdit}
        onKeyDown={(e) => { if (e.key === "Escape") finishTextEdit(); }}
        style={{
          position: "absolute",
          left: ex,
          top: ey,
          width: ew,
          height: eh,
          fontSize,
          fontFamily: editingLayer.style?.fontFamily || "Inter, Helvetica, Arial, sans-serif",
          fontWeight: editingLayer.style?.fontWeight || 400,
          color: resolveColor(editingLayer.style?.color),
          textAlign: (editingLayer.style?.textAlign || "left") as any,
          lineHeight: editingLayer.style?.lineHeight || 1.3,
          letterSpacing: editingLayer.style?.letterSpacing || 0,
          background: "rgba(17,17,17,0.08)",
          border: "2px solid rgba(17,17,17,0.5)",
          outline: "none",
          resize: "none",
          padding: "2px 4px",
          margin: 0,
          overflow: "hidden",
          zIndex: 100,
        }}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STYLES (reusable inline style objects)
     ═══════════════════════════════════════════════════════════════════════ */
  const inputStyle: React.CSSProperties = {
    background: "rgba(26,23,20,0.03)",
    border: "1px solid rgba(26,23,20,0.04)",
    color: "var(--foreground)",
    borderRadius: 4,
    fontSize: 11,
    padding: "3px 6px",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = { fontSize: 10, color: "#7A7572", display: "block" };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6,
  };

  const smallBtnStyle: React.CSSProperties = {
    background: "rgba(26,23,20,0.03)",
    border: "1px solid var(--border)",
    color: "var(--text-tertiary)",
    borderRadius: 4,
    fontSize: 11,
    padding: "3px 8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col p-0"
        style={{
          background: "#151413",
          border: "1px solid rgba(26,23,20,0.04)",
          maxWidth: "95vw",
          width: "95vw",
          height: "90vh",
          maxHeight: "90vh",
        }}
      >
        <DialogTitle className="sr-only">Template Editor</DialogTitle>

        {/* ─── HEADER / TOOLBAR ─── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Template Editor</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {template.name} — {cw}×{ch}
            </span>
            <span style={{ fontSize: 9, color: "#3C3A38", marginLeft: 8 }}>
              ⌘Z undo · ⌘⇧Z redo · ⌘D duplicate · ⌫ delete · ← → ↑ ↓ nudge · ⌘+scroll zoom
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Undo/Redo */}
            <button onClick={undo} disabled={historyIdx <= 0} style={{ ...smallBtnStyle, opacity: historyIdx <= 0 ? 0.3 : 1 }} title="Undo">
              <Undo2 size={12} />
            </button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} style={{ ...smallBtnStyle, opacity: historyIdx >= history.length - 1 ? 0.3 : 1 }} title="Redo">
              <Redo2 size={12} />
            </button>

            <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />

            {/* Zoom */}
            <button onClick={() => setStageScale(s => Math.max(0.2, s - 0.1))} style={smallBtnStyle} title="Zoom out">
              <ZoomOut size={12} />
            </button>
            <span style={{ fontSize: 11, color: "#7A7572", minWidth: 36, textAlign: "center" }}>{Math.round(stageScale * 100)}%</span>
            <button onClick={() => setStageScale(s => Math.min(2, s + 0.1))} style={smallBtnStyle} title="Zoom in">
              <ZoomIn size={12} />
            </button>

            <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />

            {/* Export */}
            <button onClick={handleExport} style={smallBtnStyle} title="Export PNG">
              <Download size={12} /> <span>Export</span>
            </button>

            {/* Save */}
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: "var(--ora-signal, #111111)", color: "#fff", fontSize: 12, fontWeight: 600 }}>
              <Save size={12} /> Save
            </button>
          </div>
        </div>

        {/* ─── MAIN 3-PANEL LAYOUT ─── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ═══ LEFT PANEL — Layers ═══ */}
          <div className="flex-shrink-0 border-r p-3 overflow-y-auto" style={{ width: 200, borderColor: "var(--border)" }}>
            {/* Add elements */}
            <div className="mb-4">
              <p style={sectionTitleStyle}>Add Element</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={addTextLayer} style={smallBtnStyle} title="Add text (T)">
                  <Type size={10} /> Text
                </button>
                <button onClick={addShapeLayer} style={smallBtnStyle} title="Add rectangle">
                  <Palette size={10} /> Rect
                </button>
                <button onClick={addCircleLayer} style={smallBtnStyle} title="Add circle">
                  <Circle size={10} /> Circle
                </button>
                <button onClick={addGradientLayer} style={smallBtnStyle} title="Add gradient">
                  <Layers size={10} /> Grad
                </button>
                <button onClick={addLineLayer} style={smallBtnStyle} title="Add line">
                  <Minus size={10} /> Line
                </button>
                <button onClick={() => imageInputRef.current?.click()} style={smallBtnStyle} title="Upload image">
                  <ImagePlus size={10} /> Image
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Brand Assets from Vault */}
            {vault && (
              <div className="mb-4">
                <p style={sectionTitleStyle}>Brand Vault</p>
                <div className="space-y-2">
                  {/* Logo */}
                  {(brandLogoUrl || vault?.logo_url || vault?.logoUrl) && (
                    <button
                      onClick={addVaultLogo}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                      title="Add brand logo to canvas"
                    >
                      <img
                        src={brandLogoUrl || vault?.logo_url || vault?.logoUrl}
                        alt="Logo"
                        className="w-7 h-7 rounded object-contain"
                        style={{ background: "#222" }}
                      />
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 500 }}>Add Logo</span>
                    </button>
                  )}

                  {/* Colors */}
                  {vaultColors.length > 0 && (
                    <div>
                      <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Colors — click to add block</span>
                      <div className="flex flex-wrap gap-1">
                        {vaultColors.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => addColorBlock(c.hex)}
                            title={`${c.name || c.role}: ${c.hex}`}
                            style={{
                              width: 22, height: 22, borderRadius: 4, background: c.hex,
                              border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick text from vault */}
                  {(vault?.company_name || vault?.brandName) && (
                    <button
                      onClick={() => addVaultText(vault?.company_name || vault?.brandName || "", 5)}
                      className="w-full text-left px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", fontSize: 10, color: "var(--text-tertiary)" }}
                    >
                      + Brand name: <strong style={{ color: "#C4BEB8" }}>{(vault?.company_name || vault?.brandName || "").slice(0, 20)}</strong>
                    </button>
                  )}
                  {vault?.tagline && (
                    <button
                      onClick={() => addVaultText(vault.tagline, 3)}
                      className="w-full text-left px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", fontSize: 10, color: "var(--text-tertiary)" }}
                    >
                      + Tagline: <em style={{ color: "#7A7572" }}>{(vault.tagline as string).slice(0, 25)}</em>
                    </button>
                  )}

                  {/* Vault fonts as quick-apply */}
                  {(vault?.fonts as string[])?.length > 0 && (
                    <div>
                      <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Brand Fonts</span>
                      <div className="space-y-0.5">
                        {(vault.fonts as string[]).slice(0, 4).map((f, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (selectedId) {
                                const layer = layers.find(l => l.id === selectedId);
                                if (layer?.type === "text") {
                                  updateLayerStyle(selectedId, { fontFamily: `'${f}', sans-serif` });
                                }
                              }
                            }}
                            className="w-full text-left px-2 py-1 rounded cursor-pointer transition-colors hover:bg-white/[0.06]"
                            style={{ fontSize: 10, color: "#7A7572", fontFamily: `'${f}', sans-serif` }}
                            title={selectedId ? `Apply "${f}" to selected text` : `Font: ${f}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brand Assets (logos, patterns, graphics, packshots, overlays) */}
                  {brandAssets.length > 0 && (
                    <div>
                      <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                        Brand Assets ({brandAssets.length})
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {brandAssets.filter(a => a.signedUrl).map(asset => (
                          <button
                            key={asset.id}
                            onClick={() => addVaultAssetImage(asset.signedUrl!, asset.label, asset.role === "logo")}
                            className="relative rounded overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/30"
                            style={{ aspectRatio: "1/1", background: "var(--card)" }}
                            title={`Add ${asset.label} (${asset.role})`}
                          >
                            <img src={asset.signedUrl!} alt={asset.label} className="w-full h-full object-contain p-0.5" />
                            <span className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-center truncate"
                              style={{ fontSize: 7, color: "var(--text-tertiary)", background: "rgba(0,0,0,0.7)" }}>
                              {asset.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image Bank photos */}
                  {brandImages.length > 0 && (
                    <div>
                      <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                        Image Bank ({brandImages.length})
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {brandImages.filter(img => img.signedUrl).slice(0, 9).map(img => (
                          <button
                            key={img.id}
                            onClick={() => addVaultAssetImage(img.signedUrl!, img.fileName)}
                            className="rounded overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/30"
                            style={{ aspectRatio: "1/1", background: "var(--card)" }}
                            title={`Add ${img.fileName}${img.tags?.length ? ` (${img.tags.join(", ")})` : ""}`}
                          >
                            <img src={img.signedUrl!} alt={img.fileName} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {vaultAssetsLoading && (
                    <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>Loading vault assets...</span>
                  )}
                </div>
              </div>
            )}

            {/* Layer list */}
            <div>
              <p style={sectionTitleStyle}>Layers</p>
              <div className="space-y-0.5">
                {[...layers].reverse().map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedId(layer.id)}
                    className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors"
                    style={{
                      background: selectedId === layer.id ? "rgba(17,17,17,0.15)" : "transparent",
                      border: `1px solid ${selectedId === layer.id ? "rgba(17,17,17,0.3)" : "transparent"}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {hiddenLayers.has(layer.id) ? <EyeOff size={9} style={{ color: "#3C3A38" }} /> : <Eye size={9} style={{ color: "var(--text-secondary)" }} />}
                      </button>
                      <span className="truncate" style={{ fontSize: 11, color: selectedId === layer.id ? "var(--foreground)" : "#7A7572", fontWeight: 500 }}>
                        {layer.type === "background-image" ? "Background"
                          : layer.type === "gradient-overlay" ? "Gradient"
                          : layer.type === "logo" ? "Logo"
                          : layer.id === "headline" ? "Headline"
                          : layer.id === "cta" ? "CTA"
                          : layer.type === "text" ? (resolveBinding(layer.dataBinding)?.slice(0, 18) || "Text")
                          : layer.type === "shape" ? (layer.id.includes("bar") ? "Bar" : layer.id.includes("panel") ? "Panel" : "Shape")
                          : layer.type === "circle" ? "Circle"
                          : layer.type === "line" ? "Line"
                          : layer.type === "image" ? "Image"
                          : layer.id}
                      </span>
                    </div>
                    <span style={{ fontSize: 9, color: "var(--text-secondary)", flexShrink: 0 }}>
                      {layer.type === "background-image" ? "📷" : layer.type === "text" ? "T" : layer.type === "shape" ? "□" : layer.type === "circle" ? "○" : layer.type === "gradient-overlay" ? "▓" : layer.type === "logo" ? "✦" : layer.type === "line" ? "—" : layer.type === "image" ? "🖼" : layer.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ CENTER — Canvas ═══ */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden relative" style={{ background: "#18171A" }}>
            <div style={{ position: "relative" }}>
              <Stage
                ref={stageRef}
                width={cw * stageScale}
                height={ch * stageScale}
                scaleX={stageScale}
                scaleY={stageScale}
                onClick={(e: any) => {
                  if (e.target === e.target.getStage()) {
                    setSelectedId(null);
                    if (editingTextId) finishTextEdit();
                  }
                }}
              >
                <Layer>
                  {layers.map(renderLayer)}
                  <Transformer
                    ref={trRef}
                    boundBoxFunc={(_oldBox: any, newBox: any) => newBox}
                    anchorSize={8}
                    anchorCornerRadius={2}
                    anchorStroke="#111111"
                    anchorFill="#fff"
                    borderStroke="#111111"
                    borderStrokeWidth={1.5}
                    padding={2}
                    rotateEnabled={true}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                  />
                </Layer>
              </Stage>
              {textOverlay}
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Properties ═══ */}
          <div className="flex-shrink-0 border-l p-3 overflow-y-auto" style={{ width: 240, borderColor: "var(--border)" }}>
            {selectedLayer ? (
              <div className="space-y-4">

                {/* ── Section: Position & Size ── */}
                <div>
                  <p style={sectionTitleStyle}>Position & Size</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "X", value: selectedLayer.x, key: "x" },
                      { label: "Y", value: selectedLayer.y, key: "y" },
                      { label: "W", value: selectedLayer.width, key: "width" },
                      { label: "H", value: selectedLayer.height, key: "height" },
                    ].map(item => (
                      <label key={item.key} style={labelStyle}>
                        {item.label} (%)
                        <input
                          type="number"
                          step={0.5}
                          value={Math.round(item.value * 10) / 10}
                          onChange={(e) => updateLayer(selectedLayer.id, { [item.key]: +e.target.value })}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Section: Appearance ── */}
                <div>
                  <p style={sectionTitleStyle}>Appearance</p>
                  <div className="space-y-2">
                    {/* Color / Fill */}
                    {(selectedLayer.type === "shape" || selectedLayer.type === "circle") && (
                      <label style={labelStyle}>
                        Fill
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={resolveColor(selectedLayer.style?.fill)}
                            onChange={(e) => updateLayerStyle(selectedLayer.id, { fill: e.target.value })}
                            style={{ width: 28, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                          />
                          <input
                            type="text"
                            value={resolveColor(selectedLayer.style?.fill)}
                            onChange={(e) => updateLayerStyle(selectedLayer.id, { fill: e.target.value })}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                        </div>
                        {/* Vault presets */}
                        {vaultColors.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {vaultColors.slice(0, 5).map((c, i) => (
                              <button
                                key={i}
                                onClick={() => updateLayerStyle(selectedLayer.id, { fill: c.hex })}
                                title={c.name || c.role}
                                style={{ width: 18, height: 18, borderRadius: 4, background: c.hex, border: resolveColor(selectedLayer.style?.fill) === c.hex ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
                              />
                            ))}
                          </div>
                        )}
                      </label>
                    )}

                    {selectedLayer.type === "text" && (
                      <label style={labelStyle}>
                        Text Color
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={resolveColor(selectedLayer.style?.color)}
                            onChange={(e) => updateLayerStyle(selectedLayer.id, { color: e.target.value })}
                            style={{ width: 28, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                          />
                          <input
                            type="text"
                            value={resolveColor(selectedLayer.style?.color)}
                            onChange={(e) => updateLayerStyle(selectedLayer.id, { color: e.target.value })}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                        </div>
                        {vaultColors.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {vaultColors.slice(0, 5).map((c, i) => (
                              <button
                                key={i}
                                onClick={() => updateLayerStyle(selectedLayer.id, { color: c.hex })}
                                title={c.name || c.role}
                                style={{ width: 18, height: 18, borderRadius: 4, background: c.hex, border: resolveColor(selectedLayer.style?.color) === c.hex ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
                              />
                            ))}
                          </div>
                        )}
                      </label>
                    )}

                    {/* Opacity */}
                    <label style={labelStyle}>
                      Opacity: {Math.round((selectedLayer.style?.opacity ?? 1) * 100)}%
                      <input
                        type="range" min={0} max={100}
                        value={Math.round((selectedLayer.style?.opacity ?? 1) * 100)}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { opacity: +e.target.value / 100 })}
                        className="w-full mt-1" style={{ accentColor: "#111111" }}
                      />
                    </label>

                    {/* Corner Radius (shapes) */}
                    {(selectedLayer.type === "shape") && (
                      <label style={labelStyle}>
                        Corner Radius: {selectedLayer.style?.cornerRadius || 0}
                        <input
                          type="range" min={0} max={50}
                          value={selectedLayer.style?.cornerRadius || 0}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { cornerRadius: +e.target.value })}
                          className="w-full mt-1" style={{ accentColor: "#111111" }}
                        />
                      </label>
                    )}

                    {/* Rotation */}
                    <label style={labelStyle}>
                      Rotation: {selectedLayer.style?.rotation || 0}°
                      <input
                        type="range" min={-180} max={180}
                        value={selectedLayer.style?.rotation || 0}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { rotation: +e.target.value })}
                        className="w-full mt-1" style={{ accentColor: "#111111" }}
                      />
                    </label>
                  </div>
                </div>

                {/* ── Section: Text Properties ── */}
                {selectedLayer.type === "text" && (
                  <div>
                    <p style={sectionTitleStyle}>Text</p>
                    <div className="space-y-2">
                      {/* Text content */}
                      <label style={labelStyle}>
                        Content
                        <textarea
                          value={resolveBinding(selectedLayer.dataBinding)}
                          onChange={(e) => updateLayer(selectedLayer.id, { dataBinding: { source: "static", field: e.target.value } })}
                          rows={2}
                          style={{ ...inputStyle, resize: "vertical", marginTop: 2 }}
                        />
                      </label>

                      {/* Font Size */}
                      <label style={labelStyle}>
                        Font Size: {selectedLayer.style?.fontSize || 3}%
                        <input
                          type="range" min={1} max={15} step={0.25}
                          value={selectedLayer.style?.fontSize || 3}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { fontSize: +e.target.value })}
                          className="w-full mt-1" style={{ accentColor: "#111111" }}
                        />
                      </label>

                      {/* Font Family */}
                      <label style={labelStyle}>
                        Font
                        <select
                          value={selectedLayer.style?.fontFamily || "Inter, Helvetica, Arial, sans-serif"}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { fontFamily: e.target.value })}
                          style={{ ...inputStyle, marginTop: 2 }}
                        >
                          <option value="Inter, Helvetica, Arial, sans-serif">Inter</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="Arial, sans-serif">Arial</option>
                          <option value="Helvetica, Arial, sans-serif">Helvetica</option>
                          <option value="Verdana, sans-serif">Verdana</option>
                          <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                          <option value="Impact, sans-serif">Impact</option>
                          <option value="'Times New Roman', serif">Times New Roman</option>
                          <option value="'Courier New', monospace">Courier New</option>
                          <option value="'Playfair Display', Georgia, serif">Playfair Display</option>
                          <option value="'Montserrat', Helvetica, sans-serif">Montserrat</option>
                          <option value="'Poppins', sans-serif">Poppins</option>
                          <option value="'Roboto', Arial, sans-serif">Roboto</option>
                          <option value="'Oswald', sans-serif">Oswald</option>
                          <option value="'Raleway', sans-serif">Raleway</option>
                          <option value="'Lato', sans-serif">Lato</option>
                          <option value="'Open Sans', sans-serif">Open Sans</option>
                          <option value="'Bebas Neue', Impact, sans-serif">Bebas Neue</option>
                        </select>
                      </label>

                      {/* Font Weight */}
                      <label style={labelStyle}>
                        Weight
                        <select
                          value={selectedLayer.style?.fontWeight || 400}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { fontWeight: +e.target.value })}
                          style={{ ...inputStyle, marginTop: 2 }}
                        >
                          <option value={300}>Light (300)</option>
                          <option value={400}>Regular (400)</option>
                          <option value={500}>Medium (500)</option>
                          <option value={600}>SemiBold (600)</option>
                          <option value={700}>Bold (700)</option>
                          <option value={800}>ExtraBold (800)</option>
                          <option value={900}>Black (900)</option>
                        </select>
                      </label>

                      {/* Text Align */}
                      <div>
                        <span style={labelStyle}>Align</span>
                        <div className="flex gap-1 mt-1">
                          {([
                            { value: "left", icon: AlignLeft },
                            { value: "center", icon: AlignCenter },
                            { value: "right", icon: AlignRight },
                          ] as const).map(({ value, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: value })}
                              style={{
                                ...smallBtnStyle,
                                background: (selectedLayer.style?.textAlign || "left") === value ? "rgba(17,17,17,0.2)" : "rgba(26,23,20,0.03)",
                                borderColor: (selectedLayer.style?.textAlign || "left") === value ? "rgba(17,17,17,0.4)" : "var(--border)",
                              }}
                            >
                              <Icon size={12} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Transform */}
                      <div>
                        <span style={labelStyle}>Transform</span>
                        <div className="flex gap-1 mt-1">
                          {([
                            { value: "none", label: "Aa" },
                            { value: "uppercase", label: "AA" },
                            { value: "lowercase", label: "aa" },
                          ] as const).map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => updateLayerStyle(selectedLayer.id, { textTransform: value })}
                              style={{
                                ...smallBtnStyle,
                                background: (selectedLayer.style?.textTransform || "none") === value ? "rgba(17,17,17,0.2)" : "rgba(26,23,20,0.03)",
                                borderColor: (selectedLayer.style?.textTransform || "none") === value ? "rgba(17,17,17,0.4)" : "var(--border)",
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Line Height */}
                      <label style={labelStyle}>
                        Line Height: {selectedLayer.style?.lineHeight || 1.3}
                        <input
                          type="range" min={0.8} max={2.5} step={0.1}
                          value={selectedLayer.style?.lineHeight || 1.3}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { lineHeight: +e.target.value })}
                          className="w-full mt-1" style={{ accentColor: "#111111" }}
                        />
                      </label>

                      {/* Letter Spacing */}
                      <label style={labelStyle}>
                        Letter Spacing: {selectedLayer.style?.letterSpacing || 0}
                        <input
                          type="range" min={-2} max={10} step={0.5}
                          value={selectedLayer.style?.letterSpacing || 0}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { letterSpacing: +e.target.value })}
                          className="w-full mt-1" style={{ accentColor: "#111111" }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* ── Section: Border & Shadow ── */}
                <div>
                  <p style={sectionTitleStyle}>Border & Shadow</p>
                  <div className="space-y-2">
                    <label style={labelStyle}>
                      Stroke Color
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="color"
                          value={resolveColor(selectedLayer.style?.stroke) || "#FFFFFF"}
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { stroke: e.target.value })}
                          style={{ width: 28, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        />
                        <input
                          type="text"
                          value={selectedLayer.style?.stroke || ""}
                          placeholder="none"
                          onChange={(e) => updateLayerStyle(selectedLayer.id, { stroke: e.target.value })}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                    </label>

                    <label style={labelStyle}>
                      Stroke Width: {selectedLayer.style?.strokeWidth || 0}
                      <input
                        type="range" min={0} max={10} step={0.5}
                        value={selectedLayer.style?.strokeWidth || 0}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { strokeWidth: +e.target.value })}
                        className="w-full mt-1" style={{ accentColor: "#111111" }}
                      />
                    </label>

                    <label style={labelStyle}>
                      Shadow Blur: {selectedLayer.style?.shadowBlur || 0}
                      <input
                        type="range" min={0} max={40}
                        value={selectedLayer.style?.shadowBlur || 0}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { shadowBlur: +e.target.value })}
                        className="w-full mt-1" style={{ accentColor: "#111111" }}
                      />
                    </label>

                    {(selectedLayer.style?.shadowBlur || 0) > 0 && (
                      <>
                        <label style={labelStyle}>
                          Shadow Color
                          <input
                            type="color"
                            value={selectedLayer.style?.shadowColor || "#000000"}
                            onChange={(e) => updateLayerStyle(selectedLayer.id, { shadowColor: e.target.value })}
                            style={{ width: "100%", height: 22, marginTop: 2, border: "none", cursor: "pointer" }}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <label style={labelStyle}>
                            Shadow X
                            <input
                              type="number"
                              value={selectedLayer.style?.shadowOffsetX || 0}
                              onChange={(e) => updateLayerStyle(selectedLayer.id, { shadowOffsetX: +e.target.value })}
                              style={{ ...inputStyle, marginTop: 2 }}
                            />
                          </label>
                          <label style={labelStyle}>
                            Shadow Y
                            <input
                              type="number"
                              value={selectedLayer.style?.shadowOffsetY || 0}
                              onChange={(e) => updateLayerStyle(selectedLayer.id, { shadowOffsetY: +e.target.value })}
                              style={{ ...inputStyle, marginTop: 2 }}
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Section: Actions ── */}
                <div>
                  <p style={sectionTitleStyle}>Actions</p>
                  <div className="space-y-1.5">
                    {/* Z-order */}
                    <div className="flex gap-1.5">
                      <button onClick={() => moveLayerZ(selectedLayer.id, "up")} style={smallBtnStyle} title="Bring forward">
                        <ChevronUp size={12} /> Forward
                      </button>
                      <button onClick={() => moveLayerZ(selectedLayer.id, "down")} style={smallBtnStyle} title="Send backward">
                        <ChevronDown size={12} /> Back
                      </button>
                    </div>

                    {/* Duplicate */}
                    <button onClick={() => duplicateLayer(selectedLayer.id)} style={{ ...smallBtnStyle, width: "100%", justifyContent: "center" }}>
                      <Copy size={12} /> Duplicate Layer
                    </button>

                    {/* Delete */}
                    {selectedLayer.type !== "background-image" && (
                      <button
                        onClick={() => deleteLayer(selectedLayer.id)}
                        style={{
                          ...smallBtnStyle,
                          width: "100%",
                          justifyContent: "center",
                          background: "rgba(212,24,61,0.08)",
                          color: "#d4183d",
                          borderColor: "rgba(212,24,61,0.15)",
                        }}
                      >
                        <Trash2 size={12} /> Delete Layer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4" style={{ color: "var(--text-secondary)" }}>
                <Layers size={24} style={{ color: "#3C3A38", marginBottom: 12 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#7A7572" }}>Select a layer</p>
                <p style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>Click elements on the canvas or in the layer list to edit their properties</p>
                <div className="mt-6 text-left w-full space-y-2" style={{ fontSize: 10, color: "#3C3A38" }}>
                  <p><strong style={{ color: "var(--text-secondary)" }}>Quick Tips:</strong></p>
                  <p>• Double-click text to edit inline</p>
                  <p>• Drag elements to reposition</p>
                  <p>• Use corner handles to resize</p>
                  <p>• ⌘Z / ⌘⇧Z to undo / redo</p>
                  <p>• Arrow keys to nudge (⇧ for 5px)</p>
                  <p>• ⌘D to duplicate selected</p>
                  <p>• Delete / Backspace to remove</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
