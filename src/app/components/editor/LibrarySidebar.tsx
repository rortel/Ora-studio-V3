/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Library Sidebar — Left panel with image + video library
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronLeft, Loader2, Image as ImageIcon, Film } from "lucide-react";

interface LibraryItem {
  id: string;
  type: string;
  preview: any;
  customName?: string;
  prompt: string;
}

function getAssetUrl(item: LibraryItem): string | null {
  if (!item.preview) return null;
  if (item.preview.kind === "image") return item.preview.imageUrl || null;
  if (item.preview.kind === "film") return item.preview.videoUrl || null;
  return null;
}

function isVideo(item: LibraryItem): boolean {
  return item.type === "film" || item.preview?.kind === "film";
}

function getItemName(item: LibraryItem): string {
  return item.customName || item.prompt || "Untitled";
}

interface LibrarySidebarProps {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  items: LibraryItem[];
  loading: boolean;
  activeImageUrl: string | null;
  onSelectImage: (url: string) => void;
  onSelectVideo?: (url: string) => void;
}

export function LibrarySidebar({
  open, onClose, search, onSearchChange,
  items, loading, activeImageUrl, onSelectImage, onSelectVideo,
}: LibrarySidebarProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            background: "#fff", borderRight: "1px solid rgba(17,17,17,0.08)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div style={{
            padding: "12px 12px 8px", borderBottom: "1px solid rgba(17,17,17,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Library
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "#bbb", cursor: "pointer",
                padding: 4, borderRadius: 4, display: "flex",
              }}
              title="Collapse library"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div style={{ padding: "8px 10px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(17,17,17,0.04)", borderRadius: 8, padding: "6px 10px",
              border: "1px solid rgba(17,17,17,0.08)",
            }}>
              <Search size={14} style={{ color: "#bbb", flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search..."
                style={{
                  background: "none", border: "none", outline: "none", color: "#111111",
                  fontSize: 12, width: "100%",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <Loader2 size={20} style={{ color: "#ccc", animation: "spin 1s linear infinite" }} />
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "24px 8px", textAlign: "center" }}>
                <ImageIcon size={24} style={{ color: "#ddd", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "#bbb" }}>
                  {search ? "No results" : "No media in library"}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {items.map(item => {
                  const url = getAssetUrl(item);
                  if (!url) return null;
                  const video = isVideo(item);
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => video ? onSelectVideo?.(url) : onSelectImage(url)}
                      style={{
                        borderRadius: 8, overflow: "hidden", cursor: "pointer",
                        aspectRatio: "1", background: "rgba(17,17,17,0.04)",
                        border: activeImageUrl === url ? "2px solid #FF5C39" : "2px solid transparent",
                        transition: "border-color 0.12s",
                        position: "relative",
                      }}
                    >
                      {video ? (
                        <video
                          src={url}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={e => { (e.target as HTMLVideoElement).play().catch(() => {}); }}
                          onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                        />
                      ) : (
                        <img
                          src={url} alt={getItemName(item)}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      )}
                      {/* Video badge */}
                      {video && (
                        <div style={{
                          position: "absolute", top: 4, right: 4,
                          background: "rgba(0,0,0,0.55)", borderRadius: 4,
                          padding: "2px 4px", display: "flex", alignItems: "center", gap: 2,
                        }}>
                          <Film size={9} style={{ color: "#fff" }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
