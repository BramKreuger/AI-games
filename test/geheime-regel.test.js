import test from 'node:test';
import assert from 'node:assert/strict';
import game, { assignRoles, holds, bandOf } from '../games/geheime-regel/index.js';
import { simulate } from '../engine/sim-generic.js';

const S = game.defaults;
const team = (n, opt = {}) => ({ id: 'T1', active: true, players: Array.from({ length: n }, (_, i) => ({ id: `P${i}`, connected: true, optOut: !!opt[i] })) });

test('holds: vereist en verboden eigenschappen', () => {
  const r = { requires: ['handsUp'], forbids: ['sitting'] };
  assert.ok(holds(r, ['handsUp'])); assert.ok(!holds(r, ['handsUp', 'sitting'])); assert.ok(!holds(r, [])); assert.ok(!holds(r));
});

test('rollen: optOut beweegt nooit; iedereen heeft een rol; fotograaf en detective bestaan', () => {
  for (const [n, opt] of [[4, { 1: true }], [1, {}], [5, { 0: true, 1: true, 2: true }], [3, { 0: true, 1: true, 2: true }]]) {
    const t = team(n, opt);
    for (let r = 1; r <= 3; r++) {
      const roles = assignRoles(t, r), all = Object.values(roles).flat();
      assert.ok(t.players.every((p) => roles[p.id]?.length));
      assert.ok(all.includes('fotograaf') && all.includes('detective'));
      for (const p of t.players.filter((x) => x.optOut)) assert.ok(!roles[p.id].includes('poseur'));
    }
  }
});

test('bandOf: drempels', () => { assert.equal(bandOf(0.9, S), 2); assert.equal(bandOf(0.4, S), 1); assert.equal(bandOf(0.1, S), 0); });

test('AI faalt bij elk experiment: neutrale punten, geen gok-afrekening', async () => {
  const r = await simulate('geheime-regel', { players: 12, teams: 4, chaos: { fault: (s) => (s.id === 'judge' ? 'refuse' : undefined) } });
  const e = r.s.ledger.entries().filter((x) => x.blockId === 'rounds' && /AI-storing/.test(x.reason));
  assert.ok(e.length > 0 && e.every((x) => x.points === S.fallbackPoints));
});

test('geheime regel lekt niet naar het scherm voor de onthulling', async () => {
  const r = await simulate('geheime-regel', { players: 8, teams: 2 });
  for (const ev of r.s.events.filter((x) => x.type === 'screen' && x.kind === 'experiment')) assert.ok(!('rule' in ev));
});

test('efficiëntiebonus alleen bij raak antwoord in weinig experimenten; stem gemaximeerd', async () => {
  const r = await simulate('geheime-regel', { players: 24, teams: 8 });
  for (const e of r.s.ledger.entries().filter((x) => /slechts/.test(x.reason))) assert.equal(e.points, 1);
  for (const e of r.s.ledger.entries().filter((x) => /stem\(men\)/.test(x.reason))) assert.ok(e.points <= S.voteCap);
});
