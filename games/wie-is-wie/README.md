# Wie is Wie (`wie-is-wie`)

Tweetallen over de teams heen interviewen elkaar één keer; iedereen schrijft een prompt en de AI maakt een plaatje van zijn partner als metafoor (een dier, een gerecht, een plek…). Daarna rondes per vragenset: plaatjes op het grote scherm, kandidaten met een naambadge, speurders lopen rond, stellen één vraag per kandidaat en koppelen op de telefoon. Finale: AI-teamportretten. Ontwerp: [DESIGN.md](DESIGN.md) · Concepten: [CONCEPTEN.md](CONCEPTEN.md) · Presentatorblad: [BEGELEIDER.md](BEGELEIDER.md).

## Starten
```bash
npm run sim wie-is-wie     # bot-simulatie (6p/2t/20, 12p/4t/40, 60p/12t/60, 13p/5t/40)
npm test                   # alle tests (spelspecifiek: test/wie-is-wie.test.js)
npm run serve              # livelaag; dashboard → spel "Wie is Wie" → AI: Testmodus of Live
```
Speltest met telefoons in hetzelfde wifi: `HOST=0.0.0.0 npm run serve`; de server toont dan het adres voor de telefoons (`http://<ip-laptop>:8080/phone`). Telefoons buiten het netwerk: een tunnel zoals `cloudflared tunnel --url http://localhost:8080` (zet Live dan alleen aan zolang de test loopt; iedereen met de link kan meedoen).
Live met echte AI: zet `OPENAI_GAME_KEY` en kies op het dashboard "Live (echte AI)". Achter een proxy: `NODE_USE_ENV_PROXY=1 npm run serve`. Modellen via `OPENAI_TEXT_MODEL` (standaard `gpt-4.1-mini`), `OPENAI_IMAGE_MODEL` (`gpt-image-1-mini`), `OPENAI_IMAGE_QUALITY` (`low`), `OPENAI_EMBED_MODEL` (`text-embedding-3-small`).
Vanuit code: `simulate('wie-is-wie', { players, teams, durationMin, mode: 'live', provider: createOpenAIProvider() })`.

## AI-stappen (elk met fixture en terugval)
| Stap | Soort | Fixture (testmodus) | Terugval |
|---|---|---|---|
| `check` | tekst | lokale lek-/algemeenheidscontrole | lokale lekcontrole |
| `similar` | embeddings | `engine/embed.js` | idem |
| `portrait` | beeld | deterministische SVG per prompt | stockbeeld uit pakket of onderwerpkaartje |
| `merge` | tekst | eerste zinsdelen samengevoegd | idem met vaste aanhef |
| `commentary` | tekst | vaste zin | vaste zin uit defaults |

## Rooktest met echte AI (2026-10-01, OpenAI)
| Groep | Duur sessie (AI) | Beelden | Latency beeld (gem./max) | Kosten |
|---|---|---|---|---|
| 8 spelers, 3 teams | 35 s | 11 | 8,9 / 10,5 s | $0,12 |
| 12 spelers, 4 teams | 40 s | 16 | 8,3 / 9,8 s | $0,18 |
| 50 spelers, 10 teams | 124 s | 60 | 8,6 / 11,0 s | $0,67 |
Tekstcontroles 1-3,8 s, embeddings < 0,6 s. Bij 50 spelers één time-out (commentaarzin na 22 s → vaste zin, spel liep door). Eerste 50-spelersrun: de AI-controle vond 29 van 50 prompts "te algemeen" en meldde namen die niet in de prompt stonden; na de fix 0 onterechte meldingen. Bevinding: met "warm licht" in de stijl werden alle beelden oranje (risico R1); opgelost met een kleurpalet per plaatje (verschillend binnen een ronde), regressietest toegevoegd.

## Spelinstellingen
Zie DESIGN.md §12. Voorbeeld: `settings: { galleryMax: 10, minPerRound: 4, maxRounds: 3 }`.

## Pakket
`packs/demo/pack.json` → `wieIsWie`: `questionSets` (per ronde 3 vragen, nl/en), `themes`, `palettes`, `style`, `bannedWords`, `genericWords`, optioneel `stock`. Schema in DESIGN.md §13.

## Bekende beperkingen
- Nog niet gespeeld met echte mensen. Of 3,5 minuut zoeken genoeg is bij 12 kandidaten, en of één vraag per kandidaat het goede niveau geeft, moet de speltest uitwijzen.
- Kleine groepen (6-7 spelers) krijgen één ronde; het spel duurt dan ±25-35 min, ook als 40 of 60 is gekozen.
- De lekcontrole met woordenlijst is grof; in testmodus en bij uitval van de AI vangt hij alleen woorden uit de lijst en de naam.
- Kandidaten koppelen zelf niet in hun eigen ronde (zij staan in de schijnwerper); hun teamscore komt uit de andere rondes.
- Beelden worden in het geheugen van de sessie bewaard en niet opgeslagen; na een serverherstart staan ze in de snapshot.
