import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleFrom = async p => import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL(p, import.meta.url))).toString('base64'));
const { recommend, metricsAt, forCity, channelSalesMix } = await moduleFrom('../public/js/logic.js');
const { loadDerived } = await moduleFrom('../public/js/data.js');
const raw = JSON.parse(await readFile(new URL('../public/derived.json', import.meta.url)));
globalThis.fetch = async () => ({ok:true, json:async()=>structuredClone(raw)});
const d = await loadDerived();
const key = o => `${o.channel.id}/${o.metrics.price}`;
let checks = 0;
for (const city of d.regions.filter(c=>c.name !== 'Other Germany')) {
  const channels = forCity(d.channels, city);
  const share = recommend(channels,d.prices,'share'), profit = recommend(channels,d.prices,'profit');
  assert.equal(key(share.winner),'grocery/1.79');
  assert.equal(key(profit.winner),'dtc/2.19');
  assert.equal(key(recommend(channels,d.prices,'mix',0).winner),key(share.winner));
  assert.equal(key(recommend(channels,d.prices,'mix',1).winner),key(profit.winner));
  const candidates = channels.flatMap(ch=>d.prices.map(price=>({ch,price,...ch.by_price[String(price)]})));
  const minC = Math.min(...candidates.map(c=>c.contribution_total)), maxC = Math.max(...candidates.map(c=>c.contribution_total));
  const minU = Math.min(...candidates.map(c=>c.units)), maxU = Math.max(...candidates.map(c=>c.units));
  for(let percent=0;percent<=100;percent++) {
    const weight=percent/100, rec=recommend(channels,d.prices,'mix',weight);
    const expected=candidates.map(c=>({...c,score:weight*(c.contribution_total-minC)/(maxC-minC)+(1-weight)*(c.units-minU)/(maxU-minU)}));
    const best=expected.reduce((a,b)=>b.score>a.score?b:a);
    assert.equal(key(rec.winner),`${best.ch.id}/${best.price}`);
    assert.deepEqual(rec.options.slice(0,3).map(key), [...expected].sort((a,b)=>b.score-a.score).slice(0,3).map(c=>`${c.ch.id}/${c.price}`));
    for(const o of rec.options) {
      const e=expected.find(c=>c.ch.id===o.channel.id&&c.price===o.metrics.price);
      assert.ok(Math.abs(e.score-o.mixScore)<1e-12);
      assert.ok(o.mixScore>=0&&o.mixScore<=1);
    }
    checks++;
  }
  assert.equal(metricsAt(channels[0],d.prices,1.99).interpolated,true);
  assert.ok(!recommend(channels,d.prices,'mix').options.some(o=>o.metrics.interpolated));
}
const row=(units,contribution)=>({units,contribution_total:contribution,contribution_per_unit:contribution/units,revenue:units*2,acceptance:.5});
const channel=(id,rows)=>({id,by_price:rows});
const tied=[channel('a',{'1':row(100,200),'2':row(100,200)}),channel('b',{'1':row(100,200),'2':row(100,200)})];
for(const w of [0,.5,1]) {const rec=recommend(tied,[1,2],'mix',w);assert.equal(key(rec.winner),'a/1');assert.equal(rec.winner.mixScore,0);}
const partial=[channel('a',{'1':row(100,200),'2':null}),channel('b',{'1':row(200,100),'2':{...row(100,300),units:NaN}})];
assert.equal(recommend(partial,[1,2],'mix',.5).excluded,2);
assert.equal(recommend(partial,[1,2],'mix',.5).options.length,2);
assert.equal(key(recommend(partial,[1,2],'mix',.5).winner),'a/1');
assert.equal(metricsAt(partial[0],[1,2],1.5),null);
assert.equal(recommend([channel('empty',{})],[1,2],'mix').winner,null);
assert.equal(recommend([channel('one',{'1':row(100,-20)})],[1,2],'mix').winner.mixScore,0);
for(const metric of ['units','contribution_total']) {
  const constant=[channel('a',{'1':row(100,100),'2':row(metric==='units'?100:200,metric==='units'?200:100)})];
  for(const w of [0,1]) assert.equal(key(recommend(constant,[1,2],'mix',w).winner),key(recommend(constant,[1,2],w?'profit':'share').winner));
}
assert.throws(()=>recommend(tied,[1,2],'mix',NaN));
assert.throws(()=>recommend(tied,[1,2],'mix',1.1));
// Missing source acceptance must not be coerced to a valid zero.
raw.scenarios['DTC Online']['2.19'].acceptancePct=null;
const missing=await loadDerived();
assert.equal(recommend(forCity(missing.channels,missing.regions[0]),missing.prices,'mix').excluded,1);
console.log(`PASS: ${checks} city/weight rankings, every candidate score, endpoints, exact ties, constant metrics, missing/empty data and tested-only recommendations.`);

for (const city of d.regions.filter(c => c.name !== 'Other Germany')) {
  const channels=forCity(d.channels,city);
  for (const price of d.prices) {
    const shares=channelSalesMix(channels,d.prices,price);
    const total=shares.reduce((sum,r)=>sum+r.units,0);
    assert.equal(shares.reduce((sum,r)=>sum+Math.round(r.percentage*10),0),1000);
    for (const r of shares) assert.ok(Math.abs(r.percentage-r.units/total*100)<.1+1e-12);
  }
}
assert.equal(channelSalesMix(partial,[1,2],2),null);
assert.equal(channelSalesMix(tied,[1,2],1.5),null);
const zeros=[channel('z',{'1':{...row(100,100),units:0}})];
assert.equal(channelSalesMix(zeros,[1,2],1),null);
const equalShares=['a','b','c'].map(id=>channel(id,{'1':row(100,100)}));
assert.deepEqual(channelSalesMix(equalShares,[1,2],1).map(r=>r.percentage),[33.4,33.3,33.3]);
console.log('PASS: all 15 city/price channel splits total 100%, proportional rounding, missing data, zero totals and equal-share ties.');
