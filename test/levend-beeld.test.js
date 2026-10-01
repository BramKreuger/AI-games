import test from 'node:test';
import assert from 'node:assert/strict';
import game, { assignRoles, bandOf } from '../games/levend-beeld/index.js';
import { simulate } from '../engine/sim-generic.js';

const team = (n, optOutIdx = []) => ({ id: 'T', players: Array.from({ length: n }, (_, i) => ({ id: `P${i}`, connected: true, optOut: optOutIdx.includes(i) })) });

test('rollen: iedereen minstens één rol, rouleert, optOut niet als beeldhouwer', () => {
  for (const [n, opt] of [[1, []], [2, []], [2, [0]], [3, [1]], [5, [0, 4]], [8, [2]], [3, [0, 1, 2]]]) {
    for (let r = 1; r <= 4; r++) {
      const roles = assignRoles(team(n, opt), r);
      const t = team(n, opt);
      for (const p of t.players) assert.ok(roles[p.id]?.length, `speler ${p.id} zonder rol (n=${n}, ronde ${r})`);
      for (const i of opt) assert.ok(!roles[`P${i}`].includes('beeldhouwer'));
      const all = Object.values(roles).flat();
      assert.ok(all.includes('regisseur') && all.includes('fotograaf'));
    }
  }
  const dir = [1, 2, 3, 4].map((r) => Object.entries(assignRoles(team(4), r)).find(([, v]) => v.includes('regisseur'))[0]);
  assert.ok(new Set(dir).size > 1, 'regisseur rouleert niet');
});

test('rollen: lege of niet-verbonden teams geven geen rollen', () => {
  const t = team(3); t.players.forEach((p) => { p.connected = false; });
  assert.deepEqual(assignRoles(t, 1), {});
});

test('bandOf: drempels', () => {
  const s = game.defaults;
  assert.equal(bandOf(1, s), 2); assert.equal(bandOf(s.nearSim, s), 1); assert.equal(bandOf(0.05, s), 0);
});

test('lek-check: beschrijving die het begrip noemt wordt afgekeurd', () => {
  const concept = { text: 'een zonsopgang' };
  assert.ok(game.leaks('Een mooie zonsopgang boven zee', concept));
  assert.ok(!game.leaks('Mensen reiken omhoog met open armen', concept));
});

test('lek: AI die het begrip noemt leidt tot terugval, niet tot spoiler op scherm', async () => {
  const r = await simulate('levend-beeld', { mode: 'live', players: 8, teams: 4, provider: async (st) => (st.id === 'describe' ? { description: 'Dit is duidelijk een zonsopgang en een boom in de wind en een rollercoaster' } : { sim: 0.5 }) });
  const shown = r.s.events.filter((e) => e.kind === 'describe' && e.team !== 'all').map((e) => e.text.toLowerCase()).join(' ');
  assert.ok(!/zonsopgang|rollercoaster|boom in de wind/.test(shown));
});

test('scoring: AI-storing geeft beide teams dezelfde vaste punten (eerlijk)', async () => {
  const r = await simulate('levend-beeld', { players: 8, teams: 4, durationMin: 20, chaos: { fault: (s) => (s.id === 'describe' ? 'refuse' : undefined) } });
  const e = r.s.ledger.entries().filter((x) => x.blockId === 'rounds');
  assert.ok(e.length > 0 && e.every((x) => x.points === game.defaults.fallbackPoints));
});

test('scoring: elke ronde-regel heeft rol, niveau en nabijheid in de reden', async () => {
  const r = await simulate('levend-beeld', { players: 12, teams: 4 });
  const reasons = r.s.ledger.entries().filter((x) => x.blockId === 'rounds' && x.points >= 0).map((x) => x.reason);
  assert.ok(reasons.some((x) => /nabijheid/.test(x)));
});

test('vergelijkbaarheid: declaratie en gelijke rondes per team', async () => {
  const r = await simulate('levend-beeld', { players: 12, teams: 4, durationMin: 40 });
  assert.equal(r.res.export.declaration.comparable, 'mean-points-per-round');
  const perTeam = {};
  for (const e of r.s.ledger.entries().filter((x) => x.blockId === 'rounds')) { const n = e.reason.match(/(\d+):/)?.[1]; (perTeam[e.teamId] ??= new Set()).add(n); }
  const sizes = Object.values(perTeam).map((s) => s.size);
  assert.ok(new Set(sizes).size === 1, JSON.stringify(sizes));
});

test('finale: afgevallen team zonder telefoons scoort wel mee als rader (geen afvaller zonder rol)', async () => {
  const r = await simulate('levend-beeld', { players: 12, teams: 4, mutate: (t) => { t[1].players.forEach((p) => { p.connected = false; }); } });
  assert.ok(r.s.ledger.entries().some((e) => e.teamId === 'T2' && e.blockId === 'finale'));
});
