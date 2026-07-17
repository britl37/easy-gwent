import { byId, type LeaderAbilityId, type Row } from '@gwent/data';
import type { GameState, PlayerId } from './../state.ts';
import { otherPlayer } from './../state.ts';
import { pick, type Rng } from './../rng.ts';
import { scorchRowIfStrong } from './scorch.ts';

function setWeather(s: GameState, kind: 'frost' | 'fog' | 'rain'): void {
  s.weather[kind] = true;
}

function hornRow(s: GameState, player: PlayerId, row: Row): void {
  s.players[player].rows[row].hornActive = true;
}

/** Play a weather card of the given kind from your deck if present (consumed to graveyard). */
function weatherFromDeck(s: GameState, player: PlayerId, kinds: Array<'frost' | 'fog' | 'rain' | 'storm' | 'clear'>): void {
  const p = s.players[player];
  for (const kind of kinds) {
    const idx = p.deck.findIndex((id) => byId(id).special === kind);
    if (idx >= 0) {
      const [id] = p.deck.splice(idx, 1);
      const def = byId(id!);
      if (def.special === 'storm') {
        s.weather.fog = true;
        s.weather.rain = true;
      } else if (def.special === 'clear') {
        s.weather = { frost: false, fog: false, rain: false };
      } else if (def.special) {
        s.weather[def.special as 'frost' | 'fog' | 'rain'] = true;
      }
      p.graveyard.push(id!);
      return;
    }
  }
}

/**
 * Active leader abilities. Passive ones (white flame, daisy, treacherous, bran)
 * are handled where they matter and never reach here.
 */
export function applyLeader(s: GameState, rng: Rng, player: PlayerId, ability: LeaderAbilityId): void {
  const opp = otherPlayer(player);
  switch (ability) {
    // ─ Northern Realms ─
    case 'foltest_steel_forged':
    case 'foltest_lord_commander':
      s.weather = { frost: false, fog: false, rain: false };
      break;
    case 'foltest_siegemaster':
      setWeather(s, 'fog');
      break;
    case 'foltest_kingdom_of_temeria':
      hornRow(s, player, 'siege');
      break;
    case 'foltest_son_of_medell':
      scorchRowIfStrong(s, opp, 'ranged', 10);
      break;
    // ─ Nilfgaard ─
    case 'emhyr_imperial_majesty':
      setWeather(s, 'rain');
      break;
    case 'emhyr_emperor_of_nilfgaard': {
      // Look at 3 random cards from opponent's hand — info-only; log it
      const hand = s.players[opp].hand;
      const n = Math.min(3, hand.length);
      const seen: string[] = [];
      const idxs = new Set<number>();
      while (idxs.size < n) idxs.add(Math.floor((rng.state = (rng.state + 0x9e3779b9) >>> 0) / 4294967296 * hand.length) % hand.length);
      for (const i of idxs) seen.push(byId(hand[i]!).name);
      s.log.push({ turn: s.turnCount, text: `Player ${player + 1} peeks at: ${seen.join(', ')}` });
      break;
    }
    case 'emhyr_his_imperial_majesty':
    case 'emhyr_invader_of_the_north': {
      // Draw a card from the opponent's discard pile (random non-hero unit)
      const g = s.players[opp].graveyard.filter((id) => byId(id).type === 'unit' && !byId(id).hero);
      if (g.length) {
        const id = pick(rng, g);
        s.players[opp].graveyard.splice(s.players[opp].graveyard.indexOf(id), 1);
        s.players[player].hand.push(id);
      }
      break;
    }
    // ─ Scoia'tael ─
    case 'francesca_pureblood_elf':
      setWeather(s, 'frost');
      break;
    case 'francesca_queen_of_dol_blathanna':
      scorchRowIfStrong(s, opp, 'melee', 10);
      break;
    case 'francesca_beautiful':
      hornRow(s, player, 'ranged');
      break;
    case 'francesca_hope_of_the_aen_seidhe':
      hornRow(s, player, 'melee');
      break;
    // ─ Monsters ─
    case 'eredin_commander_of_red_riders':
    case 'eredin_king_of_the_wild_hunt':
      weatherFromDeck(s, player, ['frost', 'fog', 'rain', 'storm']);
      break;
    case 'eredin_bringer_of_death': {
      // Restore a random non-hero unit from your discard pile to your hand
      const g = s.players[player].graveyard.filter((id) => byId(id).type === 'unit' && !byId(id).hero);
      if (g.length) {
        const id = pick(rng, g);
        s.players[player].graveyard.splice(s.players[player].graveyard.indexOf(id), 1);
        s.players[player].hand.push(id);
      }
      break;
    }
    case 'eredin_destroyer_of_worlds': {
      // Discard 2 random cards, draw 1 from deck
      const p = s.players[player];
      for (let i = 0; i < 2 && p.hand.length; i++) {
        const id = pick(rng, p.hand);
        p.hand.splice(p.hand.indexOf(id), 1);
        p.graveyard.push(id);
      }
      if (p.deck.length) p.hand.push(p.deck.pop()!);
      break;
    }
    // ─ Skellige ─
    case 'crach_an_craite': {
      // Shuffle all graveyard cards back into their owners' decks
      for (const pid of [0, 1] as PlayerId[]) {
        const pl = s.players[pid];
        pl.deck.push(...pl.graveyard.filter((id) => byId(id).type === 'unit'));
        pl.graveyard = pl.graveyard.filter((id) => byId(id).type !== 'unit');
        // deterministic shuffle
        for (let i = pl.deck.length - 1; i > 0; i--) {
          rng.state = (rng.state + 0x6d2b79f5) >>> 0;
          const j = rng.state % (i + 1);
          const t = pl.deck[i]!;
          pl.deck[i] = pl.deck[j]!;
          pl.deck[j] = t;
        }
      }
      break;
    }
    default:
      throw new Error(`Leader ability not implemented or passive: ${ability}`);
  }
}
