import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download, X, ZoomIn, ZoomOut, RotateCcw, Upload,
  Loader2, CheckCircle, RefreshCw, MousePointer2,
  Type, ImageIcon, Trash2, Pencil, Square, Move,
  Crosshair, Eraser, Wand2, Eye,
} from "lucide-react";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN COMPOSITOR v8 — Template Editing + Inpainting

   Paradigm shift: the original image IS the canvas.
   User draws zones on top → replaces text or photos via inpainting.
   No decomposition, no layer extraction.

   Flow:
   1. DISPLAY   → Original image as-is, full resolution
   2. SELECT    → User draws rectangles on zones to edit
   3. LABEL     → Each zone: "text" or "photo"
   4. EDIT      → Type new text or upload new photo
   5. INPAINT   → AI replaces just that zone (GPT Image / Kontext)
   6. EXPORT    → Download final result
   ═══════════════════════════════════════════════════════════ */

// ── Types ──
interface EditZone {
  id: string;
  type: "text" | "photo";
  rect: { x: number; y: number; w: number; h: number }; // % of image
  label: string;
  // For text zones
  newText?: string;
  // For photo zones
  newPhotoUrl?: string; // blob URL of uploaded replacement
  newPhotoFile?: File;
  // Inpainting result
  status: "pending" | "processing" | "done" | "error";
  resultImageUrl?: string;
  errorMessage?: string;
}

interface CompositorProps {
  tokens?: any;
  blueprintId?: string;
  originalImageDataUri?: string;
  serverPost: (path: string, body: any, timeoutMs?: number) => Promise<any>;
  onExport?: (dataUrl: string) => void;
  onClose?: () => void;
}

