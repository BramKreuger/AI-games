# Concepten (Fase 1, autonome run)

Bronnen en wat we overnemen: Codenames (één die het geheim kent, de rest moet via woorden), Wavelength (gedeeld beeld op het scherm), Gandalf/Prompt Battle (AI als spelleider, niet als versiering), Emoji Scavenger Hunt (voorwerpen in de eigen omgeving herkennen met vision). Vermijden: wat al in spellen-overzicht.md staat (prompts schrijven, onderlinge stemronde, blind beschrijven, fluisterketen, regel raden).

Score 0/1/2 op de 10 uitgangspunten (som, 0 = afvallen):
| Concept | Som | Opmerking |
|---|---|---|
| **Blinde Bouwer** (AI maakt plan uit eigen voorwerpen, bouwer met ogen dicht, AI vergelijkt foto met plan, ander team scheids) | 19 | geen nul |
| Geluidenkaart (team maakt geluidsscène, AI classificeert audio) | 15 | audio-classificatie onbetrouwbaar, robuustheid 1 |
| Route-in-de-ruimte (team loopt een route, AI leest plattegrond) | 14 | zonder sensoren geen AI-kern (0 bij uitgangspunt 2) |
| Mime-film (3 stilstaande foto's vertellen een plot) | 16 | lijkt sterk op levend-beeld |
| Menselijke tekenmachine (AI beschrijft tekening, team tekent met lichamen) | 15 | grote ruimte nodig |

Keuze: Blinde Bouwer, hoogste score en minst vergelijkbaar met bestaande mechanieken.

## Uitwerking top 2
**1. Blinde Bouwer.** Kern: het team fotografeert 3-5 eigen voorwerpen; de AI maakt daar een uniek bouwplan van. Alleen de regisseur ziet het plan en mag niets aanraken; de bouwer heeft de ogen dicht; de gidsen roepen aanwijzingen. De foto van het resultaat wordt door de AI vergeleken met het plan (match 0-100). Een ander team is scheidsrechter. Rol AI: plan maken uit beeld, bouwsel beoordelen. Punten: 0-2 voor match plus 1 voor eerlijk bouwen; gelijk niveau voor elk team. Finale: Gigabouwsel van alle teams in één plan. Kosten: ~100 AI-calls bij 12 teams/60 min. Risico: beeldoordeel onnauwkeurig, daarom vaste punten bij storing en brede banden.
**2. Mime-film.** Teams vertellen een plot in drie stilstaande beelden; de AI schrijft de logline en een ander team raadt de film. Risico: overlap met levend-beeld; daarom niet gekozen.
