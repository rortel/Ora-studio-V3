// ---------------------------------------------------------------------------
// Ambiance & Layout configuration
// Replaces raw model selection with creative-direction presets.
// ---------------------------------------------------------------------------

export interface AmbianceDefinition {
  id: string;
  label: string;
  description: string;
  emoji: string;
  /** CSS gradient for thumbnail placeholder (no actual images needed) */
  gradient: string;
  /** Injected into image prompt for visual direction */
  promptDirective: string;
  /** Auto-selected models (hidden from user) */
  textModels: string[];
  imageModels: string[];
  videoModels: string[];
  /** Photoroom scene prompts for product mode */
  photoroomScene: string;
  /** Preferred template category */
  templateCategory: string;
}

export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  emoji: string;
  /** Maps to TemplateDefinition.category */
  templateCategory: string;
}

// ---------------------------------------------------------------------------
// Ambiance presets
// ---------------------------------------------------------------------------

export const AMBIANCE_PRESETS: AmbianceDefinition[] = [
  {
    id: "lifestyle-dore",
    label: "Lifestyle doré",
    description:
      "Lumière dorée d'heure dorée, textures douces, rendu éditorial chaleureux.",
    emoji: "🌅",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    promptDirective:
      "Golden-hour warm lighting with soft diffused shadows. Rich honey and amber color palette with creamy highlights. Shallow depth of field, editorial composition with negative space for text overlay.",
    textModels: ["gpt-4o"],
    imageModels: ["ideogram-3-leo", "photon-1"],
    videoModels: ["ray-2"],
    photoroomScene:
      "Warm golden-hour setting with soft linen fabric and natural wood surfaces, sunlight streaming from the side.",
    templateCategory: "editorial",
  },
  {
    id: "studio-epure",
    label: "Studio épuré",
    description:
      "Fond blanc/gris studio, ombres minimales, rendu produit net.",
    emoji: "⬜",
    gradient: "linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)",
    promptDirective:
      "Clean studio lighting on a pure white or light grey seamless background. Minimal soft shadows, even illumination with no color cast. Sharp focus, centered product-forward composition.",
    textModels: ["gpt-4o"],
    imageModels: ["photon-1", "photon-flash-1"],
    videoModels: ["ray-flash-2"],
    photoroomScene:
      "Bright white cyclorama studio with soft diffused overhead lighting and a subtle grey gradient floor.",
    templateCategory: "minimal",
  },
  {
    id: "cinematique",
    label: "Cinématique",
    description:
      "Éclairage dramatique, contraste profond, atmosphère cinéma.",
    emoji: "🎬",
    gradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    promptDirective:
      "Dramatic chiaroscuro lighting with deep blacks and selective highlights. Cinematic 2.39:1 framing sensibility, rich teal-and-orange color grading. Moody atmosphere with volumetric haze or subtle lens flare.",
    textModels: ["claude-sonnet"],
    imageModels: ["flux-pro-2-leo", "leonardo-kino"],
    videoModels: ["kling-v2.1"],
    photoroomScene:
      "Dark cinematic set with a single directional key light, smoke haze, and a deep charcoal backdrop.",
    templateCategory: "bold",
  },
  {
    id: "editorial-mode",
    label: "Éditorial mode",
    description:
      "Haute couture, éclairage directionnel, élégance et sophistication.",
    emoji: "👗",
    gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)",
    promptDirective:
      "High-fashion editorial lighting with a strong directional key and fill. Elegant monochrome or desaturated palette with precise contrast. Sophisticated composition following rule-of-thirds, clean lines and luxurious textures.",
    textModels: ["claude-sonnet"],
    imageModels: ["ideogram-3-leo", "flux-pro"],
    videoModels: ["ray-2"],
    photoroomScene:
      "Fashion studio with a matte black backdrop, directional softbox lighting creating elegant shadows on the product.",
    templateCategory: "editorial",
  },
  {
    id: "luxe-premium",
    label: "Luxe & Premium",
    description:
      "Textures riches, fonds sombres, accents dorés, rendu haut de gamme.",
    emoji: "👑",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #c9a227 100%)",
    promptDirective:
      "Rich premium aesthetic with deep dark backgrounds (navy, black, dark emerald). Gold and champagne accent highlights on luxurious textures like marble, velvet, or brushed metal. Low-key dramatic lighting with specular reflections.",
    textModels: ["claude-opus"],
    imageModels: ["flux-pro-2-leo", "ideogram-3-leo"],
    videoModels: ["kling-v2.1"],
    photoroomScene:
      "Dark marble surface with brushed gold accents and deep navy velvet backdrop, accent lighting catching metallic details.",
    templateCategory: "neon",
  },
  {
    id: "pop-colore",
    label: "Pop & coloré",
    description:
      "Couleurs vibrantes, saturées, énergie fun et dynamique.",
    emoji: "🎨",
    gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 30%, #e040fb 70%, #00e5ff 100%)",
    promptDirective:
      "Vibrant saturated colors with bold complementary contrasts. Energetic, playful composition with dynamic angles and graphic shapes. Bright flat lighting, pop-art influence with punchy shadows.",
    textModels: ["gpt-4o"],
    imageModels: ["gpt-image-leo", "flux-schnell-leo"],
    videoModels: ["seedance-v1"],
    photoroomScene:
      "Bright candy-colored backdrop with geometric shapes, vivid pink, yellow, and turquoise surfaces.",
    templateCategory: "playful",
  },
  {
    id: "nature-organique",
    label: "Nature & organique",
    description:
      "Tons terreux, lumière naturelle, ambiance botanique et apaisante.",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)",
    promptDirective:
      "Natural daylight filtering through foliage with soft dappled shadows. Earth-tone palette of sage green, warm terracotta, sand, and bark brown. Organic composition with botanical elements, linen textures, and raw wood.",
    textModels: ["claude-sonnet"],
    imageModels: ["photon-1", "flux-pro"],
    videoModels: ["ray-2"],
    photoroomScene:
      "Outdoor garden table with fresh eucalyptus branches, natural linen cloth, and dappled sunlight through leaves.",
    templateCategory: "editorial",
  },
  {
    id: "urbain-street",
    label: "Urbain & street",
    description:
      "Béton, néons, ambiance streetwear et culture urbaine.",
    emoji: "🏙️",
    gradient: "linear-gradient(135deg, #373b44 0%, #4286f4 100%)",
    promptDirective:
      "Urban gritty aesthetic with concrete textures, neon signage reflections, and moody twilight sky. Streetwear-inspired framing with strong graphic lines and raw industrial surfaces. Cool blue and warm neon pink accent palette.",
    textModels: ["gpt-4o"],
    imageModels: ["flux-pro-2-leo", "gpt-image-leo"],
    videoModels: ["seedance-v1"],
    photoroomScene:
      "Concrete sidewalk with wet reflections, graffiti wall in the background, neon signage casting colored light.",
    templateCategory: "bold",
  },
  {
    id: "romantique-soft",
    label: "Romantique soft",
    description:
      "Pastels, flou doux, atmosphère rêveuse et délicate.",
    emoji: "🌸",
    gradient: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
    promptDirective:
      "Soft dreamy lighting with gentle overexposure and pastel color palette. Blush pink, lavender, and powder blue tones with creamy bokeh backgrounds. Delicate romantic composition with floral accents and flowing fabrics.",
    textModels: ["claude-sonnet"],
    imageModels: ["photon-1", "ideogram-3-leo"],
    videoModels: ["ray-2"],
    photoroomScene:
      "Soft pink silk drape with scattered dried flower petals, delicate morning light, and frosted glass surface.",
    templateCategory: "minimal",
  },
  {
    id: "minimaliste-zen",
    label: "Minimaliste zen",
    description:
      "Beaucoup d'espace, sujet unique, calme et sérénité.",
    emoji: "🪷",
    gradient: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    promptDirective:
      "Ultra-minimal composition with generous whitespace and a single focal subject. Muted neutral palette of off-white, warm grey, and pale beige. Soft even lighting with barely perceptible shadows, zen-like calm.",
    textModels: ["gpt-4o"],
    imageModels: ["photon-flash-1", "dall-e"],
    videoModels: ["ray-flash-2"],
    photoroomScene:
      "Pure white surface with a single smooth stone and a thin branch, soft shadowless lighting.",
    templateCategory: "minimal",
  },
  {
    id: "retro-vintage",
    label: "Rétro & vintage",
    description:
      "Grain film, tons chauds désaturés, nostalgie et caractère.",
    emoji: "📷",
    gradient: "linear-gradient(135deg, #e6b980 0%, #eacda3 100%)",
    promptDirective:
      "Analog film aesthetic with visible grain and slight vignetting. Warm desaturated palette — faded oranges, muted greens, and creamy yellows. Nostalgic composition reminiscent of 1970s editorial photography with soft lens imperfections.",
    textModels: ["claude-sonnet"],
    imageModels: ["leonardo-kino", "flux-pro"],
    videoModels: ["kling-v2.1"],
    photoroomScene:
      "Vintage wooden desk with aged paper, brass objects, and warm tungsten lamp light casting long shadows.",
    templateCategory: "vintage",
  },
  {
    id: "tech-futuriste",
    label: "Tech & futuriste",
    description:
      "Dégradés, glass morphism, néons, ambiance science-fiction.",
    emoji: "🚀",
    gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    promptDirective:
      "Futuristic sci-fi aesthetic with holographic gradients and glass-morphism effects. Neon cyan, electric purple, and deep space black palette. Sleek angular composition with glowing edges, reflective surfaces, and subtle particle effects.",
    textModels: ["gpt-5"],
    imageModels: ["seedream-v4.5", "flux-pro-2-leo"],
    videoModels: ["seedance-2.0"],
    photoroomScene:
      "Dark reflective surface with holographic light strips, glass platform, and subtle volumetric neon glow.",
    templateCategory: "neon",
  },
];

