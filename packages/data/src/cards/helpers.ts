import type { CardDef, Faction, Row, SpecialKind, UnitAbility, LeaderAbilityId } from '../types.ts';

export interface UnitOpts {
  hero?: boolean;
  abilities?: UnitAbility[];
  count?: number;
  musterGroup?: string;
  bondGroup?: string;
  transformsInto?: string;
}

/** Compact unit factory. */
export function unit(
  faction: Faction,
  id: string,
  name: string,
  strength: number,
  rows: Row[],
  opts: UnitOpts = {},
): CardDef {
  return {
    id,
    name,
    faction,
    type: 'unit',
    rows,
    strength,
    hero: opts.hero ?? false,
    abilities: opts.abilities ?? [],
    count: opts.count ?? 1,
    ...(opts.musterGroup ? { musterGroup: opts.musterGroup } : {}),
    ...(opts.bondGroup ? { bondGroup: opts.bondGroup } : {}),
    ...(opts.transformsInto ? { transformsInto: opts.transformsInto } : {}),
  };
}

export function special(
  faction: Faction,
  id: string,
  name: string,
  kind: SpecialKind,
  count: number,
): CardDef {
  return { id, name, faction, type: 'special', special: kind, abilities: [], count };
}

export function leader(
  faction: Faction,
  id: string,
  name: string,
  ability: LeaderAbilityId,
): CardDef {
  return { id, name, faction, type: 'leader', abilities: [], count: 1, leaderAbility: ability };
}
