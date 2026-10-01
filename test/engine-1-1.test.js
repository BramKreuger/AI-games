import test from 'node:test';
import assert from 'node:assert/strict';
import { embed, cosine, similarity } from '../engine/embed.js';
import { createAI } from '../engine/ai.js';
import { createClock } from '../engine/clock.js';
import { createSession, makeTeams } from '../engine/index.js';
import demo, { defaults } from '../games/demo/index.js';

test('embed: deterministisch, gelijk = 1, verwant > niet-verwant', () => {
  assert.deepEqual(embed('een boom'), embed('een boom'));
  assert.ok(Math.abs(similarity('een boom in de wind', 'een boom in de wind') - 1) < 1e-9);
  assert.ok(similarity('rollercoaster rijden', 'een rollercoaster') > similarity('rollercoaster rijden', 'vulkaan uitbarsting'));
  assert.equal(cosine([0, 0], [1, 1]), 0);
});

test('ai.batch: opeenvolgende calls in een baan tellen op, banen lopen parallel (regressie: finale-overschrijding)', async () => {
  const clock = createClock();
  const ai = createAI({ clock, chaos: { latencyMs: 10000 } });
  const step = { id: 's', input: {}, fixture: {}, fallback: () => ({}) };
  await ai.batch([
    async () => { await ai.call(step); await ai.call(step); await ai.call(step); },
    async () => { await ai.call(step); },
  ]);
  assert.equal(clock.now(), 30);
  // geneste batch telt mee in de ouderbaan
  const c2 = createClock(); const ai2 = createAI({ clock: c2, chaos: { latencyMs: 5000 } });
  await ai2.batch([async () => { await ai2.batch([() => ai2.call(step), () => ai2.call(step)]); await ai2.call(step); }]);
  assert.equal(c2.now(), 10);
});

test('ai.call: step.screen blokkeert onveilige invoer vóór het model', async () => {
  let called = false;
  const ai = createAI({ clock: createClock(), provider: async () => { called = true; return {}; }, mode: 'live' });
  const r = await ai.call({ id: 'x', input: { flags: ['unsafe'] }, screen: (i) => !i.flags.length, fallback: () => 'fb' });
  assert.equal(r.source, 'fallback'); assert.equal(r.reason, 'moderated'); assert.equal(called, false);
});

test('ctx.collect: bot in testmodus, inputs live, drop => null, uitval-inputs => null', async () => {
  const mk = (extra = {}) => createSession({ game: demo, teams: makeTeams(4, 2), defaults, ...extra });
  assert.equal(await mk().ctx.collect({ teamId: 'T1', kind: 'k', bot: () => 'x' }), 'x');
  assert.equal(await mk({ inputs: async () => 'live' }).ctx.collect({ teamId: 'T1', kind: 'k', bot: () => 'x' }), 'live');
  assert.equal(await mk({ chaos: { inputFault: () => 'drop' } }).ctx.collect({ teamId: 'T1', kind: 'k', bot: () => 'x' }), null);
  assert.equal(await mk({ inputs: async () => { throw new Error('weg'); } }).ctx.collect({ teamId: 'T1', kind: 'k' }), null);
});

test('achterwaarts compatibel: demo (^1.0.0) draait op engine 1.1', async () => {
  const s = createSession({ game: demo, teams: makeTeams(8, 4), defaults });
  const r = await s.run();
  assert.ok(r.totals.length === 4);
});
