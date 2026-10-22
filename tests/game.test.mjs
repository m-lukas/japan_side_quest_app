import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Native Node tests, no test framework or install required.
const dir = await mkdtemp(join(tmpdir(),'japan-quest-tests-'));
for (const file of ['schema','game','gist','auth']) {
  const code = (await readFile(new URL(`../lib/${file}.js`,import.meta.url),'utf8')).replace(/from '\.\/(\w+)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${file}.mjs`),code);
}
const game = await import(pathToFileURL(join(dir,'game.mjs')));
const schema = await import(pathToFileURL(join(dir,'schema.mjs')));
const gist = await import(pathToFileURL(join(dir,'gist.mjs')));
const auth = await import(pathToFileURL(join(dir,'auth.mjs')));
const seed = JSON.parse(await readFile(new URL('../japan-side-quest.seed.json',import.meta.url),'utf8'));
const fresh = () => structuredClone(seed);
const ids = state => game.promoted(state).map(c => c.id);
after(() => rm(dir,{recursive:true,force:true}));

test('seed has exactly five promoted quests', () => {
  const s=fresh(); schema.assertGameState(s); assert.equal(ids(s).length,5); assert.equal(s.settings.activeSlots,5);
});
test('promotion is stable on reload and repeated refill', () => {
  const s=fresh(), before=ids(s); assert.equal(game.refillActive(s),0); assert.deepEqual(ids(s),before); assert.equal(game.needsPromotion(s),false);
});
test('legacy three-card game adds two without changing existing cards', () => {
  const s=fresh(); s.settings.activeSlots=3;
  for(const c of game.promoted(s).slice(3)) c.status='available';
  const before=ids(s); assert.equal(game.needsPromotion(s),true);
  assert.equal(game.refillActive(s),2); assert.equal(ids(s).length,5);
  before.forEach(id => assert.ok(ids(s).includes(id))); assert.equal(s.settings.activeSlots,5);
});
test('complete a promoted quest, award once and refill the slot', () => {
  const s=fresh(), id=ids(s)[0]; game.complete(s,id,{latitude:35.68,longitude:139.76,accuracyMeters:16});
  assert.equal(ids(s).length,5); assert.ok(!ids(s).includes(id));
  const score=schema.publicDanielState(s).totals.completedPoints;
  game.complete(s,id,null); assert.equal(schema.publicDanielState(s).totals.completedPoints,score);
  assert.equal(s.activity.filter(e => e.type==='completed' && e.challengeId===id).length,1);
});
test('complete a search-only quest without changing promoted IDs or timestamps', () => {
  const s=fresh(), before=game.promoted(s).map(c => ({id:c.id,at:c.activatedAt}));
  const q=s.challenges.find(c => c.status==='available'); game.complete(s,q.id,null);
  assert.deepEqual(game.promoted(s).map(c => ({id:c.id,at:c.activatedAt})),before);
  assert.equal(q.completion.source,'search'); assert.equal(q.status,'completed');
});
test('replaced quests remain searchable and may be completed directly', () => {
  const s=fresh(), q=game.promoted(s)[0]; game.replace(s,q.id); const before=ids(s);
  assert.equal(q.status,'replaced'); assert.equal(ids(s).length,5);
  assert.ok(schema.searchChallenges(s,q.title).results.some(c => c.id===q.id));
  game.complete(s,q.id,null); assert.deepEqual(ids(s),before);
});
test('search also finds active quests and completing one refills normally', () => {
  const s=fresh(), q=game.promoted(s)[0];
  assert.equal(schema.searchChallenges(s,q.title).results[0].status,'active');
  game.complete(s,q.id,null); assert.equal(ids(s).length,5);
});
test('search hides completed, handles empty text, and matches descriptions and tags', () => {
  const s=fresh(), q=s.challenges.find(c => c.tags.includes('camera')); game.complete(s,q.id,null);
  assert.equal(schema.searchChallenges(s,'').total,0);
  assert.ok(!schema.searchChallenges(s,'camera').results.some(c => c.id===q.id));
  assert.ok(schema.searchChallenges(s,'RAMEN').total>0);
});
test('empty pool never invents cards or re-promotes discarded ones', () => {
  const s=fresh(); s.challenges=s.challenges.filter(c => c.status==='active');
  game.complete(s,ids(s)[0],null); assert.equal(ids(s).length,4); game.replace(s,ids(s)[0]); assert.equal(ids(s).length,3);
});
test('no GPS is permitted and zero-valued coordinates remain located', () => {
  const s=fresh(); game.complete(s,ids(s)[0],{latitude:0,longitude:0,accuracyMeters:0});
  game.complete(s,ids(s)[0],null);
  const view=schema.publicDanielState(s); assert.equal(view.mapPins.length,1); assert.equal(view.completedWithoutLocation.length,1);
  assert.equal(game.normalizeLocation({latitude:null,longitude:null}),null);
});
test('unknown and invalid actions fail, admin remains separate', () => {
  assert.throws(() => game.complete(fresh(),'missing',null),game.GameError);
  process.env.DANIEL_TOKEN='daniel'; process.env.ADMIN_TOKEN='admin';
  assert.equal(auth.roleForToken('nope'),null); assert.equal(auth.roleForToken('admin'),'admin'); assert.equal(auth.roleForToken('daniel'),'daniel');
});
test('Gist migration persists and subsequent visits read the same five', async () => {
  const originalFetch=globalThis.fetch;
  process.env.GITHUB_GIST_ID='test'; process.env.GITHUB_TOKEN='test-secret'; process.env.GIST_FILENAME='japan-side-quest.json';
  let stored=fresh(), writes=0;
  stored.settings.activeSlots=3; game.promoted(stored).slice(3).forEach(c => c.status='available');
  globalThis.fetch=async (_url,options) => {
    if(options.method==='PATCH') { stored=JSON.parse(JSON.parse(options.body).files['japan-side-quest.json'].content); writes++; return new Response('{}'); }
    return new Response(JSON.stringify({files:{'japan-side-quest.json':{content:JSON.stringify(stored)}}}));
  };
  try {
    const first=await gist.readyGameState(); const second=await gist.readyGameState();
    assert.equal(writes,1); assert.equal(ids(first).length,5); assert.deepEqual(ids(first),ids(second));
    const available=stored.challenges.find(c => c.status==='available');
    const changed=await gist.updateGameState(s => game.complete(s,available.id,null));
    assert.deepEqual(ids(changed.state),ids(second));
  } finally { globalThis.fetch=originalFetch; }
});
