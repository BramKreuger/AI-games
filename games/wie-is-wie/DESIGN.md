# Wie is Wie: ontwerp

Slug `wie-is-wie` · engine `^1.2.0` (nieuw: beeldstap, achterwaarts compatibel, zie §7) · talen: Nederlands en Engels
(standaard `nl`, `lang`; teksten in `defaults.nl.json` / `defaults.en.json`, overschrijfbaar per pakket).
Versie 2 (2026-10-01), na overleg met Bram: één interview aan het begin, vragensets verdeeld over rondes, punten alleen voor raden.

## 1. Uitleg voor de presentator (≤250 woorden)
"Vandaag leer je mensen kennen die je nog niet kent, en daarna moet je raden wie wie is.
Eerst zoek je een partner uit een ander team. Op je telefoon staan drie vragen. Jullie interviewen elkaar: vraag door, zoek
het verhaal achter het antwoord.
Dan schrijf je een prompt en maakt de AI een plaatje van je partner, maar dan als metafoor: als dier, als gerecht, als plek.
Je telefoon zegt welke. Geen naam, geen uiterlijk, geen functie. De AI controleert dat.
Daarna spelen we rondes. Elke ronde komt een groepje plaatjes op het grote scherm, met de vragen die bij die plaatjes hoorden.
De mensen die op die plaatjes staan, krijgen een naambadge op hun telefoon en houden die omhoog. Loop rond, stel elke kandidaat
één van de vragen, en koppel op je telefoon elk plaatje aan een naam. Daarna onthullen we wie wie was.
Weet je het antwoord omdat het jouw plaatje is of jij erop staat? Dan sla je dat plaatje over: dat regelt je telefoon. En verklap
niets, want het is een wedstrijd tussen teams.
Je verdient punten met goed raden: elke juiste koppeling telt.
In de finale maakt de AI van elk team één teamplaatje, uit de plaatjes die anderen van jullie maakten. Iedereen raadt welk
teamplaatje bij welk team hoort, dubbele punten. De uitslag laat per team zien waar elk punt vandaan kwam."

## 2. Spelverloop in één oogopslag
1. **Intro** (3 min): uitleg, tweetallen verschijnen op de telefoons.
2. **Interview** (5 min, één keer): tweetallen over de teams heen interviewen elkaar met de drie vragen van hun set.
3. **Prompten** (3 min): iedereen schrijft één prompt over zijn partner, met het eigen metafoor-onderwerp. Lek- en
   gelijkeniscontrole, AI maakt het plaatje. Set A eerst, de rest tijdens ronde 1.
4. **Rondes** (±6 min per set): tonen, zoeken, koppelen, onthullen. Eén ronde per vragenset.
5. **De muur** (1-2 min): plaatjes die geen ronde kregen (bij veel spelers of weinig tijd) komen met naam op het scherm.
6. **Finale: teamportretten** (5 min): de AI maakt per team één plaatje uit de prompts over zijn leden; iedereen koppelt teamplaatjes aan teams.
7. **Uitslag** (2 min): ranglijst met redenen.

## 3. Tijdscript (minuten: min / doel / max, prioriteit 1 = nooit schrappen)
| Blok | Min | Doel | Max | Prio | Inhoud |
|---|---|---|---|---|---|
| intro | 2 | 3 | 4 | 1 | uitleg, tweetallen |
| interview | 4 | 5 | 6 | 1 | één keer, per tweetal één vragenset |
| prompt | 2 | 3 | 4 | 1 | prompt, controles, beeldgeneratie set A |
| ronde 1 | 4 | 6 | 8 | 1 | set A |
| ronde 2 | 4 | 6 | 8 | 2 | set B |
| ronde 3 | 4 | 6 | 8 | 3 | set C |
| ronde 4 | 4 | 6 | 8 | 4 | set D (alleen bij veel spelers en ≥ 50 min) |
| ronde 5 | 4 | 6 | 8 | 5 | set E (idem) |
| muur | 1 | 1 | 2 | 2 | overgebleven plaatjes met naam |
| finale | 3 | 5 | 7 | 1 | teamportretten |
| results | 1 | 2 | 3 | 1 | uitslag + uitleg |

