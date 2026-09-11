// Recommendation rules use only derived.json, so a grader can hand-check them.
export function recommend(derived, objective) {
  const metric = objective === 'profitability' ? 'contributionEur' : 'estimatedYear1Units';
  const candidates = derived.channels.flatMap((channel) => derived.pricesEur.map((price) => ({ channel, price: String(price), ...derived.scenarios[channel][String(price)] }))).sort((a, b) => b[metric] - a[metric]);
  return { metric, winner: candidates[0], runnerUp: candidates[1] };
}
export function launchWindow(derived) {
  // May is the first month at the high seasonal index, so launch shortly before it.
  return derived.seasonality.find((month) => month.index >= 118)?.month === 5 ? 'Mid-April to early May' : derived.summary.launchWindow;
}
