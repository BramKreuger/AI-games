import { readFileSync } from 'node:fs';
import { similarity, tokens } from '../../engine/index.js';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };
const describeFx = load('./fixtures/describe.json');

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const bandOf = (sim, s) => (sim >= s.hitSim ? 2 : sim >= s.nearSim ? 1 : 0);
const connected = (team) => team.players.filter((p) => p.connected);

// Rollen per ronde. Wie niet kan bewegen (optOut) krijgt bij voorkeur regisseur/fotograaf/criticus;
// alle verbonden spelers krijgen minstens één rol; de rollen rouleren per ronde.
export function assignRoles(team, round) {
  const c = connected(team);
  if (!c.length) return {};
  const rot = (list, k) => (list.length ? list[(round - 1 + k) % list.length] : null);
  const still = c.filter((p) => p.optOut), movers = c.filter((p) => !p.optOut);
  const pref = (k) => rot(still.length ? still : c, k);
  const roles = {}; const add = (p, r) => { if (p) (roles[p.id] ??= []).push(r); };
  const director = pref(0);
  add(director, 'regisseur');
  const photographer = c.length > 1 ? (still.length > 1 ? rot(still.filter((p) => p !== director), 1) : rot(c.filter((p) => p !== director), 0)) : director;
  add(photographer, 'fotograaf');
  for (const p of movers) add(p, 'beeldhouwer');
  if (c.length >= 5) add(rot(still.length ? still : c.filter((p) => p !== director && p !== photographer), 2), 'criticus');
  for (const p of c) if (!roles[p.id]) add(p, 'criticus');
  return roles;
}

const pickConcepts = (pack, lang, tier) => {
  const all = pack.levendBeeld?.concepts ?? [];
  const pool = all.filter((c) => c.tier === tier);
  return (pool.length ? pool : all).map((c) => ({ id: c.id, tier: c.tier, text: c.text[lang] ?? c.text.nl, cues: c.cues[lang] ?? c.cues.nl, aliases: c.aliases?.[lang] ?? [] }));
};

// Nabijheid van gok tot begrip: beste score over begrip en alias (embeddings; terugval: woordoverlap).
const lexical = (a, b) => { const A = new Set(tokens(a)), B = new Set(tokens(b)); const i = [...A].filter((w) => B.has(w)).length; return A.size && B.size ? i / Math.max(A.size, B.size) : 0; };
const closeness = (guess, concept, fn) => Math.max(...[concept.text, ...concept.aliases].map((c) => fn(guess, c)));

