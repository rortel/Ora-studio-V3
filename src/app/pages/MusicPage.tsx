import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Shuffle, Heart, Download, Search, Plus, Trash2,
  MoreHorizontal, Loader2, ListMusic, Clock, ChevronRight,
  FileAudio, Scissors, Video, ArrowUpFromLine, X, Pencil,
  Check, FolderPlus, ExternalLink, CreditCard, ChevronDown,
  Mic, MicOff, AlignLeft,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface MusicTrack {
  id: string;
  libraryId: string;
  title: string;
  prompt: string;
  audioUrl: string;
  imageUrl?: string;
  duration: string;
  durationSec: number;
  bpm?: number;
  model: string;
  provider: string;
  sunoTaskId?: string;
  sunoAudioId?: string;
  savedAt: string;
  tags?: string;
}

interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

type MusicView = "all" | "favorites" | "playlist";
type SortMode = "recent" | "title" | "duration";

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */

function parseDuration(dur: string): number {
  const parts = dur.split(":");
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return 0;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ═══════════════════════════════════
   EXPORTS
   ═══════════════════════════════════ */

export function MusicPage() {
  return (
    <RouteGuard requireAuth requireFeature="hub">
      <MusicPageContent />
    </RouteGuard>
  );
}

function MusicPageContent() {
  const { t } = useI18n();
  const { getAuthHeader } = useAuth();

  // Data
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [credits, setCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [view, setView] = useState<MusicView>("all");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState("");
  const [contextTrack, setContextTrack] = useState<MusicTrack | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const [lyricsTrack, setLyricsTrack] = useState<MusicTrack | null>(null);
  const [lyricsContent, setLyricsContent] = useState<string>("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [extendTrack, setExtendTrack] = useState<MusicTrack | null>(null);
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendAt, setExtendAt] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const serverPost = useCallback((path: string, bodyData: any) => {
    const token = getAuthHeader();
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...bodyData, _token: token }),
    }).then(r => r.json());
  }, [getAuthHeader]);

  const serverGet = useCallback((path: string) => {
    return fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    }).then(r => r.json());
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [libData, playlistData, favData, credData] = await Promise.all([
        serverPost("/library/list", {}),
        serverPost("/music/playlists/list", {}),
        serverPost("/music/favorites/list", {}),
        serverGet("/suno/credits"),
      ]);

      if (libData.success) {
        const soundItems = (libData.items || []).filter((item: any) => item.type === "sound" && item.preview?.audioUrl);
        const mapped: MusicTrack[] = soundItems.map((item: any) => ({
          id: item.preview?.sunoAudioId || item.id,
          libraryId: item.id,
          title: item.preview?.title || item.customName || item.prompt?.slice(0, 50) || "Untitled",
          prompt: item.prompt || "",
          audioUrl: item.preview.audioUrl,
          imageUrl: item.preview.imageUrl,
          duration: item.preview.duration || "0:00",
          durationSec: parseDuration(item.preview.duration || "0:00"),
          bpm: item.preview.bpm,
          model: item.model?.name || "Unknown",
          provider: item.model?.provider || "",
          sunoTaskId: item.preview.sunoTaskId,
          sunoAudioId: item.preview.sunoAudioId,
          savedAt: item.savedAt || item.timestamp,
          tags: item.preview.tags,
        }));
        setTracks(mapped);
      }
      if (playlistData.success) setPlaylists(playlistData.playlists || []);
      if (favData.success) setFavorites(favData.favorites || []);
      if (credData.code === 200) setCredits(credData.data);
    } catch (err) {
      console.error("[Music] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [serverPost, serverGet]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Audio element setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current!.currentTime);
      });
      audioRef.current.addEventListener("loadedmetadata", () => {
        setTotalDuration(audioRef.current!.duration || 0);
      });
      audioRef.current.addEventListener("ended", () => {
        handleNext();
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Play track
  const playTrack = useCallback((track: MusicTrack, trackList?: MusicTrack[]) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (currentTrack?.id === track.id && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (currentTrack?.id !== track.id) {
      audio.src = track.audioUrl;
      setCurrentTrack(track);
      setCurrentTime(0);
    }
    audio.play().then(() => setIsPlaying(true)).catch(console.error);
    if (trackList) setQueue(trackList);
  }, [currentTrack]);

  const handlePrev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) playTrack(queue[idx - 1]);
    else if (audioRef.current) { audioRef.current.currentTime = 0; }
  }, [currentTrack, queue, playTrack]);

  const handleNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (isRepeat) {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
      return;
    }
    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * queue.length);
      playTrack(queue[randIdx]);
      return;
    }
    if (idx < queue.length - 1) playTrack(queue[idx + 1]);
    else { setIsPlaying(false); }
  }, [currentTrack, queue, isRepeat, isShuffle, playTrack]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || !totalDuration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * totalDuration;
  }, [totalDuration]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (trackId: string) => {
    const data = await serverPost("/music/favorites/toggle", { trackId });
    if (data.success) setFavorites(data.favorites);
  }, [serverPost]);

  // Playlist actions
  const createPlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) return;
    const data = await serverPost("/music/playlists/save", { name: newPlaylistName.trim(), trackIds: [] });
    if (data.success) setPlaylists(p => [...p, data.playlist]);
    setNewPlaylistName("");
    setShowNewPlaylist(false);
  }, [newPlaylistName, serverPost]);

  const deletePlaylist = useCallback(async (id: string) => {
    await serverPost("/music/playlists/delete", { id });
    setPlaylists(p => p.filter(pl => pl.id !== id));
    if (activePlaylistId === id) { setActivePlaylistId(null); setView("all"); }
  }, [serverPost, activePlaylistId]);

  const addToPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) { toast(t("music.alreadyInPlaylist")); return; }
    const updated = { ...pl, trackIds: [...pl.trackIds, trackId] };
    await serverPost("/music/playlists/save", updated);
    setPlaylists(p => p.map(x => x.id === playlistId ? updated : x));
    toast.success(t("music.addedToPlaylist"));
  }, [playlists, serverPost]);

  const removeFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const updated = { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) };
    await serverPost("/music/playlists/save", updated);
    setPlaylists(p => p.map(x => x.id === playlistId ? updated : x));
  }, [playlists, serverPost]);

  // Suno actions
  const callSunoAction = useCallback(async (action: string, body: Record<string, any>, label: string) => {
    if (actionLoading) return;
    setActionLoading(action);
    toast(`${label}...`, { duration: 5000 });
    try {
      const res = await fetch(`${API_BASE}/suno/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        if (data.wavUrl) { window.open(data.wavUrl, "_blank"); toast.success("WAV ready"); }
        else if (data.videoUrl) { window.open(data.videoUrl, "_blank"); toast.success("Music video ready"); }
        else if (data.stems) {
          const stemUrls = Object.entries(data.stems).filter(([, v]) => typeof v === "string" && (v as string).startsWith("http"));
          stemUrls.forEach(([, url]) => window.open(url as string, "_blank"));
          toast.success(`${stemUrls.length} stems separated`);
        } else if (data.track) {
          toast.success("Extended track ready!", { description: data.track.title });
          fetchData();
        } else if (data.lyrics) {
          const txt = typeof data.lyrics === "string" ? data.lyrics : data.lyrics.text || JSON.stringify(data.lyrics);
          setLyricsContent(txt);
          toast.success("Lyrics generated");
        } else {
          toast.success(`${label} complete`);
        }
      } else {
        toast.error(`${label} failed`, { description: data.error });
      }
    } catch (err: any) {
      toast.error(`${label} error`, { description: String(err) });
    }
    setActionLoading(null);
  }, [actionLoading, fetchData]);

  // Download track
  const downloadTrack = useCallback(async (track: MusicTrack, format: "mp3" | "wav") => {
    if (format === "wav" && track.sunoTaskId && track.sunoAudioId) {
      callSunoAction("wav", { taskId: track.sunoTaskId, audioId: track.sunoAudioId }, "WAV Export");
      return;
    }
    try {
      toast("Downloading...");
      const res = await fetch(track.audioUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${track.title.slice(0, 40)}.mp3`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded");
    } catch {
      window.open(track.audioUrl, "_blank");
    }
  }, [callSunoAction]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    let list = [...tracks];
    if (view === "favorites") {
      list = list.filter(t => favorites.includes(t.id) || favorites.includes(t.libraryId));
    } else if (view === "playlist" && activePlaylistId) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) list = list.filter(t => pl.trackIds.includes(t.id) || pl.trackIds.includes(t.libraryId));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q) || t.model.toLowerCase().includes(q));
    }
    switch (sortMode) {
      case "title": list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "duration": list.sort((a, b) => b.durationSec - a.durationSec); break;
      default: list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    return list;
  }, [tracks, view, favorites, activePlaylistId, playlists, search, sortMode]);

  // Close context menu
  useEffect(() => {
    if (!contextPos) return;
    const h = () => { setContextPos(null); setContextTrack(null); };
    setTimeout(() => document.addEventListener("click", h), 0);
    return () => document.removeEventListener("click", h);
  }, [contextPos]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const playingProgress = totalDuration ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", paddingBottom: currentTrack ? 100 : 0 }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 500, letterSpacing: "-0.05em", lineHeight: 0.95, color: "var(--foreground)" }}>
              {t("music.title")}
            </h1>
            <p className="mt-2" style={{ fontSize: "15px", color: "var(--text-tertiary)", fontWeight: 400 }}>
              {tracks.length} {tracks.length !== 1 ? t("music.tracks") : t("music.track")}
              {credits && (
                <span className="ml-3 px-2 py-0.5 rounded-md" style={{ background: "var(--secondary)", fontSize: "12px", border: "1px solid var(--border)" }}>
                  <CreditCard size={10} className="inline mr-1" style={{ color: "var(--accent)" }} />
                  {credits.creditsLeft ?? "?"} {t("music.credits")}
                </span>
              )}
            </p>
          </div>
          <Link
            to="/hub"
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "14px", fontWeight: 500 }}
          >
            <Plus size={14} />
            {t("music.generateNew")}
          </Link>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-[220px] flex-shrink-0 hidden md:block">
            {/* Navigation */}
            <div className="mb-6">
              <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                {t("music.libraryLabel")}
              </span>
              <div className="mt-2 space-y-0.5">
                <SidebarBtn icon={Music} label={t("music.allTracks")} count={tracks.length} active={view === "all"} onClick={() => { setView("all"); setActivePlaylistId(null); }} />
                <SidebarBtn icon={Heart} label={t("music.favorites")} count={tracks.filter(tk => favorites.includes(tk.id) || favorites.includes(tk.libraryId)).length} active={view === "favorites"} onClick={() => { setView("favorites"); setActivePlaylistId(null); }} />
              </div>
            </div>

            {/* Playlists */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                  {t("music.playlists")}
                </span>
                <button onClick={() => setShowNewPlaylist(true)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors">
                  <FolderPlus size={13} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>

              <AnimatePresence>
                {showNewPlaylist && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-1">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--secondary)" }}>
                      <input
                        value={newPlaylistName}
                        onChange={e => setNewPlaylistName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createPlaylist(); if (e.key === "Escape") { setShowNewPlaylist(false); setNewPlaylistName(""); } }}
                        placeholder={t("music.playlistNamePlaceholder")}
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none min-w-0"
                        style={{ fontSize: "12px", color: "var(--foreground)" }}
                      />
                      <button onClick={createPlaylist} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer" style={{ color: "var(--accent)" }}><Check size={11} /></button>
                      <button onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(""); }} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer" style={{ color: "var(--text-tertiary)" }}><X size={11} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-0.5">
                {playlists.map(pl => (
                  <div key={pl.id} className="group relative">
                    {editingPlaylistId === pl.id ? (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--secondary)" }}>
                        <input
                          value={editPlaylistName}
                          onChange={e => setEditPlaylistName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              const updated = { ...pl, name: editPlaylistName.trim() || pl.name };
                              serverPost("/music/playlists/save", updated);
                              setPlaylists(p => p.map(x => x.id === pl.id ? { ...x, name: updated.name } : x));
                              setEditingPlaylistId(null);
                            }
                            if (e.key === "Escape") setEditingPlaylistId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-transparent border-none outline-none min-w-0"
                          style={{ fontSize: "12px", color: "var(--foreground)" }}
                        />
                      </div>
                    ) : (
                      <SidebarBtn
                        icon={ListMusic}
                        label={pl.name}
                        count={pl.trackIds.length}
                        active={view === "playlist" && activePlaylistId === pl.id}
                        onClick={() => { setView("playlist"); setActivePlaylistId(pl.id); }}
                      />
                    )}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditingPlaylistId(pl.id); setEditPlaylistName(pl.name); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">
                        <Pencil size={9} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">
                        <Trash2 size={9} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                    </div>
                  </div>
                ))}
                {playlists.length === 0 && !showNewPlaylist && (
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", padding: "4px 10px" }}>{t("music.noPlaylistsYet")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search + Sort bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("music.searchPlaceholder")}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: "var(--card)", color: "var(--foreground)", fontSize: "13px", border: "1px solid var(--border)" }}
                />
              </div>
              <div className="flex items-center gap-1">
                {(["recent", "title", "duration"] as SortMode[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortMode(s)}
                    className="px-3 py-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      fontSize: "12px", fontWeight: sortMode === s ? 600 : 400,
                      background: sortMode === s ? "var(--secondary)" : "transparent",
                      color: sortMode === s ? "var(--foreground)" : "var(--text-secondary)",
                      border: sortMode === s ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                  >
                    {s === "recent" ? t("music.sortRecent") : s === "title" ? t("music.sortTitle") : t("music.sortDuration")}
                  </button>
                ))}
              </div>
            </div>

            {/* Track list */}
            {filteredTracks.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "linear-gradient(135deg, var(--accent) 0%, #444444 100%)", boxShadow: "0 8px 24px rgba(17,17,17,0.15)" }}>
                  <Music size={28} style={{ color: "#FFF" }} />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--foreground)", marginBottom: "8px" }}>
                  {view === "favorites" ? t("music.noFavorites") : view === "playlist" ? t("music.playlistEmpty") : t("music.noTracks")}
                </h2>
                <p style={{ fontSize: "15px", color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 24px" }}>
                  {t("music.noTracksDesc")}
                </p>
                <Link to="/hub" className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:scale-105"
                  style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "14px", fontWeight: 500 }}>
                  <Plus size={14} /> {t("music.openAiHub")}
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="flex items-center gap-3 px-3 py-2" style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                  <div className="w-8" />
                  <div className="w-10" />
                  <div className="flex-1">{t("music.titleCol")}</div>
                  <div className="w-[120px] hidden lg:block">{t("music.modelCol")}</div>
                  <div className="w-[60px] text-right"><Clock size={10} className="inline" /></div>
                  <div className="w-8" />
                  <div className="w-8" />
                </div>

                {filteredTracks.map((track, i) => {
                  const isActive = currentTrack?.id === track.id;
                  const isFav = favorites.includes(track.id) || favorites.includes(track.libraryId);
                  return (
                    <motion.div
                      key={track.id + track.libraryId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: isActive ? "rgba(17,17,17,0.08)" : "transparent",
                        border: isActive ? "1px solid rgba(17,17,17,0.15)" : "1px solid transparent",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = isActive ? "rgba(17,17,17,0.08)" : "rgba(255,255,255,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = isActive ? "rgba(17,17,17,0.08)" : "transparent")}
                      onDoubleClick={() => playTrack(track, filteredTracks)}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => playTrack(track, filteredTracks)}
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                        style={{ background: isActive && isPlaying ? "var(--accent)" : "rgba(255,255,255,0.05)" }}
                      >
                        {isActive && isPlaying ? <Pause size={12} style={{ color: "#fff" }} /> : <Play size={12} style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)", marginLeft: 1 }} />}
                      </button>

                      {/* Cover */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--secondary)" }}>
                        {track.imageUrl ? (
                          <img src={track.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music size={14} style={{ color: "var(--text-secondary)" }} /></div>
                        )}
                      </div>

                      {/* Title + prompt */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: "14px", fontWeight: 500, color: isActive ? "var(--accent)" : "var(--foreground)" }}>{track.title}</div>
                        <div className="truncate" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{track.prompt.slice(0, 60)}</div>
                      </div>

                      {/* Model */}
                      <div className="w-[120px] hidden lg:block truncate" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{track.model}</div>

                      {/* Duration */}
                      <div className="w-[60px] text-right" style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{track.duration}</div>

                      {/* Favorite */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(track.id || track.libraryId); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                        style={{ opacity: isFav ? 1 : undefined }}
                      >
                        <Heart size={14} fill={isFav ? "var(--accent)" : "none"} style={{ color: isFav ? "var(--accent)" : "var(--text-secondary)" }} />
                      </button>

                      {/* More */}
                      <button
                        onClick={e => { e.stopPropagation(); setContextTrack(track); setContextPos({ x: e.clientX, y: e.clientY }); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={14} style={{ color: "var(--text-secondary)" }} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextPos && contextTrack && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] rounded-xl overflow-hidden"
            style={{
              left: contextPos.x, top: contextPos.y,
              background: "var(--secondary)", border: "1px solid rgba(26,23,20,0.04)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.08)", minWidth: 200,
            }}
          >
            <CtxItem icon={Play} label={t("music.play")} onClick={() => playTrack(contextTrack, filteredTracks)} />
            <CtxItem icon={Heart} label={favorites.includes(contextTrack.id) ? t("music.removeFromFavorites") : t("music.addToFavorites")} onClick={() => toggleFavorite(contextTrack.id || contextTrack.libraryId)} />
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            {/* Add to playlist submenu */}
            {playlists.length > 0 && playlists.map(pl => (
              <CtxItem key={pl.id} icon={ListMusic} label={`${t("music.addToPlaylist")} "${pl.name}"`} onClick={() => addToPlaylist(pl.id, contextTrack.id || contextTrack.libraryId)} />
            ))}
            {view === "playlist" && activePlaylistId && (
              <CtxItem icon={X} label={t("music.removeFromPlaylist")} onClick={() => removeFromPlaylist(activePlaylistId, contextTrack.id || contextTrack.libraryId)} />
            )}
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            <CtxItem icon={Download} label={t("music.downloadMp3")} onClick={() => downloadTrack(contextTrack, "mp3")} />
            {contextTrack.sunoTaskId && contextTrack.sunoAudioId && (
              <>
                <CtxItem icon={FileAudio} label={t("music.exportWav")} loading={actionLoading === "wav"} onClick={() => callSunoAction("wav", { taskId: contextTrack.sunoTaskId, audioId: contextTrack.sunoAudioId }, "WAV Export")} />
                <CtxItem icon={Scissors} label={t("music.separateStems")} loading={actionLoading === "vocal-removal"} onClick={() => callSunoAction("vocal-removal", { taskId: contextTrack.sunoTaskId, audioId: contextTrack.sunoAudioId, type: "separate_vocal" }, "Vocal Separation")} />
                <CtxItem icon={Video} label={t("music.generateMusicVideo")} loading={actionLoading === "mp4"} onClick={() => callSunoAction("mp4", { taskId: contextTrack.sunoTaskId, audioId: contextTrack.sunoAudioId }, "Music Video")} />
                <CtxItem icon={ArrowUpFromLine} label={t("music.extendTrack")} onClick={() => { setExtendTrack(contextTrack); setExtendPrompt(""); setExtendAt(""); }} />
                <CtxItem icon={AlignLeft} label={t("music.getLyrics")} loading={actionLoading === "lyrics"} onClick={() => {
                  setLyricsTrack(contextTrack);
                  setLyricsLoading(true);
                  callSunoAction("lyrics", { prompt: contextTrack.prompt || contextTrack.title }, "Lyrics").then(() => setLyricsLoading(false));
                }} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extend Modal */}
      <AnimatePresence>
        {extendTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setExtendTrack(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-md"
              style={{ background: "var(--card)", border: "1px solid rgba(26,23,20,0.04)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
              onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>{t("music.extendTitle")}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "16px" }}>{t("music.extendDesc")}</p>
              <div className="space-y-3">
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("music.continueAt")}</label>
                  <input value={extendAt} onChange={e => setExtendAt(e.target.value)} placeholder={t("music.continueAtPlaceholder")} type="number"
                    className="w-full mt-1 px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: "13px", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("music.promptOptional")}</label>
                  <input value={extendPrompt} onChange={e => setExtendPrompt(e.target.value)} placeholder={t("music.promptPlaceholder")}
                    className="w-full mt-1 px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: "13px", border: "1px solid var(--border)" }} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setExtendTrack(null)} className="flex-1 py-2.5 rounded-lg cursor-pointer"
                    style={{ background: "var(--secondary)", color: "var(--text-tertiary)", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border)" }}>
                    {t("calendar.cancel")}
                  </button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => {
                      callSunoAction("extend", {
                        taskId: extendTrack.sunoTaskId, audioId: extendTrack.sunoAudioId,
                        prompt: extendPrompt || undefined,
                        continueAt: extendAt ? parseFloat(extendAt) : undefined,
                      }, "Extend");
                      setExtendTrack(null);
                    }}
                    className="flex-1 py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: 500 }}>
                    {actionLoading === "extend" ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpFromLine size={14} />}
                    {t("music.extend")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics Modal */}
      <AnimatePresence>
        {lyricsTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => { setLyricsTrack(null); setLyricsContent(""); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-auto"
              style={{ background: "var(--card)", border: "1px solid rgba(26,23,20,0.04)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)" }}>{t("music.lyrics")}</h3>
                <button onClick={() => { setLyricsTrack(null); setLyricsContent(""); }} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/5">
                  <X size={16} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px" }}>{lyricsTrack.title}</p>
              {lyricsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
                  <span className="ml-2" style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{t("music.generatingLyrics")}</span>
                </div>
              ) : lyricsContent ? (
                <pre style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  {lyricsContent}
                </pre>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t("music.noLyricsYet")}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && currentTrack && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 bottom-[80px] w-[320px] z-[90] overflow-auto"
            style={{ background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 24px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center justify-between p-4 sticky top-0" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{t("music.queue")} ({queue.length})</span>
              <button onClick={() => setShowQueue(false)} className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/5">
                <X size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>
            <div className="p-2">
              {queue.map((t, i) => {
                const isQActive = t.id === currentTrack.id;
                return (
                  <div key={t.id + i} onClick={() => playTrack(t)} className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/3"
                    style={{ background: isQActive ? "rgba(17,17,17,0.08)" : "transparent" }}>
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0" style={{ background: "var(--secondary)" }}>
                      {t.imageUrl ? <img src={t.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" /> : <div className="w-full h-full flex items-center justify-center"><Music size={10} style={{ color: "var(--text-secondary)" }} /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: "12px", fontWeight: 500, color: isQActive ? "var(--accent)" : "var(--foreground)" }}>{t.title}</div>
                      <div className="truncate" style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{t.duration}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] md:ml-[48px]"
          style={{ background: "var(--card)", borderTop: "1px solid rgba(26,23,20,0.04)", boxShadow: "0 -4px 24px rgba(0,0,0,0.05)" }}>
          {/* Progress bar */}
          <div ref={progressRef} className="h-1 w-full cursor-pointer group relative" style={{ background: "var(--border)" }}
            onClick={handleSeek}>
            <div className="h-full transition-all" style={{ width: `${playingProgress}%`, background: "var(--accent)" }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${playingProgress}%`, transform: `translate(-50%, -50%)`, background: "var(--accent)" }} />
          </div>

          <div className="flex items-center gap-4 px-4 py-3">
            {/* Track info */}
            <div className="flex items-center gap-3 w-[240px] flex-shrink-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--secondary)" }}>
                {currentTrack.imageUrl ? (
                  <img src={currentTrack.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music size={16} style={{ color: "var(--text-secondary)" }} /></div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{currentTrack.title}</div>
                <div className="truncate" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{currentTrack.model}</div>
              </div>
              <button onClick={() => toggleFavorite(currentTrack.id || currentTrack.libraryId)} className="cursor-pointer flex-shrink-0">
                <Heart size={16} fill={favorites.includes(currentTrack.id) || favorites.includes(currentTrack.libraryId) ? "var(--accent)" : "none"}
                  style={{ color: favorites.includes(currentTrack.id) || favorites.includes(currentTrack.libraryId) ? "var(--accent)" : "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Controls */}
            <div className="flex-1 flex items-center justify-center gap-4">
              <button onClick={() => setIsShuffle(!isShuffle)} className="cursor-pointer" style={{ color: isShuffle ? "var(--accent)" : "var(--text-secondary)" }}>
                <Shuffle size={16} />
              </button>
              <button onClick={handlePrev} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                <SkipBack size={18} />
              </button>
              <button
                onClick={() => { if (audioRef.current) { if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { audioRef.current.play(); setIsPlaying(true); } } }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "var(--foreground)" }}>
                {isPlaying ? <Pause size={18} style={{ color: "var(--background)" }} /> : <Play size={18} style={{ color: "var(--background)", marginLeft: 2 }} />}
              </button>
              <button onClick={handleNext} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                <SkipForward size={18} />
              </button>
              <button onClick={() => setIsRepeat(!isRepeat)} className="cursor-pointer" style={{ color: isRepeat ? "var(--accent)" : "var(--text-secondary)" }}>
                <Repeat size={16} />
              </button>
            </div>

            {/* Time + Volume + Queue */}
            <div className="flex items-center gap-3 w-[240px] flex-shrink-0 justify-end">
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
              <button onClick={() => setIsMuted(!isMuted)} className="cursor-pointer" style={{ color: isMuted ? "var(--accent)" : "var(--text-secondary)" }}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                className="w-20 accent-[var(--accent)]"
                style={{ height: 3 }}
              />
              <button onClick={() => setShowQueue(!showQueue)} className="cursor-pointer" style={{ color: showQueue ? "var(--accent)" : "var(--text-secondary)" }}>
                <ListMusic size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════ */

function SidebarBtn({ icon: Icon, label, count, active, onClick }: {
  icon: any; label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
      style={{
        background: active ? "rgba(17,17,17,0.08)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-tertiary)",
      }}
    >
      <Icon size={14} />
      <span className="flex-1 text-left truncate" style={{ fontSize: "13px", fontWeight: active ? 500 : 400 }}>{label}</span>
      <span style={{ fontSize: "10px", color: active ? "var(--accent)" : "var(--text-secondary)" }}>{count}</span>
    </button>
  );
}

function CtxItem({ icon: Icon, label, onClick, loading }: {
  icon: any; label: string; onClick: () => void; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors hover:bg-white/5"
      style={{ fontSize: "13px", color: "var(--foreground)" }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} /> : <Icon size={14} style={{ color: "var(--text-tertiary)" }} />}
      {label}
    </button>
  );
}
