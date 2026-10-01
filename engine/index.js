import { ENGINE_VERSION, satisfies } from './version.js';
import { createLedger } from './ledger.js';
import { createClock } from './clock.js';
import { createAI } from './ai.js';
import { createModerator } from './moderation.js';
import { createT } from './i18n.js';
import { planBlocks } from './plan.js';
import { rng } from './bots.js';

export { ENGINE_VERSION, planBlocks };
export { validateExport } from './ledger.js';
export { makeTeams, rng } from './bots.js';
export { embed, cosine, similarity, distance, tokens } from './embed.js';

export function createSession({ game, pack = {}, teams, mode = 'test', lang = 'nl', settings = {}, durationMin = 40,
  defaults = {}, provider = null, inputs = null, chaos = {}, seed = 1, id = 'session', restore = null, wait = null }) {
  if (!satisfies(ENGINE_VERSION, game.engineVersion)) throw new Error(`${game.id} vraagt engine ${game.engineVersion}, huidig ${ENGINE_VERSION}`);
  const L = game.limits;
  const players = teams.reduce((s, t) => s + t.players.length, 0);
  if (players < L.minPlayers || players > L.maxPlayers || teams.length < L.minTeams || teams.length > L.maxTeams) {
    throw new Error(`buiten ondersteunde grenzen: ${players} spelers, ${teams.length} teams`);
  }
  const cfg = { ...game.defaults, ...settings };
  const clock = createClock(restore?.at ?? 0);
  const moderator = createModerator(pack.blocklist ?? []);
  const aiStats = {};
  const ai = createAI({ mode, provider, moderator, clock, chaos, stats: aiStats, timeoutMs: cfg.aiTimeoutSec * 1000, budgetUsd: cfg.aiBudgetUsd ?? Infinity });
  // Bestanden van de sessie (bijv. AI-beelden als data-URL); het scherm en de telefoons verwijzen met een id.
  const assetStore = new Map(restore?.assets ?? []);
  const assets = {
    put(data, meta = {}) { const id = `a${assetStore.size + 1}`; assetStore.set(id, { data, ...meta }); return id; },
    get: (id) => assetStore.get(id) ?? null,
    size: () => assetStore.size,
  };
  // Engine 1.2: blokken mogen afhangen van de groep (aantal spelers/teams); spellen die dat negeren werken ongewijzigd.
  const groupInfo = { players, teams: teams.length };
  const ledger = createLedger(id, restore?.entries);
  const done = new Set(restore?.done ?? []);
  const events = [];
  const ctx = {
    teams, settings: cfg, pack, lang, mode, clock, ai, ledger, moderator, rand: rng(seed), assets, group: groupInfo,
    // Engine 1.2: spelstatus die een serverherstart overleeft (zit in snapshot/restore); `plan` = geplande blokken.
    store: structuredClone(restore?.store ?? {}), plan: [],
    t: createT({ lang, defaults, pack }),
    // Idempotente stap: na serverherstart wordt een reeds uitgevoerde stap overgeslagen.
    async once(key, fn) { if (done.has(key)) return; await fn(); done.add(key); },
    // Invoer van spelers. Testmodus: bot(); live: `inputs` (telefoons). Geen antwoord (uitval/no-show) => null.
    // Engine 1.2: `data` (optioneel) gaat mee naar de telefoon, bijv. de keuzelijst bij koppelen.
    async collect({ teamId, playerId = null, kind, timeoutSec = 60, bot, data = null }) {
      let v = null;
      if (chaos.inputFault?.({ kind, teamId, playerId }) === 'drop') v = null;
      else if (inputs) { try { v = await inputs({ teamId, playerId, kind, timeoutSec, data }); } catch { v = null; } }
      else v = bot ? bot() : null;
      events.push({ at: clock.now(), type: 'input', kind, teamId, got: v != null });
      return v ?? null;
    },
    // Privébericht aan een team of speler (bijv. het geheime begrip voor de regisseur). Nooit naar het grote scherm.
    // Engine 1.2: `big` toont het bericht groot (bijv. een naambadge om omhoog te houden).
    tell({ teamId, playerId = null, text, big = false }) { events.push({ at: clock.now(), type: 'private', teamId, playerId, text, ...(big ? { big } : {}) }); },
    log: (e) => events.push({ at: clock.now(), ...e }),
    // Engine 1.2: echte pauze in de livelaag (bijv. onthulling laten staan); in testmodus direct door.
    pause: (sec) => (wait ? wait(sec) : Promise.resolve()),
    activeTeams: () => teams.filter((t) => t.active),
  };

  return {
    ctx, events, ledger, aiStats, assets,
    snapshot: () => ({ entries: ledger.entries(), done: [...done], at: clock.now(), assets: [...assetStore], store: structuredClone(ctx.store) }),
    plan: () => planBlocks(game.blocks(cfg, groupInfo), durationMin),
    async run() {
      const plan = planBlocks(game.blocks(cfg, groupInfo), durationMin);
      ctx.plan = plan;
      const timing = [];
      for (const block of plan) {
        const t0 = clock.now();
        ctx.log({ type: 'block-start', block: block.id });
        try { await game.runBlock(ctx, block); }
        catch (e) { ctx.log({ type: 'block-error', block: block.id, error: e.message }); }
        // Spelsnelheid: blok krijgt het zijn minuten; resterende tijd is spelers-tijd (virtueel).
        const used = clock.now() - t0;
        const budget = block.minutes * 60;
        clock.advance(Math.max(0, budget - used));
        timing.push({ block: block.id, plannedMin: block.minutes, aiSec: used, overrun: used > budget });
      }
      const exported = ledger.export({ teamIds: teams.map((t) => t.id), declaration: game.declaration?.(cfg, teams) ?? {} });
      return { plan, timing, totals: exported.totals, export: exported, totalSec: clock.now() };
    },
  };
}
