import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Loader2, RefreshCw, Check } from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

interface RepurposeAsset {
  formatId: string;
  headline?: string;
  caption?: string;
  hashtags?: string;
  ctaText?: string;
  imagePrompt?: string;
  imageUrl?: string;
}

interface RepurposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: RepurposeAsset;
  currentFormats: string[]; // already generated formats
  allFormats: { id: string; label: string; platform: string; type: "image" | "text" | "video"; aspectRatio: string }[];
  language: string;
  onRepurposed: (newAssets: Record<string, any>) => void;
}

export function RepurposeModal({ open, onOpenChange, asset, currentFormats, allFormats, language, onRepurposed }: RepurposeModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { accessToken } = useAuth();

  const availableFormats = allFormats.filter(f => f.id !== asset.formatId && !currentFormats.includes(f.id));

  const toggle = (id: string) => {
    setSelectedTargets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRepurpose = async () => {
    if (!selectedTargets.length) return;
    setLoading(true);
    setDone(false);

    try {
      const token = accessToken || "";
      const res = await fetch(`${API_BASE}/campaign/repurpose`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          sourceFormat: asset.formatId,
          targetFormats: selectedTargets,
          headline: asset.headline || "",
          caption: asset.caption || "",
          hashtags: asset.hashtags || "",
          ctaText: asset.ctaText || "",
          imagePrompt: asset.imagePrompt || "",
          language: language || "auto",
          _token: token || undefined,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = await res.json();
      if (data.success && data.repurposed) {
        onRepurposed(data.repurposed);
        setDone(true);
        setTimeout(() => { onOpenChange(false); setDone(false); setSelectedTargets([]); }, 1500);
      }
    } catch (err: any) {
      console.error("[RepurposeModal] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group by platform
  const platforms = new Map<string, typeof availableFormats>();
  for (const f of availableFormats) {
    if (!platforms.has(f.platform)) platforms.set(f.platform, []);
    platforms.get(f.platform)!.push(f);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.08)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#E8E4DF", fontSize: "16px" }}>
            <RefreshCw size={14} className="inline mr-2" style={{ color: "var(--ora-signal)" }} />
            Adapt to other formats
          </DialogTitle>
          <DialogDescription style={{ color: "#7A7572", fontSize: "12px" }}>
            Adapt your {asset.formatId.replace(/-/g, " ")} content to other platforms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
          {Array.from(platforms.entries()).map(([platform, formats]) => (
            <div key={platform}>
              <p className="mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.5px" }}>{platform}</p>
              <div className="flex flex-wrap gap-1.5">
                {formats.map(f => {
                  const selected = selectedTargets.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                      style={{
                        background: selected ? "var(--ora-signal)" : "rgba(255,255,255,0.04)",
                        color: selected ? "#fff" : "#9A9590",
                        border: `1px solid ${selected ? "var(--ora-signal)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {selected && <Check size={10} />}
                      {f.label.replace(`${platform} `, "")}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {availableFormats.length === 0 && (
            <p style={{ fontSize: "12px", color: "#5C5856", textAlign: "center", padding: "16px 0" }}>
              All formats already generated.
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={handleRepurpose}
            disabled={loading || !selectedTargets.length || done}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all disabled:opacity-50"
            style={{
              background: done ? "rgba(16,185,129,0.1)" : "var(--ora-signal)",
              color: done ? "#10b981" : "#fff",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Adapting...</>
              : done ? <><Check size={14} /> Done!</>
              : `Adapt to ${selectedTargets.length} format${selectedTargets.length !== 1 ? "s" : ""}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
