import type { CardDef } from '../types.ts';
import { leader } from './helpers.ts';

export const LEADER_CARDS: CardDef[] = [
  // ─ Northern Realms ─
  leader('northern_realms', 'nr_leader_steel_forged', 'Foltest: The Steel-Forged', 'foltest_steel_forged'),
  leader('northern_realms', 'nr_leader_siegemaster', 'Foltest: The Siegemaster', 'foltest_siegemaster'),
  leader('northern_realms', 'nr_leader_kingdom_temeria', 'Foltest: King of Temeria', 'foltest_kingdom_of_temeria'),
  leader('northern_realms', 'nr_leader_lord_commander', 'Foltest: Lord Commander of the North', 'foltest_lord_commander'),
  leader('northern_realms', 'nr_leader_son_of_medell', 'Foltest: Son of Medell', 'foltest_son_of_medell'),
  // ─ Nilfgaard ─
  leader('nilfgaard', 'nf_leader_imperial_majesty', 'Emhyr var Emreis: His Imperial Majesty', 'emhyr_imperial_majesty'),
  leader('nilfgaard', 'nf_leader_emperor', 'Emhyr var Emreis: Emperor of Nilfgaard', 'emhyr_emperor_of_nilfgaard'),
  leader('nilfgaard', 'nf_leader_white_flame', 'Emhyr var Emreis: The White Flame', 'emhyr_the_white_flame'),
  leader('nilfgaard', 'nf_leader_relentless', 'Emhyr var Emreis: The Relentless', 'emhyr_his_imperial_majesty'),
  leader('nilfgaard', 'nf_leader_invader', 'Emhyr var Emreis: Invader of the North', 'emhyr_invader_of_the_north'),
  // ─ Scoia'tael ─
  leader('scoiatael', 'sc_leader_daisy', 'Francesca Findabair: Daisy of the Valley', 'francesca_daisy_of_the_valley'),
  leader('scoiatael', 'sc_leader_pureblood', 'Francesca Findabair: Pureblood Elf', 'francesca_pureblood_elf'),
  leader('scoiatael', 'sc_leader_queen', 'Francesca Findabair: Queen of Dol Blathanna', 'francesca_queen_of_dol_blathanna'),
  leader('scoiatael', 'sc_leader_beautiful', 'Francesca Findabair: The Beautiful', 'francesca_beautiful'),
  leader('scoiatael', 'sc_leader_hope', 'Francesca Findabair: Hope of the Aen Seidhe', 'francesca_hope_of_the_aen_seidhe'),
  // ─ Monsters ─
  leader('monsters', 'mo_leader_red_riders', 'Eredin: Commander of the Red Riders', 'eredin_commander_of_red_riders'),
  leader('monsters', 'mo_leader_bringer_death', 'Eredin: Bringer of Death', 'eredin_bringer_of_death'),
  leader('monsters', 'mo_leader_destroyer', 'Eredin: Destroyer of Worlds', 'eredin_destroyer_of_worlds'),
  leader('monsters', 'mo_leader_king_wild_hunt', 'Eredin Bréacc Glas: King of the Wild Hunt', 'eredin_king_of_the_wild_hunt'),
  leader('monsters', 'mo_leader_treacherous', 'Eredin: The Treacherous', 'eredin_treacherous'),
  // ─ Skellige ─
  leader('skellige', 'sk_leader_crach', 'Crach an Craite', 'crach_an_craite'),
  leader('skellige', 'sk_leader_bran', 'King Bran', 'bran_tuirseach'),
];
