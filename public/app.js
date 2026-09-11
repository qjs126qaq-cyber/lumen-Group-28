import { launchWindow, recommend } from './recommendation-logic.js';

(() => {
  const channelSelect = document.querySelector('#channel-select');
  const priceSelect = document.querySelector('#price-select');
  const status = document.querySelector('#status');
  const units = document.querySelector('#units');
  const revenue = document.querySelector('#revenue');
  const contribution = document.querySelector('#contribution');
  const recommendationText = document.querySelector('#recommendation-text');
  const runnerUp = document.querySelector('#runner-up');
  const targetLine = document.querySelector('#target-line');
  const objectiveButtons = [...document.querySelectorAll('[data-objective]')];
  const formatNumber = new Intl.NumberFormat('en-GB');
  const formatEuro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const chart = document.querySelector('#price-chart');
  const chartContext = document.querySelector('#chart-context');
  let derived;
  let objective = 'market-share';

  function resetResults(message = '') {
    units.textContent = revenue.textContent = contribution.textContent = 'n/a';
    status.textContent = message;
    recommendationText.textContent = 'Recommendation unavailable.';
    runnerUp.textContent = targetLine.textContent = '';
    chart.replaceChildren();
    chartContext.textContent = 'Comparison unavailable.';
  }
  function isValid(data) { return data && Array.isArray(data.channels) && Array.isArray(data.pricesEur) && data.scenarios && typeof data.scenarios === 'object'; }
  function updateResults() {
    const scenario = derived?.scenarios?.[channelSelect.value]?.[priceSelect.value];
    if (!scenario || !Number.isFinite(scenario.estimatedYear1Units) || !Number.isFinite(scenario.retailRevenueEur) || !Number.isFinite(scenario.contributionEur)) return resetResults('Results are unavailable. Please check derived.json and refresh.');
    status.textContent = '';
    units.textContent = formatNumber.format(scenario.estimatedYear1Units);
    revenue.textContent = formatEuro.format(scenario.retailRevenueEur);
    contribution.textContent = formatEuro.format(scenario.contributionEur);
    updateRecommendation();
    updateChart();
  }
  function updateRecommendation() {
    if (!derived) return;
    const { metric, winner, runnerUp: second } = recommend(derived, objective);
    const show = (value) => metric === 'contributionEur' ? formatEuro.format(value) : formatNumber.format(value) + ' units';
    recommendationText.textContent = 'Recommend ' + winner.channel + ' at €' + winner.price + ', launching ' + launchWindow(derived) + ' (' + show(winner[metric]) + ').';
    runnerUp.textContent = 'Runner-up: ' + second.channel + ' at €' + second.price + ' (' + show(second[metric]) + ').';
    const segments = derived.topSegmentsByChannel?.[channelSelect.value];
    targetLine.textContent = Array.isArray(segments) ? 'Who to target: ' + segments.join(' and ') + '.' : 'Who to target: n/a.';
  }
  // Presentation only: compare the existing aggregate scenarios without changing them.
  function updateChart() {
    if (!derived) return;
    const metric = objective === 'profitability' ? 'contributionEur' : 'estimatedYear1Units';
    const rows = derived.pricesEur.map(price => ({ price, value: derived.scenarios[channelSelect.value][String(price)][metric] }));
    const max = Math.max(...rows.map(row => row.value));
    chartContext.textContent = channelSelect.value + ' · Estimated year-one ' + (metric === 'contributionEur' ? 'contribution (€)' : 'units');
    chart.replaceChildren(...rows.map(({ price, value }) => {
      const selected = String(price) === priceSelect.value;
      const row = document.createElement('div');
      row.className = 'bar-row' + (selected ? ' selected' : '');
      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = '€' + price.toFixed(2);
      const track = document.createElement('div');
      track.className = 'bar-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (max > 0 ? value / max * 100 : 0) + '%';
      track.append(fill);
      const amount = document.createElement('span');
      amount.className = 'bar-value';
      amount.textContent = metric === 'contributionEur' ? formatEuro.format(value) : formatNumber.format(value) + ' units';
      const tags = document.createElement('small');
      tags.textContent = [selected ? 'Selected' : '', value === max ? 'Leader' : ''].filter(Boolean).join(' · ');
      amount.append(tags);
      row.append(label, track, amount);
      return row;
    }));
    document.querySelector('#category-share').textContent = new Intl.NumberFormat('en-GB', { style: 'percent' }).format(derived.summary.relevantCategoryShare);
    document.querySelector('#entry-scale').textContent = new Intl.NumberFormat('en-GB', { style: 'percent' }).format(derived.summary.entryScaleAssumption);
  }
  async function load() { try { const response = await fetch('./derived.json', { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); if (!isValid(data)) throw new Error(); derived = data; updateResults(); } catch { resetResults('Results are unavailable. Please check derived.json and refresh.'); } }
  channelSelect.addEventListener('change', updateResults);
  priceSelect.addEventListener('change', updateResults);
  objectiveButtons.forEach((button) => button.addEventListener('click', () => { objective = button.dataset.objective; objectiveButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button))); updateRecommendation(); updateChart(); }));
  load();
})();
