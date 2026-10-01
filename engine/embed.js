// Embeddings voor testmodus: deterministisch, lokaal, zonder netwerk (woorden + letter-trigrammen).
// Live gebruikt een echte embeddings-provider via ctx.ai; deze functies zijn ook de terugvaloptie.
const DIM = 128;

const stem = (w) => w.replace(/(en|e|s|n)$/, '');
export const tokens = (text) => String(text ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter((w) => w.length > 1).map(stem);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function embed(text) {
  const v = new Array(DIM).fill(0);
  for (const w of tokens(text)) {
    v[hash(`w:${w}`) % DIM] += 2;
    const p = `^${w}$`;
    for (let i = 0; i + 3 <= p.length; i++) v[hash(`t:${p.slice(i, i + 3)}`) % DIM] += 0.5;
  }
  return v;
}

export function cosine(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

export const similarity = (a, b) => cosine(embed(a), embed(b));
export const distance = (a, b) => 1 - similarity(a, b);