Het aantal sets `K` wordt bij de start vastgelegd: `K` = aantal rondes dat de planner toelaat, en ten hoogste
`ceil(spelers / minPerRound)` (`minPerRound` 4, anders zijn rondes te klein). Per set maximaal `galleryMax` (12) plaatjes; meer
plaatjes dan `K × galleryMax` gaan naar de muur (alleen onthulling, geen punten).
Verwachte planner-uitkomst (te meten in fase 4): **20 min** = intro 2, interview 4, prompt 2, 2 rondes × 4, finale 3, results 1 (20);
**40 min** = intro 3, interview 5, prompt 3, 3 rondes × 6, muur 1, finale 5, results 2 (37);
**60 min** = intro 3, interview 5, prompt 3, 5 rondes × 7, muur 1, finale 6, results 2 (55-60).
Bij 50 spelers en 20 min: 2 sets × 12 = 24 plaatjes in rondes, 26 op de muur. Bij 40 min: 3 × 12 = 36, 14 op de muur. Bij 60 min: 5 × 10 = alle 50.

Ronde (±6 min): scherm toont plaatjes + de drie vragen van de set 0:20 · zoeken en vragen 3:30 · koppelen op de telefoon 1:00
(kan tijdens het zoeken) · onthulling 1:00 (plaatje, naam, prompt, hoeveel spelers het goed hadden).

## 4. Ondersteunde grenzen
6-60 deelnemers, 2-12 teams, teamgrootte 1-10 (ideaal 2-5).
- **Tweetallen**: altijd met iemand van een ander team (koppelalgoritme: sorteer spelers per team, verschuif de lijst met
  ≥ grootste teamgrootte; daarna wederzijds koppelen). Oneven aantal: één drietal A→B→C→A (drie verschillende teams als het kan).
  Eén team met meer dan de helft van de spelers: dan blijven er tweetallen binnen dat team over; toegestaan, gelogd ("geen andere tegenpartij").
- **Sets verdelen**: beide partners van een tweetal krijgen dezelfde set (ze stellen elkaar dezelfde vragen), dus hun twee plaatjes
  staan in dezelfde ronde. Sets worden zo verdeeld dat elk team per ronde ongeveer evenveel kandidaten heeft.
- **Weinig spelers (6-8)**: 2 sets van 3-4 plaatjes; rondes korter (planner).
- **Veel spelers (50-60)**: `galleryMax` 12 houdt het koppelen overzichtelijk (één lijst van ≤ 12 namen); meer rondes of de muur.

## 5. Rollen
Iedereen is één keer **interviewer** en **geïnterviewde** (in het tweetal) en **prompter** (schrijft het plaatje van de partner).
Per ronde:
- **Kandidaat**: staat op een plaatje van deze ronde. Telefoon toont een naambadge (naam + teamkleur, groot); houdt die omhoog
  en blijft op zijn plek. Beantwoordt per speurder één vraag uit de set van deze ronde, eerlijk en in één of twee zinnen.
  Kandidaten koppelen zelf ook (behalve hun eigen plaatje en dat van hun partner) op basis van wat ze om zich heen horen; hun
  rondescore telt mee, maar hun gemiddelde wordt berekend over de rondes waarin ze speurder waren (zie §10).
- **Speurder**: alle anderen. Lopen rond, vragen, koppelen.
| Teamgrootte | Toelichting |
|---|---|
| 1 | speelt zelfstandig; tweetal met een ander team zoals iedereen |
| 2-5 | elk lid zit in een eigen tweetal met iemand van een ander team; het team overlegt tijdens het zoeken (mag, binnen het team) |
| 6-10 | idem; teams zijn groot, dus meer leden per ronde kandidaat |

Rouleren: de rol kandidaat/speurder wisselt per ronde vanzelf (ieder is in precies één ronde kandidaat).
**Inclusie**: wie niet kan of wil lopen, is speurder op zijn plek: kandidaten komen niet naar hem toe, maar teamgenoten brengen
antwoorden mee (overleg binnen het team mag), en het koppelen gaat op de telefoon. Als kandidaat blijft iedereen sowieso op zijn
plek. Wie niet wil praten, kan de interviewvragen schriftelijk beantwoorden op de telefoon (partner leest mee).

## 6. Fysieke opdracht en schermtijd
Fysiek: lopen naar je partner, face-to-face interview, per ronde rondlopen en kandidaten aanspreken.
Telefoon (hele spel, 40 min): vragen lezen 0:20, prompt typen/dicteren ≤ 1:30, per ronde koppelen ≈ 1:00 (3 ×), finale koppelen 0:45
≈ **5,5 min van 40 = 14%** (< 25%). Per ronde: 1:00 van 6:00 = 17%. Gemeten in fase 4 (`phoneShare < 0.25`).

