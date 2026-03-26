import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Plus, X, Loader2, Trash2, Edit3, Upload, ArrowLeft,
  Package, DollarSign, Tag, Link as LinkIcon, List, Image as ImageIcon,
  Check, ChevronRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";

// ══════════════════════════════════════
// Types
// ══════════════════════════════════════

interface ProductImage {
  id: string;
  fileName: string;
  storagePath: string;
  signedUrl?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  url: string;
  features: string[];
  price: string;
  currency: string;
  category: string;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════
// API helpers — single source of truth
// ══════════════════════════════════════

/** POST/PUT/DELETE: token goes in JSON body as _token, Content-Type text/plain to skip CORS preflight */
function postJson(path: string, token: string, data: Record<string, any> = {}, method = "POST") {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      "Content-Type": "text/plain",
    },
    body: JSON.stringify({ _token: token, ...data }),
  });
}

/** List endpoint: uses POST with _token in body (JWT too large for URL query or HTTP header) */
function listJson(path: string, token: string) {
  return postJson(path, token);
}

/** Upload files via FormData — token in form field */
function postFormData(path: string, token: string, files: FileList) {
  const fd = new FormData();
  fd.append("_token", token);
  for (let i = 0; i < files.length; i++) fd.append("files", files[i]);
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}` },
    body: fd,
  });
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY"];

// ══════════════════════════════════════
// ProductsPage
// ══════════════════════════════════════

export function ProductsPage() {
  const { accessToken } = useAuth();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [features, setFeatures] = useState<string[]>([""]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("");

  // ── Load all products ──
  const loadProducts = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setError("Vous devez être connecté pour voir vos produits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listJson("/products/list", accessToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        throw new Error(data.error || "Réponse inattendue du serveur");
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur de chargement";
      console.error("[ProductsPage] loadProducts:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Reset form ──
  const resetForm = () => {
    setName(""); setDescription(""); setUrl("");
    setFeatures([""]); setPrice(""); setCurrency("EUR"); setCategory("");
  };

  // ── Open dialogs ──
  const openCreate = () => {
    setEditingProduct(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setUrl(p.url || "");
    setFeatures(p.features?.length ? [...p.features] : [""]);
    setPrice(p.price || "");
    setCurrency(p.currency || "EUR");
    setCategory(p.category || "");
    setDialogOpen(true);
  };

  // ── Auto-fill from URL ──
  const handleScrape = async () => {
    if (!accessToken || !url.trim()) return;
    setScraping(true);
    try {
      const res = await postJson("/products/scrape-url", accessToken, { url: url.trim() });
      const data = await res.json();
      if (data.success && data.product) {
        const p = data.product;
        if (p.name) setName(p.name);
        if (p.description) setDescription(p.description);
        if (p.price) setPrice(p.price);
        if (p.currency) setCurrency(p.currency);
        if (p.category) setCategory(p.category);
        if (p.features?.length) setFeatures(p.features);
        toast.success("Informations extraites avec succès");
      } else {
        toast.error(data.error || "Impossible d'extraire les infos");
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'extraction");
      console.error("[ProductsPage] scrape:", err);
    } finally {
      setScraping(false);
    }
  };

  // ── Create or update product ──
  const handleSave = async () => {
    if (!accessToken) { toast.error("Non connecté"); return; }
    if (!name.trim()) { toast.error("Le nom du produit est requis"); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        url: url.trim(),
        features: features.filter(f => f.trim()),
        price: price.trim(),
        currency,
        category: category.trim(),
      };

      const isEdit = !!editingProduct;
      const path = isEdit ? `/products/${editingProduct!.id}` : "/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await postJson(path, accessToken, payload, method);
      const data = await res.json();

      if (data.success) {
        toast.success(isEdit ? "Produit mis à jour" : "Produit créé");
        setDialogOpen(false);
        resetForm();
        await loadProducts();
      } else {
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch (err: any) {
      toast.error("Erreur réseau — réessayez");
      console.error("[ProductsPage] save:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product ──
  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await postJson(`/products/${id}`, accessToken, {}, "DELETE");
      const data = await res.json();
      if (data.success) {
        toast.success("Produit supprimé");
        setDeleteConfirm(null);
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        toast.error(data.error || "Erreur de suppression");
      }
    } catch (err: any) {
      toast.error("Erreur réseau");
      console.error("[ProductsPage] delete:", err);
    }
  };

  // ── Upload images ──
  const handleImageUpload = async (productId: string, files: FileList) => {
    if (!accessToken || files.length === 0) return;
    setUploadingImages(true);
    try {
      const res = await postFormData(`/products/${productId}/images`, accessToken, files);
      const data = await res.json();
      if (data.success) {
        toast.success(`${files.length} image(s) ajoutée(s)`);
        await loadProducts();
        // Refresh editing product with new images
        if (editingProduct && data.product) {
          setEditingProduct(data.product);
        }
      } else {
        toast.error(data.error || "Erreur d'upload");
      }
    } catch (err: any) {
      toast.error("Erreur d'upload");
      console.error("[ProductsPage] upload:", err);
    } finally {
      setUploadingImages(false);
    }
  };

  // ── Delete image ──
  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (!accessToken) return;
    try {
      const res = await postJson(`/products/${productId}/images/${imageId}`, accessToken, {}, "DELETE");
      const data = await res.json();
      if (data.success) {
        toast.success("Image supprimée");
        await loadProducts();
        if (editingProduct) {
          setEditingProduct(prev =>
            prev ? { ...prev, images: prev.images.filter(img => img.id !== imageId) } : null
          );
        }
      }
    } catch (err: any) {
      toast.error("Erreur de suppression");
    }
  };

  // ── Feature list helpers ──
  const addFeature = () => setFeatures(prev => [...prev, ""]);
  const removeFeature = (i: number) => setFeatures(prev => prev.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, val: string) => setFeatures(prev => prev.map((f, idx) => idx === i ? val : f));

  // ── Styles ──
  const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-colors focus:ring-1 focus:ring-white/20";
  const inputSx: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#E8E4DF",
  };
  const labelCls = "flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider";
  const labelSx: React.CSSProperties = { color: "#9A9590" };

  return (
    <RouteGuard requiredPlan="free">
      <div className="min-h-screen md:pl-[56px]" style={{ background: "#18171A" }}>
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                to="/hub/vault"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
                style={{ fontSize: "12px", color: "#9A9590" }}
              >
                <ArrowLeft size={14} /> Vault
              </Link>
              <div>
                <h1 className="text-[22px] font-bold" style={{ color: "#E8E4DF" }}>
                  Product Catalogue
                </h1>
                <p className="text-[12px] mt-0.5" style={{ color: "#7A7572" }}>
                  Manage your products to generate targeted campaigns
                </p>
              </div>
            </div>

            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}
            >
              <Plus size={14} /> New Product
            </button>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "#7A7572" }} />
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-xl"
              style={{ background: "#201F23", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertCircle size={32} style={{ color: "#ef4444" }} />
              <p className="text-[13px]" style={{ color: "#ef4444" }}>{error}</p>
              <button onClick={loadProducts}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer text-[12px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "#E8E4DF" }}>
                Réessayer
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl"
              style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Package size={40} style={{ color: "#3B3936", marginBottom: 16 }} />
              <p className="text-[15px] font-semibold mb-1" style={{ color: "#E8E4DF" }}>
                No products yet
              </p>
              <p className="text-[12px] mb-4" style={{ color: "#7A7572" }}>
                Create your first product to generate targeted campaigns
              </p>
              <button onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer"
                style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}>
                <Plus size={14} /> Create Product
              </button>
            </div>
          )}

          {/* ── Product grid ── */}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product, i) => {
                const mainImage = product.images?.[0]?.signedUrl;
                return (
                  <motion.div key={product.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl overflow-hidden group"
                    style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden" style={{ background: "#18171A" }}>
                      {mainImage ? (
                        <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} style={{ color: "#3B3936" }} />
                        </div>
                      )}
                      {product.images?.length > 1 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: "rgba(0,0,0,0.7)", color: "#E8E4DF" }}>
                          {product.images.length} photos
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="line-clamp-1 text-[14px] font-semibold" style={{ color: "#E8E4DF" }}>
                          {product.name}
                        </h3>
                        {product.price && (
                          <span className="text-[13px] font-semibold" style={{ color: "var(--ora-signal, #3B4FC4)" }}>
                            {product.price} {product.currency}
                          </span>
                        )}
                      </div>

                      {product.category && (
                        <span className="inline-block px-2 py-0.5 rounded mb-2 text-[10px] font-medium"
                          style={{ background: "rgba(255,255,255,0.04)", color: "#9A9590", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {product.category}
                        </span>
                      )}

                      {product.description && (
                        <p className="line-clamp-2 mb-2 text-[11px]" style={{ color: "#7A7572", lineHeight: 1.4 }}>
                          {product.description}
                        </p>
                      )}

                      {product.features?.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <List size={10} style={{ color: "#5C5856" }} />
                          <span className="text-[10px]" style={{ color: "#5C5856" }}>
                            {product.features.length} feature{product.features.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <button onClick={() => openEdit(product)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.06] text-[11px] font-medium"
                          style={{ color: "#9A9590" }}>
                          <Edit3 size={11} /> Edit
                        </button>
                        {deleteConfirm === product.id ? (
                          <>
                            <button onClick={() => handleDelete(product.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] font-semibold"
                              style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                              <Check size={11} /> Confirm
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.06] text-[11px]"
                              style={{ color: "#9A9590" }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(product.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.06] text-[11px] font-medium"
                            style={{ color: "#9A9590" }}>
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════
              CREATE / EDIT DIALOG
              ══════════════════════════════════ */}
          <AnimatePresence>
            {dialogOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl"
                  style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 className="text-[16px] font-semibold" style={{ color: "#E8E4DF" }}>
                      {editingProduct ? "Edit Product" : "New Product"}
                    </h2>
                    <button onClick={() => setDialogOpen(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06]"
                      style={{ color: "#9A9590" }}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="px-6 py-5 space-y-4">

                    {/* Name */}
                    <div>
                      <label className={labelCls} style={labelSx}><Package size={11} /> Product Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Premium Wireless Headphones"
                        className={inputCls} style={inputSx} />
                    </div>

                    {/* Description */}
                    <div>
                      <label className={labelCls} style={labelSx}>Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Describe your product..." rows={3}
                        className={`${inputCls} resize-none`} style={inputSx} />
                    </div>

                    {/* URL + Auto-fill */}
                    <div>
                      <label className={labelCls} style={labelSx}><LinkIcon size={11} /> Product URL</label>
                      <div className="flex gap-2">
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                          placeholder="https://your-store.com/product"
                          className={`flex-1 ${inputCls}`} style={inputSx} />
                        <button onClick={handleScrape} disabled={scraping || !url.trim()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap text-[11px] font-semibold"
                          style={{ background: "rgba(94,106,210,0.15)", border: "1px solid rgba(94,106,210,0.3)", color: "#8b9cf7" }}>
                          {scraping ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
                          {scraping ? "Fetching..." : "Auto-fill"}
                        </button>
                      </div>
                    </div>

                    {/* Price + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} style={labelSx}><DollarSign size={11} /> Price</label>
                        <input type="text" value={price} onChange={e => setPrice(e.target.value)}
                          placeholder="29.99" className={inputCls} style={inputSx} />
                      </div>
                      <div>
                        <label className={labelCls} style={labelSx}>Currency</label>
                        <select value={currency} onChange={e => setCurrency(e.target.value)}
                          className={`${inputCls} cursor-pointer`} style={{ ...inputSx, appearance: "none" }}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className={labelCls} style={labelSx}><Tag size={11} /> Category</label>
                      <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Electronics, Fashion, SaaS..."
                        className={inputCls} style={inputSx} />
                    </div>

                    {/* Features */}
                    <div>
                      <label className={labelCls} style={labelSx}><List size={11} /> Key Features</label>
                      <div className="space-y-2">
                        {features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input type="text" value={feat}
                              onChange={e => updateFeature(idx, e.target.value)}
                              placeholder={`Feature ${idx + 1}`}
                              className={`flex-1 ${inputCls}`} style={inputSx} />
                            {features.length > 1 && (
                              <button onClick={() => removeFeature(idx)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06]"
                                style={{ color: "#9A9590" }}>
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={addFeature}
                          className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-white/[0.04] text-[11px]"
                          style={{ color: "#7A7572" }}>
                          <Plus size={11} /> Add feature
                        </button>
                      </div>
                    </div>

                    {/* Images (edit mode only) */}
                    {editingProduct && (
                      <div>
                        <label className={labelCls} style={labelSx}><ImageIcon size={11} /> Product Images</label>

                        {editingProduct.images?.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {editingProduct.images.map(img => (
                              <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square"
                                style={{ background: "#18171A" }}>
                                {img.signedUrl ? (
                                  <img src={img.signedUrl} alt={img.fileName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={16} style={{ color: "#3B3936" }} />
                                  </div>
                                )}
                                <button onClick={() => handleDeleteImage(editingProduct.id, img.id)}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                          onChange={e => {
                            if (e.target.files && editingProduct) {
                              handleImageUpload(editingProduct.id, e.target.files);
                              e.target.value = "";
                            }
                          }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04] disabled:opacity-40 text-[11px]"
                          style={{ color: "#9A9590", border: "1px dashed rgba(255,255,255,0.15)" }}>
                          {uploadingImages ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          {uploadingImages ? "Uploading..." : "Upload Images"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => setDialogOpen(false)}
                      className="px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04] text-[12px]"
                      style={{ color: "#9A9590" }}>
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving || !name.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 text-[12px] font-semibold"
                      style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff" }}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      {saving ? "Saving..." : (editingProduct ? "Save Changes" : "Create Product")}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </RouteGuard>
  );
}
