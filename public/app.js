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
  let derived;
  let objective = 'market-share';

  function resetResults(message = '') {
    units.textContent = revenue.textContent = contribution.textContent = 'n/a';
    status.textContent = message;
    recommendationText.textContent = 'Recommendation unavailable.';
    runnerUp.textContent = targetLine.textContent = '';
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
  async function load() { try { const response = await fetch('./derived.json', { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); if (!isValid(data)) throw new Error(); derived = data; updateResults(); } catch { resetResults('Results are unavailable. Please check derived.json and refresh.'); } }
  channelSelect.addEventListener('change', updateResults);
  priceSelect.addEventListener('change', updateResults);
  objectiveButtons.forEach((button) => button.addEventListener('click', () => { objective = button.dataset.objective; objectiveButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button))); updateRecommendation(); }));
  load();
})();