## 7. AI-stappen
| Stap | Invoer | Model | Uitvoer | Latency | Terugval |
|---|---|---|---|---|---|
| `check` | prompt + bijnaam partner + verboden woorden (pakket) | tekst-LLM | `{leak, generic, tip}`: verklapt de prompt naam/uiterlijk/functie/team? is hij te algemeen ("houdt van reizen")? | 2-3 s | woordenlijst/regex (pakket, nl+en) voor lek; geen algemeenheidscheck |
| `similar` | prompt + andere prompts in dezelfde set | embeddings (cosinus) | `{maxSim, closestId}` | < 1 s | lokale embeddings (`engine/embed.js`) |
| `portrait` | prompt + metafoor-onderwerp + sessiestijl (pakket) + veiligheidssuffix ("geen gezichten, geen tekst, geen echte personen") | beeldmodel | afbeelding | 8-25 s | stockbeeld van het onderwerp uit het pakket (bijv. "vos"); anders neutraal kaartje met het onderwerp |
| `teamPortrait` (finale) | de prompts over de leden van één team | tekst-LLM (samenvoegen tot één prompt) + beeldmodel | afbeelding | 10-30 s | samenvoegen lokaal (eerste zin van elke prompt); beeld: stockbeeld "team" uit pakket |
| `commentary` | prompt + naam (pas bij onthulling) | tekst-LLM | één korte, vriendelijke zin per onthulling | 2-3 s | vaste zin uit defaults |
| moderatie | prompt, beeld, schermtekst | moderatie-API + blocklist | ok/blokkeren | < 1 s | blocklist lokaal; beeld met vlag → stockbeeld |

Engine 1.2 (achterwaarts compatibel): `ctx.ai.call({ kind: 'image', ... })` met dezelfde regels als tekststappen (fixture, validatie,
terugval, `screen`, moderatie), plus een `concurrency`-limiet voor beeldcalls (standaard 8) zodat 50 beelden in golven gaan zonder
providerlimiet te raken. Mock-fixtures: deterministische SVG-plaatjes per onderwerp + prompt-hash (`fixtures/`). Validatie: lege of
onleesbare afbeelding, of lek → terugval. Time-out `aiTimeoutSec` (30 s). Volgorde: set A eerst (moet klaar zijn bij ronde 1), sets B…
tijdens ronde 1.

