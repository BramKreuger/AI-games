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
- `engine/providers/openai.js` — `createOpenAIProvider({ apiKey, budgetUsd, model })` voor `mode: 'live'`: stappen `blueprint`, `judge` (plan), `describe`; budgetbewaking, kosten en latency via `provider.summary()`. Fouten en budgetoverschrijding leiden tot terugval. Rooktest: `npm run smoke`.
