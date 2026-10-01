import { AsyncLocalStorage } from 'node:async_hooks';

// AI-laag: mock in testmodus, providers in live. Weigering/time-out/ongeldig => altijd fallback.
export function createAI({ mode = 'test', provider = null, moderator, clock, timeoutMs = 20000, chaos = {}, stats = {} } = {}) {
  // Parallelle banen (batch): binnen een baan tellen opeenvolgende calls op, tussen banen loopt de klok met de traagste.
  const lane = new AsyncLocalStorage();
  const tick = (sec) => { const l = lane.getStore(); if (l) l.sum += sec; else clock?.advance(sec); };
  stats.calls = 0; stats.fallbacks = 0; stats.reasons = {};
  return {
    // Voert calls parallel uit; de virtuele klok loopt met de traagste.
    async batch(fns) {
      const lanes = fns.map(() => ({ sum: 0 }));
      try { return await Promise.all(fns.map((f, i) => lane.run(lanes[i], f))); }
      finally { tick(Math.max(0, ...lanes.map((l) => l.sum))); }   // ook geneste batches tellen mee in de ouderbaan
    },
    async call(step) {
      stats.calls++;
      const fb = (reason) => {
        stats.fallbacks++; stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
        return { output: step.fallback(step.input), source: 'fallback', reason };
      };
      let raw, latency = chaos.latencyMs ?? 1500;
      // Invoer-scherm (bijv. beeldmoderatie): onveilige invoer gaat nooit naar het model of het scherm.
      if (step.screen && !step.screen(step.input)) return fb('moderated');
      try {
        const fault = chaos.fault?.(step);
        if (fault === 'refuse') return fb('refused');
        if (fault === 'timeout') { tick(timeoutMs / 1000); return fb('timeout'); }
        if (mode === 'live') {
          if (!provider) return fb('no-provider');
          const t0 = Date.now();
          raw = await Promise.race([
            provider(step),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
          ]);
          latency = Date.now() - t0;
        } else {
          raw = typeof step.fixture === 'function' ? step.fixture(step.input) : step.fixture;
        }
        if (fault === 'invalid') raw = { garbage: true };
        tick(latency / 1000);
      } catch (e) {
        if (e.message === 'timeout') { tick(timeoutMs / 1000); return fb('timeout'); }
        return fb('error');
      }
      if (raw?.refusal) return fb('refused');
      if (step.validate && !step.validate(raw)) return fb('invalid');
      if (step.moderate && moderator) {
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        if (!moderator.check(text).ok) return fb('moderated');
      }
      return { output: raw, source: 'ai' };
    },
  };
}
