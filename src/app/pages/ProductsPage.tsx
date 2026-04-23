import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  Plus, X, Loader2, Trash2, Edit3, Upload, ArrowLeft,
  Package, DollarSign, Tag, Link as LinkIcon, List, Image as ImageIcon,
  Check, ChevronRight, AlertCircle, Sparkles, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { useI18n } from "../lib/i18n";

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
// API helpers
// ══════════════════════════════════════

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

function listJson(path: string, token: string) {
  return postJson(path, token);
}

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
  const navigate = useNavigate();
  const { t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [features, setFeatures] = useState<string[]>([""]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("");
  const [scrapedImageUrls, setScrapedImageUrls] = useState<string[]>([]);
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const newProductFileInputRef = useRef<HTMLInputElement>(null);

  // ── Load all products ──
  const loadProducts = useCallback(async () => {
    if (!accessToken) { setLoading(false); setError(t("products.mustBeLoggedIn")); return; }
    setLoading(true); setError(null);
    try {
      const res = await listJson("/products/list", accessToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) setProducts(data.products);
      else throw new Error(data.error || t("products.unexpectedResponse"));
    } catch (err: any) {
      setError(err?.message || t("products.loadError"));
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const resetForm = () => {
    setName(""); setDescription(""); setUrl("");
    setFeatures([""]); setPrice(""); setCurrency("EUR"); setCategory("");
    setScrapedImageUrls([]); setNewProductFiles([]);
  };

  const openCreate = () => { setEditingProduct(null); resetForm(); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditingProduct(p); setName(p.name); setDescription(p.description || "");
    setUrl(p.url || ""); setFeatures(p.features?.length ? [...p.features] : [""]);
    setPrice(p.price || ""); setCurrency(p.currency || "EUR"); setCategory(p.category || "");
    setDialogOpen(true);
  };

  const handleScrape = async () => {
    if (!accessToken) {
      console.log("[products/scrape] skipped — no accessToken");
      return;
    }
    if (!url.trim()) {
      console.log("[products/scrape] skipped — empty URL");
      return;
    }
    console.log(`[products/scrape] POST /products/scrape-url ← ${url.trim()}`);
    setScraping(true);
    try {
      const res = await postJson("/products/scrape-url", accessToken, { url: url.trim() });
      console.log(`[products/scrape] response status=${res.status}`);
      const data = await res.json();
      console.log(`[products/scrape] response body:`, data);
      if (data.success && data.product) {
        const p = data.product;
        if (p.name) setName(p.name); if (p.description) setDescription(p.description);
        if (p.price) setPrice(p.price); if (p.currency) setCurrency(p.currency);
        if (p.category) setCategory(p.category); if (p.features?.length) setFeatures(p.features);
        if (p.imageUrls?.length) setScrapedImageUrls(p.imageUrls);
        toast.success(`${t("products.extractedInfo")}${p.imageUrls?.length ? ` + ${p.imageUrls.length} photo(s)` : ""}`);
      } else {
        const errMsg = data.error || t("products.extractFailed");
        console.error(`[products/scrape] server returned failure: ${errMsg}`);
        toast.error(errMsg);
      }
    } catch (err) {
      console.error(`[products/scrape] network/parse error:`, err);
      toast.error(`${t("products.extractError")}: ${(err as Error)?.message || err}`);
    }
    finally { setScraping(false); }
  };

  // Auto-scrape when the user pastes / types a valid-looking URL — removes
  // the need to press the "Auto-fill" button. Debounced to avoid firing on
  // every keystroke, and we only trigger once per unique URL so editing
  // other fields doesn't re-scrape. The button stays as a manual retry.
  const lastAutoScrapedRef = useRef<string>("");
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    // Only auto-fire on URLs that look complete enough to be worth scraping:
    // must start with http(s):// and include a path (not just the domain
    // placeholder). Also skip if we already auto-scraped this exact URL.
    if (!/^https?:\/\/[^\s]+\/[^\s]+/i.test(trimmed)) {
      console.log(`[products/auto-scrape] URL doesn't match regex, skipping: ${trimmed}`);
      return;
    }
    if (trimmed === lastAutoScrapedRef.current) {
      console.log(`[products/auto-scrape] already scraped this URL, skipping`);
      return;
    }
    if (scraping) {
      console.log(`[products/auto-scrape] already scraping, skipping`);
      return;
    }
    // Skip auto-fire when editing an existing product — the form is already
    // populated and a background re-scrape would overwrite manual edits.
    if (editingProduct) return;
    console.log(`[products/auto-scrape] queuing scrape in 600ms for: ${trimmed}`);
    const timer = setTimeout(() => {
      lastAutoScrapedRef.current = trimmed;
      handleScrape();
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, editingProduct]);

  const hasAnyImage = scrapedImageUrls.length > 0 || newProductFiles.length > 0;

  const handleSave = async () => {
    if (!accessToken) { toast.error(t("products.notConnected")); return; }
    if (!name.trim()) { toast.error(t("products.nameRequired")); return; }
    // Require at least one image for new products
    const isEdit = !!editingProduct;
    if (!isEdit && !hasAnyImage) {
      toast.error("Ajoutez au moins une photo du produit (upload ou URL)");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), url: url.trim(),
        features: features.filter(f => f.trim()), price: price.trim(), currency, category: category.trim() };
      const path = isEdit ? `/products/${editingProduct!.id}` : "/products";
      const res = await postJson(path, accessToken, payload, isEdit ? "PUT" : "POST");
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? t("products.productUpdated") : t("products.productCreated"));
        const productId = data.product?.id || data.id;

        // Upload scraped image URLs
        if (!isEdit && scrapedImageUrls.length > 0 && productId) {
          toast.info(`Import de ${scrapedImageUrls.length} photo(s) web...`);
          try {
            const imgRes = await postJson(`/products/${productId}/images-from-urls`, accessToken, { imageUrls: scrapedImageUrls });
            const imgData = await imgRes.json();
            if (imgData.success && imgData.images?.length) toast.success(`${imgData.images.length} photo(s) importée(s)`);
          } catch {}
        }

        // Upload local files
        if (!isEdit && newProductFiles.length > 0 && productId) {
          toast.info(`Upload de ${newProductFiles.length} photo(s)...`);
          try {
            const fd = new FormData();
            fd.append("_token", accessToken);
            for (const f of newProductFiles) fd.append("files", f);
            const uploadRes = await fetch(`${API_BASE}/products/${productId}/images`, {
              method: "POST",
              headers: { Authorization: `Bearer ${publicAnonKey}` },
              body: fd,
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.images?.length) toast.success(`${uploadData.images.length} photo(s) uploadée(s)`);
          } catch {}
        }

        setDialogOpen(false); resetForm(); await loadProducts();
      } else toast.error(data.error || "Error");
    } catch { toast.error(t("products.networkError")); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await postJson(`/products/${id}`, accessToken, {}, "DELETE");
      const data = await res.json();
      if (data.success) { toast.success(t("products.productDeleted")); setDeleteConfirm(null); setProducts(prev => prev.filter(p => p.id !== id)); }
      else toast.error(data.error || "Error");
    } catch { toast.error(t("products.networkError")); }
  };

  const handleImageUpload = async (productId: string, files: FileList) => {
    if (!accessToken || files.length === 0) return;
    setUploadingImages(true);
    try {
      const res = await postFormData(`/products/${productId}/images`, accessToken, files);
      const data = await res.json();
      if (data.success) {
        toast.success(`${files.length} ${t("products.imageAdded")}`); await loadProducts();
        if (editingProduct && data.product) setEditingProduct(data.product);
      } else toast.error(data.error || t("products.uploadError"));
    } catch { toast.error(t("products.uploadError")); }
    finally { setUploadingImages(false); }
  };

  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (!accessToken) return;
    try {
      const res = await postJson(`/products/${productId}/images/${imageId}`, accessToken, {}, "DELETE");
      const data = await res.json();
      if (data.success) {
        toast.success(t("products.imageDeleted")); await loadProducts();
        if (editingProduct) setEditingProduct(prev => prev ? { ...prev, images: prev.images.filter(img => img.id !== imageId) } : null);
      }
    } catch { toast.error(t("products.networkError")); }
  };

  const addFeature = () => setFeatures(prev => [...prev, ""]);
  const removeFeature = (i: number) => setFeatures(prev => prev.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, val: string) => setFeatures(prev => prev.map((f, idx) => idx === i ? val : f));

  /* ── Styles ── */
  const inputSx: React.CSSProperties = {
    background: "var(--secondary)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: "0.625rem",
    padding: "0.625rem 0.875rem",
    fontSize: "13px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <RouteGuard requiredPlan="free">
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <AppTabs active="vault" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link
                to="/hub/vault"
                className="inline-flex items-center gap-1.5 mb-3 transition-colors"
                style={{ fontSize: "13px", color: "var(--text-tertiary)" }}
              >
                <ArrowLeft size={14} /> {t("products.backToBrand")}
              </Link>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {t("products.title")}
              </h1>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginTop: 6 }}>
                {t("products.subtitle")}
              </p>
            </div>

            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-full cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <Plus size={16} /> {t("products.newProduct")}
            </button>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div
              className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              <AlertCircle size={32} style={{ color: "var(--destructive)" }} />
              <p style={{ fontSize: "14px", color: "var(--destructive)" }}>{error}</p>
              <button onClick={loadProducts}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full cursor-pointer text-[13px] font-medium"
                style={{ background: "var(--secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                {t("products.retry")}
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && products.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-24 rounded-2xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "var(--accent-warm-light)" }}
              >
                <Package size={28} style={{ color: "var(--accent)" }} />
              </div>
              <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {t("products.noProducts")}
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: 20 }}>
                {t("products.noProductsDesc")}
              </p>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-5 py-3 rounded-full cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF", fontSize: "14px", fontWeight: 500 }}>
                <Plus size={16} /> {t("products.createProduct")}
              </button>
            </div>
          )}

          {/* ── Product grid ── */}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product, i) => {
                const mainImage = product.images?.[0]?.signedUrl;
                return (
                  <motion.div key={product.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden" style={{ background: "var(--secondary)" }}>
                      {mainImage ? (
                        <img src={mainImage} alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={36} style={{ color: "var(--border-accent)" }} />
                        </div>
                      )}
                      {product.images?.length > 1 && (
                        <span className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[11px] font-medium"
                          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", color: "var(--text-primary)" }}>
                          {product.images.length} photos
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="line-clamp-1" style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {product.name}
                        </h3>
                        {product.price && (
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap", marginLeft: 8 }}>
                            {product.price} {product.currency}
                          </span>
                        )}
                      </div>

                      {product.category && (
                        <span className="inline-block px-2.5 py-1 rounded-lg mb-3 text-[11px] font-medium"
                          style={{ background: "var(--secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          {product.category}
                        </span>
                      )}

                      {product.description && (
                        <p className="line-clamp-2 mb-3" style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {product.description}
                        </p>
                      )}

                      {product.features?.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-4">
                          <List size={12} style={{ color: "var(--text-tertiary)" }} />
                          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                            {product.features.length} {product.features.length > 1 ? t("products.featuresPlural") : t("products.features")}
                          </span>
                        </div>
                      )}

                      {/* Generate Campaign CTA */}
                      <button onClick={() => navigate(`/hub?type=campaign&productId=${product.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full cursor-pointer transition-all hover:opacity-90 mb-3"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "13px", fontWeight: 500 }}>
                        <Sparkles size={14} /> {t("products.generateCampaign")}
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <button onClick={() => openEdit(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-[12px] font-medium"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Edit3 size={12} /> {t("products.edit")}
                        </button>
                        {deleteConfirm === product.id ? (
                          <>
                            <button onClick={() => handleDelete(product.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-[12px] font-semibold"
                              style={{ color: "var(--destructive)", background: "rgba(220,38,38,0.08)" }}>
                              <Check size={12} /> {t("products.confirm")}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-2 rounded-lg cursor-pointer text-[12px]"
                              style={{ color: "var(--text-tertiary)" }}
                              onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              {t("products.cancel")}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(product.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-[12px] font-medium"
                            style={{ color: "var(--text-secondary)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <Trash2 size={12} /> {t("products.delete")}
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
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: "rgba(17,17,17,0.4)", backdropFilter: "blur(8px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: 12 }}
                  className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {editingProduct ? t("products.editProduct") : t("products.newProduct")}
                    </h2>
                    <button onClick={() => setDialogOpen(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <X size={18} />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="px-6 py-5 space-y-5">
                    {/* Name */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}>
                        <Package size={12} /> {t("products.productName")} *
                      </label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder={t("products.productNamePlaceholder")} style={inputSx}
                        onFocus={e => e.target.style.borderColor = "var(--accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}>{t("products.description")}</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder={t("products.descriptionPlaceholder")} rows={3}
                        style={{ ...inputSx, resize: "none" } as any}
                        onFocus={e => e.target.style.borderColor = "var(--accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                    </div>

                    {/* URL + Auto-fill */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}>
                        <LinkIcon size={12} /> {t("products.productUrl")}
                      </label>
                      <div className="flex gap-2">
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                          placeholder={t("products.productUrlPlaceholder")}
                          style={{ ...inputSx, flex: 1 }}
                          onFocus={e => e.target.style.borderColor = "var(--accent)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                        <button onClick={handleScrape} disabled={scraping || !url.trim()}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90 disabled:opacity-40 whitespace-nowrap text-[12px] font-medium"
                          style={{ background: "var(--accent-warm-light)", border: "1px solid var(--accent-warm-medium)", color: "var(--accent)" }}>
                          {scraping ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {scraping ? t("products.fetching") : t("products.autoFill")}
                        </button>
                      </div>
                    </div>

                    {/* Price + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}><DollarSign size={12} /> {t("products.price")}</label>
                        <input type="text" value={price} onChange={e => setPrice(e.target.value)}
                          placeholder="29.99" style={inputSx}
                          onFocus={e => e.target.style.borderColor = "var(--accent)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}>{t("products.currency")}</label>
                        <select value={currency} onChange={e => setCurrency(e.target.value)}
                          style={{ ...inputSx, appearance: "none", cursor: "pointer" } as any}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}><Tag size={12} /> {t("products.category")}</label>
                      <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                        placeholder={t("products.categoryPlaceholder")}
                        style={inputSx}
                        onFocus={e => e.target.style.borderColor = "var(--accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                    </div>

                    {/* Features */}
                    <div>
                      <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}><List size={12} /> {t("products.keyFeatures")}</label>
                      <div className="space-y-2">
                        {features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input type="text" value={feat}
                              onChange={e => updateFeature(idx, e.target.value)}
                              placeholder={`${t("products.featurePlaceholder")} ${idx + 1}`}
                              style={{ ...inputSx, flex: 1 }}
                              onFocus={e => e.target.style.borderColor = "var(--accent)"}
                              onBlur={e => e.target.style.borderColor = "var(--border)"} />
                            {features.length > 1 && (
                              <button onClick={() => removeFeature(idx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                                style={{ color: "var(--text-tertiary)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={addFeature}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[12px] transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Plus size={12} /> {t("products.addFeature")}
                        </button>
                      </div>
                    </div>

                    {/* Scraped image previews */}
                    {!editingProduct && scrapedImageUrls.length > 0 && (
                      <div>
                        <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}>
                          <ImageIcon size={12} /> {t("products.photosFound")} ({scrapedImageUrls.length})
                        </label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {scrapedImageUrls.map((imgUrl, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square"
                              style={{ background: "var(--secondary)" }}>
                              <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              <button onClick={() => setScrapedImageUrls(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                style={{ background: "var(--destructive)", color: "#fff" }}>
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {t("products.photosImportNote")}
                        </p>
                      </div>
                    )}

                    {/* ═══ IMAGE UPLOAD — création (obligatoire) ═══ */}
                    {!editingProduct && (
                      <div>
                        <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                          style={{ color: hasAnyImage ? "var(--text-tertiary)" : "var(--destructive)" }}>
                          <ImageIcon size={12} /> Photos produit *
                          {hasAnyImage && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ background: "var(--accent)", color: "#fff" }}>
                              {scrapedImageUrls.length + newProductFiles.length}
                            </span>
                          )}
                        </label>

                        {/* Preview uploaded files */}
                        {newProductFiles.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {newProductFiles.map((file, idx) => (
                              <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square"
                                style={{ background: "var(--secondary)" }}>
                                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                                <button onClick={() => setNewProductFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  style={{ background: "var(--destructive)", color: "#fff" }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Drop zone / click to upload */}
                        <input ref={newProductFileInputRef} type="file" multiple accept="image/*" className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
                            setNewProductFiles(prev => [...prev, ...files].slice(0, 10));
                            if (newProductFileInputRef.current) newProductFileInputRef.current.value = "";
                          }} />
                        <div
                          onClick={() => newProductFileInputRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
                          onDragLeave={e => { e.currentTarget.style.borderColor = hasAnyImage ? "var(--border-accent)" : "var(--destructive)"; }}
                          onDrop={e => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = "var(--border-accent)";
                            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                            setNewProductFiles(prev => [...prev, ...files].slice(0, 10));
                          }}
                          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl cursor-pointer transition-all"
                          style={{
                            border: `2px dashed ${hasAnyImage ? "var(--border-accent)" : "var(--destructive)"}`,
                            background: hasAnyImage ? "transparent" : "rgba(239,68,68,0.03)",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--secondary)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = hasAnyImage ? "transparent" : "rgba(239,68,68,0.03)"; }}
                        >
                          <Upload size={20} style={{ color: hasAnyImage ? "var(--text-tertiary)" : "var(--destructive)" }} />
                          <span style={{ fontSize: "12px", fontWeight: 500, color: hasAnyImage ? "var(--text-tertiary)" : "var(--destructive)" }}>
                            {hasAnyImage ? "Ajouter d'autres photos" : "Glissez vos photos produit ici ou cliquez"}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                            PNG, JPG, WebP — max 10 photos
                          </span>
                        </div>
                        {!hasAnyImage && (
                          <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: 6 }}>
                            Au moins une photo est requise pour utiliser Photoroom (fond studio, lifestyle, packshot...)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Images (edit mode) */}
                    {editingProduct && (
                      <div>
                        <label className="flex items-center gap-1.5 mb-2 text-[12px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}><ImageIcon size={12} /> {t("products.productImages")}</label>
                        {editingProduct.images?.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {editingProduct.images.map(img => (
                              <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square"
                                style={{ background: "var(--secondary)" }}>
                                {img.signedUrl ? (
                                  <img src={img.signedUrl} alt={img.fileName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={16} style={{ color: "var(--border-accent)" }} />
                                  </div>
                                )}
                                <button onClick={() => handleDeleteImage(editingProduct.id, img.id)}
                                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  style={{ background: "var(--destructive)", color: "#fff" }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                          onChange={e => {
                            if (e.target.files && editingProduct) { handleImageUpload(editingProduct.id, e.target.files); e.target.value = ""; }
                          }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer transition-colors disabled:opacity-40 text-[12px] font-medium"
                          style={{ color: "var(--text-secondary)", border: "1px dashed var(--border-accent)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          {uploadingImages ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {uploadingImages ? t("products.uploading") : t("products.uploadImages")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={() => setDialogOpen(false)}
                      className="px-5 py-2.5 rounded-full cursor-pointer transition-colors text-[13px]"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      {t("products.cancel")}
                    </button>
                    <button onClick={handleSave} disabled={saving || !name.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90 disabled:opacity-40 text-[13px] font-medium"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF" }}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? t("products.saving") : (editingProduct ? t("products.saveChanges") : t("products.createProduct"))}
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
