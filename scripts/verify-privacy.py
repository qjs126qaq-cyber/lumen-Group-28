#!/usr/bin/env python3
"""Offline release checks. Reports paths/counts only, never sensitive values."""
import csv
import json
import math
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
failures = []

def check(ok, label):
    print(('PASS' if ok else 'FAIL') + ': ' + label)
    if not ok:
        failures.append(label)

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def keys(value, allowed):
    return isinstance(value, dict) and set(value) == set(allowed.split())

files = [p for p in PUBLIC.rglob('*') if p.is_file()]
allowed_files = {'index.html', 'market.html', 'benchmarks.html', 'css/styles.css', 'js/advisor.js', 'js/data.js', 'js/logic.js', 'js/market.js', 'js/benchmarks.js', 'js/cities.js', 'recommendation-logic.js', 'derived.json'}
check({p.relative_to(PUBLIC).as_posix() for p in files} == allowed_files
      and not any(p.is_symlink() for p in PUBLIC.rglob('*')),
      'Static output contains only twelve expected assets, no CSVs or symlinks')
d = json.loads((PUBLIC / 'derived.json').read_text())
shape = keys(d, 'meta summary channels pricesEur scenarios topSegmentsByChannel seasonality competitorSummary assumptions channelDetails benchmarks regions recommendedRegion categories competitorChannels')
shape &= keys(d['meta'], 'generatedAt methodVersion caveat')
shape &= keys(d['summary'], 'germanFunctionalMarketEur2026 relevantCategoryShare entryScaleAssumption cleanedHistoricalSalesRows removedDuplicateHistoricalSalesRows launchWindow recommendation')
channels = ['DTC Online', 'Retail/Grocery', 'Gym & Office']
shape &= d['channels'] == channels and d['pricesEur'] == [1.79, 2.19, 2.59]
shape &= set(d['scenarios']) == set(channels) and set(d['topSegmentsByChannel']) == set(channels)
for channel in channels:
    shape &= set(d['scenarios'][channel]) == {'1.79', '2.19', '2.59'}
    for scenario in d['scenarios'][channel].values():
        shape &= keys(scenario, 'acceptancePct estimatedYear1Units retailRevenueEur contributionEur unitContributionEur contributionMarginPct')
        shape &= all(isinstance(v, (int, float)) and math.isfinite(v) and v >= 0 for v in scenario.values())
    shape &= len(d['topSegmentsByChannel'][channel]) == 2
shape &= len(d['seasonality']) == 12 and all(keys(x, 'month index shareOfYear') for x in d['seasonality'])
shape &= len(d['competitorSummary']) == 4 and all(keys(x, 'name minPriceEur maxPriceEur') for x in d['competitorSummary'])
shape &= all(isinstance(x, str) for x in d['assumptions'])

shape &= set(d['channelDetails']) == set(channels)
for detail in d['channelDetails'].values():
    shape &= keys(detail, 'id floorPriceEur topSegments')
    shape &= len(detail['topSegments']) == 2 and all(keys(x, 'name intent') for x in detail['topSegments'])
shape &= keys(d['benchmarks'], 'referencePriceEur note channels') and len(d['benchmarks']['channels']) == 3
for b in d['benchmarks']['channels']:
    shape &= keys(b, 'id label actuals germany_estimate') and set(b['actuals']) == {'NL', 'DK', 'SE'}
    shape &= all(keys(x, 'units_wk revenue_wk') for x in [*b['actuals'].values(), b['germany_estimate']])
shape &= len(d['regions']) == 6 and all(keys(r, 'name x y market_size_m share growth note') for r in d['regions'])
shape &= abs(sum(r['share'] for r in d['regions']) - 1) < 1e-9
shape &= len(d['categories']) == 4 and all(keys(c, 'name marketEur share') for c in d['categories'])
shape &= len(d['competitorChannels']) == 3
for group in d['competitorChannels']:
    shape &= keys(group, 'channel competitors') and len(group['competitors']) == 4
    shape &= all(keys(c, 'name singleCanPriceEur minPriceEur maxPriceEur') for c in group['competitors'])
check(shape, 'Derived JSON has only the reviewed aggregate structure (nine scenarios)')

with (ROOT / 'data/customer_survey.csv').open() as f:
    survey = list(csv.DictReader(f))
identifiers = {r[k] for r in survey for k in ['respondent_id', 'email'] if r[k]}
full_names = {r['first_name'] + ' ' + r['last_name'] for r in survey}
public_text = '\n'.join(p.read_text() for p in files)
# Numeric respondent IDs can coincide with legitimate aggregate numbers.
# Check exact JSON string values for IDs; check text for names and emails.
def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)

leaks = set(strings(d)) & identifiers
leaks |= {v for v in full_names | {r['email'] for r in survey} if v and v in public_text}
forbidden_fields = r'\b(respondent_id|first_name|last_name|email|week_start_date|units_sold|promo_active)\b'
check(not leaks and not re.search(forbidden_fields, public_text),
      'No survey IDs, emails, full names, or respondent/weekly field names in output')
code = '\n'.join(p.read_text() for p in files if p.suffix in {'.js', '.html', '.css'})
check(not re.search(r'data/|\.csv\b|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|document\.cookie', code),
      'Browser code has no raw-data paths, alternate transports, or persistent storage')
check(re.findall(r'fetch\(\s*[\'"]([^\'"]+)', code) == ['./derived.json'],
      'Only browser fetch target is ./derived.json')
config = json.loads((ROOT / 'vercel.json').read_text())
check(config.get('outputDirectory') == 'public' and config.get('framework') is None
      and config.get('buildCommand') == '' and config.get('installCommand') == ''
      and not any(k in config for k in ['rewrites', 'routes', 'functions', 'builds']),
      'Deployment serves public only; no build, backend, or route to raw sources')
ignore = [x.strip() for x in (ROOT / '.vercelignore').read_text().splitlines() if x.strip() and not x.startswith('#')]
check(ignore == ['/*', '!/public', '!/vercel.json'], 'Deployment upload allowlist excludes data, scripts, prompts and briefs')

tracked = git('ls-files', '-z').decode().split('\0')[:-1]
secret_pattern = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bAKIA[A-Z0-9]{16}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b|(?:api[_-]?key|secret|password|token)\s*[:=]\s*[\'"][A-Za-z0-9_+/=-]{16,}[\'"]', re.I)
secret_files = [p for p in tracked if (ROOT / p).is_file() and secret_pattern.search((ROOT / p).read_bytes())]
credential_files = [p for p in tracked if Path(p).name in {'.env', 'id_rsa', 'id_ed25519', '.npmrc'} or (Path(p).name.startswith('.env.') and Path(p).name != '.env.example')]
check(not secret_files and not credential_files, 'Tracked working tree: no common secret signatures or credential files detected')
# Scan unique historical blobs without printing their contents.
blob_ids = set()
for line in git('rev-list', '--objects', '--all').decode().splitlines():
    oid = line.split(' ', 1)[0]
    if git('cat-file', '-t', oid).strip() == b'blob':
        blob_ids.add(oid)
historical_hits = sum(bool(secret_pattern.search(git('cat-file', 'blob', oid))) for oid in blob_ids)
check(historical_hits == 0, 'Reachable local Git history: no common secret signatures detected')
print('NOTE: Signature scanning is not proof that every possible secret is absent.')
print('LIMITATION: Raw survey records are tracked in the public GitHub repository; website isolation does not make that repository confidential.')
if failures:
    sys.exit(1)
print('All automated website-release checks passed. Live hosting must be checked separately.')
