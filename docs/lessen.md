# Lessen

Lege lijst; voeg na elke speltest of bug een regel toe: datum, wat gebeurde, wat we veranderen.

- (start) Nog geen speltests met echte mensen gedaan.
- 2026-10-01: eerste versie van de AI-banen telde parallelle AI-calls als één stap; een keten van 12 sequentiële AI-calls overschreed de finale-tijd (480 s tegen 420 s). Opgelost met banen in `ai.batch` en door de ketenverwerking in parallelle golven te doen. Regressietests: `test/engine-1-1.test.js`, timingtest in `test/games.test.js`.
- 2026-10-01: nog geen speltest met echte mensen voor levend-beeld en stille-post; eerst testen vóór eventgebruik.
- 2026-10-01 (wie-is-wie, rooktest echte AI): met "warm licht" in de beeldstijl werden alle plaatjes oranje en leken ze op elkaar; nu een kleurpalet per plaatje, verschillend binnen een ronde. Regressietest in `test/wie-is-wie.test.js`.
- 2026-10-01 (wie-is-wie, rooktest): het tekstmodel meldde de naam als lek terwijl die niet in de prompt stond, en noemde de helft van de prompts "te algemeen". Lekwoorden tellen nu alleen als ze echt in de prompt staan; de regel voor "algemeen" is aangescherpt (één concreet detail is genoeg). Regressietest toegevoegd.
- 2026-10-01 (wie-is-wie, tests): korte Nederlandse woorden als "haar", "klein" en "lang" in de verboden lijst gaven valse lekken; de lijst bevat nu alleen ondubbelzinnige uiterlijkwoorden (haarkleur, krullen, bril…). Regressietest toegevoegd.
- 2026-10-01 (wie-is-wie, timingtest): AI-calls via `Promise.all` in plaats van `ctx.ai.batch` telden sequentieel op de virtuele klok (prompt-blok 220 s tegen 180 s). Altijd `ctx.ai.batch` gebruiken voor parallelle AI-stappen.
