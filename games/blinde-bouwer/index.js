import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };
const blueprintFx = load('./fixtures/blueprint.json');

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const bandOf = (score, s) => (score >= s.strongScore ? 2 : score >= s.roughScore ? 1 : 0);
const connected = (team) => team.players.filter((p) => p.connected);

// Rollen per ronde. De bouwer beweegt (nooit een opt-out); regisseur en fotograaf kunnen zittend.
// Alle verbonden spelers krijgen minstens één rol (rest = gids); de bouwer rouleert per ronde.
export function assignRoles(team, round) {
  const c = connected(team);
  if (!c.length) return {};
  const rot = (list, k) => (list.length ? list[(round - 1 + k) % list.length] : null);
  const still = c.filter((p) => p.optOut), movers = c.filter((p) => !p.optOut);
  const roles = {}; const add = (p, r) => { if (p) (roles[p.id] ??= []).push(r); };
  const builder = rot(movers.length ? movers : c, 0);
  const rest = c.filter((p) => p !== builder);
  const director = rest.length ? rot(still.filter((p) => p !== builder).length ? still.filter((p) => p !== builder) : rest, 1) : builder;
  const rest2 = rest.filter((p) => p !== director);
  const photographer = rest2.length ? rot(still.filter((p) => rest2.includes(p)).length ? still.filter((p) => rest2.includes(p)) : rest2, 0) : director;
  add(builder, 'bouwer'); add(director, 'regisseur'); add(photographer, 'fotograaf');
  for (const p of c) if (!roles[p.id]) add(p, 'gids');
  return roles;
}

const layouts = (pack, lang, tier) => {
  const all = pack.blindeBouwer?.layouts ?? [];
  const pool = all.filter((l) => l.tier === tier);
  return (pool.length ? pool : all).map((l) => ({ id: l.id, tier: l.tier, items: l.items, text: l.text[lang] ?? l.text.nl }));
};

