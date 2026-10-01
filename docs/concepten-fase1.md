# Fase 1: onderzoek en concepten (automatische run, 2026-10-01)

Fase 0: `npm test` 15/15 groen, `npm run sim` (demo) groen op 4 configuraties. Geen engine-reparatie nodig.
Geen invoer van Bram (richting/thema/klant): algemene eventdoelgroep, 12-60 deelnemers aangehouden.

## Bronnen en wat we overnemen
| Bron | Overname |
|------|----------|
| [Gartic Phone / Broken Picture Telephone](https://en.wikipedia.org/wiki/Broken_Picture_Telephone) | Keten waarin betekenis verschuift; de onthulling aan het eind is de grap |
| [Wavelength](https://en.wikipedia.org/wiki/Wavelength_(game)) | Eén dimensie tussen twee uitersten; één kijker kent het doel, het team raadt |
| Codenames | Een "spymaster" met beperkte communicatie; teams tegenover elkaar |
| [Contexto](https://contexto.uk/) | Embeddings geven een rangorde/afstand als enige feedback; AI doet iets dat niet zonder kan |
| Jackbox / Drawful | Telefoon als controller, gezamenlijke onthulling op het grote scherm |
| [Gandalf (Lakera)](https://github.com/statico/lakera-gandalf-solutions) | Trapsgewijze moeilijkheid; beperking (alleen emoji) dwingt creativiteit af |
| Emoji Scavenger Hunt | Camera + beeldherkenning als scheidsrechter van een fysieke zoektocht |
| [Beeld-reconstructie met iteratieve dialoog](https://arxiv.org/pdf/2606.01901) | Gemeenschappelijke grond opbouwen via beurten tussen beschrijver en uitvoerder |
| Embeddings/vision 2026 ([overzicht](https://mixpeek.com/curated-lists/best-multimodal-embedding-models)) | Gedeelde tekst-beeld-ruimte: foto en woord direct vergelijkbaar |

## Vijf concepten (kernmechaniek)
1. **Levend Beeld**: teams vormen met hun lichamen een standbeeld van een geheim begrip; een vision-model beschrijft de foto *blind*; een ander team raadt het begrip alleen uit die beschrijving.
2. **Stille Post Live**: een zin gaat fluisterend door een menselijke keten door de zaal; spraak-naar-tekst legt elke schakel vast en embeddings meten waar de betekenis wegdreef; AI maakt het "verloop" zichtbaar.
3. **Spectrumjacht**: teams zoeken in de ruimte een object dat op een spectrum ("saai ↔ spannend") op een geheime plek valt; AI plaatst de foto op het spectrum; dichtstbij wint.
4. **Blinde Bouwer**: één teamlid ziet een door AI gemaakte afbeelding en stuurt het team dat blind een constructie bouwt; vision vergelijkt de foto met het doel.
5. **Mingle-Mol**: AI geeft elke speler een geheime gedragsquirk; tijdens een wandelronde spotten teams de quirks van anderen.

## Scoring op de vaste uitgangspunten (0 = afvallen)
Volgorde: 1 fysiek, 2 AI-kern, 3 allen mee, 4 eerlijk, 5 robuust, 6 tijdflex, 7 inclusief, 8 veilig, 9 betaalbaar, 10 klantneutraal.

| Concept | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Totaal | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Levend Beeld | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 18 | door |
| 2 Stille Post Live | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 2 | 2 | 18 | door |
| 3 Spectrumjacht | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 1 | 2 | 2 | 16 | reserve (lijkt op Emoji Scavenger Hunt; zoektocht door de zaal minder inclusief) |
| 4 Blinde Bouwer | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 14 | reserve (AI is vooral scheidsrechter; materialen nodig) |
| 5 Mingle-Mol | 2 | **0** | 2 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | - | **afgevallen**: AI-stap is versiering (quirks kan een kaartendeck ook) |

Toelichting 1 bij Levend Beeld/Stille Post: moderatie scoort 1 omdat foto's resp. spraak ongefilterd binnenkomen; vereist een filterstap voor het grote scherm. Eerlijkheid scoort 1 bij Levend Beeld omdat de moeilijkheid per begrip verschilt (te normaliseren, zie hieronder).

---

## Concept A: Levend Beeld (slug-voorstel: `levend-beeld`)

**Kernmechaniek.** Een team krijgt een geheim begrip (bijv. "een file op maandag", "de zonsopgang") en vormt daarvan met alle lichamen één stilstaand standbeeld. De telefoon maakt een foto; een vision-model beschrijft die foto neutraal en zonder het begrip te kennen. Een ander team ziet alleen die AI-beschrijving en moet het begrip raden.

**Rondeverloop (±8 min).** 1) Begrip verschijnt op de telefoon van de "regisseur" (30 s lezen). 2) Team bouwt het beeld, 2 min. 3) Foto, AI-beschrijving (3-8 s). Wachttijd: team blijft stilstaan als "beeldhouwwerk" en de zaal telt mee-af. 4) Een ander team raadt in 60 s (mondeling overleg, één antwoord invoeren). 5) Onthulling op het grote scherm: foto (na moderatie), AI-beschrijving, het geheime begrip, en de raadpoging. Daarna wisselen de rollen.

**Rol van de AI.** Vision-model beschrijft de pose (zonder begrip als context): de "blinde tolk" is de enige informatiebron voor de raders, dus zonder AI is er geen spel. Embedding-model meet de afstand tussen raadpoging en begrip (deterministische score, ook bij vrije tekst). Taalmodel dient alleen als moderatie/terugval.

**Rollen per team.** Regisseur (kent begrip, mag niet praten of voordoen, alleen wijzen), Beeldhouwers (lichamen), Fotograaf (telefoon, 1 knop), Gids tijdens raden (spreekt voor team). Wie niet kan bewegen of opt-out heeft: regisseur of fotograaf, of "AI-criticus" die de AI-beschrijving voor de zaal beoordeelt (bonusreden "treffend/misleidend"). Rollen rouleren per ronde.

**Interactie tussen teams.** Teams zijn om beurten maker en rader van een ander team (rondedraaiing, iedereen doet evenveel). Raders mogen tegenstanders niet zien tot de onthulling.

**Punten.** Per ronde: rader krijgt punten uit de embedding-afstand (0/1/2 band: ver, dichtbij, raak); maker krijgt hetzelfde aantal als de AI-beschrijving gelukt is ("de tolk begreep ons"). Elke toekenning krijgt een reden (afstandsband + beschrijving). Vergelijkbaar tussen groepen: begrippen komen uit een vaste moeilijkheidsset met gedeclareerde gemiddelde "raadbaarheid" (gemeten in simulatie); score wordt genormaliseerd per aantal ronden en begripsmoeilijkheid. Geen stemronde nodig; tie-break: kleinste gemiddelde afstand.

**Finale.** "Gigabeeld": alle teams samen maken één groot beeld van een begrip dat de zaal kiest (embedding-clustering van suggesties); de AI beschrijft het; de zaal raadt gezamenlijk. Alle teams scoren mee op bijdrage (aanwezigheid in de foto, door vision geteld).

**Grote scherm.** Foto van het beeld, de AI-beschrijving woord voor woord, ranglijst en na de raadpoging de onthulling met afstandsmeter. Tekst ≥32 px.

**Materialen.** Alleen telefoons, ruimte. Optioneel: attributen voor de pose.

**Grootste risico's.** Foto's met gezichten (privacy/moderatie: gezichten vervagen of foto niet tonen, alleen beschrijving + silhouet); vision-model beschrijft te letterlijk of onthult het begrip (prompt moet "blind" afdwingen en een lek-check doen); culturele begrippenset (via pakket). Schermtijd ~15%.

**AI-kosten per sessie (schatting, 12 teams, 40 min).** ~36 vision-calls ≈ $0,02 elk = $0,7; ~36 embeddings ≈ $0,01; moderatie ≈ $0,3; totaal ≈ $1-2, begrensd op een instelbaar plafond.

---

## Concept B: Stille Post Live (slug-voorstel: `stille-post`)

**Kernmechaniek.** Een zin wordt door de zaal heen gefluisterd langs een menselijke keten van leden uit verschillende teams. Elke schakel spreekt de zin in op de telefoon (korte opname), spraak-naar-tekst legt de drift vast en embeddings meten hoe ver de betekenis is verschoven. Aan het eind speelt de AI de verandering terug als "verloop" met beeld.

**Rondeverloop (±7 min).** 1) Een startzin (in te stellen door pakket) verschijnt bij de eerste speler, 10 s. 2) Per schakel: fluisteren aan de volgende (mondeling, fysiek naar elkaar toe lopen), daarna 5 s opnemen op eigen telefoon. 3) Eindzin wordt getoond; AI toont per schakel de transcriptie, afstand tot origineel. 4) Wachttijd tijdens transcriptie: de keten blijft in een rij staan als "kabel" en de zaal raadt waar het misging (mondeling). 5) Onthulling op het grote scherm met afstandsgrafiek en een AI-beeld van begin- en eindzin naast elkaar.

