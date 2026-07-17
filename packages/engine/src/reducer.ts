import { byId, type CardDef, type Row } from '@gwent/data';
import type { Action, PlayCardAction } from './actions.ts';
import type { GameState, PlayerId, PlacedCard } from './state.ts';
import { IllegalActionError, cloneState, otherPlayer } from './state.ts';
import { scores } from './scoring.ts';
import { createRng, shuffle, pick, type Rng } from './rng.ts';
import { applyLeader } from './abilities/leaders.ts';
import { unitScorch, globalScorch } from './abilities/scorch.ts';

const ROWS: Row[] = ['melee', 'ranged', 'siege'];

export function applyAction(prev: GameState, action: Action): GameState {
  const s = cloneState(prev);
  const rng = createRng(0);
  rng.state = s.rngState;

  if (s.phase === 'finished') throw new IllegalActionError('Game is finished');

  switch (action.type) {
    case 'REDRAW':
      handleRedraw(s, rng, action.player, action.handIndex);
      break;
    case 'PLAY_CARD':
      requireTurn(s, action.player, 'play');
      handlePlayCard(s, rng, action);
      afterMove(s, action.player);
      break;
    case 'PLAY_LEADER': {
      requireTurn(s, action.player, 'play');
      const p = s.players[action.player];
      if (p.leaderUsed) throw new IllegalActionError('Leader already used');
      const leader = byId(p.leaderId);
      if (isLeaderCancelled(s, action.player)) throw new IllegalActionError('Leader ability is cancelled');
      if (isPassiveLeader(leader)) throw new IllegalActionError('This leader ability is passive');
      p.leaderUsed = true;
      log(s, `Player ${action.player + 1} uses leader: ${leader.name}`);
      applyLeader(s, rng, action.player, leader.leaderAbility!);
      afterMove(s, action.player);
      break;
    }
    case 'RESOLVE_CHOICE':
      handleResolveChoice(s, rng, action.player, action.cardId);
      break;
    case 'PASS': {
      requireTurn(s, action.player, 'play');
      const p = s.players[action.player];
      p.passed = true;
      log(s, `Player ${action.player + 1} passes`);
      afterMove(s, action.player);
      break;
    }
  }

  s.rngState = rng.state;
  s.turnCount++;
  return s;
}

// ── helpers ──────────────────────────────────────────────────────────

function log(s: GameState, text: string): void {
  s.log.push({ turn: s.turnCount, text });
}

function requireTurn(s: GameState, player: PlayerId, phase: 'play'): void {
  if (s.phase !== phase) throw new IllegalActionError(`Not in ${phase} phase`);
  if (s.pendingChoice) throw new IllegalActionError('A choice is pending');
  if (s.turn !== player) throw new IllegalActionError('Not your turn');
  if (s.players[player].passed) throw new IllegalActionError('You have passed');
}

export function isPassiveLeader(def: CardDef): boolean {
  return (
    def.leaderAbility === 'emhyr_the_white_flame' ||
    def.leaderAbility === 'francesca_daisy_of_the_valley' ||
    def.leaderAbility === 'eredin_treacherous' ||
    def.leaderAbility === 'bran_tuirseach'
  );
}

export function isLeaderCancelled(s: GameState, player: PlayerId): boolean {
  const opp = s.players[otherPlayer(player)];
  return byId(opp.leaderId).leaderAbility === 'emhyr_the_white_flame';
}

export function placeUnit(s: GameState, player: PlayerId, row: Row, cardId: string): PlacedCard {
  const placed: PlacedCard = { instanceId: `i${s.nextInstance++}`, cardId };
  s.players[player].rows[row].units.push(placed);
  return placed;
}

// ── redraw phase ─────────────────────────────────────────────────────

function handleRedraw(s: GameState, rng: Rng, player: PlayerId, handIndex: number | null): void {
  if (s.phase !== 'redraw') throw new IllegalActionError('Not in redraw phase');
  const p = s.players[player];
  if (p.redrawsLeft <= 0) throw new IllegalActionError('No redraws left');

  if (handIndex === null) {
    p.redrawsLeft = 0;
  } else {
    const cardId = p.hand[handIndex];
    if (cardId === undefined) throw new IllegalActionError('Bad hand index');
    p.hand.splice(handIndex, 1);
    p.deck.push(cardId);
    shuffle(rng, p.deck);
    p.hand.push(p.deck.pop()!);
    p.redrawsLeft--;
  }

  if (s.players[0].redrawsLeft <= 0 && s.players[1].redrawsLeft <= 0) {
    s.phase = 'play';
    log(s, 'Round 1 begins');
  }
}

