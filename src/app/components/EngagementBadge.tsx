import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

interface EngagementPrediction {
  index: number;
  score: number;
  label: string;
  tips: string[];
}

interface EngagementBadgeProps {
  assets: { formatId: string; platform?: string; headline?: string; caption?: string; hashtags?: string; ctaText?: string }[];
  /** Called when predictions are loaded */
  onPredictions?: (predictions: Record<string, EngagementPrediction>) => void;
}

const SCORE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Excellent: { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.2)" },
  Good: { bg: "rgba(59,79,196,0.1)", text: "var(--ora-signal)", border: "rgba(59,79,196,0.2)" },
  Average: { bg: "rgba(234,179,8,0.1)", text: "#eab308", border: "rgba(234,179,8,0.2)" },
  Weak: { bg: "rgba(212,24,61,0.1)", text: "#d4183d", border: "rgba(212,24,61,0.2)" },
};

export function useEngagementPredictions(assets: EngagementBadgeProps["assets"]) {
  const [predictions, setPredictions] = useState<Record<string, EngagementPrediction>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    // Only fetch once when assets are ready
    if (fetchedRef.current) return;
    const readyAssets = assets.filter(a => a.caption || a.headline);
    if (readyAssets.length === 0) return;

    // Already scheduled? Don't re-schedule
    if (timerRef.current) return;

    const fetchPredictions = async () => {
      fetchedRef.current = true;
      setLoading(true);
      try {
        const token = accessToken || "";
        const res = await fetch(`${API_BASE}/campaign/predict-engagement`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "text/plain",
          },
          body: JSON.stringify({ assets: readyAssets, _token: token || undefined }),
          signal: AbortSignal.timeout(30_000),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.predictions)) {
          const map: Record<string, EngagementPrediction> = {};
          for (const pred of data.predictions) {
            const idx = (pred.index || 1) - 1; // 1-based to 0-based
            if (readyAssets[idx]) {
              map[readyAssets[idx].formatId] = pred;
            }
          }
          setPredictions(map);
        }
      } catch (err) {
        console.error("[EngagementBadge] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    // Delay slightly so it doesn't block initial render
    timerRef.current = setTimeout(fetchPredictions, 2000);
    // No cleanup — timer must survive re-renders
  }, [assets]);

  return { predictions, loading };
}

export function EngagementBadge({ prediction }: { prediction?: EngagementPrediction }) {
  const [showTips, setShowTips] = useState(false);

  if (!prediction) return null;

  const colors = SCORE_COLORS[prediction.label] || SCORE_COLORS.Average;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setShowTips(!showTips); }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full cursor-pointer transition-all"
        style={{ background: colors.bg, border: `1px solid ${colors.border}`, fontSize: "9px", fontWeight: 600, color: colors.text }}
        title={`Engagement: ${prediction.score}/100 — ${prediction.tips?.join(", ")}`}
      >
        <TrendingUp size={8} />
        {prediction.score}
      </button>

      {showTips && prediction.tips && prediction.tips.length > 0 && (
        <div
          className="absolute z-50 bottom-full left-0 mb-1 p-2 rounded-lg shadow-lg"
          style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.1)", minWidth: "180px", maxWidth: "250px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: colors.bg, color: colors.text }}>
              {prediction.label} — {prediction.score}/100
            </span>
          </div>
          <ul className="space-y-1">
            {prediction.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1">
                <span style={{ fontSize: "10px", color: colors.text, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: "10px", color: "#9A9590", lineHeight: 1.4 }}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