**Rol van de AI.** Speech-to-text, embeddings voor semantische drift, beeldgenerator voor onthulling (met fixture/terugval: geen beeld). Taalmodel zet "wie veranderde wat" om in een korte, vriendelijke uitleg. Zonder AI is de drift niet meetbaar of eerlijk te beoordelen.

**Rollen per team.** Fluisteraar (schakel in de keten), Luisteraar/Controleur (zit naast, maakt aantekening), Opnemer (telefoon) en Ketenleider (bepaalt volgorde). Wie niet kan bewegen: vaste schakel die niet hoeft te lopen, of Controleur/AI-uitlegger; opt-out: zwijgende observator met stemrecht op "waar ging het mis". Rouleert per ronde.

**Interactie tussen teams.** De keten zit door elkaar: elk team levert schakels, dus teams zijn afhankelijk én concurrent. Teams scoren op hoeveel van de oorspronkelijke betekenis hún schakels behielden (ruis-bijdrage per team) én op de eindscore van de keten.

**Punten.** Per team: 2 punten als de eigen schakel de betekenis behoudt (afstand binnen tolerantie), 1 bij gedeeltelijk, 0 bij verlies; plus ketenbonus voor iedereen als de eindzin dichtbij blijft. Reden zichtbaar per schakel ("jouw zin: 'sleutel' werd 'slee', afstand 0,41"). Vergelijkbaar: afstanden worden genormaliseerd op zinslengte en moeilijkheidsklasse; de simulatie declareert baseline-drift per zinsset.