// ── playing cards ────────────────────────────────────────────────────

function handlePlayCard(s: GameState, rng: Rng, action: PlayCardAction): void {
  const p = s.players[action.player];
  const cardId = p.hand[action.handIndex];
  if (cardId === undefined) throw new IllegalActionError('Bad hand index');
  const def = byId(cardId);

  p.hand.splice(action.handIndex, 1);

  if (def.type === 'special') {
    playSpecial(s, rng, action, def);
  } else if (def.type === 'unit') {
    playUnit(s, rng, action, def);
  } else {
    throw new IllegalActionError('Cannot play a leader card from hand');
  }
}

function resolveRow(action: PlayCardAction, def: CardDef): Row {
  const rows = def.rows ?? [];
  if (rows.length === 1) return rows[0]!;
  if (!action.row || !rows.includes(action.row)) {
    throw new IllegalActionError(`${def.name} requires a row choice of ${rows.join('/')}`);
  }
  return action.row;
}

function playUnit(s: GameState, rng: Rng, action: PlayCardAction, def: CardDef): void {
  const player = action.player;
  const p = s.players[player];

  // Spy goes to the opponent's row and you draw 2
  if (def.abilities.includes('spy')) {
    const row = resolveRow(action, def);
    const target = otherPlayer(player);
    placeUnit(s, target, row, def.id);
    for (let i = 0; i < 2 && p.deck.length; i++) p.hand.push(p.deck.pop()!);
    log(s, `Player ${player + 1} plays spy ${def.name}`);
    return;
  }

  const row = resolveRow(action, def);
  placeUnit(s, player, row, def.id);
  log(s, `Player ${player + 1} plays ${def.name} (${row})`);

  // Muster: pull all same-group cards from hand and deck
  if (def.abilities.includes('muster') && def.musterGroup) {
    const group = def.musterGroup;
    const pull = (arr: string[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const d = byId(arr[i]!);
        if (d.musterGroup === group && d.type === 'unit') {
          arr.splice(i, 1);
          const r = (d.rows ?? ['melee'])[0]!;
          placeUnit(s, player, r, d.id);
        }
      }
    };
    pull(p.hand);
    pull(p.deck);
  }

  // Unit scorch (Villentretenmerth etc.): melee-row conditional scorch
  if (def.abilities.includes('scorch')) {
    unitScorch(s, player, row);
  }

  // Medic: open a pending choice over own graveyard units (non-hero)
  if (def.abilities.includes('medic')) {
    openMedicChoice(s, player);
  }
}

export function openMedicChoice(s: GameState, player: PlayerId): void {
  const options = s.players[player].graveyard.filter((id) => {
    const d = byId(id);
    return d.type === 'unit' && !d.hero;
  });
  if (options.length === 0) return;
  s.pendingChoice = { player, kind: 'medic', options: [...new Set(options)], remaining: 1 };
}

function playSpecial(s: GameState, rng: Rng, action: PlayCardAction, def: CardDef): void {
  const player = action.player;
  const p = s.players[player];

  switch (def.special) {
    case 'frost':
    case 'fog':
    case 'rain':
      s.weather[def.special] = true;
      break;
    case 'storm':
      s.weather.fog = true;
      s.weather.rain = true;
      break;
    case 'clear':
      s.weather.frost = s.weather.fog = s.weather.rain = false;
      break;
    case 'horn': {
      if (!action.row) throw new IllegalActionError('Horn requires a row');
      const rowState = p.rows[action.row];
      if (rowState.hornActive) throw new IllegalActionError('Row already has a horn');
      rowState.hornActive = true;
      break;
    }
    case 'scorch':
      globalScorch(s);
      break;
    case 'decoy': {
      const target = action.targetInstanceId;
      if (!target) throw new IllegalActionError('Decoy requires a target unit');
      for (const row of ROWS) {
        const units = p.rows[row].units;
        const idx = units.findIndex((u) => u.instanceId === target);
        if (idx >= 0) {
          const u = units[idx]!;
          const d = byId(u.cardId);
          if (d.hero) throw new IllegalActionError('Cannot decoy a hero');
          units.splice(idx, 1);
          p.hand.push(u.cardId);
          // Decoy stays on the board as a 0-strength placeholder? In W3 it replaces the unit.
          placeUnit(s, player, row, def.id === 'ne_decoy' ? 'ne_decoy' : def.id);
          log(s, `Player ${player + 1} decoys ${d.name}`);
          s.players[player].graveyard = s.players[player].graveyard; // no-op clarity
          return; // decoy consumed onto board, not graveyard
        }
      }
      throw new IllegalActionError('Decoy target not found on your board');
    }
    case 'mardroeme': {
      if (!action.row) throw new IllegalActionError('Mardroeme requires a row');
      transformBerserkers(s, player, action.row);
      break;
    }
    default:
      throw new IllegalActionError(`Unhandled special: ${def.id}`);
  }
  p.graveyard.push(def.id);
  log(s, `Player ${player + 1} plays ${def.name}`);
}

