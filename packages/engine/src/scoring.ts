import { byId, type Row } from '@gwent/data';
import type { GameState, PlayerId, PlacedCard, RowState, WeatherKind } from './state.ts';

const WEATHER_FOR_ROW: Record<Row, WeatherKind> = {
  melee: 'frost',
  ranged: 'fog',
  siege: 'rain',
};

/**
 * Effective strength of a unit, applying (in order):
 * weather → tight bond → morale boost → commander's horn.
 * Heroes are immune to everything.
 */
export function effectiveStrength(state: GameState, player: PlayerId, row: Row, placed: PlacedCard): number {
  const def = byId(placed.cardId);
  const base = def.strength ?? 0;
  if (def.hero) return base;

  const rowState = state.players[player].rows[row];
  let s = base;

  // Weather: reduces to 1 (Bran passive: halves, rounded up, min 1)
  if (state.weather[WEATHER_FOR_ROW[row]]) {
    const leader = byId(state.players[player].leaderId);
    if (leader.leaderAbility === 'bran_tuirseach') {
      s = Math.max(1, Math.ceil(s / 2));
    } else {
      s = 1;
    }
  }

  // Tight bond: multiply by number of same-bond-group cards on this row
  if (def.bondGroup) {
    const n = rowState.units.filter((u) => byId(u.cardId).bondGroup === def.bondGroup).length;
    if (n > 1) s *= n;
  }

  // Morale boost: +1 per OTHER morale unit on the row
  const morale = rowState.units.filter(
    (u) => u.instanceId !== placed.instanceId && byId(u.cardId).abilities.includes('morale_boost'),
  ).length;
  s += morale;

  // Eredin: Treacherous (passive) — doubles the strength of spy cards on your side
  if (
    def.abilities.includes('spy') &&
    byId(state.players[player].leaderId).leaderAbility === 'eredin_treacherous'
  ) {
    s *= 2;
  }

  // Commander's horn: special on row, or a horn-ability unit (not itself)
  const hornUnit = rowState.units.some(
    (u) => u.instanceId !== placed.instanceId && byId(u.cardId).abilities.includes('horn'),
  );
  if (rowState.hornActive || hornUnit) s *= 2;

  return s;
}

export function rowScore(state: GameState, player: PlayerId, row: Row): number {
  return state.players[player].rows[row].units.reduce(
    (sum, u) => sum + effectiveStrength(state, player, row, u),
    0,
  );
}

export function boardScore(state: GameState, player: PlayerId): number {
  return (['melee', 'ranged', 'siege'] as Row[]).reduce((sum, r) => sum + rowScore(state, player, r), 0);
}

export function scores(state: GameState): [number, number] {
  return [boardScore(state, 0), boardScore(state, 1)];
}

export function rowStateScore(state: GameState, player: PlayerId, row: Row): RowState {
  return state.players[player].rows[row];
}