**Finale.** Eén gezamenlijke "megaketen" met alle spelers in één lange slinger; de ketenscore telt voor iedereen, individuele schakels leveren een MVP- en een "creatiefste fout"-titel.

**Grote scherm.** De zinnen per schakel (na moderatie), een afstandslijn die oploopt, het beeld begin/eind.

**Materialen.** Telefoons, ruimte, eventueel koptelefoons voor lawaai.

**Grootste risico's.** Lawaai in de zaal (stt-kwaliteit): terugval op handmatige invoer/typen door luisteraar; privacy/opnames (bewaren niets, verwerk en verwijder); schuttingtaal in gefluisterde zinnen (moderatie op transcript vóór scherm); accenten/NL-EN wisselen (stt-taal per sessie). Schermtijd ~12%.

**AI-kosten per sessie (schatting, 12 teams, 40 min).** ~60 transcripties (5 s) ≈ $0,02 elk = $1,2; embeddings ≈ $0,02; beeld 12 × $0,04 ≈ $0,5; uitleg ≈ $0,2; totaal ≈ $2-3, begrensd.

---

## Aanbeveling
Beide scoren 18/20. **Levend Beeld** is het meest "event-waardig" (zichtbaar, lachwekkend, iedereen beweegt) maar vraagt beeldmoderatie. **Stille Post Live** is technisch eenvoudiger te testen (tekst), maar kwetsbaarder voor zaallawaai. Voorstel: bouw Levend Beeld als eerste; Stille Post Live als tweede spel. Reserve: Spectrumjacht.

**STOP: Bram kiest concept (A, B, mix of reserve) of geeft bijsturing voordat fase 2 (DESIGN.md) start.**
