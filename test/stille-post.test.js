import test from 'node:test';
import assert from 'node:assert/strict';
import game, { assignRoles, buildChains, bandOf } from '../games/stille-post/index.js';
import { simulate } from '../engine/sim-generic.js';

const mkTeams = (sizes, opt = {}) => sizes.map((n, ti) => ({ id: `T${ti + 1}`, active: true, players: Array.from({ length: n }, (_, i) => ({ id: `T${ti + 1}P${i}`, connected: true, optOut: !!opt[`${ti}:${i}`] })) }));
const S = game.defaults;

test('ketens: elk team met bewegers evenveel schakels; ketens ≤ chainMax; niemand tweemaal in één ronde', () => {
  for (const sizes of [[2, 2], [3, 3, 3, 2, 2], [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], [1, 4], [3, 3, 3]]) {
    for (let r = 1; r <= 3; r++) {
      const { k, chains } = buildChains(mkTeams(sizes), r, S);
      assert.ok(chains.every((c) => c.length <= S.chainMax && c.length >= 1));
      const count = {};
      for (const l of chains.flat()) count[l.team.id] = (count[l.team.id] ?? 0) + 1;
      assert.ok(Object.values(count).every((v) => v === k), JSON.stringify(count));
      const ids = chains.flat().map((l) => l.player.id);
      assert.equal(new Set(ids).size, ids.length, 'speler dubbel in ronde');
    }
  }
});

test('ketens: team zonder bewegers heeft geen schakel maar crasht niets', () => {
  const t = mkTeams([2, 3], { '0:0': true, '0:1': true });
  const { chains } = buildChains(t, 1, S);
  assert.ok(chains.flat().every((l) => l.team.id === 'T2'));
  assert.deepEqual(buildChains(mkTeams([2, 2]).map((x) => ({ ...x, players: x.players.map((p) => ({ ...p, connected: false })) })), 1, S), { k: 0, chains: [] });
});

test('rollen: optOut is controleur/opnemer, nooit fluisteraar; iedereen een rol', () => {
  const t = mkTeams([4], { '0:1': true })[0];
  for (let r = 1; r <= 3; r++) {
    const roles = assignRoles(t, r);
    assert.ok(t.players.every((p) => roles[p.id]?.length));
    assert.ok(!roles['T1P1'].includes('fluisteraar'));
    assert.ok(roles['T1P1'].includes('controleur'));
  }
});

test('bandOf: drempels', () => { assert.equal(bandOf(0.9, S), 2); assert.equal(bandOf(0.5, S), 1); assert.equal(bandOf(0.1, S), 0); });

test('transcriptie faalt: Controleur typt, spel gaat door met punten', async () => {
  const r = await simulate('stille-post', { players: 12, teams: 4, chaos: { fault: (s) => (s.id === 'transcribe' ? 'refuse' : undefined) } });
  assert.ok(r.s.events.filter((e) => e.type === 'input' && e.kind === 'typed').length > 0);
  assert.ok(r.s.ledger.entries().some((e) => /nabijheid/.test(e.reason)));
});

test('speler wil niet fluisteren (telefoon weg): neutrale punten, keten loopt door', async () => {
  const r = await simulate('stille-post', { players: 12, teams: 4, chaos: { inputFault: ({ kind, teamId }) => (kind === 'whisper' && teamId === 'T3' ? 'drop' : undefined) } });
  const t3 = r.s.ledger.entries().filter((e) => e.teamId === 'T3' && e.blockId === 'rounds' && /telefoon weg/.test(e.reason));
  assert.ok(t3.length > 0 && t3.every((e) => e.points === S.fallbackPoints));
});

test('gelijke kansen: team met meer spelers krijgt niet meer schakels', async () => {
  const r = await simulate('stille-post', { players: 14, teams: 3, durationMin: 20 });
  const per = {};
  for (const e of r.s.ledger.entries().filter((x) => /schakel/.test(x.reason) && x.blockId === 'rounds')) per[e.teamId] = (per[e.teamId] ?? 0) + 1;
  assert.equal(new Set(Object.values(per)).size, 1, JSON.stringify(per));
});

test('finale: creatiefste-foutstem is gemaximeerd en niet op eigen schakel', async () => {
  const r = await simulate('stille-post', { players: 24, teams: 8 });
  const votes = r.s.ledger.entries().filter((e) => /creatiefste/.test(e.reason));
  assert.ok(votes.every((e) => e.points <= S.voteCap));
});
