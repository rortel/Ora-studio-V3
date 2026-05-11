/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Ora Editor — Feads-style prompt-only image editor.

   No layers. No format presets. No Inspector. No Konva. The whole
   editor is: image preview on the left, prompt on the right, one
   Generate button. Each Generate call hands the current image URL
   and the prompt to Pollo's image2image pipeline; the result
   replaces the displayed image. History tracks every step so the
   user can undo the last edit and try a different prompt.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Loader2, Wand2, Download, ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { Button } from "../components/ora/Button";
import { COLORS } from "../components/ora/tokens";
import { editImage } from "../lib/editor/aiFill";

const DISPLAY = `"Bagel Fat One", "Inter", system-ui, sans-serif`;

const EXAMPLES = [
  "Replace the background with a sunset beach",
  "Make it black and white",
  "Add soft golden hour lighting",
  "Remove the people behind",
];

export function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <EditorSimple />
    </RouteGuard>
  );
}
export default EditorPage;

function EditorSimple() {
  const { getAuthHeader } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as { assetUrl?: string; assetId?: string } | null;
  const preloadUrl = navState?.assetUrl || null;

  // The displayed image URL. Starts at whatever Library handed over via
  // router state; every successful Generate swaps it for the AI result.
  const [imageUrl, setImageUrl] = useState<string | null>(preloadUrl);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  // Edit history — every entry is an image URL the user has seen, in
  // order. Lets Undo step back one Generate at a time. We don't trim
  // it; AI edits are cheap to keep around as strings.
  const [history, setHistory] = useState<string[]>(preloadUrl ? [preloadUrl] : []);

  const applyEdit = useCallback(async () => {
    if (!imageUrl) { toast.error("Open an image from your Library first."); return; }
    if (!prompt.trim()) { toast.error("Describe the edit you want."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const newUrl = await editImage({ imageUrl, prompt, getAuthHeader });
      setImageUrl(newUrl);
      setHistory((h) => [...h, newUrl]);
      setPrompt("");
      toast.success("Created");
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [imageUrl, prompt, busy, getAuthHeader]);

  // ⌘↩ / Ctrl↩ to fire Generate from anywhere in the page (textarea
  // included). Skipped while busy or with an empty prompt so the user
  // doesn't accidentally double-submit.
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
    if (history.length < 2) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setImageUrl(next[next.length - 1]);
  };

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "ora-edit.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <AppTabs active="edit" />

      <main className="flex-1 flex flex-col items-center px-5 md:px-10 py-10 md:py-16">
        <div className="w-full max-w-6xl">
          {/* Heading */}
          <div className="mb-10 md:mb-14">
            <h1
              className="leading-[0.98]"
              style={{ fontFamily: DISPLAY, fontSize: "clamp(38px, 6vw, 72px)", color: COLORS.ink }}
            >
              Edit your creation.
            </h1>
            <p className="mt-3 text-[15px] md:text-[16px]" style={{ color: COLORS.muted, maxWidth: 720 }}>
              Describe the change. Ora rewrites the image from the original.
            </p>
          </div>

          {!imageUrl ? (
            <EmptyState onOpenLibrary={() => navigate("/hub/library")} />
          ) : (
            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
              {/* Image preview — square frame, contain-fit so portraits + landscapes
                  both fit nicely without cropping. Spinner overlay while busy. */}
              <div
                className="relative rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: "#FFF",
                  border: `1px solid ${COLORS.line}`,
                  aspectRatio: "1 / 1",
                  boxShadow: "0 1px 2px rgba(17,17,17,0.04)",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Current"
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "#FFF" }}
                />
                {busy && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(244, 239, 230, 0.82)", backdropFilter: "blur(6px)" }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={28} className="animate-spin" style={{ color: COLORS.coral }} />
                      <span className="text-[13px]" style={{ color: COLORS.muted }}>Generating…</span>
                    </div>
                  </div>
                )}
                {history.length > 1 && !busy && (
                  <div
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-mono"
                    style={{ background: "rgba(10,10,10,0.78)", color: "#FFF", letterSpacing: "0.04em" }}
                  >
                    Edit {history.length - 1}
                  </div>
                )}
              </div>

              {/* Prompt + actions */}
              <div className="flex flex-col gap-5">
                <div>
                  <label
                    className="text-[10px] uppercase tracking-[0.22em] block mb-3"
                    style={{ color: COLORS.subtle, fontWeight: 700 }}
                  >
                    What do you want to change?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. replace the background with a sunset beach"
                    rows={6}
                    autoFocus
                    disabled={busy}
                    className="w-full rounded-2xl p-4 text-[15px] outline-none resize-none transition disabled:opacity-60"
                    style={{
                      background: "#FFF",
                      border: `1px solid ${COLORS.line}`,
                      color: COLORS.ink,
                      fontFamily: "inherit",
                      minHeight: 200,
                    }}
                  />
                  <div className="mt-2 text-[11px]" style={{ color: COLORS.subtle }}>
                    ⌘↩ to generate
                  </div>
                </div>

                {/* Example chips — one-click prompt seeders. */}
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      disabled={busy}
                      className="rounded-full px-3 py-1.5 text-[11.5px] transition hover:bg-black/[0.04] disabled:opacity-40"
                      style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {/* Actions: Generate is the primary; secondary row holds Undo
                    (only meaningful after ≥1 edit) and Download. */}
                <div className="flex flex-col gap-2 mt-1">
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={applyEdit}
                    disabled={busy || !prompt.trim()}
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {busy ? "Generating…" : "Generate"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={undo}
                      disabled={history.length < 2 || busy}
                      title="Step back to the previous result"
                    >
                      <RotateCcw size={13} /> Undo last edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={download} disabled={busy}>
                      <Download size={13} /> Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EmptyState — shown when the user lands on /hub/editor without an
   image in router state (direct nav, refresh after closing the tab).
   AI editing is image2image; there's nothing useful to do without a
   source, so we route them to Library to pick one.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function EmptyState({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  return (
    <div
      className="rounded-3xl p-10 md:p-14 text-center"
      style={{ background: "#FFF", border: `1px dashed ${COLORS.line}` }}
    >
      <Sparkles size={28} className="mx-auto mb-4" style={{ color: COLORS.coral }} />
      <h2 className="mb-2" style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>
        Nothing to edit yet
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: COLORS.muted, maxWidth: 460, marginInline: "auto" }}>
        Open an image from your Library to start. Each edit rewrites the photo from a prompt — no brush, no layers.
      </p>
      <Button variant="accent" size="md" onClick={onOpenLibrary}>
        <ArrowLeft size={14} /> Open Library
      </Button>
    </div>
  );
}
