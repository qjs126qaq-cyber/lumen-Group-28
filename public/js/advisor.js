/* Presentation and interaction only; reuse tested-price, city and ranking logic. */
import { loadDerived, renderError, fmt, escapeHtml, currentCity, cityOptions, rememberCity } from './data.js';
import { metricsAt, recommend, testedPriceAt, belowFloor, forCity, channelSalesMix } from './logic.js';
let sourceData, selectedCity, D, recommendation;
const state = { channelId: null, priceCents: 219, objective: 'share', profitabilityWeight: .5 };
const el = id => document.getElementById(id);
const price = () => state.priceCents / 100;
const channel = () => D.channels.find(c => c.id === state.channelId);
const matches = () => !!recommendation.winner && recommendation.winner.channel.id === state.channelId && recommendation.winner.metrics.price === price();
const signed = (n, money = false) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${money ? fmt.eur(Math.abs(n)) : fmt.int(Math.abs(n))}`;
const metricLabel = () => state.objective === 'mix' ? 'Balanced score (0–1)' : state.objective === 'share' ? 'Estimated units' : 'Estimated contribution (€)';
const scoreText = value => state.objective === 'mix' ? value.toFixed(3) : state.objective === 'share' ? fmt.int(value) : fmt.eur(value);
init().catch(renderError);
async function init() {
  sourceData = await loadDerived(); selectedCity = currentCity(sourceData);
  D = { ...sourceData, channels: forCity(sourceData.channels, selectedCity) };
  state.channelId = D.channels[0].id;
  state.priceCents = Math.round(D.prices[Math.floor(D.prices.length / 2)] * 100);
  el('city-select').innerHTML = cityOptions(sourceData).map(c => `<option>${escapeHtml(c.name)}</option>`).join('');
  el('city-select').value = selectedCity.name;
  el('channel-seg').innerHTML = D.channels.map(c => `<label class="choice"><input type="radio" name="channel" value="${escapeHtml(c.id)}"><span>${escapeHtml(c.label)}</span></label>`).join('');
  el('tested-prices').innerHTML = D.prices.map(p => `<label class="choice"><input type="radio" name="tested-price" value="${p}"><span>${fmt.eur2(p)}</span></label>`).join('');
  el('price-slider').min = Math.round(Math.min(...D.prices)*100);
  el('price-slider').max = Math.round(Math.max(...D.prices)*100);
  el('city-select').addEventListener('change', e => {
    selectedCity = cityOptions(sourceData).find(c => c.name === e.target.value);
    D = { ...sourceData, channels: forCity(sourceData.channels, selectedCity) }; render();
  });
  el('channel-seg').addEventListener('change', e => { state.channelId = e.target.value; render(); });
  el('objective-seg').addEventListener('change', e => { state.objective = e.target.value; render(); });
  el('tested-prices').addEventListener('change', e => { state.priceCents = Math.round(Number(e.target.value)*100); render(); });
  el('price-slider').addEventListener('input', e => { state.priceCents = Number(e.target.value); render(); });
  el('mix-slider').addEventListener('input', e => { state.profitabilityWeight = Number(e.target.value)/100; render(); });
  el('apply-recommendation').addEventListener('click', () => {
    if (!recommendation.winner) return;
    state.channelId = recommendation.winner.channel.id;
    state.priceCents = Math.round(recommendation.winner.metrics.price*100); render();
  });
  render();
}
function render() {
  rememberCity(selectedCity);
  recommendation = recommend(D.channels, D.prices, state.objective, state.profitabilityWeight);
  document.querySelectorAll('input[name="channel"]').forEach(r => r.checked = r.value === state.channelId);
  document.querySelectorAll('input[name="tested-price"]').forEach(r => r.checked = Number(r.value) === price());
  el('price-slider').value = state.priceCents;
  el('mix-control').hidden = state.objective !== 'mix';
  const weight = Math.round(state.profitabilityWeight*100);
  el('mix-percentages').textContent = `${weight}% profitability / ${100-weight}% reach`;
  el('mix-slider').setAttribute('aria-valuetext', el('mix-percentages').textContent);
  const tested = testedPriceAt(D.prices,price()) !== null;
  el('price-readout').textContent = fmt.eur2(price());
  el('price-mode').textContent = tested ? 'Tested price' : 'Interpolated estimate · not recommended';
  el('price-slider').setAttribute('aria-valuetext',`${fmt.eur2(price())} ${tested?'tested price':'interpolated estimate'}`);
  renderRecommendation(); renderScenario(); renderChart(); renderRanking(); renderShares();
}
function renderRecommendation() {
  const w = recommendation.winner, applied = matches();
  el('apply-recommendation').disabled = !w || applied;
  el('apply-recommendation').textContent = applied ? 'Recommendation applied' : 'Apply recommendation';
  el('scenario-match').textContent = applied ? 'You’re viewing the recommended launch.' : 'Explore a different launch or apply the recommendation.';
  if (!w) {
    el('banner-headline').textContent = 'Recommendation unavailable';
    el('banner-subline').textContent = 'No complete tested scenarios are available.';
    el('recommendation-metrics').textContent = el('recommendation-tradeoff').textContent = ''; return;
  }
  el('banner-headline').textContent = `${w.channel.label} · ${fmt.eur2(w.metrics.price)}`;
  el('recommendation-metrics').innerHTML = `<strong>${fmt.int(w.metrics.units)}</strong> estimated units<br><strong>${fmt.eur(w.metrics.contribution_total)}</strong> estimated contribution`;
  el('banner-subline').textContent = `${selectedCity.name} · ${state.objective === 'mix' ? `Balanced score ${w.mixScore.toFixed(3)} / 1. ` : ''}Launch ${D.seasonality.recommended_launch}. Contribution excludes fixed and launch costs.`;
  const volume = recommend(D.channels,D.prices,'share').winner;
  const same = volume.channel.id === w.channel.id && volume.metrics.price === w.metrics.price;
  const other = same ? recommend(D.channels,D.prices,'profit').winner : volume;
  if (other.channel.id === w.channel.id && other.metrics.price === w.metrics.price) {
    el('recommendation-tradeoff').textContent = 'This launch maximizes both estimated units and contribution among valid tested options.'; return;
  }
  el('recommendation-tradeoff').textContent = `Compared with the ${same?'contribution':'volume'}-maximizing launch (${other.channel.label}, ${fmt.eur2(other.metrics.price)}): ${signed(w.metrics.units-other.metrics.units)} estimated units and ${signed(w.metrics.contribution_total-other.metrics.contribution_total,true)} estimated contribution.`;
}
function renderScenario() {
  const ch = channel(), m = metricsAt(ch,D.prices,price()), w = recommendation.winner;
  if (!m) {
    el('results').textContent = 'Scenario unavailable: complete figures are missing.';
    el('scenario-difference').textContent = 'Comparison unavailable.';
    el('floor-note').textContent = el('target-line').textContent = ''; return;
  }
  el('results').innerHTML = [
    [fmt.int(m.units),'Estimated units'],[fmt.eur(m.contribution_total),'Estimated contribution'],
    [fmt.eur(m.revenue),'Estimated shelf revenue'],[fmt.pct(m.acceptance),'Survey acceptance']
  ].map(([value,label])=>`<div class="metric"><div class="value">${value}</div><div class="label">${label}</div></div>`).join('');
  el('scenario-difference').innerHTML = w ? `<p>Scenario minus recommendation</p><dl><div><dt>Estimated units</dt><dd>${signed(m.units-w.metrics.units)}</dd></div><div><dt>Estimated contribution</dt><dd>${signed(m.contribution_total-w.metrics.contribution_total,true)}</dd></div></dl>` : 'Comparison unavailable.';
  el('floor-note').textContent = `${fmt.eur2(m.contribution_per_unit)}/can estimated contribution. Excludes fixed and launch costs.${belowFloor(ch,price()) ? ' Below this channel’s variable-cost break-even price.' : ''}`;
  el('target-line').textContent = `Target: ${(ch.top_segments || []).map(s=>s.name).join(' and ')}. Based on national survey intent, not observed city purchases.`;
}
function renderRanking() {
  const rows = recommendation.options.slice(0,3);
  el('ranking-note').textContent = `${selectedCity.name} · ${metricLabel()}. Exact ties retain case channel order, then tested-price order. Balanced scores are shown to 3 decimals; rounded values can look equal without being tied.${recommendation.excluded ? ` ${recommendation.excluded} incomplete candidate(s) excluded.` : ''}`;
  el('ranking-table').innerHTML = `<caption class="sr-only">Top three tested launches for ${escapeHtml(selectedCity.name)}</caption><thead><tr><th scope="col">Rank / channel</th><th scope="col">Price</th><th scope="col">Estimated units</th><th scope="col">Estimated contribution</th><th scope="col">${escapeHtml(metricLabel())} score</th></tr></thead><tbody>${rows.map((r,i)=>{
    const tied = recommendation.options.some(o=>o!==r && o.value===r.value);
    return `<tr><th scope="row">${i+1}. ${escapeHtml(r.channel.label)}${tied?' <span class="tie-label">Tied score</span>':''}</th><td>${fmt.eur2(r.metrics.price)}</td><td>${fmt.int(r.metrics.units)}</td><td>${fmt.eur(r.metrics.contribution_total)}</td><td>${scoreText(r.value)}</td></tr>`;
  }).join('')}</tbody>`;
  if (!rows.length) el('ranking-note').textContent = 'No complete tested launches available.';
}
function renderChart() {
  const ch=channel(), mix=state.objective==='mix';
  el('chart-metric').textContent = `${metricLabel()} · ${ch.label}${mix?' · relative preference, not a forecast':''}`;
  const rows=D.prices.map(p=>({p, candidate:recommendation.options.find(o=>o.channel.id===ch.id&&o.metrics.price===p)}));
  const vals=rows.filter(r=>r.candidate).map(r=>r.candidate.value);
  const top=mix?1:Math.max(0,...vals), bottom=mix?0:Math.min(0,...vals);
  const max=top===bottom?1:top, span=max-bottom;
  // Include zero explicitly even if a future case contains negative contributions.
  const ticks=[max, (max+bottom)/2, bottom, 0].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>b-a);
  el('chart-axis').innerHTML=ticks.map(v=>`<span style="bottom:${(v-bottom)/span*100}%">${scoreText(v)}</span>`).join('');
  el('chart-bars').style.setProperty('--zero',`${(0-bottom)/span*100}%`);
  el('chart-bars').innerHTML=rows.map(({p,candidate})=>{
    const value=candidate?.value, selected=p===price(), recommended=candidate===recommendation.winner;
    const display=candidate?scoreText(value):'Unavailable';
    const height=candidate?Math.abs(value)/span*100:0;
    const start=candidate?(Math.min(0,value)-bottom)/span*100:(0-bottom)/span*100;
    const desc=`${fmt.eur2(p)}: ${metricLabel()} ${display}${selected?', selected':''}${recommended?', recommended launch':''}`;
    return `<div class="price-column" role="img" aria-label="${escapeHtml(desc)}"><div class="exact-value" aria-hidden="true">${display}</div><div class="plot-slot" aria-hidden="true"><div class="price-bar${selected?' selected':''}${recommended?' recommended':''}" style="height:${height}%;bottom:${start}%"></div></div><div class="price-label" aria-hidden="true">${fmt.eur2(p)}${selected?'<small>Selected</small>':''}${recommended?'<small class="rec-badge">Recommended</small>':''}</div></div>`;
  }).join('');
}
function renderShares() {
  const p=recommendation.winner?.metrics.price, rows=Number.isFinite(p)?channelSalesMix(D.channels,D.prices,p):null;
  el('sales-mix-context').textContent=rows?`${selectedCity.name} · all channels at the recommended ${fmt.eur2(p)} tested price`:'Shares unavailable: complete positive-volume estimates are required across all channels.';
  el('sales-mix-bar').innerHTML=rows?rows.map((r,i)=>`<span class="share-${i}" style="width:${r.percentage}%"></span>`).join(''):'';
  el('sales-mix-values').innerHTML=rows?rows.map((r,i)=>`<div class="sales-mix-item"><dt><i class="share-${i}" aria-hidden="true"></i>${escapeHtml(r.channel.label)}</dt><dd>${r.percentage.toFixed(1)}%<small>${fmt.int(r.units)} estimated units</small></dd></div>`).join(''):'';
}
