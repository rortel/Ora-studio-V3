import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Plus, X, Loader2, Trash2, Edit3, Upload, ArrowLeft,
  Package, DollarSign, Tag, Link as LinkIcon, List, Image as ImageIcon,
  Check, ChevronDown,
} from "lucide-react";
import { API_BASE, publicAnonKey, apiHeaders } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";

// ── Types ──

interface ProductImage {
  id: string;
  fileName: string;
  storagePath: string;
  signedUrl?: string | null;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
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

// ── Helpers ──

function corsBody(token: string, data?: Record<string, any>): string {
  return JSON.stringify({ _token: token, ...data });
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY"];

// ════════════════════════════════════════
// PRODUCTS PAGE
// ════════════════════════════════════════

export function ProductsPage() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFeatures, setFormFeatures] = useState<string[]>([""]);
  const [formPrice, setFormPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("EUR");
  const [formCategory, setFormCategory] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load products ──
  const loadProducts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products?_token=${accessToken}`, {
        headers: apiHeaders(false),
      });
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("[products] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Open create / edit dialog ──
  const openCreate = () => {
    setEditingProduct(null);
    setFormName("");
    setFormDescription("");
    setFormUrl("");
    setFormFeatures([""]);
    setFormPrice("");
    setFormCurrency("EUR");
    setFormCategory("");
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || "");
    setFormUrl(product.url || "");
    setFormFeatures(product.features?.length ? [...product.features] : [""]);
    setFormPrice(product.price || "");
    setFormCurrency(product.currency || "EUR");
    setFormCategory(product.category || "");
    setDialogOpen(true);
  };

  // ── Save product ──
  const handleSave = async () => {
    if (!accessToken || !formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        url: formUrl.trim(),
        features: formFeatures.filter(f => f.trim()),
        price: formPrice.trim(),
        currency: formCurrency,
        category: formCategory.trim(),
      };

      const isEdit = !!editingProduct;
      const url = isEdit
        ? `${API_BASE}/products/${editingProduct!.id}`
        : `${API_BASE}/products`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: corsBody(accessToken, payload),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        await loadProducts();
      } else {
        console.error("[products] Save failed:", data.error);
      }
    } catch (err) {
      console.error("[products] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product ──
  const handleDelete = async (productId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: corsBody(accessToken),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error("[products] Delete error:", err);
    }
  };

  // ── Upload images ──
  const handleImageUpload = async (productId: string, files: FileList) => {
    if (!accessToken || files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      formData.append("_token", accessToken);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch(`${API_BASE}/products/${productId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await loadProducts();
      }
    } catch (err) {
      console.error("[products] Image upload error:", err);
    } finally {
      setUploadingImages(false);
    }
  };

  // ── Delete image ──
  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: corsBody(accessToken),
      });
      const data = await res.json();
      if (data.success) {
        await loadProducts();
      }
    } catch (err) {
      console.error("[products] Delete image error:", err);
    }
  };

  // ── Feature list helpers ──
  const addFeature = () => setFormFeatures(prev => [...prev, ""]);
  const removeFeature = (idx: number) => setFormFeatures(prev => prev.filter((_, i) => i !== idx));
  const updateFeature = (idx: number, val: string) => setFormFeatures(prev => prev.map((f, i) => i === idx ? val : f));

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#E8E4DF",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <RouteGuard requiredPlan="free">
      <div className="min-h-screen md:pl-[56px]" style={{ background: "#18171A" }}>
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                to="/hub/vault"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
                style={{ fontSize: "12px", color: "#9A9590" }}
              >
                <ArrowLeft size={14} />
                Vault
              </Link>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#E8E4DF" }}>
                  Product Catalogue
                </h1>
                <p style={{ fontSize: "12px", color: "#7A7572", marginTop: 2 }}>
                  Manage your products to generate targeted campaigns
                </p>
              </div>
            </div>

            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}
            >
              <Plus size={14} />
              New Product
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "#5E6AD2" }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl"
              style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Package size={40} style={{ color: "#3B3936", marginBottom: 16 }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#E8E4DF", marginBottom: 4 }}>
                No products yet
              </p>
              <p style={{ fontSize: "12px", color: "#7A7572", marginBottom: 16 }}>
                Create your first product to generate targeted campaigns
              </p>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer"
                style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}
              >
                <Plus size={14} /> Create Product
              </button>
            </div>
          )}

          {/* Product grid */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => {
                const mainImage = product.images?.[0]?.signedUrl;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden group"
                    style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden"
                      style={{ background: "#18171A" }}>
                      {mainImage ? (
                        <img src={mainImage} alt={product.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} style={{ color: "#3B3936" }} />
                        </div>
                      )}
                      {/* Image count badge */}
                      {product.images?.length > 1 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded"
                          style={{ fontSize: "10px", fontWeight: 600, background: "rgba(0,0,0,0.7)", color: "#E8E4DF" }}>
                          {product.images.length} photos
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="line-clamp-1" style={{ fontSize: "14px", fontWeight: 600, color: "#E8E4DF" }}>
                          {product.name}
                        </h3>
                        {product.price && (
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ora-signal, #5E6AD2)" }}>
                            {product.price} {product.currency}
                          </span>
                        )}
                      </div>

                      {product.category && (
                        <span className="inline-block px-2 py-0.5 rounded mb-2"
                          style={{ fontSize: "10px", fontWeight: 500, background: "rgba(255,255,255,0.04)", color: "#9A9590", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {product.category}
                        </span>
                      )}

                      {product.description && (
                        <p className="line-clamp-2 mb-2"
                          style={{ fontSize: "11px", color: "#7A7572", lineHeight: 1.4 }}>
                          {product.description}
                        </p>
                      )}

                      {product.features?.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <List size={10} style={{ color: "#5C5856" }} />
                          <span style={{ fontSize: "10px", color: "#5C5856" }}>
                            {product.features.length} feature{product.features.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <button onClick={() => openEdit(product)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04]"
                          style={{ fontSize: "11px", fontWeight: 500, color: "#9A9590" }}>
                          <Edit3 size={11} /> Edit
                        </button>
                        {deleteConfirm === product.id ? (
                          <>
                            <button onClick={() => handleDelete(product.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer"
                              style={{ fontSize: "11px", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                              <Check size={11} /> Confirm
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.04]"
                              style={{ fontSize: "11px", color: "#9A9590" }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(product.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04]"
                            style={{ fontSize: "11px", fontWeight: 500, color: "#9A9590" }}>
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

          {/* ═══ CREATE / EDIT DIALOG ═══ */}
          <AnimatePresence>
            {dialogOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl"
                  style={{ background: "#201F23", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* Dialog header */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#E8E4DF" }}>
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
                      <label className="flex items-center gap-1.5 mb-1.5"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <Package size={11} /> Product Name *
                      </label>
                      <input
                        type="text" value={formName} onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Premium Wireless Headphones"
                        className="w-full px-3 py-2 rounded-lg" style={inputStyle}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Description
                      </label>
                      <textarea
                        value={formDescription} onChange={e => setFormDescription(e.target.value)}
                        placeholder="Describe your product..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg resize-none" style={inputStyle}
                      />
                    </div>

                    {/* URL */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <LinkIcon size={11} /> Product URL
                      </label>
                      <input
                        type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)}
                        placeholder="https://your-store.com/product"
                        className="w-full px-3 py-2 rounded-lg" style={inputStyle}
                      />
                    </div>

                    {/* Price + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5"
                          style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <DollarSign size={11} /> Price
                        </label>
                        <input
                          type="text" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                          placeholder="29.99"
                          className="w-full px-3 py-2 rounded-lg" style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5"
                          style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Currency
                        </label>
                        <select
                          value={formCurrency} onChange={e => setFormCurrency(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg cursor-pointer"
                          style={{ ...inputStyle, appearance: "none" }}
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <Tag size={11} /> Category
                      </label>
                      <input
                        type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)}
                        placeholder="e.g. Electronics, Fashion, SaaS..."
                        className="w-full px-3 py-2 rounded-lg" style={inputStyle}
                      />
                    </div>

                    {/* Features */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <List size={11} /> Key Features
                      </label>
                      <div className="space-y-2">
                        {formFeatures.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text" value={feat}
                              onChange={e => updateFeature(idx, e.target.value)}
                              placeholder={`Feature ${idx + 1}`}
                              className="flex-1 px-3 py-2 rounded-lg" style={inputStyle}
                            />
                            {formFeatures.length > 1 && (
                              <button onClick={() => removeFeature(idx)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06]"
                                style={{ color: "#9A9590" }}>
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={addFeature}
                          className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-white/[0.04]"
                          style={{ fontSize: "11px", color: "#5E6AD2" }}>
                          <Plus size={11} /> Add feature
                        </button>
                      </div>
                    </div>

                    {/* Images (only in edit mode) */}
                    {editingProduct && (
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5"
                          style={{ fontSize: "11px", fontWeight: 600, color: "#9A9590", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <ImageIcon size={11} /> Product Images
                        </label>

                        {/* Existing images */}
                        {editingProduct.images?.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {editingProduct.images.map(img => (
                              <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square"
                                style={{ background: "#18171A" }}>
                                {img.signedUrl ? (
                                  <img src={img.signedUrl} alt={img.fileName}
                                    className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={16} style={{ color: "#3B3936" }} />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeleteImage(editingProduct.id, img.id)}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload button */}
                        <input
                          ref={fileInputRef}
                          type="file" multiple accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files && editingProduct) {
                              handleImageUpload(editingProduct.id, e.target.files);
                              e.target.value = "";
                            }
                          }}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImages}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04] disabled:opacity-40"
                          style={{ fontSize: "11px", color: "#5E6AD2", border: "1px dashed rgba(94,106,210,0.3)" }}>
                          {uploadingImages ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          {uploadingImages ? "Uploading..." : "Upload Images"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dialog footer */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => setDialogOpen(false)}
                      className="px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04]"
                      style={{ fontSize: "12px", color: "#9A9590" }}>
                      Cancel
                    </button>
                    <button onClick={handleSave}
                      disabled={saving || !formName.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}>
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
