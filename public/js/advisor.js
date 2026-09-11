/* advisor.js — controller for the Launch Advisor page.
   Reads state (channel, price, objective) → asks logic.js for numbers →
   renders. No business math lives in this file. */

import { loadDerived, renderError, fmt, escapeHtml, currentCity, cityOptions, rememberCity } from "./data.js";
import { metricsAt, recommend, testedPriceAt, belowFloor, forCity } from "./logic.js";

import { renderCompetitors } from "./cities.js";
let sourceData, selectedCity;
let D;                            // derived.json contents
const state = {
  channelId: null,
  priceCents: 219,                // slider works in cents to avoid float drift
  objective: "share",
};
let lastWinnerKey = "";           // to flash the banner when the winner changes

init().catch(renderError);

async function init() {
  sourceData = await loadDerived();
  selectedCity = currentCity(sourceData);
  D = { ...sourceData, channels: forCity(sourceData.channels, selectedCity) };

  // Default selection (never an empty state): first channel, middle tested price.
  state.channelId = D.channels[0].id;
  const middle = D.prices[Math.floor(D.prices.length / 2)];
  state.priceCents = Math.round(middle * 100);

  const citySelect = document.getElementById('city-select');
  citySelect.innerHTML = cityOptions(sourceData).map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  citySelect.value = selectedCity.name;
  citySelect.addEventListener('change', () => {
    selectedCity = cityOptions(sourceData).find(c => c.name === citySelect.value);
    D = { ...sourceData, channels: forCity(sourceData.channels, selectedCity) };
    render();
  });
  buildChannelButtons();
  buildSliderTicks();
  document.getElementById('tested-prices').innerHTML = D.prices.map(p => `<button type="button" data-price="${p}">€${p.toFixed(2)}</button>`).join('');
  document.getElementById('tested-prices').addEventListener('click', e => {
    const button = e.target.closest('[data-price]');
    if (!button) return;
    state.priceCents = Math.round(Number(button.dataset.price) * 100);
    document.getElementById('price-slider').value = state.priceCents;
    render();
  });
  wireEvents();
  render();
}

function price() { return state.priceCents / 100; }
function channel() { return D.channels.find(c => c.id === state.channelId); }

/* ---------- one-time UI construction ---------- */

function buildChannelButtons() {
  const seg = document.getElementById("channel-seg");
  seg.innerHTML = D.channels.map(c =>
    `<button data-channel="${c.id}" aria-pressed="${c.id === state.channelId}">${escapeHtml(c.label)}</button>`
  ).join("");
}

function buildSliderTicks() {
  const slider = document.getElementById("price-slider");
  const [min, max] = [Math.min(...D.prices), Math.max(...D.prices)];
  slider.min = Math.round(min * 100);
  slider.max = Math.round(max * 100);
  slider.value = state.priceCents;

  const ticks = document.getElementById("price-ticks");
  ticks.innerHTML = D.prices.map(p => {
    const pos = ((p - min) / (max - min)) * 100;
    return `<span style="left:${pos}%">€${p.toFixed(2)}</span>`;
  }).join("");
}

function wireEvents() {
  document.getElementById("channel-seg").addEventListener("click", e => {
    const btn = e.target.closest("button[data-channel]");
    if (!btn) return;
    state.channelId = btn.dataset.channel;
    for (const b of e.currentTarget.querySelectorAll("button"))
      b.setAttribute("aria-pressed", String(b === btn));
    render();
  });

  document.getElementById("objective-seg").addEventListener("click", e => {
    const btn = e.target.closest("button[data-objective]");
    if (!btn) return;
    state.objective = btn.dataset.objective;
    for (const b of e.currentTarget.querySelectorAll("button"))
      b.setAttribute("aria-pressed", String(b === btn));
    render();
  });

  const slider = document.getElementById("price-slider");
  slider.addEventListener("input", () => {
    // Keep keyboard steps usable: tested anchors also have direct buttons.
    state.priceCents = Number(slider.value);
    render();
  });
}

/* ---------- rendering ---------- */

function render() {
  rememberCity(selectedCity);
  renderCompetitors(sourceData, channel().label, selectedCity, price());
  renderBanner();
  renderPriceReadout();
  renderResults();
  renderChart();
}