// ---------------------------------------------------------------------------
// Layout presets
// ---------------------------------------------------------------------------

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "ad-ready",
    label: "Produit + CTA",
    description:
      "Visuel produit hero avec titre, sous-titre, bouton CTA et badge prix.",
    emoji: "🛒",
    templateCategory: "ad-ready",
  },
  {
    id: "editorial",
    label: "Éditorial",
    description:
      "Image plein cadre avec superposition de texte élégante.",
    emoji: "📰",
    templateCategory: "editorial",
  },
  {
    id: "bold",
    label: "Impact visuel",
    description:
      "Texte large, formes audacieuses, contraste élevé.",
    emoji: "💥",
    templateCategory: "bold",
  },
  {
    id: "minimal",
    label: "Minimaliste",
    description:
      "Épuré, beaucoup d'espace, branding subtil.",
    emoji: "✨",
    templateCategory: "minimal",
  },
  {
    id: "magazine",
    label: "Magazine",
    description:
      "Mise en page multi-zones, grille éditoriale.",
    emoji: "📖",
    templateCategory: "magazine",
  },
  {
    id: "corporate",
    label: "Corporate",
    description:
      "Professionnel, structuré, marque en avant.",
    emoji: "🏢",
    templateCategory: "corporate",
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const ambianceMap = new Map<string, AmbianceDefinition>(
  AMBIANCE_PRESETS.map((a) => [a.id, a]),
);

/**
 * Merge and deduplicate models from selected ambiances.
 * Caps: 2 text, 3 image, 2 video.
 */
export function getModelsForAmbiances(ids: string[]): {
  textModels: string[];
  imageModels: string[];
  videoModels: string[];
} {
  const textSet = new Set<string>();
  const imageSet = new Set<string>();
  const videoSet = new Set<string>();

  for (const id of ids) {
    const def = ambianceMap.get(id);
    if (!def) continue;
    def.textModels.forEach((m) => textSet.add(m));
    def.imageModels.forEach((m) => imageSet.add(m));
    def.videoModels.forEach((m) => videoSet.add(m));
  }

  return {
    textModels: [...textSet].slice(0, 2),
    imageModels: [...imageSet].slice(0, 3),
    videoModels: [...videoSet].slice(0, 2),
  };
}

/**
 * Combine prompt directives from selected ambiances.
 * The first ambiance is treated as primary (full directive),
 * subsequent ones contribute secondary adjective phrases.
 */
export function getPromptDirective(ids: string[]): string {
  const definitions = ids
    .map((id) => ambianceMap.get(id))
    .filter((d): d is AmbianceDefinition => d !== undefined);

  if (definitions.length === 0) return "";
  if (definitions.length === 1) return definitions[0].promptDirective;

  const primary = definitions[0].promptDirective;
  const secondaryHints = definitions
    .slice(1)
    .map((d) => {
      // Extract the first sentence as a secondary hint
      const firstSentence = d.promptDirective.split(". ")[0];
      return firstSentence.toLowerCase();
    })
    .join(", ");

  return `${primary} Additionally incorporate: ${secondaryHints}.`;
}

/**
 * Collect Photoroom scene prompts from selected ambiances.
 */
export function getPhotoRoomScenes(ids: string[]): string[] {
  return ids
    .map((id) => ambianceMap.get(id))
    .filter((d): d is AmbianceDefinition => d !== undefined)
    .map((d) => d.photoroomScene);
}

/**
 * Determine the preferred template category.
 * Layout override takes precedence, then primary ambiance's category.
 */
export function getPreferredTemplateCategory(
  ambianceIds: string[],
  layoutOverride?: string,
): string {
  if (layoutOverride) {
    const layout = LAYOUT_PRESETS.find((l) => l.id === layoutOverride);
    if (layout) return layout.templateCategory;
  }

  if (ambianceIds.length > 0) {
    const primary = ambianceMap.get(ambianceIds[0]);
    if (primary) return primary.templateCategory;
  }

  return "editorial";
}
