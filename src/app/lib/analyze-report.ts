// Generate a printable HTML report from an analysis and open it in a new tab.

interface AxisScore {
  score: number;
  issues: string[];
  positives: string[];
}

interface TaggedReco {
  kpi: "legal" | "brand" | "creative";
  text: string;
  impact: "high" | "medium" | "low";
}

export interface AnalysisReportData {
  id: string;
  imageUrl: string;
  prompt?: string;
  briefContext?: string;
  objective?: string;
  overall: number;
  legal: AxisScore;
  brandFit: AxisScore;
  creative: AxisScore;
  recommendations: TaggedReco[];
  optimizedPrompt?: string;
  publishVerdict: "safe" | "revise" | "block";
  summary: string;
  date: string;
}

function gradeColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function gradeLabel(score: number, isFr: boolean): string {
  if (score >= 80) return isFr ? "Excellent" : "Excellent";
  if (score >= 60) return isFr ? "Bon" : "Good";
  if (score >= 40) return isFr ? "Médiocre" : "Mediocre";
  return isFr ? "Insuffisant" : "Poor";
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kpiBlock(label: string, axis: AxisScore, weight: string): string {
  const color = gradeColor(axis.score);
  const positives = axis.positives.map(p => `<li>${escapeHtml(p)}</li>`).join("");
  const issues = axis.issues.map(i => `<li>${escapeHtml(i)}</li>`).join("");
  return `
    <div class="kpi">
      <div class="kpi-header">
        <span class="kpi-label">${escapeHtml(label)} <span class="kpi-weight">${weight}</span></span>
        <span class="kpi-score" style="color:${color}">${axis.score}<span class="kpi-max">/100</span></span>
      </div>
      <div class="kpi-bar"><div class="kpi-fill" style="width:${axis.score}%;background:${color}"></div></div>
      ${positives ? `<div class="kpi-section"><div class="kpi-section-title positive">✓ Forces</div><ul>${positives}</ul></div>` : ""}
      ${issues ? `<div class="kpi-section"><div class="kpi-section-title issue">⚠ À améliorer</div><ul>${issues}</ul></div>` : ""}
    </div>
  `;
}

export function downloadReport(data: AnalysisReportData, isFr: boolean): void {
  const overallColor = gradeColor(data.overall);
  const overallLabel = gradeLabel(data.overall, isFr);

  const html = `<!DOCTYPE html>
<html lang="${isFr ? "fr" : "en"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isFr ? "Rapport d'analyse" : "Analysis report"} — ${escapeHtml(data.id || "")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; padding: 32px; max-width: 900px; margin: 0 auto; background: #fff; }
  h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  h2 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  .hero { display: flex; gap: 24px; align-items: flex-start; padding: 20px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; margin-bottom: 24px; }
  .hero img { max-width: 240px; max-height: 240px; border-radius: 8px; object-fit: contain; border: 1px solid #e5e5e5; }
  .hero-meta { flex: 1; }
  .overall { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .overall-score { font-size: 48px; font-weight: 900; line-height: 1; color: ${overallColor}; }
  .overall-label { font-size: 14px; color: #666; }
  .overall-grade { font-size: 16px; font-weight: 700; color: ${overallColor}; }
  .summary { font-size: 14px; color: #333; margin-top: 8px; }
  .context { margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px; }
  .context-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .context-body { font-size: 13px; color: #333; white-space: pre-wrap; }
  .kpi { margin-bottom: 16px; padding: 14px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 10px; }
  .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .kpi-label { font-weight: 700; font-size: 14px; }
  .kpi-weight { font-weight: 400; color: #999; font-size: 11px; }
  .kpi-score { font-weight: 900; font-size: 20px; }
  .kpi-max { font-size: 12px; font-weight: 400; color: #999; }
  .kpi-bar { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
  .kpi-fill { height: 100%; border-radius: 3px; }
  .kpi-section { margin-top: 8px; }
  .kpi-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .kpi-section-title.positive { color: #22c55e; }
  .kpi-section-title.issue { color: #f59e0b; }
  .kpi-section ul { list-style: none; padding-left: 16px; }
  .kpi-section li { font-size: 13px; color: #333; margin-bottom: 3px; position: relative; }
  .kpi-section li::before { content: "·"; position: absolute; left: -12px; color: #999; }
  .recos { padding: 16px; background: #fff8eb; border-left: 3px solid #f59e0b; border-radius: 8px; margin-bottom: 24px; }
  .recos-title { font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #92400e; }
  .recos ol { padding-left: 20px; }
  .recos li { font-size: 13px; margin-bottom: 4px; color: #333; }
  .opti { padding: 16px; background: #eef9ff; border-left: 3px solid #3b82f6; border-radius: 8px; margin-bottom: 24px; }
  .opti-title { font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1e40af; }
  .opti-prompt { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #dbeafe; white-space: pre-wrap; color: #333; }
  .predicted { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
  .predicted-kpi { text-align: center; padding: 6px; background: #fff; border: 1px solid #dbeafe; border-radius: 6px; }
  .predicted-kpi-label { font-size: 10px; color: #666; text-transform: uppercase; }
  .predicted-kpi-score { font-size: 18px; font-weight: 800; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #999; font-size: 11px; text-align: center; }
  @media print {
    body { padding: 16px; }
    .kpi { page-break-inside: avoid; }
    .no-print { display: none; }
  }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">${isFr ? "Imprimer / PDF" : "Print / PDF"}</button>

  <h1>${isFr ? "Rapport d'analyse Ora" : "Ora Analysis Report"}</h1>
  <div class="meta">${new Date(data.date).toLocaleString(isFr ? "fr-FR" : "en-US")} · ID: ${escapeHtml(data.id || "—")}</div>

  <div class="hero">
    ${data.imageUrl ? `<img src="${escapeHtml(data.imageUrl)}" alt="" />` : ""}
    <div class="hero-meta">
      <div class="overall">
        <div>
          <div class="overall-score">${data.overall}<span style="font-size:20px;color:#999">/100</span></div>
          <div class="overall-grade">${overallLabel}</div>
        </div>
      </div>
      <div class="summary">${escapeHtml(data.summary || "")}</div>
    </div>
  </div>

  ${data.prompt ? `<div class="context"><div class="context-label">${isFr ? "Prompt utilisé" : "Prompt used"}</div><div class="context-body">${escapeHtml(data.prompt)}</div></div>` : ""}
  ${data.briefContext ? `<div class="context"><div class="context-label">${isFr ? "Brief / contexte" : "Brief / context"}</div><div class="context-body">${escapeHtml(data.briefContext)}</div></div>` : ""}
  ${data.objective ? `<div class="context"><div class="context-label">${isFr ? "Objectif" : "Objective"}</div><div class="context-body">${escapeHtml(data.objective)}</div></div>` : ""}

  <h2>${isFr ? "Détail des 3 KPIs" : "3 KPIs breakdown"}</h2>
  ${kpiBlock("Legal", data.legal, "30%")}
  ${kpiBlock("Brand Fit", data.brandFit, "35%")}
  ${kpiBlock(isFr ? "Créatif" : "Creative", data.creative, "35%")}

  <div style="margin:16px 0;padding:12px 16px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;background:${data.publishVerdict === "safe" ? "#dcfce7" : data.publishVerdict === "revise" ? "#fef3c7" : "#fef2f2"};color:${data.publishVerdict === "safe" ? "#15803d" : data.publishVerdict === "revise" ? "#b45309" : "#b91c1c"}">
    ${isFr ? "Verdict" : "Verdict"}: ${data.publishVerdict === "safe" ? (isFr ? "Publier" : "Publish") : data.publishVerdict === "revise" ? (isFr ? "À retoucher" : "Revise") : (isFr ? "Bloquer" : "Block")}
  </div>

  ${data.recommendations.length > 0 ? `
    <div class="recos">
      <div class="recos-title">${isFr ? "Recommandations prioritaires" : "Priority recommendations"}</div>
      <ol>${data.recommendations.map(r => `<li><strong>[${escapeHtml(r.kpi.toUpperCase())}]</strong> ${escapeHtml(r.text)}${r.impact === "high" ? " ⚠" : ""}</li>`).join("")}</ol>
    </div>
  ` : ""}

  ${data.optimizedPrompt ? `
    <div class="opti">
      <div class="opti-title">${isFr ? "Prompt optimisé" : "Optimized prompt"}</div>
      <div class="opti-prompt">${escapeHtml(data.optimizedPrompt)}</div>
    </div>
  ` : ""}

  <div class="footer">${isFr ? "Généré par Ora Studio" : "Generated by Ora Studio"} · ${new Date().getFullYear()}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Popup blocked — fall back to download
    const a = document.createElement("a");
    a.href = url;
    a.download = `ora-analyze-${data.id || Date.now()}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
