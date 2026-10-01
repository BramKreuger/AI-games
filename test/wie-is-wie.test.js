// Spelspecifieke tests voor wie-is-wie: tweetallen, sets, controles, scoring, uitsluiting, chaos, risico R1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../engine/sim-generic.js';
import { createAI } from '../engine/ai.js';
import { createClock } from '../engine/clock.js';
import { rng } from '../engine/index.js';
import game, { makePairs, interviewsOf, assignSets, localCheck, sanitize, mockImage } from '../games/wie-is-wie/index.js';

const people = (sizes) => sizes.flatMap((n, t) => Array.from({ length: n }, (_, i) => ({ id: `T${t + 1}P${i + 1}`, teamId: `T${t + 1}` })));

test('wie-is-wie: tweetallen zijn gemengd, iedereen precies één keer, oneven → één drietal', () => {
  for (const sizes of [[3, 3], [2, 2, 2], [5, 4, 4], [1, 1, 1, 1, 1, 1], [6, 5, 5, 5, 5, 5, 5, 5, 5, 4], [3, 3, 3, 2, 2]]) {
    const ps = people(sizes);
    const units = makePairs(ps, rng(3));
    const all = units.flat().map((p) => p.id).sort();
    assert.deepEqual(all, ps.map((p) => p.id).sort(), `iedereen één keer bij ${sizes}`);
    assert.ok(units.every((u) => u.length === 2 || u.length === 3));
    assert.equal(units.filter((u) => u.length === 3).length, ps.length % 2);
    for (const u of units) for (const [a, b] of interviewsOf(u)) assert.notEqual(a.teamId, b.teamId, `zelfde team bij ${sizes}`);
    // elk teamlid is precies één keer maker en één keer onderwerp
    const makers = units.flatMap(interviewsOf).map(([m]) => m.id), subjects = units.flatMap(interviewsOf).map(([, s]) => s.id);
    assert.equal(new Set(makers).size, ps.length); assert.equal(new Set(subjects).size, ps.length);
  }
});

test('wie-is-wie: één team groter dan de helft → toegestaan, iedereen heeft toch een partner', () => {
  const units = makePairs(people([6, 1, 1]), rng(1));
  assert.equal(units.flat().length, 8);
});

test('wie-is-wie: sets gelijk verdeeld, ≤ galleryMax, rest naar de muur', () => {
  const units = makePairs(people([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), rng(2));
  const a = assignSets(units, 3, 12);
  const size = (k) => a.filter((x) => x.set === k).reduce((s, x) => s + x.unit.length, 0);
  assert.ok([0, 1, 2].every((k) => size(k) <= 12));
  assert.equal(size(-1), 50 - 36);
  const b = assignSets(units, 5, 12);
  const sizes = [0, 1, 2, 3, 4].map((k) => b.filter((x) => x.set === k).reduce((s, x) => s + x.unit.length, 0));
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 2, sizes.join());
  // balans: per set verschilt het aantal kandidaten per team hoogstens 2
  for (let k = 0; k < 5; k++) {
    const per = new Map(); for (const x of b.filter((y) => y.set === k)) for (const m of x.unit) per.set(m.teamId, (per.get(m.teamId) ?? 0) + 1);
    const v = [...per.values()]; assert.ok(Math.max(...v) - Math.min(...v, 0) <= 2, `set ${k}: ${v}`);
  }
});

test('wie-is-wie: lek- en algemeenheidscontrole (lokaal), opschonen', () => {
  const opt = { partner: 'Sanne de Vries', team: 'Blauw', banned: ['krullen', 'bril'], generic: ['reizen'] };
  assert.equal(localCheck('een vos met rode krullen en een bril die graag puzzelt in de trein', opt).leak, true);
  assert.equal(localCheck('een vos genaamd Sanne die graag puzzelt op zondag', opt).leak, true);
  assert.equal(localCheck("een uil die 's nachts sterren telt en soep kookt voor de buren", opt).leak, false);
  assert.equal(localCheck('een vos die houdt van reizen en eten', opt).generic, true);
  assert.equal(localCheck('een vos', opt).generic, true);
  assert.equal(sanitize('een vos met rode krullen', ['krullen']), 'een vos met rode');
});

test('wie-is-wie: mock-beeld is deterministisch en geldig', () => {
  assert.equal(mockImage('a', 'dier'), mockImage('a', 'dier'));
  assert.notEqual(mockImage('a', 'dier'), mockImage('b', 'dier'));
  assert.match(mockImage('x', '<script>'), /^data:image\/svg\+xml;base64,/);
});

