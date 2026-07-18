/**
 * Remembers the room id of an in-progress multiplayer game so the player can
 * resume after a page reload (or from another device on the same account).
 * The server keys rejoin by account, so the room id is all we need.
 */
const KEY = 'gwent.activeRoom';

export function saveActiveRoom(roomId: string): void {
  try {
    localStorage.setItem(KEY, roomId);
  } catch {
    /* storage unavailable — resume simply won't be offered */
  }
}

export function getActiveRoom(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearActiveRoom(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
