# LUMEN Germany Launch Advisor

A three-page static decision dashboard for choosing a German launch city, channel, shelf price and timing. It compares transparent year-one scenarios using the supplied case data. **LUMEN has no German sales history: these are planning scenarios, not forecasts.**

## What the app recommends and why

The recommendation banner ranks all nine channel/price combinations using the selected objective:

| Objective | Current recommendation | Reason |
| --- | --- | --- |
| Market share (default) | Retail/Grocery at €1.79 | Highest estimated volume: 18,000 units in the default Berlin allocation (100,000 nationally). Units are a proxy for reach, not measured market share. |
| Profitability | DTC Online at €2.19 | Highest estimated annual contribution: €12,528 in Berlin (€69,600 nationally). Contribution is not net profit. |

**Balance profit & reach** adds a third objective with a profitability weight from 0% to 100%, initially 50%. The other weight is its complement. For the selected city, each complete tested channel/price candidate receives two min–max normalized metrics: estimated contribution and estimated units. The score is `weight × normalized contribution + (1 − weight) × normalized units`. Normalization uses the same full candidate set for both metrics, across all channels and tested prices. This is a relative preference score, not a forecast, probability or measured market share.

Incomplete/non-finite scenarios are excluded for every objective; units must be nonnegative and acceptance between zero and one. An equal-valued metric receives zero for all candidates. Exact ties retain the case channel order and then tested-price order. Balance profit & reach endpoints rank on the corresponding raw metric, preserving the single-objective recommendations even with ties. With no valid candidates, the recommendation is unavailable and Apply recommendation is disabled. Intermediate scenario prices still use the existing interpolation and are never recommended.

The navy **Recommended launch** panel is separate from **Your scenario**. **Apply recommendation** sets the scenario's channel and tested price, keeping the selected city and objective. Differences are shown as scenario minus recommendation for estimated units and contribution. In Balance profit & reach mode, the single chart shows the globally normalized weighted scores for the selected channel, using a fixed 0–1 scale. Scenario estimates themselves do not change when preference weights change.

The **Estimated channel shares** panel compares all three channels at the recommended tested price for the selected city. Each share is channel estimated units divided by the sum of channel estimated units; largest-remainder rounding to one decimal makes the displayed shares total exactly 100%. These are indicative volume shares, not an optimized allocation or marketing budget split. Combining the standalone channel scenarios assumes no sales displacement between channels; their sum is not a validated total-sales forecast. Objective weights affect this panel only if the recommended price changes. A missing channel estimate or zero total makes the mix unavailable.

The launch window is mid-April to early May, ahead of the summer demand peak.

Choose a city, channel and price to inspect its units, retail revenue and contribution. The Price comparison chart compares all three tested prices within that channel, with equal-width bars, a labeled vertical scale and a zero baseline. Gold marks the selected price; an outline and badge identify the recommended launch if it belongs to the selected channel. Changing the objective changes the banner ranking and chart metric; it does not change the selected scenario's calculations. The targeting line identifies two survey segments for the selected channel.

**Existing methodology difference:** the product brief and the stored summary recommend €2.19 with DTC Online and Gym & Office first, subject to acceptance and contribution constraints. The current banner instead ranks scenarios solely by the objective above. Step 6 documents this existing behavior and does not change recommendation logic.

## Run from a fresh clone

Prerequisites: Git and Python 3.9 or later. To regenerate aggregates, also install Node.js 18 or later. There are no third-party packages, API keys or environment variables to configure.

