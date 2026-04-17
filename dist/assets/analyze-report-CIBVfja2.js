function t(e){return e>=80?"#22c55e":e>=60?"#84cc16":e>=40?"#f59e0b":"#ef4444"}function a(e,i){return e>=80?"Excellent":e>=60?i?"Bon":"Good":e>=40?i?"Médiocre":"Mediocre":i?"Insuffisant":"Poor"}function o(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function p(e,i,d){const l=t(i.score),s=i.positives.map(r=>`<li>${o(r)}</li>`).join(""),n=i.issues.map(r=>`<li>${o(r)}</li>`).join("");return`
    <div class="kpi">
      <div class="kpi-header">
        <span class="kpi-label">${o(e)} <span class="kpi-weight">${d}</span></span>
        <span class="kpi-score" style="color:${l}">${i.score}<span class="kpi-max">/100</span></span>
      </div>
      <div class="kpi-bar"><div class="kpi-fill" style="width:${i.score}%;background:${l}"></div></div>
      ${s?`<div class="kpi-section"><div class="kpi-section-title positive">✓ Forces</div><ul>${s}</ul></div>`:""}
      ${n?`<div class="kpi-section"><div class="kpi-section-title issue">⚠ À améliorer</div><ul>${n}</ul></div>`:""}
    </div>
  `}function f(e,i){const d=t(e.overall),l=a(e.overall,i),s=`<!DOCTYPE html>
<html lang="${i?"fr":"en"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${i?"Rapport d'analyse":"Analysis report"} — ${o(e.id||"")}</title>
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
  .overall-score { font-size: 48px; font-weight: 900; line-height: 1; color: ${d}; }
  .overall-label { font-size: 14px; color: #666; }
  .overall-grade { font-size: 16px; font-weight: 700; color: ${d}; }
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
  <button class="print-btn no-print" onclick="window.print()">${i?"Imprimer / PDF":"Print / PDF"}</button>

  <h1>${i?"Rapport d'analyse Ora":"Ora Analysis Report"}</h1>
  <div class="meta">${new Date(e.date).toLocaleString(i?"fr-FR":"en-US")} · ID: ${o(e.id||"—")}</div>

  <div class="hero">
    ${e.imageUrl?`<img src="${o(e.imageUrl)}" alt="" />`:""}
    <div class="hero-meta">
      <div class="overall">
        <div>
          <div class="overall-score">${e.overall}<span style="font-size:20px;color:#999">/100</span></div>
          <div class="overall-grade">${l}</div>
        </div>
      </div>
      <div class="summary">${o(e.summary||"")}</div>
    </div>
  </div>

  ${e.prompt?`<div class="context"><div class="context-label">${i?"Prompt utilisé":"Prompt used"}</div><div class="context-body">${o(e.prompt)}</div></div>`:""}
  ${e.briefContext?`<div class="context"><div class="context-label">${i?"Brief / contexte":"Brief / context"}</div><div class="context-body">${o(e.briefContext)}</div></div>`:""}
  ${e.objective?`<div class="context"><div class="context-label">${i?"Objectif":"Objective"}</div><div class="context-body">${o(e.objective)}</div></div>`:""}

  <h2>${i?"Détail des 7 KPIs":"7 KPIs breakdown"}</h2>
  ${p(i?"Éthique":"Ethics",e.ethique,"10%")}
  ${p(i?"Légal":"Legal",e.legal,"10%")}
  ${p("Brief",e.brief,"15%")}
  ${p(i?"Objectif":"Objective",e.objectif,"15%")}
  ${p(i?"Cohérence message":"Message coherence",e.coherence,"15%")}
  ${p(i?"Cible":"Target",e.cible,"15%")}
  ${p(i?"Créatif":"Creative",e.creatif,"20%")}

  ${e.recommendations.length>0?`
    <div class="recos">
      <div class="recos-title">${i?"Recommandations prioritaires":"Priority recommendations"}</div>
      <ol>${e.recommendations.map(c=>`<li>${o(c)}</li>`).join("")}</ol>
    </div>
  `:""}

  ${e.optimizedPrompt?`
    <div class="opti">
      <div class="opti-title">${i?"Prompt optimisé":"Optimized prompt"}</div>
      <div class="opti-prompt">${o(e.optimizedPrompt)}</div>
      ${e.predictedScores?`
        <div class="predicted">
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Éthique":"Ethics"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.ethique)}">${e.predictedScores.ethique}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Légal":"Legal"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.legal)}">${e.predictedScores.legal}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">Brief</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.brief)}">${e.predictedScores.brief}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Objectif":"Objective"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.objectif)}">${e.predictedScores.objectif}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Cohérence":"Coherence"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.coherence)}">${e.predictedScores.coherence}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Cible":"Target"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.cible)}">${e.predictedScores.cible}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Créatif":"Creative"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.creatif)}">${e.predictedScores.creatif}</div></div>
          <div class="predicted-kpi"><div class="predicted-kpi-label">${i?"Global prévu":"Predicted overall"}</div><div class="predicted-kpi-score" style="color:${t(e.predictedScores.overall)}">${e.predictedScores.overall}</div></div>
        </div>
      `:""}
    </div>
  `:""}

  <div class="footer">${i?"Généré par Ora Studio":"Generated by Ora Studio"} · ${new Date().getFullYear()}</div>
</body>
</html>`,n=new Blob([s],{type:"text/html"}),r=URL.createObjectURL(n);if(!window.open(r,"_blank")){const c=document.createElement("a");c.href=r,c.download=`ora-analyze-${e.id||Date.now()}.html`,c.click()}setTimeout(()=>URL.revokeObjectURL(r),6e4)}export{f as d};
