# Routine: autonoom spelbouwen (elk uur)

Dit document vervangt de STOP-momenten van `/nieuw-spel` voor geplande runs. Handmatig gebruik van
`/nieuw-spel` blijft met STOP-momenten werken. Fasen en eisen (onderzoek, DESIGN.md, bouwen, testen,
oplevering) zijn ongewijzigd; alleen het wachten op akkoord is vervangen door zelfcontrole en een PR.

## Parallelle en eerdere runs (eerst doen)
Elke run krijgt een eigen sessiebranch (`claude/<naam>`) en ziet het werk van andere runs alleen via GitHub.
Zonder deze controle ontstaan dubbele concepten. Dus vóór je iets doet:
1. `git fetch origin`; bekijk `git branch -r`, de open PR's (GitHub MCP `list_pull_requests`) en `docs/spellen-overzicht.md`.
2. Bestaat er een open PR of een `claude/*`-branch met nieuwer werk dan de standaardbranch? Bouw daarop voort
   (`git checkout -B <jouw sessiebranch> origin/<die branch>`) in plaats van opnieuw te beginnen.
3. Heeft een andere branch alleen een Fase 1-document dat al in een spel-PR zit: negeer die, herhaal het niet.
4. Een open spel-PR die op Bram wacht blokkeert niets: Bram wil meerdere spellen naast elkaar kunnen testen. Bouw gewoon
   het volgende spel (zie Grenzen voor het maximum).
5. Werk de state bij en commit die mee, zodat de volgende run het ziet.

## Status bijhouden
Bestand `docs/routine-state.json` (op de branch van het spel; standaardwaarde als het niet bestaat: `{"games":[]}`):
`{"games":[{"slug","branch","phase":0-5,"step","concepts_done":bool,"chosen":"naam","pr":nummer|null,"notes":""}]}`
Elke run leest dit eerst, hervat en schrijft het bij elke commit bij. Nooit opnieuw beginnen als er werk loopt.

## Run-volgorde
1. `git fetch`; lees CLAUDE.md, docs/lessen.md, docs/spellen-overzicht.md, docs/routine-state.json.
2. `npm test` en `npm run sim`. Rood: eerst repareren (aparte branch `engine/fix-<kort>`, PR), geen spel bouwen.
3. Kies werk:
   - Er is een spel met phase < 5: hervat dat spel (branch `game/<slug>`).
   - Alle spellen af (PR open of gemerged) en er zijn minder dan 5 open spel-PR's: start een nieuw spel, kies slug.
   - Anders: niets doen en stil stoppen (geen notificatie).
4. Werk door tot het spel klaar is of de run tegen zijn tijd/contextlimiet loopt. Commit klein en vaak, push naar
   `game/<slug>`, werk de state bij. Een volgende run hervat exact daar.

## Beslissingen zonder Bram
- **Fase 1**: onderzoek met WebSearch/WebFetch, 5 concepten, scoor 0/1/2 op de 10 uitgangspunten in CLAUDE.md,
  0 = afvallen. Schrijf concepten naar `games/<slug>/CONCEPTEN.md` (top 2 volledig uitgewerkt). Kies zelf het
  concept met de hoogste score; bij gelijke stand het concept dat het minst op spellen-overzicht.md lijkt.
  Leg de keuze en reden vast in CONCEPTEN.md.
- **Fase 2**: schrijf DESIGN.md volledig. Zelfcontrole: loop de checklist uit het `/nieuw-spel`-prompt na
  (tijdscript 20/40/60, rollen per teamgrootte, inclusie, AI-stappen met terugval, scoring, finale, instellingen,
  klantpakket-schema, nl+en). Ontbrekende punten aanvullen voordat je bouwt.
- **Fase 3-4**: bouwen en alle tests uit het `/nieuw-spel`-prompt. Playwright installeert niet opnieuw
  (`/opt/pw-browsers/chromium`). Engine-uitbreidingen alleen achterwaarts compatibel; daarna alle spel-sims draaien.
  Bouw ontbrekende engine-delen (netwerklaag, telefoon/scherm/dashboard) als generieke voorziening in `engine/`,
  zodra een spel ze nodig heeft, en hergebruik ze daarna.
- **Rooktest met echte providers**: alleen als een API-sleutel in de omgeving staat (nu `OPENAI_GAME_KEY`, OpenAI;
  controleer met `[ -n "$OPENAI_GAME_KEY" ]` zonder de waarde te tonen). Bouw daarvoor een generieke provider in
  `engine/providers/openai.js` (vision, embeddings, spraak, moderatie) achter `mode: 'live'`; eerst met een klein
  budget (max ~$1 per run) en meld werkelijke latency en kosten in de PR. Anders overslaan en in de PR
  vermelden dat die ontbreekt. Nooit sleutels in de repo.
- **Bug**: oplossen, regressietest, alles opnieuw draaien. Een test nooit overslaan of uitzetten om groen te worden.
- Niet hergebruiken: mechanieken uit spellen-overzicht.md, tenzij duidelijk beter.

## Oplevering en melding
- Fase 5: PR (alleen het spel + eventuele engine-uitbreidingen), README.md, BEGELEIDER.md, spellen-overzicht bijwerken.
  PR-beschrijving: samenvatting, testresultaten, timing per spelduur, kosten per sessie (schatting als niet live
  getest), bekende beperkingen, en wat nog niet automatisch getest kon worden. Titel begint met `[speltest nodig]`.
- Nooit zelf mergen. Het spel is pas bruikbaar op een event na een speltest met echte mensen door Bram.
- Stuur een PushNotification (in `<routine_summary>`) bij: spel klaar (PR-link), tests die niet groen te krijgen
  zijn, of een blokkade die Bram moet oplossen. Geen melding voor tussenstappen of "niets te doen".
- Voeg na afloop een regel toe aan docs/lessen.md als er iets onverwachts gebeurde.

## Overzicht voor Bram
Elk spel krijgt `games/<slug>/meta.json` (`title`, `summary` in nl+en, `status`: `speltest-nodig` zodra het af is, `tags`).
Daarmee verschijnt het automatisch op `/games` (`npm run serve`), waar Bram spellen kan starten, stoppen en wisselen.
De test `test/overzicht.test.js` faalt als meta.json ontbreekt. Werk ook docs/spellen-overzicht.md bij.

## Grenzen
- Maximaal 5 open spel-PR's tegelijk; daarboven stil stoppen tot Bram er een heeft gemerged of gesloten. Elk spel krijgt een eigen PR. Nooit pushen naar de standaardbranch of naar andermans branches.
- Geen klantspecifieke inhoud in code. Teksten via defaults.nl.json/defaults.en.json.
