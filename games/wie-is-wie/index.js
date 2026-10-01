import { readFileSync } from 'node:fs';
import { cosine, embed, tokens, planBlocks } from '../../engine/index.js';

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
export const defaults = { nl: load('./defaults.nl.json'), en: load('./defaults.en.json') };
const promptFx = load('./fixtures/prompts.json');
const commentFx = load('./fixtures/commentary.json');

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const r2 = (x) => Math.round(x * 100) / 100;
const loc = (obj, lang) => obj?.[lang] ?? obj?.nl ?? obj;
const shuffle = (list, rand) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nameOf = (p) => p.name ?? p._ref?.name ?? p.id;

// Tweetallen over de teams heen. Spelers gesorteerd per team (grootste team eerst); speler i gaat met i + n/2.
// Zolang geen team groter is dan de helft, zijn alle tweetallen gemengd. Oneven: de laatste speler vormt een
// drietal met een tweetal waarvan geen lid uit zijn team komt (als dat kan).
export function makePairs(people, rand = Math.random) {
  const byTeam = new Map();
  for (const p of shuffle(people, rand)) (byTeam.get(p.teamId) ?? byTeam.set(p.teamId, []).get(p.teamId)).push(p);
  const order = [...byTeam.values()].sort((a, b) => b.length - a.length).flat();
  const h = Math.floor(order.length / 2);
  const units = [];
  for (let i = 0; i < h; i++) units.push([order[i], order[i + h]]);
  if (order.length % 2) {
    const x = order[order.length - 1];
    const u = units.find((m) => m.every((q) => q.teamId !== x.teamId)) ?? units[units.length - 1];
    if (u) u.push(x); else units.push([x]);
  }
  return units;
}

// Interviews in een eenheid: tweetal A↔B, drietal A→B→C→A. Geeft [maker, onderwerp].
export const interviewsOf = (unit) => (unit.length === 2 ? [[unit[0], unit[1]], [unit[1], unit[0]]] : unit.map((m, i) => [m, unit[(i + 1) % unit.length]]));

// Verdeel eenheden over K sets (elk ≤ cap plaatjes), zodat sets even groot zijn en elk team per set ongeveer evenveel
// mensen heeft. Wat niet past gaat naar de muur (set -1).
export function assignSets(units, K, cap) {
  const size = Array(K).fill(0), teamCount = Array.from({ length: K }, () => new Map());
  const out = [];
  for (const u of [...units].sort((a, b) => b.length - a.length)) {
    const fits = [...Array(K).keys()].filter((k) => size[k] + u.length <= cap);
    if (!fits.length) { out.push({ unit: u, set: -1 }); continue; }
    const load = (k) => u.reduce((s, m) => s + (teamCount[k].get(m.teamId) ?? 0), 0);
    const k = fits.sort((a, b) => size[a] - size[b] || load(a) - load(b) || a - b)[0];
    size[k] += u.length;
    for (const m of u) teamCount[k].set(m.teamId, (teamCount[k].get(m.teamId) ?? 0) + 1);
    out.push({ unit: u, set: k });
  }
  return out;
}

// Lokale controle (fixture en terugval): verboden woorden, naam van de partner, teamnaam; algemeenheid.
export function localCheck(prompt, { partner = '', team = '', banned = [], generic = [] } = {}) {
  const words = new Set(tokens(prompt));
  const raw = String(prompt).toLowerCase();
  const hits = [...banned.filter((w) => words.has(tokens(w)[0]) || (w.includes(' ') && raw.includes(w))),
    ...[partner, team].flatMap((n) => tokens(n)).filter((w) => w.length >= 3 && words.has(w))];
  const genericHit = generic.some((g) => raw.includes(g.toLowerCase()));
  return { leak: hits.length > 0, words: [...new Set(hits)], generic: genericHit || tokens(prompt).length < 6 };
}

// Verwijdert verraderlijke woorden als de speler na de herkansing nog steeds lekt.
export const sanitize = (prompt, words) => { const bad = new Set(words.flatMap(tokens)); return String(prompt).split(/\s+/).filter((w) => !bad.has(tokens(w)[0])).join(' '); };

