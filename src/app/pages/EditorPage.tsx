/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Ora Editor — workspace for the generated image.

   Three tools available on top of every Ora-generated post:

   1. Text tool — multi-block draggable overlay. Each block has its own
      font / size / color / weight / alignment. Vault palette is
      surfaced as one-click swatches. Snap guides at center and the
      rule-of-thirds bottom band help land headlines cleanly.

   2. AI Edit — the existing prompt → Photoroom/Ideogram pipeline. Each
      generate replaces the image; undo steps back through versions.

   3. Download — flatten the canvas (image + text blocks) to a PNG
      that matches the published resolution (1080 long edge by default).

   Why a real editor instead of inline-editing in the SurprisePage
   grid? The grid is for triage — scan six posts, pick the winner.
   Real composition (multiple text blocks, drag positioning, color
   theming) needs breathing room and a dedicated canvas; cramming it
   into a 280px-wide grid card was visibly compromising the UX.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Loader2, Wand2, Download, ArrowLeft, RotateCcw, Sparkles, Type, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { Button } from "../components/ora/Button";
import { COLORS } from "../components/ora/tokens";
import { editImage } from "../lib/editor/aiFill";
import {
  SlideTextOverlay,
  type OverlayBlock,
  seedBlocksFromLLM,
  newBlock,
  flattenSlideToBlob,
} from "../components/SlideTextOverlay";
import { API_BASE, publicAnonKey } from "../lib/supabase";

const DISPLAY = `"Bagel Fat One", "Inter", system-ui, sans-serif`;

const EXAMPLES = [
  "Replace the background with a sunset beach",
  "Make it black and white",
  "Add soft golden hour lighting",
  "Remove the people behind",
];

type NavState = {
  assetUrl?: string;
  assetId?: string;
  // Optional seed coming from SurprisePage — the LLM-generated headline
  // that was shown on the slide preview. Seeded as the first text block
  // so the user can start by tweaking it rather than typing from scratch.
  overlayText?: string;
  overlayPosition?: "top" | "center" | "bottom";
  overlayStyle?: "headline" | "value-prop" | "cta" | "caption";
};

export function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <EditorWorkspace />
    </RouteGuard>
  );
}
export default EditorPage;

