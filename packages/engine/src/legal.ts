import { byId, type Row } from '@gwent/data';
import type { Action } from './actions.ts';
import type { GameState, PlayerId } from './state.ts';
import { isLeaderCancelled, isPassiveLeader } from './reducer.ts';

const ROWS: Row[] = ['melee', 'ranged', 'siege'];

/** Enumerate all legal actions for `player` in `state`. */
export function legalActions(s: GameState, player: PlayerId): Action[] {
  const actions: Action[] = [];
  const p = s.players[player];

  if (s.phase === 'finished') return actions;

  if (s.phase === 'redraw') {
    if (p.redrawsLeft > 0) {
      actions.push({ type: 'REDRAW', player, handIndex: null });
      for (let i = 0; i < p.hand.length; i++) {
        actions.push({ type: 'REDRAW', player, handIndex: i });
      }
    }
    return actions;
  }

  if (s.pendingChoice) {
    if (s.pendingChoice.player !== player) return actions;
    actions.push({ type: 'RESOLVE_CHOICE', player, cardId: null });
    for (const id of s.pendingChoice.options) {
      actions.push({ type: 'RESOLVE_CHOICE', player, cardId: id });
    }
    return actions;
  }

  if (s.turn !== player || p.passed) return actions;

  actions.push({ type: 'PASS', player });

  for (let i = 0; i < p.hand.length; i++) {
    const def = byId(p.hand[i]!);
    if (def.type === 'unit') {
      for (const row of def.rows ?? []) {
        actions.push({ type: 'PLAY_CARD', player, handIndex: i, row });
      }
    } else if (def.type === 'special') {
      switch (def.special) {
        case 'horn':
          for (const row of ROWS) {
            if (!p.rows[row].hornActive) actions.push({ type: 'PLAY_CARD', player, handIndex: i, row });
          }
          break;
        case 'mardroeme':
          for (const row of ROWS) {
            if (p.rows[row].units.some((u) => byId(u.cardId).abilities.includes('berserker'))) {
              actions.push({ type: 'PLAY_CARD', player, handIndex: i, row });
            }
          }
          break;
        case 'decoy':
          for (const row of ROWS) {
            for (const u of p.rows[row].units) {
              const d = byId(u.cardId);
              if (!d.hero && d.type === 'unit') {
                actions.push({ type: 'PLAY_CARD', player, handIndex: i, targetInstanceId: u.instanceId });
              }
            }
          }
          break;
        default:
          actions.push({ type: 'PLAY_CARD', player, handIndex: i });
      }
    }
  }

  if (!p.leaderUsed && !isLeaderCancelled(s, player) && !isPassiveLeader(byId(p.leaderId))) {
    actions.push({ type: 'PLAY_LEADER', player });
  }

  return actions;
}
