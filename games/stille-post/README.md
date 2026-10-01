# Stille Post Live (`stille-post`)

Een zin wordt fluisterend door een keten van spelers uit verschillende teams gegeven; spraak-naar-tekst en embeddings meten waar de betekenis wegdrijft. Ontwerp: [DESIGN.md](DESIGN.md) · Presentatorblad: [BEGELEIDER.md](BEGELEIDER.md).

## Starten
```bash
npm run sim stille-post          # bot-simulatie (4p/2t/20, 12p/4t/40, 60p/12t/60, 13p/5t/40)
npm test                # alle unit-, engine-, spel- en simulatietests
npm run serve           # livelaag op http://127.0.0.1:8080 (PORT=… om te wijzigen)
```
Open `/dashboard` (presentator: spel kiezen, taal, minuten, botspelers, start, correcties), `/screen` (groot scherm, 1920×1080) en `/phone` (spelers; werkt op iPhone en Android). Spelers melden zich aan met naam en optioneel team; bij herladen of serverherstart komt de speler terug.
Vanuit code: `simulate('stille-post', { players, teams, durationMin, lang, chaos })` uit `engine/sim-generic.js`.

## Testmodus
Standaard `mode: 'test'`: alle AI-stappen gebruiken fixtures (embeddings lokaal via `engine/embed.js`), geen netwerk, geen kosten. Echte providers alleen met `mode: 'live'` en een `provider`-functie; zonder provider valt elke AI-stap terug op de terugvaloptie.

## Botteams
`makeTeams(players, teams)` maakt botteams; ~10% van de bots is opt-out. In de livelaag vult de dashboard-instelling "Botspelers" teams aan; bots antwoorden zelf.
Chaos: `chaos.fault(step) -> 'refuse' | 'timeout' | 'invalid'`, `chaos.inputFault({kind, teamId}) -> 'drop'`, `chaos.latencyMs`.

## Spelinstellingen
Zie DESIGN.md §12. Voorbeeld: `settings: { rounds: 3, hitSim: 0.65 }`. Taal: `lang: 'nl' | 'en'`; teksten via `defaults.<taal>.json`, klantteksten via `pack.texts`.

## Pakket
`packs/demo/pack.json` bevat voorbeeldinhoud (schema in DESIGN.md §13). Eigen pakket: kopieer `packs/demo`, pas aan, geef de naam door aan `loadPack('naam')`.

## Bekende beperkingen
- Echte providers zijn niet gekoppeld of live getest (geen API-sleutel in de testomgeving); de rooktest met kosten en latency staat nog open.
- Livelaag: de klok is virtueel; blokken lopen door zodra spelers antwoorden of de invoer-time-out (`timeoutSec`) verloopt. De presentator bewaakt de echte tijd.
- Foto's worden niet naar het grote scherm gestuurd (alleen silhouet).
- Mock-embeddings zijn woord-/trigram-gebaseerd en dus geen echte semantiek.
