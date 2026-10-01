// Rooktest met echte provider op klein budget: `npm run smoke` (vereist OPENAI_GAME_KEY). Toont latency en kosten.
import { createOpenAIProvider } from './openai.js';
import { simulate } from '../sim-generic.js';
import { deflateSync } from 'node:zlib';

// Kleine synthetische PNG (gekleurde blokken) als nep-foto van een bouwsel.
function png(w = 64, h = 64) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; const blk = x < 32 ? [200, 40, 40] : y < 32 ? [40, 40, 200] : [230, 230, 60]; raw.set(blk, o); }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dataUrl = `data:image/png;base64,${png().toString('base64')}`;

const provider = createOpenAIProvider({ budgetUsd: Number(process.env.SMOKE_BUDGET_USD ?? 0.5) });
const inputs = async ({ kind }) => (kind === 'photo' ? { id: 'smoke', items: 3, flags: [], dataUrl } : kind === 'vote' ? 1 : null);
const r = await simulate('blinde-bouwer', { mode: 'live', provider, inputs, players: 4, teams: 2, durationMin: 20 });
console.log('AI-stappen', r.s.aiStats, '\nprovider', JSON.stringify(provider.summary(), null, 1));
console.log('regels', r.s.ledger.entries().map((e) => `${e.teamId} ${e.points} ${e.reason}`).join('\n'));