export function transformBerserkers(s: GameState, player: PlayerId, row: Row): void {
  const units = s.players[player].rows[row].units;
  for (const u of units) {
    const d = byId(u.cardId);
    if (d.abilities.includes('berserker') && d.transformsInto) {
      u.cardId = d.transformsInto;
    }
  }
}

// ── choices ──────────────────────────────────────────────────────────

function handleResolveChoice(s: GameState, rng: Rng, player: PlayerId, cardId: string | null): void {
  const pc = s.pendingChoice;
  if (!pc) throw new IllegalActionError('No pending choice');
  if (pc.player !== player) throw new IllegalActionError('Not your choice');

  if (pc.kind === 'medic') {
    s.pendingChoice = null;
    if (cardId === null) return; // declined
    if (!pc.options.includes(cardId)) throw new IllegalActionError('Invalid medic target');
    const p = s.players[player];
    const gi = p.graveyard.indexOf(cardId);
    if (gi < 0) throw new IllegalActionError('Card no longer in graveyard');
    p.graveyard.splice(gi, 1);
    const def = byId(cardId);
    // Revived card is played immediately (chain medics)
    if (def.abilities.includes('spy')) {
      const row = (def.rows ?? ['melee'])[0]!;
      placeUnit(s, otherPlayer(player), row, def.id);
      for (let i = 0; i < 2 && p.deck.length; i++) p.hand.push(p.deck.pop()!);
    } else {
      const row = (def.rows ?? ['melee'])[0]!;
      placeUnit(s, player, row, def.id);
      if (def.abilities.includes('scorch')) unitScorch(s, player, row);
    }
    log(s, `Player ${player + 1} revives ${def.name}`);
    if (def.abilities.includes('medic')) openMedicChoice(s, player);
    return;
  }

  throw new IllegalActionError(`Unhandled choice kind: ${pc.kind}`);
}

// ── turn / round flow ────────────────────────────────────────────────

/** After a player's move (incl. resolving into no pending choice), advance turn or end round. */
function afterMove(s: GameState, mover: PlayerId): void {
  if (s.pendingChoice) return; // wait for resolution; turn does not advance yet

  const [a, b] = s.players;
  if (a.passed && b.passed) {
    endRound(s);
    return;
  }
  const opp = otherPlayer(mover);
  if (!s.players[opp].passed) {
    s.turn = opp;
  } else {
    s.turn = mover; // opponent passed: mover keeps playing
  }
  // If current player has no cards and hasn't passed, auto-pass
  const cur = s.players[s.turn];
  if (!cur.passed && cur.hand.length === 0 && !canUseLeader(s, s.turn)) {
    cur.passed = true;
    log(s, `Player ${s.turn + 1} is out of cards and passes`);
    if (s.players[0].passed && s.players[1].passed) endRound(s);
    else s.turn = otherPlayer(s.turn);
  }
}

function canUseLeader(s: GameState, player: PlayerId): boolean {
  const p = s.players[player];
  if (p.leaderUsed || isLeaderCancelled(s, player)) return false;
  return !isPassiveLeader(byId(p.leaderId));
}

