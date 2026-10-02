import { createSession, makeTeams, validateExport } from './index.js';
import game, { defaults } from '../games/demo/index.js';
import { readFileSync } from 'node:fs';

const pack = JSON.parse(readFileSync(new URL('../packs/demo/pack.json', import.meta.url), 'utf8'));

export async function simulate(opts = {}) {
  const { players = 12, teams = 4, durationMin = 40, lang = 'nl', chaos = {}, mutate, seed = 1, restore } = opts;
  const t = makeTeams(players, teams);
  mutate?.(t);
  const s = createSession({ game, pack, teams: t, durationMin, lang, defaults, chaos, seed, restore });
  const res = await s.run();
  return { s, res, teams: t, valid: validateExport(res.export) };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const slug = process.argv[2] ?? 'demo';
  const grid = [[4, 2, 20], [12, 4, 40], [60, 12, 60], [13, 5, 40]];
  if (slug === 'demo') {
    for (const [players, teams, d] of grid) {
      const { res, valid } = await simulate({ players, teams, durationMin: d });
      console.log(`${players}p/${teams}t/${d}min: ${res.plan.map((b) => `${b.id}=${b.minutes}`).join(' ')} export=${valid.valid ? 'ok' : valid.errors} top=${res.totals[0].teamId}:${res.totals[0].points}`);
    }
  } else {
    const { simulate: gen, loadGame } = await import('./sim-generic.js');
    const { limits: L } = (await loadGame(slug)).game;   // raster binnen de grenzen van het spel
    for (const [p, t, d] of grid) {
      const players = Math.min(L.maxPlayers, Math.max(L.minPlayers, p)), teams = Math.min(L.maxTeams, Math.max(L.minTeams, t));
      const { res, valid } = await gen(slug, { players, teams, durationMin: d });
      console.log(`${players}p/${teams}t/${d}min: ${res.plan.map((b) => `${b.id}=${b.minutes}`).join(' ')} export=${valid.valid ? 'ok' : valid.errors} top=${res.totals[0].teamId}:${Math.round(res.totals[0].points * 100) / 100}`);
    }
  }
}
