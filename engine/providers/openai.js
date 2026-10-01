// Live-provider voor OpenAI (tekst, beeld, embeddings). Alleen gebruikt met mode: 'live'.
// Sleutel uit OPENAI_GAME_KEY (of OPENAI_API_KEY); modellen in te stellen via env. Node: draai met
// NODE_USE_ENV_PROXY=1 als uitgaand verkeer via een proxy moet.
// Een stap beschrijft zijn live-vraag zelf: tekst via `step.llm = { system, user, json }`, beeld via
// `step.input.prompt`, embeddings via `step.input.texts`. De provider geeft `_costUsd` mee (schatting).
const PRICE = {   // USD, schatting; pas aan als de prijslijst wijzigt
  text: { in: 0.4 / 1e6, out: 1.6 / 1e6 },
  image: { low: 0.011, medium: 0.042, high: 0.167 },
  embed: 0.02 / 1e6,
};

export function createOpenAIProvider({
  apiKey = process.env.OPENAI_GAME_KEY ?? process.env.OPENAI_API_KEY,
  textModel = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1-mini',
  imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1-mini',
  imageQuality = process.env.OPENAI_IMAGE_QUALITY ?? 'low',
  imageSize = '1024x1024',
  embedModel = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
  base = 'https://api.openai.com/v1',
  fetchFn = globalThis.fetch,
} = {}) {
  if (!apiKey) return null;
  const post = async (path, body) => {
    const r = await fetchFn(`${base}${path}`, { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    // Weigering door de moderatie van de provider => terugval in de AI-laag.
    if (!r.ok) { if (j?.error?.code === 'moderation_blocked' || /safety|moderation/i.test(j?.error?.message ?? '')) return { refusal: true }; throw new Error(`openai ${r.status}: ${j?.error?.message ?? ''}`); }
    return j;
  };
  return async function provider(step) {
    const kind = step.kind ?? 'text';
    if (kind === 'image') {
      const j = await post('/images/generations', { model: imageModel, prompt: step.input.prompt, size: imageSize, quality: imageQuality, n: 1 });
      if (j.refusal) return j;
      const b64 = j.data?.[0]?.b64_json;
      return b64 ? { image: `data:image/png;base64,${b64}`, _costUsd: PRICE.image[imageQuality] ?? PRICE.image.medium } : null;
    }
    if (kind === 'embed') {
      const j = await post('/embeddings', { model: embedModel, input: step.input.texts });
      return { vectors: (j.data ?? []).map((d) => d.embedding), _costUsd: (j.usage?.total_tokens ?? 0) * PRICE.embed };
    }
    if (!step.llm) throw new Error(`stap ${step.id} heeft geen llm-beschrijving`);
    const { system, user, json = true } = step.llm;
    const j = await post('/chat/completions', {
      model: textModel, messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    if (j.refusal) return j;
    const msg = j.choices?.[0]?.message;
    if (msg?.refusal) return { refusal: true };
    const cost = (j.usage?.prompt_tokens ?? 0) * PRICE.text.in + (j.usage?.completion_tokens ?? 0) * PRICE.text.out;
    let out = msg?.content ?? '';
    if (json) { try { out = JSON.parse(out); } catch { return null; } }
    else out = { text: out };
    return { ...out, _costUsd: cost };
  };
}
