import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAIProvider } from '../engine/providers/openai.js';
import { simulate } from '../engine/sim-generic.js';

const okFetch = (content, usage = { prompt_tokens: 1000, completion_tokens: 100 }) => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }], usage }) });

test('provider: zonder sleutel een fout, nooit een sleutel in de uitvoer', () => {
  assert.throws(() => createOpenAIProvider({ apiKey: '' }));
});

test('provider: blueprint en judge geven geldige uitvoer en tellen kosten', async () => {
  const p = createOpenAIProvider({ apiKey: 'x', fetchImpl: okFetch({ plan: 'Zet twee voorwerpen op elkaar.', score: 80 }) });
  assert.equal((await p({ id: 'blueprint', input: { items: 3, lang: 'nl' } })).plan.length > 10, true);
  assert.equal((await p({ id: 'judge', input: { plan: 'x', photo: {} } })).score, 80);
  assert.ok(p.summary().spentUsd > 0 && p.summary().calls === 2);
});

test('provider: budget op, HTTP-fout en onbekende stap leiden tot terugval in het spel (spel loopt door)', async () => {
  const fail = createOpenAIProvider({ apiKey: 'x', fetchImpl: async () => ({ ok: false, status: 500 }) });
  const r = await simulate('blinde-bouwer', { mode: 'live', provider: fail, players: 4, teams: 2, durationMin: 20 });
  assert.equal(r.s.aiStats.fallbacks, r.s.aiStats.calls);
  const tiny = createOpenAIProvider({ apiKey: 'x', budgetUsd: 0.0001, fetchImpl: okFetch({ plan: 'Zet twee voorwerpen op elkaar.', score: 80 }, { prompt_tokens: 100000, completion_tokens: 0 }) });
  await tiny({ id: 'blueprint', input: { items: 3 } });
  await assert.rejects(tiny({ id: 'blueprint', input: { items: 3 } }), /budget/);
  await assert.rejects(tiny({ id: 'bestaat-niet', input: {} }));
});
