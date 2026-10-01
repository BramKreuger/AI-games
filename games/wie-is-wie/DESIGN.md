# Wie is Wie: ontwerp

Slug `wie-is-wie` · engine `^1.2.0` (nieuw: beeldstap, zie §7) · talen: Nederlands en Engels (standaard `nl`, `lang`; teksten in `defaults.nl.json` / `defaults.en.json`, overschrijfbaar per pakket).

## 1. Uitleg voor de presentator (≤250 woorden)
"Jullie gaan iemand van een ander team leren kennen, en daarna moet de zaal raden wie wie is. Je vormt een tweetal met iemand uit een ander team. Jullie interviewen elkaar, aan de hand van vragen op de telefoon. Daarna schrijf je een prompt waarmee de AI een plaatje van je gesprekspartner maakt, als metafoor: een dier, een weertype, een plek. Geen naam, geen uiterlijk, geen functie. Een slimme prompt verklapt precies genoeg.
Dan komen de plaatjes genummerd op het grote scherm, met een paar mensen in de schijnwerper. Loop rond, praat met de mensen in de schijnwerper, en koppel elk plaatje aan een persoon. Let op: wie in de schijnwerper staat mag één keer liegen!
Raden levert punten op. Het maken van een plaatje levert de meeste punten op als ongeveer de helft het goed raadt: te makkelijk of te vaag levert weinig op.
Elke ronde heeft een twist: eerst vrij, dan met een woordlimiet, dan met een nieuw tweetal en soms met een nepplaatje dat bij niemand hoort. Wie niet wil of kan bewegen, kiest een eigen rol, zoals alter ego, schrijver of speurder op afstand. Niemand valt af.
Aan het eind maken alle teams samen één plaatje van de hele zaal: elk team levert een woord, de AI maakt het beeld, en iedereen raadt welk team welk woord gaf. De uitslag laat per team zien waarom het die punten kreeg."

