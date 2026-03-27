#!/usr/bin/env node
/**
 * ORA STUDIO — E2E Smoke Tests
 *
 * Tests all critical API flows against the live Supabase Edge Functions.
 * Zero dependencies — uses native Node.js fetch.
 *
 * Usage:
 *   node tests/e2e-smoke.mjs                    # All tests
 *   SKIP_SLOW=1 node tests/e2e-smoke.mjs        # Skip image/video/audio gen
 *   VERBOSE=1 node tests/e2e-smoke.mjs           # Show full responses
 *   TEST_EMAIL=x@y.com TEST_PASS=... node tests/e2e-smoke.mjs  # Custom creds
 */

// ── Config ──
const PROJECT_ID = "kbvkjafkztbsewtaijuh";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTk2ODksImV4cCI6MjA4NzQ5NTY4OX0.ty1aiV63wnINUkViZNzlNAHFzL0mdvSRjzRDd-lB-sk";
const API_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-cad57f79`;
const SUPABASE_AUTH = `https://${PROJECT_ID}.supabase.co/auth/v1`;

const SKIP_SLOW = !!process.env.SKIP_SLOW;
const VERBOSE = !!process.env.VERBOSE;
const DEFAULT_TIMEOUT = parseInt(process.env.TIMEOUT || "15000", 10);

// ── State ──
let userToken = "";
const results = { passed: 0, failed: 0, warned: 0, skipped: 0 };
const failures = [];
const warnings = [];

// ── Helpers ──
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m",
};

function log(msg) { process.stdout.write(msg + "\n"); }

async function apiGet(path, timeout = DEFAULT_TIMEOUT) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API_BASE}${path}${userToken ? `${sep}_token=${encodeURIComponent(userToken)}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    signal: AbortSignal.timeout(timeout),
  });
  return res.json();
}

async function apiPost(path, body = {}, timeout = DEFAULT_TIMEOUT) {
  const payload = userToken ? { _token: userToken, ...body } : body;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeout),
  });
  return res.json();
}

async function apiDelete(path, timeout = DEFAULT_TIMEOUT) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "text/plain" },
    body: JSON.stringify({ _token: userToken }),
    signal: AbortSignal.timeout(timeout),
  });
  return res.json();
}

async function poll(path, check, intervalMs = 3000, maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const data = await apiGet(path);
    if (check(data)) return data;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Poll timeout after ${maxMs}ms`);
}

