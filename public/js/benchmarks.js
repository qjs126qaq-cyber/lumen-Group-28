/* benchmarks.js — controller for the Comparable Markets page.
   Renders, per channel, measured NL/DK/SE weekly averages (teal) next to
   the German year-1 estimate expressed per week (amber). The visual
   distinction between measured and estimated is the entire point of this
   page — it shows the estimation methodology honestly. */

import { loadDerived, renderError, fmt, escapeHtml } from "./data.js";


init().catch(renderError);

async function init() {
  const D = await loadDerived();
  const B = D.benchmarks;
  if (!B || !Array.isArray(B.channels))
    throw new Error("benchmarks missing — extend the preparation script to emit NL/DK/SE weekly aggregates.");

  const container = document.getElementById('bench-container');
  container.innerHTML = B.channels.map(renderChannel).join('') +
    `<p class="bench-note">${escapeHtml(B.note)}</p>`;
}

function renderChannel(ch) {
  const rows = [
    ...Object.entries(ch.actuals).map(([market, v]) => ({ name: market, v, type: "actual" })),
    { name: "Germany", v: ch.germany_estimate, type: "estimate" },
  ];
  const max = Math.max(...rows.map(r => r.v.units_wk));

  return `<div class="bench-block" role="figure" aria-label="${escapeHtml(ch.label)} weekly comparison">
    <h2>${escapeHtml(ch.label)}</h2>
    <div class="bench-rows">
      ${rows.map(r => {
        const w = max > 0 ? (r.v.units_wk / max) * 100 : 2;
        return `<div class="bench-row ${r.type}">
          <div class="name">${escapeHtml(r.name)}${r.type === "estimate" ? " (est.)" : ""}</div>
          <div class="track"><div class="fill" style="width:${w}%"></div></div>
          <div class="num">${fmt.int(r.v.units_wk)} / wk</div>
        </div>`;
      }).join("")}
    </div>
    <p class="bench-note">Weekly revenue: ${
      rows.map(r => `${escapeHtml(r.name)} ${fmt.eur(r.v.revenue_wk)}`).join(" · ")
    }</p>
  </div>`;
}
