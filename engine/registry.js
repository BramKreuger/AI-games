// Spelregister: elk spel met games/<slug>/meta.json en index.js verschijnt automatisch in het overzicht.
import { readdirSync, existsSync, readFileSync } from 'node:fs';

const GAMES = new URL('../games/', import.meta.url);
const STATUS = { referentie: 'Referentie', 'speltest-nodig': 'Speltest nodig', getest: 'Getest met echte mensen', concept: 'Concept' };

export async function listGames() {
  const out = [];
  for (const d of readdirSync(GAMES, { withFileTypes: true })) {
    if (!d.isDirectory() || !existsSync(new URL(`${d.name}/meta.json`, GAMES)) || !existsSync(new URL(`${d.name}/index.js`, GAMES))) continue;
    const meta = JSON.parse(readFileSync(new URL(`${d.name}/meta.json`, GAMES), 'utf8'));
    const { default: game } = await import(`../games/${d.name}/index.js`);
    const blocks = game.blocks(game.defaults);
    out.push({
      slug: d.name, title: meta.title, summary: meta.summary, tags: meta.tags ?? [],
      status: meta.status ?? 'concept', statusLabel: STATUS[meta.status] ?? meta.status,
      engineVersion: game.engineVersion, limits: game.limits,
      minutes: { min: blocks.reduce((s, b) => s + b.min, 0), max: 60 },
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}
