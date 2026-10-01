# Stille Post Live: ontwerp

Slug `stille-post` · engine `^1.1.0` · talen: Nederlands en Engels (standaard `nl`; wisselen via sessie-instelling `lang`; teksten in `defaults.nl.json` / `defaults.en.json`, overschrijfbaar per pakket).

## 1. Uitleg voor de presentator (≤250 woorden)
"Stille post, maar dan met een AI-scheidsrechter. Een zin wordt fluisterend door de zaal gegeven, via spelers van verschillende teams. De eerste speler krijgt de zin op de telefoon, loopt naar de volgende en fluistert hem door. Wie hem gehoord heeft, fluistert hem weer door. Iedereen spreekt zijn versie ook kort in op de telefoon.
De AI schrijft elke versie uit en meet hoe ver de betekenis opschuift ten opzichte van wat die speler kreeg. Een schakel die de betekenis bewaart, scoort 2, gedeeltelijk 1, en kwijt 0. Blijft de eindzin herkenbaar, dan krijgen alle teams in die keten een bonus.
Voordat het scherm de keten laat zien, wijst elk team aan waar volgens hen het meest misging. Wie het goed heeft, scoort ook.
Wie niet kan lopen, of liever niet fluistert, is Controleur: je luistert mee en typt wat je hoorde als de spraakherkenning faalt. Rollen wisselen elke ronde.
In de finale vormen alle teams één Megaketen met een moeilijke zin. Schakels tellen dubbel, de Megaketen levert een bonus voor iedereen, en de zaal stemt op de creatiefste fout. De uitslag laat per team zien welke schakel hoeveel punten opleverde."

## 2. Tijdscript (minuten: min / doel / max, prioriteit 1 = nooit schrappen)
| Blok | Min | Doel | Max | Prio | Inhoud |
|---|---|---|---|---|---|
| intro | 1 | 2 | 3 | 1 (verplicht) | uitleg, proefzin |
| warmup | 2 | 3 | 4 | 4 | fluisteren in een rij van vier |
| rounds | 6 | 6×rondes | 8×rondes | 2 | rondes van ±6 min |
| finale | 5 | 7 | 10 | 1 (verplicht) | Megaketen met alle teams |
| results | 1 | 2 | 3 | 1 (verplicht) | uitslag + uitleg per team |

Uitkomst planner (`npm run sim stille-post`): **20 min** = intro 2, warmup 2, 1 ronde (7), finale 7, uitslag 2. **40 min** = intro 3, warmup 3, 4 rondes (24), finale 8, uitslag 2. **60 min** = intro 3, warmup 4, 4 rondes (32, max), finale 10, uitslag 3 (52 min; rest is speling, de presentator kan `rounds` verhogen). Bij tijdnood valt eerst de warm-up weg, daarna krimpen de rondes.
Rondeverloop (±6 min): zin lezen 0:10 · fluisteren door de keten ±3:00 (ca. 25 s per schakel, ketens lopen parallel) · transcriptie en meting 0:10 (wachttijd) · "waar ging het mis?" 0:30 · onthulling 1:30.

## 3. Ondersteunde grenzen
4–60 deelnemers, 2–12 teams. Ketens zijn maximaal `chainMax` (6) schakels; de ketens van een ronde lopen tegelijk, dus de duur hangt niet af van het aantal teams. Elk team met bewegende spelers levert evenveel schakels (`k` = min(`linksPerTeam` 2, kleinste aantal bewegers per team)). Weinig teams (2): één korte keten van 2–4 schakels, de proefzin wordt dan langer gekozen. Veel teams (12): 2–4 parallelle ketens; de zaal is druk, dus lawaai-terugval is belangrijk. Oneven verdeling (13 spelers/5 teams): elk team levert hetzelfde aantal schakels, de rest is Controleur.

## 4. Rollen per teamlid
| Rol | Wat | Voor wie |
|---|---|---|
| Fluisteraar | schakel in de keten (loopt, fluistert, spreekt in) | iedereen die kan en wil bewegen |
| Controleur | luistert mee, typt de tekst bij falende spraakherkenning, wijst "waar ging het mis" aan | bij voorkeur optOut/niet-lopers; anders roulerend |
| Opnemer | houdt de telefoon van de schakel vast en drukt op opnemen | bij voorkeur optOut; anders roulerend |
Rollen worden per ronde opnieuw berekend; iedereen heeft altijd minstens één rol (getest). Wie niet kan bewegen of opt-out heeft, is nooit Fluisteraar en blijft volwaardig: de Controleur wijst de grootste afwijking aan en levert zo punten voor het team. Een team zonder bewegers speelt mee via "waar ging het mis" en de bonussen.

## 5. Fysieke opdracht en schermtijd per ronde
Fysiek: lopen naar de volgende schakel, fluisteren, de zaal doorkruisen. Telefoon: zin lezen (alleen eerste schakel) en 5–10 s inspreken, plus 10 s "waar ging het mis" ≈ 25 s van 360 s ≈ **7%** (grens 25%; getest).

## 6. Interactie tussen teams
Schakels van verschillende teams staan om en om in dezelfde keten, dus teams zijn afhankelijk van elkaar én concurrent: eigen schakelpunten tellen per team, de ketenbonus delen de teams in die keten.

