import { useEffect, useState, useCallback } from "react";
import { Heart, MessageCircle, Eye, RefreshCw, Loader2 } from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

/**
 * PostMetricsBadge — inline likes/comments/views for a published post.
 *
 * Designed for Ora's actual ICP (small commerce owners, not marketers):
 * one short line, plain emoji-style icons, no chart, no jargon. The user
 * just wants to know "is it working?" without leaving Ora to open Meta
 * Business Suite.
 *
 * Backed by /pfm/post-metrics — that endpoint caches on the server (1h)
 * so multiple Calendar renders don't hammer Post for Me. The frontend
 * fetches once per mount; user-triggered refresh bypasses the cache by
 * not — well, it doesn't, the server cache is the source of truth so a
 * "refresh" button just retries the request and shows the cached data.
 * If we later want a manual refresh that busts the cache we can pipe a
 * `force` flag through.
 */

interface Props {
  pfmPostId: string;
  /** Compact = single line, default. Verbose adds a refresh button. */
  variant?: "compact" | "verbose";
}

interface Metrics {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  saves?: number;
}

interface ApiResponse {
  success: boolean;
  metrics: Metrics | null;
  hasMetrics: boolean;
  fetchedAt?: string;
  error?: string;
}

export function PostMetricsBadge({ pfmPostId, variant = "compact" }: Props) {
  const { accessToken } = useAuth();
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!pfmPostId || !accessToken) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/pfm/post-metrics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ pfmPostId, _token: accessToken }),
        signal: AbortSignal.timeout(15_000),
      });
      const json: ApiResponse = await r.json();
      setData(json);
    } catch {
      setData({ success: false, metrics: null, hasMetrics: false, error: "network" });
    } finally {
      setLoading(false);
    }
  }, [pfmPostId, accessToken]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (loading && !data) {
    return (
      <span className="inline-flex items-center gap-1" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
        <Loader2 size={10} className="animate-spin" />
      </span>
    );
  }

  if (!data?.success || !data.hasMetrics || !data.metrics) {
    if (variant === "verbose") {
      return (
        <span className="inline-flex items-center gap-1.5" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {isFr ? "Stats à venir" : "Stats coming soon"}
          <button onClick={fetchMetrics} disabled={loading} className="cursor-pointer p-0.5 rounded hover:bg-secondary transition-colors" title={isFr ? "Rafraîchir" : "Refresh"}>
            <RefreshCw size={9} className={loading ? "animate-spin" : ""} />
          </button>
        </span>
      );
    }
    return null;
  }

  const m = data.metrics;
  return (
    <span className="inline-flex items-center gap-2.5 tabular-nums" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
      {m.likes != null && (
        <span className="inline-flex items-center gap-1" title={isFr ? "Mentions J'aime" : "Likes"}>
          <Heart size={10} /> {fmt(m.likes)}
        </span>
      )}
      {m.comments != null && (
        <span className="inline-flex items-center gap-1" title={isFr ? "Commentaires" : "Comments"}>
          <MessageCircle size={10} /> {fmt(m.comments)}
        </span>
      )}
      {m.views != null && (
        <span className="inline-flex items-center gap-1" title={isFr ? "Vues" : "Views"}>
          <Eye size={10} /> {fmt(m.views)}
        </span>
      )}
      {variant === "verbose" && (
        <button onClick={fetchMetrics} disabled={loading} className="cursor-pointer p-0.5 rounded hover:bg-secondary transition-colors" title={isFr ? "Rafraîchir" : "Refresh"}>
          <RefreshCw size={9} className={loading ? "animate-spin" : ""} />
        </button>
      )}
    </span>
  );
}

function fmt(n: number): string {
  if (n >= 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
