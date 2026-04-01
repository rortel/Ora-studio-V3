/**
 * Logo Overlay — Applies client's brand logo on generated images
 * Uses Canvas API for fast client-side compositing.
 *
 * Logo position is configurable from Brand Vault (default: bottom-right).
 * Supports: PNG, JPG, SVG, WebP logos.
 */

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export interface LogoOverlayConfig {
  logoUrl: string;
  position?: LogoPosition;
  /** Logo size as % of image shortest side (default: 12%) */
  sizePercent?: number;
  /** Padding from edge in px (default: 24) */
  padding?: number;
  /** Opacity 0-1 (default: 0.9) */
  opacity?: number;
}

// Cache loaded logo images to avoid refetching
const logoCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  if (logoCache.has(url)) return Promise.resolve(logoCache.get(url)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { logoCache.set(url, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Apply logo overlay to an image URL, returns new blob URL
 */
export async function applyLogoOverlay(
  imageUrl: string,
  config: LogoOverlayConfig,
): Promise<string> {
  const { logoUrl, position = "bottom-right", sizePercent = 12, padding = 24, opacity = 0.9 } = config;

  try {
    const [baseImg, logoImg] = await Promise.all([
      loadImage(imageUrl),
      loadImage(logoUrl),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext("2d")!;

    // Draw base image
    ctx.drawImage(baseImg, 0, 0);

    // Calculate logo size (% of shortest side)
    const shortSide = Math.min(canvas.width, canvas.height);
    const logoMaxSize = Math.round(shortSide * (sizePercent / 100));
    const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
    let logoW: number, logoH: number;
    if (logoAspect >= 1) {
      logoW = logoMaxSize;
      logoH = Math.round(logoMaxSize / logoAspect);
    } else {
      logoH = logoMaxSize;
      logoW = Math.round(logoMaxSize * logoAspect);
    }

    // Calculate position
    let x: number, y: number;
    switch (position) {
      case "top-left":     x = padding; y = padding; break;
      case "top-right":    x = canvas.width - logoW - padding; y = padding; break;
      case "bottom-left":  x = padding; y = canvas.height - logoH - padding; break;
      case "bottom-right": x = canvas.width - logoW - padding; y = canvas.height - logoH - padding; break;
      case "center":       x = (canvas.width - logoW) / 2; y = (canvas.height - logoH) / 2; break;
    }

    // Draw logo with opacity
    ctx.globalAlpha = opacity;
    ctx.drawImage(logoImg, x, y, logoW, logoH);
    ctx.globalAlpha = 1;

    // Return as blob URL
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/png",
        1.0,
      );
    });
  } catch (err) {
    console.warn("[logo-overlay] Failed, returning original image:", err);
    return imageUrl; // Fallback: return original image without logo
  }
}

/**
 * Apply logo to image and return as downloadable Blob
 */
export async function applyLogoOverlayBlob(
  imageUrl: string,
  config: LogoOverlayConfig,
): Promise<Blob> {
  const { logoUrl, position = "bottom-right", sizePercent = 12, padding = 24, opacity = 0.9 } = config;

  const [baseImg, logoImg] = await Promise.all([
    loadImage(imageUrl),
    loadImage(logoUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(baseImg, 0, 0);

  const shortSide = Math.min(canvas.width, canvas.height);
  const logoMaxSize = Math.round(shortSide * (sizePercent / 100));
  const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
  let logoW: number, logoH: number;
  if (logoAspect >= 1) {
    logoW = logoMaxSize;
    logoH = Math.round(logoMaxSize / logoAspect);
  } else {
    logoH = logoMaxSize;
    logoW = Math.round(logoMaxSize * logoAspect);
  }

  let x: number, y: number;
  switch (position) {
    case "top-left":     x = padding; y = padding; break;
    case "top-right":    x = canvas.width - logoW - padding; y = padding; break;
    case "bottom-left":  x = padding; y = canvas.height - logoH - padding; break;
    case "bottom-right": x = canvas.width - logoW - padding; y = canvas.height - logoH - padding; break;
    case "center":       x = (canvas.width - logoW) / 2; y = (canvas.height - logoH) / 2; break;
  }

  ctx.globalAlpha = opacity;
  ctx.drawImage(logoImg, x, y, logoW, logoH);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/png",
      1.0,
    );
  });
}
