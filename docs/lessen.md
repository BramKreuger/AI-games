# Lessen

Lege lijst; voeg na elke speltest of bug een regel toe: datum, wat gebeurde, wat we veranderen.

- (start) Nog geen speltests met echte mensen gedaan.
- 2026-10-01: eerste versie van de AI-banen telde parallelle AI-calls als één stap; een keten van 12 sequentiële AI-calls overschreed de finale-tijd (480 s tegen 420 s). Opgelost met banen in `ai.batch` en door de ketenverwerking in parallelle golven te doen. Regressietests: `test/engine-1-1.test.js`, timingtest in `test/games.test.js`.
- 2026-10-01: nog geen speltest met echte mensen voor levend-beeld en stille-post; eerst testen vóór eventgebruik.
- 2026-10-01: Blinde Bouwer gebouwd zonder echte rooktest (OpenAI-provider ontbreekt nog); beeldoordeel is alleen met mock getest, drempels (70/40) moeten bij de speltest worden bijgesteld.
- 2026-10-01: OpenAI-provider eerst vergeten te bouwen terwijl routine.md dat voorschrijft; Bram wees erop. Rooktest blinde-bouwer: 6 calls, ~$0,002, mediane latency ~1 s (synthetische foto's, geen echte camerabeelden).
