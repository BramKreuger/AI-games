# Engine-API v1

```js
import { createSession } from '../../engine/index.js';
```

## Plug-in contract (`games/<slug>/index.js`, default export)
```js
{
  id: 'slug',
  engineVersion: '^1.0.0',            // semver-range
  limits: { minPlayers, maxPlayers, minTeams, maxTeams },
  defaults: { ... },                   // spelinstellingen
  blocks(settings) -> [               // tijdblokken, prioriteit 1 = hoogste
    { id, min, goal, max, priority, aiSteps: n }
  ],
  async runBlock(ctx, block)          // spellogica
}
```
`ctx`: `ctx.teams`, `ctx.settings`, `ctx.pack`, `ctx.t(key, vars)`, `ctx.ai.call(step)`,
`ctx.ledger.award(teamId, points, reason, blockId)`, `ctx.ledger.correct(entryId, delta, reason)`,
`ctx.clock`, `ctx.bots` (testmodus), `ctx.log(event)`.

## AI-stap
`ctx.ai.call({ id, input, fixture, validate(out)->bool, fallback(input)->out, moderate: true })`.
Testmodus: gebruikt `fixture`. Weigering, time-out en ongeldige uitvoer leiden altijd tot `fallback`;
resultaat bevat `{ output, source: 'ai'|'fallback', reason? }`. Uitvoer wordt gemodereerd.

## Leaderboard
Elke regel: `{ id, teamId, points, reason, blockId, corrects? }`. Export: `ledger.export()` volgt
`standard-v1`: `{ adapter:'standard-v1', engine, session, declaration, entries[], totals[] }`;
`validateExport(obj)` controleert dit.

## Tijd
Virtuele klok in testmodus. De sessie plant blokken binnen `durationMin` op prioriteit
(`planBlocks(blocks, minutes)`); blokken met lage prioriteit worden gekort of overgeslagen.

## Uitbreidingen in engine 1.1.0 (achterwaarts compatibel)
- `ctx.collect({ teamId, playerId?, kind, timeoutSec, bot })` — invoer van spelers. Testmodus: `bot()`; live: `inputs`-provider van de sessie (telefoons). Uitval of geen antwoord geeft `null`; `chaos.inputFault` kan invoer laten vallen.
- `ctx.tell({ teamId, playerId?, text })` — privébericht (bijv. geheim begrip); wordt als event `private` gelogd en komt nooit op het grote scherm.
- `ctx.ai.call({ ..., screen(input) -> bool })` — invoerscherm vóór het model (bijv. beeldmoderatie); `false` geeft terugval `moderated`.
- `ctx.ai.batch(fns)` — parallelle banen: binnen een baan tellen opeenvolgende calls op, tussen banen (en geneste batches) loopt de klok met de traagste.
- `engine/embed.js` — `embed`, `cosine`, `similarity`, `distance`, `tokens`: deterministische embeddings voor testmodus en terugval.
- `engine/sim-generic.js` — `simulate(slug, opts)` voor elk spel; `npm run sim [slug]`.
- `engine/server.js` — livelaag (`/phone`, `/screen`, `/dashboard`, JSON-API) zonder dependencies; `npm run serve`.

## Uitbreidingen in engine 1.2.0 (achterwaarts compatibel)
- `ctx.ai.call({ kind: 'text' | 'image' | 'embed', ... })` — soort AI-stap (standaard `text`). Beelden worden niet als tekst gemodereerd; gebruik `screen` op de prompt. Live-vraag: tekst via `llm: { system, user, json }`, beeld via `input.prompt`, embeddings via `input.texts`.
- `ctx.ai.call({ timeoutSec })` — time-out per stap (anders `aiTimeoutSec` van het spel).
- `ctx.ai.batch(fns, { concurrency })` — hoogstens zoveel tegelijk, in golven; de virtuele klok telt de golven op.
- Kostenbudget: de provider meldt `_costUsd`; `aiStats.costUsd` telt op; boven de spelinstelling `aiBudgetUsd` geeft elke live-call de terugval `budget`. `aiStats.byKind` telt calls per soort.
- `ctx.assets.put(dataUrl, meta) -> id`, `ctx.assets.get(id)` — sessiebestanden (bijv. AI-beelden); de livelaag serveert ze op `/asset/<id>`. Zit in `snapshot()`.
- `ctx.store` — spelstatus die een serverherstart overleeft (in `snapshot()`/`restore`). `ctx.plan` — de geplande blokken.
- `game.blocks(settings, { players, teams })` — blokken mogen afhangen van de groep.
- `ctx.collect({ ..., data })` — extra gegevens voor de telefoon (bijv. keuzelijst met plaatjes, soort `match`). Telefoon kent nu ook `prompt` (tekst + inspreken), `match` en `ready`.
- `ctx.tell({ ..., big: true })` — groot privébericht (naambadge). `ctx.pause(sec)` — echte pauze in de livelaag, direct door in testmodus.
- Schermgebeurtenis met `images: [{ asset, label }]` — galerij (meer beelden) of onthulling (één beeld) op het grote scherm.
- `engine/providers/openai.js` — `createOpenAIProvider()`: tekst (`gpt-4.1-mini`), beeld (`gpt-image-1-mini`, `low`), embeddings (`text-embedding-3-small`), sleutel uit `OPENAI_GAME_KEY`. Livelaag: `POST /api/start { mode: 'live' }` (dashboard: "Live (echte AI)"); Node achter proxy: `NODE_USE_ENV_PROXY=1`.
