import { loadDerived, renderError, currentCity } from './data.js';
import { renderCityChooser, renderCategories, renderCompetitors } from './cities.js';

init().catch(renderError);
async function init() {
  const data = await loadDerived();
  let city = currentCity(data);
  const select = document.getElementById('market-channel');
  data.channels.forEach(c => { const option = document.createElement('option'); option.value = c.label; option.textContent = c.label; select.append(option); });
  select.value = 'Retail/Grocery';
  const render = () => {
    renderCityChooser(data, city, chosen => { city = chosen; render(); });
    renderCategories(data, city);
    renderCompetitors(data, select.value, city);
  };
  select.addEventListener('change', render);
  render();
}