export default {
  id: 'levend-beeld',
  engineVersion: '^1.1.0',
  limits: { minPlayers: 4, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: { rounds: 4, aiTimeoutSec: 20, hitSim: 0.6, nearSim: 0.3, finaleMultiplier: 2, fallbackPoints: 1, roundMin: 7, phoneSecPerRound: 55, buildSec: 120, guessSec: 60 },

  // Minuten. Prioriteit 1 = nooit schrappen. Rondes 'goal' = rounds * roundMin.
  blocks: (s) => [
    { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
    { id: 'warmup', min: 2, goal: 3, max: 5, priority: 4 },
    { id: 'rounds', min: s.roundMin, goal: s.roundMin * s.rounds, max: (s.roundMin + 2) * s.rounds, priority: 2 },
    { id: 'finale', min: 4, goal: 6, max: 10, priority: 1, required: true },
    { id: 'results', min: 1, goal: 2, max: 3, priority: 1, required: true },
  ],

  // Schermtijd: telefoon voor begrip lezen, foto, gok. Doel < 25% van de rondetijd.
  phoneShare: (s) => s.phoneSecPerRound / (s.roundMin * 60),

  declaration: (s, teams) => ({
    comparable: 'mean-points-per-round',
    note: 'Elke ronde 0-2 punten per rol (raak/dichtbij/ver); alle teams krijgen per ronde hetzelfde niveau en evenveel rondes als maker en als rader. Vergelijk groepen op gemiddelde per ronde.',
    maxPerRound: 4, teams: teams.length, rounds: s.rounds, thresholds: { hit: s.hitSim, near: s.nearSim },
  }),

  async runBlock(ctx, block) {
    if (block.id === 'intro') return ctx.log({ type: 'screen', text: ctx.t('intro') });
    if (block.id === 'warmup') return ctx.log({ type: 'screen', text: ctx.t('warmup') });
    if (block.id === 'rounds') {
      const n = Math.max(1, Math.min(ctx.settings.rounds, Math.floor(block.minutes / ctx.settings.roundMin)));
      for (let r = 1; r <= n; r++) await this.playRound(ctx, r, n, block.id);
    }
    if (block.id === 'finale') await this.finale(ctx, block.id);
    if (block.id === 'results') {
      ctx.log({ type: 'screen', text: ctx.t('results.title') });
      for (const t of ctx.activeTeams()) ctx.log({ type: 'explain', team: t.id, lines: ctx.ledger.explain(t.id) });
    }
  },

  // Eén AI-stap: de blinde beschrijving. Het begrip zit nooit in de invoer.
  describe(ctx, photo, concept, team) {
    const people = connected(team).length;
    return ctx.ai.call({
      id: 'describe', input: { photo, lang: ctx.lang, people },
      screen: (i) => !i.photo?.flags?.length,
      fixture: () => ({ description: fill(describeFx[ctx.lang] ?? describeFx.nl, { cues: concept.cues }) }),
      validate: (o) => typeof o?.description === 'string' && o.description.length >= 10 && !this.leaks(o.description, concept),
      fallback: (i) => ({ description: ctx.t('describe.fallback', { people: i.people }) }),
      moderate: true,
    });
  },
  leaks(text, concept) {
    const d = new Set(tokens(text));
    return tokens(concept.text).filter((w) => w.length >= 4).some((w) => d.has(w));
  },

  async judge(ctx, guess, concept) {
    return ctx.ai.call({
      id: 'judge', input: { guess },
      fixture: () => ({ sim: closeness(guess, concept, similarity) }),
      validate: (o) => Number.isFinite(o?.sim) && o.sim >= 0 && o.sim <= 1,
      fallback: () => ({ sim: closeness(guess, concept, lexical) }),
    });
  },

  botGuess(ctx, concept, all) {
    const r = ctx.rand();
    if (r < 0.45) return concept.text;
    if (r < 0.7) return concept.aliases[0] ?? concept.text;
    if (r < 0.85) return concept.cues.split(' ').slice(0, 2).join(' ');
    if (r < 0.88) return 'fuck dit';           // ongepast antwoord: moet door moderatie
    return all[Math.floor(ctx.rand() * all.length)]?.text ?? 'iets';
  },

  async playRound(ctx, n, total, blockId) {
    const teams = ctx.activeTeams();
    const tier = Math.min(3, 1 + Math.floor(((n - 1) * 3) / Math.max(1, total)));
    const pool = pickConcepts(ctx.pack, ctx.lang, tier);
    ctx.log({ type: 'screen', text: ctx.t('round.title', { n, tier }), round: n });
    const shift = 1 + ((n - 1) % Math.max(1, teams.length - 1));
    await ctx.ai.batch(teams.map((maker, i) => () => ctx.once(`round:${n}:${maker.id}`, async () => {
      const guesser = teams[(i + shift) % teams.length];
      const concept = pool[((n - 1) * teams.length + i) % pool.length];
      const roles = assignRoles(maker, n);
      ctx.log({ type: 'roles', team: maker.id, round: n, roles });
      const makerHere = connected(maker).length > 0, guesserHere = connected(guesser).length > 0;
      if (!guesserHere) { ctx.ledger.award(guesser.id, 0, ctx.t('empty', { n }), blockId); }
      if (!makerHere) ctx.ledger.award(maker.id, 0, ctx.t('empty', { n }), blockId);
      if (!guesserHere) return;

      const photo = makerHere ? await ctx.collect({ teamId: maker.id, kind: 'photo', timeoutSec: ctx.settings.buildSec,
        bot: () => ({ id: `ph-${maker.id}-${n}`, people: connected(maker).length, flags: ctx.rand() < 0.04 ? ['unsafe'] : [] }) }) : null;
      const reserve = !photo;
      const d = await this.describe(ctx, photo ?? { id: 'reserve', people: 0, flags: [] }, concept, maker);
      const aiOk = d.source === 'ai';
      const shownPhoto = photo && !photo.flags?.length ? 'silhouette' : 'none';
      ctx.log({ type: 'screen', kind: 'describe', team: maker.id, round: n, text: ctx.moderator.clean(d.output.description, ctx.t('reveal.blocked')), photo: shownPhoto, source: d.source });

      if (!aiOk && !reserve) {   // AI-storing: neutrale punten, geen oneerlijke afrekening
        const why = ctx.t(d.reason === 'moderated' ? 'fallback.moderated' : 'fallback.reason', { n });
        for (const t of [maker, guesser].filter((x) => connected(x).length)) ctx.ledger.award(t.id, ctx.settings.fallbackPoints, why, blockId);
        return;
      }
      const guess = await ctx.collect({ teamId: guesser.id, kind: 'guess', timeoutSec: ctx.settings.guessSec, bot: () => this.botGuess(ctx, concept, pool) });
      if (guess == null || !String(guess).trim()) { ctx.ledger.award(guesser.id, 0, ctx.t('guess.none', { n, concept: concept.text }), blockId); return; }
      if (!ctx.moderator.check(String(guess)).ok) {
        ctx.ledger.award(guesser.id, 0, ctx.t('guess.blocked', { n }), blockId);
        ctx.log({ type: 'screen', kind: 'guess', team: guesser.id, round: n, text: ctx.t('reveal.blocked') });
        return;
      }
      const j = await this.judge(ctx, String(guess), concept);
      const sim = Math.round(j.output.sim * 100) / 100;
      const band = bandOf(sim, ctx.settings);
      const vars = { n, concept: concept.text, guess: String(guess).slice(0, 60), band: ctx.t(`band.${band}`), sim };
      ctx.ledger.award(guesser.id, band, ctx.t('guess.reason', vars), blockId);
      if (makerHere && !reserve) ctx.ledger.award(maker.id, band, ctx.t('make.reason', vars), blockId);
      else if (makerHere) ctx.ledger.award(maker.id, 0, ctx.t('maker.absent', { n }), blockId);
      else ctx.log({ type: 'note', text: ctx.t('maker.absent', { n }), team: guesser.id });
      ctx.log({ type: 'screen', kind: 'reveal', round: n, team: guesser.id, concept: concept.text, guess: ctx.moderator.clean(String(guess), ctx.t('reveal.blocked')), band, sim });
    })));
  },

  async finale(ctx, blockId) {
    const teams = ctx.activeTeams();
    ctx.log({ type: 'screen', text: ctx.t('finale.title') });
    const sugg = ctx.pack.levendBeeld?.finaleSuggestions?.[ctx.lang] ?? ctx.pack.levendBeeld?.finaleSuggestions?.nl ?? [];
    const fallbackConcept = () => pickConcepts(ctx.pack, ctx.lang, 2)[0];
    await ctx.once('finale', async () => {
      const raw = await Promise.all(teams.map((t) => ctx.collect({ teamId: t.id, kind: 'suggest', timeoutSec: 45,
        bot: () => sugg[Math.floor(ctx.rand() * sugg.length)] })));
      const ok = raw.filter((s) => s && ctx.moderator.check(String(s)).ok).map(String);
      let concept = fallbackConcept();
      if (ok.length) {   // consensus: de suggestie die het meest lijkt op de rest; bij gelijkspel de eerste
        const best = ok.map((s) => ({ s, m: ok.reduce((a, o) => a + (o === s ? 0 : similarity(s, o)), 0) })).sort((a, b) => b.m - a.m)[0].s;
        concept = { id: 'fin', tier: 2, text: best, cues: best, aliases: [] };
        // Beschrijving mag het begrip niet lekken; de cues zijn voor de mock een neutrale pose.
        concept.cues = ctx.t('describe.fallback', { people: teams.reduce((s, t) => s + connected(t).length, 0) });
      }
      ctx.log({ type: 'screen', text: ctx.t('finale.suggest', { concept: concept.text }) });
      const here = teams.filter((t) => connected(t).length);
      const total = here.reduce((s, t) => s + connected(t).length, 0);
      const host = here[0];
      const photo = host ? await ctx.collect({ teamId: host.id, kind: 'photo', timeoutSec: 120, bot: () => ({ id: 'giga', people: total, flags: [] }) }) : null;
      const d = await this.describe(ctx, photo ?? { id: 'reserve', people: total, flags: [] }, concept, { players: here.flatMap((t) => t.players) });
      ctx.log({ type: 'screen', kind: 'describe', team: 'all', text: ctx.moderator.clean(d.output.description, ctx.t('reveal.blocked')), photo: photo && !photo.flags?.length ? 'silhouette' : 'none', source: d.source });
      const mult = ctx.settings.finaleMultiplier;
      for (const t of teams) {
        if (d.source !== 'ai') { ctx.ledger.award(t.id, ctx.settings.fallbackPoints * mult, ctx.t('finale.fallback'), blockId); continue; }
        const mine = connected(t).length;
        if (mine) ctx.ledger.award(t.id, 1, ctx.t('finale.contribution', { n: mine }), blockId);
        const g = await ctx.collect({ teamId: t.id, kind: 'guess', timeoutSec: ctx.settings.guessSec, bot: () => (ctx.rand() < 0.6 ? concept.text : 'iets anders') });
        if (g == null || !ctx.moderator.check(String(g)).ok) { ctx.ledger.award(t.id, 0, ctx.t('finale.guess.none'), blockId); continue; }
        const j = await this.judge(ctx, String(g), concept);
        const sim = Math.round(j.output.sim * 100) / 100, band = bandOf(sim, ctx.settings);
        ctx.ledger.award(t.id, band * mult, ctx.t('finale.guess.reason', { guess: String(g).slice(0, 60), concept: concept.text, band: ctx.t(`band.${band}`), sim }), blockId);
      }
    });
  },
};
