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
  for (const [players, teams, d] of [[4, 2, 20], [12, 4, 40], [60, 12, 60], [13, 5, 40]]) {
    const { res, valid } = await simulate({ players, teams, durationMin: d });
    console.log(`${players}p/${teams}t/${d}min: ${res.plan.map((b) => `${b.id}=${b.minutes}`).join(' ')} export=${valid.valid ? 'ok' : valid.errors} top=${res.totals[0].teamId}:${res.totals[0].points}`);
  }
}
