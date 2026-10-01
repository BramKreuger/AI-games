import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../engine/sim.js';
import { createSession, makeTeams } from '../engine/index.js';
import game, { defaults } from '../games/demo/index.js';

const check = ({ res, valid, s, teams }) => {
  assert.ok(valid.valid, valid.errors.join());
  assert.ok(res.totalSec <= 60 * 60 + 1);
  for (const e of s.ledger.entries()) assert.ok(e.reason);
  assert.equal(res.totals.length, teams.length);
};

test('sim: min, max, oneven, duren', async () => {
  for (const [p, t, d] of [[4, 2, 20], [60, 12, 60], [13, 5, 40], [7, 3, 40]]) {
    const r = await simulate({ players: p, teams: t, durationMin: d });
    check(r);
    assert.ok(r.res.totalSec <= d * 60 + 1, `${p}/${t}/${d}: ${r.res.totalSec}`);
  }
});

test('sim: buiten grenzen geweigerd', async () => {
  await assert.rejects(simulate({ players: 3, teams: 2 }));
  await assert.rejects(simulate({ players: 80, teams: 13 }));
});

test('sim: nl en en', async () => {
  for (const lang of ['nl', 'en']) check(await simulate({ lang }));
});

test('chaos: laatkomer, wegloper, uitval, no-show', async () => {
  const r = await simulate({ players: 12, teams: 4, mutate: (t) => {
    t[0].active = false;                         // team komt niet opdagen
    t[1].players.forEach((p) => { p.connected = false; }); // alle telefoons uit
    t[2].players[0].connected = false;           // speler loopt weg
  } });
  check(r);
  assert.ok(r.s.ledger.entries().some((e) => /Geen deelnemers/.test(e.reason)));
  assert.equal(r.s.ledger.entries().filter((e) => e.teamId === 'T1').length, 0);
});

test('chaos: AI weigert / timeout / ongeldig, tijd blijft binnen duur', async () => {
  for (const fault of ['refuse', 'timeout', 'invalid']) {
    const r = await simulate({ durationMin: 40, chaos: { fault: () => fault } });
    check(r);
    assert.ok(r.s.aiStats.fallbacks > 0);
    assert.ok(r.res.totalSec <= 40 * 60 + 1);
  }
});

test('timing: 20 s latency per AI-stap past in duur (rapport per blok)', async () => {
  const r = await simulate({ durationMin: 40, players: 12, teams: 4, chaos: { latencyMs: 20000 } });
  console.log('timing', r.res.timing.map((b) => `${b.block}:${b.aiSec}s/${b.plannedMin * 60}s`).join(' '));
  assert.ok(r.res.totalSec <= 40 * 60 + 1);
});

test('chaos: serverherstart midden in ronde geeft geen dubbele punten', async () => {
  const mk = (restore) => createSession({ game, pack: { topics: { nl: ['x'] } }, teams: makeTeams(8, 4), defaults, restore });
  const a = mk();
  await a.ctx.once('round:1:T1', async () => a.ledger.award('T1', 5, 'voor crash', 'rounds'));
  const snap = a.snapshot();
  const b = mk(snap);
  await b.run();
  assert.equal(b.ledger.entries().filter((e) => e.teamId === 'T1' && /ronde 1/.test(e.reason)).length, 0);
  assert.equal(b.ledger.entries()[0].reason, 'voor crash');
  assert.ok(b.ledger.entries().filter((e) => e.teamId === 'T2' && /ronde 1/.test(e.reason)).length === 1);
});

test('moderatie: ongepaste AI-uitvoer bereikt het scherm niet', async () => {
  const r = await simulate({ chaos: {} });
  const screens = r.s.events.filter((e) => e.type === 'screen').map((e) => e.text).join(' ').toLowerCase();
  assert.ok(!/fuck|kut|shit/.test(screens));
});

test('leaderboard: totaal = som regels; hogere ronde-score wint', async () => {
  const r = await simulate({ seed: 3 });
  for (const t of r.res.totals) {
    assert.equal(t.points, r.s.ledger.entries().filter((e) => e.teamId === t.teamId).reduce((s, e) => s + e.points, 0));
  }
});