export default {
  id: 'blinde-bouwer',
  engineVersion: '^1.1.0',
  limits: { minPlayers: 4, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: { rounds: 4, aiTimeoutSec: 20, strongScore: 70, roughScore: 40, finaleMultiplier: 2, fallbackPoints: 1, cleanBonus: 1, roundMin: 8, phoneSecPerRound: 60, inventorySec: 60, buildSec: 150, voteSec: 20 },

  blocks: (s) => [
    { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
    { id: 'warmup', min: 2, goal: 3, max: 5, priority: 4 },
    { id: 'rounds', min: s.roundMin, goal: s.roundMin * s.rounds, max: (s.roundMin + 2) * s.rounds, priority: 2 },
    { id: 'finale', min: 4, goal: 6, max: 10, priority: 1, required: true },
    { id: 'results', min: 1, goal: 2, max: 3, priority: 1, required: true },
  ],

  // Schermtijd: foto voorwerpen, plan lezen, foto bouwsel, stem. Doel < 25% van de rondetijd.
  phoneShare: (s) => s.phoneSecPerRound / (s.roundMin * 60),

  declaration: (s, teams) => ({
    comparable: 'mean-points-per-round',
    note: 'Elke ronde 0-2 punten voor de match met het plan (AI) plus 1 bonus voor eerlijk bouwen (scheidsrechter). Alle teams bouwen evenveel rondes op hetzelfde niveau (aantal voorwerpen). Vergelijk groepen op gemiddelde per ronde.',
    maxPerRound: 2 + s.cleanBonus, teams: teams.length, rounds: s.rounds, thresholds: { strong: s.strongScore, rough: s.roughScore },
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

  // AI-stap 1: plan maken uit de foto van de eigen voorwerpen. Terugval: vast plan uit het pakket.
  blueprint(ctx, photo, tier, fallbackLayout) {
    const items = Math.max(2, Math.min(6, photo?.items ?? fallbackLayout.items ?? 3));
    return ctx.ai.call({
      id: 'blueprint', input: { photo, lang: ctx.lang, items, tier },
      screen: (i) => !i.photo?.flags?.length,
      fixture: () => ({ plan: fill(blueprintFx[ctx.lang] ?? blueprintFx.nl, { items }) }),
      validate: (o) => typeof o?.plan === 'string' && o.plan.length >= 15,
      fallback: () => ({ plan: fallbackLayout.text }),
      moderate: true,
    });
  },

  // AI-stap 2: foto van het bouwsel vergelijken met het plan (vision). Score 0-100.
  judge(ctx, photo, plan) {
    return ctx.ai.call({
      id: 'judge', input: { photo, plan, lang: ctx.lang },
      screen: (i) => !i.photo?.flags?.length,
      fixture: () => ({ score: Math.round((photo?.fidelity ?? 0.5) * 100) }),
      validate: (o) => Number.isFinite(o?.score) && o.score >= 0 && o.score <= 100,
      fallback: () => ({ score: null }),
    });
  },

  botPhoto(ctx, tag, items, fidelity) {
    return { id: `${tag}`, people: 1, items, fidelity, flags: ctx.rand() < 0.04 ? ['unsafe'] : [] };
  },

  async playRound(ctx, n, total, blockId) {
    const teams = ctx.activeTeams();
    const tier = Math.min(3, 1 + Math.floor(((n - 1) * 3) / Math.max(1, total)));
    const pool = layouts(ctx.pack, ctx.lang, tier);
    ctx.log({ type: 'screen', text: ctx.t('round.title', { n, tier }), round: n });
    const shift = 1 + ((n - 1) % Math.max(1, teams.length - 1));
    await ctx.ai.batch(teams.map((team, i) => () => ctx.once(`round:${n}:${team.id}`, async () => {
      const ref = teams[(i + shift) % teams.length];
      const base = pool[((n - 1) * teams.length + i) % pool.length];
      const here = connected(team).length > 0;
      if (!here) { ctx.ledger.award(team.id, 0, ctx.t('empty', { n }), blockId); return; }
      const roles = assignRoles(team, n);
      ctx.log({ type: 'roles', team: team.id, round: n, roles });
      const items = base.items;
      const inv = await ctx.collect({ teamId: team.id, kind: 'photo', timeoutSec: ctx.settings.inventorySec, bot: () => this.botPhoto(ctx, `inv-${team.id}-${n}`, items, 0) });
      const bp = await this.blueprint(ctx, inv ?? { id: 'reserve', items, flags: [] }, tier, base);
      const plan = bp.output.plan;
      const director = Object.entries(roles).find(([, r]) => r.includes('regisseur'))?.[0];
      if (director) ctx.tell({ teamId: team.id, playerId: director, text: ctx.t('private.blueprint', { plan }) });
      const fidelity = Math.min(1, Math.max(0, 0.35 + ctx.rand() * 0.6));
      const result = await ctx.collect({ teamId: team.id, kind: 'photo', timeoutSec: ctx.settings.buildSec, bot: () => this.botPhoto(ctx, `res-${team.id}-${n}`, items, fidelity) });
      if (!result) { ctx.ledger.award(team.id, 0, ctx.t('build.none', { n }), blockId); return; }

      const j = await this.judge(ctx, result, plan);
      if (j.source !== 'ai' || j.output.score == null) {   // AI-storing of moderatie: vaste punten, geen oneerlijke afrekening
        ctx.ledger.award(team.id, ctx.settings.fallbackPoints, ctx.t(j.reason === 'moderated' ? 'fallback.moderated' : 'fallback.reason', { n }), blockId);
        return;
      }
      const score = Math.round(j.output.score), band = bandOf(score, ctx.settings);
      ctx.ledger.award(team.id, band, ctx.t('build.reason', { n, band: ctx.t(`band.${band}`), score }), blockId);

      // Scheidsrechter (ander team): eerlijk bouwen bevestigen. Zonder scheidsrechter geldt het voordeel van de twijfel.
      const refHere = ref.id !== team.id && connected(ref).length > 0;
      const vote = refHere ? await ctx.collect({ teamId: ref.id, kind: 'vote', timeoutSec: ctx.settings.voteSec, bot: () => (ctx.rand() < 0.85 ? 1 : 0) }) : null;
      if (!refHere || vote == null) ctx.ledger.award(team.id, ctx.settings.cleanBonus, ctx.t('clean.default', { n }), blockId);
      else if (Number(vote) === 1) ctx.ledger.award(team.id, ctx.settings.cleanBonus, ctx.t('clean.reason', { n }), blockId);
      else ctx.ledger.award(team.id, 0, ctx.t('clean.no', { n }), blockId);
      ctx.log({ type: 'screen', kind: 'reveal', round: n, team: team.id, text: ctx.moderator.clean(ctx.t('plan.reveal', { plan }), ctx.t('reveal.blocked')), band, score, photo: !result.flags?.length ? 'silhouette' : 'none' });
    })));
  },

  async finale(ctx, blockId) {
    const teams = ctx.activeTeams();
    ctx.log({ type: 'screen', text: ctx.t('finale.title') });
    await ctx.once('finale', async () => {
      const here = teams.filter((t) => connected(t).length);
      const host = here[0];
      const fin = ctx.pack.blindeBouwer?.finale?.[ctx.lang] ?? ctx.pack.blindeBouwer?.finale?.nl ?? ctx.t('blueprint.fallback', { items: here.length + 2 });
      const bp = await this.blueprint(ctx, { id: 'finale-inv', items: Math.min(6, here.length + 2), flags: [] }, 3, { text: fin, items: 5 });
      ctx.log({ type: 'screen', text: ctx.moderator.clean(ctx.t('finale.plan'), ctx.t('reveal.blocked')) });
      ctx.log({ type: 'screen', kind: 'plan', team: 'all', text: ctx.moderator.clean(bp.output.plan, ctx.t('reveal.blocked')) });
      const photo = host ? await ctx.collect({ teamId: host.id, kind: 'photo', timeoutSec: 150, bot: () => this.botPhoto(ctx, 'giga', here.length, 0.4 + ctx.rand() * 0.55) }) : null;
      const mult = ctx.settings.finaleMultiplier;
      const j = photo ? await this.judge(ctx, photo, bp.output.plan) : null;
      const ok = j && j.source === 'ai' && j.output.score != null;
      const score = ok ? Math.round(j.output.score) : 0, band = ok ? bandOf(score, ctx.settings) : 0;
      for (const t of teams) {
        const mine = connected(t).length;
        if (mine) ctx.ledger.award(t.id, 1, ctx.t('finale.contribution', { n: mine }), blockId);
        if (!photo) ctx.ledger.award(t.id, 0, ctx.t('finale.none'), blockId);
        else if (!ok) ctx.ledger.award(t.id, ctx.settings.fallbackPoints * mult, ctx.t('finale.fallback'), blockId);
        else ctx.ledger.award(t.id, band * mult, ctx.t('finale.reason', { band: ctx.t(`band.${band}`), score }), blockId);
      }
    });
  },
};
