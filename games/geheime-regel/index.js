import { readFileSync } from 'node:fs';
import { similarity, tokens } from '../../engine/index.js';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };

export const bandOf = (sim, s) => (sim >= s.hitSim ? 2 : sim >= s.nearSim ? 1 : 0);
const here = (team) => team.players.filter((p) => p.connected);
const movers = (team) => here(team).filter((p) => !p.optOut);
const lexical = (a, b) => { const A = new Set(tokens(a)), B = new Set(tokens(b)); const i = [...A].filter((w) => B.has(w)).length; return A.size && B.size ? i / Math.max(A.size, B.size) : 0; };

// Regel waar? Een foto heeft `facts` (testmodus/bots); een echt vision-model krijgt de regeltekst en de foto.
export const holds = (rule, facts = []) => rule.requires.every((f) => facts.includes(f)) && !rule.forbids.some((f) => facts.includes(f));
export const closeness = (guess, rule, fn) => Math.max(...[rule.text, ...rule.aliases].map((c) => fn(guess, c)));

// Rollen: poseurs bewegen; wie niet kan bewegen (optOut) is fotograaf of detective. Iedereen aanwezig heeft een rol.
export function assignRoles(team, round) {
  const roles = {}; const add = (p, r) => { if (p) (roles[p.id] ??= []).push(r); };
  const c = here(team); if (!c.length) return roles;
  const still = c.filter((p) => p.optOut), mv = c.filter((p) => !p.optOut);
  for (const p of mv) add(p, 'poseur');
  const pool = still.length ? still : c;
  const photographer = pool[(round - 1) % pool.length];
  const rest = (still.length > 1 ? still : c).filter((p) => p !== photographer);
  const detective = rest.length ? rest[(round - 1) % rest.length] : photographer;
  add(photographer, 'fotograaf'); add(detective, 'detective');
  for (const p of still) if (!roles[p.id]) add(p, 'detective');
  return roles;
}

const rulesFor = (pack, lang, tier) => (pack.geheimeRegel?.rules ?? []).filter((r) => r.tier === tier)
  .map((r) => ({ id: r.id, text: r.text[lang] ?? r.text.nl, aliases: r.aliases?.[lang] ?? r.aliases?.nl ?? [], requires: r.requires, forbids: r.forbids ?? [] }));