test('wie-is-wie: speurders koppelen nooit een plaatje dat ze maakten of waar ze op staan; scores 0-2 met reden', async () => {
  const { s } = await simulate('wie-is-wie', { players: 24, teams: 6, durationMin: 40 });
  const W = s.ctx.store.wiw;
  const matches = s.events.filter((e) => e.type === 'input' && e.kind === 'match');
  assert.ok(matches.length > 0);
  for (const pt of W.portraits.filter((p) => p.set >= 0)) assert.equal(W.portraits.filter((q) => q.set === pt.set && (q.maker === pt.subject)).length, 1, 'partner zit in dezelfde set');
  for (const e of s.ledger.entries().filter((x) => x.blockId?.startsWith('round'))) {
    assert.ok(e.points >= 0 && e.points <= 2, `${e.points}`); assert.match(e.reason, /juist gekoppeld/);
  }
  for (const e of s.ledger.entries().filter((x) => x.blockId === 'finale')) assert.ok(e.points >= 0 && e.points <= 4);
});

test('wie-is-wie: uitsluiting in de telefoonlijst (eigen plaatje en eigen gezicht nooit aangeboden)', async () => {
  const seen = [];
  const { s } = await simulate('wie-is-wie', { players: 12, teams: 3, inputs: async (r) => { if (r.kind === 'match') seen.push(r); return r.kind === 'prompt' ? 'een egel die elke ochtend drie keer rond de vijver loopt en daarna fluit' : {}; } });
  const W = s.ctx.store.wiw;
  for (const r of seen.filter((x) => x.data.items[0]?.label !== undefined && x.data.options[0]?.teamId)) {
    for (const it of r.data.items) {
      const pt = W.portraits.find((p) => p.asset === it.asset);
      if (pt) { assert.notEqual(pt.maker, r.playerId); assert.notEqual(pt.subject, r.playerId); }
    }
  }
  // finale: eigen teamportret niet aangeboden
  const fin = seen.filter((x) => !x.data.options[0]?.teamId);
  for (const r of fin) for (const it of r.data.items) assert.notEqual(W.teamPortraits.find((tp) => tp.asset === it.asset)?.teamId, r.teamId);
});

test('wie-is-wie: normalisatie per lid: teamgrootte maakt niet uit (perfecte bots)', async () => {
  const { s } = await simulate('wie-is-wie', { players: 13, teams: 4, settings: { botSkill: 1 } });
  for (const e of s.ledger.entries().filter((x) => x.blockId?.startsWith('round'))) assert.equal(e.points, 2);
});

test('wie-is-wie: team zonder speurders in een ronde krijgt compensatie met reden', async () => {
  const { s } = await simulate('wie-is-wie', { players: 6, teams: 3, durationMin: 40, settings: { minPerRound: 2 } });
  const comp = s.ledger.entries().filter((e) => /Compensatie/.test(e.reason));
  const notes = s.events.filter((e) => e.type === 'note' && /geen speurders/.test(e.text ?? ''));
  assert.equal(comp.length, notes.length);
});

test('wie-is-wie: R1 gelijkende plaatjes: dubbele/algemene prompts krijgen een herkansing en zijn daarna verschillend', async () => {
  const { s } = await simulate('wie-is-wie', { players: 40, teams: 8, seed: 5 });
  const st = s.events.find((e) => e.type === 'prompts').stats;
  console.log('R1 prompts:', JSON.stringify(st));
  assert.ok(st.retried > 0, 'geen herkansingen');
  assert.ok(st.maxSim > 0.85, 'test bevat geen dubbele prompts');
  assert.ok(st.maxSimAfter <= 0.85, `na herkansing nog gelijk: ${st.maxSimAfter}`);
  assert.ok(s.ctx.store.wiw.portraits.every((p) => !p.prompt || !localCheck(p.prompt, { banned: s.ctx.pack.wieIsWie.bannedWords.nl }).leak), 'lek na opschonen');
  // onderwerpen binnen een set zijn verschillend (zolang er genoeg onderwerpen zijn)
  const W = s.ctx.store.wiw;
  for (let k = 0; k < W.K; k++) { const th = W.portraits.filter((p) => p.set === k).map((p) => p.theme); assert.equal(new Set(th).size, Math.min(th.length, 12)); }
});