export function CampaignCompositor({
  originalImageDataUri, serverPost, onExport, onClose,
}: CompositorProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [currentImage, setCurrentImage] = useState<string>(originalImageDataUri || "");
  const [imgNatural, setImgNatural] = useState({ w: 1000, h: 1000 });
  const [zoom, setZoom] = useState(1);
  const [autoFitDone, setAutoFitDone] = useState(false);

  // Tool state
  const [tool, setTool] = useState<"select" | "draw">("draw");
  const [zones, setZones] = useState<EditZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [drawingZoneType, setDrawingZoneType] = useState<"text" | "photo">("text");

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // File input for photo replacement
  const [pendingPhotoZoneId, setPendingPhotoZoneId] = useState<string | null>(null);

  // ── Image load → auto-fit zoom ──
  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    const nw = imgRef.current.naturalWidth;
    const nh = imgRef.current.naturalHeight;
    setImgNatural({ w: nw, h: nh });
    if (!autoFitDone) {
      // Fit image to ~500px display area
      const fitZoom = Math.min(1, Math.min(500 / nw, 500 / nh));
      setZoom(fitZoom);
      setAutoFitDone(true);
    }
  }, [autoFitDone]);

  // ── Mouse → % coordinates ──
  const mouseToPercent = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // ── Drawing handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool !== "draw") return;
    e.preventDefault();
    const p = mouseToPercent(e);
    setDrawStart(p);
    setDrawCurrent(p);
    setIsDrawing(true);
  }, [tool, mouseToPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    setDrawCurrent(mouseToPercent(e));
  }, [isDrawing, mouseToPercent]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    // Ignore tiny zones (accidental clicks)
    if (w > 2 && h > 2) {
      const newZone: EditZone = {
        id: `zone-${Date.now()}`,
        type: drawingZoneType,
        rect: { x, y, w, h },
        label: drawingZoneType === "text"
          ? `Texte ${zones.filter(z => z.type === "text").length + 1}`
          : `Photo ${zones.filter(z => z.type === "photo").length + 1}`,
        status: "pending",
      };
      setZones(prev => [...prev, newZone]);
      setSelectedZoneId(newZone.id);
      setTool("select"); // Switch to select after drawing
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [isDrawing, drawStart, drawCurrent, drawingZoneType, zones]);

  // ── Delete zone ──
  const deleteZone = useCallback((id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  }, [selectedZoneId]);

  // ── Photo file upload ──
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPhotoZoneId) return;
    const url = URL.createObjectURL(file);
    setZones(prev => prev.map(z =>
      z.id === pendingPhotoZoneId ? { ...z, newPhotoUrl: url, newPhotoFile: file } : z
    ));
    setPendingPhotoZoneId(null);
    e.target.value = "";
  }, [pendingPhotoZoneId]);

  // ══════════════════════════════════════
  // INPAINTING — Replace zone content via AI
  // ══════════════════════════════════════
  const inpaintZone = useCallback(async (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !currentImage) return;

    // Validate
    if (zone.type === "text" && !zone.newText?.trim()) {
      toast.error("Entrez le nouveau texte d'abord");
      return;
    }
    if (zone.type === "photo" && !zone.newPhotoUrl) {
      toast.error("Uploadez une photo de remplacement d'abord");
      return;
    }

    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, status: "processing" } : z));
    setProcessing(true);

    try {
      let payload: any = {
        originalImageDataUri: currentImage,
        zone: {
          type: zone.type,
          rect: zone.rect, // % coordinates
        },
      };

      if (zone.type === "text") {
        payload.zone.newText = zone.newText;
      }

      if (zone.type === "photo" && zone.newPhotoFile) {
        // Convert photo to data URI
        const photoDataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(zone.newPhotoFile!);
        });
        payload.zone.newPhotoDataUri = photoDataUri;
      }

      const res = await serverPost("/vault/inpaint-zone", payload, 120_000);

      if (res.success && res.resultImageUrl) {
        // Update current image with result
        setCurrentImage(res.resultImageUrl);
        setZones(prev => prev.map(z => z.id === zoneId
          ? { ...z, status: "done", resultImageUrl: res.resultImageUrl }
          : z
        ));
        toast.success("Zone remplacée !");
      } else {
        setZones(prev => prev.map(z => z.id === zoneId
          ? { ...z, status: "error", errorMessage: res.error || "Échec" }
          : z
        ));
        toast.error("Inpainting échoué", { description: res.error });
      }
    } catch (err: any) {
      setZones(prev => prev.map(z => z.id === zoneId
        ? { ...z, status: "error", errorMessage: err?.message }
        : z
      ));
      toast.error("Erreur", { description: err?.message });
    }
    setProcessing(false);
  }, [zones, currentImage, serverPost]);

  // ── Apply all pending zones ──
  const applyAllZones = useCallback(async () => {
    const pending = zones.filter(z => z.status === "pending" && (
      (z.type === "text" && z.newText?.trim()) ||
      (z.type === "photo" && z.newPhotoUrl)
    ));
    if (pending.length === 0) {
      toast.error("Aucune zone prête à appliquer");
      return;
    }
    for (const zone of pending) {
      await inpaintZone(zone.id);
    }
  }, [zones, inpaintZone]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!currentImage) return;
    setExporting(true);
    try {
      // Fetch the current image and download
      const link = document.createElement("a");
      link.download = `campaign-edited-${Date.now()}.png`;
      link.href = currentImage;
      link.click();
      onExport?.(currentImage);
      toast.success("Image exportée !");
    } catch {
      toast.error("Export échoué");
    }
    setExporting(false);
  }, [currentImage, onExport]);

  // Current drawing rect (in %)
  const drawRect = isDrawing && drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const pendingCount = zones.filter(z => z.status === "pending" && (
    (z.type === "text" && z.newText?.trim()) || (z.type === "photo" && z.newPhotoUrl)
  )).length;

  if (!currentImage) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted-foreground)" }}>
        <p style={{ fontSize: 13 }}>Aucune image à éditer</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-full">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />

      {/* ═══ LEFT: Canvas ═══ */}
      <div className="flex-1 flex flex-col" style={{ background: "#1a1a1a", borderRadius: 14, overflow: "hidden", minWidth: 0 }}>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-2 justify-between" style={{ borderBottom: "1px solid #333" }}>
          <div className="flex items-center gap-1.5">
            {/* Tool buttons */}
            <button
              onClick={() => setTool("select")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all"
              style={{
                background: tool === "select" ? "#7C3AED" : "#333",
                color: "#fff", fontSize: 10, fontWeight: 600,
                border: "1px solid " + (tool === "select" ? "#7C3AED" : "#555"),
              }}
            >
              <MousePointer2 size={11} /> Sélection
            </button>

            <button
              onClick={() => { setTool("draw"); setDrawingZoneType("text"); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all"
              style={{
                background: tool === "draw" && drawingZoneType === "text" ? "#f59e0b" : "#333",
                color: "#fff", fontSize: 10, fontWeight: 600,
                border: "1px solid " + (tool === "draw" && drawingZoneType === "text" ? "#f59e0b" : "#555"),
              }}
            >
              <Type size={11} /> Zone texte
            </button>

            <button
              onClick={() => { setTool("draw"); setDrawingZoneType("photo"); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all"
              style={{
                background: tool === "draw" && drawingZoneType === "photo" ? "#EC4899" : "#333",
                color: "#fff", fontSize: 10, fontWeight: 600,
                border: "1px solid " + (tool === "draw" && drawingZoneType === "photo" ? "#EC4899" : "#555"),
              }}
            >
              <ImageIcon size={11} /> Zone photo
            </button>

            <div style={{ width: 1, height: 16, background: "#444", margin: "0 4px" }} />

            {/* Zoom */}
            <button onClick={() => setZoom(z => Math.max(0.15, z - 0.1))} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "#333", color: "#fff", border: "1px solid #555" }}>
              <ZoomOut size={10} />
            </button>
            <span style={{ fontSize: 10, fontWeight: 600, minWidth: 32, textAlign: "center", color: "#fff" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "#333", color: "#fff", border: "1px solid #555" }}>
              <ZoomIn size={10} />
            </button>
            <button onClick={() => { setAutoFitDone(false); handleImageLoad(); }} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "#333", color: "#fff", border: "1px solid #555" }}>
              <RotateCcw size={10} />
            </button>
          </div>

          <span style={{ fontSize: 9, color: "#666" }}>{imgNatural.w}×{imgNatural.h}</span>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasContainerRef}
          style={{ overflow: "auto", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            style={{
              position: "relative",
              width: imgNatural.w * zoom,
              height: imgNatural.h * zoom,
              flexShrink: 0,
              cursor: tool === "draw" ? "crosshair" : "default",
              userSelect: "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (isDrawing) handleMouseUp(); }}
          >
            {/* The image */}
            <img
              ref={imgRef}
              src={currentImage}
              alt="campaign"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                width: "100%", height: "100%",
                objectFit: "contain",
                borderRadius: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                pointerEvents: "none",
              }}
            />

            {/* Existing zones overlay */}
            {zones.map(zone => {
              const isSelected = selectedZoneId === zone.id;
              const color = zone.type === "text" ? "#f59e0b" : "#EC4899";
              const statusColor = zone.status === "done" ? "#00A651" : zone.status === "error" ? "#ef4444" : zone.status === "processing" ? "#7C3AED" : color;

              return (
                <div
                  key={zone.id}
                  onClick={(e) => { e.stopPropagation(); setTool("select"); setSelectedZoneId(zone.id); }}
                  style={{
                    position: "absolute",
                    left: `${zone.rect.x}%`,
                    top: `${zone.rect.y}%`,
                    width: `${zone.rect.w}%`,
                    height: `${zone.rect.h}%`,
                    border: `2px ${isSelected ? "solid" : "dashed"} ${statusColor}`,
                    background: isSelected ? `${color}15` : `${color}08`,
                    borderRadius: 4,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    zIndex: isSelected ? 10 : 1,
                  }}
                >
                  {/* Zone label badge */}
                  <div style={{
                    position: "absolute", top: -10, left: 4,
                    background: statusColor, color: "#fff",
                    fontSize: 8, fontWeight: 700, padding: "1px 6px",
                    borderRadius: 4, whiteSpace: "nowrap",
                    textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>
                    {zone.type === "text" ? "T" : "📷"} {zone.label}
                    {zone.status === "done" && " ✓"}
                    {zone.status === "processing" && " ⏳"}
                  </div>

                  {/* Processing spinner */}
                  {zone.status === "processing" && (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.5)", borderRadius: 2,
                    }}>
                      <Loader2 size={16} style={{ color: "#fff", animation: "spin 1s linear infinite" }} />
                    </div>
                  )}

                  {/* New text preview */}
                  {zone.type === "text" && zone.newText && zone.status !== "done" && (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 600, color, padding: 4,
                      textAlign: "center", overflow: "hidden", wordBreak: "break-word",
                    }}>
                      {zone.newText}
                    </div>
                  )}

                  {/* Photo preview */}
                  {zone.type === "photo" && zone.newPhotoUrl && zone.status !== "done" && (
                    <img src={zone.newPhotoUrl} alt="replacement"
                      style={{
                        position: "absolute", inset: 2, width: "calc(100% - 4px)", height: "calc(100% - 4px)",
                        objectFit: "cover", borderRadius: 2, opacity: 0.7,
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Active drawing rectangle */}
            {drawRect && (
              <div style={{
                position: "absolute",
                left: `${drawRect.x}%`,
                top: `${drawRect.y}%`,
                width: `${drawRect.w}%`,
                height: `${drawRect.h}%`,
                border: `2px dashed ${drawingZoneType === "text" ? "#f59e0b" : "#EC4899"}`,
                background: `${drawingZoneType === "text" ? "#f59e0b" : "#EC4899"}15`,
                borderRadius: 4,
                pointerEvents: "none",
              }} />
            )}
          </div>
        </div>

        {/* Hint bar */}
        <div className="px-3 py-1.5 flex items-center justify-center" style={{ background: "#222", borderTop: "1px solid #333" }}>
          <span style={{ fontSize: 9, color: "#888" }}>
            {tool === "draw"
              ? `🎯 Dessinez un rectangle sur la zone à remplacer (${drawingZoneType === "text" ? "texte" : "photo"})`
              : zones.length > 0
                ? "👆 Cliquez une zone pour l'éditer — ou dessinez-en une nouvelle"
                : "👆 Sélectionnez un outil puis dessinez sur l'image"
            }
          </span>
        </div>
      </div>

      {/* ═══ RIGHT: Edit Panel ═══ */}
      <div className="flex-shrink-0 flex flex-col" style={{ width: 280, maxHeight: "100%" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Zones éditables</h3>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
              Dessinez sur les zones à modifier
            </p>
          </div>
          {onClose && <button onClick={onClose} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>}
        </div>

        {/* Zone list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {zones.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3" style={{ color: "var(--muted-foreground)" }}>
              <Crosshair size={28} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
                Sélectionnez <strong>"Zone texte"</strong> ou <strong>"Zone photo"</strong><br/>
                puis dessinez un rectangle sur la zone à remplacer
              </p>
            </div>
          )}

          {zones.map(zone => {
            const isSelected = selectedZoneId === zone.id;
            const color = zone.type === "text" ? "#f59e0b" : "#EC4899";

            return (
              <div key={zone.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  border: isSelected ? `2px solid ${color}` : "1px solid var(--border)",
                  background: isSelected ? `${color}08` : "var(--background)",
                }}
                onClick={() => setSelectedZoneId(zone.id)}
              >
                {/* Zone header */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: isSelected ? `1px solid ${color}20` : "none" }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${color}20` }}>
                    {zone.type === "text" ? <Type size={10} style={{ color }} /> : <ImageIcon size={10} style={{ color }} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{zone.label}</span>

                  {/* Status badge */}
                  {zone.status === "done" && <CheckCircle size={12} style={{ color: "#00A651" }} />}
                  {zone.status === "processing" && <Loader2 size={12} className="animate-spin" style={{ color: "#7C3AED" }} />}
                  {zone.status === "error" && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>Erreur</span>}

                  {/* Delete */}
                  <button onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                    className="cursor-pointer p-0.5 rounded hover:bg-[#ff000015]" style={{ color: "var(--muted-foreground)" }}>
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Zone editor (when selected) */}
                {isSelected && (
                  <div className="px-3 py-2.5">
                    {zone.type === "text" ? (
                      /* Text editor */
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Nouveau texte
                        </label>
                        <textarea
                          value={zone.newText || ""}
                          onChange={e => setZones(prev => prev.map(z =>
                            z.id === zone.id ? { ...z, newText: e.target.value, status: "pending" } : z
                          ))}
                          placeholder="Tapez le texte de remplacement..."
                          rows={2}
                          className="w-full mt-1 px-2.5 py-2 rounded-lg outline-none resize-none"
                          style={{
                            fontSize: 12, border: `1px solid ${color}40`,
                            background: "var(--background)",
                          }}
                          autoFocus
                        />
                        {zone.newText?.trim() && zone.status === "pending" && (
                          <button onClick={() => inpaintZone(zone.id)}
                            disabled={processing}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-40"
                            style={{ background: color, color: "#fff", fontSize: 11, fontWeight: 700, border: "none" }}>
                            <Wand2 size={11} /> Remplacer le texte
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Photo editor */
                      <div>
                        {zone.newPhotoUrl ? (
                          <div className="relative mb-2">
                            <img src={zone.newPhotoUrl} alt="new" style={{
                              width: "100%", height: 80, objectFit: "cover", borderRadius: 8,
                              border: `1px solid ${color}40`,
                            }} />
                            <button onClick={() => setZones(prev => prev.map(z =>
                              z.id === zone.id ? { ...z, newPhotoUrl: undefined, newPhotoFile: undefined, status: "pending" } : z
                            ))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                              style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                              <X size={8} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => {
                            setPendingPhotoZoneId(zone.id);
                            fileInputRef.current?.click();
                          }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer transition-all mb-2"
                            style={{ background: `${color}10`, border: `1.5px dashed ${color}40`, color, fontSize: 11, fontWeight: 600 }}>
                            <Upload size={12} /> Uploader la photo de remplacement
                          </button>
                        )}
                        {zone.newPhotoUrl && zone.status === "pending" && (
                          <button onClick={() => inpaintZone(zone.id)}
                            disabled={processing}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-40"
                            style={{ background: color, color: "#fff", fontSize: 11, fontWeight: 700, border: "none" }}>
                            <Wand2 size={11} /> Remplacer la photo
                          </button>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {zone.status === "error" && zone.errorMessage && (
                      <p style={{ fontSize: 9, color: "#ef4444", marginTop: 4 }}>{zone.errorMessage}</p>
                    )}

                    {/* Zone coordinates */}
                    <div style={{ fontSize: 8, color: "var(--muted-foreground)", marginTop: 6 }}>
                      Position: {zone.rect.x.toFixed(0)}% , {zone.rect.y.toFixed(0)}% — Taille: {zone.rect.w.toFixed(0)}% × {zone.rect.h.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          {pendingCount > 0 && (
            <button onClick={applyAllZones}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#fff", fontSize: 11, fontWeight: 700, border: "none" }}>
              {processing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              Appliquer {pendingCount} zone{pendingCount > 1 ? "s" : ""} ({processing ? "en cours..." : "IA"})
            </button>
          )}

          {/* Undo = reset to original */}
          {currentImage !== originalImageDataUri && (
            <button onClick={() => { setCurrentImage(originalImageDataUri || ""); setZones([]); setSelectedZoneId(null); }}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl cursor-pointer transition-all"
              style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 11, fontWeight: 600, border: "1px solid var(--border)" }}>
              <RotateCcw size={11} /> Revenir à l'original
            </button>
          )}

          <button onClick={handleExport} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 11, fontWeight: 700, border: "none" }}>
            {exporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
}
