import test from 'node:test';
import assert from 'node:assert/strict';
import game, { assignRoles, bandOf } from '../games/blinde-bouwer/index.js';
import { simulate } from '../engine/sim-generic.js';

const team = (n, optOutIdx = []) => ({ id: 'T', players: Array.from({ length: n }, (_, i) => ({ id: `P${i}`, connected: true, optOut: optOutIdx.includes(i) })) });

test('rollen: iedereen een rol, bouwer beweegt en rouleert, opt-out nooit bouwer', () => {
  for (const [n, opt] of [[1, []], [2, []], [2, [0]], [3, [1]], [5, [0, 4]], [8, [2]], [3, [0, 1, 2]]]) {
    for (let r = 1; r <= 4; r++) {
      const roles = assignRoles(team(n, opt), r);
      for (const p of team(n, opt).players) assert.ok(roles[p.id]?.length, `speler ${p.id} zonder rol (n=${n}, ronde ${r})`);
      const all = Object.values(roles).flat();
      assert.ok(all.includes('bouwer') && all.includes('regisseur') && all.includes('fotograaf'));
      if (opt.length < n) for (const i of opt) assert.ok(!roles[`P${i}`].includes('bouwer'));
    }
  }
  const b = [1, 2, 3, 4].map((r) => Object.entries(assignRoles(team(4), r)).find(([, v]) => v.includes('bouwer'))[0]);
  assert.ok(new Set(b).size > 1, 'bouwer rouleert niet');
});

test('rollen: niet-verbonden team geeft geen rollen', () => {
  const t = team(3); t.players.forEach((p) => { p.connected = false; });
  assert.deepEqual(assignRoles(t, 1), {});
});

test('bandOf: drempels', () => {
  assert.equal(bandOf(95, game.defaults), 2); assert.equal(bandOf(50, game.defaults), 1); assert.equal(bandOf(10, game.defaults), 0);
});

test('scoring: AI-storing bij oordeel geeft vaste punten', async () => {
  const r = await simulate('blinde-bouwer', { players: 8, teams: 4, durationMin: 20, chaos: { fault: (s) => (s.id === 'judge' ? 'refuse' : undefined) } });
  const e = r.s.ledger.entries().filter((x) => x.blockId === 'rounds');
  assert.ok(e.length > 0 && e.every((x) => x.points === game.defaults.fallbackPoints));
});

test('scoring: scheidsrechter zegt nee, dan geen bonus maar wel match-punten', async () => {
  const r = await simulate('blinde-bouwer', { players: 8, teams: 4, durationMin: 20, inputs: async ({ kind }) => (kind === 'vote' ? 0 : kind === 'photo' ? { id: 'p', items: 3, fidelity: 1, flags: [] } : null) });
  const e = r.s.ledger.entries().filter((x) => x.blockId === 'rounds');
  assert.ok(e.some((x) => x.points === 2) && e.some((x) => /bevestigt eerlijk bouwen niet/.test(x.reason)));
  assert.ok(!e.some((x) => x.points === 1 && /scheidsrechter bevestigt eerlijk/.test(x.reason)));
});

test('regressie-guard: elke rondepunten-regel heeft match of reden', async () => {
  const r = await simulate('blinde-bouwer', { players: 12, teams: 4 });
  assert.ok(r.s.ledger.entries().filter((x) => x.blockId === 'rounds').some((x) => /match/.test(x.reason)));
});

test('finale: team zonder telefoons krijgt toch een regel', async () => {
  const r = await simulate('blinde-bouwer', { players: 12, teams: 4, mutate: (t) => { t[1].players.forEach((p) => { p.connected = false; }); } });
  assert.ok(r.s.ledger.entries().some((e) => e.teamId === 'T2' && e.blockId === 'finale'));
});
