# Roadmap

Recovered from the 2026-07-17 build sessions. Phases 1–8 are complete; the app is
live at https://easygwent.online. Remaining work is reliability and polish, not
greenfield features.

## Done (solid base)

- Full TW3-style rules engine + AI difficulties
- Local play, deck editor, multiplayer rooms
- Auth, W/L stats, leaderboard
- Live deployment (TLS via Caddy, systemd service)
- Card art pipeline (build-time fetch, not in git) — 179/179 images
- Select → preview → play + committed ability/flavor text
- Content cleanup (Mysterious Elf, Bovine Defense Force, non-TW3 cards removed)

## Left to build (by impact)

### High — multiplayer reliability

1. [ ] **Reconnect / resume** — refresh or connection blip shouldn't forfeit and
       kill the room
2. [ ] **Idle room GC** — abandoned invite codes expire
3. [ ] **Rematch** — play again without going back to menu

### Medium — feel like the real mini-game

4. [ ] **Turn / pass / round feedback** — clearer "your turn", pass state, round
       winners
5. [ ] **Leader ability panel** — same select/preview treatment as hand cards
6. [ ] **SFX / mute** — settings already have mute; no audio yet
7. [ ] **Visual polish** — board textures, animations (optional)

### Lower — content / ops

8. [ ] **Fill remaining card-text gaps** — some cards still use generated rules
       text
9. [ ] **Missing TW3 cards vs full wiki list** — for 100% collectible parity
10. [ ] **DB backups / deploy docs** — SQLite backup cron, one-page runbook
11. [ ] **Playtest bugfixes** — edge cases from real games

## Suggested order

1. Reconnect
2. Play full MP games; fix what feels wrong
3. Rematch + small UI cues
