// Generieke OpenAI-provider voor mode: 'live'. Gebruik: createSession({ mode: 'live', provider: createOpenAIProvider({ apiKey }) }).
// Elke AI-stap wordt herkend aan step.id (en vorm van de invoer). Onbekende stap, fout, budgetoverschrijding
// of ongeldige JSON geeft een exceptie; de AI-laag valt dan terug op de fallback van de stap.
// Foto's: step.input.photo.dataUrl (data:image/...;base64,...) gaat mee als beeld; zonder dataUrl alleen de metagegevens.
const PRICE = {   // USD per 1M tokens (invoer, uitvoer); schatting voor budgetbewaking
  'gpt-4o-mini': [0.15, 0.6], 'gpt-4o': [2.5, 10], 'text-embedding-3-small': [0.02, 0],
};

export function createOpenAIProvider({ apiKey = process.env.OPENAI_GAME_KEY, budgetUsd = 1, model = 'gpt-4o-mini', embedModel = 'text-embedding-3-small', fetchImpl = fetch, baseUrl = 'https://api.openai.com/v1' } = {}) {
  if (!apiKey) throw new Error('geen API-sleutel');
  const usage = { spentUsd: 0, calls: 0, latenciesMs: [], byStep: {} };
  const cost = (m, inTok, outTok) => ((PRICE[m]?.[0] ?? 1) * inTok + (PRICE[m]?.[1] ?? 1) * outTok) / 1e6;

  async function post(path, body, stepId) {
    if (usage.spentUsd >= budgetUsd) throw new Error('budget op');
    const t0 = Date.now();
    const res = await fetchImpl(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    const dt = Date.now() - t0;
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const json = await res.json();
    const u = json.usage ?? {}, m = body.model;
    const c = cost(m, u.prompt_tokens ?? u.total_tokens ?? 0, u.completion_tokens ?? 0);
    usage.spentUsd += c; usage.calls++; usage.latenciesMs.push(dt);
    const s = (usage.byStep[stepId] ??= { calls: 0, usd: 0, ms: 0 }); s.calls++; s.usd += c; s.ms += dt;
    return json;
  }

  async function chatJson(stepId, instruction, photos = []) {
    const content = [{ type: 'text', text: instruction }];
    for (const p of photos) if (p?.dataUrl) content.push({ type: 'image_url', image_url: { url: p.dataUrl, detail: 'low' } });
    const j = await post('/chat/completions', { model, response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 300, messages: [{ role: 'user', content }] }, stepId);
    return JSON.parse(j.choices[0].message.content);
  }

  const langName = (l) => (l === 'en' ? 'English' : 'Dutch');
  const cosine = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; } return d / Math.sqrt(na * nb); };

  const handlers = {
    // blinde-bouwer: plan uit foto van voorwerpen
    blueprint: ({ photo, lang, items }) => chatJson('blueprint',
      `Look at the photo of a team's objects (if no photo, invent generic objects). Write ONE short building plan in ${langName(lang)} (max 35 words) for ${items} of these objects, describing relative positions (stacked, in a row, left/right). Players will build it blindfolded from spoken instructions. Reply as JSON {"plan": string}.`, [photo]),
    // levend-beeld: blinde beschrijving van de foto
    describe: ({ photo, lang }) => chatJson('describe',
      `Describe in ${langName(lang)}, in 1-2 sentences, only what the people in this photo physically do (poses, positions). Do not guess or name any concept. Reply as JSON {"description": string}.`, [photo]),
  };

  async function provider(step) {
    const { id, input } = step;
    if (id === 'judge' && input?.plan) {   // blinde-bouwer: foto tegen plan
      return chatJson('judge', `Compare the photo of a construction with this plan: "${input.plan}". Give a match score 0-100 (100 = identical). Reply as JSON {"score": number}.`, [input.photo]);
    }
    if (id === 'judge' && 'guess' in (input ?? {})) {   // levend-beeld: nabijheid via embeddings
      throw new Error('judge-guess vereist concept; gebruik createOpenAIProvider().similarity in het spel');
    }
    if (handlers[id]) return handlers[id](input ?? {});
    throw new Error(`onbekende stap ${id}`);
  }

  provider.usage = usage;
  // Hulpfuncties voor spellen die embeddings of moderatie rechtstreeks willen gebruiken.
  provider.similarity = async (a, b) => {
    const j = await post('/embeddings', { model: embedModel, input: [a, b] }, 'embed');
    return Math.max(0, Math.min(1, cosine(j.data[0].embedding, j.data[1].embedding)));
  };
  provider.moderate = async (text) => {
    const j = await post('/moderations', { model: 'omni-moderation-latest', input: text }, 'moderate');
    return !j.results[0].flagged;
  };
  provider.summary = () => {
    const l = [...usage.latenciesMs].sort((x, y) => x - y);
    return { calls: usage.calls, spentUsd: Number(usage.spentUsd.toFixed(5)), medianMs: l[Math.floor(l.length / 2)] ?? 0, maxMs: l.at(-1) ?? 0, byStep: usage.byStep };
  };
  return provider;
}
