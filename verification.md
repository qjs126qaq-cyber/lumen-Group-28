# Step 2 verification — hand-checkable calculations

This document proves the aggregate calculations in `public/derived.json` using
only figures available in the raw CSVs. Every calculation can be reproduced in
Excel. The dashboard receives only the final aggregates, never the source rows.

## Shared inputs and formulas

| Input | Value | Source / Excel calculation |
|---|---:|---|
| Historical period | 78 weeks | `historical_sales_weekly.csv` |
| Annualisation multiplier | 52 / 78 = 0.6666667 | `=52/78` |
| Relevant German category share | 0.52 | `(€2.548bn Energy/focus + €2.184bn Plant/adaptogenic) / €9.100bn total` from `market_context.csv` (2026) |
| Entry-scale assumption | 0.50 | Approved planning assumption in `PROJECT_BRIEF.md` |
| €2.19 acceptance factor | 0.8379254 | `51.7% / 61.7%` from `price_test_results.csv` |

The script rounds final estimated units to the nearest 100, then calculates
revenue and contribution from those displayed units. This avoids a hidden
decimal difference between the dashboard and a manual Excel check.

## Worked example A — Retail/Grocery at €2.19

This is the required grocery example.

| Calculation | Excel formula | Result |
|---|---|---:|
| Clean historical grocery units | Sum `units_sold` for `Retail/Grocery` after removing exact duplicate rows | 602,748 |
| Annualised home-market benchmark | `=602748/78*52` | 401,832.0000 |
| German channel base | `=401832*0.52*0.50` | 104,476.3200 |
| Overall German survey intent | Average all 420 `lumen_purchase_intent_1_10` values | 7.2116667 |
| Grocery-preferrer intent | Average the 195 rows where `preferred_channel="Retail/Grocery"` | 6.9010256 |
| Grocery channel-fit factor | `=6.9010256/7.2116667` | 0.9569252 |
| Price factor at €2.19 | `=51.7/61.7` | 0.8379254 |
| Raw unit scenario | `=104476.32*0.9569252*0.8379254` | 83,772.4549 |
| Displayed year-one units | `=ROUND(83772.4549,-2)` | **83,800** |
| Retail revenue | `=83800*2.19` | **€183,522** |
| Unit contribution | `€0.63` from the €2.19 Retail/Grocery row in `price_test_results.csv` | €0.63 |
| Contribution | `=83800*0.63` | **€52,794** |

## Worked example B — DTC Online at €2.19

| Calculation | Excel formula | Result |
|---|---|---:|
| Clean historical DTC units | Sum `units_sold` for `DTC Online` after removing exact duplicate rows | 382,381 |
| Annualised home-market benchmark | `=382381/78*52` | 254,920.6667 |
| German channel base | `=254920.6667*0.52*0.50` | 66,279.3733 |
| Overall German survey intent | Average all 420 intent values | 7.2116667 |
| DTC-preferrer intent | Average the 119 rows where `preferred_channel="DTC Online"` | 7.7941176 |
| DTC channel-fit factor | `=7.7941176/7.2116667` | 1.0807651 |
| Price factor at €2.19 | `=51.7/61.7` | 0.8379254 |
| Raw unit scenario | `=66279.3733*1.0807651*0.8379254` | 60,022.6388 |
| Displayed year-one units | `=ROUND(60022.6388,-2)` | **60,000** |
| Retail revenue | `=60000*2.19` | **€131,400** |
| Unit contribution | `€1.16` from the €2.19 DTC row in `price_test_results.csv` | €1.16 |
| Contribution | `=60000*1.16` | **€69,600** |

## Reproduction check

1. Run `node scripts/prepare-data.js` from the repository root.
2. Open `public/derived.json`.
3. Confirm that `scenarios["Retail/Grocery"]["2.19"]` equals 83,800 units,
   €183,522 revenue, and €52,794 contribution.
4. Confirm that `scenarios["DTC Online"]["2.19"]` equals 60,000 units,
   €131,400 revenue, and €69,600 contribution.

The result is a scenario, not a German sales forecast: LUMEN has no German
sales history. NL/DK/SE figures are comparable-market benchmarks only.


## Step 5 — presentation verification (2026-09-11)

