# Geheime Regel (Zendo live)

**Uitleg.** Elk team krijgt een geheime regel over hoe het als groep in beeld staat (bijv. "iemand zit en iemand heeft een hand omhoog, maar geen kring"). Het team stelt zichzelf op, maakt een foto als experiment en een vision-model antwoordt alleen "klopt" of "klopt niet". Na maximaal 4 experimenten gokt het team de regel; embeddings meten de nabijheid. De AI is de enige die de regel toepast: zonder AI is er geen mechaniek. Finale: één regel voor alle teams, om de beurt experimenteren, iedereen gokt.

**Tijdscript (min/doel/max, prioriteit).** intro 1/2/3 p1 · warming-up 2/3/4 p4 · rondes 8/32/40 p2 (1 ronde = 8 min; 20 min = 1 ronde, 40 min = 3 rondes, 60 min = 4 rondes) · finale 5/7/10 p1 · uitslag 1/2/3 p1.

**Grenzen.** 4-60 spelers, 2-12 teams. Weinig teams: de stem werkt met 2 teams (alleen het andere team). Veel teams: rondes lopen parallel.

**Rollen.** Poseur (beweegt), Fotograaf, Detective (noteert uitslagen, formuleert de gok). Wie opt-out heeft of niet kan bewegen is fotograaf/detective; rollen rouleren. Alleen detectives: team gokt nog steeds.

**Fysiek en scherm.** Teams stellen zichzelf op voor elk experiment; telefoon = foto en gok (~60 s per ronde, ~12%).

**Interactie.** Elke ronde stemt elk team op het slimste experiment van een ander team (+1 punt, cap 1). De uitslagen zijn anoniem als silhouet + klopt/klopt niet op het grote scherm; de regel is pas na de gok zichtbaar.

**AI-stappen.** `judge` (foto + regeltekst → `{holds}`; screen blokkeert onveilige foto; terugval: experiment vervalt, na 2 vervallen neutrale punten) en `compare` (gok vs regel → `{sim}`; terugval woordoverlap). Latency ~1,5-5 s, time-out 20 s. Elke stap heeft fixture (regel op `photo.facts`).

**Wachttijd.** Bij trage AI bespreekt de detective de hypothese; grote scherm toont de uitslagenlijst.

**Scoring.** Gok 0/1/2 (nabijheid ≥0,3 / ≥0,6) + 1 bij raak met ≤2 experimenten + max 1 stem. Elke regel heeft een reden. Alle teams krijgen regels van hetzelfde niveau en evenveel rondes; vergelijk op gemiddelde per ronde (declaratie in export). Finale dubbele punten; elk team dat een experiment doet krijgt 1.

**Finale.** Gedeelde regel (pakket, niveau "finale"), 2 rondes parallelle experimenten die iedereen ziet, daarna gokt elk team (ook teams zonder bewegers).

**Instellingen.** rounds 4, experiments 4, efficientMax 2, hitSim 0,6, nearSim 0,3, voteCap 1, finaleLaps 2, finaleMultiplier 2, fallbackPoints 1, maxVoids 2.

**Klantpakket.** `pack.geheimeRegel = { features: [...], rules: [{ id, tier: 1|2|3|'finale', text{nl,en}, aliases{nl,en}, requires[], forbids[] }] }`; voorbeeld in packs/demo/pack.json. Klantspecifieke regels (bijv. kantoorthema) alleen daar.

**Risico's.** Vision-model kan een pose anders lezen dan de bedoeling (niet live getest); regels moeten visueel eenduidig zijn. Kosten: ~5 AI-calls per team per ronde (≈ 250 calls bij 12 teams, 60 min; vision-calls zijn de duurste).