export default {
  id: 'geheime-regel',
  engineVersion: '^1.1.0',
  limits: { minPlayers: 4, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: { rounds: 4, aiTimeoutSec: 20, hitSim: 0.6, nearSim: 0.3, finaleMultiplier: 2, fallbackPoints: 1, roundMin: 8, phoneSecPerRound: 60, experiments: 4, efficientMax: 2, voteCap: 1, finaleLaps: 2, maxVoids: 2 },

  blocks: (s) => [
    { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
    { id: 'warmup', min: 2, goal: 3, max: 4, priority: 4 },
    { id: 'rounds', min: s.roundMin, goal: s.roundMin * s.rounds, max: (s.roundMin + 2) * s.rounds, priority: 2 },
    { id: 'finale', min: 5, goal: 7, max: 10, priority: 1, required: true },
    { id: 'results', min: 1, goal: 2, max: 3, priority: 1, required: true },
  ],

  phoneShare: (s) => s.phoneSecPerRound / (s.roundMin * 60),

  declaration: (s, teams) => ({
    comparable: 'mean-points-per-round',
    note: 'Elk team krijgt per ronde een geheime regel van hetzelfde niveau en maximaal evenveel experimenten; 0-2 punten voor de gok (raak/dichtbij/ver), +1 voor een raak antwoord in weinig experimenten, +1 voor een stem van een ander team. Vergelijk groepen op gemiddelde per ronde.',
    maxPerRound: 4, experiments: s.experiments, efficientMax: s.efficientMax, teams: teams.length, rounds: s.rounds, thresholds: { hit: s.hitSim, near: s.nearSim },
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

  // AI-stap 1 (vision): klopt de foto met de geheime regel? Onveilige foto's gaan nooit naar het model.
  judge(ctx, photo, rule) {
    return ctx.ai.call({
      id: 'judge', input: { photo, rule: rule.text, lang: ctx.lang },
      screen: (i) => !i.photo?.flags?.length,
      fixture: () => ({ holds: holds(rule, photo?.facts) }),
      validate: (o) => typeof o?.holds === 'boolean',
      fallback: () => ({ holds: null }),
    });
  },

  // AI-stap 2: hoe dicht zit de gok bij de regel (embeddings; terugval woordoverlap).
  compare(ctx, guess, rule) {
    return ctx.ai.call({
      id: 'compare', input: { guess },
      fixture: () => ({ sim: closeness(guess, rule, similarity) }),
      validate: (o) => Number.isFinite(o?.sim) && o.sim >= 0 && o.sim <= 1,
      fallback: () => ({ sim: closeness(guess, rule, lexical) }),
    });
  },

  botPhoto(ctx, team, id) {
    const feats = ctx.pack.geheimeRegel?.features ?? [];
    return { id, people: here(team).length, flags: ctx.rand() < 0.03 ? ['unsafe'] : [], facts: feats.filter(() => ctx.rand() < 0.45) };
  },
  botGuess(ctx, rule, all) {
    const r = ctx.rand();
    if (r < 0.4) return rule.text;
    if (r < 0.6) return rule.aliases[0] ?? rule.text;
    if (r < 0.75) return rule.text.split(' ').slice(0, 3).join(' ');
    if (r < 0.78) return 'fuck dit';
    return all[Math.floor(ctx.rand() * all.length)]?.text ?? 'iets';
  },

  // Eén team: experimenten (foto -> AI zegt klopt/klopt niet) en daarna een gok. AI-storing maakt een experiment ongeldig
  // (niet geteld); te veel ongeldige experimenten geven neutrale punten.
  async playTeam(ctx, n, team, rule, pool, blockId) {
    const S = ctx.settings;
    if (!here(team).length) { ctx.ledger.award(team.id, 0, ctx.t('empty', { n }), blockId); return null; }
    ctx.log({ type: 'roles', team: team.id, round: n, roles: assignRoles(team, n) });
    let used = 0, voids = 0;
    while (used < S.experiments) {
      const photo = await ctx.collect({ teamId: team.id, kind: 'photo', timeoutSec: 45,
        bot: () => (used >= 2 && ctx.rand() < 0.25 ? null : this.botPhoto(ctx, team, `ph-${team.id}-${n}-${used}`)) });
      if (!photo) break;
      const j = await this.judge(ctx, photo, rule);
      if (j.source !== 'ai') {
        ctx.log({ type: 'screen', kind: 'experiment', team: team.id, round: n, void: true, photo: 'none' });
        if (++voids >= S.maxVoids) { ctx.ledger.award(team.id, S.fallbackPoints, ctx.t('fallback.reason', { n }), blockId); return { team, used, fallback: true }; }
        continue;
      }
      used++;
      ctx.log({ type: 'screen', kind: 'experiment', team: team.id, round: n, i: used, holds: j.output.holds, photo: photo.flags?.length ? 'none' : 'silhouette' });
    }
    const guess = await ctx.collect({ teamId: team.id, kind: 'guess', timeoutSec: 60, bot: () => this.botGuess(ctx, rule, pool) });
    if (guess == null || !String(guess).trim()) { ctx.ledger.award(team.id, 0, ctx.t('guess.none', { n }), blockId); return { team, used }; }
    if (!ctx.moderator.check(String(guess)).ok) {
      ctx.ledger.award(team.id, 0, ctx.t('guess.blocked', { n }), blockId);
      ctx.log({ type: 'screen', kind: 'guess', team: team.id, round: n, text: ctx.t('reveal.blocked') });
      return { team, used };
    }
    const c = await this.compare(ctx, String(guess), rule);
    const sim = Math.round(c.output.sim * 100) / 100, band = bandOf(sim, S);
    ctx.ledger.award(team.id, band, ctx.t('guess.reason', { n, guess: String(guess).slice(0, 60), rule: rule.text, band: ctx.t(`band.${band}`), sim, used }), blockId);
    if (band === 2 && used >= 1 && used <= S.efficientMax) ctx.ledger.award(team.id, 1, ctx.t('efficient.reason', { n, used }), blockId);
    ctx.log({ type: 'screen', kind: 'reveal', round: n, team: team.id, rule: rule.text, guess: ctx.moderator.clean(String(guess), ctx.t('reveal.blocked')), band, sim, used });
    return { team, used };
  },

  async playRound(ctx, n, total, blockId) {
    const teams = ctx.activeTeams();
    const tier = Math.min(3, 1 + Math.floor(((n - 1) * 3) / Math.max(1, total)));
    const pool = rulesFor(ctx.pack, ctx.lang, tier);
    ctx.log({ type: 'screen', text: ctx.t('round.title', { n, tier }), round: n });
    const results = await ctx.ai.batch(teams.map((team, i) => () => ctx.once(`round:${n}:${team.id}`, async () => {
      const rule = pool[((n - 1) * teams.length + i) % pool.length];
      return this.playTeam(ctx, n, team, rule, pool, blockId);
    })));
    // Onderlinge stem: welk ander team deed het slimste experiment? Alleen teams die experimenten deden zijn kiesbaar.
    await ctx.once(`round:${n}:vote`, async () => {
      const targets = teams.filter((t) => here(t).length);
      const votes = new Map();
      for (const t of targets) {
        const pick = await ctx.collect({ teamId: t.id, kind: 'vote', timeoutSec: 20, bot: () => Math.floor(ctx.rand() * targets.length) });
        const target = pick != null ? targets[Number(pick)] : null;
        if (target && target.id !== t.id) votes.set(target.id, (votes.get(target.id) ?? 0) + 1);
      }
      for (const [tid, v] of votes) ctx.ledger.award(tid, Math.min(v, ctx.settings.voteCap), ctx.t('vote.reason', { n, votes: v }), blockId);
    });
    return results;
  },

  // Finale: één gedeelde regel voor alle teams. Teams doen om de beurt experimenten (iedereen ziet alle uitslagen)
  // en iedereen gokt op het eind. Teams zonder bewegers kijken mee en gokken ook.
  async finale(ctx, blockId) {
    const S = ctx.settings, mult = S.finaleMultiplier;
    const teams = ctx.activeTeams().filter((t) => here(t).length);
    ctx.log({ type: 'screen', text: ctx.t('finale.title') });
    const pool = rulesFor(ctx.pack, ctx.lang, 'finale');
    const rule = pool[0];
    if (!rule) return;
    let verdicts = 0;
    for (let lap = 1; lap <= S.finaleLaps; lap++) {
      await ctx.once(`finale:lap:${lap}`, async () => {
        await ctx.ai.batch(teams.map((team) => async () => {
          if (!movers(team).length) return;
          const photo = await ctx.collect({ teamId: team.id, kind: 'photo', timeoutSec: 45, bot: () => this.botPhoto(ctx, team, `fin-${team.id}-${lap}`) });
          if (!photo) return;
          const j = await this.judge(ctx, photo, rule);
          if (j.source !== 'ai') return ctx.log({ type: 'screen', kind: 'experiment', team: team.id, round: 'F', void: true, photo: 'none' });
          verdicts++;
          ctx.log({ type: 'screen', kind: 'experiment', team: team.id, round: 'F', i: lap, holds: j.output.holds, photo: photo.flags?.length ? 'none' : 'silhouette' });
          ctx.ledger.award(team.id, 1, ctx.t('finale.contribution', { lap }), blockId);
        }));
      });
    }
    await ctx.once('finale:guess', async () => {
      if (!verdicts) {   // AI-storing in alle experimenten: neutrale punten voor iedereen
        for (const t of teams) ctx.ledger.award(t.id, S.fallbackPoints * mult, ctx.t('finale.fallback'), blockId);
        return;
      }
      await ctx.ai.batch(teams.map((t) => async () => {
        const g = await ctx.collect({ teamId: t.id, kind: 'guess', timeoutSec: 60, bot: () => this.botGuess(ctx, rule, pool) });
        if (g == null || !String(g).trim() || !ctx.moderator.check(String(g)).ok) return ctx.ledger.award(t.id, 0, ctx.t('finale.guess.none'), blockId);
        const c = await this.compare(ctx, String(g), rule);
        const sim = Math.round(c.output.sim * 100) / 100, band = bandOf(sim, S);
        ctx.ledger.award(t.id, band * mult, ctx.t('finale.guess.reason', { guess: String(g).slice(0, 60), rule: rule.text, band: ctx.t(`band.${band}`), sim }), blockId);
      }));
      ctx.log({ type: 'screen', kind: 'reveal', round: 'F', rule: rule.text });
    });
  },
};
