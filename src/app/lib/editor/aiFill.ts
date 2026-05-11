/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI Edit — Feads-style on-demand image editing.

   Routes through /editor/background — the server-side combo that
   cuts out the subject with Photoroom (pixel-perfect, non-generative)
   and regenerates the background from the prompt with Ideogram v3.
   Synchronous response with the final public URL — no polling.

   Why this endpoint:
     • Photoroom alone can't do prompt-driven image2image — it's a
       compositing API (cutout, expand, uncrop, beautify).
     • /editor/background already handles the dual-provider pipeline
       and returns a stable Supabase URL. The UI just needs to wait.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { API_BASE, publicAnonKey } from "../supabase";

type AuthHeaderFn = () => string | null;

export async function editImage(args: {
  imageUrl: string;
  prompt: string;
  getAuthHeader: AuthHeaderFn;
}): Promise<string> {
  const token = args.getAuthHeader();
  const res = await fetch(`${API_BASE}/editor/background`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
    body: JSON.stringify({
      imageUrl: args.imageUrl,
      prompt: args.prompt,
      _token: token || "",
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!data?.success || !data?.imageUrl) {
    throw new Error(data?.error || `AI edit failed (${res.status})`);
  }
  return data.imageUrl as string;
}