## 2. Tijdscript (minuten: min / doel / max, prioriteit 1 = nooit schrappen)
| Blok | Min | Doel | Max | Prio | Inhoud |
|---|---|---|---|---|---|
| intro | 2 | 3 | 4 | 1 | uitleg, tweetallen vormen, alter-ego-keuze |
| r1 Metafoor | 11 | 13 | 16 | 1 | vrije prompt, "als jij een dier/weertype/plek was" |
| r2 Verbod | 11 | 13 | 16 | 2 | max. 8 woorden, verboden woorden (hobby's, beroep) |
| r3 Wissel | 10 | 12 | 15 | 3 | nieuw tweetal, thema "over 10 jaar" of "op je best/slechtste dag" |
| r4 Schaduw | 10 | 12 | 15 | 4 | één nepplaatje bij niemand; "niemand" is een geldig antwoord |
| finale | 5 | 6 | 8 | 1 | Het Grote Portret voor iedereen |
| results | 1 | 2 | 3 | 1 | uitslag + uitleg per team |

Planner-uitkomst (te meten met `npm run sim wie-is-wie` in fase 4): **20 min** = intro 2, r1 11, finale 5, results 1 (19); **40 min** = intro 2, r1 11, r2 11, r3 10 (alle op minimum), finale 5, results 1 (40); of r3 valt weg en r1/r2 lopen op naar doelwaarde; **60 min** = intro 3, r1–r4 op doelwaarde (50) en finale 6, results 2 (61: r4 krimpt tot 11).

Rondeverloop (±13 min): koppeling tonen 0:30 · interview (beiden om de beurt) 4:00 · prompt schrijven 2:00 (≤ `maxPromptWords`) · AI maakt beeld 0:15-0:30 (wachttijd) · veto/controle door doelwit 0:30 · zoeken en koppelen 3:30 (invoer 1:00) · onthulling 2:00.

## 3. Ondersteunde grenzen
4-60 deelnemers, 2-12 teams (engine dwingt af), teamgrootte 1-10, ideaal 2-5. Weinig teams (2-3): tweetallen tussen twee teams, de galerij blijft klein (≤ spelers). Veel spelers (50): iedere ronde schrijven alle spelers een prompt en maakt de AI alle beelden, maar de **schijnwerper** toont er maar `gallerySize` (8, tot 12), eerlijk verdeeld over de teams (geen team twee keer voor iedereen eenmaal). De niet-getoonde beelden komen in een latere ronde of als reserve in de finale; spelers zonder getoond beeld zijn die ronde speurder. Oneven spelers: één driehoek A→B→C→A (alle drie verschillende teams als het kan). Eén team dat meer dan de helft van de spelers heeft: tweetallen binnen dat team kunnen niet gescheiden worden; dan mag het tweetal uit hetzelfde team komen (gelogd, reden "geen andere tegenpartij").

## 4. Rollen
Iedereen is in een ronde tegelijk **Interviewer** (stelt de vragen, schrijft de prompt) en **Doelwit** (beantwoordt, wordt getoond). Daarnaast, per ronde, afhankelijk van de schijnwerper:
- **Kandidaat**: doelwit van een getoond beeld; staat in de schijnwerper, beantwoordt vragen van speurders, mag één keer liegen.
- **Stille getuige**: maker van een getoond beeld; weet het antwoord, mag niets verklappen (ook niet non-verbaal), scoort op de sweet spot.
- **Speurder**: alle anderen; koppelen beelden aan kandidaten (niet het eigen beeld en niet het eigen doelwit).
| Teamgrootte | Rolverdeling |
|---|---|
| 1 | speler is steeds met een speler van een ander team in een tweetal |
| 2-3 | elk lid heeft een eigen tweetal met een ander team; iedereen is interviewer, doelwit en speurder |
| 4-5+ | idem; het team kiest per ronde één **teamwoordvoerder** voor de invoer van de koppelingen (teamscore blijft per lid) |

Rouleren: elke ronde nieuwe tweetallen (r3: bewust een nieuw tweetal), nieuwe schijnwerper-selectie, nieuwe rol. Een speler wordt niet twee rondes achter elkaar kandidaat als dat vermijdbaar is.

**Inclusie.** Wie niet kan of wil bewegen (`optOut`): (a) is **kandidaat** op een vaste plek (speurders komen naar hem/haar); (b) kan **alter ego** kiezen (interview als verzonnen personage, het beeld hoort bij die persoon); (c) heeft de rol **Schrijver** (typt de prompt voor een ander tweetal, als partner dat wil) of **Speurder op afstand** (via de telefoon vragen stellen via een korte chat met een kandidaat, 3 vragen per ronde). Wie niet wil praten of interviewen: **alleen-schrijven**, met schriftelijke antwoorden op de interviewkaarten. Doelwitten hebben altijd een **veto**: ze zien hun beeld eerst op de telefoon en kunnen "niet tonen" kiezen; dan wordt een stockbeeld uit het pakket of een nieuwe poging gebruikt, zonder strafpunten voor de maker.

## 5. Fysieke opdracht en schermtijd per ronde
Fysiek: lopen naar een ander team, face-to-face interview, daarna in de zaal zoeken naar de kandidaten en gesprekken voeren. Telefoon: vragenkaart lezen (±10 s), prompt typen of dicteren (≤ 120 s, `promptSecMax`), veto (±15 s), koppelingen invoeren (≈ 60 s) = ≈ 3,5 min van 13 min ≈ **27%**. Dat is te krap: daarom `promptSecMax` 90, spraakinvoer en een invoerscherm met 1 tik per koppeling; doel ≈ 3 min = **23%** (< 25%). Gemeten in fase 4 (`phoneShare < 0.25`), bij overschrijding: promptlimiet omlaag of invoer korter.

## 6. Interactie tussen teams
Tweetallen zijn altijd cross-team (tenzij onmogelijk, zie §3). De speurders mengen in de zaal; kandidaten worden door spelers van alle teams ondervraagd. Teams zijn tegelijk maker, doelwit-team en speurder.

## 7. AI-stappen
| Stap | Invoer | Model | Uitvoer | Latency | Terugval |
|---|---|---|---|---|---|
| `leak-check` | prompt + doelwit-naam/bijnaam + verboden woorden uit het pakket | tekst-LLM | `{ok, reasons[]}` (verklapt de prompt naam, uiterlijk, functie of team?) | 2-3 s | woordenlijst/regex uit het pakket (nl+en); bij twijfel doorlaten met waarschuwing |
| `portrait` | prompt + stijl uit pakket + veiligheidssuffix ("geen gezichten of herkenbare personen") | beeldmodel (laag/medium, ≤512 px) | afbeelding | 8-25 s | stockbeeld uit pakket, gekozen op embedding-nabijheid van de prompt |
| `crowd` (finale) | de teamwoorden (embedding-clusters, verwijder geblokkeerde) | beeldmodel | afbeelding | 10-25 s | stockbeeld "samen" uit pakket |
| `shadow` (r4) | thema + stijl | tekst-LLM + beeldmodel | fictief persona-profiel + afbeelding | 10-25 s | schaduwbeeld uit pakket |
| `commentary` | prompt (en bij onthulling de naam) | tekst-LLM | één grappige zin per onthulling | 2-3 s | vaste zin per ronde uit defaults |
| moderatie | prompt, beeld, tekst voor het scherm | moderatie-API + blocklist | ok/blokkeren | <1 s | blocklist lokaal; beeld met vlag wordt vervangen door stockbeeld |
Engine-uitbreiding (achterwaarts compatibel, engine 1.2): `ctx.ai.call({ kind: 'image', ... })` met dezelfde regels voor fixture, validatie, terugval, moderatie en `screen`. Mock-fixtures: deterministische SVG/PNG-placeholders per prompt-hash (`fixtures/portrait-*.svg`). Validatie: lege/ongeldige afbeelding of lek in de prompt → terugval. Time-out `aiTimeoutSec` (25 s). Alle calls van een ronde lopen in parallelle banen (`ai.batch`), dus de AI-tijd per ronde blijft ≈ de traagste baan (≤ 30 s) ook bij 50 spelers.

## 8. Wachttijd tijdens AI-stap
Tweetal poseert als het dier/weertype dat het net bedacht heeft ("maak het geluid"); het grote scherm toont een tikkende teller en de commentator leest vragenkaarten voor als opwarmer voor het raden.

## 9. Gezamenlijk moment op het grote scherm
Galerij met genummerde beelden en de namen van de kandidaten in kleurcode (≥ 32 px). Onthulling beeld voor beeld: wie het is, de prompt van de maker, het aantal goede koppelingen en de AI-commentaar. Beelden gaan pas na moderatie en doelwit-veto naar het scherm; namen zijn de zelfgekozen bijnamen.

## 10. Scoring
- **Raden**: per goede koppeling 2 punten voor de speurder (reden: "juist gekoppeld: beeld 4 → Sanne"). Rondescore per speler = `2 × juist / aantal te koppelen`, dus 0-2, ook bij verschillende gallerygroottes. Teamscore = gemiddelde over de leden (vergelijkbaar bij verschillende teamgroottes).
- **Maken**: Dixit-sweet spot. Voor een getoond beeld met `n` speurders en aandeel goed `r`: `round(8 · r · (1 − r))` → 0-2 (2 bij `r` = 0,5). Reden: "sweet spot: 3 van 6 speurders raadden goed". Teamscore = gemiddelde over de getoonde beelden van het team; geen getoond beeld: neutrale 1 ("niet getoond: neutraal") zodat geen team benadeeld wordt door de selectie.
- **Veto/uitval**: doelwit veto of doelwit weggevallen: maker krijgt neutrale 1 met reden; geen straf.
- **Liegen**: een kandidaat die een speurder misleidt krijgt niets; leugens zijn sociaal, niet geregistreerd. Wel telt de koppeling gewoon, dus misleiden verlaagt vooral de speurderscore en maakt de sweet spot waarschijnlijker.
- **Schaduw (r4)**: juist "niemand" te kiezen bij het nepplaatje = 2 punten; verkeerde persoon = 0 (reden: "vals alarm").
- **AI-storing**: terugvalbeeld → beide partijen krijgen `fallbackPoints` (1), maakpunten niet via sweet spot.
- **Tie-break**: meeste goede koppelingen, daarna meeste sweet-spot-beelden, daarna loting (seed).
- Elke regel heeft een reden; correcties alleen via nieuwe regels (`ledger.correct`). In `results` toont het scherm per team alle regels (`explain`).
- **Vergelijkbaar tussen groepen**: `comparable: mean-points-per-round` (0-4 per ronde: 0-2 raden + 0-2 maken, gemiddeld per lid/per getoond beeld), onafhankelijk van spelers- of teamaantal; finale telt los (dubbele punten). Maximaal verschil door selectie wordt gelogd in de export.

## 11. Finale: Het Grote Portret (alle teams)
Elke speler tikt één woord op de vraag "Als deze zaal een weertype was, welk?" (≤ 3 s, ook spraak). Embedding-clusters bepalen het beeld; de AI maakt één groot portret van de zaal (wachttijd: iedereen poseert als het beeld). Daarna raadt iedereen welk team welk van 6-8 woorden gaf (1 tik per woord). Punten: 2 per goede koppeling × `finaleMultiplier` (2), **bijdrage +1** voor elk team dat een woord leverde, ook zonder getoond woord. Teams of spelers die niet kunnen bewegen doen mee op de telefoon: niemand valt af. Bij AI-storing krijgt elk team vaste punten.

## 12. Spelinstellingen (standaard)
`rounds` auto (min(4, plan)) · `gallerySize` 8 (max 12) · `maxPromptWords` 60 (r2: 8) · `maxAttempts` 2 · `promptSecMax` 90 · `interviewSec` 240 · `searchSec` 210 · `aiTimeoutSec` 25 · `bluff` true (vanaf r1, uit te zetten) · `veto` true · `alterEgo` true · `shadow` true (alleen r4) · `generateAll` true · `aiBudgetUsd` 8 · `fallbackPoints` 1 · `finaleMultiplier` 2 · `durationMin` (20/40/60) · `lang` (`nl`/`en`) · `mode` (`test` standaard, `live` met provider).

## 13. Schema klantpakket (`packs/<naam>/pack.json`, sleutel `wieIsWie`)
```json
{
  "wieIsWie": {
    "interviewCards": { "nl": ["Wat doe je op een vrije zondag?", "Welk talent heb je dat niemand verwacht?"],
                         "en": ["What do you do on a free Sunday?", "What unexpected talent do you have?"] },
    "themes": { "nl": ["als jij een dier was", "als jij een weertype was", "als jij een plek was"],
                "en": ["if you were an animal", "if you were a weather type", "if you were a place"] },
    "bannedWords": { "nl": ["haar", "bril", "lang", "baard", "functie"], "en": ["hair", "glasses", "beard", "title"] },
    "style": "zachte aquarel, geen gezichten, geen tekst",
    "stock": [ { "id": "s1", "tags": ["vos", "bos"], "image": "stock/vos.png" } ],
    "shadows": [ { "id": "sh1", "persona": { "nl": "een nachtbibliothecaris", "en": "a night librarian" }, "image": "stock/uil.png" } ]
  },
  "texts": { "nl": {}, "en": {} },
  "blocklist": []
}
```
Voorbeeldpakket in `packs/demo/pack.json` (10 interviewkaarten, 6 thema's, 8 stockbeelden, 3 schaduwen). Klantinhoud nooit in code.

## 14. Risico's en kosten
Risico's: een prompt die iemand identificeert of kwetst (lek-check + moderatie + doelwit-veto); beeldmodel traag/weigert (stockbeeld-terugval); schermtijd rond 23% (bewaken); privacy (bijnamen, geen opslag van beelden na de sessie); 50 spelers = 50 prompts per ronde, dus beeldkosten schalen (zie hieronder, plafond in `aiBudgetUsd`); beeldgeneratie is nieuw in de engine (hoogste bouwrisico). Het Weerwolf-gevoel (liegen, schaduwplaatje) hangt aan de selectie van de schijnwerper; die moet zichtbaar eerlijk lijken.
**AI-kosten per sessie (schatting, nog niet live gemeten)**: 50 spelers × 3 rondes × ~1,3 beelden = ~195 beelden × $0,02-0,04 ≈ **$4-8**; 12 spelers ≈ **$1-2**; leak-check + commentaar + moderatie ≈ $0,5; finale ≈ $0,05. Bij het bereiken van `aiBudgetUsd` schakelt de engine over op stockbeelden voor niet-getoonde prompts (`generateAll` valt terug naar alleen getoonde beelden), zodat getoonde beelden altijd AI-beelden blijven.
