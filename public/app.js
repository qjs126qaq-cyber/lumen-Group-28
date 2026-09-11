(() => {
  const channelSelect = document.querySelector('#channel-select');
  const priceSelect = document.querySelector('#price-select');
  const status = document.querySelector('#status');
  const units = document.querySelector('#units');
  const revenue = document.querySelector('#revenue');
  const contribution = document.querySelector('#contribution');
  const formatNumber = new Intl.NumberFormat('en-GB');
  const formatEuro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  let derived;

  function resetResults(message = '') {
    units.textContent = 'n/a';
    revenue.textContent = 'n/a';
    contribution.textContent = 'n/a';
    status.textContent = message;
  }

  function isValid(data) {
    return data && Array.isArray(data.channels) && Array.isArray(data.pricesEur) && data.scenarios && typeof data.scenarios === 'object';
  }

  function updateResults() {
    const scenario = derived?.scenarios?.[channelSelect.value]?.[priceSelect.value];
    if (!scenario || !Number.isFinite(scenario.estimatedYear1Units) || !Number.isFinite(scenario.retailRevenueEur) || !Number.isFinite(scenario.contributionEur)) {
      resetResults('Results are unavailable. Please check derived.json and refresh.');
      return;
    }
    status.textContent = '';
    units.textContent = formatNumber.format(scenario.estimatedYear1Units);
    revenue.textContent = formatEuro.format(scenario.retailRevenueEur);
    contribution.textContent = formatEuro.format(scenario.contributionEur);
  }

  async function load() {
    try {
      const response = await fetch('./derived.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load data');
      const data = await response.json();
      if (!isValid(data)) throw new Error('Malformed data');
      derived = data;
      updateResults();
    } catch {
      resetResults('Results are unavailable. Please check derived.json and refresh.');
    }
  }

  channelSelect.addEventListener('change', updateResults);
  priceSelect.addEventListener('change', updateResults);
  load();
})();
