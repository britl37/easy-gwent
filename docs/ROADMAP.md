# Roadmap

Recovered from the 2026-07-17 build sessions; updated 2026-07-19.
Phases 1–8 are complete; the app is live at https://easygwent.online.
Remaining work is browser verification, real-device multiplayer testing, and
the playtest fixes they uncover. See "Release verification".

## Done (solid base)

- Full Witcher 3 minigame rules engine + AI difficulties
- Local play, deck editor, multiplayer rooms
- Auth, W/L stats, leaderboard
- Live deployment (TLS via Caddy, systemd service)
- Card art pipeline (build-time fetch, not in git) — 185/185 images
- Select → preview → play + committed ability/flavor text
- Content cleanup (Mysterious Elf, Bovine Defense Force, non-TW3 cards removed)
- Full current Witcher 3 catalog: 185 card definitions and matching asset manifest

## Session notes — 2026-07-19

Owner review fixes and editor rework:

- Corrected regular Gaunter O'Dimm's artwork; the manifest had pointed both
  Gaunter cards at the Darkness image. Added an exact wiki-title override so a
  future manifest rebuild cannot repeat the mistake. Follow-up owner testing
  found the old image persisted in browser cache, so card-art URLs are now
  revisioned to force corrected assets to reload.
- Added explicit opponent-pass feedback: a prominent “Opponent passed — Your
  turn” banner and the normal your-turn chime, including when a card reveal is
  still fading out.
- Added a distinct four-note heroic reveal sting for winning a non-final round:
  the second note falls a fifth below the opening, then two notes leap upward
  to a sustained brass-like finish. Draws and losses retain the subdued
  round-end cue and match wins retain the full victory fanfare.
- Rebuilt the deck editor around card artwork and readable rules text. It now
  includes name/effect search, unit/special/effect filters, card metadata,
  copy availability, visual leader selection, deck steppers, validation and
  statistics, and summon-only references. On phones, Collection and My Deck
  are separate full-height tabs with independent scrolling, keeping search,
  filters, leader selection, and deck controls usable without a page-length
  stack. Search tolerates a single typo/transposition, and exhaustive tests
  prove every legal faction/neutral card appears and can be found by name.
- Added client regression coverage for pass detection and editor effect-text
  classification.
- Verification: 103/103 tests passed, TypeScript passed, production build passed,
  and the local and public servers returned the new hashed bundle.

The project owner has begun live browser review and reported/fixed the issues
above. A complete end-to-end and real-device pass is still outstanding.

### Mechanics and catalog audit

Completed a second full mechanics and card audit against Witcher Wiki content
for the Gwent minigame in The Witcher 3, explicitly excluding mechanics from the
later standalone GWENT game.

Card and data corrections:

- Expanded the catalog from 179 to 185 definitions: Roach, Etolian Auxiliary
  Archers, Young Emissary, Vreemde, Dwarven Skirmisher, and Clan Heymaey Skald
- Corrected audited rows, strengths, abilities, and copy counts, including Toad,
  Harpy, Blueboy Lugos, Svanrige, Holger Blackhand, Donar an Hindar, Clan
  Tordarroch Armorsmith, Dol Blathanna Archer, Elven Skirmisher, and Mahakaman
  Defender
- Added directional Muster behavior for Cerys/Shield Maidens, Geralt or
  Ciri/Roach, Arachas Behemoth/Arachas, and Gaunter O'Dimm/Darkness
- Reconciled the asset manifest to all 185 definitions and fetched the six new
  images locally; fetched images remain ignored as required

Rules and engine corrections:

- Unified unit effects across normal play, Medic revival, and faction revival
- Corrected Toad, Schirru, Villentretenmerth, and Clan Dimun Pirate Scorch
  targeting; the Pirate now participates in its own global Scorch
- Corrected spy ownership so a spy enters the battlefield owner's discard pile
- Corrected Cow/Kambi Summon Avenger timing for Scorch and round cleanup
- Kept active Weather, Commander's Horn, and Mardroeme cards in play until
  cleared or the round ends, preventing premature discard retrieval/shuffling
- Implemented exact active leader selections, passive leader cancellation,
  private hand previews, mandatory multi-step choices, and agile-row optimization
- Added Scoia'tael's first-player choice, winner-led following rounds, protected
  mulligans, and persistent deterministic faction randomness
- Added discard-pile contents/counts and persistent hand/deck/discard counters
  to the local and multiplayer game UI

Verification performed during the mechanics audit:

- `npm test`: 90/90 tests passed
- `npm run build:code`: production client build passed
- Asset manifest: 185/185 definitions covered; six missing images fetched
- Local Vite server returned HTTP 200 at `http://127.0.0.1:5173/`

At that point no automated visual browser pass was available because the host
had no Playwright or Chromium executable. Owner browser review is now in
progress, but the full release checklist below remains open.

## Build log — 2026-07-18 (full day)

Multiplayer reliability:

- `622ce13` Disconnect grace window with reconnect flow (RECONNECT_GRACE_MS,
  client socket wrapper, auto-reconnect + rejoin, "opponent disconnected" banner)
- `6bd9af6` Rematch flow (offer/accept, fresh decks) + idle-room GC
- `b3f95a5` MP game resume — room persistence + lobby resume
- `5821883` Fix reconnect via join_room falling through to room_full; room id
  shown on opponent card
- `5368cee` / `58fd66f` Session/room id chip with copy button; spacing
- `4c76acd` Simultaneous redraw — both seats mulligan independently

Game feel:

