// Deterministische RNG en botteams voor testmodus.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

export function makeTeams(players, teams, rand = rng(7)) {
  const out = Array.from({ length: teams }, (_, i) => ({ id: `T${i + 1}`, name: `Bot ${i + 1}`, players: [], active: true }));
  for (let p = 0; p < players; p++) out[p % teams].players.push({ id: `P${p + 1}`, connected: true, bot: true, optOut: rand() < 0.1 });
  return out;
}