function endRound(s: GameState): void {
  const [sa, sb] = scores(s);
  let winner: PlayerId | null;
  if (sa > sb) winner = 0;
  else if (sb > sa) winner = 1;
  else {
    // Nilfgaard wins ties (if exactly one side is Nilfgaard)
    const nf0 = s.players[0].faction === 'nilfgaard';
    const nf1 = s.players[1].faction === 'nilfgaard';
    winner = nf0 && !nf1 ? 0 : nf1 && !nf0 ? 1 : null;
  }
  s.roundHistory.push({ scores: [sa, sb], winner });
  log(s, `Round ${s.round} ends ${sa}-${sb}` + (winner === null ? ' (draw)' : `, player ${winner + 1} wins it`));

  if (winner === null) {
    s.players[0].gems--;
    s.players[1].gems--;
  } else {
    s.players[otherPlayer(winner)].gems--;
  }

  const rng = createRng(0);
  rng.state = s.rngState;

  // Faction round-end passives before clearing the board
  applyRoundEndPassives(s, rng, winner);

  // Clear board into graveyards, reset weather/horns/pass
  for (const pid of [0, 1] as PlayerId[]) {
    const p = s.players[pid];
    for (const row of ROWS) {
      const rs = p.rows[row];
      for (const u of rs.units) {
        const d = byId(u.cardId);
        // Spies on my side belong to the opponent's graveyard
        if (d.abilities.includes('spy')) s.players[otherPlayer(pid)].graveyard.push(u.cardId);
        else if (!u.kept) p.graveyard.push(u.cardId);
      }
      rs.units = rs.units.filter((u) => u.kept);
      for (const u of rs.units) delete u.kept;
      rs.hornActive = false;
    }
    p.passed = false;
  }
  s.weather = { frost: false, fog: false, rain: false };
  s.rngState = rng.state;

  // Game over?
  if (s.players[0].gems <= 0 || s.players[1].gems <= 0) {
    s.phase = 'finished';
    const g0 = s.players[0].gems;
    const g1 = s.players[1].gems;
    if (g0 <= 0 && g1 <= 0) {
      s.winner = null;
      s.drawn = true;
      log(s, 'The game ends in a draw');
    } else {
      s.winner = g0 <= 0 ? 1 : 0;
      log(s, `Player ${s.winner + 1} wins the game`);
    }
    return;
  }

  s.round++;
  // Loser of the round leads the next one; on draw, previous turn holder leads
  s.turn = winner !== null ? otherPlayer(winner) : s.turn;
  log(s, `Round ${s.round} begins`);
}

function applyRoundEndPassives(s: GameState, rng: Rng, winner: PlayerId | null): void {
  for (const pid of [0, 1] as PlayerId[]) {
    const p = s.players[pid];
    // Northern Realms: draw a card when you win a round
    if (p.faction === 'northern_realms' && winner === pid && p.deck.length) {
      p.hand.push(p.deck.pop()!);
      log(s, `Player ${pid + 1} draws a card (Northern Realms)`);
    }
    // Monsters: keep one random unit on the board
    if (p.faction === 'monsters') {
      const all: Array<{ row: Row; u: PlacedCard }> = [];
      for (const row of ROWS) {
        for (const u of p.rows[row].units) {
          if (!byId(u.cardId).abilities.includes('spy')) all.push({ row, u });
        }
      }
      if (all.length) {
        const keep = pick(rng, all);
        keep.u.kept = true;
        log(s, `Player ${pid + 1} keeps ${byId(keep.u.cardId).name} (Monsters)`);
      }
    }
    // Skellige: at the start of round 3, revive 2 random non-hero units
    if (p.faction === 'skellige' && s.round === 2 && s.roundHistory.length === 2) {
      // handled below via round check after increment; see note
    }
  }

  // Skellige passive: after round 2 ends (entering round 3), revive 2 random units
  if (s.roundHistory.length === 2) {
    for (const pid of [0, 1] as PlayerId[]) {
      const p = s.players[pid];
      if (p.faction !== 'skellige') continue;
      for (let i = 0; i < 2; i++) {
        const opts = p.graveyard.filter((id) => {
          const d = byId(id);
          return d.type === 'unit' && !d.hero;
        });
        if (!opts.length) break;
        const id = pick(rng, opts);
        p.graveyard.splice(p.graveyard.indexOf(id), 1);
        const d = byId(id);
        const row = (d.rows ?? ['melee'])[0]!;
        placeUnit(s, pid, row, id);
        log(s, `Player ${pid + 1} revives ${d.name} (Skellige)`);
      }
    }
  }
}