## 8. Wachttijd tijdens AI-stap
Na het versturen van de prompt: het tweetal vertelt elkaar welk plaatje ze verwachten ("ik heb van jou een ... gemaakt, raad eens
waarom"). Dit is de enige keer dat je je eigen plaatje-idee mag delen, alleen met je partner. Het grote scherm toont een teller
"x van y plaatjes klaar". Set A is bij 12 plaatjes en concurrency 8 binnen ±50 s klaar.

## 9. Gezamenlijk moment op het grote scherm
Per ronde: galerij met genummerde plaatjes, onder elk plaatje het metafoor-onderwerp ("een gerecht"), bovenaan de drie vragen van de
set (≥ 32 px). Onthulling plaatje voor plaatje: naam, prompt van de maker, "7 van 19 hadden het goed", AI-zin. Muur: alle overige
plaatjes met naam. Finale: teamportretten genummerd, daarna onthulling per team. Alleen gemodereerde beelden; bijnamen in plaats van
volledige namen als het pakket dat zegt.

## 10. Scoring (alleen raden)
- Per juiste koppeling 2 punten voor het team van de speurder, reden: "juist gekoppeld: plaatje 7 = Joris (ronde 2)".
- Uitgesloten: een speler kan het plaatje dat hij maakte en het plaatje waar hij zelf op staat niet koppelen (telefoon grijst ze uit).
  Teamgenoten mogen die plaatjes wél koppelen; zie risico R4 waarom dat eerlijk blijft.
- Fout of geen antwoord: 0, zonder strafpunten (wel gelogd).
- **Vergelijkbaar**: rondescore per speler = `2 × juist / aantal plaatjes dat hij mocht koppelen` (0-2). Teamscore per ronde = gemiddelde
  van de leden die die ronde speurder waren. Eindscore = som van de rondescores + finale. Zo maakt teamgrootte of galleriegrootte
  niet uit. Declaratie: `comparable: mean-per-member-per-round`. In de ledger komt één regel per team per ronde met de genormaliseerde score en een leesbare reden ("Blauw: 9 van 16 juist, gemiddeld 1,13 per lid").
- **Finale**: per juiste teamkoppeling 2 × `finaleMultiplier` (2), zelfde normalisatie; het eigen teamportret is uitgesloten.
- Plaatje met terugval (AI-storing): telt gewoon mee; het onderwerp en de onthulling blijven werken.
- Kandidaat weggelopen: zijn plaatje gaat uit de ronde (reden gelogd); niemand verliest punten.
- Tie-break: meeste juiste koppelingen in totaal, dan meeste juiste in de finale, dan loting (seed).
- Elke regel heeft een reden; correcties alleen via nieuwe regels (`ledger.correct`).

## 11. Finale: teamportretten (alle teams)
Voor elk team voegt de AI de prompts samen die anderen over zijn leden schreven, en maakt daarvan één teamplaatje ("als team Blauw één
wezen was"). Alle teamplaatjes komen genummerd op het scherm. Iedereen koppelt ze aan de teamnamen, met alles wat hij in de rondes over
mensen leerde; teams mogen overleggen en rondlopen. Het eigen team is uitgesloten. Iedereen doet mee; ook teams die laag staan kunnen
met dubbele punten inlopen. Onthulling: teamplaatje + de losse plaatjes van de leden eronder.
Bij 2 teams: de finale wordt "welk van de twee", dat is te makkelijk; dan koppelt iedereen in de finale de muur-plaatjes of, zonder muur,
3 willekeurige plaatjes uit eerdere rondes opnieuw aan namen ("weet je het nog?").

## 12. Spelinstellingen (standaard)
`galleryMax` 12 · `minPerRound` 4 · `interviewSec` 300 · `promptSecMax` 90 · `maxAttempts` 2 · `searchSec` 210 · `matchSec` 60 ·
`questionsPerCandidate` 1 · `themeMode` `perPortrait` (anders `perRound`) · `maxSimilarity` 0,85 · `aiTimeoutSec` 30 · `imageConcurrency` 8 ·
`finaleMultiplier` 2 · `durationMin` (20/40/60) · `lang` (`nl`/`en`) · `mode` (`test` standaard, `live` met provider).

## 13. Schema klantpakket (`packs/<naam>/pack.json`, sleutel `wieIsWie`)
```json
{
  "wieIsWie": {
    "questionSets": [
      { "id": "A", "questions": {
        "nl": ["Wat is het vreemdste dat je ooit hebt gegeten?", "Welk klein ritueel heb je elke ochtend?", "Waar was je als kind het meest bang voor?"],
        "en": ["What is the strangest thing you have ever eaten?", "What small ritual do you have every morning?", "What were you most afraid of as a child?"] } }
    ],
    "themes": { "nl": ["een dier", "een gerecht", "een plek", "een voertuig", "een plant", "een muziekinstrument", "een weertype", "een meubelstuk"],
                "en": ["an animal", "a dish", "a place", "a vehicle", "a plant", "a musical instrument", "a type of weather", "a piece of furniture"] },
    "style": { "nl": "zachte aquarel, warm licht", "en": "soft watercolour, warm light" },
    "bannedWords": { "nl": ["haar", "bril", "baard", "lang", "klein", "functie", "manager"], "en": ["hair", "glasses", "beard", "tall", "short", "manager"] },
    "stock": [ { "theme": "een dier", "image": "stock/dier.png" } ],
    "useNicknames": true
  },
  "texts": { "nl": {}, "en": {} },
  "blocklist": []
}
```
Voorbeeldpakket `packs/demo/pack.json`: 5 vragensets × 3 vragen, 12 onderwerpen. Richtlijn voor vragen (in README): elke set heeft één
feit, één gewoonte en één verhaal; geen vragen naar beroep, uiterlijk, gezin of gezondheid; vragen die tot een concreet, eigen antwoord
leiden. Klantinhoud nooit in code.

## 14. Risico's (gecontroleerd) en maatregelen
| # | Risico | Kans/impact | Maatregel | Hoe we het testen (fase 4) |
|---|---|---|---|---|
| R1 | **Plaatjes lijken op elkaar** omdat antwoorden op elkaar lijken ("ik hou van reizen en lekker eten") | hoog/hoog | (a) **onderscheidende vragen**: per set één feit, één gewoonte, één verhaal, met doorvraag ("wanneer was dat?"); generieke vragen ("hobby's?") staan niet in de sets. (b) **ander onderwerp per plaatje**: binnen een ronde krijgt elk plaatje een ander metafoor-onderwerp (dier, gerecht, voertuig…), dus vos naast ramen-soep naast tandem. (c) **algemeenheidscheck**: de AI markeert te algemene prompts en geeft één tip ("welk detail uit het gesprek past alleen bij je partner?"), één herkansing. (d) **gelijkenischeck**: embeddings vergelijken elke prompt met de andere in dezelfde set; boven `maxSimilarity` krijgt de maker "lijkt op een ander plaatje, voeg iets unieks toe". | sim met fixture-prompts die bewust op elkaar lijken; meten: gemiddelde en maximale gelijkenis per set vóór/na de checks; rooktest met echte beelden |
| R2 | Plaatjes zijn te makkelijk (letterlijk: "een fietsende vos") of te moeilijk (onherleidbaar) | midden/midden | onderwerp dwingt metafoor af; één vraag per kandidaat; AI-check markeert alleen algemeen, niet "te makkelijk" (is een keuze van de speler); onthulling laat zien hoe vaak goed | speltest Bram: aandeel juist per ronde, doel 30-70% |
| R3 | Prompt verraadt iemand of kwetst (uiterlijk, naam, functie, gevoelige info uit het interview) | midden/hoog | lek-check + moderatie + verboden woorden; vragen gaan niet over gevoelige onderwerpen; veiligheidssuffix in beeldprompt | moderatietest met ongepaste prompts |
| R4 | **Verklappen**: maker en geïnterviewde weten het antwoord | zeker/midden | zij kunnen hun eigen twee plaatjes niet koppelen; sets zijn gelijk verdeeld over teams, dus elk team heeft per ronde ongeveer evenveel "insiders": verklappen binnen het team is voor alle teams even groot voordeel (symmetrisch), verklappen aan een ander team helpt een tegenstander; afspraak "verklap niets" in de uitleg. Team uitsluiten (eerder overwogen) is **niet** gekozen: bij 2-3 teams zou dan bijna niemand meer mogen raden. | unit test: uitsluiting; sim: balans van kandidaten per team per ronde (max verschil 1) |
| R5 | Kandidaten zijn niet te vinden in een volle zaal | midden/midden | naambadge groot op de telefoon, omhoog houden; kandidaten blijven op hun plek; scherm toont teamkleur | Playwright: badge leesbaar, tekst ≥ 32 px |
| R6 | Drukte rond kandidaten (40 speurders, 10 kandidaten): ±4 tegelijk | hoog/laag | meeluisteren mag (dat is kennismaken); een kandidaat beantwoordt per speurder één vraag in één of twee zinnen; `searchSec` instelbaar | timing in sim; speltest |
| R7 | 50 beelden tegelijk: latency of providerlimiet | midden/midden | `imageConcurrency` 8, set A eerst, rest tijdens ronde 1; terugval stockbeeld | timing met 20 s latency per beeld: set A van 12 klaar ≤ 60 s |
| R8 | Laatkomer of wegloper | zeker/laag | laatkomer: alleen speurder (geen plaatje), of tweetal met een andere laatkomer als de promptfase nog loopt; wegloper: zijn plaatje gaat uit de ronde; partner zonder partner: maakt nog steeds het plaatje als het interview klaar was | chaos-tests |
| R9 | Te veel plaatjes om te koppelen | midden/midden | `galleryMax` 12, koppelen met één tik per plaatje op een lijst van ≤ 12 namen | Playwright op telefoonformaat |
| R10 | Teamportret (finale) is een vage mengelmoes | midden/laag | samenvoegen kiest per lid het sterkste beeldelement (één zin per lid), max 5 leden; terugval: collage van de losse plaatjes | sim + rooktest |
| R11 | Kosten | laag | Bram: geen probleem; toch begrensd door het aantal plaatjes (één per speler + één per team) | rooktest: gemeten kosten per sessie |

**AI-kosten per sessie (schatting, nog niet gemeten)**: 50 spelers: 50 plaatjes + ±10 herkansingen + 12 teamplaatjes ≈ 72 beelden ×
$0,02-0,04 ≈ **$1,5-3**; checks, commentaar en moderatie ≈ $0,3. 12 spelers ≈ **$0,5**.