// Mock-beeld: deterministische SVG per prompt (kleur en vormen uit de hash), met het onderwerp als label.
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mockImage(prompt, label) {
  const h = hash(prompt), hue = h % 360, shapes = [];
  for (let i = 0; i < 6; i++) { const v = hash(`${prompt}:${i}`); shapes.push(`<circle cx="${v % 512}" cy="${(v >> 9) % 512}" r="${30 + (v >> 18) % 90}" fill="hsl(${(hue + i * 47) % 360},70%,60%)" opacity=".7"/>`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="hsl(${hue},45%,22%)"/>${shapes.join('')}<text x="256" y="480" font-size="34" text-anchor="middle" fill="#fff" font-family="sans-serif">${String(label).replace(/[<&>]/g, '')}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export default {
  id: 'wie-is-wie',
  engineVersion: '^1.2.0',
  limits: { minPlayers: 6, maxPlayers: 60, minTeams: 2, maxTeams: 12 },
  defaults: {
    galleryMax: 12, minPerRound: 4, maxRounds: 5, interviewSec: 300, promptSecMax: 90, maxAttempts: 2, searchSec: 210, matchSec: 60,
    maxSimilarity: 0.85, aiTimeoutSec: 30, imageConcurrency: 8, finaleMultiplier: 2, botSkill: 0.55, aiBudgetUsd: 15,
  },

  // Het aantal rondes hangt af van de groep: genoeg plaatjes per ronde (≥ minPerRound), hoogstens maxRounds.
  roundsFor: (s, players) => Math.max(1, Math.min(s.maxRounds, Math.floor(players / s.minPerRound))),
  blocks(s, group = { players: 24 }) {
    const K = this.roundsFor(s, group.players);
    return [
      { id: 'intro', min: 1, goal: 2, max: 3, priority: 1, required: true },
      { id: 'interview', min: 4, goal: 5, max: 6, priority: 1, required: true },
      { id: 'prompt', min: 3, goal: 4, max: 5, priority: 1, required: true },   // typen 90 s + herkansing 45 s + AI
      ...Array.from({ length: K }, (_, i) => ({ id: `round${i + 1}`, min: 4, goal: 6, max: 8, priority: i + 1, required: i === 0 })),
      { id: 'wall', min: 1, goal: 1, max: 2, priority: 6 },   // valt als eerste weg; dan toont de uitslag de muur
      { id: 'finale', min: 3, goal: 5, max: 7, priority: 1, required: true },
      { id: 'results', min: 1, goal: 2, max: 3, priority: 1, required: true },
    ];
  },

  // Schermtijd: vragen lezen + prompt + per ronde koppelen + finale, als aandeel van de speelduur.
  phoneShare(s, plan = planBlocks(this.blocks(s, { players: 24 }), 40)) {
    const rounds = plan.filter((b) => b.id.startsWith('round')).length;
    const sec = 20 + s.promptSecMax + rounds * s.matchSec + 45;
    return sec / (plan.reduce((a, b) => a + b.minutes, 0) * 60);
  },

  declaration: (s, teams) => ({
    comparable: 'mean-per-member-per-round',
    note: 'Punten alleen voor raden. Per ronde: 2 × juist / te koppelen, gemiddeld over de speurders van het team (0-2). Finale: idem × finaleMultiplier. Teams zonder speurders in een ronde krijgen het gemiddelde van hun andere rondes. Vergelijk groepen op gemiddelde per ronde.',
    maxPerRound: 2, finaleMax: 2 * s.finaleMultiplier, teams: teams.length,
  }),

  async runBlock(ctx, block) {
    ctx.store.wiw ??= { portraits: [], rounds: {}, teamPortraits: [] };
    if (block.id === 'intro') return ctx.log({ type: 'screen', text: ctx.t('intro') });
    if (block.id === 'interview') return ctx.once('interview', () => this.interview(ctx));
    if (block.id === 'prompt') return ctx.once('prompt', () => this.prompts(ctx));
    if (block.id.startsWith('round')) return this.round(ctx, Number(block.id.slice(5)), block.id);
    if (block.id === 'wall') return ctx.once('wall', () => this.wall(ctx));
    if (block.id === 'finale') return ctx.once('finale', () => this.finale(ctx, block.id));
    if (block.id === 'results') return ctx.once('results', () => this.results(ctx, block.id));
  },

  people(ctx) {
    return ctx.teams.filter((t) => t.active).flatMap((t) => t.players.filter((p) => p.connected).map((p) => ({ id: p.id, teamId: t.id, name: nameOf(p) })));
  },
  isHere(ctx, playerId) { return ctx.teams.some((t) => t.active && t.players.some((p) => p.id === playerId && p.connected)); },
  teamName(ctx, id) { return ctx.teams.find((t) => t.id === id)?.name ?? id; },
  roundIds: (ctx) => ctx.plan.filter((b) => b.id.startsWith('round')).map((b) => Number(b.id.slice(5))),

  // Blok interview: tweetallen, sets, onderwerpen; iedereen krijgt privé zijn partner, vragen en onderwerp.
  async interview(ctx) {
    const W = ctx.store.wiw, s = ctx.settings, cfg = ctx.pack.wieIsWie ?? {};
    const K = Math.max(1, this.roundIds(ctx).length);
    const sets = cfg.questionSets ?? [];
    const themes = loc(cfg.themes, ctx.lang) ?? [];
    const units = makePairs(this.people(ctx), ctx.rand);
    const placed = assignSets(units, K, s.galleryMax);
    const themeBag = new Map();
    const nextTheme = (k) => { let b = themeBag.get(k); if (!b?.length) themeBag.set(k, b = shuffle(themes, ctx.rand)); return b.pop() ?? '?'; };
    W.K = K;
    W.portraits = [];
    placed.forEach(({ unit, set }, ui) => {
      const qs = loc(sets[(set >= 0 ? set : ui) % Math.max(1, sets.length)]?.questions, ctx.lang) ?? [];
      if (unit.length < 2) return ctx.log({ type: 'note', text: `alleen: ${unit[0].id}` });
      if (unit.every((m) => m.teamId === unit[0].teamId)) ctx.log({ type: 'note', kind: 'same-team-pair', players: unit.map((m) => m.id) });
      for (const [maker, subject] of interviewsOf(unit)) {
        const theme = nextTheme(set);
        W.portraits.push({ id: `p${W.portraits.length + 1}`, maker: maker.id, makerTeam: maker.teamId, subject: subject.id, subjectTeam: subject.teamId, subjectName: subject.name, set, theme, questions: qs, prompt: null, asset: null, source: null });
        ctx.tell({ teamId: maker.teamId, playerId: maker.id, text: ctx.t('private.interview', { partner: subject.name, team: this.teamName(ctx, subject.teamId), questions: qs.join(' · '), theme }) });
      }
    });
    ctx.log({ type: 'screen', text: ctx.t('interview.title') });
    ctx.log({ type: 'setup', units: placed.map((p) => ({ set: p.set, players: p.unit.map((m) => m.id) })) });
  },

  botPrompt(ctx, pt, attempt) {
    const fx = promptFx[ctx.lang] ?? promptFx.nl, r = ctx.rand(), v = { theme: pt.theme, partner: pt.subjectName };
    if (attempt > 1) return fill(fx.fixed[Number(pt.id.slice(1)) % fx.fixed.length], v);
    if (r < 0.1) return fill(fx.leak[Math.floor(ctx.rand() * fx.leak.length)], v);
    if (r < 0.2) return fill(fx.generic[Math.floor(ctx.rand() * fx.generic.length)], v);
    if (r < 0.3) return fill(fx.good[0], v);            // bewust dubbel: test de gelijkenischeck
    return fill(fx.good[Math.floor(ctx.rand() * fx.good.length)], v);
  },

  // AI-stap `check`: lek en algemeenheid. Fixture en terugval: lokale controle.
  check(ctx, pt, prompt) {
    const cfg = ctx.pack.wieIsWie ?? {};
    const input = { prompt, partner: pt.subjectName, team: this.teamName(ctx, pt.subjectTeam), banned: loc(cfg.bannedWords, ctx.lang) ?? [], generic: loc(cfg.genericWords, ctx.lang) ?? [] };
    return ctx.ai.call({
      id: 'check', kind: 'text', input, timeoutSec: 8,
      llm: { system: `You check a prompt for an image generator in a party game. The prompt must describe a real person only as a metaphor (${pt.theme}), based on an interview. Answer JSON {"leak": boolean, "words": string[], "generic": boolean}. leak = true if the prompt contains the person's name, team, physical appearance (hair, glasses, height, body, clothing, skin, age, gender) or job title; list those words. generic = true if the prompt is so vague it would fit almost anyone (e.g. "likes travelling and good food").`, user: JSON.stringify({ prompt, name: input.partner, team: input.team }) },
      fixture: (i) => localCheck(i.prompt, i),
      validate: (o) => typeof o?.leak === 'boolean' && typeof o?.generic === 'boolean',
      fallback: (i) => ({ ...localCheck(i.prompt, i), generic: false }),
    });
  },

  // AI-stap `similar`: embeddings van alle prompts in een set; geeft per prompt de hoogste gelijkenis met een eerdere.
  async similar(ctx, list) {
    if (list.length < 2) return list.map(() => 0);
    const texts = list.map((p) => p.prompt);
    const r = await ctx.ai.call({
      id: 'similar', kind: 'embed', input: { texts }, timeoutSec: 5,
      fixture: (i) => ({ vectors: i.texts.map(embed) }),
      validate: (o) => Array.isArray(o?.vectors) && o.vectors.length === texts.length,
      fallback: (i) => ({ vectors: i.texts.map(embed) }),
    });
    const v = r.output.vectors;
    return v.map((a, i) => Math.max(0, ...v.slice(0, i).map((b) => cosine(a, b))));
  },

  // Blok prompt: iedereen schrijft; controles; één herkansing; daarna beelden voor ronde 1.
  async prompts(ctx) {
    const W = ctx.store.wiw, s = ctx.settings;
    ctx.log({ type: 'screen', text: ctx.t('prompt.title') });
    const ask = (pt, attempt, tip) => {
      if (!this.isHere(ctx, pt.maker)) return Promise.resolve(null);
      ctx.tell({ teamId: pt.makerTeam, playerId: pt.maker, text: tip ?? ctx.t('private.prompt', { partner: pt.subjectName, theme: pt.theme }) });
      return ctx.collect({ teamId: pt.makerTeam, playerId: pt.maker, kind: 'prompt', timeoutSec: attempt > 1 ? Math.min(45, s.promptSecMax) : s.promptSecMax, data: { partner: pt.subjectName, theme: pt.theme, attempt }, bot: () => this.botPrompt(ctx, pt, attempt) });
    };
    const attempt = async (pt, n, tip) => {
      const raw = await ask(pt, n, tip);
      pt.prompt = raw == null ? null : String(raw).slice(0, 400);
      pt.attempts = n;
      if (!pt.prompt?.trim()) { pt.prompt = null; return; }
      const c = (await this.check(ctx, pt, pt.prompt)).output;
      pt.leak = c.leak; pt.leakWords = c.words ?? []; pt.generic = c.generic;
    };
    await ctx.ai.batch(W.portraits.map((pt) => () => attempt(pt, 1)));
    // Gelijkenis per set (op de eerste versie), daarna één herkansing voor lek, algemeen of te gelijk.
    const bySet = new Map();
    for (const p of W.portraits.filter((x) => x.prompt)) (bySet.get(p.set) ?? bySet.set(p.set, []).get(p.set)).push(p);
    await ctx.ai.batch([...bySet.values()].map((list) => async () => (await this.similar(ctx, list)).forEach((v, i) => { list[i].sim = r2(v); })));
    await ctx.ai.batch(W.portraits.map((pt) => () => {
      if (pt.attempts >= s.maxAttempts) return null;
      const tip = !pt.prompt ? null : pt.leak ? ctx.t('tip.leak', { words: pt.leakWords.join(', ') })
        : pt.generic ? ctx.t('tip.generic', { partner: pt.subjectName })
          : (pt.sim ?? 0) > s.maxSimilarity ? ctx.t('tip.similar', { partner: pt.subjectName }) : null;
      return tip || !pt.prompt ? attempt(pt, pt.attempts + 1, tip ?? undefined) : null;
    }));
    // Meting voor risico R1: gelijkenis per set na de herkansingen.
    const after = new Map();
    for (const p of W.portraits.filter((x) => x.prompt)) (after.get(p.set) ?? after.set(p.set, []).get(p.set)).push(p);
    const simsAfter = (await ctx.ai.batch([...after.values()].map((list) => () => this.similar(ctx, list)))).flat();
    for (const pt of W.portraits) {
      if (pt.prompt && pt.leak) { pt.prompt = sanitize(pt.prompt, pt.leakWords); pt.sanitized = true; }
      if (!pt.prompt) pt.prompt = pt.theme;   // geen prompt (uitval): het onderwerp alleen
    }
    ctx.log({ type: 'prompts', stats: { ...this.promptStats(W.portraits), maxSimAfter: r2(Math.max(0, ...simsAfter)) } });
    await this.generate(ctx, W.portraits.filter((p) => p.set === 0));
  },

  promptStats(list) {
    const sims = list.map((p) => p.sim ?? 0);
    return { total: list.length, leaks: list.filter((p) => p.leak).length, generic: list.filter((p) => p.generic).length, retried: list.filter((p) => p.attempts > 1).length, maxSim: r2(Math.max(0, ...sims)) };
  },

  imagePrompt(ctx, theme, prompt) {
    const style = loc(ctx.pack.wieIsWie?.style, ctx.lang) ?? '';
    return `${style}. ${theme}: ${prompt}. ${ctx.t('image.safety')}`;
  },

  // AI-stap `portrait` (beeld): parallel in golven van imageConcurrency. Terugval: stockbeeld of onderwerpkaartje.
  async generate(ctx, list) {
    const todo = list.filter((p) => !p.asset);
    let done = 0;
    await ctx.ai.batch(todo.map((pt) => async () => {
      const r = await this.image(ctx, pt.theme, pt.prompt, `portrait:${pt.id}`);
      pt.asset = r.asset; pt.source = r.source;
      if (++done === todo.length || done % 4 === 0) ctx.log({ type: 'screen', kind: 'progress', text: ctx.t('gen.progress', { done, total: todo.length }) });
    }), { concurrency: ctx.settings.imageConcurrency });
  },
  async image(ctx, theme, prompt, label) {
    const stock = (ctx.pack.wieIsWie?.stock ?? []).find((x) => x.theme === theme)?.image;
    const r = await ctx.ai.call({
      id: 'portrait', kind: 'image', input: { prompt: this.imagePrompt(ctx, theme, prompt) },
      screen: () => ctx.moderator.check(prompt).ok,
      fixture: (i) => ({ image: mockImage(i.prompt, theme) }),
      validate: (o) => typeof o?.image === 'string' && o.image.startsWith('data:image/'),
      fallback: () => ({ image: stock ?? mockImage(`fallback:${theme}`, theme) }),
    });
    return { asset: ctx.assets.put(r.output.image, { label }), source: r.source };
  },

  commentary(ctx, pt) {
    return ctx.ai.call({
      id: 'commentary', kind: 'text', timeoutSec: 8, input: { name: pt.subjectName, theme: pt.theme, prompt: pt.prompt },
      llm: { system: `You write one short, kind and funny sentence (max 18 words, language: ${ctx.lang}) for the reveal in a party game. A picture showed a colleague as a metaphor. Never mention looks. Answer JSON {"line": string}.`, user: JSON.stringify({ name: pt.subjectName, metaphor: pt.theme, prompt: pt.prompt }) },
      fixture: (i) => ({ line: fill(loc(commentFx, ctx.lang), i) }),
      validate: (o) => typeof o?.line === 'string' && o.line.length > 3 && o.line.length < 200,
      fallback: (i) => ({ line: ctx.t('commentary.fallback', i) }),
      moderate: true,
    });
  },

  // Koppelen: elk getoond plaatje aan een naam. value = { [no]: optionId }. Score per speler 0-2.
  async matchAll(ctx, { speurders, items, options, kind = 'match', truth, timeoutSec, excluded = () => [] }) {
    const res = await Promise.all(speurders.map(async (p) => {
      const ex = new Set(excluded(p));
      const mine = items.filter((it) => !ex.has(it.no));
      const v = await ctx.collect({ teamId: p.teamId, playerId: p.id, kind, timeoutSec, data: { items: mine.map(({ no, asset, label }) => ({ no, asset, label })), options },
        bot: () => Object.fromEntries(mine.map((it) => [it.no, ctx.rand() < ctx.settings.botSkill ? truth(it) : options[Math.floor(ctx.rand() * options.length)]?.id])) });
      const hits = new Set(mine.filter((it) => v && String(v[it.no]) === String(truth(it))).map((it) => it.no));
      return { p, correct: hits.size, total: mine.length, hits, seen: new Set(mine.map((it) => it.no)) };
    }));
    return res;
  },
  teamScores(ctx, res) {
    const out = new Map();
    for (const r of res) { const t = out.get(r.p.teamId) ?? { correct: 0, total: 0, scores: [] }; t.correct += r.correct; t.total += r.total; t.scores.push(r.total ? (2 * r.correct) / r.total : 0); out.set(r.p.teamId, t); }
    for (const t of out.values()) t.mean = r2(t.scores.reduce((a, b) => a + b, 0) / t.scores.length);
    return out;
  },

  async round(ctx, n, blockId) {
    const W = ctx.store.wiw, s = ctx.settings;
    const rounds = this.roundIds(ctx), last = n === Math.max(...rounds);
    const next = W.portraits.filter((p) => p.set === n);   // set n = ronde n+1 (set 0 = ronde 1)
    const extra = last ? W.portraits.filter((p) => p.set === -1 || p.set >= rounds.length) : [];
    if (last) for (const p of W.portraits) if (p.set >= rounds.length) p.set = -1;   // sets zonder ronde → muur
    await ctx.ai.batch([
      () => ctx.once(`round:${n}`, () => this.playRound(ctx, n, blockId)),
      () => this.generate(ctx, [...next, ...extra]),
      () => (last ? this.prepareTeams(ctx) : null),
    ]);
  },

  async playRound(ctx, n, blockId) {
    const W = ctx.store.wiw, s = ctx.settings;
    const set = W.portraits.filter((p) => p.set === n - 1);
    await this.generate(ctx, set);   // normaal al klaar; na een herstart of bij uitval alsnog
    const shown = [];
    for (const pt of set) {
      if (this.isHere(ctx, pt.subject)) shown.push(pt);
      else ctx.log({ type: 'screen', text: ctx.t('portrait.gone', { no: '?', name: ctx.moderator.clean(pt.subjectName) }) });
    }
    if (!shown.length) return ctx.log({ type: 'screen', text: ctx.t('round.skip', { n }) });
    const order = shuffle(shown, ctx.rand);
    order.forEach((pt, i) => { pt.no = i + 1; });
    const questions = set[0]?.questions ?? [];
    ctx.log({ type: 'screen', kind: 'gallery', round: n, text: ctx.t('round.title', { n, questions: questions.join(' · ') }),
      images: order.map((pt) => ({ asset: pt.asset, label: `${pt.no} · ${pt.theme}` })) });
    const inRound = new Set(set.flatMap((p) => [p.maker, p.subject]));
    for (const pt of order) ctx.tell({ teamId: pt.subjectTeam, playerId: pt.subject, text: ctx.t('private.badge', { n, name: pt.subjectName }) });
    const speurders = this.people(ctx).filter((p) => !inRound.has(p.id));
    for (const p of speurders) ctx.tell({ teamId: p.teamId, playerId: p.id, text: ctx.t('private.search', { n }) });
    const items = order.map((pt) => ({ no: pt.no, asset: pt.asset, label: pt.theme, pt }));
    const options = shuffle(order.map((pt) => ({ id: pt.subject, name: ctx.moderator.clean(pt.subjectName), teamId: pt.subjectTeam })), ctx.rand);
    // Wie het plaatje maakte of erop staat, koppelt het niet (in deze opzet zijn dat altijd kandidaten, maar de regel blijft).
    const res = await this.matchAll(ctx, { speurders, items, options, truth: (it) => it.pt.subject, timeoutSec: s.searchSec + s.matchSec,
      excluded: (p) => items.filter((it) => it.pt.maker === p.id || it.pt.subject === p.id).map((it) => it.no) });
    const scores = this.teamScores(ctx, res);
    W.rounds[n] = {};
    for (const t of ctx.teams.filter((x) => x.active)) {
      const sc = scores.get(t.id);
      if (!sc) { W.rounds[n][t.id] = null; ctx.log({ type: 'note', team: t.id, text: ctx.t('round.none', { n }) }); continue; }
      W.rounds[n][t.id] = sc.mean;
      ctx.ledger.award(t.id, sc.mean, ctx.t('round.reason', { n, correct: sc.correct, total: sc.total, mean: sc.mean, members: sc.scores.length }), blockId);
    }
    // Onthulling: per plaatje naam, prompt, hoeveel het goed hadden, en een AI-zin.
    const lines = await ctx.ai.batch(order.map((pt) => () => this.commentary(ctx, pt)));
    order.forEach((pt, i) => {
      const got = res.filter((r) => r.seen.has(pt.no)).length;
      const correct = res.filter((r) => r.hits.has(pt.no)).length;
      ctx.log({ type: 'screen', kind: 'reveal', round: n, no: pt.no, images: [{ asset: pt.asset, label: `${pt.no}` }],
        text: `${pt.no}. ${ctx.t('reveal.line', { name: ctx.moderator.clean(pt.subjectName), theme: pt.theme })} · ${ctx.t('reveal.stats', { correct, total: got })} · “${ctx.moderator.clean(pt.prompt)}” · ${lines[i].output.line}` });
    });
  },

  // Teamportretten voor de finale (parallel aan de laatste ronde): AI voegt de prompts over de leden samen.
  async prepareTeams(ctx) {
    const W = ctx.store.wiw;
    const teams = ctx.teams.filter((t) => t.active);
    if (teams.length < 3 || W.teamPortraits.length) return;
    W.teamPortraits = teams.map((t) => ({ teamId: t.id, prompts: W.portraits.filter((p) => p.subjectTeam === t.id && p.prompt).map((p) => `${p.theme}: ${p.prompt}`).slice(0, 5) }));
    await ctx.ai.batch(W.teamPortraits.map((tp) => async () => {
      const m = await ctx.ai.call({
        id: 'merge', kind: 'text', input: { prompts: tp.prompts }, timeoutSec: 10,
        llm: { system: 'Combine these metaphor image prompts about the members of one team into ONE image prompt for a single creature or scene that blends one striking element from each. Max 60 words, no people, no faces, no text. Answer JSON {"prompt": string}.', user: JSON.stringify(tp.prompts) },
        fixture: (i) => ({ prompt: i.prompts.map((p) => p.split(/[,.]/)[0]).join('; ') }),
        validate: (o) => typeof o?.prompt === 'string' && o.prompt.length > 5,
        fallback: (i) => ({ prompt: `${ctx.t('merge.fallback')}: ${i.prompts.map((p) => p.split(/[,.]/)[0]).join('; ')}` }),
        moderate: true,
      });
      tp.prompt = m.output.prompt;
      const r = await this.image(ctx, ctx.t('finale.reveal', { team: this.teamName(ctx, tp.teamId) }), tp.prompt, `team:${tp.teamId}`);
      tp.asset = r.asset; tp.source = r.source;
    }), { concurrency: ctx.settings.imageConcurrency });
  },

  async wall(ctx) {
    const W = ctx.store.wiw;
    const rest = W.portraits.filter((p) => p.set === -1);
    await this.generate(ctx, rest);
    const list = rest.length ? rest : W.portraits.filter((p) => p.asset);
    ctx.log({ type: 'screen', kind: 'wall', text: ctx.t(rest.length ? 'wall.title' : 'wall.recap'),
      images: list.slice(0, 60).map((p) => ({ asset: p.asset, label: `${ctx.moderator.clean(p.subjectName)} · ${p.theme}` })) });
  },

  async finale(ctx, blockId) {
    const W = ctx.store.wiw, s = ctx.settings, mult = s.finaleMultiplier;
    const teams = ctx.teams.filter((t) => t.active);
    let items, options, truth, excluded;
    if (teams.length >= 3) {
      await this.prepareTeams(ctx);
      const tps = shuffle(W.teamPortraits.filter((tp) => tp.asset), ctx.rand);
      tps.forEach((tp, i) => { tp.no = i + 1; });
      items = tps.map((tp) => ({ no: tp.no, asset: tp.asset, label: `${tp.no}`, tp }));
      options = teams.map((t) => ({ id: t.id, name: this.teamName(ctx, t.id) }));
      truth = (it) => it.tp.teamId;
      excluded = (p) => items.filter((it) => it.tp.teamId === p.teamId).map((it) => it.no);
      ctx.log({ type: 'screen', kind: 'gallery', text: ctx.t('finale.title'), images: items.map((it) => ({ asset: it.asset, label: `${it.no}` })) });
    } else {   // 2 teams: "weet je het nog?" met maximaal 6 plaatjes uit eerdere rondes
      const pool = shuffle(W.portraits.filter((p) => p.no && p.asset && p.set >= 0), ctx.rand).slice(0, 6);
      items = pool.map((pt, i) => ({ no: i + 1, asset: pt.asset, label: pt.theme, pt }));
      options = shuffle(pool.map((pt) => ({ id: pt.subject, name: ctx.moderator.clean(pt.subjectName) })), ctx.rand);
      truth = (it) => it.pt.subject;
      excluded = (p) => items.filter((it) => it.pt.maker === p.id || it.pt.subject === p.id).map((it) => it.no);
      ctx.log({ type: 'screen', kind: 'gallery', text: ctx.t('finale.memory'), images: items.map((it) => ({ asset: it.asset, label: `${it.no} · ${it.label}` })) });
    }
    const res = await this.matchAll(ctx, { speurders: this.people(ctx), items, options, truth, excluded, timeoutSec: s.searchSec, kind: 'match' });
    const scores = this.teamScores(ctx, res);
    for (const t of teams) {
      const sc = scores.get(t.id);
      if (!sc) { ctx.ledger.award(t.id, 0, ctx.t('finale.none'), blockId); continue; }
      ctx.ledger.award(t.id, r2(sc.mean * mult), ctx.t('finale.reason', { correct: sc.correct, total: sc.total, mean: sc.mean, mult }), blockId);
    }
    for (const it of items) ctx.log({ type: 'screen', kind: 'reveal', images: [{ asset: it.asset, label: `${it.no}` }],
      text: it.tp ? `${it.no}. ${ctx.t('finale.reveal', { team: this.teamName(ctx, it.tp.teamId) })}` : `${it.no}. ${ctx.moderator.clean(it.pt.subjectName)}` });
  },

  // Uitslag: compensatie voor rondes zonder speurders (gedeclareerd), daarna de uitleg per team.
  async results(ctx, blockId) {
    const W = ctx.store.wiw;
    for (const t of ctx.teams.filter((x) => x.active)) {
      const vals = Object.values(W.rounds).map((r) => r[t.id]).filter((v) => typeof v === 'number');
      const mean = vals.length ? r2(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      for (const [n, r] of Object.entries(W.rounds)) if (t.id in r && r[t.id] === null) ctx.ledger.award(t.id, mean, ctx.t('round.compensate', { n, mean }), blockId);
    }
    if (W.portraits.some((p) => p.set === -1)) await ctx.once('wall', () => this.wall(ctx));
    ctx.log({ type: 'screen', text: ctx.t('results.title') });
    for (const t of ctx.teams.filter((x) => x.active)) ctx.log({ type: 'explain', team: t.id, lines: ctx.ledger.explain(t.id) });
  },
};