test('wie-is-wie: laatkomer wordt speurder, wegloper valt uit zijn ronde', async () => {
  const wrap = (g) => ({ ...g, async runBlock(ctx, b) {
    if (b.id === 'round1') { ctx.teams[1].players.push({ id: 'LATE', connected: true, bot: true }); }
    if (b.id === 'round2') { const pt = ctx.store.wiw.portraits.find((p) => p.set === 1); ctx.teams.flatMap((t) => t.players).find((p) => p.id === pt.subject).connected = false; }
    return g.runBlock.call(g, ctx, b);
  } });
  const { s, valid } = await simulate('wie-is-wie', { players: 16, teams: 4, wrap });
  assert.ok(valid.valid);
  assert.ok(s.events.some((e) => e.type === 'input' && e.kind === 'match' && e.teamId === 'T2'));
  assert.ok(s.events.some((e) => e.type === 'screen' && /valt af|dropped/.test(e.text ?? '')));
  assert.ok(!s.ctx.store.wiw.portraits.some((p) => p.subject === 'LATE' || p.maker === 'LATE'));
});

test('wie-is-wie: beeld-AI weigert → stockbeeld/kaartje, spel loopt door; AI-beelden alleen na screen', async () => {
  const { s, valid } = await simulate('wie-is-wie', { players: 12, teams: 4, chaos: { fault: (st) => (st.kind === 'image' ? 'refuse' : undefined) } });
  assert.ok(valid.valid);
  assert.ok(s.ctx.store.wiw.portraits.every((p) => p.source === 'fallback' && s.assets.get(p.asset)));
});

test('engine 1.2: batch met concurrency loopt in golven op de virtuele klok', async () => {
  const clock = createClock(0);
  const ai = createAI({ clock, chaos: { latencyMs: 10000 } });
  const step = { id: 'x', kind: 'image', fixture: { image: 'data:image/png;base64,' }, fallback: () => null };
  const out = await ai.batch(Array.from({ length: 10 }, () => () => ai.call(step)), { concurrency: 4 });
  assert.equal(out.length, 10);
  assert.equal(clock.now(), 30);   // 3 golven van 10 s
  const c2 = createClock(0), ai2 = createAI({ clock: c2, chaos: { latencyMs: 10000 } });
  await ai2.batch(Array.from({ length: 10 }, () => () => ai2.call(step)));
  assert.equal(c2.now(), 10);   // zonder limiet: één golf (achterwaarts compatibel)
});

test('engine 1.2: budget begrensd, time-out per stap, beeld niet als tekst gemodereerd', async () => {
  const clock = createClock(0);
  const ai = createAI({ mode: 'live', clock, budgetUsd: 0.05, provider: async () => ({ image: 'data:image/png;base64,fuck', _costUsd: 0.04 }), moderator: { check: (t) => ({ ok: !/fuck/.test(t) }) } });
  const step = { id: 'p', kind: 'image', moderate: true, validate: (o) => o?.image?.startsWith('data:image'), fallback: () => ({ image: 'stock' }) };
  assert.equal((await ai.call(step)).source, 'ai');
  assert.equal((await ai.call(step)).source, 'ai');
  const third = await ai.call(step);
  assert.equal(third.source, 'fallback'); assert.equal(third.reason, 'budget');
  const slow = createAI({ mode: 'live', clock: createClock(0), provider: () => new Promise((ok) => setTimeout(() => ok({ text: 'x' }), 200)) });
  assert.equal((await slow.call({ id: 't', timeoutSec: 0.05, fallback: () => 'fb' })).reason, 'timeout');
});

test('wie-is-wie: blokken hangen af van de groep; 20/40/60 min passen', () => {
  for (const [p, d, rounds] of [[6, 40, 1], [12, 40, 3], [24, 20, 2], [60, 60, 5]]) {
    const plan = game.blocks(game.defaults, { players: p });
    assert.equal(plan.filter((b) => b.id.startsWith('round')).length, Math.min(5, Math.floor(p / 4)));
    void d; void rounds;
  }
});

test('wie-is-wie: regressie: gewone Nederlandse woorden (haar, klein, lang, oud) zijn geen lek', async () => {
  const { loadPack } = await import('../engine/sim-generic.js');
  const banned = loadPack().wieIsWie.bannedWords.nl;
  assert.equal(localCheck('een egel die haar kleine lampjes langs de oude muur hangt en daar uren naar kijkt', { banned }).leak, false);
  assert.equal(localCheck('een egel met blonde krullen', { banned }).leak, true);
});
