#!/usr/bin/env node
/*
 * Creates the only data file the static dashboard may load.
 *
 * Run from the repository root: node scripts/build-derived.js
 * The source CSVs remain read-only. This script exports aggregate results only;
 * it never copies a respondent, a weekly record, a name, or an email address.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUTPUT = path.join(ROOT, 'public', 'derived.json');
const WEEKS_OF_HISTORY = 78;
const WEEKS_PER_YEAR = 52;
const ENTRY_SCALE = 0.5; // Cautious first-year German entry assumption, approved in PROJECT_BRIEF.md.
const MAX_ACCEPTANCE = 61.7; // Highest value in the supplied three-price test.

function readCsv(fileName) {
  const text = fs.readFileSync(path.join(DATA, fileName), 'utf8').trim();
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  );
}

function number(value) { return Number(value); }
function round(value, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function topSegments(survey, channel) {
  const segments = new Map();
  for (const row of survey) {
    const current = segments.get(row.segment) || { total: 0, channelMatches: 0, intent: 0 };
    current.total += 1;
    current.intent += number(row.lumen_purchase_intent_1_10);
    if (row.preferred_channel === channel) current.channelMatches += 1;
    segments.set(row.segment, current);
  }
  return [...segments.entries()]
    .map(([name, value]) => ({
      name,
      // A segment must both prefer this channel and show intent for LUMEN.
      score: (value.channelMatches / value.total) * (value.intent / value.total),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((item) => item.name);
}

function build() {
  const market = readCsv('market_context.csv');
  const competitorPrices = readCsv('competitor_prices_by_channel.csv');
  const survey = readCsv('customer_survey.csv');
  const sales = uniqueRows(readCsv('historical_sales_weekly.csv'));
  const priceTests = readCsv('price_test_results.csv');
  const seasonality = readCsv('seasonality_and_weather.csv');
  const economics = readCsv('channel_economics.csv');
  const cogs = number(readCsv('cost_breakdown.csv').find(r => r.cost_component.startsWith('TOTAL COGS')).cost_per_unit_eur);

  const categoryRows = market.filter((row) => row.dimension_type === 'subcategory' && row.year === '2026');
  const totalMarket = categoryRows.reduce((sum, row) => sum + number(row.value), 0);
  const relevantMarket = categoryRows
    .filter((row) => ['Energy / focus', 'Plant-based / adaptogenic'].includes(row.name))
    .reduce((sum, row) => sum + number(row.value), 0);
  const relevantCategoryShare = relevantMarket / totalMarket;
  const overallIntent = mean(survey.map((row) => number(row.lumen_purchase_intent_1_10)));
  const channels = [...new Set(priceTests.map((row) => row.channel))];
  const prices = [...new Set(priceTests.map((row) => row.price_eur))];
  const scenarios = {};
  const topSegmentsByChannel = {};

  for (const channel of channels) {
    const channelSales = sales.filter((row) => row.channel === channel);
    const annualBenchmark = channelSales.reduce((sum, row) => sum + number(row.units_sold), 0)
      / WEEKS_OF_HISTORY * WEEKS_PER_YEAR;
    const channelSurvey = survey.filter((row) => row.preferred_channel === channel);
    const channelFit = mean(channelSurvey.map((row) => number(row.lumen_purchase_intent_1_10))) / overallIntent;
    const germanChannelBase = annualBenchmark * relevantCategoryShare * ENTRY_SCALE;
    scenarios[channel] = {};
    topSegmentsByChannel[channel] = topSegments(survey, channel);

    for (const price of prices) {
      const test = priceTests.find((row) => row.channel === channel && row.price_eur === price);
      if (!test) throw new Error(`Missing price test for ${channel} at €${price}.`);
      const acceptance = number(test.estimated_acceptance_pct_of_survey);
      const rawUnits = germanChannelBase * (acceptance / MAX_ACCEPTANCE) * channelFit;
      // Round before money calculations so every displayed figure can be
      // recreated directly from the displayed unit scenario in Excel.
      const estimatedYear1Units = round(rawUnits / 100) * 100;
      scenarios[channel][price] = {
        acceptancePct: acceptance,
        estimatedYear1Units,
        retailRevenueEur: round(estimatedYear1Units * number(price)),
        contributionEur: round(estimatedYear1Units * number(test.unit_contribution_eur)),
        unitContributionEur: number(test.unit_contribution_eur),
        contributionMarginPct: number(test.contribution_margin_pct),
      };
    }
  }

  const seasonalityTotal = seasonality.reduce((sum, row) => sum + number(row.seasonality_index_100_avg), 0);
  const competitors = new Map();
  for (const row of competitorPrices) {
    const pricesForCompetitor = competitors.get(row.competitor) || [];
    pricesForCompetitor.push(number(row.price_eur));
    competitors.set(row.competitor, pricesForCompetitor);
  }

  // New frontend context: all derived from case aggregates, never source records.
  const ids = { 'DTC Online': 'dtc', 'Retail/Grocery': 'grocery', 'Gym & Office': 'gym' };
  const channelDetails = {};
  for (const channel of channels) {
    const e = economics.find(r => r.channel === channel && r.illustrative_retail_price_eur === '2.19');
    const retained = 1 - number(e.retailer_margin_pct) - number(e.distributor_cut_pct) - number(e.payment_processing_pct);
    channelDetails[channel] = {
      id: ids[channel],
      // Illustrative shelf-price threshold, excluding fixed and launch costs.
      floorPriceEur: round((cogs + number(e.fulfillment_cost_eur)) / retained, 4),
      topSegments: topSegmentsByChannel[channel].map(name => ({ name,
        intent: round(mean(survey.filter(r => r.segment === name).map(r => number(r.lumen_purchase_intent_1_10))), 1) }))
    };
  }
  const benchmarks = { referencePriceEur: 2.19,
    note: 'Source-market weekly averages are deduplicated case sales totals divided by 78 weeks. Germany is the year-one scenario at €2.19 divided by 52; it is not observed sales. These are different countries and horizons, not causal evidence.',
    channels: channels.map(channel => ({ id: ids[channel], label: channel,
      actuals: Object.fromEntries(['NL', 'DK', 'SE'].map(country => {
        const rows = sales.filter(r => r.channel === channel && r.country === ({ NL: 'Netherlands', DK: 'Denmark', SE: 'Sweden' }[country]));
        if (rows.length !== 78) throw new Error('Expected 78 cleaned weeks per market and channel');
        return [country, { units_wk: round(rows.reduce((a,r) => a + number(r.units_sold), 0) / 78, 2),
          revenue_wk: round(rows.reduce((a,r) => a + number(r.revenue_eur), 0) / 78, 2) }];
      })), germany_estimate: { units_wk: round(scenarios[channel]['2.19'].estimatedYear1Units / 52, 2),
        revenue_wk: round(scenarios[channel]['2.19'].retailRevenueEur / 52, 2) }
    })) };
  // Approximate schematic marker locations are presentation coordinates, not geographic evidence.
  const coordinates = { Berlin: [305,145], Hamburg: [190,85], Munich: [260,385], Cologne: [80,220], Frankfurt: [140,270] };
  const regions = market.filter(r => r.dimension_type === 'region' && r.metric === 'population_share_of_market' && r.year === '2026').map(r => ({
    name: r.name, x: coordinates[r.name]?.[0] ?? null, y: coordinates[r.name]?.[1] ?? null,
    market_size_m: round(totalMarket * number(r.value) / 1000000, 1), share: number(r.value),
    growth: number(market.find(g => g.name === r.name && g.metric === 'regional_cagr' && g.year === '2026').value),
    note: 'Illustrative 2026 allocation of the full German functional-beverage market; not measured city sales or LUMEN revenue.'
  }));
  const recommendedRegion = [...regions].filter(r => r.x !== null).sort((a,b) => b.share-a.share)[0].name;

  return {
    channelDetails, benchmarks, regions, recommendedRegion,
    categories: categoryRows.map(r => ({ name: r.name, marketEur: number(r.value), share: round(number(r.value) / totalMarket, 4) })),
    competitorChannels: channels.map(channel => ({ channel,
      competitors: [...competitors.keys()].map(name => {
        const rows = competitorPrices.filter(r => r.channel === channel && r.competitor === name);
        const single = rows.find(r => r.format === 'Single can (330ml)');
        return { name, singleCanPriceEur: single ? number(single.price_eur) : null,
          minPriceEur: rows.length ? Math.min(...rows.map(r => number(r.price_eur))) : null,
          maxPriceEur: rows.length ? Math.max(...rows.map(r => number(r.price_eur))) : null };
      }) })) ,
    meta: {
      generatedAt: new Date().toISOString(),
      methodVersion: '1.0',
      caveat: 'No German LUMEN sales history exists; NL/DK/SE are demand-pattern benchmarks only, never a German forecast.',
    },
    summary: {
      germanFunctionalMarketEur2026: totalMarket,
      relevantCategoryShare: round(relevantCategoryShare, 4),
      entryScaleAssumption: ENTRY_SCALE,
      cleanedHistoricalSalesRows: sales.length,
      removedDuplicateHistoricalSalesRows: 4,
      launchWindow: 'Mid-April to early May',
      recommendation: 'Launch at €2.19 through DTC Online and Gym & Office first; use Retail/Grocery later for scale.',
    },
    channels,
    pricesEur: prices.map(number),
    scenarios,
    topSegmentsByChannel,
    seasonality: seasonality.map((row) => ({
      month: number(row.month),
      index: number(row.seasonality_index_100_avg),
      shareOfYear: round(number(row.seasonality_index_100_avg) / seasonalityTotal, 6),
    })),
    competitorSummary: [...competitors.entries()].map(([name, values]) => ({
      name,
      minPriceEur: Math.min(...values),
      maxPriceEur: Math.max(...values),
    })),
    assumptions: [
      'Germany has no LUMEN sales history; NL/DK/SE sales are cleaned channel benchmarks only.',
      'Exact duplicate historical-sales rows are removed before annualising 78 weeks to 52 weeks.',
      'A 50% entry scale reflects a cautious first year with zero German distribution and awareness at launch.',
      'Price acceptance scales demand relative to the best-tested acceptance of 61.7% at €1.79.',
      'Seasonality distributes the annual scenario across months; it does not inflate a full 12-month total.',
    ],
  };
}

const derived = build();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(derived, null, 2)}\n`);
console.log(`Wrote privacy-safe aggregates to ${path.relative(ROOT, OUTPUT)}.`);

