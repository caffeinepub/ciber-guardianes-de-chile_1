// ─── Game Types ─────────────────────────────────────────────────────────────
// All TypeScript interfaces and types for the game

export type CardType = "villain" | "defense" | "action";
export type GamePhase = "draw" | "play" | "end";
export type GameScreen = "start" | "heroSelect" | "game" | "gameOver";
export type HeroId = "pudu" | "zorro" | "lechuza" | "gato";
export type LogEventType =
  | "attack"
  | "defense"
  | "action"
  | "heal"
  | "system"
  | "eliminate";

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  power?: number; // villains only
  description: string;
  didacticText?: string;
  image: string;
  /** Machine-readable effect tag — used by gameEngine */
  effectTag?: string;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  role: string;
  passiveDescription: string;
  ultimateDescription: string;
  image: string;
  color: string; // css color class suffix
}

export interface ServerToken {
  index: number;
  status: "healthy" | "damaged" | "lost";
  animating: boolean;
}

export interface PlayerState {
  id: number;
  name: string;
  heroId: HeroId;
  servers: ServerToken[];
  hand: CardDefinition[];
  isOnline: boolean;
  isCurrentTurn: boolean;
  /** Whether this player used their Pudú first-attack shield this round */
  puduShieldUsed: boolean;
  /** Turns remaining that player is blocked (Ransomware) */
  blockedTurns: number;
  /** Turns remaining immune (Modo Incógnito) */
  immuneTurns: number;
  /** Whether Firewall de Agua is active this turn */
  firewallAguaActive: boolean;
  /** Whether Monitoreo de Privacidad is active (halve next attack) */
  monitoreoActive: boolean;
  /** Whether player revealed their hand (Amigo de Confianza) */
  handRevealed: boolean;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  type: LogEventType;
  message: string;
}

export interface AttackContext {
  attackingPlayerId: number;
  targetPlayerId: number;
  card: CardDefinition;
  /** Whether defender has responded */
  resolved: boolean;
  /** Whether Regla del Saber bonus was confirmed */
  saberBonus: boolean;
}

export interface GameState {
  screen: GameScreen;
  playerCount: number;
  players: PlayerState[];
  deck: CardDefinition[];
  discard: CardDefinition[];
  currentPlayerIndex: number;
  currentPhase: GamePhase;
  turn: number;
  round: number;
  log: GameLogEntry[];
  /** Active attack waiting for defense response */
  pendingAttack: AttackContext | null;
  /** Card index in current player's hand that is selected */
  selectedCardIndex: number | null;
  /** Which player to target with the selected card */
  selectedTargetId: number | null;
  /** Show Regla del Saber popup for this card */
  saberCard: CardDefinition | null;
  /** Hero select state */
  heroSelectStep: number; // which player is selecting
  heroSelections: (HeroId | null)[];
  /** Game over winner */
  winnerId: number | null;
  /** Visual animation states */
  animatingZoneId: number | null;

  // ── New fields ────────────────────────────────────────────────────────────
  /** Game difficulty level (1=20 rounds, 2=35 rounds, 3=50 rounds) */
  gameLevel: 1 | 2 | 3;
  /** Maximum rounds before the game ends */
  maxRounds: number;
  /** Player who surrendered (null if none) */
  surrenderedPlayerId: number | null;
  /** Hero action event for animation (auto-clears) */
  heroActionEvent: { playerId: number; message: string; color: string } | null;
  /** Player IDs who used their ultimate ability this game */
  heroUltimateUsed: number[];
  /** Whether the turn transition overlay is active */
  turnTransitionActive: boolean;
  /** Next player's name shown during turn transition */
  turnTransitionNextPlayer: string | null;
}
