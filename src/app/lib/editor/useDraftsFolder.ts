/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   useDraftsFolder — Resolve or create "Brouillons" folder
   Used by ComparePage to auto-save generated assets
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useEffect, useRef, useState, useCallback } from "react";

const DRAFTS_FOLDER_NAME = "Brouillons";

/**
 * Hook that resolves the "Brouillons" folder ID.
 * Creates it if it doesn't exist.
 * @param serverGet GET helper from auth context
 * @param serverPost POST helper from auth context
 */
export function useDraftsFolder(
  serverGet: (path: string) => Promise<any>,
  serverPost: (path: string, body: any, timeout?: number) => Promise<any>,
) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const resolving = useRef(false);

  const resolve = useCallback(async () => {
    if (resolving.current || folderId) return;
    resolving.current = true;

    try {
      // Try to list existing folders (POST endpoint on server)
      const res = await serverPost("/library/folders-list", {});
      if (res?.success && Array.isArray(res.folders)) {
        const drafts = res.folders.find(
          (f: { name: string }) => f.name === DRAFTS_FOLDER_NAME,
        );
        if (drafts) {
          setFolderId(drafts.id);
          resolving.current = false;
          return;
        }
      }

      // Create if not found
      const createRes = await serverPost("/library/folders-create", {
        name: DRAFTS_FOLDER_NAME,
      });
      if (createRes?.success && createRes.id) {
        setFolderId(createRes.id);
      }
    } catch (err) {
      console.warn("[useDraftsFolder] Failed to resolve Brouillons folder:", err);
    }

    resolving.current = false;
  }, [serverGet, serverPost, folderId]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  return folderId;
}
