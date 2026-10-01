import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, validateExport } from '../engine/ledger.js';
import { planBlocks } from '../engine/plan.js';
import { createAI } from '../engine/ai.js';
import { createClock } from '../engine/clock.js';
import { createModerator } from '../engine/moderation.js';
import { createT } from '../engine/i18n.js';
import { satisfies } from '../engine/version.js';

test('ledger: reden verplicht, correctie zichtbaar, export geldig', () => {
  const l = createLedger('s');
  assert.throws(() => l.award('A', 1, ''));
  const e = l.award('A', 5, 'goed');
  l.correct(e.id, -2, 'fout in telling');
  const x = l.export({ teamIds: ['A', 'B'] });
  assert.equal(x.totals.find((t) => t.teamId === 'A').points, 3);
  assert.equal(x.entries.length, 2);
  assert.ok(validateExport(x).valid);
  x.entries[0].reason = '';
  assert.ok(!validateExport(x).valid);
});

test('plan: past binnen duur en laat laagste prioriteit eerst vallen', () => {
  const b = [
    { id: 'a', min: 2, goal: 3, max: 4, priority: 1, required: true },
    { id: 'b', min: 8, goal: 20, max: 30, priority: 2 },
    { id: 'c', min: 4, goal: 6, max: 8, priority: 3 },
  ];
  for (const m of [10, 20, 40, 60]) {
    const p = planBlocks(b, m);
    assert.ok(p.reduce((s, x) => s + x.minutes, 0) <= m);
  }
  assert.ok(!planBlocks(b, 10).some((x) => x.id === 'c'));
});

test('ai: weigering, time-out, ongeldig en moderatie geven fallback', async () => {
  const mk = (fault, fixture) => createAI({ moderator: createModerator(), clock: createClock(), chaos: { fault: () => fault } })
    .call({ id: 'x', input: 1, fixture, validate: (o) => o?.ok === true, fallback: () => ({ ok: 'fb' }), moderate: true });
  assert.equal((await mk('refuse', { ok: true })).reason, 'refused');
  assert.equal((await mk('timeout', { ok: true })).reason, 'timeout');
  assert.equal((await mk('invalid', { ok: true })).reason, 'invalid');
  assert.equal((await mk(null, { refusal: true })).reason, 'refused');
  assert.equal((await mk(null, { ok: true, t: 'f u c k' })).reason, 'moderated');
  assert.equal((await mk(null, { ok: true })).source, 'ai');
});

test('moderatie: leetspeak en spaties', () => {
  const m = createModerator();
  for (const bad of ['sh1t', 'f.u.c.k', 'K U T']) assert.equal(m.check(bad).ok, false, bad);
  assert.ok(m.check('Hallo wereld').ok);
});

test('i18n: pack > defaults > nl > sleutel', () => {
  const defaults = { nl: { a: 'NL {x}' }, en: {} };
  assert.equal(createT({ lang: 'en', defaults })('a', { x: 1 }), 'NL 1');
  assert.equal(createT({ lang: 'nl', defaults, pack: { texts: { nl: { a: 'P' } } } })('a'), 'P');
  assert.equal(createT({ defaults })('zzz'), 'zzz');
});

test('versie: semver-range', () => {
  assert.ok(satisfies('1.2.0', '^1.0.0'));
  assert.ok(!satisfies('2.0.0', '^1.0.0'));
});
