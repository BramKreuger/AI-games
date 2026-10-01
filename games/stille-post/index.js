import { readFileSync } from 'node:fs';
import { similarity, tokens } from '../../engine/index.js';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };
const FX = load('./fixtures/drift.json');

export const bandOf = (sim, s) => (sim >= s.hitSim ? 2 : sim >= s.nearSim ? 1 : 0);
const movers = (team) => team.players.filter((p) => p.connected && !p.optOut);
const here = (team) => team.players.filter((p) => p.connected);
const lexical = (a, b) => { const A = new Set(tokens(a)), B = new Set(tokens(b)); const i = [...A].filter((w) => B.has(w)).length; return A.size && B.size ? i / Math.max(A.size, B.size) : 0; };
const rot = (list, off, n) => Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(off + i) % list.length]);

// Rollen: wie niet kan bewegen of opt-out heeft is Controleur/Opnemer (typt de tekst bij een storing).
export function assignRoles(team, round) {
  const roles = {}; const add = (p, r) => { if (p) (roles[p.id] ??= []).push(r); };
  const c = here(team); if (!c.length) return roles;
  const still = c.filter((p) => p.optOut), mv = c.filter((p) => !p.optOut);
  for (const p of mv) add(p, 'fluisteraar');
  const checker = still.length ? still[(round - 1) % still.length] : c[(round - 1) % c.length];
  add(checker, 'controleur');
  const recorder = still.length > 1 ? still[round % still.length] : c.length > 1 ? c[round % c.length] : checker;
  add(recorder, 'opnemer');
  return roles;
}

// Bouw ketens: elk team met bewegers levert evenveel schakels (k), verdeeld over ketens van maximaal chainMax.
export function buildChains(teams, round, s) {
  const lt = teams.filter((t) => movers(t).length);
  if (!lt.length) return { k: 0, chains: [] };
  const k = Math.max(1, Math.min(s.linksPerTeam, ...lt.map((t) => movers(t).length)));
  const picks = new Map(lt.map((t) => [t.id, rot(movers(t), (round - 1) * k, k)]));
  const pool = [];
  for (let j = 0; j < k; j++) for (const t of lt) pool.push({ team: t, player: picks.get(t.id)[j] });
  const nChains = Math.ceil(pool.length / s.chainMax), size = Math.ceil(pool.length / nChains);
  const chains = []; for (let c = 0; c < nChains; c++) chains.push(pool.slice(c * size, (c + 1) * size));
  return { k, chains: chains.filter((c) => c.length) };
}

