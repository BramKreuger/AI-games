// Minimale livelaag (geen dependencies): telefoon (/phone), groot scherm (/screen), dashboard (/dashboard).
// Eén sessie per server. Invoer van spelers komt binnen via ctx.collect (inputs-provider hieronder).
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createSession, makeTeams, validateExport } from './index.js';
import { loadGame, loadPack } from './sim-generic.js';
import { listGames } from './registry.js';
import { createOpenAIProvider } from './providers/openai.js';

const WEB = new URL('./web/', import.meta.url);
const page = (f) => readFileSync(new URL(f, WEB), 'utf8');
const json = (res, obj, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 3e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });

export function createLiveServer({ port = 0, timeoutScale = 1, presenceSec = 15, pack = loadPack() } = {}) {
  const players = new Map();       // id -> { id, name, teamId, optOut, lastSeen, inbox[] }
  const pending = new Map();       // inputId -> { teamId, playerId, kind, timeoutSec, resolve }
  let seq = 0, run = null;         // run: { slug, lang, session, state, result, cursor }
  const now = () => Date.now();
  const connected = (p) => now() - p.lastSeen < presenceSec * 1000;
  const teamList = () => [...new Set([...players.values()].map((p) => p.teamId))].sort();

  const inputs = ({ teamId, playerId, kind, timeoutSec, data = null }) => new Promise((resolve) => {
    const id = `i${++seq}`;
    const t = setTimeout(() => { pending.delete(id); resolve(null); }, Math.max(50, timeoutSec * 1000 * timeoutScale));
    pending.set(id, { id, teamId, playerId, kind, timeoutSec, data, resolve: (v) => { clearTimeout(t); pending.delete(id); resolve(v); } });
  });

  // mode 'live': echte AI via de OpenAI-provider (sleutel in OPENAI_GAME_KEY); zonder sleutel blijft het testmodus.
  async function start({ slug, lang = 'nl', durationMin = 40, bots = 0, settings = {}, mode = 'test' }) {
    if (run && run.state === 'running') throw new Error('sessie loopt al; stop die eerst');
    for (const [id, p] of players) if (p.bot) players.delete(id);
    const { game, defaults } = await loadGame(slug);
    for (let i = 0; i < bots; i++) {   // bots vullen op; ze reageren niet via telefoon maar via de bot-functie (zie botReply)
      const id = `B${i + 1}`; players.set(id, { id, name: `Bot ${i + 1}`, teamId: `T${(i % Math.max(2, game.limits.minTeams)) + 1}`, optOut: false, lastSeen: Infinity, bot: true, inbox: [] });
    }
    const byTeam = new Map();
    for (const p of players.values()) (byTeam.get(p.teamId) ?? byTeam.set(p.teamId, []).get(p.teamId)).push(p);
    const teams = [...byTeam].map(([id, ps]) => ({ id, name: id, active: true, players: ps.map((p) => ({ id: p.id, name: p.name, connected: true, optOut: p.optOut, _ref: p })) }));
    const sync = () => teams.forEach((t) => t.players.forEach((q) => { q.connected = q._ref.bot || connected(q._ref); }));
    sync(); const iv = setInterval(sync, 1000);
    let stopped = false;   // na reset: invoer geeft direct null, de oude sessie loopt snel leeg
    const provider = mode === 'live' ? createOpenAIProvider() : null;
    const session = createSession({ game, pack, teams, durationMin, lang, defaults, settings, mode: provider ? 'live' : 'test', provider, inputs: (r) => (stopped ? Promise.resolve(null) : botReply(r, players) ?? inputs(r)), id: `live-${Date.now()}` });
    const mine = run = { slug, lang, session, state: 'running', result: null, cursor: 0, stop: () => { stopped = true; } };
    session.run().then((r) => { mine.result = r; if (mine.state === 'running') mine.state = 'done'; }).catch((e) => { mine.state = 'error'; mine.error = e.message; }).finally(() => clearInterval(iv));
    return { teams: teams.length };
  }

  // Botspelers antwoorden zelf (dashboard-optie voor een test met minder mensen).
  function botReply({ teamId, playerId, kind }) {
    const who = playerId ? players.get(playerId) : [...players.values()].find((p) => p.teamId === teamId && !p.bot) ?? null;
    if (who && !who.bot) return null;
    if (!who && ![...players.values()].some((p) => p.teamId === teamId && p.bot)) return null;
    const words = ['boom', 'zon', 'wind', 'rollercoaster', 'file'];
    if (kind === 'photo') return Promise.resolve({ id: 'bot', people: 3, flags: [] });
    if (kind === 'vote' || kind === 'blame') return Promise.resolve(1);
    if (kind === 'match') return Promise.resolve({});
    if (kind === 'prompt') return Promise.resolve('een vrolijk dier dat graag buiten is');
    return Promise.resolve(words[Math.floor(Math.random() * words.length)]);
  }

  // Stop de huidige sessie zodat je een ander spel kunt kiezen. Spelers blijven verbonden.
  function reset() {
    for (const it of [...pending.values()]) it.resolve(null);
    if (run) { run.stop(); run.state = 'stopped'; }
    for (const [id, p] of players) if (p.bot) players.delete(id);
    run = null;
  }

  const screenEvents = () => (run?.session.events ?? []).filter((e) => e.type === 'screen');
  const view = (pid) => {
    const p = pid ? players.get(pid) : null;
    if (p) p.lastSeen = now();
    const s = run?.session;
    const pend = [...pending.values()].find((x) => p && x.teamId === p.teamId && (!x.playerId || x.playerId === p.id));
    const priv = (s?.events ?? []).filter((e) => e.type === 'private' && p && e.teamId === p.teamId && (!e.playerId || e.playerId === p.id)).at(-1);
    return {
      state: run?.state ?? 'lobby', lang: run?.lang ?? 'nl', slug: run?.slug ?? null,
      me: p ? { id: p.id, name: p.name, teamId: p.teamId } : null,
      prompt: pend ? { id: pend.id, kind: pend.kind, timeoutSec: pend.timeoutSec, data: pend.data ?? null } : null,
      private: priv?.text ?? null,
      screen: screenEvents().slice(-40),
      totals: s ? s.ledger.totals((s.ctx.teams ?? []).map((t) => t.id)) : [],
      teams: teamList(), playersCount: players.size,
    };
  };

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && ['/', '/phone', '/screen', '/dashboard', '/games'].includes(u.pathname)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(page(u.pathname === '/' ? 'phone.html' : `${u.pathname.slice(1)}.html`));
      }
      if (req.method === 'GET' && u.pathname === '/web/common.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(page('common.js')); }
      if (req.method === 'GET' && u.pathname === '/web/ui.json') return json(res, JSON.parse(page('ui.json')));
      if (req.method === 'GET' && u.pathname.startsWith('/asset/')) {   // sessiebestand (AI-beeld) uit ctx.assets
        const a = run?.session.assets.get(u.pathname.slice(7)); const m = a && /^data:([^;,]+)(;base64)?,(.*)$/s.exec(a.data);
        if (!m) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': m[1], 'cache-control': 'max-age=3600' });
        return res.end(m[2] ? Buffer.from(m[3], 'base64') : decodeURIComponent(m[3]));
      }
      if (req.method === 'GET' && u.pathname === '/api/state') return json(res, view(u.searchParams.get('player')));
      if (req.method === 'GET' && u.pathname === '/api/dashboard') {
        const s = run?.session;
        return json(res, { ...view(null), players: [...players.values()].map((p) => ({ id: p.id, name: p.name, teamId: p.teamId, optOut: p.optOut, connected: !!p.bot || connected(p) })),
          entries: s?.ledger.entries() ?? [], valid: run?.result ? validateExport(run.result.export).valid : null, error: run?.error ?? null, aiStats: s?.aiStats ?? null });
      }
      if (req.method === 'POST' && u.pathname === '/api/join') {
        const b = await body(req); const name = String(b.name ?? '').trim().slice(0, 30);
        if (!name) return json(res, { error: 'naam' }, 400);
        let p = b.playerId && players.get(b.playerId);   // herverbinden
        if (!p) {
          const id = `P${++seq}`; const counts = {};
          for (const q of players.values()) counts[q.teamId] = (counts[q.teamId] ?? 0) + 1;
          const teamId = b.teamId || `T${[...Array(12).keys()].map((i) => `T${i + 1}`).sort((a, c) => (counts[a] ?? 0) - (counts[c] ?? 0))[0].slice(1)}`;
          p = { id, name, teamId, optOut: !!b.optOut, inbox: [] }; players.set(id, p);
        }
        p.lastSeen = now();
        return json(res, { playerId: p.id, teamId: p.teamId });
      }
      if (req.method === 'POST' && u.pathname === '/api/input') {
        const b = await body(req); const p = players.get(b.playerId); if (!p) return json(res, { error: 'onbekend' }, 404);
        p.lastSeen = now();
        const it = pending.get(b.inputId); if (!it || it.teamId !== p.teamId) return json(res, { error: 'verlopen' }, 409);
        let v = b.value;
        if (it.kind === 'photo') v = { id: `ph-${it.id}`, people: [...players.values()].filter((q) => q.teamId === p.teamId && (q.bot || connected(q))).length, flags: v?.flags ?? [], bytes: typeof v?.data === 'string' && v.data.startsWith('data:image/') ? v.data.length : 0 };
        it.resolve(v); return json(res, { ok: true });
      }
      if (req.method === 'GET' && u.pathname === '/api/games') return json(res, await listGames());
      if (req.method === 'POST' && u.pathname === '/api/reset') { reset(); return json(res, { ok: true }); }
      if (req.method === 'POST' && u.pathname === '/api/start') return json(res, await start(await body(req)));
      if (req.method === 'POST' && u.pathname === '/api/correct') {
        const b = await body(req); const e = run?.session.ledger.correct(b.entryId, Number(b.delta), String(b.reason ?? '')); return json(res, e);
      }
      res.writeHead(404); res.end('niet gevonden');
    } catch (e) { json(res, { error: e.message }, 400); }
  });

  return {
    server, players, pending,
    listen: () => new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server.address().port))),
    close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(ok); }),
    get run() { return run; },
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const srv = createLiveServer({ port: Number(process.env.PORT ?? 8080) });
  console.log(`http://127.0.0.1:${await srv.listen()}/dashboard  (spellen: /games, telefoon: /phone, groot scherm: /screen)`);
}