- `e98b455` Pronounced turn banners + slower play pacing (FIRST_STEP_MS/STEP_MS)
- `a033854` Respect prefers-reduced-motion in reveal/card animations
- `d338c15` Synthesized SFX (card play, turn chimes, round end, win/loss) + mute
- `5d1767a` Leader ability text next to the Use button

Rules / data correctness:

- `055db4e` Deck rules audit — MIN_UNITS = 22, MAX_SPECIALS = 10, non-canon
  MAX_HEROES cap removed; editor counters match; tests green
- `11286ab` Monsters leader data fixed vs wiki (Red Riders horn, name swap,
  Filavandrel agile, Ciaran spelling)
- `fd4f45a` Gaunter O'Dimm muster fixed (missing ability flag), no-op scorch
  logged, regression tests
- `c7a2672` Deck editor traps fixed — auto-save drafts, sanitize stale decks,
  hide count-0 tokens, loud invalid warning
- `014709c` starterDeck moved into engine (rule-driven, validated on build)
- `9bf68d3` Trigger cards section in deck builder (read-only, summon-only
  tokens) + explicit `trigger_only` validateDeck rule; all 4 starter decks
  regenerated/verified against build rules

UI / layout:

- `55d0e16` + `cdb226c` Mobile layout pass (stacked game screen, touch targets,
  100dvh scroll fix)
- `ebcde31` Hand/board cards scale with viewport at TW3 hand:row ratio
- `6e60f59` Canon-style board — wood palette, pale-blue row medallions, horn
  slots, seat scores with laurel
- `5df2901` + `8bf24b9` UI overhaul — design tokens, vignette, ornate
  buttons/panels, textured board, gradient title, focus states

Ops:

- `41f6487` Static caching — hashed assets immutable, HTML no-cache
- `11e0db6` DB backups (`backup-db.mjs` + `gwent-backup.timer`, verified
  restore) + `docs/RUNBOOK.md`
- `5bda317` / `cfcac78` Untracked local-only files (.claude/, ROADMAP.md)

End of day: typecheck clean, 60/60 tests green, deployed and serving 200.

## Left to build (by impact)

### High — multiplayer reliability

1. ~~[x] **Reconnect / resume**~~ — done `622ce13`/`b3f95a5`/`5821883`; still
   wants real-network exercise (folded into tomorrow's E2E)
2. ~~[x] **Idle room GC**~~ — done (`6bd9af6`)
3. ~~[x] **Rematch**~~ — done (`6bd9af6`)

### Medium — feel like the real mini-game

4. ~~[x] **Turn / pass / round feedback**~~ — done (`e98b455`), with explicit
   opponent-pass feedback and a round-win sting added during owner review
5. ~~[x] **Leader ability panel**~~ — done (`5d1767a`)
6. ~~[x] **SFX / mute**~~ — done (`d338c15`)
7. ~~[x] **Visual polish**~~ — main game polish done
   (`5df2901`/`8bf24b9`/`6e60f59`); artwork-first deck editor completed during
   owner review

### Lower — content / ops

8. [ ] **Fill remaining card-text gaps** — 10 effect-bearing cards still use
   accurate engine-generated rules instead of wiki-sourced text/flavor; this is
   content polish, not a gameplay blocker
9. ~~[x] **Missing TW3 cards vs full wiki list**~~ — current catalog audit
   completed 2026-07-19 (185 definitions)
10. ~~[x] **DB backups / deploy docs**~~ — done (`11e0db6`)
11. [ ] **Playtest bugfixes** — continue fixing edge cases found during owner
    review and the E2E test; current known owner-reported issues are resolved

## Release verification — final steps

### 1. Final polish pass (one pass, timeboxed — no rabbit holes)

- Sweep every screen at desktop + mobile widths: menu, local game, deck editor
  (incl. new trigger cards section), lobby/rooms, multiplayer game, leaderboard,
  settings, auth
- Consistency: spacing, fonts, button styles, focus/hover states, banner
  timing, reduced-motion variants
- Quick wins only from item 8 (card-text gaps) if any jump out
- Rebuild, deploy, verify caching headers still correct

### 2. Full end-to-end test of EVERY surface (release gate)

Status: partial owner browser review is underway. The checklist below remains
open even though the automated suite, typecheck, production build, and public
bundle checks pass.

Local play:

- [ ] Full game vs each AI difficulty (easy/medium/hard) to completion
- [ ] Each faction's starter deck playable; leader abilities fire correctly
- [ ] Redraw/mulligan, pass, round transitions, win/loss/draw screens

Deck editor:

- [ ] Build a deck from scratch for each faction; save/load/autosave
- [ ] Verify artwork, effect descriptions, search/filter controls, leader
  selection, copy steppers, and responsive layout
- [ ] Validation errors surface correctly (min units, max specials, copies,
  wrong faction, trigger-only)
- [ ] Trigger cards section shows correct tokens per faction, none addable

Multiplayer (two real devices/networks, not just two tabs):

- [ ] Create room → invite code → join → full game to completion
- [ ] Simultaneous redraw, turn banners, SFX both sides
- [ ] Mid-game refresh on each side → reconnect within grace window
- [ ] Kill network > grace window → forfeit behaves correctly
- [ ] Rematch flow (offer/accept/decline), leave/resume via lobby
- [ ] Idle room GC — abandoned code expires

Accounts / meta:

- [ ] Register, login, logout, bad-credential paths
- [ ] W/L stats record correctly after MP games; leaderboard updates

Ops:

- [ ] Backup timer ran overnight; restore drill per RUNBOOK.md
- [ ] systemd restart recovery; TLS cert valid; cache headers
- [ ] Mobile (real phone) pass over every screen

Bugs found go straight into a fix list; anything non-trivial gets a regression
test. When the checklist is green, tag a release and call it shipped.
