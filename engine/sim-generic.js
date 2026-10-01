// Generieke simulatie voor elk spel in games/<slug>/ met pakket packs/<pack>/pack.json.
import { readFileSync } from 'node:fs';
import { createSession, makeTeams, validateExport } from './index.js';

export async function loadGame(slug) {
  const m = await import(`../games/${slug}/index.js`);
  return { game: m.default, defaults: m.defaults };
}
export const loadPack = (name = 'demo') => JSON.parse(readFileSync(new URL(`../packs/${name}/pack.json`, import.meta.url), 'utf8'));

export async function simulate(slug, opts = {}) {
  const { players, teams, durationMin = 40, lang = 'nl', chaos = {}, mutate, seed = 1, restore, settings = {}, pack = loadPack(), mode = 'test', provider = null, inputs = null, wrap } = opts;
  const loaded = await loadGame(slug);
  const game = wrap ? wrap(loaded.game) : loaded.game, defaults = loaded.defaults;
  const p = players ?? game.limits.minPlayers, t = teams ?? game.limits.minTeams;
  const tm = makeTeams(p, t);
  mutate?.(tm);
  const s = createSession({ game, pack, teams: tm, durationMin, lang, defaults, chaos, seed, restore, settings, mode, provider, inputs });
  const res = await s.run();
  return { s, res, teams: tm, valid: validateExport(res.export), game };
}
