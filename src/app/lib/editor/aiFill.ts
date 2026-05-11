/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI Fill — inpaint + outpaint helpers for the Editor.
   Backend wires Pollo's imagePainting + imageUncrop tools; both
   are async (return queued generationId). We POST then poll
   /tools/status until completed/failed/timeout (90s).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { API_BASE, publicAnonKey } from "../supabase";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

type AuthHeaderFn = () => string | null;

async function postJson(path: string, body: Record<string, unknown>, getAuthHeader: AuthHeaderFn) {
  const token = getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
    body: JSON.stringify({ ...body, _token: token || "" }),
  });
  return res.json().catch(() => ({ success: false, error: "Bad JSON" }));
}

async function pollUntilDone(generationId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const url = `${API_BASE}/tools/status?id=${encodeURIComponent(generationId)}&apikey=${publicAnonKey}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    const data: any = await res.json().catch(() => ({}));
    if (data?.state === "completed" && data?.url) return data.url as string;
    if (data?.state === "failed") throw new Error(data?.error || "AI fill failed");
  }
  throw new Error("AI fill timed out (90s)");
}

export async function inpaintImage(args: {
  imageUrl: string;
  maskBase64: string;
  prompt: string;
  getAuthHeader: AuthHeaderFn;
}): Promise<string> {
  const submit = await postJson("/tools/image-inpaint", {
    imageUrl: args.imageUrl,
    maskBase64: args.maskBase64,
    prompt: args.prompt,
  }, args.getAuthHeader);
  if (!submit?.success || !submit?.generationId) {
    throw new Error(submit?.error || "Couldn't start AI fill");
  }
  return pollUntilDone(submit.generationId);
}

export type ExpandPercents = { top: number; bottom: number; left: number; right: number };

export async function expandImage(args: {
  imageUrl: string;
  extend: ExpandPercents;
  getAuthHeader: AuthHeaderFn;
}): Promise<string> {
  const submit = await postJson("/tools/image-uncrop", {
    imageUrl: args.imageUrl,
    extend: args.extend,
  }, args.getAuthHeader);
  if (!submit?.success || !submit?.generationId) {
    throw new Error(submit?.error || "Couldn't start expand");
  }
  return pollUntilDone(submit.generationId);
}