- PASS: All 18 channel × price × objective combinations checked in the browser using native selectors and keyboard activation. Each rendered exactly one chart with three bars, the correct channel and metric, and the correct selected price.
- PASS: Browser console contained zero errors or warnings during these checks.
- PASS: Reading order is recommendation, controls, results, targeting, chart, assumptions.
- PASS: Assumptions begin alongside the initial page content on a wide layout (observed top: 665 CSS pixels); narrower layouts require scrolling to preserve readable text.
- PASS: Chart reads the existing aggregate scenarios; no chart dependency or additional data request was added.
- PASS: Recommendation module and derived.json are unchanged. Scenario formulas and objective recommendation behavior remain unchanged.
- Step 6 privacy/deployment verification and README completion are pending, as requested.

## Supplied frontend adaptation — 11 September 2026

The three-page design uses the existing aggregate scenarios plus locally computed context. The sample frontend JSON was not copied. All nine tested scenario objects and the original targeting labels match merged main exactly. The worked examples above remain valid.

- PASS: All 18 channel/price/objective combinations, one-cent keyboard slider movement, and all six region selections checked in browser; no console errors/warnings.
- PASS: Country/channel weekly units and revenue independently recomputed from 702 deduplicated source rows (78 rows per country/channel). The 18 source-market weekly values and six German weekly values agree within rounding tolerance.
- PASS: Regional shares total 100%, allocated values total €9.1bn; Berlin is the largest named-city allocation. Five map markers and Other Germany use only case-supported regions.
- PASS: All eleven public assets are allowlisted, no record-level identifiers exported, and the sole browser data fetch remains ./derived.json.
- Interpolation: linear acceptance, units and per-can contribution between adjacent anchors, then units rounded to hundreds before money calculations. Tested anchor totals are returned directly, preserving the original figures.
- Example: DTC at €1.99 interpolates 65,800 units, 56.7% acceptance and €0.965 contribution per can; shelf revenue €130,942 and contribution €63,497. Recommendations rank tested prices only.
- Illustrative floors: DTC (0.62 + 0.35) / 0.971 = €0.99897; grocery 0.62 / 0.57 = €1.08772; Gym & Office 0.62 / 0.8 = €0.775. These exclude fixed/launch costs.
- The raw survey remains tracked publicly on GitHub. Website isolation does not make source records confidential. Live hosting is not verified.

## City dashboard refinement — 11 September 2026

Browser checks passed all 90 advisor combinations (five cities × three channels × three tested prices × two objectives), with exactly one advisor chart. All five market city selections and 15 city/channel competitor views passed. Comparable Markets shows exactly NL, DK, SE and Germany for each channel, with no city selector or city URL links. No browser console errors or warnings were reported. City figures are proportional scenario allocations, not observations; competitor prices remain channel-level case references, with missing single-can observations explicitly marked.

## Value mix — 15 September 2026

`node tests/value-mix.mjs` passes 505 city/weight rankings and independent scores for all candidates, endpoint identity, tie/constant-metric cases, missing/empty scenarios and tested-only pricing. Browser checks pass both endpoints and Apply recommendation in all five cities, keyboard 1% steps, partial-data exclusion and recovery, and disabled Apply for empty data. No console errors. Desktop 1280px: controls and results share a top edge; mobile 390px: results follow controls with no horizontal overflow. Existing aggregates unchanged; privacy checks pass.

Channel-share extension: unit tests cover all 15 city/tested-price splits, exact 100% displayed totals, proportional rounding, stable equal-share ties, missing-channel rejection and zero-total rejection. Existing 505 Value mix checks still pass.

## Compact workspace release — 15 September 2026

Calculation suite verifies top-three ordering for all 505 city/weight rankings. Browser: 15 city/objective apply flows, both endpoints in all five cities, native radio arrow navigation, exact match/disabled action and restoration after scenario edits, separate zero deltas after apply, equal chart bar widths, labeled zero scale, and full-width channel controls. Tied fixture shows three tied labels; partial and empty fixtures show unavailable states without crashes. Desktop1280 and mobile390/320 have no horizontal overflow; mobile results follow controls. No console errors. Data and recommendation formulas unchanged.
