# Lessen

Lege lijst; voeg na elke speltest of bug een regel toe: datum, wat gebeurde, wat we veranderen.

- (start) Nog geen speltests met echte mensen gedaan.
- 2026-10-01: eerste versie van de AI-banen telde parallelle AI-calls als één stap; een keten van 12 sequentiële AI-calls overschreed de finale-tijd (480 s tegen 420 s). Opgelost met banen in `ai.batch` en door de ketenverwerking in parallelle golven te doen. Regressietests: `test/engine-1-1.test.js`, timingtest in `test/games.test.js`.
- 2026-10-01: nog geen speltest met echte mensen voor levend-beeld en stille-post; eerst testen vóór eventgebruik.
