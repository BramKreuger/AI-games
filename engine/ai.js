import { AsyncLocalStorage } from 'node:async_hooks';

// AI-laag: mock in testmodus, providers in live. Weigering/time-out/ongeldig => altijd fallback.
// Engine 1.2: `kind` ('text' standaard, 'image', 'embed') gaat mee naar de provider; beelden worden niet als tekst
// gemodereerd (daarvoor: `screen` op de prompt en de moderatie van de provider). Kosten (provider meldt `_costUsd`)
// tellen op in stats.costUsd; boven `budgetUsd` geeft elke call direct de terugval ('budget').
export function createAI({ mode = 'test', provider = null, moderator, clock, timeoutMs = 20000, chaos = {}, stats = {}, budgetUsd = Infinity } = {}) {
  // Parallelle banen (batch): binnen een baan tellen opeenvolgende calls op, tussen banen loopt de klok met de traagste.
  const lane = new AsyncLocalStorage();
  const tick = (sec) => { const l = lane.getStore(); if (l) l.sum += sec; else clock?.advance(sec); };
  stats.calls = 0; stats.fallbacks = 0; stats.reasons = {}; stats.byKind = {}; stats.costUsd = 0;
  // Voert een groep calls parallel uit; de virtuele klok loopt met de traagste.
  async function wave(fns) {
    const lanes = fns.map(() => ({ sum: 0 }));
    try { return await Promise.all(fns.map((f, i) => lane.run(lanes[i], f))); }
    finally { tick(Math.max(0, ...lanes.map((l) => l.sum))); }   // ook geneste batches tellen mee in de ouderbaan
  }
  return {
    // Voert calls parallel uit. `concurrency` (optioneel): hoogstens zoveel tegelijk, in golven (bijv. beeldcalls
    // tegen providerlimieten); de klok telt dan de golven op.
    async batch(fns, { concurrency = Infinity } = {}) {
      if (!(concurrency < fns.length)) return wave(fns);
      const out = [];
      for (let i = 0; i < fns.length; i += concurrency) out.push(...await wave(fns.slice(i, i + concurrency)));
      return out;
    },
    async call(step) {
      stats.calls++;
      const kind = step.kind ?? 'text';
      stats.byKind[kind] = (stats.byKind[kind] ?? 0) + 1;
      const fb = (reason) => {
        stats.fallbacks++; stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
        return { output: step.fallback(step.input), source: 'fallback', reason };
      };
      const tms = step.timeoutSec ? step.timeoutSec * 1000 : timeoutMs;   // engine 1.2: time-out per stap
      let raw, latency = chaos.latencyFor?.(step) ?? chaos.latencyMs ?? 1500;
      // Invoer-scherm (bijv. beeldmoderatie): onveilige invoer gaat nooit naar het model of het scherm.
      if (step.screen && !step.screen(step.input)) return fb('moderated');
      if (mode === 'live' && stats.costUsd >= budgetUsd) return fb('budget');
      try {
        const fault = chaos.fault?.(step);
        if (fault === 'refuse') return fb('refused');
        if (fault === 'timeout') { tick(tms / 1000); return fb('timeout'); }
        if (mode === 'live') {
          if (!provider) return fb('no-provider');
          const t0 = Date.now();
          raw = await Promise.race([
            provider(step),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), tms)),
          ]);
          latency = Date.now() - t0;
          if (Number.isFinite(raw?._costUsd)) stats.costUsd += raw._costUsd;
        } else {
          raw = typeof step.fixture === 'function' ? step.fixture(step.input) : step.fixture;
        }
        if (fault === 'invalid') raw = { garbage: true };
        tick(latency / 1000);
      } catch (e) {
        if (e.message === 'timeout') { tick(tms / 1000); return fb('timeout'); }
        return fb('error');
      }
      if (raw?.refusal) return fb('refused');
      if (step.validate && !step.validate(raw)) return fb('invalid');
      if (step.moderate && moderator && kind === 'text') {
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        if (!moderator.check(text).ok) return fb('moderated');
      }
      return { output: raw, source: 'ai' };
    },
  };
}
