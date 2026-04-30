#!/usr/bin/env node
// Quality gate for the picked-style directive.
//
// Catches the specific class of regression that PR W fixed: the directive
// was diluted inside brandSummary and never reflected into promptText, so
// clicking "Editorial" produced packs that ignored the style. This script
// asserts the prompt scaffolding stays intact — the directive must appear
// as a top-level rule AND in the CONTEXT block AND in the promptText spec.
//
// Run from repo root:  node scripts/quality-gates/style-prompt-check.mjs
// CI: invoked from .github/workflows/quality-gates.yml on every PR that
// touches supabase/functions/server/index.tsx.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SERVER_PATH = resolve(process.cwd(), "supabase/functions/server/index.tsx");
const src = readFileSync(SERVER_PATH, "utf8");

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

// ── 1. STYLE_CATALOG and STYLE_DIRECTIVES exist with 6 styles ──
const expectedStyles = ["editorial", "studio", "lifestyle", "magazine", "ugc", "minimal"];
for (const id of expectedStyles) {
  assert(
    new RegExp(`id:\\s*"${id}"`).test(src),
    `STYLE_CATALOG missing style "${id}" — picker would be incomplete`,
  );
}
assert(
  /const STYLE_DIRECTIVES: Record<string, string> = Object\.fromEntries\(/.test(src),
  `STYLE_DIRECTIVES derivation missing — directives won't be lookupable by id`,
);

// ── 2. /analyze/surprise-me reads styleId from body ──
assert(
  /const styleId = String\(body\?\.styleId \|\| ""\)\.trim\(\);/.test(src),
  `/analyze/surprise-me no longer reads body.styleId — picked style won't reach planner`,
);
assert(
  /const styleDirective = styleId && STYLE_DIRECTIVES\[styleId\]/.test(src),
  `styleDirective lookup missing — directive resolution broken`,
);

// ── 3. The directive is NOT joined into brandSummary ──
// PR W explicitly removed this. If it comes back, the directive is diluted again.
assert(
  !/parts\.push\(`PICKED STYLE \(HARD\): \$\{styleDirective\}`\)/.test(src),
  `Regression: directive is being pushed into brandSummary parts again — that was the original bug`,
);

// ── 4. Top-level HARD RULE present in conceptSystem ──
assert(
  /PICKED STYLE LOCK \(NON-NEGOTIABLE\)/.test(src),
  `HARD RULE "PICKED STYLE LOCK (NON-NEGOTIABLE)" missing from conceptSystem — planner won't treat the style as binding`,
);
assert(
  /EVERY shot's promptText MUST open with that style's signature descriptors/.test(src),
  `Rule no longer instructs the LLM to OPEN promptText with style descriptors — image-gen model won't see the style`,
);

// ── 5. CONTEXT block surfaces the directive on its own line ──
assert(
  /PICKED STYLE \(HARD — see PICKED STYLE LOCK rule above\): \$\{styleDirective\}/.test(src),
  `CONTEXT line "PICKED STYLE (HARD: …)" missing — directive is buried again`,
);

// ── 6. promptText spec mentions the picked style descriptors ──
assert(
  /MUST open with the PICKED STYLE descriptors/.test(src),
  `promptText spec no longer requires opening with PICKED STYLE descriptors — fix W is undone`,
);

// ── 6b. HARD NO-TEXT rule for type="product" shots (hallucination ban) ──
// Niveau 1 fix that stops image-gen models from rendering mangled text
// (e.g. "BiNiRcE", "TEMPÉrAMNT") inside product shots. Mirror of fix AA —
// if any of these checks fail, the original class of bug returns.
assert(
  /HARD NO-TEXT RULE for type="product" shots — NON-NEGOTIABLE/.test(src),
  `HARD NO-TEXT RULE missing — image-gen models will hallucinate text on product shots again`,
);
assert(
  /promptText for type="product" shots MUST NOT request any rendered text strings/.test(src),
  `Product shot text-ban prose missing — LLM will leak text vocabulary into product prompts`,
);
assert(
  /text strings strictly capped at 1-3 ASCII words/.test(src),
  `text-card length cap missing — long French strings will hallucinate`,
);
assert(
  /NO accents, NO French diacritics/.test(src),
  `text-card diacritics ban missing — accented text will be mangled by Ideogram`,
);
assert(
  /For type='product' shots: NO text-based twists/.test(src),
  `twistElement spec no longer bans text-based twists for product shots — they'll leak text into prompts`,
);
assert(
  /do NOT request a rendered .* wordmark in type="product" shots/.test(src),
  `Brand mark rule no longer bans wordmarks in product shots — hallucinated brand text returns`,
);

// ── 7. styleId-only requests are accepted (no vault, no brief) ──
assert(
  /if \(!brandSummary && !brief && !styleDirective\)/.test(src),
  `Gate rejects styleId-only requests again — users without vault who pick a style are blocked`,
);

// ── 8. Each STYLE_DIRECTIVES value contains discriminating vocabulary ──
// We can't run the LLM, but we can check that the directives are written
// in a way that's specific enough to be reflected in promptText.
const styleSignatures = {
  editorial: /cinematic depth|dramatic side-lighting|marble|magazine-cover gravitas/i,
  studio:    /clean white.*seamless|hero-product|e-commerce/i,
  lifestyle: /golden-hour|candid|natural environments/i,
  magazine:  /saturated brand-colour|oversized condensed display|graphic split-layouts/i,
  ugc:       /phone-camera|raw daylight|hand-held|authentic real-person/i,
  minimal:   /negative space|geometric compositions|monochrome or duo-tone/i,
};
for (const [id, signature] of Object.entries(styleSignatures)) {
  // Find the block for this style and check its directive
  const blockMatch = src.match(new RegExp(`id:\\s*"${id}"[\\s\\S]*?directive:\\s*"([^"]+)"`));
  assert(blockMatch, `Could not locate directive for style "${id}"`);
  if (blockMatch) {
    assert(
      signature.test(blockMatch[1]),
      `Directive for "${id}" lost its signature vocabulary — won't be discriminable in generations. Got: ${blockMatch[1].slice(0, 120)}…`,
    );
  }
}

// ── Result ──
if (failures.length > 0) {
  console.error("\n❌ style-prompt-check FAILED — picked-style directive regression\n");
  for (const f of failures) console.error(`  • ${f}`);
  console.error(`\n${failures.length} check${failures.length === 1 ? "" : "s"} failed. See PR W for context.\n`);
  process.exit(1);
}

console.log(`✓ style-prompt-check passed — ${expectedStyles.length} styles, ${Object.keys(styleSignatures).length} directive signatures, all rule scaffolding intact`);
