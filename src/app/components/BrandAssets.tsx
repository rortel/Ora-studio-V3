import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Loader2, X, Image as ImageIcon, Layers, Tag,
  Crown, Sparkles, Grid3X3, Package as PackageIcon,
} from "lucide-react";
import { API_BASE, publicAnonKey, apiHeaders } from "../lib/supabase";

interface BrandAsset {
  id: string;
  role: string;
  label: string;
  usage: string;
  fileName: string;
  signedUrl: string | null;
  mimeType: string;
  createdAt: string;
}

const ROLES = [
  { id: "logo", label: "Logo", icon: Crown, description: "Primary logo, logo variants" },
  { id: "pattern", label: "Pattern", icon: Grid3X3, description: "Background patterns, textures" },
  { id: "graphic", label: "Graphic Element", icon: Sparkles, description: "Icons, illustrations, decorative shapes" },
  { id: "packshot", label: "Packshot", icon: PackageIcon, description: "Official product shots" },
  { id: "overlay", label: "Overlay", icon: Layers, description: "Watermarks, badges, stickers" },
];

const USAGES = [
  { id: "always_overlay", label: "Always overlay", description: "Composited on every generated image" },
  { id: "img2img_source", label: "Use as source", description: "Used as img2img reference for AI generation" },
  { id: "reference", label: "Reference only", description: "Injected into prompts as visual direction" },
];

export function BrandAssets({ accessToken }: { accessToken: string | null }) {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadRole, setUploadRole] = useState("logo");
  const [uploadUsage, setUploadUsage] = useState("always_overlay");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/brand-assets?_token=${accessToken}`, { headers: apiHeaders(false) });
      const data = await res.json();
      if (data.success) setAssets(data.assets || []);
    } catch {}
    setLoading(false);
  }, [accessToken]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleUpload = async (files: FileList) => {
    if (!accessToken || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("_token", accessToken);
      fd.append("role", uploadRole);
      fd.append("usage", uploadRole === "logo" ? "always_overlay" : uploadUsage);
      fd.append("label", files[i].name.replace(/\.[^.]+$/, ""));
      try {
        await fetch(`${API_BASE}/brand-assets`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          body: fd,
        });
      } catch {}
    }
    await loadAssets();
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await fetch(`${API_BASE}/brand-assets/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ _token: accessToken }),
    }).catch(() => {});
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateUsage = async (id: string, usage: string) => {
    if (!accessToken) return;
    await fetch(`${API_BASE}/brand-assets/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ _token: accessToken, usage }),
    }).catch(() => {});
    setAssets(prev => prev.map(a => a.id === id ? { ...a, usage } : a));
  };

  const roleIcon = (role: string) => {
    const r = ROLES.find(r => r.id === role);
    return r ? r.icon : ImageIcon;
  };

  const roleColor = (role: string) => {
    const colors: Record<string, string> = { logo: "#8B6CF7", pattern: "#E8A84C", graphic: "#4CC3E0", packshot: "#5FBF6A", overlay: "#E05A4F" };
    return colors[role] || "#8B6CF7";
  };

  const usageBadge = (usage: string) => {
    if (usage === "always_overlay") return { label: "Auto-overlay", color: "#8B6CF7" };
    if (usage === "img2img_source") return { label: "AI source", color: "#E8A84C" };
    return { label: "Reference", color: "#6B6660" };
  };

  const grouped = ROLES.map(role => ({
    ...role,
    assets: assets.filter(a => a.role === role.id),
  })).filter(g => g.assets.length > 0);

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,108,247,0.1)" }}>
            <Layers size={16} style={{ color: "#8B6CF7" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#EDEDEC" }}>Brand Assets</h3>
            <p style={{ fontSize: "11px", color: "#6B6660" }}>
              Logos, patterns & graphics — automatically used in every campaign
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, background: "rgba(139,108,247,0.1)", color: "#8B6CF7" }}>
          {assets.length} asset{assets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Upload zone */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3 mb-3">
          {/* Role selector */}
          <div className="flex items-center gap-1.5">
            {ROLES.map(r => {
              const Icon = r.icon;
              const active = uploadRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setUploadRole(r.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: active ? `${roleColor(r.id)}22` : "transparent",
                    border: active ? `1px solid ${roleColor(r.id)}44` : "1px solid transparent",
                    color: active ? roleColor(r.id) : "#6B6660",
                    fontSize: "11px", fontWeight: active ? 600 : 400,
                  }}
                  title={r.description}
                >
                  <Icon size={12} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drop zone */}
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => { if (e.target.files) handleUpload(e.target.files); e.target.value = ""; }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-all hover:bg-white/[0.02]"
          style={{ border: "1.5px dashed rgba(139,108,247,0.25)", color: "#8B6CF7", fontSize: "12px", fontWeight: 500 }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading..." : `Drop ${ROLES.find(r => r.id === uploadRole)?.label.toLowerCase() || "files"} here — PNG, SVG, WebP`}
        </button>
      </div>

      {/* Assets grid grouped by role */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin" style={{ color: "#8B6CF7" }} />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-6" style={{ fontSize: "12px", color: "#6B6660" }}>
          No brand assets yet. Upload your logo to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={12} style={{ color: roleColor(group.id) }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, color: roleColor(group.id), textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {group.label}s
                  </span>
                  <span style={{ fontSize: "10px", color: "#6B6660" }}>({group.assets.length})</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {group.assets.map(asset => {
                    const badge = usageBadge(asset.usage);
                    return (
                      <div key={asset.id} className="relative group rounded-lg overflow-hidden aspect-square"
                        style={{ background: "#18171A", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {asset.signedUrl ? (
                          <img src={asset.signedUrl} alt={asset.label}
                            className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={20} style={{ color: "#3B3936" }} />
                          </div>
                        )}
                        {/* Usage badge */}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded"
                          style={{ background: `${badge.color}22`, fontSize: "8px", fontWeight: 600, color: badge.color }}>
                          {badge.label}
                        </div>
                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {USAGES.map(u => (
                            <button key={u.id} onClick={() => handleUpdateUsage(asset.id, u.id)}
                              className="px-1.5 py-1 rounded cursor-pointer transition-all"
                              title={u.description}
                              style={{
                                fontSize: "8px", fontWeight: 600,
                                background: asset.usage === u.id ? `${usageBadge(u.id).color}44` : "rgba(255,255,255,0.1)",
                                color: asset.usage === u.id ? usageBadge(u.id).color : "#ccc",
                              }}>
                              {u.label.split(" ")[0]}
                            </button>
                          ))}
                          <button onClick={() => handleDelete(asset.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(224,90,79,0.8)", color: "#fff" }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
