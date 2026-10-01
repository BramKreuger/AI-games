# AI-games

Engine plus spellen voor teamgerichte AI-partyspellen op events. Nederlands en Engels.
Dit is een startpunt: Bram past de uitgangspunten aan; bij twijfel geldt dit document.

## Commando's
- `npm test` — unit-, engine- en simulatietests (Node 20+, geen dependencies)
- `npm run sim [slug]` — bot-simulatie van een spel (standaard: demo)

## Structuur
- `engine/` — sessie, klok, scoring/leaderboard, AI-laag, i18n, bots, simulatie. Engine-versie in `engine/version.js`.
- `games/<slug>/` — plug-in: `index.js`, `defaults.nl.json`, `defaults.en.json`, `fixtures/`, `DESIGN.md`, `README.md`, `BEGELEIDER.md`
- `packs/<naam>/pack.json` — klantpakket (alle klantspecifieke inhoud)
- `docs/` — lessen, spellenoverzicht, engine-API

## Vaste uitgangspunten (scoring in /nieuw-spel: 0, 1 of 2; een 0 = afvallen)
1. **Fysiek en samen**: spelers bewegen, praten en doen samen iets; de telefoon is hulpmiddel (schermtijd < 25% van de rondetijd).
2. **AI is de kern**: de AI-stap maakt de mechaniek mogelijk, geen versiering.
3. **Alle teams blijven meedoen**: geen afvallers zonder rol; finale voor iedereen.
4. **Eerlijk en vergelijkbaar**: punten hebben altijd een reden en zijn tussen groepen vergelijkbaar (genormaliseerd of gedeclareerd).
5. **Robuust**: het spel loopt altijd door (laatkomer, uitval, AI-weigering, time-out, ongeldige uitvoer, serverherstart).
6. **Tijdflexibel**: werkt in 20, 40 en 60 minuten via blokken met prioriteit.
7. **Inclusief**: rol voor wie niet kan bewegen of opt-out heeft.
8. **Veilig**: moderatie; niets ongefilterd naar het grote scherm.
9. **Betaalbaar en voorspelbaar**: AI-kosten per sessie geschat en begrensd.
10. **Klantneutraal**: geen klantinhoud in code; alles via pakket en defaults (nl+en).

## Regels voor code
- Spellen praten alleen met de engine-API (`docs/engine-api.md`) en declareren `engineVersion`.
- Ontbreekt een generieke voorziening: bouw die in de engine, achterwaarts compatibel.
- Elke AI-stap heeft een mock-fixture en een terugvaloptie. Testmodus is de standaard; echte providers alleen met `mode: 'live'`.
- Elke puntentoekenning heeft een reden. Correcties zijn nieuwe regels, nooit overschrijven.
- Teksten via i18n-sleutels, nooit hardcoded in spelcode.
- Bij elke bug: regressietest toevoegen.
