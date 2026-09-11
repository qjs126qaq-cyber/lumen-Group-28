/* data.js — loads public/derived.json and validates the parts each page needs.
   The app NEVER touches raw CSVs; this file is the only data entry point.
   On failure it renders a clear error state instead of crashing. */

export async function loadDerived() {
  const res = await fetch("./derived.json");
  if (!res.ok) throw new Error(`derived.json could not be loaded (HTTP ${res.status})`);
  const data = await res.json();
  const channels = data.channels.map(label => ({
    id: data.channelDetails[label].id, label,
    floor_price: data.channelDetails[label].floorPriceEur,
    top_segments: data.channelDetails[label].topSegments,
    by_price: Object.fromEntries(data.pricesEur.map(p => {
      const s = data.scenarios[label][String(p)];
      return [String(p), { acceptance: s.acceptancePct / 100, units: s.estimatedYear1Units,
        contribution_per_unit: s.unitContributionEur, revenue: s.retailRevenueEur,
        contribution_total: s.contributionEur }];
    }))
  }));
  const view = { categories: data.categories, competitorChannels: data.competitorChannels, prices: data.pricesEur, channels, benchmarks: data.benchmarks,
    regions: data.regions, recommended_region: data.recommendedRegion,
    seasonality: { index: data.seasonality.map(m => m.index), peak_months: 'June–August',
      recommended_launch: data.summary.launchWindow,
      launch_note: 'Allow roughly 8–10 weeks to establish distribution before the summer peak. Timing does not inflate the full-year scenario.' },
    positioning: Object.fromEntries(data.pricesEur.map(p => [String(p),
      `Tested acceptance: ${data.scenarios[data.channels[0]][String(p)].acceptancePct}%. Competitor shelf-price ranges in the supplied case: ` +
      data.competitorSummary.map(c => `${c.name} €${c.minPriceEur.toFixed(2)}–€${c.maxPriceEur.toFixed(2)}`).join('; ') + '. Formats and channels vary.']))
  };
  validate(view);
  return view;
}

/* Minimal structural validation: fail loudly and early with a message a
   teammate can act on, rather than rendering NaN everywhere. */
function validate(d) {
  const need = (cond, msg) => { if (!cond) throw new Error(`derived.json invalid: ${msg}`); };
  need(Array.isArray(d.prices) && d.prices.length >= 2, "prices[] missing");
  need(Array.isArray(d.channels) && d.channels.length > 0, "channels[] missing");
  for (const ch of d.channels) {
    need(ch.id && ch.label && ch.by_price, `channel entry incomplete (${ch.id || "?"})`);
    for (const p of d.prices) {
      const row = ch.by_price[String(p)];
      need(row && [row.acceptance, row.units, row.contribution_per_unit, row.revenue, row.contribution_total].every(Number.isFinite),
        `channel "${ch.id}" missing figures for price ${p}`);
    }
  }
  need(d.seasonality && Array.isArray(d.seasonality.index), "seasonality missing");
}

/* Shared error renderer: replaces the page's <main> content. */
export function renderError(err) {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = `
    <div class="error-box">
      <strong>Data unavailable.</strong>
      <p>${escapeHtml(err.message)}</p>
      <p>The case data could not be loaded. Please refresh the page or ask the project team to check the data file. No estimates are shown until valid data is available.</p>
    </div>`;
  main.setAttribute("role", "alert");
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Formatting helpers used by all pages. "n/a" for anything non-finite. */
export const fmt = {
  int: n => Number.isFinite(n) ? new Intl.NumberFormat("en-GB").format(Math.round(n)) : "n/a",
  eur: n => Number.isFinite(n) ? "€" + new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(n)) : "n/a",
  eur2: n => Number.isFinite(n) ? "€" + n.toFixed(2) : "n/a",
  pct: n => Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "n/a",
};

// Cities are planning contexts, shared through links rather than persistent storage.
export function cityOptions(data) {
  return [...data.regions].filter(r => r.name !== 'Other Germany').sort((a,b) => b.share-a.share);
}
export function currentCity(data) {
  const requested = new URL(location.href).searchParams.get('city');
  return cityOptions(data).find(c => c.name === requested) || cityOptions(data)[0];
}
export function rememberCity(city) {
  const url = new URL(location.href);
  url.searchParams.set('city', city.name);
  history.replaceState(null, '', url);
  document.querySelectorAll('.nav a').forEach(a => {
    const link = new URL(a.href);
    if (link.pathname.endsWith('/benchmarks.html')) link.searchParams.delete('city');
    else link.searchParams.set('city', city.name);
    a.href = link;
  });
}