async function runTest(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    const slow = ms > 10000;
    if (slow) {
      log(`  ${C.yellow}⚠️  ${name} ${C.dim}${"·".repeat(Math.max(1, 40 - name.length))} ${ms}ms (slow)${C.reset}`);
      results.warned++;
      warnings.push(`${name}: ${ms}ms (slow but passed)`);
    } else {
      log(`  ${C.green}✅ ${name} ${C.dim}${"·".repeat(Math.max(1, 40 - name.length))} ${ms}ms${C.reset}`);
      results.passed++;
    }
    if (VERBOSE && result) log(`     ${C.gray}${JSON.stringify(result).slice(0, 200)}${C.reset}`);
    return result;
  } catch (err) {
    const ms = Date.now() - start;
    log(`  ${C.red}❌ ${name} ${C.dim}${"·".repeat(Math.max(1, 40 - name.length))} ${ms}ms${C.reset}`);
    log(`     ${C.red}${err.message?.slice(0, 120)}${C.reset}`);
    results.failed++;
    failures.push(`${name}: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

function skip(name, reason) {
  log(`  ${C.gray}⏭️  ${name} ${C.dim}${"·".repeat(Math.max(1, 40 - name.length))} SKIPPED (${reason})${C.reset}`);
  results.skipped++;
}

function section(num, total, title) {
  log(`\n${C.cyan}${C.bold}[${num}/${total}] ${title}${C.reset}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
  log(`\n${C.bold}╔══════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}║   ORA STUDIO — E2E SMOKE TESTS      ║${C.reset}`);
  log(`${C.bold}╚══════════════════════════════════════╝${C.reset}`);
  log(`${C.dim}API: ${API_BASE}${C.reset}`);
  log(`${C.dim}Skip slow: ${SKIP_SLOW}, Verbose: ${VERBOSE}${C.reset}`);

  const TOTAL = 11;

  // ═══ 0. AUTH — Get user token ═══
  section(0, TOTAL, "AUTHENTICATION");

  const email = process.env.TEST_EMAIL;
  const pass = process.env.TEST_PASS;

  if (email && pass) {
    await runTest("Supabase Auth Login", async () => {
      const res = await fetch(`${SUPABASE_AUTH}/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      assert(data.access_token, `Login failed: ${data.error_description || data.msg || "no token"}`);
      userToken = data.access_token;
      log(`     ${C.gray}Token: ${userToken.slice(0, 20)}...${C.reset}`);
      return data;
    });
  } else {
    log(`  ${C.yellow}⚠️  No TEST_EMAIL/TEST_PASS set — auth-required tests will be skipped${C.reset}`);
    log(`  ${C.dim}   Set: TEST_EMAIL=you@email.com TEST_PASS=yourpass node tests/e2e-smoke.mjs${C.reset}`);
  }

  // ═══ 1. HEALTH & AUTH ═══
  section(1, TOTAL, "HEALTH & AUTH");

  await runTest("GET /health", async () => {
    // Health endpoint may need POST or direct fetch without token
    const res = await fetch(`${API_BASE}/health`, {
      headers: { Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 80), status: res.status }; }
    assert(res.status === 200 || data.ok, `Health check failed (HTTP ${res.status}): ${text.slice(0, 80)}`);
    return data;
  });

  if (userToken) {
    await runTest("POST /user/init (via POST)", async () => {
      const data = await apiPost("/user/init");
      assert(data.vault || data.user || data.credits !== undefined || data.success !== false, `No vault/user data: ${JSON.stringify(data).slice(0, 100)}`);
      return data;
    });

    await runTest("POST /auth/me", async () => {
      const data = await apiPost("/auth/me");
      assert(data.authenticated || data.profile || data.email, `Not authenticated: ${JSON.stringify(data).slice(0, 100)}`);
      return data;
    });
  } else {
    skip("GET /user/init", "no auth token");
    skip("POST /auth/me", "no auth token");
  }

  // ═══ 2. VAULT CRUD ═══
  section(2, TOTAL, "VAULT CRUD");

  if (userToken) {
    await runTest("POST /vault/load", async () => {
      const data = await apiPost("/vault/load");
      assert(data.success || data.vault, `Vault load failed: ${JSON.stringify(data).slice(0, 100)}`);
      return data;
    });

    await runTest("POST /vault/scan-url (example.com)", async () => {
      const data = await apiPost("/vault/scan-url", { url: "https://example.com" }, 30000);
      assert(data.success !== false, `Scan failed: ${JSON.stringify(data).slice(0, 100)}`);
      return data;
    });
  } else {
    skip("POST /vault/load", "no auth token");
    skip("POST /vault/scan-url", "no auth token");
  }

  // ═══ 3. IMAGE BANK & BRAND ASSETS ═══
  section(3, TOTAL, "IMAGE BANK & BRAND ASSETS");

  if (userToken) {
    await runTest("POST /vault/images/list", async () => {
      const data = await apiPost("/vault/images/list");
      assert(data.success || Array.isArray(data.images), `Images list failed: ${JSON.stringify(data).slice(0, 100)}`);
      return { count: data.images?.length || 0 };
    });

    await runTest("POST /brand-assets (list via POST)", async () => {
      // brand-assets GET may return HTML; use POST-style with _token in query
      const res = await fetch(`${API_BASE}/brand-assets?_token=${encodeURIComponent(userToken)}`, {
        headers: { Authorization: `Bearer ${ANON_KEY}` },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { assert(false, `Not JSON (HTTP ${res.status}): ${text.slice(0, 80)}`); }
      assert(data.success || Array.isArray(data.assets), `Assets list failed: ${JSON.stringify(data).slice(0, 100)}`);
      return { count: data.assets?.length || 0 };
    });
  } else {
    skip("POST /vault/images/list", "no auth token");
    skip("GET /brand-assets", "no auth token");
  }

  // ═══ 4. TEXT GENERATION ═══
  section(4, TOTAL, "TEXT GENERATION (CAMPAIGN)");

  if (userToken) {
    await runTest("POST /campaign/generate-texts", async () => {
      const data = await apiPost("/campaign/generate-texts", {
        brief: "E2E test — promote a coffee brand for millennials",
        formats: "linkedin-post",
        targetAudience: "millennials",
        language: "en",
      }, 30000);
      assert(data.success && data.copyMap, `Text gen failed: ${JSON.stringify(data).slice(0, 150)}`);
      const fmtKeys = Object.keys(data.copyMap);
      assert(fmtKeys.length > 0, "No formats in copyMap");
      return { formats: fmtKeys, provider: data.provider, latencyMs: data.latencyMs };
    });
  } else {
    skip("POST /campaign/generate-texts", "no auth token");
  }

  // ═══ 5. IMAGE GENERATION ═══
  section(5, TOTAL, "IMAGE GENERATION");

  if (SKIP_SLOW) {
    skip("Image generation (start + poll)", "SKIP_SLOW=1");
  } else if (userToken) {
    await runTest("GET /generate/image-start → poll → imageUrl", async () => {
      const startData = await apiGet("/generate/image-start?prompt=A+beautiful+sunset+over+mountains&model=photon-1&aspectRatio=1:1", 20000);
      assert(startData.success || startData.generationId || startData.imageUrl, `Start failed: ${JSON.stringify(startData).slice(0, 100)}`);

      if (startData.imageUrl) return { imageUrl: startData.imageUrl.slice(0, 60) + "..." };

      const genId = startData.generationId;
      assert(genId, "No generationId returned");

      const pollData = await poll(
        `/generate/image-status?id=${genId}`,
        d => d.state === "completed" || d.imageUrl,
        3000, 90000
      );
      assert(pollData.imageUrl, `No imageUrl after poll: ${JSON.stringify(pollData).slice(0, 100)}`);
      return { imageUrl: pollData.imageUrl.slice(0, 60) + "..." };
    });
  } else {
    skip("Image generation", "no auth token");
  }

  // ═══ 6. VIDEO GENERATION ═══
  section(6, TOTAL, "VIDEO GENERATION");

  if (SKIP_SLOW) {
    skip("Video generation (start + poll)", "SKIP_SLOW=1");
  } else if (userToken) {
    await runTest("GET /generate/video-start → poll → videoUrl", async () => {
      const startData = await apiGet("/generate/video-start?prompt=Smooth+camera+pan+across+a+sunset&model=ora-motion", 20000);
      assert(startData.success || startData.generationId, `Start failed: ${JSON.stringify(startData).slice(0, 100)}`);

      const genId = startData.generationId;
      assert(genId, "No generationId returned");

      const pollData = await poll(
        `/generate/video-status?id=${genId}`,
        d => d.state === "completed" || d.videoUrl,
        5000, 180000
      );
      assert(pollData.videoUrl, `No videoUrl after poll: ${JSON.stringify(pollData).slice(0, 100)}`);
      return { videoUrl: pollData.videoUrl.slice(0, 60) + "..." };
    });
  } else {
    skip("Video generation", "no auth token");
  }

  // ═══ 7. AUDIO/MUSIC GENERATION ═══
  section(7, TOTAL, "AUDIO / MUSIC GENERATION");

  if (SKIP_SLOW) {
    skip("Audio generation (start + poll)", "SKIP_SLOW=1");
  } else if (userToken) {
    await runTest("POST /generate/audio-start → poll → audioUrl", async () => {
      const startData = await apiPost("/generate/audio-start", {
        prompt: "Upbeat corporate background music",
        models: ["chirp-v4"],
        instrumental: true,
      }, 20000);
      assert(startData.success && startData.results?.[0], `Start failed: ${JSON.stringify(startData).slice(0, 100)}`);

      const taskId = startData.results[0].taskId;
      assert(taskId, "No taskId returned");

      const pollData = await poll(
        `/generate/audio-poll?taskId=${taskId}`,
        d => d.status === "completed" || d.audioUrl || d.success === false,
        5000, 120000
      );
      assert(pollData.audioUrl || pollData.status === "completed", `No audioUrl: ${JSON.stringify(pollData).slice(0, 100)}`);
      return { audioUrl: (pollData.audioUrl || "").slice(0, 60) + "..." };
    });
  } else {
    skip("Audio generation", "no auth token");
  }

  // ═══ 8. LIBRARY CRUD ═══
  section(8, TOTAL, "LIBRARY CRUD");

  if (userToken) {
    let testItemId = null;

    await runTest("POST /library/items (create)", async () => {
      const data = await apiPost("/library/items", {
        item: {
          name: "__e2e_test_item__",
          type: "image",
          imageUrl: "https://example.com/test.png",
          platform: "test",
          copy: "E2E test item — will be deleted",
        },
      });
      assert(data.success || data.itemId || data.id, `Create failed: ${JSON.stringify(data).slice(0, 100)}`);
      testItemId = data.itemId || data.id;
      return { itemId: testItemId };
    });

    await runTest("POST /library/items (list)", async () => {
      const data = await apiPost("/library/items-list", {});
      // Fallback: try the GET-style endpoint via POST
      if (!data.success && !data.items) {
        const data2 = await apiPost("/library/items", { action: "list" });
        assert(data2.success || Array.isArray(data2.items), `List failed: ${JSON.stringify(data2).slice(0, 100)}`);
        return { count: data2.items?.length || 0 };
      }
      return { count: data.items?.length || 0 };
    });

    if (testItemId) {
      await runTest("DELETE /library/items/:id (cleanup)", async () => {
        const data = await apiDelete(`/library/items/${testItemId}`);
        assert(data.success !== false, `Delete failed: ${JSON.stringify(data).slice(0, 100)}`);
        return data;
      });
    }
  } else {
    skip("Library CRUD", "no auth token");
  }

  // ═══ 9. PRODUCTS CRUD ═══
  section(9, TOTAL, "PRODUCTS CRUD");

  if (userToken) {
    await runTest("POST /products (list)", async () => {
      const data = await apiPost("/products", { action: "list" });
      assert(data.success !== undefined || data.products !== undefined, `Products failed: ${JSON.stringify(data).slice(0, 100)}`);
      return { count: data.products?.length || 0 };
    });
  } else {
    skip("Products CRUD", "no auth token");
  }

  // ═══ 10. CALENDAR ═══
  section(10, TOTAL, "CALENDAR");

  if (userToken) {
    await runTest("POST /calendar (list)", async () => {
      const data = await apiPost("/calendar", { action: "list" });
      // Calendar might return empty, posts, or any non-error response
      assert(data.error !== "Not found", `Calendar failed: ${JSON.stringify(data).slice(0, 100)}`);
      return { posts: data.posts?.length || 0, raw: JSON.stringify(data).slice(0, 60) };
    });
  } else {
    skip("Calendar", "no auth token");
  }

  // ═══ 11. TEMPLATE SYSTEM (static check) ═══
  section(11, TOTAL, "TEMPLATE SYSTEM (static)");

  await runTest("Templates: 8 formats have templates", async () => {
    // Import the template registry — we'll dynamically import since it's TS
    // Instead, we verify the template index.ts file structure
    const { readFileSync } = await import("fs");
    const indexContent = readFileSync(new URL("../src/app/components/templates/index.ts", import.meta.url), "utf8");

    const formats = ["linkedin-post", "instagram-post", "instagram-story", "facebook-post", "youtube-thumbnail", "pinterest-pin", "x-post", "facebook-ad"];
    const missing = [];
    for (const fmt of formats) {
      if (!indexContent.includes(`formatId: "${fmt}"`)) missing.push(fmt);
    }
    assert(missing.length === 0, `Missing formats: ${missing.join(", ")}`);
    return { formatsFound: formats.length - missing.length };
  });

  await runTest("Templates: each has required fields", async () => {
    const { readFileSync } = await import("fs");
    const indexContent = readFileSync(new URL("../src/app/components/templates/index.ts", import.meta.url), "utf8");

    const idMatches = indexContent.match(/id: "[a-z]+-[a-z]+"/g) || [];
    assert(idMatches.length >= 30, `Expected ≥30 templates, found ${idMatches.length}`);

    // Check required fields exist in the file
    for (const field of ["canvasWidth", "canvasHeight", "layers", "category", "aspectRatio"]) {
      assert(indexContent.includes(field), `Missing field: ${field}`);
    }
    return { templateCount: idMatches.length };
  });

  await runTest("Template engines exist", async () => {
    const { existsSync } = await import("fs");
    const base = new URL("../src/app/components/", import.meta.url);
    const files = ["TemplateEngine.tsx", "SVGTemplateEngine.tsx", "HTMLTemplateEngine.tsx", "TemplateEditor.tsx", "TemplateGallery.tsx"];
    const missing = files.filter(f => !existsSync(new URL(f, base)));
    assert(missing.length === 0, `Missing: ${missing.join(", ")}`);
    return { engines: files.length };
  });

  // ═══ REPORT ═══
  log(`\n${C.bold}═══════════════════════════════════════${C.reset}`);
  const total = results.passed + results.failed + results.warned + results.skipped;
  const statusColor = results.failed > 0 ? C.red : C.green;
  log(`${statusColor}${C.bold}RESULTS: ${results.passed} passed, ${results.warned} warnings, ${results.failed} failures, ${results.skipped} skipped (${total} total)${C.reset}`);

  if (failures.length > 0) {
    log(`\n${C.red}${C.bold}FAILURES:${C.reset}`);
    failures.forEach(f => log(`  ${C.red}❌ ${f}${C.reset}`));
  }
  if (warnings.length > 0) {
    log(`\n${C.yellow}WARNINGS:${C.reset}`);
    warnings.forEach(w => log(`  ${C.yellow}⚠️  ${w}${C.reset}`));
  }
  log(`${C.bold}═══════════════════════════════════════${C.reset}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  log(`\n${C.red}${C.bold}FATAL ERROR: ${err.message}${C.reset}`);
  log(err.stack);
  process.exit(2);
});
