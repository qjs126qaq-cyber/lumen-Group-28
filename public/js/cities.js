import { cityOptions, rememberCity, escapeHtml, fmt } from './data.js';

export function renderCityChooser(data, city, onChange) {
  const host = document.getElementById('city-options');
  host.innerHTML = cityOptions(data).map(c => `<button type="button" class="city-card" data-city="${escapeHtml(c.name)}" aria-pressed="${c.name === city.name}">
    <span class="city-name">${escapeHtml(c.name)}</span><strong>${fmt.eur(c.market_size_m * 1e6)}</strong>
    <span>${(c.share*100).toFixed(0)}% of case market · ${(c.growth*100).toFixed(0)}% assumed growth</span></button>`).join('');
  host.onclick = e => {
    const button = e.target.closest('[data-city]');
    if (!button) return;
    const chosen = cityOptions(data).find(c => c.name === button.dataset.city);
    onChange(chosen);
  };
  rememberCity(city);
}

export function renderCategories(data, city) {
  document.getElementById('category-title').textContent = city.name + ' · functional-beverage categories';
  document.getElementById('category-cards').innerHTML = data.categories.map(c => `<article class="category-card"><h3>${escapeHtml(c.name)}</h3>
    <strong>${fmt.eur(c.marketEur * city.share)}</strong><p>${fmt.pct(c.share)} of allocated market</p></article>`).join('');
  document.getElementById('category-note').textContent = 'Illustrative allocation: national category value × ' + (city.share*100).toFixed(0) + '% ' + city.name + ' share. The case does not provide measured city-by-category sales; the national category mix is assumed in each city.';
}

export function renderCompetitors(data, channel, city, price = 2.19) {
  const group = data.competitorChannels.find(c => c.channel === channel);
  document.getElementById('competitor-title').textContent = 'Four competitor brands · ' + channel;
  document.getElementById('competitor-table').innerHTML = `<thead><tr><th scope="col">Brand</th><th scope="col">Single can · 330ml</th><th scope="col">LUMEN price minus competitor</th></tr></thead><tbody>${group.competitors.map(c=>`<tr><th scope="row">${escapeHtml(c.name)}</th><td>${c.singleCanPriceEur === null ? 'Not supplied' : fmt.eur2(c.singleCanPriceEur)}</td><td>${c.singleCanPriceEur === null ? '—' : (price-c.singleCanPriceEur >= 0 ? '+' : '−') + fmt.eur2(Math.abs(price-c.singleCanPriceEur))}</td></tr>`).join('')}</tbody>`;
  document.getElementById('competitor-note').textContent = 'Reference for ' + city.name + ': supplied case prices by channel, not observed local store prices. LUMEN comparison price: ' + fmt.eur2(price) + '. Missing brand/channel observations remain blank; prices are not invented. Pack offers are excluded for a consistent single-can comparison.';
}
