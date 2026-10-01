Ontwerp, bouw en test een nieuw spel op de engine volgens de fasen 0-5 hieronder. Optionele invoer: $ARGUMENTS
(richting, thema, doelgroep of klant).

**Geplande/autonome run** (geen mens aanwezig): volg `docs/routine.md`. Daar staan de statusbewaking, het hervatten,
de zelfgenomen keuzes in plaats van STOP-momenten en de meldingsregels. Bij een handmatige run: stop bij elk
STOP-moment en wacht op akkoord.

## Fase 0: Controle
Lees CLAUDE.md, docs/lessen.md, docs/spellen-overzicht.md. Draai `npm test` en `npm run sim`. Rood: eerst repareren.

## Fase 1: Onderzoek en concepten
Zoek online inspiratie (Jackbox, Gartic Phone, Codenames, Wavelength, Contexto, Prompt Battle, Gandalf, Emoji
Scavenger Hunt, echt-of-AI, teambuilding, recente AI-mogelijkheden). Noteer per bron wat je overneemt. Bedenk 5
concepten met één kernmechaniek, scoor 0/1/2 op de uitgangspunten (0 = afvallen), werk de top 2 uit op één pagina:
kernmechaniek (3 zinnen), rondeverloop, rol AI, rollen per team, interactie tussen teams, punten en vergelijkbaarheid,
eindbaas/finale, grote scherm, materialen, risico's, AI-kosten per sessie. STOP (handmatig).

## Fase 2: Spelontwerp
`games/<slug>/DESIGN.md`: uitleg ≤250 woorden; tijdscript in blokken (min/doel/max, prioriteit; 20/40/60 min);
grenzen (deelnemers, teams, teamgrootte; weinig/veel teams); rollen per teamgrootte, rouleren, rol bij opt-out of
niet kunnen bewegen; fysieke opdracht per ronde en schermtijd (< 25%); interactie tussen teams; AI-stappen (invoer,
model, prompt, uitvoer, latency, terugval); wachttijdinvulling; gezamenlijk moment op het grote scherm; scoring
(redenen, stemmen, tie-breaks, uitleg, vergelijkbaarheid); finale waarin iedereen meedoet; spelinstellingen met
defaults; klantpakketschema met voorbeeld; nl/en. STOP (handmatig).

## Fase 3: Bouwen
Plug-in in games/<slug> via de engine-API met engineVersion. Geen klantinhoud in code; defaults.nl.json en
defaults.en.json; voorbeeldpakket packs/demo; mock-fixtures voor elke AI-stap; generieke ontbrekende delen in de
engine (achterwaarts compatibel). Branch game/<slug>, kleine commits.

## Fase 4: Testen (testmodus tenzij vermeld)
1 unit tests logica en scoring. 2 bot-simulaties: min, max, oneven, duur min/40/max. 3 chaos: laatkomer, wegloper,
telefoon uit en terug, team komt niet, serverherstart, AI weigert/time-out/ongeldig. 4 timing met 20 s latency, per
blok. 5 leaderboard: redenen, correcties, standaard-export geldig. 6 Playwright: iPhone/Android, 1920x1080, camera,
herverbinden, tekst ≥ 32px op groot scherm. 7 belasting: 5 sessies met max bots. 8 moderatie met ongepaste
tekst/beeld. 9 één rooktest met echte providers op klein budget (latency, kosten). Elke bug: fix, regressietest,
alles opnieuw; bij engine-wijziging ook alle andere spel-sims.

## Fase 5: Oplevering
PR (samenvatting, testresultaten, timing per duur, kosten, beperkingen); games/<slug>/README.md; BEGELEIDER.md (één
A4: script, schema, storingen); docs/spellen-overzicht.md bijwerken. STOP: Bram speltest met echte mensen.