function renderBanner() {
  const rec = recommend(D.channels, D.prices, state.objective);
  const w = rec.winner;
  const key = `${w.channel.id}@${w.metrics.price}@${state.objective}`;
  const changed = lastWinnerKey && lastWinnerKey.split("@").slice(0, 2).join("@") !==
                  key.split("@").slice(0, 2).join("@");
  lastWinnerKey = key;

  const objLabel = state.objective === "share" ? "market share" : "profitability";
  document.getElementById("banner-headline").innerHTML =
    `<span class="${changed ? "flash" : ""}">${escapeHtml(selectedCity.name)}: launch at ${fmt.eur2(w.metrics.price)} through ${escapeHtml(w.channel.label)}</span>` +
    ` — ${escapeHtml(D.seasonality.recommended_launch)}, ahead of the ${escapeHtml(D.seasonality.peak_months)} peak.`;

  const parts = [`Optimizing for ${objLabel}: ` +
    (state.objective === "share"
      ? `${fmt.int(w.metrics.units)} estimated units`
      : `${fmt.eur(w.metrics.contribution_total)} estimated contribution`) + " in the city’s illustrative year-one scenario."];
  if (rec.runnerUp) {
    const r = rec.runnerUp;
    parts.push(`Close alternative: ${fmt.eur2(r.metrics.price)} in ${escapeHtml(r.channel.label)}.`);
  }
  document.getElementById("banner-subline").innerHTML = parts.join(" ");
}

function renderPriceReadout() {
  const p = price();
  const tested = testedPriceAt(D.prices, p) !== null;
  document.getElementById("price-readout").textContent = fmt.eur2(p);
  const mode = document.getElementById("price-mode");
  mode.textContent = tested ? "tested price" : "interpolated estimate";
  document.getElementById('price-slider').setAttribute('aria-valuetext', fmt.eur2(p) + (tested ? ' tested price' : ' exploratory interpolation'));
  document.querySelectorAll('[data-price]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.price) === p)));
  mode.className = "price-mode " + (tested ? "tested" : "interp");
}

function renderResults() {
  const ch = channel();
  const m = metricsAt(ch, D.prices, price());
  const tag = m.interpolated ? `<div class="estimate-tag">interpolated</div>` : "";

  document.getElementById("results").innerHTML = `
    <div class="metric"><div class="value">${fmt.int(m.units)}</div>
      <div class="label">Estimated city year-1 units</div>${tag}</div>
    <div class="metric"><div class="value">${fmt.eur(m.revenue)}</div>
      <div class="label">Estimated shelf revenue</div>${tag}</div>
    <div class="metric"><div class="value">${fmt.eur(m.contribution_total)}</div>
      <div class="label">Estimated contribution (${fmt.eur2(m.contribution_per_unit)}/unit)</div>${tag}</div>
    <div class="metric"><div class="value">${fmt.pct(m.acceptance)}</div>
      <div class="label">Survey price acceptance</div>${tag}</div>`;

  const floor = document.getElementById("floor-note");
  if (belowFloor(ch, price())) {
    floor.textContent = `Below the margin floor for this channel (${fmt.eur2(ch.floor_price)}) LUMEN loses money per can.`;
    floor.className = "floor-note breach";
  } else if (Number.isFinite(ch.floor_price)) {
    floor.textContent = `Illustrative variable-cost break-even shelf price: ${fmt.eur2(ch.floor_price)} — excludes fixed and launch costs; calculated from case cost and channel assumptions.`;
    floor.className = "floor-note";
  } else {
    floor.textContent = "";
  }

  const segs = (ch.top_segments || []).map(s => `${escapeHtml(s.name)} (${s.intent}/10)`).join(" and ");
  document.getElementById("target-line").innerHTML =
    segs ? `Who to target in this channel: <span class="who">${segs}</span>, ranked by channel preference within each segment × mean intent. Scores are national segment-wide mean intent, not city-specific purchase rates.` : "";

  const tested = testedPriceAt(D.prices, price());
  const pos = tested !== null ? D.positioning?.[String(tested)] : null;
  document.getElementById("positioning-line").textContent = pos || "";
}

function renderChart() {
  const ch = channel();
  const objective = state.objective;
  const metric = objective === "share" ? "units" : "contribution_total";
  const label = objective === "share" ? "estimated units" : "estimated contribution";
  document.getElementById("chart-title").textContent =
    `${selectedCity.name} · ${ch.label} — ${label}`;

  const rows = D.prices.map(p => ({ p, m: metricsAt(ch, D.prices, p) }));
  const max = Math.max(...rows.map(r => r.m[metric]));
  const best = rows.reduce((a, b) => (b.m[metric] > a.m[metric] ? b : a));

  document.getElementById("chart-bars").innerHTML = rows.map(r => {
    const h = max > 0 ? (r.m[metric] / max) * 100 : 0;
    const val = metric === "units" ? fmt.int(r.m[metric]) : fmt.eur(r.m[metric]);
    return `<div class="bar-col">
      <div class="bar-value">${val}</div>
      <div class="bar-track"><div class="bar ${r === best ? "winner" : ""}" style="height:${h}%"></div></div>
      <div class="bar-label">€${r.p.toFixed(2)}${r.p === price() ? " · Selected" : ""}${r === best ? " · Leader" : ""}</div>
    </div>`;
  }).join("");
}
