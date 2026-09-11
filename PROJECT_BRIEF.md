# LUMEN Germany Launch Advisor — binding product brief

**Status:** Step 5 merged; Step 6 verified locally — awaiting review
**Last updated:** 2026-09-11

## 1. Product vision

Build a single-page, laptop-readable decision dashboard for non-technical
graders. It answers one question: **at what price, through which channel(s),
and when should LUMEN launch in Germany?**

The user chooses one launch channel and one of the three tested shelf prices.
The dashboard then shows an explainable *year-one scenario* for units,
revenue, and contribution. It is not a promise or a statistical forecast.

### Actual launch channels in the supplied data

1. **DTC Online**
2. **Retail/Grocery**
3. **Gym & Office**

### Required product elements

- A one-sentence recommendation banner: price, first channel(s), and launch
  window.
- A channel selector and price selector (€1.79, €2.19, €2.59).
- Estimated year-one units, retail revenue, and LUMEN contribution.
- A **Market share** / **Profitability** objective toggle.
- One bar chart comparing all three prices for the selected channel under the
  selected objective.
- A “Who to target” line naming the top two segments for the selected channel.
- A plain-language assumptions and limitations box.
- A visible caveat: **LUMEN has no German sales history. NL/DK/SE data are
  demand-pattern benchmarks only; they are never presented as German actuals
  or a German forecast.**

## 2. Data verification

The supplied descriptions are materially correct.

| File | Verified contents / decision use | Notes |
|---|---|---|
| `market_context.csv` | 36 rows; German market values by subcategory and city/region indicators, 2022–27 | Use the 2026 category mix and €9.1bn total as opportunity context and a reasonableness guardrail. |
| `competitor_prices_by_channel.csv` | 27 rows; four competitors, prices, formats and channels | Use for price positioning. |
| `competitor_price_history.csv` | 48 rows; four competitors × 12 months | Use to explain promotion risk, not volume estimation. |
| `customer_survey.csv` | 420 German respondents; segments, channel preference and LUMEN intent | Contains names and email-style fields: never expose, copy, or ship them. |
| `customer_quotes.csv` | 12 segment-level quotes | Use only as supporting qualitative context. |
| `historical_sales_weekly.csv` | NL/DK/SE weekly units and revenue by channel | 706 rows were supplied; 78 weeks × 3 countries × 3 channels implies 702. There are four exact duplicate rows, so calculations must deduplicate before annualising. Large Dutch grocery weeks should be retained but described as benchmark volatility, not German demand. |
| `marketing_funnel_monthly.csv` | 72 rows; 18 months × four acquisition tactics | Use for acquisition trade-offs, not to create a hidden marketing forecast. |
| `cost_breakdown.csv` | Seven cost/margin rows | Use to explain contribution, with the channel-price test as the displayed source of truth. |
| `channel_economics.csv` | Six rows; two illustrative prices × three channels | Explains why a shelf price is not what LUMEN keeps. |
| `price_sensitivity_survey.csv` | 300 German responses; four Van Westendorp thresholds | Supports tested price plausibility. |
| `price_test_results.csv` | Nine rows; three prices × three channels | Confirms acceptance: €1.79 = 61.7%, €2.19 = 51.7%, €2.59 = 26.7%. |
| `seasonality_and_weather.csv` | 12 monthly indices | Summer demand peaks in June–August; use for timing and monthly allocation. |

## 3. Estimation methodology — explainable year-one scenario

### What this method does and does not claim

This is a transparent planning scenario. Germany has no LUMEN sales history,
so no method can honestly produce a precise German forecast. The dashboard
will show the assumptions directly and label outputs **estimated year-one
scenario**.

### Step A — clean the comparable-market benchmark

For each channel, remove exact duplicate historical-sales rows. Annualise the
remaining NL/DK/SE units:

`clean annual benchmark units = cleaned channel units / 78 weeks × 52 weeks`

This preserves observed channel demand patterns while avoiding a false claim
that Germany will repeat them exactly.

### Step B — scale a cautious German entry base from market context

The relevant LUMEN opportunity is the sum of the 2026 **Energy / focus** and
**Plant-based / adaptogenic** subcategories. Divide it by the full German
functional-beverage market to obtain a relevant-category share.

`relevant-category share = (energy/focus + plant/adaptogenic market value) / total functional market value`

For a new-market launch, use a plainly displayed **50% entry-scale
assumption**: Germany is large, but the first year begins with zero local
distribution and awareness.

`German channel base = clean annual benchmark units × relevant-category share × 50%`

The full €9.1bn market is also used as a guardrail: the dashboard shows the
scenario's implied retail revenue as a tiny share of that market. It does not
pretend that market value alone predicts LUMEN cans sold.

### Step C — apply German price acceptance and channel–segment fit

For each tested price, scale the base by price acceptance relative to the
best-tested acceptance (61.7% at €1.79):

`price factor = tested acceptance at selected price / 61.7%`

For a channel, calculate a privacy-safe segment-fit factor from survey
aggregates only:

`channel-fit factor = average LUMEN intent among respondents preferring that channel / average intent across all respondents`

`estimated year-one units = German channel base × price factor × channel-fit factor`

This gives the survey a real role without claiming that stated intent equals
purchase. The dashboard will round units to the nearest hundred to avoid false
precision.

### Step D — translate units into money using the tested channel economics

`retail revenue = estimated units × selected shelf price`

`contribution = estimated units × tested unit contribution for selected price and channel`

