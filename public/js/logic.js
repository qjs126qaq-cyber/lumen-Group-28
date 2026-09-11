/* logic.js — every business formula in one place, so each can be
   explained to a non-technical grader.

   TESTED vs INTERPOLATED
   ----------------------
   The price test measured exactly three prices (from derived.json:
   prices[]). Any other slider position is a LINEAR INTERPOLATION between
   the two neighbouring tested prices — an exploratory estimate, clearly
   labelled in the UI, and NEVER used by the recommendation, which only
   ranks tested prices. */

const EPS = 0.005; // treat slider values within half a cent of a tested price as that tested price

/* Is this slider price one of the tested anchors? */
export function testedPriceAt(prices, price) {
  return prices.find(p => Math.abs(p - price) < EPS) ?? null;
}

/* Metrics for a channel at any price inside the tested range.
   - On a tested anchor: return the measured/estimated figures directly.
   - Between anchors: interpolate acceptance, units, and contribution-per-unit
     linearly between the two neighbours. Revenue is always price × units;
     total contribution is contribution-per-unit × units.
   Rationale for linearity: contribution per unit is mechanically near-linear
   in price (price minus channel costs); demand between two measured points
   is assumed linear for lack of closer measurements — an assumption stated
   in the UI. */
export function metricsAt(channel, prices, price) {
  if (!Number.isFinite(price) || price < Math.min(...prices) || price > Math.max(...prices)) throw new Error("Price outside supported range");
  const tested = testedPriceAt(prices, price);
  if (tested !== null) {
    const row = channel.by_price[String(tested)];
    return { ...finish(tested, row.acceptance, row.units, row.contribution_per_unit, false),
      revenue: row.revenue, contribution_total: row.contribution_total };
  }
  // find neighbouring tested prices lo < price < hi
  const sorted = [...prices].sort((a, b) => a - b);
  let lo = sorted[0], hi = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (price >= sorted[i] && price <= sorted[i + 1]) { lo = sorted[i]; hi = sorted[i + 1]; break; }
  }
  const a = channel.by_price[String(lo)], b = channel.by_price[String(hi)];
  const t = (price - lo) / (hi - lo); // 0 → at lo, 1 → at hi
  const lerp = (x, y) => x + t * (y - x);
  return finish(price,
    lerp(a.acceptance, b.acceptance),
    lerp(a.units, b.units),
    lerp(a.contribution_per_unit, b.contribution_per_unit),
    true);
}

function finish(price, acceptance, units, cpu, interpolated) {
  return {
    price,
    interpolated,          // true → label as "interpolated estimate" in the UI
    acceptance,
    units: Math.round(units / 100) * 100,
    revenue: Math.round(price * (Math.round(units / 100) * 100)),
    contribution_per_unit: cpu,
    contribution_total: Math.round(cpu * (Math.round(units / 100) * 100)),
  };
}

/* RECOMMENDATION
   Ranks ONLY the tested prices across all channels, under the chosen
   objective:
     - "share":  maximize estimated year-1 units (CMO view)
     - "profit": maximize total contribution (CFO view)
   Near-ties: if the runner-up is within TIE_THRESHOLD (5%) of the winner
   on the objective metric, it is reported so the UI can mention it. */
const TIE_THRESHOLD = 0.05;

export function recommend(channels, prices, objective) {
  const score = m => objective === "share" ? m.units : m.contribution_total;
  const options = [];
  for (const ch of channels) {
    for (const p of prices) {
      const m = metricsAt(ch, prices, p);
      options.push({ channel: ch, metrics: m, value: score(m) });
    }
  }
  options.sort((x, y) => y.value - x.value);
  const winner = options[0];
  // runner-up in a DIFFERENT channel-or-price combination, close enough to mention
  const runnerUp = options.find(o => o !== winner && o.value >= winner.value * (1 - TIE_THRESHOLD)) || null;
  return { winner, runnerUp, objective };
}

/* Margin floor check: below floor_price the channel's economics turn
   negative (from cost_breakdown + channel_economics). Used to warn in
   the results panel. */
export function belowFloor(channel, price) {
  return Number.isFinite(channel.floor_price) && price < channel.floor_price;
}

/* City scenarios allocate national volumes by the case's illustrative city share.
   This assumes the same channel/price response across cities; no city sales exist. */
export function forCity(channels, city) {
  return channels.map(c => ({ ...c, by_price: Object.fromEntries(Object.entries(c.by_price).map(([p,r]) => {
    const units = Math.round(r.units * city.share / 100) * 100;
    return [p, { ...r, units, revenue: Math.round(units * Number(p)),
      contribution_total: Math.round(units * r.contribution_per_unit) }];
  })) }));
}
