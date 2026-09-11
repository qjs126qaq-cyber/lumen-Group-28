# LUMEN Germany Launch Advisor

A static decision dashboard for choosing a German launch channel, shelf price and timing. It compares transparent year-one scenarios using the supplied case data. **LUMEN has no German sales history: these are planning scenarios, not forecasts.**

## What the app recommends and why

The recommendation banner ranks all nine channel/price combinations using the selected objective:

| Objective | Current recommendation | Reason |
| --- | --- | --- |
| Market share (default) | Retail/Grocery at €1.79 | Highest estimated volume: 100,000 units. Units are a proxy for reach, not measured market share. |
| Profitability | DTC Online at €2.19 | Highest estimated annual contribution: €69,600. Contribution is not net profit. |

The launch window is mid-April to early May, ahead of the summer demand peak. The runner-up is the next scenario in the same ranking and can be another price in the same channel; it is not a recommended second launch channel.

Choose a channel and price to inspect its units, retail revenue and contribution. The single bar chart compares all three prices within that channel. Changing the objective changes the banner ranking and chart metric; it does not change the selected scenario's calculations. The targeting line identifies two survey segments for the selected channel.

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

The three tested shelf prices are €1.79, €2.19 and €2.59. No interpolation is used. Survey intent is not an observed purchase rate.

The current targeting score is the share **within each segment** preferring the channel, multiplied by that segment's overall mean purchase intent. The top two segment names are shown. This implementation differs from the brief's wording about a segment's share of channel-preferring respondents; Step 6 leaves it unchanged.

## Data-protection architecture

The local preparation script reads the supplied CSVs, including the survey file, but never uses names or email addresses in its calculations. It writes a small, reviewed aggregate JSON containing nine price/channel scenarios, segment names, competitor price ranges, seasonal indices, summary figures and assumptions. It exports no individual survey or weekly sales records.

The website consists of `index.html`, `styles.css`, `app.js`, `recommendation-logic.js` and `derived.json`. Its sole data request is `./derived.json`. It has no backend, database, analytics integration, login, cookies or browser storage. Selectors are kept in page memory. The local preparation and verification scripts necessarily read `data/`; the **no raw-data path** promise applies to browser and deployed runtime code, not these offline tools.

**Repository limitation:** this is a public workshop repository. The original `data/customer_survey.csv` is tracked and contains respondent IDs, names and email fields. Excluding it from the website does not remove it from GitHub or Git history. Session logs also remain in the repository. No claim is made that the repository is confidential or that the supplied identities have been independently verified as fictional. Removing historical source data or changing repository access would require a separate team decision.

## Deployment configuration

`vercel.json` selects a static project with no install/build command and `public` as its output directory. `.vercelignore` allows only `public/` and `vercel.json` in deployment uploads, excluding raw sources, scripts, prompt logs and briefs. For a Git import, the output-directory setting is the serving boundary; do not treat an upload ignore file as repository access control.

Import the repository into Vercel with the repository root as the project root, framework **Other**, output directory **public**, and no custom install/build command or environment variables. The committed aggregate file is used directly. Do not select the repository root as the static output directory. Configuration references: [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json) and [deployment exclusions](https://vercel.com/docs/deployments/vercel-ignore).

No live Vercel deployment was created or inspected in Step 6. After deployment, confirm the page loads and requests for `/data/customer_survey.csv`, `/scripts/build-derived.js` and `/prompts/` return 404, rather than source content. Repeat the browser control and console checks against that deployment.

## Verification checklist — 11 September 2026

Step 6 starts from merged Step 5 commit `9570f17` (PR #6). Results apply to the reviewed files, not future changes.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Static output contains no CSVs or source records | PASS | Exactly five allowlisted files; no symlinks, survey IDs as JSON strings, full names, emails or respondent/weekly field names. |
| `derived.json` contains only aggregates | PASS | Full JSON structure reviewed; nine scenarios, two segment labels per channel, 12 seasonal summaries and four competitor ranges. |
| Browser code cannot load `data/` | PASS | No raw-data paths or alternate transports; only fetch is `./derived.json`. Offline scripts are explicitly outside this runtime check. |
| Deploy configuration excludes raw source files | PASS (configuration) | Explicit `public` output and restricted upload allowlist; no backend or rewrites to sources. |
| No secrets detected in Git | PASS (signature scan) | Common token/private-key patterns and credential filenames checked in tracked files; reachable local historical blobs scanned. This is not a guarantee against every possible secret format. |
| Regeneration is reproducible | PASS | Fresh clone regeneration matches all committed aggregate values; only generation timestamp differs. |
| Raw CSVs remain unchanged by regeneration | PASS | Compared source file hashes before/after regeneration. |
| Fresh-clone run using these commands | PASS (local) | Static page and all four supporting assets return 200; raw-data/script/log routes return 404. |
| Controls and console | PASS (local) | Browser checks cover all 18 channel/price/objective combinations; exactly one chart with three bars and no console errors/warnings. |
| Raw survey data is confidential on GitHub | FAIL | Original raw records are already tracked in the public repository; website isolation cannot fix repository exposure. |
| Live hosted deployment | NOT TESTED | No live deployment URL or hosting settings were verified in this step. |

## Limitations

- German demand is unobserved. Comparable markets, the category share and the 50% entry scale may not predict a German launch.
- Stated preferences can differ from purchasing behavior. Sampling bias, uncertainty intervals, channel cannibalization and distribution capacity are not modeled.
- Retail revenue is shelf-price sales value, not necessarily LUMEN's receipts. Contribution does not deduct all fixed, launch or marketing costs and is not ROI or net profit.
- Only supplied tested prices and three channels are supported. Seasonality is a benchmark, not a weather forecast.
- Existing banner and targeting rules differ from the product brief as described above; no feature changes were made in Step 6.
- Missing/unreadable JSON or missing selected scenario values show an unavailable message. Validation is limited; arbitrary malformed replacement JSON is not supported. Run the verifier before publishing changed data.
- Small screens require scrolling to keep the text readable. The assumptions box follows the chart in the reading order.
- Local checks do not prove a live host uses this configuration. Public GitHub source data remains accessible regardless of website checks.

## Team workflow and workshop record

This team repository is forked from the ATELIA × ESCP case template. The case brief is in [LUMEN_Case_Brief.md](LUMEN_Case_Brief.md) and the data dictionary in [data/README_data.md](data/README_data.md).

Pull current `main` before starting a task. Keep changes small, commit the code and the relevant session log on a task branch, open a pull request, then merge it for the work to land on `main`. Follow the session logging instructions in `AGENTS.md`; each student's prompts belong under `prompts/<student-id>/`. Prompt logs are outside the website output.

## How we worked with AI
