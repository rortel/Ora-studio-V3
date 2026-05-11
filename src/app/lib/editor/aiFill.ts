/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI Edit — Feads-style on-demand image editing.
   The user describes the edit in plain language; we hand the
   current photo URL + prompt to Pollo's image2image pipeline
   and poll until done. No brush, no mask — the model decides
   what to change.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { API_BASE, publicAnonKey } from "../supabase";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

type AuthHeaderFn = () => string | null;

async function pollUntilDone(generationId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const url = `${API_BASE}/tools/status?id=${encodeURIComponent(generationId)}&apikey=${publicAnonKey}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    const data: any = await res.json().catch(() => ({}));
    if (data?.state === "completed" && data?.url) return data.url as string;
    if (data?.state === "failed") throw new Error(data?.error || "AI edit failed");
  }
  throw new Error("AI edit timed out (90s)");
}

export async function editImage(args: {
  imageUrl: string;
  prompt: string;
  getAuthHeader: AuthHeaderFn;
}): Promise<string> {
  const token = args.getAuthHeader();
  const res = await fetch(`${API_BASE}/generate/pollo-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
    body: JSON.stringify({
      imageUrl: args.imageUrl,
      prompt: args.prompt,
      model: "nano-banana",
      _token: token || "",
    }),
  });
  const submit: any = await res.json().catch(() => ({}));
  if (!submit?.success || !submit?.generationId) {
    throw new Error(submit?.error || "Couldn't start AI edit");
  }
  return pollUntilDone(submit.generationId);
}
