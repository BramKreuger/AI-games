# Levend Beeld: ontwerp

Slug `levend-beeld` · engine `^1.1.0` · talen: Nederlands en Engels (standaard `nl`, wisselen via sessie-instelling `lang`; teksten in `defaults.nl.json` / `defaults.en.json`, overschrijfbaar per pakket).

## 1. Uitleg voor de presentator (≤250 woorden)
"Jullie team maakt een standbeeld met jullie lichamen. Eén van jullie, de regisseur, krijgt op de telefoon een geheim begrip, bijvoorbeeld *een file op maandag*. Die persoon mag niet praten, alleen wijzen en gebaren. De rest vormt samen het beeld en stilstaan! De fotograaf maakt een foto.
Nu komt de AI: een vision-model kijkt naar de foto en beschrijft wat het ziet, zonder te weten wat het moet voorstellen. Een ander team ziet alleen die beschrijving op het grote scherm en moet raden welk begrip het was. Hoe dichter de gok bij het begrip zit, hoe meer punten, voor beide teams: raak is 2, dichtbij is 1, ver ernaast is 0.
Zo ronde na ronde, met steeds moeilijkere begrippen. De rollen wisselen elke ronde, dus iedereen is een keer regisseur, beeldhouwer, fotograaf en AI-criticus. Wie liever niet beweegt, is regisseur, fotograaf of criticus.
Aan het eind doen alle teams samen mee aan het Gigabeeld: de zaal stelt begrippen voor, de AI kiest de populairste, en we bouwen met iedereen één groot beeld. Elk team raadt mee, punten tellen dubbel. De uitslag laat per team zien waarom het die punten kreeg."

## 2. Tijdscript (minuten: min / doel / max, prioriteit 1 = nooit schrappen)
| Blok | Min | Doel | Max | Prio | Inhoud |
|---|---|---|---|---|---|
| intro | 1 | 2 | 3 | 1 (verplicht) | uitleg, rollen |
| warmup | 2 | 3 | 5 | 4 | koffiezetapparaat in 30 s; schrapbaar bij tijdnood |
| rounds | 7 | 7×rondes | 9×rondes | 2 | rondes van ±7 min; aantal = min(`rounds`, minuten/7) |
| finale | 4 | 6 | 10 | 1 (verplicht) | Gigabeeld voor iedereen |
| results | 1 | 2 | 3 | 1 (verplicht) | uitslag + uitleg per team |

Uitkomst van de planner (gemeten in `npm run sim levend-beeld`): **20 min** = intro 2, warmup 2, 1 ronde (8 min), finale 6, uitslag 2 (de warm-up krijgt zijn minimum). **40 min** = intro 2, warmup 2, 4 rondes (28), finale 6, uitslag 2. **60 min** = intro 3, warmup 5, 4 rondes (36, max), finale 10, uitslag 3 (57 min; de resterende 3 min zijn speling omdat alle blokken op hun maximum staan). Bij tijdnood valt eerst de warm-up weg, daarna krimpen rondes naar het minimum; intro, finale en uitslag blijven altijd.
Rondeverloop (±7 min): begrip lezen 0:20 · beeld bouwen 2:00 · foto + AI-beschrijving 0:10 (wachttijd) · raden 1:00 · onthulling 1:30 · wissel 0:30 · speling.

## 3. Ondersteunde grenzen
4–60 deelnemers, 2–12 teams (engine dwingt af; daarbuiten foutmelding). Teamgrootte 1–10; ideaal 3–6. Weinig teams (2): maker en rader zijn steeds dezelfde twee teams, de rotatie is triviaal; plan eventueel meer rondes. Veel teams (12): de rotatie wisselt wie wie raadt (verschuiving 1…n−1), en de AI-beschrijvingen draaien parallel, dus de AI-tijd blijft ±40 s per ronde. Oneven verdeling (13 spelers, 5 teams = 3-3-3-2-2) werkt: elk team doet evenveel rondes.

## 4. Rollen per teamlid (rouleren per ronde)
| Teamgrootte | Rollen |
|---|---|
| 1 | één speler is regisseur, fotograaf en beeldhouwer |
| 2 | regisseur (kent begrip), beeldhouwer + fotograaf |
| 3–4 | regisseur, fotograaf, rest beeldhouwers |
| 5+ | + AI-criticus (beoordeelt de AI-beschrijving voor de zaal, geen punten) |
Inclusie: wie niet kan of wil bewegen (`optOut`) krijgt bij voorkeur regisseur, fotograaf of criticus en nooit alleen beeldhouwer; iedereen heeft altijd minstens één rol (getest). Rollen worden elke ronde opnieuw berekend over wie verbonden is: een laatkomer krijgt direct een rol, een weggelopen speler verdwijnt zonder gat.

## 5. Fysieke opdracht en schermtijd per ronde
Fysiek: bouw met je lichamen één stilstaand beeld; geen praten voor de regisseur. Telefoon: begrip lezen (±20 s), foto (±10 s), antwoord invoeren (±25 s) = ±55 s van 420 s ronde ≈ **13%** (grens 25%; getest als `phoneShare < 0.25`).

## 6. Interactie tussen teams
Per ronde maakt elk team een beeld en raadt een beeld van een ander team. Verschuiving = 1 + (ronde−1) mod (teams−1), dus teams komen steeds met andere teams in contact. Raders zien het beeld niet, alleen de beschrijving.