function EditorWorkspace() {
  const { getAuthHeader } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as NavState | null) || null;
  const preloadUrl = navState?.assetUrl || null;

  // ── Image state ───────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string | null>(preloadUrl);
  const [imgRatio, setImgRatio] = useState<number>(1);
  const [imageHistory, setImageHistory] = useState<string[]>(preloadUrl ? [preloadUrl] : []);

  // ── Brand palette (read once for the toolbar swatches) ────────────
  const [palette, setPalette] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthHeader();
        if (!token) return;
        const res = await fetch(`${API_BASE}/vault/load`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ _token: token }),
        });
        const d = await res.json().catch(() => ({}));
        if (d?.success && Array.isArray(d.vault?.colors)) {
          const hexes = d.vault.colors
            .map((c: any) => (typeof c === "string" ? c : c?.hex))
            .filter((x: any): x is string => typeof x === "string" && /^#?[0-9a-f]{6}$/i.test(x))
            .map((x: string) => (x.startsWith("#") ? x : `#${x}`))
            .slice(0, 6);
          setPalette(hexes);
        }
      } catch { /* palette is optional */ }
    })();
  }, [getAuthHeader]);

  // ── Text blocks ───────────────────────────────────────────────────
  // Seeded from the navState's LLM headline on first mount; the user
  // can then edit, drag, restyle, or replace.
  const [blocks, setBlocks] = useState<OverlayBlock[]>(() => seedBlocksFromLLM({
    text: navState?.overlayText,
    position: navState?.overlayPosition,
    style: navState?.overlayStyle,
  }));

  // ── AI edit ──────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const applyEdit = useCallback(async () => {
    if (!imageUrl) { toast.error("Open an image from your Library first."); return; }
    if (!prompt.trim()) { toast.error("Describe the edit you want."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const newUrl = await editImage({ imageUrl, prompt, getAuthHeader });
      setImageUrl(newUrl);
      setImageHistory((h) => [...h, newUrl]);
      setPrompt("");
      toast.success("Created");
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [imageUrl, prompt, busy, getAuthHeader]);

  // ⌘↩ / Ctrl↩ to fire Generate from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        applyEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyEdit]);

  const undo = () => {
    if (imageHistory.length < 2) return;
    const next = imageHistory.slice(0, -1);
    setImageHistory(next);
    setImageUrl(next[next.length - 1]);
  };

  // ── Canvas + flatten download ────────────────────────────────────
  const slideAreaRef = useRef<HTMLDivElement | null>(null);

  const download = async () => {
    if (!imageUrl) return;
    const node = slideAreaRef.current;
    // Flatten the canvas (image + overlay) so users get a single PNG
    // with their text baked in. Falls back to the raw image if anything
    // (CORS, canvas tainting) goes wrong.
    if (node && blocks.length > 0) {
      try {
        const blob = await flattenSlideToBlob(node, { targetLongEdge: 1080 });
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "ora-edit.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(a.href);
          return;
        }
      } catch { /* fall through to raw */ }
    }
    // No blocks, or flatten failed → download the bare image.
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "ora-edit.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Add a fresh text block centered on the canvas, ready to be edited.
  const addBlock = () => setBlocks((bs) => [...bs, newBlock(palette)]);

  // Wipe every text block from the canvas — handy when the user wants
  // to start the composition over without losing the image.
  const clearBlocks = () => setBlocks([]);

  // List view on the right rail — clicking a block name selects it on
  // the canvas. We pass selection state via a separate id so the
  // overlay component remains decoupled from the rail.
  const blockSummary = useMemo(() => blocks.map(b => ({ id: b.id, text: b.text || "(empty)" })), [blocks]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <AppTabs active="edit" />

      <main className="flex-1 flex flex-col items-center px-5 md:px-10 py-8 md:py-12">
        <div className="w-full max-w-[1320px]">
          {/* Heading + top action bar */}
          <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="leading-[0.98]" style={{ fontFamily: DISPLAY, fontSize: "clamp(32px, 4.6vw, 56px)", color: COLORS.ink }}>
                Edit your creation.
              </h1>
              <p className="mt-2 text-[14px] md:text-[15px]" style={{ color: COLORS.muted, maxWidth: 600 }}>
                Add text, restyle, regenerate with a prompt. Download flattens everything into a single PNG.
              </p>
            </div>
            {imageUrl && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={undo} disabled={imageHistory.length < 2 || busy} title="Step back to the previous AI edit">
                  <RotateCcw size={13} /> Undo
                </Button>
                <Button variant="accent" size="sm" onClick={download} disabled={busy}>
                  <Download size={13} /> Download
                </Button>
              </div>
            )}
          </div>

          {!imageUrl ? (
            <EmptyState onOpenLibrary={() => navigate("/hub/library")} />
          ) : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 items-start">
              {/* ── Canvas ─────────────────────────────────────────── */}
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center mx-auto w-full"
                style={{
                  background: "#FFF",
                  border: `1px solid ${COLORS.line}`,
                  boxShadow: "0 1px 2px rgba(17,17,17,0.04)",
                  maxWidth: `min(100%, calc((100vh - 280px) * ${imgRatio}))`,
                }}
              >
                <div
                  ref={slideAreaRef}
                  className="relative w-full"
                  style={{ aspectRatio: String(imgRatio) }}
                >
                  <img
                    src={imageUrl}
                    alt="Current"
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setImgRatio(img.naturalWidth / img.naturalHeight);
                      }
                    }}
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                  />
                  <SlideTextOverlay
                    blocks={blocks}
                    onBlocksChange={setBlocks}
                    palette={palette}
                    slideAreaRef={slideAreaRef}
                  />
                  {busy && (
                    <div
                      data-flatten-exclude="true"
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(244, 239, 230, 0.82)", backdropFilter: "blur(6px)" }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={28} className="animate-spin" style={{ color: COLORS.coral }} />
                        <span className="text-[13px]" style={{ color: COLORS.muted }}>Generating…</span>
                      </div>
                    </div>
                  )}
                  {imageHistory.length > 1 && !busy && (
                    <div
                      data-flatten-exclude="true"
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-mono"
                      style={{ background: "rgba(10,10,10,0.78)", color: "#FFF", letterSpacing: "0.04em" }}
                    >
                      Edit {imageHistory.length - 1}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tools rail ─────────────────────────────────────── */}
              <div className="flex flex-col gap-6">
                {/* TEXT */}
                <section className="rounded-2xl p-4 md:p-5" style={{ background: "#FFF", border: `1px solid ${COLORS.line}` }}>
                  <header className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Type size={14} style={{ color: COLORS.coral }} />
                      <span className="text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.ink }}>Text</span>
                    </div>
                    <button
                      onClick={addBlock}
                      className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition hover:opacity-90"
                      style={{ background: COLORS.coral, color: "#FFF" }}
                      title="Add a text block"
                    >
                      <Plus size={11} /> Add
                    </button>
                  </header>
                  {blockSummary.length === 0 ? (
                    <p className="text-[12.5px]" style={{ color: COLORS.muted }}>
                      No text yet. Click <span style={{ fontWeight: 700 }}>Add</span> to drop a block on the canvas, then drag and style it.
                    </p>
                  ) : (
                    <>
                      <ul className="flex flex-col gap-1.5">
                        {blockSummary.map((b, i) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md"
                            style={{ background: "rgba(17,17,17,0.04)" }}
                          >
                            <span className="text-[11.5px] truncate" style={{ color: COLORS.ink }}>
                              <span className="font-mono" style={{ color: COLORS.subtle }}>{i + 1}.</span>{" "}
                              {b.text.slice(0, 32) || "(empty)"}
                            </span>
                            <button
                              onClick={() => setBlocks((bs) => bs.filter(x => x.id !== b.id))}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                              style={{ color: COLORS.muted }}
                              title="Delete block"
                            >
                              <Trash2 size={11} />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={clearBlocks}
                        className="mt-2 text-[11px] hover:underline"
                        style={{ color: COLORS.muted }}
                      >
                        Clear all
                      </button>
                    </>
                  )}
                  <p className="mt-3 text-[10.5px] leading-snug" style={{ color: COLORS.subtle }}>
                    Click a block on the canvas to style it. Drag to move — snap guides appear when you near the center or thirds.
                  </p>
                </section>

                {/* AI EDIT */}
                <section className="rounded-2xl p-4 md:p-5" style={{ background: "#FFF", border: `1px solid ${COLORS.line}` }}>
                  <header className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} style={{ color: COLORS.coral }} />
                    <span className="text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.ink }}>AI edit</span>
                  </header>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. replace the background with a sunset beach"
                    rows={4}
                    disabled={busy}
                    className="w-full rounded-xl p-3 text-[13.5px] outline-none resize-none transition disabled:opacity-60"
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${COLORS.line}`,
                      color: COLORS.ink,
                      fontFamily: "inherit",
                    }}
                  />
                  <div className="mt-1.5 text-[10.5px]" style={{ color: COLORS.subtle }}>⌘↩ to generate</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        disabled={busy}
                        className="rounded-full px-2.5 py-1 text-[11px] transition hover:bg-black/[0.04] disabled:opacity-40"
                        style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={applyEdit}
                    disabled={busy || !prompt.trim()}
                    className="mt-4 w-full justify-center"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {busy ? "Generating…" : "Apply AI edit"}
                  </Button>
                </section>

                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 text-[12px] hover:underline self-start"
                  style={{ color: COLORS.muted }}
                >
                  <ArrowLeft size={13} /> Back
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  return (
    <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#FFF", border: `1px dashed ${COLORS.line}` }}>
      <Sparkles size={28} className="mx-auto mb-4" style={{ color: COLORS.coral }} />
      <h2 className="mb-2" style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>
        Nothing to edit yet
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: COLORS.muted, maxWidth: 460, marginInline: "auto" }}>
        Generate a pack on Surprise or open an image from your Library to start.
      </p>
      <Button variant="accent" size="md" onClick={onOpenLibrary}>
        <ArrowLeft size={14} /> Open Library
      </Button>
    </div>
  );
}
