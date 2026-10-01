import { ENGINE_VERSION } from './version.js';

export function createLedger(sessionId = 'session', restore = []) {
  const entries = restore.map((e) => ({ ...e }));
  let seq = entries.length;
  const api = {
    award(teamId, points, reason, blockId = null) {
      if (!reason || !String(reason).trim()) throw new Error('award zonder reden');
      if (!Number.isFinite(points)) throw new Error('ongeldige punten');
      const e = { id: `e${++seq}`, teamId, points, reason, blockId };
      entries.push(e);
      return e;
    },
    correct(entryId, delta, reason) {
      const orig = entries.find((e) => e.id === entryId);
      if (!orig) throw new Error(`onbekende regel ${entryId}`);
      if (!reason) throw new Error('correctie zonder reden');
      const e = { id: `e${++seq}`, teamId: orig.teamId, points: delta, reason, blockId: orig.blockId, corrects: entryId };
      entries.push(e);
      return e;
    },
    entries: () => entries.map((e) => ({ ...e })),
    totals(teamIds = []) {
      const t = new Map(teamIds.map((id) => [id, 0]));
      for (const e of entries) t.set(e.teamId, (t.get(e.teamId) ?? 0) + e.points);
      return [...t].map(([teamId, points]) => ({ teamId, points }))
        .sort((a, b) => b.points - a.points || String(a.teamId).localeCompare(String(b.teamId)));
    },
    explain(teamId) {
      return entries.filter((e) => e.teamId === teamId).map((e) => `${e.points >= 0 ? '+' : ''}${e.points} ${e.reason}`);
    },
    export({ teamIds = [], declaration = {} } = {}) {
      return {
        adapter: 'standard-v1', engine: ENGINE_VERSION, session: sessionId, declaration,
        entries: api.entries(), totals: api.totals(teamIds),
      };
    },
  };
  return api;
}

export function validateExport(x) {
  const errs = [];
  if (!x || x.adapter !== 'standard-v1') errs.push('adapter');
  if (typeof x?.session !== 'string') errs.push('session');
  if (!Array.isArray(x?.entries)) errs.push('entries');
  if (!Array.isArray(x?.totals)) errs.push('totals');
  const ids = new Set();
  for (const e of x?.entries ?? []) {
    if (!e.id || ids.has(e.id)) errs.push(`id ${e.id}`);
    ids.add(e.id);
    if (!e.reason) errs.push(`reden ${e.id}`);
    if (!Number.isFinite(e.points)) errs.push(`punten ${e.id}`);
    if (e.corrects && !ids.has(e.corrects)) errs.push(`corrects ${e.id}`);
  }
  for (const t of x?.totals ?? []) {
    const sum = (x.entries ?? []).filter((e) => e.teamId === t.teamId).reduce((s, e) => s + e.points, 0);
    if (sum !== t.points) errs.push(`totaal ${t.teamId}`);
  }
  return { valid: errs.length === 0, errors: errs };
}