## 7. AI-stappen
| Stap | Invoer | Model | Prompt (samenvatting) | Uitvoer | Latency | Terugval |
|---|---|---|---|---|---|---|
| `transcribe` | opname (±5 s) | spraak-naar-tekst | "Schrijf letterlijk uit, taal {nl/en}." | `{text}` | 1–3 s, parallel voor alle schakels | Controleur typt; geen invoer: schakel telt als ontbrekend (neutrale punten) |
| `drift` | vorige tekst, nieuwe tekst | embeddings (cosinus) | – | `{sim 0–1}` | <1 s, parallel | woordoverlap lokaal |
| `explain` | origineel, eindzin, slechtste schakel | LLM | "Leg vriendelijk en kort uit waar de zin veranderde." | `{text}` | 2–5 s | vaste sjabloonzin |
| `image` | origineel, eindzin | beeldgenerator | "Illustreer deze zin." | `{image}` | 5–15 s | geen beeld, alleen tekst |
Moderatie: transcript, uitleg en beeldprompt gaan door blocklist + moderatie-API vóór ze op het scherm komen. Fixtures: `fixtures/drift.json` plus inline mock-functies (transcriptie = ingesproken tekst). De AI-tijd is onafhankelijk van de ketenlengte: eerst fluisteren de mensen achter elkaar, daarna draaien transcriptie en meting in twee parallelle golven (regressietest bij een finale-overschrijding van 480 s bij 12 teams).

## 8. Wachttijd tijdens AI-stap
De ketens blijven in rij staan ("kabel"); de zaal raadt hardop waar het misging. Het scherm toont de originele zin als raadsel en de afstandsmeter die oploopt.

## 9. Gezamenlijk moment op het grote scherm
Onthulling per keten: origineel → schakel voor schakel (na moderatie) → eindzin, met nabijheid per schakel en de AI-uitleg (+ beeld). Finale: de Megaketen, alle teams in één lijn.

## 10. Scoring
- Schakel: nabijheid van wat de speler hoorde (vorige tekst) tot wat hij doorgaf: ≥ `hitSim` (0,7) = 2, ≥ `nearSim` (0,4) = 1, anders 0.
- Ketenbonus: eindzin ≥ `nearSim` t.o.v. het origineel: +1 voor elk team in de keten.
- "Waar ging het mis": +1 voor het juiste aangewezen schakel-nummer (alle teams met aanwezige spelers); fout of geen antwoord = 0 met reden.
- Ontbrekende schakel (telefoon weg, niets ingesproken): neutrale `fallbackPoints` (1), keten loopt door op de laatste tekst. Geblokkeerd transcript: 0 met reden.
- Finale: schakels × 2; Megaketen-bonus 2 voor alle teams als de eindzin herkenbaar blijft; zaalstem op creatiefste fout (+1 per stem, max `voteCap` 3, niet op eigen team).
- Stemmen alleen in de finale; tie-break: hoogste gemiddelde nabijheid per schakel, dan loting (seed).
- Elke regel heeft een reden (`ledger.award`), correcties zijn nieuwe regels, het scherm toont per team de uitleg.
- **Vergelijkbaar**: declaratie `comparable: mean-points-per-link`, elk team evenveel schakels per ronde, zinnen per niveau (1→3) gelijk verdeeld; vergelijk groepen op gemiddelde per schakel.

## 11. Finale: de Megaketen
Eén keten met één vertegenwoordiger per team (alle teams met een beweger; teams zonder bewegers doen mee via de zaalstem en bonus, dus niemand valt af), moeilijkste zin (niveau 3). Zie scoring.

## 12. Spelinstellingen (standaard)
`rounds` 4 · `aiTimeoutSec` 20 · `hitSim` 0,7 · `nearSim` 0,4 · `finaleMultiplier` 2 · `fallbackPoints` 1 · `roundMin` 6 · `phoneSecPerRound` 25 · `linksPerTeam` 2 · `chainMax` 6 · `voteCap` 3. Per sessie: `durationMin`, `lang`, `mode`.

## 13. Schema klantpakket (`packs/<naam>/pack.json`, sleutel `stillePost`)
```json
{
  "stillePost": {
    "sentences": [
      { "id": "sp3", "tier": 2,
        "text": { "nl": "Zes kleine vissen zwemmen langzaam door het donkere water",
                  "en": "Six small fish slowly swim through the dark water" } }
    ]
  },
  "texts": { "nl": { "intro": "…" }, "en": {} },
  "blocklist": []
}
```
`tier` 1–3. Zinnen met klantjargon horen hier, niet in code. Voorbeeld: `packs/demo/pack.json` (6 zinnen).

## 14. Risico's en kosten
Risico's: lawaai in de zaal (terugval: Controleur typt; koptelefoons optioneel), gefluisterde grappen die moderatie raken (geblokkeerd, schakel krijgt 0), opnames (niet bewaard; alleen tekst in het geheugen), spraakherkenning bij accenten of NL/EN-mix (taal per sessie). Mock-embeddings zijn woordvolgorde-ongevoelig; live embeddings zijn dat niet. Geschatte AI-kosten (nog niet live gemeten): ±250 AI-calls bij 12 teams/60 min; transcriptie ~100 × $0,005, embeddings verwaarloosbaar, uitleg + beeld ~20 × $0,04 ≈ **$1,5–3**.
