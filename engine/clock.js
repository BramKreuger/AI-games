// Virtuele klok in seconden (testmodus); live gebruikt dezelfde interface.
export function createClock(start = 0) {
  let t = start;
  return { now: () => t, advance(s) { t += s; return t; } };
}
