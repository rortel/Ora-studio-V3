import { useCallback, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useVideoProject } from "../lib/video-editor/useVideoProject";
import { useLibraryAssets } from "../lib/video-editor/useLibraryAssets";
import { VideoPreview } from "../components/video-editor/VideoPreview";
import { Timeline } from "../components/video-editor/Timeline";
import { AssetBrowser } from "../components/video-editor/AssetBrowser";
import { PropertiesPanel } from "../components/video-editor/PropertiesPanel";
import { VideoEditorToolbar } from "../components/video-editor/VideoEditorToolbar";
import { ExportDialog } from "../components/video-editor/ExportDialog";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey } from "../lib/supabase";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Editor Page — Full layout
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function VideoEditorPage() {
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const actions = useVideoProject("New Video");
  const { assets: libraryAssets, loading: libraryLoading, refresh: refreshLibrary } = useLibraryAssets(actions.project.fps);
  const [exportOpen, setExportOpen] = useState(false);

  const handleUpload = useCallback(async (file: File): Promise<{ url: string; type: string }> => {
    try {
      const token = getAuthHeader();
      const formData = new FormData();
      formData.append("file0", file);
      if (token) formData.append("_token", token);

      const res = await fetch(`${API_BASE}/campaign/upload-refs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.refs?.[0]?.signedUrl) {
        refreshLibrary();
        return { url: data.refs[0].signedUrl, type: file.type };
      }
    } catch {
      // Fallback to local object URL
    }
    const url = URL.createObjectURL(file);
    return { url, type: file.type };
  }, [getAuthHeader, refreshLibrary]);

  const handleClose = useCallback(() => {
    navigate("/hub");
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <VideoEditorToolbar
        actions={actions}
        onExport={() => setExportOpen(true)}
        onClose={handleClose}
      />

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={18} minSize={12} maxSize={30}>
          <AssetBrowser
            actions={actions}
            libraryAssets={libraryAssets}
            libraryLoading={libraryLoading}
            onUpload={handleUpload}
            onRefresh={refreshLibrary}
          />
        </Panel>

        <PanelResizeHandle className="w-px bg-border hover:bg-border-strong transition-colors" />

        <Panel defaultSize={62} minSize={40}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <VideoPreview
                project={actions.project}
                playheadFrame={actions.playheadFrame}
                onFrameChange={actions.setPlayheadFrame}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-px bg-border hover:bg-border-strong transition-colors" />

        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <PropertiesPanel actions={actions} />
        </Panel>
      </PanelGroup>

      <div style={{ height: "35vh", minHeight: 200 }}>
        <Timeline actions={actions} />
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        project={actions.project}
      />
    </div>
  );
}