## 7. AI-stappen
| Stap | Invoer | Model | Prompt (samenvatting) | Uitvoer | Latency | Terugval |
|---|---|---|---|---|---|---|
| `describe` | foto (alleen na invoer-screen: geen vlag) | vision-LLM | "Beschrijf neutraal de pose van de mensen op de foto. Noem geen begrip, geen titel, geen interpretatie." | `{description}` | 3–8 s | vaste zin ("Een groep van N mensen staat stil…"); beide teams krijgen vaste oefenpunten |
| `judge` | gok (tekst) + begrip met aliassen | embeddings (cosinus) | – | `{sim 0–1}` | <1 s | woordoverlap (lokaal) |
| moderatie | foto-vlaggen, gokken, AI-tekst | moderatie-API + blocklist | – | ok/blokkeren | <1 s | blocklist lokaal; foto met vlag wordt niet naar het model gestuurd |
Fixtures: `fixtures/describe.json` (+ cues uit het pakket), embeddings uit `engine/embed.js`. Validatie: lege/te korte beschrijving of lek van het begrip (woorden ≥4 letters) leidt tot terugval. Time-out `aiTimeoutSec` (20 s).

## 8. Wachttijd tijdens AI-stap
Het team blijft stilstaan als beeldhouwwerk; de zaal telt mee af en de AI-criticus (of de presentator) kondigt aan "de AI kijkt nu". Het grote scherm toont het silhouet-icoon en een tikkende teller.

## 9. Gezamenlijk moment op het grote scherm
Onthulling per ronde: AI-beschrijving (≥32 px), het geheime begrip, de gok en de nabijheidsmeter. Foto's gaan **niet** naar het scherm (alleen silhouet-icoon); zo komen geen gezichten of ongepaste beelden in beeld.

## 10. Scoring
- Gok → begrip: nabijheid `sim`; ≥ `hitSim` (0,6) = raak = 2, ≥ `nearSim` (0,3) = dichtbij = 1, anders 0. Rader én maker krijgen die band (gezamenlijk succes: de AI-tolk begreep het beeld).
- AI-storing (weigering, time-out, ongeldig, lek, onveilige foto): beide teams `fallbackPoints` (1); geen team wordt afgerekend op een AI-fout.
- Ontbrekende gok: 0 met reden. Geblokkeerde gok: 0 met reden, '***' op het scherm.
- Maker afwezig: de rader raadt een reservebeeld van de AI (0 voor de afwezige).
- Geen stemronde. Tie-break: hoogste gemiddelde nabijheid, daarna loting (seed).
- Elke regel heeft een reden; corrigeren kan alleen via nieuwe regels (`ledger.correct`). In `results` toont het scherm per team de regels (`explain`).
- **Vergelijkbaar tussen groepen**: declaratie `comparable: mean-points-per-round`; elk team heeft evenveel rondes als maker en rader, hetzelfde niveau per ronde (niveau 1→3), dus vergelijk gemiddelde per ronde. De finale telt los (dubbele punten).

## 11. Finale: het Gigabeeld (alle teams)
Elk team stelt een begrip voor (voorbeelden in pakket). De consensus-suggestie (grootste gemiddelde overeenkomst met de rest; geblokkeerde voorstellen tellen niet) wordt het begrip. Iedereen bouwt één beeld; de AI beschrijft; elk team raadt, punten × `finaleMultiplier` (2). Bijdrage: +1 voor elk team met spelers in beeld. Teams die niet kunnen bouwen raden toch mee, dus niemand valt af. Bij AI-storing krijgt elk team vaste punten.

## 12. Spelinstellingen (standaard)
`rounds` 4 · `aiTimeoutSec` 20 · `hitSim` 0,6 · `nearSim` 0,3 · `finaleMultiplier` 2 · `fallbackPoints` 1 · `roundMin` 7 · `phoneSecPerRound` 55 · `buildSec` 120 · `guessSec` 60. Daarnaast per sessie: `durationMin` (20/40/60), `lang` (`nl`/`en`), `mode` (`test` standaard, `live` met provider).

## 13. Schema klantpakket (`packs/<naam>/pack.json`, sleutel `levendBeeld`)
```json
{
  "levendBeeld": {
    "concepts": [
      { "id": "lb4", "tier": 2,
        "text": { "nl": "een file op maandag", "en": "a traffic jam on monday" },
        "cues": { "nl": "mensen dicht achter elkaar met opgetrokken schouders", "en": "people close behind each other with hunched shoulders" },
        "aliases": { "nl": ["files", "stilstaand verkeer"], "en": ["traffic jam", "gridlock"] } }
    ],
    "finaleSuggestions": { "nl": ["een feest", "de zee"], "en": ["a party", "the sea"] }
  },
  "texts": { "nl": { "intro": "…eigen introductie…" }, "en": {} },
  "blocklist": ["extra-woord"]
}
```
`tier` 1–3 (gemakkelijk→moeilijk); `cues` zijn alleen voor de mock-fixture (testmodus); in livemodus beschrijft het vision-model de echte foto. Het voorbeeldpakket staat in `packs/demo/pack.json` (9 begrippen, 3 per niveau). Klantinhoud komt nooit in code.

## 14. Risico's en kosten
Risico's: vision-model onthult of raadt het begrip niet (lek-check, terugval); culturele begrippenset (pakket); foto's met gezichten (alleen silhouet getoond, niets bewaard buiten het geheugen). Geschatte AI-kosten per sessie (nog niet live gemeten): ±105 AI-calls bij 12 teams/60 min; vision ±$0,02 × ~50 + embeddings ~$0,01 + moderatie ≈ **$1–2**, begrensd door het aantal rondes.
