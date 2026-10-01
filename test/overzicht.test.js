import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { listGames } from '../engine/registry.js';
import { createLiveServer } from '../engine/server.js';

test('registry: elk spel in games/ heeft meta.json en staat in het overzicht', async () => {
  const dirs = readdirSync(new URL('../games/', import.meta.url), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const d of dirs) assert.ok(existsSync(new URL(`../games/${d}/meta.json`, import.meta.url)), `meta.json ontbreekt in games/${d}`);
  const games = await listGames();
  assert.deepEqual(games.map((g) => g.slug).sort(), dirs.sort());
  for (const g of games) assert.ok(g.title.nl && g.title.en && g.summary.nl && g.summary.en && g.statusLabel);
});

test('server: overzicht, wisselen tussen spellen via stop en start', async () => {
  const srv = createLiveServer({ timeoutScale: 100 });
  const port = await srv.listen(); const base = `http://127.0.0.1:${port}`;
  const post = (p, b = {}) => fetch(base + p, { method: 'POST', body: JSON.stringify(b) }).then((r) => r.json());
  try {
    const games = await (await fetch(`${base}/api/games`)).json();
    assert.ok(games.length >= 3);
    assert.equal((await fetch(`${base}/games`)).status, 200);
    await post('/api/join', { name: 'Ann', teamId: 'T1' });   // mens die niet antwoordt: sessie blijft lopen
    await post('/api/start', { slug: 'stille-post', bots: 8, durationMin: 20 });
    assert.equal((await post('/api/start', { slug: 'demo', bots: 8 })).error?.includes('stop'), true);
    await post('/api/reset');
    assert.equal((await (await fetch(`${base}/api/state`)).json()).state, 'lobby');
    const r = await post('/api/start', { slug: 'demo', bots: 8, durationMin: 20 });
    assert.ok(r.teams >= 2);
    assert.equal((await (await fetch(`${base}/api/state`)).json()).slug, 'demo');
  } finally { await srv.close(); }
});
