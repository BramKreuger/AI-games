// Plan blokken binnen `minutes`. Blok: { id, min, goal, max, priority } (minuten, priority 1 = hoogst).
// Begin met alles op min; verhoog naar goal/max op prioriteit; skip laagste prioriteit als min niet past.
export function planBlocks(blocks, minutes) {
  let chosen = [...blocks];
  const sumMin = (l) => l.reduce((s, b) => s + b.min, 0);
  while (chosen.length && sumMin(chosen) > minutes) {
    const drop = chosen.filter((b) => !b.required).sort((a, b) => b.priority - a.priority)[0];
    if (!drop) break;
    chosen = chosen.filter((b) => b !== drop);
  }
  const alloc = new Map(chosen.map((b) => [b.id, b.min]));
  let left = minutes - sumMin(chosen);
  for (const key of ['goal', 'max']) {
    for (const b of [...chosen].sort((a, c) => a.priority - c.priority)) {
      const add = Math.min(b[key] - alloc.get(b.id), left);
      if (add > 0) { alloc.set(b.id, alloc.get(b.id) + add); left -= add; }
    }
  }
  return blocks.filter((b) => alloc.has(b.id)).map((b) => ({ ...b, minutes: alloc.get(b.id) }));
}