The price-test contribution is used rather than reconstructing it from raw
cost inputs, because it already reflects the tested channel-specific net price.
This makes the formula consistent with the source data and easy to audit.

### Step E — use seasonality for timing, not to inflate the full-year total

A complete 12-month year includes every season, so seasonality does not change
the annual total. Instead, distribute annual units by:

`month share = monthly seasonality index / sum of all 12 indices`

Recommend launch **8–10 weeks before the June–August peak (mid-April to early
May)** so distribution, sampling and repeat purchase are established before
the highest-demand period. This is a timing recommendation, not a claim about
weather causing sales.

### Step F — recommendation rule and positioning

The default recommendation is deliberately a constrained trade-off, not simply
the highest-margin price:

1. Keep prices with at least 50% tested acceptance.
2. Among those prices, select the highest total contribution across channels.
3. Start with the channels whose per-unit contribution is within 5% of the
   best eligible channel; use grocery as the later scale channel unless its
   economics improve.
4. Position LUMEN as **premium-but-accessible clean functional energy**:
   above mass market and Mate Libre, but below the boutique ceiling of Root &
   Rise.

On the verified source data, this rule is expected to select **€2.19, DTC
Online and Gym & Office first, and a mid-April to early-May launch window**.
The interface will still allow a user to inspect and challenge every channel
and tested price. Grocery is expected to maximise reach but has the weakest
tested contribution.

### Objective toggle

- **Market share:** the chart ranks options by estimated units.
- **Profitability:** the chart ranks options by estimated contribution.

The selected price remains under the user's control. The toggle changes which
metric is emphasised and which option is marked as the objective leader; it
does not silently alter the scenario formula.

### Target-segment rule

For the selected channel, rank segments by a transparent aggregate score:

`target score = segment's share of respondents preferring that channel × segment's mean LUMEN intent`

Display the top two segment names only. No respondent-level record or personal
field appears in the product.

## 4. `public/derived.json` contract

Only this pre-computed, aggregate file may be loaded by the dashboard. Raw
CSVs stay in `data/`, are read only by the local build script, and never ship
to the browser.

```json
{
  "meta": {
    "generatedAt": "ISO timestamp",
    "methodVersion": "1.0",
    "caveat": "No German LUMEN sales history exists; NL/DK/SE are benchmarks only."
  },
  "summary": {
    "germanFunctionalMarketEur2026": 9100000000,
    "relevantCategoryShare": 0.0,
    "entryScaleAssumption": 0.5,
    "launchWindow": "Mid-April to early May",
    "recommendation": "..."
  },
  "channels": ["DTC Online", "Retail/Grocery", "Gym & Office"],
  "scenarios": {
    "DTC Online": {
      "1.79": {
        "acceptancePct": 0.0,
        "estimatedYear1Units": 0,
        "retailRevenueEur": 0,
        "contributionEur": 0,
        "unitContributionEur": 0,
        "contributionMarginPct": 0.0
      }
    }
  },
  "topSegmentsByChannel": {
    "DTC Online": ["Segment A", "Segment B"]
  },
  "seasonality": [{"month": 1, "index": 0, "shareOfYear": 0.0}],
  "competitorSummary": [{"name": "...", "minPriceEur": 0, "maxPriceEur": 0}],
  "assumptions": ["..."]
}
```

Forbidden from `derived.json`: raw rows, respondent IDs, names, email
addresses, weekly records, quotes tied to an individual, or any other
record-level data.

## 5. Stack choice

Use plain **HTML, CSS, and browser JavaScript**, with one small local Node.js
pre-computation script. This is Vercel zero-config: static files deploy with
no framework, backend, database, secret, login, external API, or build service.

**Vercel compatibility is a release requirement.** The final repository must
deploy by importing it into Vercel with the framework preset set to **Other**,
the output directory set to **public**, and no environment variables or custom
build command. All dashboard paths and data loads must be relative static-file
paths so a clean Vercel deployment works without configuration code.

- `scripts/prepare-data.js`: reads raw data locally and writes aggregates.
- `public/derived.json`: the only data file loaded by the page.
- `public/index.html`, `public/styles.css`, `public/app.js`: dashboard.
- `public/logic/*.js`: small commented modules for calculations and
  recommendations; formulas remain inspectable.

## 6. Roadmap

- [x] **Step 1 — Verify data and write this binding brief.** Finish line:
  discrepancies, methodology, data contract and stack are approved.
- [x] **Step 2 — Build the local derived-data script.** Finish line:
  `public/derived.json` validates against this contract; raw data is not
  exposed.
- [ ] **Step 3 — Build the static page structure and visual system.** Finish
  line: accessible, laptop-readable layout with all required regions and no
  live data logic.
- [ ] **Step 4 — Implement scenario, recommendation and target logic.** Finish
  line: selectors and objective toggle update from `derived.json` only.
- [x] **Step 5 — Add the single comparison chart and plain-language
  limitations.** Finish line: one readable chart and every caveat is visible.
- [x] **Step 6 — Verify privacy, calculations and static deployment.** Finish
  line: no raw CSV/browser references; formulas and outputs pass checks; a
  clean Vercel static deployment needs no environment variables, API, or
  framework configuration.
- [ ] **Step 7 — Final polish, documentation and delivery review.** Finish
  line: complete end-to-end test and a presenter-ready dashboard.

## 7. Deliberate deviations

Step 6 records the existing recommendation and target-score differences in README.md. Deployment now has an explicit public-only output configuration. Live hosting remains unverified; the supplied raw CSVs remain public in GitHub. No scenario or recommendation logic changed in Step 6.

