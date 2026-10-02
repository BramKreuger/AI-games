# Fase 1: onderzoek en concepten, "Wie is Wie" (handmatige run, 2026-10-01)

Fase 0: `npm test` 77/77 groen, `npm run sim` groen op 4 configuraties.

## Uitgangspunten van Bram (uit het gesprek)
- Het doelwit is iemand van een **ander team**.
- De AI maakt een **beeld** (geen foto's van gezichten: zie veiligheid). Een ja/nee-orakel is hooguit raadhulp.
- Deelnemers kennen elkaar **niet**; teams zijn **klein**.
- Licht van toon: een beetje kennismaken, vooral slim prompten en een leuke sessie.

## Bronnen en wat we overnemen
| Bron | Overname |
|------|----------|
| [Guess Who (icebreaker)](https://freeicebreaker.com/games/guess-who) | Raden wie bij welk feit hoort is een bewezen kennismakingsvorm |
| [AI Match Game (Loquiz)](https://loquiz.com/2025/05/16/lacking-team-building-game-ideas-use-gemini-ai-in-2025/) | AI maakt een eigenzinnig personage uit woorden van deelnemers; teams koppelen het aan de speler |
| [Dixit](https://gamerules.com/rules/dixit/) | Scoring met "sweet spot": scoort het meest als sommigen de hint begrijpen en anderen niet; iedereen goed of niemand goed levert weinig op |
| [Gartic Phone](https://mechanicsofmagic.com/2024/04/16/critical-play-gartic-phone/) | Gezamenlijke onthulling aan het eind is het hoogtepunt |
| Gandalf (Lakera) | Beperkingen (verboden woorden, woordlimiet) maken prompten moeilijker en slimmer |
| Codenames / Wavelength | Een hint geven die precies genoeg zegt zonder het antwoord te verklappen |
| Levend Beeld (eigen spel) | Foto's/beelden gaan eerst door een invoer- en moderatiescherm; AI als blinde tussenpersoon |

## Vijf concepten (kernmechaniek)
1. **Portretgalerij**: team interviewt een speler van een ander team en prompt een beeld van die persoon als *metafoor* (dier, landschap, weer, voorwerp), zonder naam of uiterlijk. Alle beelden hangen anoniem in een galerij; de zaal raadt welk beeld bij welke persoon hoort.
2. **Portret + Orakel**: als 1, maar raden gaat in twee stappen: het beeld kiest een kandidaat-groep, daarna mag een team 3 ja/nee-vragen stellen aan een AI die de profielnotities van de makers kent.
3. **Verbod-ladder**: dezelfde portretmechaniek, maar elke ronde een strengere prompt-beperking (ronde 1 vrij, ronde 2 verboden woorden, ronde 3 maximaal 8 woorden).
4. **Ruilketen**: portret van team A gaat naar team B dat de prompt terugraadt en opnieuw maakt, daarna team C: de persoon verandert onderweg. (lijkt op Stille Post)
5. **Karikatuur-foto**: spelers nemen een selfie; de AI maakt er een karikatuur van; het zaal raadt wie het is.

## Scoring op de vaste uitgangspunten (0 = afvallen)
Volgorde: 1 fysiek, 2 AI-kern, 3 allen mee, 4 eerlijk, 5 robuust, 6 tijdflex, 7 inclusief, 8 veilig, 9 betaalbaar, 10 klantneutraal.

| Concept | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Totaal | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Portretgalerij | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | 18 | **door** |
| 2 Portret + Orakel | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 16 | **door** (hybride) |
| 3 Verbod-ladder | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 2 | 16 | reserve: past als moeilijkheidsinstelling in 1 |
| 4 Ruilketen | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 1 | 1 | 2 | 14 | reserve: te dicht bij Stille Post |
| 5 Karikatuur-foto | 1 | 2 | 2 | 1 | 1 | 2 | 1 | **0** | 1 | 2 | - | **afgevallen**: gezichten van mensen in een AI-beeld, privacy en moderatie niet te borgen op een event |

Toelichting: veilig 1 omdat beelden van prompts ongepaste uitvoer kunnen geven (moderatie en prompt-screening nodig);
betaalbaar 1 omdat beeldgeneratie het duurste onderdeel is (plafond en terugval nodig). Concept 2 scoort lager op
eerlijkheid en robuustheid door de extra orakel-AI (meer variatie en een extra AI-stap die kan uitvallen).

---

## Concept A: Portretgalerij (slug-voorstel: `wie-is-wie`)

**Kernmechaniek.** Een team interviewt een speler van een ander team en schrijft daarna een prompt waarmee de AI een beeld van
die persoon maakt als metafoor ("als jij een weertype was..."), zonder naam, geslacht of uiterlijk. Alle beelden komen
anoniem in een galerij op het grote scherm. De zaal raadt welk beeld bij welke persoon hoort. Een team scoort het
meest als sommigen zijn beeld goed raden en anderen niet (Dixit-principe).

**Rondeverloop (±13 min).**
1. Koppeling: het scherm wijst per team een doelwit-team aan (ring: team i interviewt team i+1) en per team een persoon.
   Wie niet wil, krijgt een rol als schrijver of orakel (zie hieronder); een doelwit mag feiten weigeren of een nepfeit geven.
2. Interview, 4 min, fysiek: team loopt naar het doelwit. Interviewkaarten (via pakket) geven vragen: "Wat doe je op een vrije zondag?"
3. Prompten, 3 min: één telefoon per team; de prompt gaat eerst door een lek-check (naam, functie, haar/kleding) en
   moderatie. AI maakt het beeld (≈10-20 s). Maximaal 2 pogingen, daarna terugval op een stockbeeld uit het pakket.
   Wachttijd: team doet "pose" als het eigen doelwit en de zaal telt mee.
4. Galerij en raden, 4 min: beelden genummerd op het grote scherm; doelwitten staan in een rij in de zaal. Teams
   stellen zich fysiek op achter de persoon waarvan zij denken dat het beeld bij hem/haar hoort; één knop bevestigt.
5. Onthulling, 2 min: beeld per beeld, wie het goed had, de prompt van het maakteam, en de reden voor de punten.
Per ronde wisselt de interviewde persoon, zodat elke speler doelwit wordt (ronden = teamgrootte, kleine teams
dus 3-4 ronden).

**Rol AI.** Beeldmodel maakt het portret uit de teamprompt: de enige informatiebron voor de raders, dus zonder AI geen spel.
Tekstmodel doet de lek-check (verklapt de prompt een uiterlijk of naam?) en als terugval een regelgebaseerde
check op verboden woorden. Moderatie van prompt en beeld vóór het scherm.

**Rollen per team (kleine teams, 2-5).** Interviewer(s), Prompter (typt), Woordvoerder (bij raden), Doelwit-beschermer (in het
doelwit-team: zorgt dat de gegeven antwoorden niet te veel verklappen). Wie niet kan bewegen of opt-out heeft:
Prompter of Woordvoerder; het raadteam kan op afstand achter de persoon "staan" door te stemmen op de telefoon. Rouleert per ronde.

**Interactie tussen teams.** Fysiek interview, anonieme galerij, gezamenlijk raden. Teams zijn tegelijk maker, doelwit-team en rader.

**Punten en vergelijkbaarheid.** Per portret met `n` raadteams en aandeel goed `r`:
- Raadteam: 2 punten per juist gekoppeld portret (reden: "juist gekoppeld: portret 4").
- Maakteam: `round(4 · 2 · r · (1 − r))` punten (0 als niemand of iedereen goed raadt; 2 bij `r` = 0,5). Reden: "sweet spot: 3 van 6 teams raadden goed".
- Genormaliseerd op aantal ronden en aantal teams, dus tussen groepen vergelijkbaar. Tie-break: meeste juiste koppelingen.
- Fouten van de AI (portret volledig ongeschikt) worden als correctieregel hersteld, nooit overschreven.

**Finale ("Het Grote Portret").** Alle teams maken samen één beeld van de hele zaal ("als deze groep een weertype was...") met één prompt
van losse woorden die elk team aanlevert; de AI maakt het. Dan raadt iedereen welk team welk woord inbracht. Elk team scoort op raden en bijdrage.

**Grote scherm.** Galerij, onthulling met prompt-tekst, ranglijst, countdown. Tekst ≥ 32 px.

**Materialen.** Alleen telefoons en ruimte; optioneel genummerde stickers voor het opstellen.

**Risico's.** Prompts die een persoon identificeren of kwetsen (lek-check, moderatie, doelwit mag feiten schrappen);
beeldmodel is traag of weigert (terugval: stockbeeld uit pakket, gegenereerd beeld als alleen-tekst-metafoor);
schermtijd ~20% (<25% maar krap); beeldgeneratie ontbreekt in de engine (nu: tekst-AI en vision; nieuw: `ctx.ai.call` met `kind: 'image'`, achterwaarts compatibel).

**AI-kosten per sessie (schatting, 12 teams, 3 ronden, max 2 pogingen).** ≈72 beelden × $0,03-0,06 ≈ $2-4; lek-checks en moderatie ≈ $0,3;
begrensd op een instelbaar plafond (bijv. $5) met terugval op stockbeelden.

---

## Concept B: Portret + Orakel (hybride)

**Kernmechaniek.** Zoals A, maar het raden gebeurt in twee stappen: eerst een eerste gok op het beeld, daarna mag elk raadteam 3
ja/nee-vragen stellen aan een AI die het profiel van het doelwit kent (de interviewnotities van het maakteam). Het orakel antwoordt alleen "ja", "nee" of "kan ik niet zeggen".

**Verschil met A.**
- Rondeverloop +3 min (orakelvragen): 16 min per ronde.
- Extra AI-stap: orakel dat uit notities antwoordt (tekstmodel, ≈3 s per vraag, terugval: "kan ik niet zeggen").
- Rol: Vragensteller (formuleert de vraag), Notulist (schrijft interviewnotities).
- Punten: raden vóór orakel 3 punten, na orakel 2 punten (moeilijkheid beloond); maakteam krijgt Dixit-punten op de eerste gok.
- Finale: zaal stelt als geheel 10 vragen aan een orakel dat alle doelwitten kent; wie het eerst de rij goed heeft, wint de ronde.

**Risico's.** Orakel verklapt of hallucineert (antwoord alleen uit notities, anders "kan ik niet zeggen"; lek-check op antwoord); langere rondes drukken
de tijdsflexibiliteit (20 min kan maar 1 ronde); meer schermtijd (~25%, grens).
**AI-kosten.** Als A plus ≈ 12 teams × 3 ronden × 3 vragen × $0,002 ≈ $0,2.

---

## Keuze
Aanbeveling: **Concept A** met de Verbod-ladder (concept 3) als instelling "moeilijkheid" (vrij / verboden woorden / maximaal 8 woorden)
en het orakel (concept B) als optioneel blok met lage prioriteit voor 40+ minuten. Dat houdt de kern licht, bewaart de puzzel voor wie die wil,
en blijft binnen 20 minuten speelbaar.

## Open vragen voor Bram
1. Doelwit weigert een feit of geeft een nepfeit: willen we een verplichte "nepfeit" voor iedereen? Dat maakt raden lastiger en kennismaken leuker.
2. Raden door fysiek achter iemand gaan staan (A) of alleen via de telefoon? Fysiek is leuker maar vraagt ruimte.
3. Beeldstijl vast (pakket bepaalt: aquarel, cartoon, enz.) of per team vrij?

## Gekozen (na overleg met Bram, 2026-10-01)
Concept A, aangepast op zijn feedback: iedereen interviewt in een cross-team tweetal (niet één doelwit per team, want dan weten
80% van de spelers het antwoord al). Geen rij, maar vrij rondlopen. Bij veel spelers (tot 50) toont een "schijnwerper" een deel
van de portretten per ronde (Weerwolf-gevoel: kandidaten mogen liegen, een nepplaatje bij niemand). Rondes verschillen per
twist (vrij, woordlimiet, nieuw tweetal, schaduw) om 40-60 min te vullen. Orakel (B) vervalt als apart blok; Verbod-ladder (3)
zit in ronde 2.

## Bijgesteld (tweede overleg, 2026-10-01)
Liegen, nepplaatje, veto en alter ego vervallen. Iedereen interviewt één keer aan het begin; de tweetallen krijgen verschillende
vragensets en elke ronde draait om één set (tonen, zoeken, koppelen). Punten alleen voor raden. Alleen maker en geïnterviewde
zijn uitgesloten van hun eigen plaatjes (teamuitsluiting werkt niet bij 2-3 teams). Volledige uitwerking en risico's: DESIGN.md.
