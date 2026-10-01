import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };
const rateFixture = load('./fixtures/rate.json');

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export default {
  id: 'demo',
  engineVersion: '^1.0.0',
  limits: { minPlayers: 4, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: { rounds: 3, aiTimeoutSec: 20, votePoints: 3, finaleMultiplier: 2, fallbackScore: 5 },

  blocks: (s) => [
    { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
    { id: 'rounds', min: 8, goal: 8 * s.rounds, max: 12 * s.rounds, priority: 2 },
    { id: 'vote', min: 2, goal: 4, max: 8, priority: 3 },
    { id: 'finale', min: 4, goal: 6, max: 10, priority: 1, required: true },
  ],

  declaration: (s, teams) => ({
    comparable: 'average-per-round',
    note: 'Totaal gedeeld door gespeelde rondes; AI-score 0-10 is onafhankelijk van groepsgrootte.',
    rounds: s.rounds, teams: teams.length,
  }),

  async runBlock(ctx, block) {
    const topics = ctx.pack.topics?.[ctx.lang] ?? ['…'];
    if (block.id === 'intro') return ctx.log({ type: 'screen', text: ctx.t('intro') });
    if (block.id === 'rounds') {
      const n = Math.max(1, Math.min(ctx.settings.rounds, Math.floor(block.minutes / 8)));
      for (let r = 1; r <= n; r++) await this.playRound(ctx, r, topics[(r - 1) % topics.length], block.id, 1, 'round');
    }
    if (block.id === 'vote') await this.vote(ctx, block.id);
    if (block.id === 'finale') {
      ctx.log({ type: 'screen', text: ctx.t('finale.title') });
      await this.playRound(ctx, 'F', topics[0], block.id, ctx.settings.finaleMultiplier, 'finale');
    }
  },

  async playRound(ctx, n, topic, blockId, mult, kind) {
    ctx.log({ type: 'screen', text: ctx.t('round.title', { n, topic }) });
    const results = await ctx.ai.batch(ctx.activeTeams().map((team) => () => ctx.once(`${kind}:${n}:${team.id}`, async () => {
      const here = team.players.filter((p) => p.connected);
      if (!here.length) { ctx.ledger.award(team.id, 0, ctx.t('round.empty', { n }), blockId); return; }
      const prompt = ctx.rand() < 0.02 ? 'fuck dit' : `Idee van ${team.name} voor ${topic}`; // bots; live komt dit van het team
      const res = await ctx.ai.call({
        id: 'rate', input: { prompt, topic }, fixture: () => ({ ...rateFixture, score: 4 + Math.floor(ctx.rand() * 7) }),
        validate: (o) => Number.isInteger(o?.score) && o.score >= 0 && o.score <= 10,
        fallback: () => ({ score: ctx.settings.fallbackScore, comment: ctx.t('fallback.comment') }),
        moderate: true,
      });
      const score = clamp(res.output.score, 0, 10);
      ctx.ledger.award(team.id, score * mult, ctx.t(kind === 'finale' ? 'finale.reason' : 'round.reason', { n, topic, score }), blockId);
      ctx.log({ type: 'screen', text: ctx.moderator.clean(res.output.comment ?? ''), team: team.id, source: res.source });
    })));
    return results;
  },

  async vote(ctx, blockId) {
    const active = ctx.activeTeams();
    if (active.length < 2) return;
    const votes = new Map(active.map((t) => [t.id, 0]));
    for (const voter of active) {
      const others = active.filter((t) => t.id !== voter.id); // niet op jezelf
      const pick = others[Math.floor(ctx.rand() * others.length)];
      votes.set(pick.id, votes.get(pick.id) + 1);
    }
    for (const [teamId, v] of votes) {
      if (v) ctx.ledger.award(teamId, v * ctx.settings.votePoints, ctx.t('vote.reason', { votes: v }), blockId);
    }
  },
};
