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

