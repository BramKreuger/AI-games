// AI-laag: mock in testmodus, providers in live. Weigering/time-out/ongeldig => altijd fallback.
export function createAI({ mode = 'test', provider = null, moderator, clock, timeoutMs = 20000, chaos = {}, stats = {} } = {}) {
  let batch = null; // parallelle calls: klok loopt max(latency), niet de som
  const tick = (sec) => (batch ? (batch.max = Math.max(batch.max, sec)) : clock?.advance(sec));
  stats.calls = 0; stats.fallbacks = 0; stats.reasons = {};
  return {
    // Voert calls parallel uit; de virtuele klok loopt met de traagste.
    async batch(fns) {
      batch = { max: 0 };
      try { return await Promise.all(fns.map((f) => f())); }
      finally { const m = batch.max; batch = null; clock?.advance(m); }
    },
    async call(step) {
      stats.calls++;
      const fb = (reason) => {
        stats.fallbacks++; stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
        return { output: step.fallback(step.input), source: 'fallback', reason };
      };
      let raw, latency = chaos.latencyMs ?? 1500;
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
