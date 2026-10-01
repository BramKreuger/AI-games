# AI-games

Engine en plug-in-spellen voor AI-teamspellen op events. Zie `CLAUDE.md` (uitgangspunten, regels) en `docs/engine-api.md`.

```
npm test      # alle tests (testmodus, geen netwerk)
npm run sim   # bot-simulaties van het demospel
```

Nieuw spel: draai `/nieuw-spel`. Het demospel in `games/demo` is de referentie-implementatie
(plug-in, defaults nl/en, fixtures, klantpakket in `packs/demo`).

Status engine 1.0.0: sessie, virtuele klok, tijdplanning op prioriteit, ledger met redenen en correcties,
standaard-export (`standard-v1`), AI-laag met mock/fallback/moderatie, i18n, botteams, herstart via snapshot.
Nog niet gebouwd: netwerklaag (telefoon/groot scherm/dashboard), echte providers, Playwright-tests.
