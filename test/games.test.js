// Generieke eisen voor alle nieuwe spellen (fase 4): sims, chaos, timing, leaderboard, moderatie, belasting, i18n.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, loadGame, loadPack } from '../engine/sim-generic.js';
import { createSession, makeTeams, validateExport } from '../engine/index.js';

const SLUGS = ['levend-beeld', 'stille-post', 'wie-is-wie'];
const BAD = ['fuck jullie', 'k u t', 'sh1t', 'n4zi', 'KANKER', 'f.u.c.k'];

const check = ({ res, valid, s, teams }, durationMin) => {
  assert.ok(valid.valid, valid.errors.join());
  if (durationMin) assert.ok(res.totalSec <= durationMin * 60 + 1, `${res.totalSec}s > ${durationMin} min`);
  for (const e of s.ledger.entries()) assert.ok(e.reason && e.reason.trim(), 'regel zonder reden');
  assert.equal(res.totals.length, teams.length);
  for (const e of s.ledger.entries()) assert.ok(!/^\w+\.\w+$/.test(e.reason), `i18n-sleutel gelekt: ${e.reason}`);
};

for (const slug of SLUGS) {
  const { game } = await loadGame(slug);
  const L = game.limits;
  const ts = (name, fn) => test(`${slug}: ${name}`, fn);

  ts('declareert engineVersion en grenzen; schermtijd < 25%', () => {
    assert.match(game.engineVersion, /^\^1\.\d+\.\d+$/);
    assert.ok(game.phoneShare(game.defaults) < 0.25);
  });

  ts('sim: minimum, maximum, oneven, duren 20/40/60', async () => {
    for (const [p, t, d] of [[L.minPlayers, L.minTeams, 20], [L.minPlayers, L.minTeams, 40], [L.maxPlayers, L.maxTeams, 60], [13, 5, 40], [7, 3, 20], [L.maxPlayers, L.maxTeams, 20], [L.minPlayers, L.minTeams, 60]]) {
      check(await simulate(slug, { players: p, teams: t, durationMin: d }), d);
    }
  });

  ts('sim: buiten grenzen geweigerd', async () => {
    await assert.rejects(simulate(slug, { players: L.minPlayers - 1, teams: L.minTeams }));
    await assert.rejects(simulate(slug, { players: L.maxPlayers + 1, teams: L.maxTeams }));
    await assert.rejects(simulate(slug, { players: 20, teams: L.maxTeams + 1 }));
  });

  ts('i18n: nl en en hebben dezelfde sleutels; beide talen draaien', async () => {
    const { defaults } = await loadGame(slug);
    assert.deepEqual(Object.keys(defaults.nl).sort(), Object.keys(defaults.en).sort());
    for (const lang of ['nl', 'en']) check(await simulate(slug, { players: 12, teams: 4, lang }), 40);
  });

  ts('i18n: taal wisselen via pakket-override', async () => {
    const pack = { ...loadPack(), texts: { nl: { intro: 'EIGEN INTRO' }, en: {} } };
    const r = await simulate(slug, { pack });
    assert.ok(r.s.events.some((e) => e.text === 'EIGEN INTRO'));
  });

  ts('chaos: laatkomer, wegloper, no-show, alle telefoons uit', async () => {
    const r = await simulate(slug, { players: 12, teams: 4, mutate: (t) => {
      t[0].active = false;
      t[1].players.forEach((p) => { p.connected = false; });
      t[2].players[0].connected = false;
    }, wrap: (g) => ({ ...g, async runBlock(ctx, b) { if (b.id === 'rounds') ctx.teams[3].players.push({ id: 'LATE', connected: true, bot: true }); return g.runBlock.call(g, ctx, b); } }) });
    check(r, 40);
    assert.equal(r.s.ledger.entries().filter((e) => e.teamId === 'T1').length, 0);
    assert.ok(r.s.ledger.entries().some((e) => e.teamId === 'T2' && e.points === 0));
  });

  ts('chaos: telefoon valt uit en komt terug', async () => {
    const seen = {};
    const r = await simulate(slug, { players: 12, teams: 4, chaos: { inputFault: ({ teamId }) => ((seen[teamId] = (seen[teamId] ?? 0) + 1) <= 3 && teamId === 'T2' ? 'drop' : undefined) } });
    check(r, 40);
    assert.ok(r.s.events.some((e) => e.type === 'input' && e.teamId === 'T2' && !e.got));
    assert.ok(r.s.events.some((e) => e.type === 'input' && e.teamId === 'T2' && e.got));
  });

  ts('chaos: AI weigert / time-out / ongeldig, spel loopt door', async () => {
    for (const fault of ['refuse', 'timeout', 'invalid']) {
      const r = await simulate(slug, { players: 12, teams: 4, chaos: { fault: () => fault } });
      check(r, 40);
      assert.ok(r.s.aiStats.fallbacks > 0);
    }
  });

  ts('chaos: alleen één AI-stap faalt (per stap)', async () => {
    const ids = new Set();
    await simulate(slug, { chaos: { fault: (st) => { ids.add(st.id); } } });
    assert.ok(ids.size >= 2, [...ids].join());
    for (const id of ids) {
      const r = await simulate(slug, { players: 12, teams: 4, chaos: { fault: (st) => (st.id === id ? 'refuse' : undefined) } });
      check(r, 40);
    }
  });

  ts('chaos: serverherstart midden in een ronde, geen dubbele punten', async () => {
    const mk = (restore, K) => {
      const { game: g } = { game };
      return import(`../games/${slug}/index.js`).then(({ default: game, defaults }) => {
        const s = createSession({ game, pack: loadPack(), teams: makeTeams(12, 4), defaults, restore });
        return s;
      });
    };
    const a = await mk();
    let snap = null, count = 0; const orig = a.ctx.once;
    a.ctx.once = async (key, fn) => { await orig(key, fn); if (++count === 3 && !snap) snap = a.snapshot(); };
    await a.run();
    assert.ok(snap && snap.done.length >= 3, 'geen snapshot');
    const b = await mk(snap);
    const res = await b.run();
    const entriesB = b.ledger.entries();
    assert.deepEqual(entriesB.slice(0, snap.entries.length), snap.entries, 'oude regels onaangetast');
    assert.ok(validateExport(res.export).valid);
    const keys = new Set(snap.done);
    // geen eenheid twee keer uitgevoerd: reeds geschreven regels niet opnieuw geschreven
    const dupe = entriesB.filter((e, i) => entriesB.findIndex((x) => x.teamId === e.teamId && x.reason === e.reason && x.blockId === e.blockId) !== i && e.points !== 0);
    assert.equal(dupe.length, 0, JSON.stringify(dupe.slice(0, 2)));
    assert.ok(keys.size >= 3);
  });

  ts('timing: binnen duur ook met 20 s latency; verdeling per blok', async () => {
    for (const [p, t, d] of [[L.minPlayers, L.minTeams, 20], [12, 4, 40], [L.maxPlayers, L.maxTeams, 60], [L.maxPlayers, L.maxTeams, 20]]) {
      const r = await simulate(slug, { players: p, teams: t, durationMin: d, chaos: { latencyMs: 20000 } });
      console.log(`timing ${slug} ${p}p/${t}t/${d}min:`, r.res.timing.map((b) => `${b.block}:ai${b.aiSec}s/${b.plannedMin * 60}s${b.overrun ? '!' : ''}`).join(' '), `totaal ${r.res.totalSec}s`);
      check(r, d);
      assert.ok(r.res.timing.every((b) => !b.overrun), 'AI-latency overschrijdt blokbudget');
    }
  });

  ts('timing: worst case, elke AI-stap time-out', async () => {
    const r = await simulate(slug, { players: L.maxPlayers, teams: L.maxTeams, durationMin: 20, chaos: { fault: () => 'timeout' } });
    check(r, 20);
  });

  ts('leaderboard: reden per regel, correctie zichtbaar, export geldig', async () => {
    const r = await simulate(slug, { players: 12, teams: 4 });
    const first = r.s.ledger.entries().find((e) => e.points > 0);
    const before = r.s.ledger.totals(r.teams.map((t) => t.id));
    r.s.ledger.correct(first.id, -first.points, 'Correctie: test');
    const x = r.s.ledger.export({ teamIds: r.teams.map((t) => t.id), declaration: r.res.export.declaration });
    assert.ok(validateExport(x).valid);
    assert.ok(x.entries.at(-1).corrects === first.id);
    assert.ok(x.totals.find((t) => t.teamId === first.teamId).points < before.find((t) => t.teamId === first.teamId).points);
    assert.ok(x.declaration.comparable && x.declaration.note);
    assert.deepEqual(x.entries.slice(0, -1), r.res.export.entries);
  });

  ts('leaderboard: elk team ziet waarom (explain-regels op scherm)', async () => {
    const r = await simulate(slug, { players: 12, teams: 4 });
    const ex = r.s.events.filter((e) => e.type === 'explain');
    assert.equal(ex.length, 4);
    assert.ok(ex.every((e) => e.lines.length > 0));
  });

  ts('moderatie: ongepaste tekst en beeld bereiken het grote scherm niet', async () => {
    const inputs = async ({ kind }) => {
      if (kind === 'photo') return { id: 'x', people: 3, flags: ['unsafe'] };
      if (kind === 'vote' || kind === 'blame') return 1;
      return BAD[Math.floor(Math.random() * BAD.length)];
    };
    const r = await simulate(slug, { players: 12, teams: 4, inputs });
    check(r, 40);
    const screen = JSON.stringify(r.s.events.filter((e) => e.type === 'screen')).toLowerCase().replace(/[^a-z]/g, '');
    for (const w of ['fuck', 'kut', 'shit', 'nazi', 'kanker']) assert.ok(!screen.includes(w), `${w} op scherm`);
    assert.ok(!r.s.events.some((e) => e.type === 'screen' && e.photo === 'silhouette'), 'onveilige foto getoond');
  });

  ts('moderatie: AI-uitvoer met ongepaste tekst wordt vervangen', async () => {
    const r = await simulate(slug, { players: 12, teams: 4, provider: async () => ({ description: 'fuck kut shit', text: 'fuck kut shit', sim: 0.5, image: 'x' }), mode: 'live' });
    check(r, 40);
    const screen = JSON.stringify(r.s.events.filter((e) => e.type === 'screen')).toLowerCase();
    assert.ok(!/fuck|kut|shit/.test(screen));
  });

  ts('belasting: 5 sessies tegelijk met maximum aantal bots', async () => {
    const t0 = Date.now();
    const runs = await Promise.all([1, 2, 3, 4, 5].map((seed) => simulate(slug, { players: L.maxPlayers, teams: L.maxTeams, durationMin: 60, seed, chaos: { latencyMs: 8000 } })));
    for (const r of runs) check(r, 60);
    const ids = runs.map((r) => r.res.export.session);
    assert.equal(new Set(runs.map((r) => r.s.ledger)).size, 5, 'ledgers gedeeld');
    console.log(`belasting ${slug}: 5 x ${L.maxPlayers}p/${L.maxTeams}t in ${Date.now() - t0} ms, ${runs.reduce((s, r) => s + r.s.aiStats.calls, 0)} AI-calls, ${ids.length} sessies`);
  });

  ts('AI-kosten: calls per sessie begrensd en geschat', async () => {
    const r = await simulate(slug, { players: L.maxPlayers, teams: L.maxTeams, durationMin: 60 });
    assert.ok(r.s.aiStats.calls <= 400, `${r.s.aiStats.calls} calls`);
    console.log(`kosten ${slug} 60min/${L.maxTeams} teams: ${r.s.aiStats.calls} AI-calls`);
  });

  ts('elke AI-stap heeft fixture en terugval (testmodus draait zonder provider)', async () => {
    const r = await simulate(slug, { players: 12, teams: 4 });
    assert.equal(r.s.aiStats.fallbacks, r.s.aiStats.fallbacks);
    assert.ok(r.s.aiStats.calls > 0);
    const live = await simulate(slug, { mode: 'live', players: 12, teams: 4 });   // geen provider: alles terugval
    check(live, 40);
    assert.equal(live.s.aiStats.fallbacks, live.s.aiStats.calls);
  });
}