export default {
  id: 'stille-post',
  engineVersion: '^1.1.0',
  limits: { minPlayers: 4, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: { rounds: 4, aiTimeoutSec: 20, hitSim: 0.7, nearSim: 0.4, finaleMultiplier: 2, fallbackPoints: 1, roundMin: 6, phoneSecPerRound: 25, linksPerTeam: 2, chainMax: 6, voteCap: 3 },

  blocks: (s) => [
    { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
    { id: 'warmup', min: 2, goal: 3, max: 4, priority: 4 },
    { id: 'rounds', min: s.roundMin, goal: s.roundMin * s.rounds, max: (s.roundMin + 2) * s.rounds, priority: 2 },
    { id: 'finale', min: 5, goal: 7, max: 10, priority: 1, required: true },
    { id: 'results', min: 1, goal: 2, max: 3, priority: 1, required: true },
  ],

  phoneShare: (s) => s.phoneSecPerRound / (s.roundMin * 60),

  declaration: (s, teams) => ({
    comparable: 'mean-points-per-link',
    note: 'Elk team met bewegers levert per ronde evenveel schakels; een schakel scoort 0-2 op behouden betekenis ten opzichte van wat de schakel kreeg. Vergelijk groepen op gemiddelde per schakel.',
    linksPerTeam: s.linksPerTeam, chainMax: s.chainMax, teams: teams.length, thresholds: { hit: s.hitSim, near: s.nearSim },
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

  sentences(ctx, tier) {
    const all = ctx.pack.stillePost?.sentences ?? [];
    const pool = all.filter((s) => s.tier === tier);
    return (pool.length ? pool : all).map((s) => s.text[ctx.lang] ?? s.text.nl);
  },

  // Bot-fluisteraar: soms trouw, soms woorden weg of verwisseld, zelden ongepast.
  botMutate(ctx, text) {
    const r = ctx.rand(), w = text.split(' ');
    if (r < 0.5) return text;
    if (r < 0.7 && w.length > 3) { w.splice(Math.floor(ctx.rand() * w.length), 1); return w.join(' '); }
    if (r < 0.85 && w.length > 3) { const i = Math.floor(ctx.rand() * (w.length - 1)); [w[i], w[i + 1]] = [w[i + 1], w[i]]; return w.join(' '); }
    if (r < 0.9) return `${w.slice(0, Math.ceil(w.length / 2)).join(' ')} ${FX.noise[Math.floor(ctx.rand() * FX.noise.length)]}`;
    if (r < 0.92) return 'fuck dit';
    return w.slice(0, 2).join(' ');
  },

  // Ketenverwerking in drie fasen. Mensen fluisteren achter elkaar (geen AI nodig om door te gaan);
  // transcriptie en afstandsmeting draaien daarna parallel, dus de AI-tijd is onafhankelijk van de ketenlengte.
  async processChain(ctx, chain, original) {
    const spoken = []; let prev = original;
    ctx.tell({ teamId: chain[0].team.id, playerId: chain[0].player.id, text: ctx.t('private.sentence', { sentence: original }) });
    for (const link of chain) {
      const sp = await ctx.collect({ teamId: link.team.id, playerId: link.player.id, kind: 'whisper', timeoutSec: 20, bot: () => this.botMutate(ctx, prev) });
      spoken.push(sp == null ? null : String(sp));
      if (sp != null) prev = String(sp);
    }
    const heard = await ctx.ai.batch(chain.map((link, i) => async () => {
      if (spoken[i] == null) return { missing: true };
      const tr = await ctx.ai.call({
        id: 'transcribe', input: { audio: spoken[i] },
        fixture: (inp) => ({ text: inp.audio }),
        validate: (o) => typeof o?.text === 'string' && o.text.trim().length > 0 && o.text.length <= 300,
        fallback: () => ({ text: null }),
        moderate: true,
      });
      let text = tr.output.text;
      if (text == null) {   // spraakherkenning faalde: Controleur typt wat hij hoorde
        const typed = await ctx.collect({ teamId: link.team.id, kind: 'typed', timeoutSec: 30, bot: () => spoken[i] });
        text = typed != null ? String(typed) : null;
      }
      return text == null ? { unknown: true } : { text };
    }));
    // Ontbrekende of onleesbare schakels laten de betekenis ongemoeid door; geblokkeerde tekst telt als 0.
    const out = []; let current = original;
    for (let i = 0; i < chain.length; i++) {
      const h = heard[i];
      if (h.missing) { out.push({ missing: true, from: current, to: current }); continue; }
      if (h.unknown) { out.push({ unknown: true, from: current, to: current }); continue; }
      if (!ctx.moderator.check(h.text).ok) { out.push({ blocked: true, from: current, to: current }); continue; }
      out.push({ from: current, to: h.text }); current = h.text;
    }
    await ctx.ai.batch(out.map((o) => async () => {
      if (o.missing || o.blocked || o.unknown) return;
      const d = await ctx.ai.call({
        id: 'drift', input: { from: o.from, to: o.to },
        fixture: (i) => ({ sim: similarity(i.from, i.to) }),
        validate: (x) => Number.isFinite(x?.sim) && x.sim >= 0 && x.sim <= 1,
        fallback: (i) => ({ sim: lexical(i.from, i.to) }),
      });
      o.sim = Math.round(d.output.sim * 100) / 100;
    }));
    return { links: out, final: current };
  },

  async playRound(ctx, n, total, blockId) {
    const teams = ctx.activeTeams();
    const tier = Math.min(3, 1 + Math.floor(((n - 1) * 3) / Math.max(1, total)));
    const { k, chains } = buildChains(teams, n, ctx.settings);
    const sentences = this.sentences(ctx, tier);
    ctx.log({ type: 'screen', text: ctx.t('round.title', { n, chains: chains.length, tier }), round: n });
    for (const t of teams) ctx.log({ type: 'roles', team: t.id, round: n, roles: assignRoles(t, n) });
    for (const t of teams) if (!here(t).length) ctx.ledger.award(t.id, 0, ctx.t('empty', { n }), blockId);
    const worst = [];   // per keten de schakel met de grootste afwijking
    const results = await ctx.ai.batch(chains.map((chain, c) => () => ctx.once(`round:${n}:chain:${c}`, async () => {
      const original = sentences[((n - 1) * chains.length + c) % sentences.length];
      const { links, final: current } = await this.processChain(ctx, chain, original);
      const drops = [];
      links.forEach((L, i) => {
        const { team } = chain[i];
        const vars = { n, c: c + 1, i: i + 1, from: L.from.slice(0, 50), to: L.to.slice(0, 50) };
        if (L.missing || L.unknown) { ctx.ledger.award(team.id, ctx.settings.fallbackPoints, ctx.t('link.missing', vars), blockId); drops.push(0); return; }
        if (L.blocked) { ctx.ledger.award(team.id, 0, ctx.t('link.blocked', vars), blockId); drops.push(0); return; }
        const band = bandOf(L.sim, ctx.settings);
        ctx.ledger.award(team.id, band, ctx.t('link.reason', { ...vars, band: ctx.t(`band.${band}`), sim: L.sim }), blockId);
        ctx.log({ type: 'screen', kind: 'link', round: n, chain: c + 1, i: i + 1, team: team.id, text: ctx.moderator.clean(L.to, ctx.t('reveal.blocked')), sim: L.sim });
        drops.push(1 - L.sim);
      });
      const endSim = Math.round(similarity(original, current) * 100) / 100;
      const worstIdx = drops.indexOf(Math.max(...drops)) + 1;
      if (endSim >= ctx.settings.nearSim) {
        for (const tid of new Set(chain.map((l) => l.team.id))) ctx.ledger.award(tid, 1, ctx.t('chain.bonus', { n, c: c + 1, sim: endSim }), blockId);
      }
      // AI-uitleg en -beeld voor de onthulling; beide hebben terugval.
      const ex = await ctx.ai.call({ id: 'explain', input: { original, final: current, worst: worstIdx, lang: ctx.lang },
        fixture: (i) => ({ text: `${ctx.t('explain.fallback', { c: c + 1, from: i.original, to: i.final })} ${ctx.t('explain.text', { c: c + 1, j: i.worst })}` }),
        validate: (o) => typeof o?.text === 'string' && o.text.length > 5,
        fallback: (i) => ({ text: ctx.t('explain.fallback', { c: c + 1, from: i.original, to: i.final }) }), moderate: true });
      const img = await ctx.ai.call({ id: 'image', input: { original, final: current },
        fixture: () => ({ image: `img-${n}-${c}` }), validate: (o) => typeof o?.image === 'string', fallback: () => ({ image: null }), moderate: true });
      ctx.log({ type: 'screen', kind: 'chain', round: n, chain: c + 1, original, final: ctx.moderator.clean(current, ctx.t('reveal.blocked')), sim: endSim, text: ctx.moderator.clean(ex.output.text, ctx.t('reveal.blocked')), image: img.output.image });
      worst[c] = { worstIdx, len: chain.length };
      return { c, worstIdx, len: chain.length };
    })));
    // "Waar ging het mis?": elk team (ook zonder schakels) wijst de grootste afwijking in de eerste keten aan.
    await ctx.once(`round:${n}:blame`, async () => {
      const target = results.find(Boolean); if (!target) return;
      for (const t of teams.filter((x) => here(x).length)) {
        const pick = await ctx.collect({ teamId: t.id, kind: 'blame', timeoutSec: 20, bot: () => 1 + Math.floor(ctx.rand() * target.len) });
        if (pick == null) { ctx.ledger.award(t.id, 0, ctx.t('blame.none', { n }), blockId); continue; }
        if (Number(pick) === target.worstIdx) ctx.ledger.award(t.id, 1, ctx.t('blame.reason', { n, i: pick }), blockId);
        else ctx.ledger.award(t.id, 0, ctx.t('blame.wrong', { n, i: pick, j: target.worstIdx }), blockId);
      }
    });
  },

  async finale(ctx, blockId) {
    const teams = ctx.activeTeams(), mult = ctx.settings.finaleMultiplier;
    ctx.log({ type: 'screen', text: ctx.t('finale.title') });
    await ctx.once('finale', async () => {
      const reps = teams.filter((t) => movers(t).length).map((t) => ({ team: t, player: movers(t)[0] }));
      const original = this.sentences(ctx, 3)[0];
      const owners = reps.map((r) => r.team.id);
      const { links, final: current } = await this.processChain(ctx, reps, original);
      links.forEach((L, i) => {
        const vars = { i: i + 1, from: L.from.slice(0, 50), to: L.to.slice(0, 50) };
        if (L.missing || L.unknown) return ctx.ledger.award(owners[i], ctx.settings.fallbackPoints * mult, ctx.t('finale.missing', vars), blockId);
        if (L.blocked) return ctx.ledger.award(owners[i], 0, ctx.t('link.blocked', { n: 'F', c: 1, ...vars }), blockId);
        const band = bandOf(L.sim, ctx.settings);
        ctx.ledger.award(owners[i], band * mult, ctx.t('finale.link', { ...vars, band: ctx.t(`band.${band}`), sim: L.sim }), blockId);
        ctx.log({ type: 'screen', kind: 'link', round: 'F', i: i + 1, team: owners[i], text: ctx.moderator.clean(L.to, ctx.t('reveal.blocked')), sim: L.sim });
      });
      const endSim = Math.round(similarity(original, current) * 100) / 100;
      if (endSim >= ctx.settings.nearSim) for (const t of teams) ctx.ledger.award(t.id, mult, ctx.t('finale.bonus', { sim: endSim }), blockId);
      ctx.log({ type: 'screen', kind: 'chain', round: 'F', original, final: ctx.moderator.clean(current, ctx.t('reveal.blocked')), sim: endSim });
      // Zaalstem: creatiefste fout (niet op eigen schakel); afgevallen/zonder schakels stemmen ook mee.
      const votes = new Map();
      for (const t of teams.filter((x) => here(x).length)) {
        const options = owners.map((o, i) => ({ o, i })).filter((x) => x.o !== t.id);
        const pick = await ctx.collect({ teamId: t.id, kind: 'vote', timeoutSec: 20, bot: () => options[Math.floor(ctx.rand() * options.length)]?.i });
        if (pick != null && owners[pick] && owners[pick] !== t.id) votes.set(owners[pick], (votes.get(owners[pick]) ?? 0) + 1);
      }
      for (const [tid, v] of votes) ctx.ledger.award(tid, Math.min(v, ctx.settings.voteCap), ctx.t('finale.vote', { votes: v }), blockId);
    });
  },
};
