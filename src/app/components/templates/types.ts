// ── Template Engine Types ──

export interface TemplateLayer {
  id: string;
  type:
    | "background-image" | "text" | "shape" | "logo" | "gradient-overlay"
    | "image" | "circle" | "path" | "line" | "group";
  /** Position as percentage of canvas (0-100) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Data binding to asset or vault fields */
  dataBinding?: {
    source: "asset" | "vault" | "static";
    field: string; // e.g. "imageUrl", "caption", "headline", "logoUrl", "colors[0]"
  };
  style?: {
    // Text
    fontSize?: number; // percentage of canvas height
    fontFamily?: string;
    fontWeight?: number;
    color?: string; // hex or "vault:primary" / "vault:accent"
    textAlign?: "left" | "center" | "right";
    lineHeight?: number;
    maxLines?: number;
    textTransform?: "none" | "uppercase" | "lowercase";
    letterSpacing?: number;
    // Shape
    fill?: string; // hex or "vault:primary"
    opacity?: number;
    cornerRadius?: number;
    // Gradient overlay
    gradientDirection?: "top" | "bottom" | "left" | "right";
    gradientStops?: { offset: number; color: string; opacity: number }[];
    // Logo
    objectFit?: "contain" | "cover";

    // ── Universal transform ──
    rotation?: number; // degrees, applied to any layer
    // ── Border / stroke ──
    stroke?: string; // hex or "vault:*"
    strokeWidth?: number; // canvas pixels
    // ── Shadow ──
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;

    // ── Circle-specific ──
    radius?: number; // percentage of canvas width (0-100)

    // ── Path-specific ──
    pathData?: string; // SVG "d" attribute (M, L, C, Q, Z …)
    pathScale?: number; // scale multiplier (default 1)

    // ── Line-specific ──
    points?: number[]; // [x1,y1,x2,y2,…] in canvas percentages (0-100)
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
    tension?: number; // 0 = straight, 0.5 = smooth curve
    closed?: boolean;
    dash?: number[]; // dash pattern e.g. [10, 5]

    // ── Clip mask (for image type) ──
    clipType?: "circle" | "ellipse" | "roundedRect" | "path";
    clipData?: string; // SVG path for clipType "path"
    clipRadius?: number; // percentage of min(w,h) for circle/roundedRect
  };
  /** Group children (only when type === "group") */
  children?: TemplateLayer[];
  /** Conditional visibility */
  visible?: {
    when: string; // e.g. "asset.headline", "vault.logoUrl"
    notEmpty?: boolean;
  };
  zIndex: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  formatId: string;
  aspectRatio: string;
  canvasWidth: number;
  canvasHeight: number;
  category: "minimal" | "bold" | "editorial" | "gradient" | "complex" | "ai-generated";
  layers: TemplateLayer[];
  /** Origin of the template */
  source?: "builtin" | "ai-generated";
  createdAt?: string;
  referenceImageUrl?: string;
  /** SVG template string with placeholders (AI-generated templates) */
  svgTemplate?: string;
  /** HTML/CSS template string with placeholders (AI-generated templates, two-pass) */
  htmlTemplate?: string;
}
