import { useState, useCallback, useMemo } from "react";
import type { VideoProjectActions } from "../../lib/video-editor/useVideoProject";
import type { VideoLibraryAsset } from "../../lib/video-editor/useLibraryAssets";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Asset Browser — Left sidebar for adding assets
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type Tab = "library" | "text" | "shapes" | "upload";
type FilterType = "all" | "image" | "video" | "audio";

interface Props {
  actions: VideoProjectActions;
  libraryAssets: VideoLibraryAsset[];
  libraryLoading: boolean;
  onUpload: (file: File) => Promise<{ url: string; type: string }>;
  onRefresh: () => void;
}

export function AssetBrowser({ actions, libraryAssets, libraryLoading, onUpload, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("library");
  const [textInput, setTextInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [uploading, setUploading] = useState(false);

  const { project, addItem, addTrack } = actions;

  /* ── Filtered & searched assets ── */
  const filteredAssets = useMemo(() => {
    let list = libraryAssets;
    if (filterType !== "all") {
      list = list.filter((a) => a.type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.prompt?.toLowerCase().includes(q) ||
          a.model?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [libraryAssets, filterType, search]);

  /* ── Asset counts per type ── */
  const counts = useMemo(() => {
    const c = { all: libraryAssets.length, image: 0, video: 0, audio: 0 };
    for (const a of libraryAssets) c[a.type]++;
    return c;
  }, [libraryAssets]);

  /* ── Find or create track for asset type ── */
  const findTrack = useCallback(
    (type: "video" | "audio" | "text" | "overlay") => {
      const existing = project.tracks.find((t) => t.type === type);
      if (existing) return existing.id;
      return addTrack(type, type.charAt(0).toUpperCase() + type.slice(1));
    },
    [project, addTrack],
  );

  /* ── Add library asset to timeline ── */
  const addAssetToTimeline = useCallback(
    (asset: VideoLibraryAsset) => {
      const trackType = asset.type === "audio" ? "audio" : asset.type === "video" ? "video" : "overlay";
      const trackId = findTrack(trackType);

      if (asset.type === "image") {
        addItem(trackId, {
          from: actions.playheadFrame,
          durationInFrames: project.fps * 5,
          sourceType: "library",
          sourceId: asset.id,
          sourceUrl: asset.url,
          data: { kind: "image", x: 10, y: 10, width: 80, height: 80, opacity: 1 },
        });
      } else if (asset.type === "video") {
        addItem(trackId, {
          from: actions.playheadFrame,
          durationInFrames: asset.durationInFrames || project.fps * 10,
          sourceType: "library",
          sourceId: asset.id,
          sourceUrl: asset.url,
          data: { kind: "video", volume: 1 },
        });
      } else if (asset.type === "audio") {
        addItem(trackId, {
          from: actions.playheadFrame,
          durationInFrames: asset.durationInFrames || project.fps * 30,
          sourceType: "library",
          sourceId: asset.id,
          sourceUrl: asset.url,
          data: { kind: "audio", volume: 1, fadeIn: 0.5, fadeOut: 0.5 },
        });
      }
    },
    [project, actions.playheadFrame, findTrack, addItem],
  );

  /* ── Add text overlay ── */
  const addTextOverlay = useCallback(() => {
    if (!textInput.trim()) return;
    const trackId = findTrack("text");
    addItem(trackId, {
      from: actions.playheadFrame,
      durationInFrames: project.fps * 5,
      sourceType: "generated",
      data: {
        kind: "text",
        text: textInput,
        fontSize: 48,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        color: "#ffffff",
        backgroundColor: undefined,
        x: 10,
        y: 40,
        width: 80,
        height: 20,
        align: "center" as const,
      },
    });
    setTextInput("");
  }, [textInput, project.fps, actions.playheadFrame, findTrack, addItem]);

  /* ── Add color background ── */
  const addBackground = useCallback(
    (color: string) => {
      let trackId = project.tracks.find((t) => t.type === "background")?.id;
      if (!trackId) trackId = addTrack("background", "Background");
      addItem(trackId, {
        from: 0,
        durationInFrames: project.durationInFrames,
        sourceType: "generated",
        data: { kind: "background", color },
      });
    },
    [project, addTrack, addItem],
  );

  /* ── File upload ── */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const result = await onUpload(file);
        const type = file.type.startsWith("video")
          ? "video"
          : file.type.startsWith("audio")
            ? "audio"
            : "image";
        addAssetToTimeline({
          id: crypto.randomUUID(),
          type: type as "image" | "video" | "audio",
          url: result.url,
          name: file.name,
        });
      } catch {
        // handled upstream
      } finally {
        setUploading(false);
      }
    },
    [onUpload, addAssetToTimeline],
  );

  /* ── Drag & drop on the browser area ── */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const result = await onUpload(file);
        const type = file.type.startsWith("video")
          ? "video"
          : file.type.startsWith("audio")
            ? "audio"
            : "image";
        addAssetToTimeline({
          id: crypto.randomUUID(),
          type: type as "image" | "video" | "audio",
          url: result.url,
          name: file.name,
        });
      } catch {
        // handled upstream
      } finally {
        setUploading(false);
      }
    },
    [onUpload, addAssetToTimeline],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "text", label: "Text" },
    { id: "shapes", label: "Colors" },
    { id: "upload", label: "Upload" },
  ];

  return (
    <div
      className="flex flex-col h-full bg-card border-r border-border"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === t.id ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* ── Library tab ── */}
        {tab === "library" && (
          <div className="space-y-2">
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />

            {/* Type filter pills */}
            <div className="flex gap-1">
              {(["all", "image", "video", "audio"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                    filterType === t
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? `All (${counts.all})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${counts[t]})`}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={libraryLoading}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:animate-pulse"
            >
              {libraryLoading ? "Loading..." : "Refresh library"}
            </button>

            {/* Asset grid */}
            {libraryLoading && filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground text-xs mt-3">Loading your library...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-xs">
                  {search ? "No results" : "No assets yet"}
                </p>
                <p className="text-muted-foreground/60 text-[10px] mt-1">
                  {search
                    ? "Try a different search"
                    : "Generate content in Ora Studio, then use it here"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => addAssetToTimeline(asset)}
                    className="group relative aspect-video rounded-md overflow-hidden bg-secondary hover:ring-2 hover:ring-foreground/30 transition-all"
                    title={asset.prompt || asset.name}
                  >
                    {asset.thumbnail || asset.type === "image" ? (
                      <img
                        src={asset.thumbnail || asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <span className="text-muted-foreground text-lg">
                          {asset.type === "video" ? "\u25B6" : "\u266B"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{asset.type}</span>
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-1 left-1">
                      <span
                        className={`text-[8px] px-1 py-0.5 rounded font-medium ${
                          asset.type === "video"
                            ? "bg-indigo-100 text-indigo-700"
                            : asset.type === "audio"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {asset.type}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <p className="text-[9px] text-white/90 truncate">{asset.name}</p>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white bg-foreground/80 px-2 py-0.5 rounded">+ Add</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Text tab ── */}
        {tab === "text" && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Add text overlay</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Your text here..."
                className="mt-1 w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                rows={3}
              />
              <button
                onClick={addTextOverlay}
                disabled={!textInput.trim()}
                className="mt-2 w-full py-1.5 rounded-full bg-foreground text-background text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              >
                Add to timeline
              </button>
            </div>

            <div className="border-t border-border pt-3">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Presets</label>
              <div className="mt-2 space-y-1.5">
                {[
                  { text: "Title", size: 72, weight: 700 },
                  { text: "Subtitle", size: 48, weight: 500 },
                  { text: "Caption", size: 24, weight: 400 },
                  { text: "Lower Third", size: 32, weight: 600 },
                ].map((preset) => (
                  <button
                    key={preset.text}
                    onClick={() => {
                      const trackId = findTrack("text");
                      addItem(trackId, {
                        from: actions.playheadFrame,
                        durationInFrames: project.fps * 5,
                        sourceType: "generated",
                        data: {
                          kind: "text",
                          text: preset.text,
                          fontSize: preset.size,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: preset.weight,
                          color: "#ffffff",
                          x: preset.text === "Lower Third" ? 5 : 10,
                          y: preset.text === "Lower Third" ? 75 : 40,
                          width: preset.text === "Lower Third" ? 50 : 80,
                          height: 20,
                          align: preset.text === "Lower Third" ? ("left" as const) : ("center" as const),
                          backgroundColor:
                            preset.text === "Lower Third" ? "rgba(0,0,0,0.6)" : undefined,
                        },
                      });
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors"
                  >
                    <span
                      className="text-foreground"
                      style={{ fontSize: Math.min(preset.size / 4, 16), fontWeight: preset.weight }}
                    >
                      {preset.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Colors tab ── */}
        {tab === "shapes" && (
          <div className="space-y-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Background colors</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                "#000000", "#1a1a2e", "#16213e", "#0f3460",
                "#533483", "#e94560", "#ff6b35", "#ffc045",
                "#44bd32", "#00d2d3", "#ffffff", "#2d3436",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => addBackground(color)}
                  className="aspect-square rounded-lg border border-border hover:ring-2 hover:ring-foreground/30 transition-all"
                  style={{ background: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="border-t border-border pt-3">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Custom color</label>
              <div className="flex gap-2 mt-2">
                <input
                  type="color"
                  defaultValue="#1a1a2e"
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  onChange={(e) => addBackground(e.target.value)}
                />
                <span className="text-xs text-muted-foreground self-center">Click to pick a color</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Upload tab ── */}
        {tab === "upload" && (
          <div className="space-y-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Import media</label>
            <div className="mt-2">
              <label
                className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  uploading
                    ? "border-foreground/30 bg-secondary"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin mb-2" />
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl text-muted-foreground mb-2">+</span>
                    <span className="text-xs text-muted-foreground">Drop file or click to browse</span>
                    <span className="text-[10px] text-muted-foreground/60 mt-1">Video, image, or audio</span>
                  </>
                )}
                <input
                  type="file"
                  accept="video/*,image/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              You can also drag & drop files anywhere in the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
