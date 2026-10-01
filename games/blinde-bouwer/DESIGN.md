# Blinde Bouwer: ontwerp

## Uitleg (≤250 woorden)
Elk team verzamelt 3-5 voorwerpen uit de eigen omgeving en fotografeert ze. De AI maakt daar een uniek bouwplan van, bijvoorbeeld "stapel twee, leg het derde rechts ernaast". Alleen de regisseur ziet het plan op de telefoon en mag niets aanraken. De bouwer heeft de ogen dicht. De gidsen roepen aanwijzingen; ze raken de voorwerpen niet aan. Na de bouwtijd maakt de fotograaf een foto. De AI vergelijkt de foto met het plan (match 0-100). Een ander team is scheidsrechter en bevestigt dat eerlijk is gebouwd. Het plan wordt daarna aan de zaal getoond. In de finale bouwen alle teams om de beurt één gezamenlijk bouwsel volgens één plan.

## Tijdscript
| Blok | min | doel | max | prio | AI-stappen |
|---|---|---|---|---|---|
| intro | 1 | 2 | 3 | 1 (verplicht) | 0 |
| warmup | 2 | 3 | 5 | 4 | 0 |
| rondes | 8 | 8×rondes | 10×rondes | 2 | 2 per team per ronde |
| finale | 4 | 6 | 10 | 1 (verplicht) | 2 |
| uitslag | 1 | 2 | 3 | 1 (verplicht) | 0 |
20 min: 1 ronde, geen warmup. 40 min: 4 rondes. 60 min: 4 rondes met extra tijd per ronde. Rondes worden gekort via `planBlocks`.

## Grenzen
4-60 spelers, 2-12 teams, 2-10 spelers per team ideaal; bij weinig teams (2) is de scheidsrechter het andere team, bij veel teams rouleert het paar per ronde.

## Rollen per teamgrootte
1 speler: bouwer + regisseur + fotograaf. 2: bouwer, regisseur (ook fotograaf). 3: bouwer, regisseur, fotograaf. 4+: de rest is gids. De bouwer rouleert per ronde onder de bewegers. Opt-out of niet kunnen bewegen: regisseur of fotograaf, nooit bouwer; wie geen enkele rol zou hebben wordt gids. Elke verbonden speler heeft altijd een rol.

## Fysiek en schermtijd
Voorwerpen verzamelen, blind bouwen en roepen is fysiek en samen. Telefoon: foto voorwerpen, plan lezen, foto bouwsel, stem scheids: ~60 s per ronde van 8 min (12,5%).

## Interactie tussen teams
Het buurteam is scheidsrechter (stem eerlijk bouwen). Finale: alle teams in één bouwsel.

## AI-stappen
| Stap | Invoer | Uitvoer | Latency | Terugval |
|---|---|---|---|---|
| blueprint | foto van voorwerpen (vision), taal, aantal | `{plan}` tekst ≥15 tekens | ~5 s | vast plan uit pakket (`blindeBouwer.layouts`) |
| judge | foto bouwsel + plan (vision) | `{score}` 0-100 | ~8 s | vaste punten voor het team |
Beide: mock-fixture, time-out 20 s, invoerscherm voor onveilige foto's, moderatie van uitvoer. Mock draait standaard.

## Wachttijd en gezamenlijk moment
Tijdens AI-stappen: team-spel "raad de volgorde"-teller en countdown door de zaal. Gezamenlijk moment: plan-onthulling per team op het grote scherm (alleen gemodereerde tekst, silhouet van de foto).

## Scoring
Per ronde: match ≥70 = 2, ≥40 = 1, anders 0; +1 voor eerlijk bouwen (scheids ja, of geen scheids beschikbaar: voordeel van de twijfel). AI-storing: 1 vast punt. Elke regel heeft een reden. Correcties zijn nieuwe regels. Vergelijkbaar: elk team bouwt evenveel rondes op hetzelfde niveau; declaratie `mean-points-per-round`, max 3 per ronde. Gelijkstand: hoogste finalepunten, daarna hoogste gemiddelde match.

## Finale
Alle teams: elk 1 punt bijdrage, plus match-band × 2 voor iedereen gelijk. Team zonder telefoons doet fysiek mee en krijgt regels.

## Instellingen (defaults)
rounds 4, roundMin 8, strongScore 70, roughScore 40, cleanBonus 1, finaleMultiplier 2, fallbackPoints 1, inventorySec 60, buildSec 150, voteSec 20, aiTimeoutSec 20.

## Klantpakket
`pack.blindeBouwer = { layouts: [{id, tier, items, text:{nl,en}}], finale:{nl,en} }`. Voorbeeld in `packs/demo/pack.json`. Optioneel `texts`-overrides en `blocklist`.

## Kosten
~98 AI-calls bij 12 teams/60 min (2 vision-calls per team per ronde). Schatting vision ~$0,01 per call: ≈ $1 per sessie. Begrensd door rondes en teams.
