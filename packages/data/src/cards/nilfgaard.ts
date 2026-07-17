import type { CardDef } from '../types.ts';
import { unit } from './helpers.ts';

const F = 'nilfgaard' as const;

export const NILFGAARD_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'nf_letho', 'Letho of Gulet', 10, ['melee'], { hero: true }),
  unit(F, 'nf_menno', 'Menno Coehoorn', 10, ['melee'], { hero: true, abilities: ['medic'] }),
  unit(F, 'nf_morvran', 'Morvran Voorhis', 10, ['siege'], { hero: true }),
  unit(F, 'nf_tibor', 'Tibor Eggebracht', 10, ['ranged'], { hero: true }),
  // ─ Spies ─
  unit(F, 'nf_shilard', 'Shilard Fitz-Oesterlen', 7, ['melee'], { abilities: ['spy'] }),
  unit(F, 'nf_stefan_skellen', 'Stefan Skellen', 9, ['melee'], { abilities: ['spy'] }),
  unit(F, 'nf_vattier', 'Vattier de Rideaux', 4, ['melee'], { abilities: ['spy'] }),
  // ─ Units ─
  unit(F, 'nf_albrich', 'Albrich', 2, ['ranged']),
  unit(F, 'nf_assire', 'Assire var Anahid', 6, ['ranged']),
  unit(F, 'nf_cynthia', 'Cynthia', 4, ['ranged']),
  unit(F, 'nf_fringilla', 'Fringilla Vigo', 6, ['ranged']),
  unit(F, 'nf_vanhemar', 'Vanhemar', 4, ['ranged']),
  unit(F, 'nf_rainfarn', 'Rainfarn', 4, ['melee']),
  unit(F, 'nf_renuald', 'Renuald aep Matsen', 5, ['ranged']),
  unit(F, 'nf_morteisen', 'Morteisen', 3, ['melee']),
  unit(F, 'nf_auckes', 'Auckes', 2, ['melee']),
  unit(F, 'nf_serrit', 'Serrit', 2, ['melee']),
  unit(F, 'nf_sweers', 'Sweers', 2, ['ranged']),
  unit(F, 'nf_puttkammer', 'Puttkammer', 3, ['ranged']),
  unit(F, 'nf_cahir', 'Cahir Mawr Dyffryn aep Ceallach', 6, ['melee']),
  unit(F, 'nf_black_archer', 'Black Infantry Archer', 10, ['ranged'], { count: 2 }),
  unit(F, 'nf_impera_brigade', 'Impera Brigade Guard', 3, ['melee'], { bondGroup: 'impera', abilities: ['tight_bond'], count: 4 }),
  unit(F, 'nf_nausicaa', 'Nausicaa Cavalry Rider', 2, ['melee'], { bondGroup: 'nausicaa', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'nf_rotten_mangonel', 'Rotten Mangonel', 3, ['siege']),
  unit(F, 'nf_siege_engineer', 'Siege Engineer', 6, ['siege']),
  unit(F, 'nf_siege_technician', 'Siege Technician', 0, ['siege'], { abilities: ['medic'] }),
  unit(F, 'nf_fire_scorpion', 'Zerrikanian Fire Scorpion', 5, ['siege']),
  unit(F, 'nf_heavy_fire_scorpion', 'Heavy Zerrikanian Fire Scorpion', 10, ['siege']),
  unit(F, 'nf_etolium', 'Vrygheff', 5, ['siege']),
];
