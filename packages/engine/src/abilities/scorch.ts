import { byId, type Row } from '@gwent/data';
import type { GameState, PlayerId } from './../state.ts';
import { otherPlayer } from './../state.ts';
import { effectiveStrength, rowScore } from './../scoring.ts';

const ROWS: Row[] = ['melee', 'ranged', 'siege'];

function destroy(s: GameState, player: PlayerId, row: Row, instanceIds: Set<string>): void {
  const rs = s.players[player].rows[row];
  const dead = rs.units.filter((u) => instanceIds.has(u.instanceId));
  rs.units = rs.units.filter((u) => !instanceIds.has(u.instanceId));
  for (const u of dead) {
    const d = byId(u.cardId);
    if (d.abilities.includes('spy')) s.players[otherPlayer(player)].graveyard.push(u.cardId);
    else s.players[player].graveyard.push(u.cardId);
    s.log.push({ turn: s.turnCount, text: `${d.name} is scorched` });
  }
}

/**
 * Scorch special: destroy the strongest non-hero unit(s) on the whole board
 * (all units tied for max effective strength).
 */
export function globalScorch(s: GameState): void {
  let max = -1;
  const targets: Array<{ player: PlayerId; row: Row; id: string; str: number }> = [];
  for (const player of [0, 1] as PlayerId[]) {
    for (const row of ROWS) {
      for (const u of s.players[player].rows[row].units) {
        if (byId(u.cardId).hero) continue;
        const str = effectiveStrength(s, player, row, u);
        targets.push({ player, row, id: u.instanceId, str });
        if (str > max) max = str;
      }
    }
  }
  if (max < 0) return;
  for (const player of [0, 1] as PlayerId[]) {
    for (const row of ROWS) {
      const ids = new Set(
        targets.filter((t) => t.player === player && t.row === row && t.str === max).map((t) => t.id),
      );
      if (ids.size) destroy(s, player, row, ids);
    }
  }
}

/**
 * Unit scorch (e.g. Villentretenmerth): if the opposing row of the same kind
 * totals >= 10, destroy its strongest non-hero unit(s).
 */
export function unitScorch(s: GameState, player: PlayerId, row: Row): void {
  const target = otherPlayer(player);
  if (rowScore(s, target, row) < 10) {
    s.log.push({ turn: s.turnCount, text: `Scorch has no effect (enemy ${row} row below 10)` });
    return;
  }
  scorchRowIfStrong(s, target, row, 10);
}

/** Leader-style row scorch: destroy strongest non-hero unit(s) on `row` of `target` if the row totals >= threshold. */
export function scorchRowIfStrong(s: GameState, target: PlayerId, row: Row, threshold: number): void {
  if (rowScore(s, target, row) < threshold) return;
  let max = -1;
  const strs = new Map<string, number>();
  for (const u of s.players[target].rows[row].units) {
    if (byId(u.cardId).hero) continue;
    const str = effectiveStrength(s, target, row, u);
    strs.set(u.instanceId, str);
    if (str > max) max = str;
  }
  if (max < 0) return;
  const ids = new Set([...strs.entries()].filter(([, v]) => v === max).map(([k]) => k));
  destroy(s, target, row, ids);
}
