import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Check, ImageIcon } from "lucide-react";
import { useAuth } from "../lib/auth-context";

interface LibraryItem {
  id: string;
  customName: string;
  preview: { kind: string; imageUrl?: string };
  classification?: { category?: string; tags?: string[] };
}

interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  maxSelect?: number;
}

export function LibraryPicker({ open, onClose, onSelect, maxSelect = 10 }: LibraryPickerProps) {
  // Auth context exposes accessToken directly — `session` was undefined,
  // which is why the library fetch silently no-op'd (early-return on
  // !session?.access_token), leaving the picker permanently empty.
  const { accessToken } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch library images
  useEffect(() => {
    if (!open || !accessToken) return;
    setLoading(true);

    const API = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "";
    fetch(`${API}/make-server-cad57f79/library/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data) => {
        // Filter images only
        const images = (data.items || []).filter(
          (i: LibraryItem) => i.preview?.kind === "image" && i.preview?.imageUrl
        );
        setItems(images);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, accessToken]);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < maxSelect) {
          next.add(id);
        }
        return next;
      });
    },
    [maxSelect]
  );

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.customName?.toLowerCase().includes(q) ||
      item.classification?.category?.toLowerCase().includes(q) ||
      item.classification?.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleConfirm = () => {
    const urls = items
      .filter((i) => selected.has(i.id) && i.preview.imageUrl)
      .map((i) => i.preview.imageUrl!);
    onSelect(urls);
    setSelected(new Set());
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "var(--card)",
            width: "min(680px, 90vw)",
            maxHeight: "80vh",
            boxShadow: "0 24px 80px -12px rgba(0,0,0,0.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Pick from Library
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: 2 }}>
                {selected.size > 0 ? `${selected.size} selected` : "Select up to 10 photos"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: "var(--text-secondary)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
            >
              <Search size={14} style={{ color: "var(--text-tertiary)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, tag, or category..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "13px", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div
                className="flex items-center justify-center py-16"
                style={{ color: "var(--text-tertiary)", fontSize: "13px" }}
              >
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.06)" }}
                >
                  <ImageIcon size={20} style={{ color: "#7C3AED" }} />
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {search ? "No images match your search" : "No images in your Library yet"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filtered.map((item) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                      style={{
                        border: isSelected ? "2px solid #7C3AED" : "2px solid transparent",
                        outline: isSelected ? "2px solid rgba(124,58,237,0.3)" : "none",
                      }}
                    >
                      <img
                        src={item.preview.imageUrl}
                        alt={item.customName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div
                        className="absolute inset-0 transition-opacity"
                        style={{
                          background: isSelected ? "rgba(124,58,237,0.15)" : "rgba(0,0,0,0)",
                          opacity: isSelected ? 1 : 0,
                        }}
                      />
                      {/* Hover on non-selected */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      {/* Check mark */}
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "#7C3AED" }}
                        >
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                      {/* Name */}
                      <div
                        className="absolute bottom-0 left-0 right-0 p-2"
                        style={{
                          background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
                        }}
                      >
                        <p
                          style={{ fontSize: "10px", color: "#fff", fontWeight: 500 }}
                          className="truncate"
                        >
                          {item.customName}
                        </p>
                        {item.classification?.category && (
                          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.7)" }}>
                            {item.classification.category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {selected.size}/{maxSelect} photos selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full"
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="px-5 py-2 rounded-full transition-all"
                style={{
                  background:
                    selected.size > 0
                      ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                      : "var(--secondary)",
                  color: selected.size > 0 ? "#fff" : "var(--text-tertiary)",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Use {selected.size} photo{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
