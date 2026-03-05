// ─── Game Constants ──────────────────────────────────────────────────────────
// All magic numbers and configuration values in one place.
// Easy to tweak gameplay balance here.

export const LEVEL_ROUNDS: Record<1 | 2 | 3, number> = {
  1: 20,
  2: 35,
  3: 50,
} as const;

export const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Principiante",
  2: "Experto",
  3: "Maestro",
} as const;

export const GAME_CONSTANTS = {
  /** Starting number of servers (lives) per player */
  SERVERS_PER_PLAYER: 5,

  /** Cards dealt to each player at game start */
  STARTING_HAND_SIZE: 4,

  /** Maximum hand size before forced discard */
  MAX_HAND_SIZE: 7,

  /** Cards playable per turn (Phase 2) */
  CARDS_PER_TURN: 2,

  /** Default cards drawn per turn */
  DEFAULT_DRAW: 1,

  /** Zorro Chilla draws 2 per turn */
  ZORRO_DRAW: 2,

  /** How many turns Ransomware blocks the player */
  RANSOMWARE_BLOCK_TURNS: 2,

  /** How many rounds Modo Incógnito lasts */
  INCOGNITO_TURNS: 1,

  /** How many cards attacker must discard vs Contraseña 20 Caracteres */
  PASSWORD_DISCARD_COST: 3,

  /** Max log entries to keep in memory */
  MAX_LOG_ENTRIES: 50,

  /** Animation duration in ms */
  ANIM_DURATION: 400,
} as const;

export const PLAYER_NAMES = [
  "Jugador 1",
  "Jugador 2",
  "Jugador 3",
  "Jugador 4",
] as const;

export const CARD_BACK_IMAGE =
  "/assets/generated/card-d03-firewall.dim_400x560.png";