```sh
git clone https://github.com/qjs126qaq-cyber/lumen-Group-28.git
cd lumen-Group-28
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open http://127.0.0.1:8000 in a modern browser. Stop the server with Ctrl+C. If port 8000 is occupied, use another port and change the URL accordingly. On Windows, `py -3` may replace `python3`.

Serve **only `public/`**, never the repository root. Opening `index.html` directly as a file will not reliably load the JavaScript modules and JSON. The precomputed JSON is committed, so Node.js is not needed to view the dashboard.

## Regenerate and verify

From the repository root:

```sh
node scripts/prepare-data.js
python3 scripts/verify-privacy.py
```

The first command reads the case CSVs locally and rewrites only `public/derived.json`; `scripts/build-derived.js` contains the implementation. No package installation is needed. The generation timestamp changes on each run. The second command checks the output allowlist, reviewed JSON structure, identifier leakage, browser data access, deployment configuration and common secret signatures in tracked files and reachable local Git history. It prints no source records or secret values, and exits nonzero for a failed automated website check.

After regeneration, review the JSON diff before committing. On the supplied data, all aggregate values reproduce the committed version. See [verification.md](verification.md) for worked DTC and grocery calculations.

## Methodology and assumptions

1. Remove four exact duplicate weekly sales rows, leaving 702 rows from the Netherlands, Denmark and Sweden. Convert each channel's total from 78 weeks to 52 weeks.
2. Multiply the annual benchmark by 52%, the relevant categories' share of the €9.1 billion German functional-beverage market, and by a **50% entry-scale assumption** for a new launch with limited distribution and awareness. This scaling is a planning choice, not a fitted forecast.
3. Adjust for German stated price acceptance relative to the best-tested acceptance (61.7% at €1.79), and for mean purchase intent among channel-preferring respondents relative to the overall survey mean.
4. Round estimated units to the nearest 100. Multiply those units by the shelf price for retail revenue, and by the tested per-can channel contribution for contribution; monetary totals are rounded to whole euros.
5. Use seasonal indices to guide timing and distribute a complete year, never to inflate annual volume.

The three tested shelf prices are €1.79, €2.19 and €2.59. Between-price slider positions linearly interpolate acceptance, units and per-can contribution between adjacent anchors. Units are rounded to hundreds before calculating whole-euro revenue and contribution. These exploratory estimates are labelled and never used to select the recommendation. National tested prices retain the original precomputed figures; city anchors apply the allocation described below. Survey intent is not an observed purchase rate.

### Additional case views

- **Launch Advisor:** the supplied frontend design has been adapted to the verified scenarios, with direct tested-price buttons, a keyboard-operable slider, one comparison chart, targeting and assumptions. Approximate variable-cost break-even shelf prices use `(€0.62 COGS + fulfilment cost) / (1 − retailer margin − distributor cut − payment fee)` from the case. Rates are additive shares of shelf price, consistent with the illustrative channel table. These thresholds exclude fixed and launch costs and do not replace tested contribution values.
- **City Markets:** all five named cities from the case are included: Berlin, Munich, Hamburg, Cologne and Frankfurt. City cards replace the map. Other Germany is separately explained as the remaining 40%, not a sixth city. Market allocation is `€9.1bn × regional share`. Four category cards allocate each national category value using the selected city's share. This assumes an identical category mix across cities; the case does not contain measured city-by-category sales.
- **City scenarios in the advisor:** a compact Launch city control sits alongside channel, price and objective. National anchor units are multiplied by the case city share and rounded to hundreds; shelf revenue and contribution are recalculated from those units. Price acceptance, per-can contribution and targeting remain national assumptions. City selection is shared between the advisor and market tab through URL links. It is absent from Comparable Markets.
- **Four competitor brands by channel:** the City Markets table shows the supplied single-can (330ml) prices for PulsUp, Mate Libre, VoltFit and Root & Rise. Missing brand/channel prices are marked “Not supplied”; pack offers are excluded. These are case reference prices by channel, not observed prices in each city.
- **Comparable Markets:** for each channel and source country, deduplicated units and revenue are divided by 78 weeks. The German comparison is explicitly fixed at €2.19 and divides the existing year-one scenario by 52. It is a reference comparison and does not inherit the advisor's slider state. Source-country revenue includes historical prices/promotions, so differences are not pure demand effects.

The supplied frontend's placeholder JSON is not deployed. The preparation script extends the existing aggregate contract with `channelDetails`, `benchmarks`, `regions`, `recommendedRegion`, `categories` and `competitorChannels`; `js/data.js` adapts that contract to the shared frontend view model.

The current targeting score is the share **within each segment** preferring the channel, multiplied by that segment's overall mean purchase intent. The top two segment names are shown. This implementation differs from the brief's wording about a segment's share of channel-preferring respondents; Step 6 leaves it unchanged.

## Data-protection architecture

The local preparation script reads the supplied CSVs, including the survey file, but never uses names or email addresses in its calculations. It writes a small, reviewed aggregate JSON containing nine price/channel scenarios, segment names, competitor price ranges, seasonal indices, summary figures and assumptions. It exports no individual survey or weekly sales records.

The website consists of three HTML pages, shared `css/styles.css`, six modules under `js/`, the retained `recommendation-logic.js` reference module and `derived.json` (twelve allowlisted files). Its sole data request is `./derived.json`. It has no backend, database, analytics integration, login, cookies or browser storage. Channel, price and objective are kept in page memory; city selection is kept in the URL for the advisor and market tab. The local preparation and verification scripts necessarily read `data/`; the **no raw-data path** promise applies to browser and deployed runtime code, not these offline tools.

**Repository limitation:** this is a public workshop repository. The original `data/customer_survey.csv` is tracked and contains respondent IDs, names and email fields. Excluding it from the website does not remove it from GitHub or Git history. Session logs also remain in the repository. No claim is made that the repository is confidential or that the supplied identities have been independently verified as fictional. Removing historical source data or changing repository access would require a separate team decision.

## Deployment configuration

`vercel.json` selects a static project with no install/build command and `public` as its output directory. `.vercelignore` allows only `public/` and `vercel.json` in deployment uploads, excluding raw sources, scripts, prompt logs and briefs. For a Git import, the output-directory setting is the serving boundary; do not treat an upload ignore file as repository access control.

Import the repository into Vercel with the repository root as the project root, framework **Other**, output directory **public**, and no custom install/build command or environment variables. The committed aggregate file is used directly. Do not select the repository root as the static output directory. Configuration references: [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json) and [deployment exclusions](https://vercel.com/docs/deployments/vercel-ignore).

No live Vercel deployment was created or inspected in this adaptation. After deployment, confirm the page loads and requests for `/data/customer_survey.csv`, `/scripts/build-derived.js` and `/prompts/` return 404, rather than source content. Repeat the browser control and console checks against that deployment.

## Verification checklist — 11 September 2026

The frontend adaptation starts from merged Step 6 commit `fb793a6` (PR #7). Checks were rerun for the three-page frontend on 11 September 2026. Results apply to the reviewed files, not future changes.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Static output contains no CSVs or source records | PASS | Exactly twelve allowlisted files; no symlinks, survey IDs as JSON strings, full names, emails or respondent/weekly field names. |
| `derived.json` contains only aggregates | PASS | Full JSON structure reviewed; nine scenarios, two segment summaries per channel, 12 seasonal summaries, four competitor ranges, 12 brand/channel summaries, four national category totals, six illustrative regional allocations and weekly country/channel aggregates. |
| Browser code cannot load `data/` | PASS | No raw-data paths or alternate transports; only fetch is `./derived.json`. Offline scripts are explicitly outside this runtime check. |
| Deploy configuration excludes raw source files | PASS (configuration) | Explicit `public` output and restricted upload allowlist; no backend or rewrites to sources. |
| No secrets detected in Git | PASS (signature scan) | Common token/private-key patterns and credential filenames checked in tracked files; reachable local historical blobs scanned. This is not a guarantee against every possible secret format. |
| Regeneration is reproducible | PASS | Fresh clone regeneration matches all committed aggregate values; only generation timestamp differs. |
| Raw CSVs remain unchanged by regeneration | PASS | Compared source file hashes before/after regeneration. |
| Fresh-clone run using these commands | PASS (local) | Static three pages and supporting assets return 200; raw-data/script/log routes return 404. |
| Controls and console | PASS (local) | Browser checks cover all 90 city/channel/price/objective combinations, slider keyboard interpolation, five city category views, 15 city/channel competitor views and country-only benchmarks; one chart on the advisor, and no console errors/warnings. |
| Raw survey data is confidential on GitHub | FAIL | Original raw records are already tracked in the public repository; website isolation cannot fix repository exposure. |
| Live hosted deployment | NOT TESTED | No live deployment URL or hosting settings were verified in this step. |

## Limitations

- German demand is unobserved. Comparable markets, the category share and the 50% entry scale may not predict a German launch.
- Stated preferences can differ from purchasing behavior. Sampling bias, uncertainty intervals, channel cannibalization and distribution capacity are not modeled.
- Retail revenue is shelf-price sales value, not necessarily LUMEN's receipts. Contribution does not deduct all fixed, launch or marketing costs and is not ROI or net profit.
- Recommendations use only supplied tested prices and three channels. Intermediate slider values are exploratory linear estimates. Seasonality is a benchmark, not a weather forecast.
- Existing banner and targeting rules differ from the product brief as described above; no feature changes were made in Step 6.
- Missing/unreadable JSON shows an unavailable message. Incomplete selected scenarios are unavailable while other valid candidates can still be ranked. Validation is limited; arbitrary malformed replacement JSON is not supported. Run the verifier before publishing changed data.
- The city selector sits beside the title. Desktop places the navy recommendation panel beside scenario controls, results and the chart; mobile stacks them. Estimate caveats stay visible; detailed methodology is expandable below the scenario.
- Local checks do not prove a live host uses this configuration. Public GitHub source data remains accessible regardless of website checks.

## Team workflow and workshop record

This team repository is forked from the ATELIA × ESCP case template. The case brief is in [LUMEN_Case_Brief.md](LUMEN_Case_Brief.md) and the data dictionary in [data/README_data.md](data/README_data.md).

Pull current `main` before starting a task. Keep changes small, commit the code and the relevant session log on a task branch, open a pull request, then merge it for the work to land on `main`. Follow the session logging instructions in `AGENTS.md`; each student's prompts belong under `prompts/<student-id>/`. Prompt logs are outside the website output.

## Balance profit & reach verification — 15 September 2026

Run `node tests/value-mix.mjs` from the repository root. The test uses only Node built-ins and the committed aggregate JSON. It independently checks all candidate scores and winners for 101 weights across five cities (505 rankings), original single-objective winners, endpoint equivalence, exact ties, equal metrics, partial/empty data, invalid weights and tested-only recommendations.

Browser verification covered keyboard weight changes, both endpoints and applying recommendations in all five cities, zero scenario differences after applying, partial-data recovery, disabled application for empty data, and no console errors. Desktop (1280px) places controls beside results; mobile (390px) stacks them without horizontal overflow. Aggregate JSON is unchanged, and the existing website privacy verifier passes. These are local checks; this branch has not been deployed.

## Compact decision workspace — 15 September 2026

The native objective, channel and tested-price radio groups support keyboard selection. The selected city applies to the whole page. “Estimated contribution” consistently means contribution after variable product/channel costs, excluding fixed and launch costs.

The recommendation explains its units/contribution trade-off against the volume-maximizing launch; when that is the recommendation itself, it compares with the contribution-maximizing launch. A compact top-three table uses the existing ranking and identifies exact tied scores. Scores are rounded for display only. The scenario shows separate signed units and contribution differences without good/bad color coding. Matching the recommended channel and exact tested price in the current city displays “You’re viewing the recommended launch.” and disables “Recommendation applied”; changing the scenario restores the action.

Estimated channel shares follow the main tool and appear as a segmented horizontal bar with names, rounded percentages and estimated units. Their no-cannibalization assumption and non-optimized status remain visible; detailed calculations are expandable. Competitor brands appear only in City Markets.

Validation: calculation tests verify all candidate scores and the top three for 505 city/weight combinations, plus 15 channel-share splits and missing-data/tie cases. Browser checks cover 15 city/objective apply flows, both weighting endpoints for five cities, radio arrow keys, interpolation, equal bar widths, full-width channel controls, tied-score labels, missing and empty data, and 1280px/390px/320px layouts. No console errors or horizontal overflow were found. Privacy checks pass; `derived.json` is unchanged. These checks verify the local app, not the live hosting configuration.

## How we worked with AI

The project was developed mainly on **Léon’s computer**, but it was a collaborative effort by the five active members working together. The initial structure was largely AI-generated, and we collectively refined it through our inputs and iterations. **Léon** consolidated the team’s ideas into prompts and iterated with the AI. **Raphaël** added privacy-safe data preparation artifacts and checked how the data was used. **Jiashuo** provided insights on comparable markets and how NL/DK/SE could inform the German case. **Yuchen** contributed ideas on German city selection and differences in market potential. **Riccardo Sauteur** focused on pricing and channel insights and how these should influence the recommendations. **Raphael YKHLEF did not attend the working sessions or contribute to the project.**
