import type { CardDef } from '../types.ts';
import { unit, special } from './helpers.ts';

const F = 'neutral' as const;

export const NEUTRAL_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'ne_geralt', 'Geralt of Rivia', 15, ['melee'], { hero: true }),
  unit(F, 'ne_ciri', 'Cirilla Fiona Elen Riannon', 15, ['melee'], { hero: true }),
  unit(F, 'ne_yennefer', 'Yennefer of Vengerberg', 7, ['ranged'], { hero: true, abilities: ['medic'] }),
  unit(F, 'ne_triss', 'Triss Merigold', 7, ['melee'], { hero: true }),
  // TW3 card name is Mysterious Elf (the character is Avallac'h; not a separate card).
  unit(F, 'ne_mysterious_elf', 'Mysterious Elf', 0, ['melee'], { hero: true, abilities: ['spy'] }),
  // ─ Units ─
  unit(F, 'ne_dandelion', 'Dandelion', 2, ['melee'], { abilities: ['horn'] }),
  unit(F, 'ne_zoltan', 'Zoltan Chivay', 5, ['melee']),
  unit(F, 'ne_regis', 'Emiel Regis Rohellec Terzieff', 5, ['melee']),
  unit(F, 'ne_villentretenmerth', 'Villentretenmerth', 7, ['melee'], { abilities: ['scorch'] }),
  unit(F, 'ne_vesemir', 'Vesemir', 6, ['melee']),
  unit(F, 'ne_olgierd', 'Olgierd von Everec', 6, ['melee', 'ranged'], { abilities: ['morale_boost'] }),
  unit(F, 'ne_gaunter_odimm', "Gaunter O'Dimm", 2, ['siege'], { musterGroup: 'odimm' }),
  unit(F, 'ne_gaunter_darkness', "Gaunter O'Dimm: Darkness", 4, ['ranged'], { musterGroup: 'odimm', count: 3 }),
  unit(F, 'ne_cow', 'Bovine Defense Force', 8, ['ranged'], { abilities: ['summon_avenger'], transformsInto: 'ne_chort' }),
  unit(F, 'ne_chort', 'Chort', 8, ['melee'], { count: 0 }),
  // ─ Specials ─
  special(F, 'ne_decoy', 'Decoy', 'decoy', 3),
  special(F, 'ne_horn', "Commander's Horn", 'horn', 3),
  special(F, 'ne_scorch', 'Scorch', 'scorch', 3),
  special(F, 'ne_frost', 'Biting Frost', 'frost', 3),
  special(F, 'ne_fog', 'Impenetrable Fog', 'fog', 3),
  special(F, 'ne_rain', 'Torrential Rain', 'rain', 3),
  special(F, 'ne_storm', 'Skellige Storm', 'storm', 3),
  special(F, 'ne_clear', 'Clear Weather', 'clear', 3),
];
