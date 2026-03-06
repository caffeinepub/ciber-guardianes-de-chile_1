// ─── GameScreen ───────────────────────────────────────────────────────────────
// Main game view. All game state managed via useReducer + gameEngine pure fns.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronRight, Cpu, Flag, List, RotateCcw } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import CardDetailOverlay from "../components/game/CardDetailOverlay";
import CombatLog from "../components/game/CombatLog";
import DefenseTimerOverlay from "../components/game/DefenseTimerOverlay";
import DictionaryModal from "../components/game/DictionaryModal";
import PlayerZone from "../components/game/PlayerZone";
import UltimateOverlay from "../components/game/UltimateOverlay";
import { getHeroById } from "../data/heroes";
import { GAME_CONSTANTS } from "../game/gameConstants";
import {
  activateHeroUltimate,
  createInitialState,
  executeDrawPhase,
  executeEndPhase,
  getCurrentPlayer,
  resolveAction,
  resolveAttack,
  surrenderPlayer,
} from "../game/gameEngine";
import {
  decodePlayerName,
  makeRng,
  roomCodeToSeed,
} from "../game/gameStateSerializer";
import type { CardDefinition, GameState, HeroId } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";
import { useGameSync } from "../hooks/useGameSync";

// ── Types ────────────────────────────────────────────────────────────────────

type Action =
  | { type: "DRAW_PHASE" }
  | { type: "SELECT_CARD"; index: number }
  | { type: "SELECT_TARGET"; targetId: number }
  | { type: "DEFEND"; card: CardDefinition }
  | { type: "SKIP_DEFENSE" }
  | { type: "SABER_CONFIRM" }
  | { type: "SABER_SKIP" }
  | { type: "END_TURN" }
  | { type: "CLEAR_SELECTION" }
  | { type: "SURRENDER"; playerId: number }
  | { type: "HERO_ULTIMATE"; playerId: number };

interface GameScreenProps {
  playerCount: number;
  heroSelections: HeroId[];
  onGameOver: (state: GameState) => void;
  gameLevel?: 1 | 2 | 3;
  isAIMode?: boolean;
  /** null = shared screen mode; number = this device's player index in multiplayer */
  localPlayerIndex?: number | null;
  /** Room code for cross-device multiplayer sync */
  roomCode?: string | null;
  /** This player's ID for multiplayer sync */
  myPlayerId?: string | null;
  /** This player's display name for multiplayer sync */
  myDisplayName?: string;
  /** This player's hero ID for multiplayer sync */
  myHeroId?: string;
  /** Whether cross-device sync is active */
  isMultiplayerSync?: boolean;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "DRAW_PHASE": {
      if (state.currentPhase !== "draw") return state;
      const nextState = executeDrawPhase(state);
      if (nextState.screen === "gameOver") return nextState;
      return nextState;
    }

    case "SELECT_CARD": {
      if (state.currentPhase !== "play") return state;
      const currentPlayer = getCurrentPlayer(state);
      if (currentPlayer.blockedTurns > 0) return state;
      if (state.selectedCardIndex === action.index) {
        return { ...state, selectedCardIndex: null, selectedTargetId: null };
      }
      return {
        ...state,
        selectedCardIndex: action.index,
        selectedTargetId: null,
      };
    }

    case "SELECT_TARGET": {
      if (state.selectedCardIndex === null) return state;
      const currentPlayer = getCurrentPlayer(state);
      const card = currentPlayer.hand[state.selectedCardIndex];
      if (!card) return state;

      if (card.type === "villain") {
        return {
          ...state,
          selectedTargetId: action.targetId,
          saberCard: card,
        };
      }

      if (card.type === "action") {
        return {
          ...state,
          selectedTargetId: action.targetId,
          saberCard: card,
        };
      }

      return state;
    }

    case "SABER_CONFIRM": {
      if (!state.saberCard) return state;
      return resolveCardPlay(state, true);
    }

    case "SABER_SKIP": {
      if (!state.saberCard) return state;
      return resolveCardPlay(state, false);
    }

    case "DEFEND": {
      if (!state.pendingAttack) return state;
      const nextState = resolveAttack(state, state.pendingAttack, action.card);
      if (nextState.screen === "gameOver") return nextState;
      return nextState;
    }

    case "SKIP_DEFENSE": {
      if (!state.pendingAttack) return state;
      const nextState = resolveAttack(state, state.pendingAttack, null);
      if (nextState.screen === "gameOver") return nextState;
      return nextState;
    }

    case "END_TURN": {
      if (state.currentPhase !== "play" && state.currentPhase !== "end")
        return state;
      const nextState = executeEndPhase(state);
      if (nextState.screen === "gameOver") return nextState;
      return nextState;
    }

    case "CLEAR_SELECTION": {
      return {
        ...state,
        selectedCardIndex: null,
        selectedTargetId: null,
        saberCard: null,
      };
    }

    case "SURRENDER": {
      const nextState = surrenderPlayer(state, action.playerId);
      if (nextState.screen === "gameOver") return nextState;
      return nextState;
    }

    case "HERO_ULTIMATE": {
      const nextState = activateHeroUltimate(state, action.playerId);
      return nextState;
    }

    default:
      return state;
  }
}

function resolveCardPlay(state: GameState, saberBonus: boolean): GameState {
  if (!state.saberCard || state.selectedCardIndex === null) return state;
  const currentPlayer = getCurrentPlayer(state);
  const card = state.saberCard;

  const newHand = currentPlayer.hand.filter((c) => c.id !== card.id);
  let newState: GameState = {
    ...state,
    saberCard: null,
    players: state.players.map((p) =>
      p.id === currentPlayer.id ? { ...p, hand: newHand } : p,
    ),
  };

  if (card.type === "villain" && state.selectedTargetId !== null) {
    const attackCtx = {
      attackingPlayerId: currentPlayer.id,
      targetPlayerId: state.selectedTargetId,
      card,
      resolved: false,
      saberBonus,
    };
    const target = state.players.find((p) => p.id === state.selectedTargetId);
    if (target?.immuneTurns && target.immuneTurns > 0) {
      return resolveAttack(newState, attackCtx, null);
    }
    return { ...newState, pendingAttack: attackCtx, selectedCardIndex: null };
  }

  if (card.type === "action") {
    return resolveAction(
      { ...newState, selectedCardIndex: null, selectedTargetId: null },
      currentPlayer.id,
      card,
      state.selectedTargetId ?? undefined,
    );
  }

  return { ...newState, selectedCardIndex: null, selectedTargetId: null };
}

// ── Turn Transition Overlay ───────────────────────────────────────────────────

interface TurnTransitionProps {
  nextPlayerName: string;
  nextPlayerHeroImage: string;
  nextPlayerHeroName: string;
  heroColor: string;
  onDone: () => void;
  isAI?: boolean;
  isMultiplayerSync?: boolean;
  /** In per-device mode: true = this device's player is up next */
  isLocalPlayerNext?: boolean;
  /** In per-device mode: true = this device is waiting for another player */
  isWaitingForOtherPlayer?: boolean;
  /** Called when local player taps "Empezar mi turno" — triggers DRAW_PHASE via syncDispatch */
  onStartTurn?: () => void;
}

function TurnTransitionOverlay({
  nextPlayerName,
  nextPlayerHeroImage,
  nextPlayerHeroName,
  heroColor,
  onDone,
  isAI = false,
  isMultiplayerSync = false,
  isLocalPlayerNext,
  isWaitingForOtherPlayer = false,
  onStartTurn,
}: TurnTransitionProps) {
  // In per-device mode when it's the OTHER player's turn: auto-dismiss fast (1.5s)
  // When it's MY turn (or AI): auto-dismiss slower, waiting for tap
  const autoDelay = isWaitingForOtherPlayer ? 1500 : isAI ? 1000 : 0;
  const [countdown, setCountdown] = useState(
    isAI ? 1 : isWaitingForOtherPlayer ? 0 : 3,
  );

  // Auto-dismiss when waiting for another device
  useEffect(() => {
    if (!isWaitingForOtherPlayer) return;
    const t = setTimeout(onDone, autoDelay);
    return () => clearTimeout(t);
  }, [isWaitingForOtherPlayer, autoDelay, onDone]);

  useEffect(() => {
    if (isWaitingForOtherPlayer) return; // handled by auto-dismiss above
    if (countdown <= 0) {
      onDone();
      // If it's local player's turn, also trigger draw phase via syncDispatch
      if (isLocalPlayerNext && onStartTurn) {
        onStartTurn();
      }
      return;
    }
    const delay = isAI ? 400 : 800;
    const t = setTimeout(() => setCountdown((c) => c - 1), delay);
    return () => clearTimeout(t);
  }, [
    countdown,
    onDone,
    isAI,
    isWaitingForOtherPlayer,
    isLocalPlayerNext,
    onStartTurn,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "oklch(0.05 0.03 240 / 0.97)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Battle background at 25% */}
      <img
        src="/assets/generated/battle-arena-bg.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.25 }}
        aria-hidden="true"
      />

      {/* Digital sweep effect */}
      <div
        className="absolute inset-y-0 w-24 pointer-events-none sweep-digital"
        style={{
          background: `linear-gradient(90deg, transparent, ${heroColor}, transparent)`,
          opacity: 0.5,
          left: 0,
        }}
      />
      {/* Second sweep delayed */}
      <div
        className="absolute inset-y-0 w-16 pointer-events-none sweep-digital"
        style={{
          background: `linear-gradient(90deg, transparent, ${heroColor}, transparent)`,
          opacity: 0.3,
          left: 0,
          animationDelay: "0.2s",
        }}
      />

      {/* Particle ring */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360;
          const tx = Math.cos((angle * Math.PI) / 180) * 150;
          const ty = Math.sin((angle * Math.PI) / 180) * 150;
          return (
            <div
              key={`pt-${angle}`}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={
                {
                  left: "50%",
                  top: "50%",
                  background: heroColor,
                  "--tx": `${tx}px`,
                  "--ty": `${ty}px`,
                  animation: `particles-burst 1.2s ease-out ${i * 0.05}s infinite`,
                  boxShadow: `0 0 6px ${heroColor}`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-4 text-center px-4 md:px-6">
        {/* TURNO DE label */}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground turn-slide-in"
          style={{ animationDelay: "0.05s" }}
        >
          TURNO DE
        </p>

        {/* Hero avatar */}
        <div
          className="w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden turn-slide-in"
          style={{
            border: `3px solid ${heroColor}`,
            boxShadow: `0 0 30px ${heroColor} / 0.6, 0 0 60px ${heroColor} / 0.3`,
            animationDelay: "0.1s",
          }}
        >
          <img
            src={nextPlayerHeroImage}
            alt={nextPlayerHeroName}
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Player name with glitch */}
        <div className="turn-slide-in" style={{ animationDelay: "0.18s" }}>
          <h2
            className="text-2xl md:text-5xl font-black font-display glitch-text"
            style={{
              letterSpacing: "-0.02em",
              color: heroColor,
              textShadow: `0 0 20px ${heroColor}, 0 0 40px ${heroColor} / 0.5`,
            }}
          >
            {nextPlayerName}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {nextPlayerHeroName}
          </p>
        </div>

        {/* PASA EL DISPOSITIVO / AI / per-device label */}
        <div className="turn-slide-in" style={{ animationDelay: "0.25s" }}>
          <div
            className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-[0.25em]"
            style={{
              background: `${heroColor.replace("oklch(", "oklch(").replace(")", " / 0.1)")}`,
              border: `1px solid ${heroColor.replace("oklch(", "oklch(").replace(")", " / 0.4)")}`,
              color: heroColor,
              boxShadow: `0 0 15px ${heroColor.replace("oklch(", "oklch(").replace(")", " / 0.2)")}`,
            }}
          >
            {isAI
              ? "🤖 TURNO DE LA IA"
              : isMultiplayerSync
                ? isLocalPlayerNext
                  ? "⚡ ¡ES TU TURNO! — Toca para empezar"
                  : isWaitingForOtherPlayer
                    ? `⏳ Turno de ${nextPlayerName}...`
                    : `⏳ Esperando a ${nextPlayerName}...`
                : "📲 PASA EL DISPOSITIVO"}
          </div>
        </div>

        {/* Countdown — only shown when tapping is needed (not when waiting for other) */}
        {!isWaitingForOtherPlayer && (
          <div
            className="flex items-center gap-3 mt-1 turn-slide-in"
            style={{ animationDelay: "0.3s" }}
          >
            {[3, 2, 1].map((n) => (
              <div
                key={n}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300"
                style={{
                  borderColor:
                    countdown <= n ? heroColor : "oklch(0.25 0.03 240)",
                  color: countdown <= n ? heroColor : "oklch(0.35 0.03 240)",
                  boxShadow:
                    countdown <= n ? `0 0 12px ${heroColor} / 0.5` : "none",
                  background:
                    countdown <= n
                      ? `${heroColor.replace("oklch(", "oklch(").replace(")", " / 0.1)")}`
                      : "transparent",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        )}

        {/* Show tap-to-continue only when it's this device's turn or shared/AI mode */}
        {!isWaitingForOtherPlayer && (
          <Button
            onClick={() => {
              onDone();
              // When local player taps "Empezar mi turno", also dispatch DRAW_PHASE
              if (isLocalPlayerNext && onStartTurn) {
                onStartTurn();
              }
            }}
            size="sm"
            className="mt-2 font-bold animate-pulse"
            style={{
              background: heroColor,
              color: "oklch(0.08 0.02 240)",
            }}
            data-ocid="game.turn_transition_continue_button"
          >
            {isLocalPlayerNext
              ? "⚡ ¡Empezar mi turno!"
              : "Toca para continuar"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── AI Turn Helper ────────────────────────────────────────────────────────────
// Picks a card for the AI to play. Returns the card index and type, or null.
function pickAICard(
  gs: GameState,
): { index: number; type: "villain" | "action" } | null {
  const aiPlayer = gs.players[1];
  if (!aiPlayer || !aiPlayer.isOnline) return null;
  if (gs.currentPhase !== "play") return null;
  if (aiPlayer.blockedTurns > 0) return null;

  const hand = aiPlayer.hand;
  if (hand.length === 0) return null;

  const humanPlayer = gs.players[0];
  if (!humanPlayer || !humanPlayer.isOnline) return null;

  // Priority: villain > action > skip
  const villainIdx = hand.findIndex((c) => c.type === "villain");
  if (villainIdx !== -1) return { index: villainIdx, type: "villain" };

  const actionIdx = hand.findIndex((c) => c.type === "action");
  if (actionIdx !== -1) return { index: actionIdx, type: "action" };

  return null;
}

// ── Hero colors map ──────────────────────────────────────────────────────────
const HERO_COLORS: Record<string, string> = {
  pudu: "oklch(0.75 0.25 145)",
  zorro: "oklch(0.88 0.22 85)",
  lechuza: "oklch(0.75 0.22 230)",
  gato: "oklch(0.72 0.25 290)",
};

const HERO_ULTIMATE_EFFECTS: Record<string, string> = {
  pudu: "Protección total activada — inmune a todos los ataques por 2 rondas. ¡Ningún villano puede penetrar tu Cifrado!",
  zorro:
    "¡Denuncia masiva! El oponente con más villanos debe descartar todos sus ataques. La justicia digital triunfa.",
  lechuza:
    "Restauración de emergencia — se recuperan 2 Servidores perdidos. El Backup Nocturno salva tu identidad.",
  gato: "¡Reinicio total! Tu mano actual se descarta y recibes 5 cartas nuevas. Sistema restaurado a estado óptimo.",
};

// ── Log type → color helper ──────────────────────────────────────────────────
const LOG_TYPE_BORDER: Record<string, string> = {
  attack: "border-red-500/60",
  defense: "border-blue-500/60",
  action: "border-yellow-500/60",
  heal: "border-green-500/60",
  system: "border-border",
  eliminate: "border-orange-500/60",
};

const LOG_TYPE_ICON: Record<string, string> = {
  attack: "⚔️",
  defense: "🛡️",
  action: "⚡",
  heal: "💚",
  system: "🔧",
  eliminate: "💀",
};

// ── ActionToast — shows last log entry as a transient popup on mobile ────────
interface ActionToastProps {
  entry: { id: string; type: string; message: string } | null;
}

function ActionToast({ entry }: ActionToastProps) {
  const [visible, setVisible] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(entry);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only trigger on new log id, not every reference update
  useEffect(() => {
    if (!entry) return;
    setCurrentEntry(entry);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entry?.id]);

  if (!currentEntry) return null;

  return (
    <div
      className={`
        md:hidden fixed bottom-24 left-4 right-4 z-40 pointer-events-none
        transition-all duration-500 ease-in-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <div
        className={`
          flex items-start gap-2 px-3 py-2.5 rounded-xl border
          bg-card/90 backdrop-blur-md shadow-lg
          ${LOG_TYPE_BORDER[currentEntry.type] ?? "border-border"}
        `}
        style={{ boxShadow: "0 0 20px oklch(0.1 0.05 240 / 0.8)" }}
      >
        <span className="text-base flex-shrink-0 mt-0.5">
          {LOG_TYPE_ICON[currentEntry.type] ?? "•"}
        </span>
        <p className="text-[11px] leading-tight text-foreground line-clamp-2">
          {currentEntry.message}
        </p>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GameScreen({
  playerCount,
  heroSelections,
  onGameOver,
  gameLevel = 1,
  isAIMode = false,
  localPlayerIndex = null,
  roomCode = null,
  myPlayerId = null,
  myDisplayName = "Jugador",
  myHeroId = "",
  isMultiplayerSync = false,
}: GameScreenProps) {
  const { actor } = useActor();

  const [state, dispatch] = useReducer(gameReducer, null, () => {
    // In multiplayer sync mode, use a seeded deck so all devices get identical initial state
    let initialState: GameState;
    if (isMultiplayerSync && roomCode) {
      const seed = roomCodeToSeed(roomCode);
      const rng = makeRng(seed);
      const origRandom = Math.random;
      Math.random = rng;
      try {
        initialState = createInitialState(
          playerCount,
          heroSelections,
          gameLevel,
        );
      } finally {
        Math.random = origRandom;
      }
    } else {
      initialState = createInitialState(playerCount, heroSelections, gameLevel);
    }

    if (isAIMode && initialState.players.length > 1) {
      // Rename player 2 to "IA - HeroName"
      const aiHero = getHeroById(initialState.players[1].heroId);
      const aiName = aiHero
        ? `IA - ${aiHero.name.replace(/"[^"]*"/g, "").trim()}`
        : "IA";
      return {
        ...initialState,
        players: initialState.players.map((p, i) =>
          i === 1 ? { ...p, name: aiName } : p,
        ),
      };
    }

    // In multiplayer mode, set player names from displayName
    if (isMultiplayerSync && localPlayerIndex !== null) {
      return {
        ...initialState,
        players: initialState.players.map((p, i) =>
          i === localPlayerIndex ? { ...p, name: myDisplayName } : p,
        ),
      };
    }

    return initialState;
  });

  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    name: string;
    heroImage: string;
    heroName: string;
    heroId: string;
    isLocalPlayerTurn: boolean;
    isWaitingForOther: boolean;
  } | null>(null);

  // ── Player display names (synced from canister room in multiplayer) ─────────
  // Maps playerIndex → display name so opponent names are shown correctly
  const [playerDisplayNames, setPlayerDisplayNames] = useState<
    Record<number, string>
  >({});

  // Track hit/defend animations per player
  const [hitPlayerId, setHitPlayerId] = useState<number | null>(null);
  const [defendingPlayerId, setDefendingPlayerId] = useState<number | null>(
    null,
  );

  // Ultimate overlay
  const [showUltimateOverlay, setShowUltimateOverlay] = useState(false);
  const [ultimateData, setUltimateData] = useState<{
    heroId: string;
    playerName: string;
    playerId: number;
  } | null>(null);

  // Card detail overlay (from top bar deck/discard)
  const [detailCard, setDetailCard] = useState<CardDefinition | null>(null);

  // Mobile log sheet
  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false);

  // ── Multiplayer sync ──────────────────────────────────────────────────────
  const safeLocalIndexForSync: number =
    localPlayerIndex !== null && localPlayerIndex !== undefined
      ? (localPlayerIndex as number)
      : 0;

  const { remoteAction, isSyncing, publishAction, consumeRemoteAction } =
    useGameSync({
      roomCode: isMultiplayerSync ? roomCode : null,
      myPlayerId: myPlayerId ?? "",
      myDisplayName,
      myHeroId,
      playerIndex: safeLocalIndexForSync,
      actor,
      enabled: isMultiplayerSync,
    });

  // Consume remote actions and dispatch them locally
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to new remote actions
  useEffect(() => {
    if (!isMultiplayerSync || !remoteAction) return;
    const action = remoteAction.action as Action;
    if (action?.type) {
      dispatch(action);
    }
    consumeRemoteAction();
  }, [remoteAction, isMultiplayerSync]);

  // Track prev player index to detect turn change
  const prevPlayerIndexRef = useRef(state.currentPlayerIndex);
  const isFirstRender = useRef(true);
  const prevHeroUltimateUsed = useRef(state.heroUltimateUsed);
  const prevServerCounts = useRef(
    state.players.map(
      (p) => p.servers.filter((s) => s.status === "healthy").length,
    ),
  );
  const prevLastLogId = useRef(state.log[0]?.id ?? "");

  const currentPlayer = getCurrentPlayer(state);
  const currentHero = getHeroById(currentPlayer.heroId);

  // ── Per-device multiplayer: derive local player and turn state ─────────────
  // When localPlayerIndex is set, this device always shows their own player zone
  // and can only act when it's their turn.
  const isPerDevice =
    localPlayerIndex !== null && localPlayerIndex !== undefined;
  const safeLocalIndex: number = isPerDevice ? (localPlayerIndex as number) : 0;
  const localPlayer = isPerDevice
    ? (state.players[safeLocalIndex] ?? currentPlayer)
    : currentPlayer;
  const localHero = getHeroById(localPlayer.heroId);

  // Is it my turn? (for per-device mode)
  const isMyTurn = isPerDevice
    ? state.currentPlayerIndex === safeLocalIndex
    : true;

  // Am I the target of a pending attack? (for per-device mode)
  // Check both player.id and player index as fallback for robustness
  const isMyDefenseTurn = isPerDevice
    ? state.pendingAttack?.targetPlayerId === localPlayer.id ||
      state.pendingAttack?.targetPlayerId === safeLocalIndex
    : true;

  // ── Dismiss turn-transition overlay immediately if a pending attack arrives ──
  // When remote opponent's attack action is received, the defender's device
  // might still be showing the transition overlay — clear it so defense can show.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only trigger on pendingAttack changes
  useEffect(() => {
    if (state.pendingAttack && isMyDefenseTurn && showTurnTransition) {
      setShowTurnTransition(false);
      setTransitionData(null);
    }
  }, [state.pendingAttack, isMyDefenseTurn]);

  // Detect server damage → hero-hit animation
  useEffect(() => {
    const newCounts = state.players.map(
      (p) => p.servers.filter((s) => s.status === "healthy").length,
    );
    for (let i = 0; i < state.players.length; i++) {
      if (newCounts[i] < (prevServerCounts.current[i] ?? 5)) {
        setHitPlayerId(state.players[i].id);
        setTimeout(() => setHitPlayerId(null), 800);
      }
    }
    prevServerCounts.current = newCounts;
  }, [state.players]);

  // Detect defense events from log
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — react on log/pendingAttack only
  useEffect(() => {
    const latestLog = state.log[0];
    if (!latestLog || latestLog.id === prevLastLogId.current) return;
    prevLastLogId.current = latestLog.id;
    if (latestLog.type === "defense" && latestLog.message.includes("bloqueó")) {
      if (state.pendingAttack === null) {
        const currentP = state.players[state.currentPlayerIndex];
        setDefendingPlayerId(currentP.id);
        setTimeout(() => setDefendingPlayerId(null), 800);
      }
    }
  }, [state.log, state.pendingAttack]);

  // Detect turn change → show transition overlay
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPlayerIndexRef.current = state.currentPlayerIndex;
      return;
    }
    if (
      state.currentPlayerIndex !== prevPlayerIndexRef.current &&
      state.screen === "game"
    ) {
      const nextPlayer = state.players[state.currentPlayerIndex];
      const nextHero = getHeroById(nextPlayer.heroId);
      // Use synced display name from canister if available (multiplayer), else fallback to state name
      const resolvedName =
        playerDisplayNames[state.currentPlayerIndex] ?? nextPlayer.name;
      // In per-device mode: determine if the next turn belongs to THIS device or another
      const isLocalPlayerTurn = isPerDevice
        ? state.currentPlayerIndex === safeLocalIndex
        : false;
      // In per-device multiplayer: if it's NOT this device's turn, auto-dismiss the overlay
      const isWaitingForOther = isPerDevice && !isLocalPlayerTurn;
      setTransitionData({
        name: resolvedName,
        heroImage: nextHero?.image ?? "",
        heroName: nextHero?.name ?? "",
        heroId: nextPlayer.heroId,
        isLocalPlayerTurn,
        isWaitingForOther,
      });
      setShowTurnTransition(true);
      prevPlayerIndexRef.current = state.currentPlayerIndex;
    }
  }, [
    state.currentPlayerIndex,
    state.screen,
    state.players,
    playerDisplayNames,
    isPerDevice,
    safeLocalIndex,
  ]);

  // Forward game over
  React.useEffect(() => {
    if (state.screen === "gameOver") {
      onGameOver(state);
    }
  }, [state, onGameOver]);

  // Detect hero ultimate used → show ultimate overlay
  useEffect(() => {
    const prev = prevHeroUltimateUsed.current;
    const curr = state.heroUltimateUsed;
    const newlyUsed = curr.filter((id) => !prev.includes(id));
    if (newlyUsed.length > 0) {
      const playerId = newlyUsed[0];
      const player = state.players.find((p) => p.id === playerId);
      if (player) {
        setUltimateData({
          heroId: player.heroId,
          playerName: player.name,
          playerId,
        });
        setShowUltimateOverlay(true);
      }
    }
    prevHeroUltimateUsed.current = curr;
  }, [state.heroUltimateUsed, state.players]);

  // Clear hero action event after 2s
  useEffect(() => {
    if (state.heroActionEvent) {
      const t = setTimeout(() => {
        dispatch({ type: "CLEAR_SELECTION" });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [state.heroActionEvent]);

  // ── Sync opponent player names from canister room ────────────────────────
  // Polls every 2s in multiplayer mode to pick up opponent display names
  useEffect(() => {
    if (!isMultiplayerSync || !actor || !roomCode) return;
    let cancelled = false;

    const poll = async () => {
      try {
        // biome-ignore lint/suspicious/noExplicitAny: actor type is dynamic
        const room = await (actor as any).getRoomState(roomCode);
        if (!room || cancelled) return;
        const names: Record<number, string> = {};
        for (let i = 0; i < room.players.length; i++) {
          const rp = room.players[i];
          const { name } = decodePlayerName(rp.name as string);
          if (name) names[i] = name;
        }
        if (!cancelled) setPlayerDisplayNames(names);
      } catch {
        // ignore poll errors
      }
    };

    void poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isMultiplayerSync, actor, roomCode]);

  // ── Multiplayer action dispatcher ─────────────────────────────────────────
  // Wraps dispatch to also publish to canister for cross-device sync
  const isMyTurnForDispatch =
    localPlayerIndex !== null
      ? state.currentPlayerIndex === (localPlayerIndex as number)
      : true;

  const syncDispatch = useCallback(
    (action: Action) => {
      dispatch(action);
      // Publish to canister relay if in multiplayer sync mode
      // Always relay: defense actions (defender's turn), DRAW_PHASE (active player starting turn),
      // END_TURN (active player ending turn), and any other action when it's our turn.
      if (isMultiplayerSync) {
        const isDefenseAction =
          action.type === "DEFEND" || action.type === "SKIP_DEFENSE";
        const isAlwaysRelayed =
          action.type === "DRAW_PHASE" || action.type === "END_TURN";
        if (isMyTurnForDispatch || isDefenseAction || isAlwaysRelayed) {
          // Fire-and-forget
          void publishAction(action as Record<string, unknown>);
        }
      }
    },
    [isMultiplayerSync, isMyTurnForDispatch, publishAction],
  );

  const handleSelectCard = useCallback(
    (idx: number) => {
      syncDispatch({ type: "SELECT_CARD", index: idx });
    },
    [syncDispatch],
  );

  const handleSelectTarget = useCallback(
    (targetId: number) => {
      syncDispatch({ type: "SELECT_TARGET", targetId });
    },
    [syncDispatch],
  );

  const handleDefend = useCallback(
    (card: CardDefinition) => {
      syncDispatch({ type: "DEFEND", card });
      setDefendingPlayerId(isPerDevice ? localPlayer.id : currentPlayer.id);
      setTimeout(() => setDefendingPlayerId(null), 900);
    },
    [syncDispatch, currentPlayer.id, localPlayer.id, isPerDevice],
  );

  const handleSkipDefense = useCallback(() => {
    syncDispatch({ type: "SKIP_DEFENSE" });
  }, [syncDispatch]);

  const handleSaberConfirm = useCallback(() => {
    syncDispatch({ type: "SABER_CONFIRM" });
    setCardsPlayedThisTurn((n) => n + 1);
  }, [syncDispatch]);

  const handleSaberSkip = useCallback(() => {
    syncDispatch({ type: "SABER_SKIP" });
    setCardsPlayedThisTurn((n) => n + 1);
  }, [syncDispatch]);

  const handleEndTurn = useCallback(() => {
    syncDispatch({ type: "END_TURN" });
    setCardsPlayedThisTurn(0);
  }, [syncDispatch]);

  const handleSurrender = useCallback(() => {
    const playerId = isPerDevice ? localPlayer.id : currentPlayer.id;
    syncDispatch({ type: "SURRENDER", playerId });
  }, [syncDispatch, currentPlayer.id, localPlayer.id, isPerDevice]);

  const handleHeroUltimate = useCallback(() => {
    const playerId = isPerDevice ? localPlayer.id : currentPlayer.id;
    syncDispatch({ type: "HERO_ULTIMATE", playerId });
  }, [syncDispatch, currentPlayer.id, localPlayer.id, isPerDevice]);

  const handleTurnTransitionDone = useCallback(() => {
    setShowTurnTransition(false);
    setTransitionData(null);
  }, []);

  // Called when the local player taps "Empezar mi turno!" in the turn transition overlay.
  // Dispatches DRAW_PHASE so the guest device advances the game state and publishes to relay.
  const handleTurnTransitionStartTurn = useCallback(() => {
    syncDispatch({ type: "DRAW_PHASE" });
  }, [syncDispatch]);

  // ── Multiplayer safety: if local player is in draw phase but overlay is dismissed, auto-draw ──
  // This prevents the guest's game from freezing if the turn transition was already dismissed
  // (e.g. by the defense overlay dismissing it) but DRAW_PHASE was never triggered.
  // We add a small delay so the overlay animation has time to close first.
  const drawPhaseTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isMultiplayerSync || !isPerDevice) return;
    if (state.currentPhase !== "draw") {
      drawPhaseTriggeredRef.current = false;
      return;
    }
    if (!isMyTurn) return; // Not our turn, don't trigger
    if (showTurnTransition) return; // Overlay is visible, let the user dismiss it
    if (drawPhaseTriggeredRef.current) return; // Already triggered for this draw phase
    if (state.screen !== "game") return;

    // Small delay to let state settle before auto-triggering
    drawPhaseTriggeredRef.current = true;
    const t = setTimeout(() => {
      syncDispatch({ type: "DRAW_PHASE" });
    }, 500);
    return () => clearTimeout(t);
  }, [
    isMultiplayerSync,
    isPerDevice,
    state.currentPhase,
    isMyTurn,
    showTurnTransition,
    state.screen,
    syncDispatch,
  ]);

  // ── AI Turn Logic ────────────────────────────────────────────────────────
  // AI is always player index 1 (id=1). We use a stateRef to always read
  // the latest game state inside setTimeout callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;
  const aiTurnRef = useRef(false);
  // Track how many cards AI has played this turn
  const aiCardsPlayedRef = useRef(0);

  // Handle AI defense when AI is being attacked
  useEffect(() => {
    if (!isAIMode) return;
    if (!state.pendingAttack) return;
    if (state.pendingAttack.targetPlayerId !== 1) return;
    if (state.screen !== "game") return;

    const t = setTimeout(() => {
      const gs = stateRef.current;
      const aiPlayer = gs.players[1];
      if (!aiPlayer) return;
      const defenseCards = aiPlayer.hand.filter((c) => c.type === "defense");
      if (defenseCards.length > 0 && Math.random() > 0.35) {
        const randomDefense =
          defenseCards[Math.floor(Math.random() * defenseCards.length)];
        dispatch({ type: "DEFEND", card: randomDefense });
      } else {
        dispatch({ type: "SKIP_DEFENSE" });
      }
    }, 900);
    return () => clearTimeout(t);
  }, [isAIMode, state.pendingAttack, state.screen]);

  // AI Draw Phase: trigger when it's AI's draw turn
  useEffect(() => {
    if (!isAIMode) return;
    if (state.currentPlayerIndex !== 1) return;
    if (state.currentPhase !== "draw") return;
    if (state.screen !== "game") return;
    if (showTurnTransition) return;
    if (aiTurnRef.current) return;

    aiTurnRef.current = true;
    aiCardsPlayedRef.current = 0;
    setIsAIThinking(true);

    const t = setTimeout(() => {
      dispatch({ type: "DRAW_PHASE" });
    }, 1000);
    return () => clearTimeout(t);
  }, [
    isAIMode,
    state.currentPlayerIndex,
    state.currentPhase,
    state.screen,
    showTurnTransition,
  ]);

  // AI Play Phase: after drawing, play a card (up to 2 times)
  // We use state.players[1]?.hand.length as a proxy trigger for "AI's hand changed"
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.players triggers re-evaluation after each card play
  useEffect(() => {
    if (!isAIMode) return;
    if (state.currentPlayerIndex !== 1) return;
    if (state.currentPhase !== "play") return;
    if (state.screen !== "game") return;
    if (state.pendingAttack) return; // wait for pending attack resolution
    if (!aiTurnRef.current) return;

    if (aiCardsPlayedRef.current >= GAME_CONSTANTS.CARDS_PER_TURN) {
      // Played max cards — end turn
      const t = setTimeout(() => {
        dispatch({ type: "END_TURN" });
        setCardsPlayedThisTurn(0);
        setIsAIThinking(false);
        aiTurnRef.current = false;
      }, 500);
      return () => clearTimeout(t);
    }

    // Attempt to pick and play a card
    const t = setTimeout(() => {
      const gs = stateRef.current;
      const pick = pickAICard(gs);

      if (!pick) {
        // Nothing useful to play — end turn
        dispatch({ type: "END_TURN" });
        setCardsPlayedThisTurn(0);
        setIsAIThinking(false);
        aiTurnRef.current = false;
        return;
      }

      // Select card
      dispatch({ type: "SELECT_CARD", index: pick.index });

      // After SELECT_CARD, select target
      setTimeout(() => {
        dispatch({ type: "SELECT_TARGET", targetId: 0 });

        // After SELECT_TARGET, confirm/skip saber
        setTimeout(() => {
          dispatch({ type: "SABER_SKIP" });
          aiCardsPlayedRef.current += 1;
          setCardsPlayedThisTurn(aiCardsPlayedRef.current);
        }, 200);
      }, 200);
    }, 700);
    return () => clearTimeout(t);
  }, [
    isAIMode,
    state.currentPlayerIndex,
    state.currentPhase,
    state.screen,
    state.pendingAttack,
    state.players,
  ]);

  // AI End Phase: if somehow stuck in end phase, move along
  useEffect(() => {
    if (!isAIMode) return;
    if (state.currentPlayerIndex !== 1) return;
    if (state.currentPhase !== "end") return;
    if (state.screen !== "game") return;
    if (!aiTurnRef.current) return;

    const t = setTimeout(() => {
      dispatch({ type: "END_TURN" });
      setCardsPlayedThisTurn(0);
      setIsAIThinking(false);
      aiTurnRef.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [isAIMode, state.currentPlayerIndex, state.currentPhase, state.screen]);

  // Reset aiTurnRef when player changes
  useEffect(() => {
    if (state.currentPlayerIndex !== 1) {
      aiTurnRef.current = false;
      aiCardsPlayedRef.current = 0;
    }
  }, [state.currentPlayerIndex]);

  const cardSize = playerCount >= 3 ? "sm" : "md";

  // In per-device mode the "current" player for rendering the bottom zone is
  // always the local player. Opponents are everyone else.
  const bottomZonePlayer = isPerDevice ? localPlayer : currentPlayer;
  const opponentPlayers = state.players.filter(
    (p) => p.id !== bottomZonePlayer.id,
  );

  // Helper: get best display name for a player index (synced name > state name)
  const getDisplayName = (playerIdx: number): string => {
    return (
      playerDisplayNames[playerIdx] ??
      state.players[playerIdx]?.name ??
      `Jugador ${playerIdx + 1}`
    );
  };

  // Can play cards: only when it's my turn (per-device) or always in shared mode
  const canPlayCards =
    state.currentPhase === "play" &&
    cardsPlayedThisTurn < GAME_CONSTANTS.CARDS_PER_TURN &&
    !currentPlayer.blockedTurns &&
    (isPerDevice ? isMyTurn : true);

  const isSelectingTarget =
    state.selectedCardIndex !== null &&
    currentPlayer.hand[state.selectedCardIndex]?.type === "villain" &&
    (isPerDevice ? isMyTurn : true);

  const isSelectingActionTarget =
    state.selectedCardIndex !== null &&
    currentPlayer.hand[state.selectedCardIndex]?.type === "action" &&
    (isPerDevice ? isMyTurn : true);

  const heroUltimateUsedByCurrentPlayer = state.heroUltimateUsed.includes(
    bottomZonePlayer.id,
  );

  const roundProgress = Math.min((state.round / state.maxRounds) * 100, 100);

  // In per-device mode: only show defense overlay to the targeted device.
  // In shared-screen mode: always show it (the attacked player's turn happens on same device).
  // In AI mode: only show it when the human player (index 0) is under attack.
  const defenderIsCurrentPlayer = isPerDevice
    ? isMyDefenseTurn
    : isAIMode
      ? state.pendingAttack?.targetPlayerId === 0
      : true;

  return (
    <div className="relative min-h-screen bg-background flex flex-col p-2 gap-1.5 md:gap-2 md:max-h-screen md:overflow-hidden overflow-y-auto">
      {/* Battle background */}
      <img
        src="/assets/generated/battle-arena-bg.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{ opacity: 0.22 }}
        aria-hidden="true"
      />

      {/* Circuit grid overlay */}
      <div className="absolute inset-0 circuit-bg pointer-events-none z-0" />

      {/* All content above bg */}
      <div className="relative z-10 flex flex-col flex-1 gap-1.5 md:gap-2 min-h-0 md:overflow-hidden">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 backdrop-blur-sm px-2 md:px-3 py-1.5 flex-shrink-0 gap-1">
          <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
            <Cpu className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  T{state.turn} · Ronda{" "}
                  <span className="text-primary font-bold">{state.round}</span>/
                  {state.maxRounds}
                </span>
                {/* Round progress bar */}
                <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${roundProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    state.currentPhase === "draw"
                      ? "bg-yellow-400 animate-pulse"
                      : state.currentPhase === "play"
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground"
                  }`}
                />
                <span className="text-[11px] font-bold text-foreground truncate max-w-[100px] md:max-w-none">
                  {isPerDevice
                    ? `${getDisplayName(safeLocalIndex)} · ${localHero?.name.split('"')[1] ?? ""}`
                    : `${getDisplayName(state.currentPlayerIndex)}${currentHero ? ` · ${currentHero.name.split('"')[1] ?? ""}` : ""}`}
                </span>
                <span className="hidden sm:inline text-[10px] text-muted-foreground">
                  {isPerDevice
                    ? isMyTurn
                      ? state.currentPhase === "draw"
                        ? "Tu turno — Conexión"
                        : state.currentPhase === "play"
                          ? `Ejecución (${cardsPlayedThisTurn}/${GAME_CONSTANTS.CARDS_PER_TURN})`
                          : "Sincronización"
                      : `Turno de ${getDisplayName(state.currentPlayerIndex)}`
                    : state.currentPhase === "draw"
                      ? "Conexión"
                      : state.currentPhase === "play"
                        ? `Ejecución (${cardsPlayedThisTurn}/${GAME_CONSTANTS.CARDS_PER_TURN})`
                        : "Sincronización"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* AI thinking indicator */}
            {isAIMode && isAIThinking && state.currentPlayerIndex === 1 && (
              <div className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-lg px-1.5 py-0.5 animate-pulse">
                <span>🤖</span>
                <span className="hidden sm:inline">IA pensando...</span>
              </div>
            )}

            {/* Per-device: waiting message when not my turn */}
            {isPerDevice && !isMyTurn && !showTurnTransition && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/20 border border-border rounded-lg px-1.5 py-0.5">
                <span className="animate-pulse">⏳</span>
                <span className="hidden sm:inline">
                  Turno de {getDisplayName(state.currentPlayerIndex)}
                </span>
              </div>
            )}

            {/* Syncing indicator for multiplayer */}
            {isMultiplayerSync && isSyncing && (
              <div className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-1.5 py-0.5 animate-pulse">
                <span>🔄</span>
                <span className="hidden sm:inline">Sincronizando...</span>
              </div>
            )}

            {/* Draw button — only show when it's my turn (or shared mode). Hidden on mobile (shown in sticky bar below) */}
            {state.currentPhase === "draw" &&
              !showTurnTransition &&
              (!isPerDevice || isMyTurn) &&
              !(isAIMode && state.currentPlayerIndex === 1) && (
                <Button
                  size="sm"
                  onClick={() => syncDispatch({ type: "DRAW_PHASE" })}
                  className="hidden sm:flex bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30 text-[10px] h-7"
                  data-ocid="game.draw_deck_button"
                >
                  📡 Robar Carta
                </Button>
              )}

            {/* End turn button — hidden on mobile (shown in sticky bar below) */}
            {(state.currentPhase === "play" || state.currentPhase === "end") &&
              !(isAIMode && state.currentPlayerIndex === 1) &&
              (!isPerDevice || isMyTurn) && (
                <Button
                  size="sm"
                  onClick={handleEndTurn}
                  className="hidden sm:flex bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 text-[10px] h-7"
                  data-ocid="game.end_turn_button"
                >
                  Fin <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}

            {/* Surrender button — icon-only on mobile */}
            {(!isPerDevice || isMyTurn) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] h-7 px-1.5"
                    data-ocid="game.surrender_open_modal_button"
                  >
                    <Flag className="w-3 h-3" />
                    <span className="hidden sm:inline ml-0.5">Rendirse</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  className="border-red-500/40 bg-card"
                  data-ocid="game.surrender_dialog"
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">
                      🏳️ ¿Rendirse?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {getDisplayName(safeLocalIndex)}, si te rindes todos tus
                      Servidores quedarán Offline y serás eliminado. Esta acción
                      no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className="border-border text-foreground/70"
                      data-ocid="game.surrender_cancel_button"
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSurrender}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-ocid="game.surrender_confirm_button"
                    >
                      Confirmar Rendición
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* ── Main game area ── */}
        <div className="flex flex-1 gap-2 min-h-0 md:overflow-hidden">
          {/* ── Player zones ── */}
          <div className="flex flex-col flex-1 gap-1.5 md:gap-2 min-h-0 md:overflow-hidden">
            {/* Enemy zone label */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 to-transparent" />
              <span className="text-[9px] text-red-400/70 uppercase tracking-widest font-bold">
                Zona Rival
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-red-500/40 to-transparent" />
            </div>
            {/* Opponent zones */}
            <div
              className={`grid gap-1.5 md:gap-2 flex-shrink-0 max-h-[32vh] md:max-h-none overflow-y-auto md:overflow-visible ${opponentPlayers.length === 1 ? "grid-cols-1" : opponentPlayers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
              style={{
                background: "oklch(0.1 0.02 25 / 0.4)",
                borderRadius: 8,
                padding: "6px",
                border: "1px solid oklch(0.35 0.12 25 / 0.2)",
              }}
            >
              {opponentPlayers.map((player) => {
                // Find the actual index of this opponent in the players array for name lookup
                const playerStateIdx = state.players.findIndex(
                  (p) => p.id === player.id,
                );
                const resolvedOpponentName =
                  playerDisplayNames[playerStateIdx] ?? player.name;
                const playerWithResolvedName =
                  resolvedOpponentName !== player.name
                    ? { ...player, name: resolvedOpponentName }
                    : player;
                return (
                  <PlayerZone
                    key={player.id}
                    player={playerWithResolvedName}
                    isCurrentPlayer={false}
                    isUnderAttack={
                      state.pendingAttack?.targetPlayerId === player.id
                    }
                    selectedCardIndex={null}
                    canSelectCards={false}
                    isTargetable={
                      (isSelectingTarget || isSelectingActionTarget) &&
                      player.isOnline &&
                      player.id !== currentPlayer.id
                    }
                    isSelected={state.selectedTargetId === player.id}
                    onSelectCard={() => {}}
                    onSelectAsTarget={() => handleSelectTarget(player.id)}
                    onDefend={handleDefend}
                    faceDown={true}
                    cardSize={cardSize}
                    showHeroActivation={
                      state.heroActionEvent?.playerId === player.id
                    }
                    heroActivationMessage={
                      state.heroActionEvent?.playerId === player.id
                        ? state.heroActionEvent.message
                        : undefined
                    }
                    isHit={hitPlayerId === player.id}
                    isDefending={defendingPlayerId === player.id}
                  />
                );
              })}
            </div>

            {/* Center: deck + discard */}
            <div className="flex items-center justify-center gap-2 md:gap-4 flex-shrink-0">
              {/* Deck */}
              <div className="flex flex-col items-center gap-0.5">
                <div
                  role={state.currentPhase === "draw" ? "button" : undefined}
                  tabIndex={state.currentPhase === "draw" ? 0 : undefined}
                  className="w-[60px] h-[84px] rounded-lg card-defense-border bg-gradient-to-b from-[oklch(0.12_0.04_240)] to-[oklch(0.08_0.02_240)] flex flex-col items-center justify-center cursor-pointer hover:brightness-110 transition-all"
                  data-ocid="game.draw_deck_button"
                  onClick={
                    state.currentPhase === "draw" && (!isPerDevice || isMyTurn)
                      ? () => syncDispatch({ type: "DRAW_PHASE" })
                      : undefined
                  }
                  onKeyDown={
                    state.currentPhase === "draw" && (!isPerDevice || isMyTurn)
                      ? (e) =>
                          e.key === "Enter" &&
                          syncDispatch({ type: "DRAW_PHASE" })
                      : undefined
                  }
                >
                  <Cpu className="w-4 h-4 text-primary/60" />
                  <span className="text-[9px] text-primary/80 font-mono mt-0.5">
                    {state.deck.length}
                  </span>
                </div>
                <span className="text-[8px] text-muted-foreground">Mazo</span>
              </div>

              {/* Phase / action indicator — only shown when no pending attack */}
              {!state.pendingAttack && (
                <div className="flex flex-col items-center">
                  {isSelectingTarget && (
                    <span className="text-[9px] neon-text-red animate-pulse text-center">
                      Selecciona un objetivo ↑
                    </span>
                  )}
                  {!isSelectingTarget && state.currentPhase === "play" && (
                    <span className="text-[9px] text-muted-foreground text-center">
                      Juega una carta ↓
                    </span>
                  )}
                </div>
              )}

              {/* Discard */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  className="w-[60px] h-[84px] rounded-lg border border-border bg-card/30 flex flex-col items-center justify-center relative cursor-pointer hover:brightness-110 transition-all"
                  data-ocid="game.discard_pile"
                  onClick={() => {
                    if (state.discard.length > 0) {
                      setDetailCard(state.discard[state.discard.length - 1]);
                    }
                  }}
                >
                  {state.discard.length > 0 ? (
                    <img
                      src={state.discard[state.discard.length - 1]?.image}
                      alt="Descarte"
                      className="w-full h-full object-cover rounded-lg opacity-60"
                    />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-muted-foreground/30" />
                  )}
                  <span className="text-[9px] text-muted-foreground/50 font-mono absolute">
                    {state.discard.length}
                  </span>
                </button>
                <span className="text-[8px] text-muted-foreground">
                  Descarte
                </span>
              </div>
            </div>

            {/* Player zone label */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
              <span className="text-[9px] text-primary/70 uppercase tracking-widest font-bold">
                Tu Zona
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
            </div>
            {/* Current player zone (local player in per-device, current player in shared) */}
            <div
              className="flex-1 min-h-0 md:overflow-hidden"
              style={{
                background: "oklch(0.1 0.02 145 / 0.3)",
                borderRadius: 8,
                padding: "6px",
                border: "1px solid oklch(0.35 0.15 145 / 0.2)",
              }}
            >
              <PlayerZone
                player={
                  isPerDevice && playerDisplayNames[safeLocalIndex]
                    ? {
                        ...bottomZonePlayer,
                        name: playerDisplayNames[safeLocalIndex],
                      }
                    : bottomZonePlayer
                }
                isCurrentPlayer={isPerDevice ? isMyTurn : true}
                isUnderAttack={
                  state.pendingAttack?.targetPlayerId === bottomZonePlayer.id
                }
                selectedCardIndex={isMyTurn ? state.selectedCardIndex : null}
                canSelectCards={canPlayCards}
                isTargetable={false}
                isSelected={false}
                onSelectCard={isMyTurn ? handleSelectCard : () => {}}
                onSelectAsTarget={() => {}}
                onDefend={handleDefend}
                onHeroUltimate={isMyTurn ? handleHeroUltimate : undefined}
                heroUltimateUsed={heroUltimateUsedByCurrentPlayer}
                showHeroActivation={
                  state.heroActionEvent?.playerId === bottomZonePlayer.id
                }
                heroActivationMessage={
                  state.heroActionEvent?.playerId === bottomZonePlayer.id
                    ? state.heroActionEvent.message
                    : undefined
                }
                isHit={hitPlayerId === bottomZonePlayer.id}
                isDefending={defendingPlayerId === bottomZonePlayer.id}
                faceDown={false}
                cardSize={cardSize}
                currentPhase={state.currentPhase}
              />
            </div>
          </div>

          {/* ── Combat log (side panel) ── */}
          <div className="hidden md:flex w-44 flex-col rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden flex-shrink-0">
            <CombatLog entries={state.log} />
          </div>
        </div>

        {/* ── Regla del Saber popup — only show when not pending an attack ── */}
        <DictionaryModal
          card={
            state.saberCard && !state.pendingAttack ? state.saberCard : null
          }
          onConfirm={handleSaberConfirm}
          onSkip={handleSaberSkip}
        />
      </div>

      {/* ── Action Toast (mobile only — last log entry as transient popup) ── */}
      <ActionToast entry={state.log[0] ?? null} />

      {/* ── Mobile sticky bottom action bar ── */}
      {!showTurnTransition && !state.pendingAttack && (
        <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 px-3 pb-1">
          {/* Per-device waiting indicator: show when it's not my turn */}
          {isPerDevice &&
            !isMyTurn &&
            !(isAIMode && state.currentPlayerIndex === 1) && (
              <div
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 border"
                style={{
                  background: "oklch(0.1 0.02 240 / 0.85)",
                  borderColor: "oklch(0.3 0.03 240 / 0.4)",
                  backdropFilter: "blur(8px)",
                  color: "oklch(0.55 0.04 240)",
                }}
              >
                <span className="animate-pulse text-sm">⏳</span>
                <span className="text-xs font-semibold">
                  Turno de {getDisplayName(state.currentPlayerIndex)} —
                  espera...
                </span>
              </div>
            )}
          {/* Draw button — only when it's my turn */}
          {state.currentPhase === "draw" &&
            (!isPerDevice || isMyTurn) &&
            !(isAIMode && state.currentPlayerIndex === 1) && (
              <button
                type="button"
                onClick={() => syncDispatch({ type: "DRAW_PHASE" })}
                className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: "oklch(0.85 0.22 85 / 0.85)",
                  color: "oklch(0.08 0.02 240)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 0 20px oklch(0.85 0.22 85 / 0.4)",
                }}
                data-ocid="game.mobile_draw_button"
              >
                📡 Robar Carta
              </button>
            )}
          {/* End turn button — only when it's my turn */}
          {(state.currentPhase === "play" || state.currentPhase === "end") &&
            (!isPerDevice || isMyTurn) &&
            !(isAIMode && state.currentPlayerIndex === 1) && (
              <button
                type="button"
                onClick={handleEndTurn}
                className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: "oklch(0.75 0.25 145 / 0.85)",
                  color: "oklch(0.08 0.02 240)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 0 20px oklch(0.75 0.25 145 / 0.4)",
                }}
                data-ocid="game.mobile_end_turn_button"
              >
                Fin del Turno →
              </button>
            )}
        </div>
      )}

      {/* ── Mobile Log button (bottom-right FAB) ── */}
      <button
        type="button"
        onClick={() => setIsLogSheetOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full border border-primary/50 bg-card/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-card transition-colors"
        style={{ boxShadow: "0 0 15px oklch(0.75 0.25 145 / 0.3)" }}
        data-ocid="game.log_open_modal_button"
        aria-label="Ver log de combate"
      >
        <List className="w-4 h-4 text-primary" />
        {state.log.length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
            style={{
              background: "oklch(0.75 0.25 145)",
              color: "oklch(0.08 0.02 240)",
            }}
          >
            {Math.min(state.log.length, 99)}
          </span>
        )}
      </button>

      {/* ── Mobile Log Sheet ── */}
      <Sheet open={isLogSheetOpen} onOpenChange={setIsLogSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[70vh] border-t border-primary/40 bg-card/95 backdrop-blur-md"
          data-ocid="game.log_sheet"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Log de Combate
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pb-6">
            <CombatLog entries={state.log} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Defense Timer Overlay (replaces simple attack pending) ── */}
      {state.pendingAttack &&
        defenderIsCurrentPlayer &&
        !showTurnTransition && (
          <DefenseTimerOverlay
            pendingAttack={state.pendingAttack}
            defenseCards={bottomZonePlayer.hand.filter(
              (c) => c.type === "defense",
            )}
            onDefend={handleDefend}
            onSkipDefense={handleSkipDefense}
          />
        )}

      {/* ── Turn Transition Overlay ── */}
      {showTurnTransition && transitionData && !showUltimateOverlay && (
        <TurnTransitionOverlay
          nextPlayerName={transitionData.name}
          nextPlayerHeroImage={transitionData.heroImage}
          nextPlayerHeroName={transitionData.heroName}
          heroColor={
            HERO_COLORS[transitionData.heroId] ?? "oklch(0.75 0.25 145)"
          }
          onDone={handleTurnTransitionDone}
          isAI={isAIMode && state.currentPlayerIndex === 1}
          isMultiplayerSync={isMultiplayerSync}
          isLocalPlayerNext={transitionData.isLocalPlayerTurn}
          isWaitingForOtherPlayer={transitionData.isWaitingForOther}
          onStartTurn={
            transitionData.isLocalPlayerTurn
              ? handleTurnTransitionStartTurn
              : undefined
          }
        />
      )}

      {/* ── Ultimate Overlay ── */}
      {showUltimateOverlay &&
        ultimateData &&
        (() => {
          const hero = getHeroById(ultimateData.heroId as HeroId);
          if (!hero) return null;
          return (
            <UltimateOverlay
              hero={hero}
              playerName={ultimateData.playerName}
              abilityName={ultimateData.heroId}
              abilityEffect={
                HERO_ULTIMATE_EFFECTS[ultimateData.heroId] ??
                "Habilidad activada."
              }
              onDone={() => {
                setShowUltimateOverlay(false);
                setUltimateData(null);
              }}
            />
          );
        })()}

      {/* ── Card detail overlay (discard top card) ── */}
      <CardDetailOverlay
        card={detailCard}
        onClose={() => setDetailCard(null)}
      />
    </div>
  );
}
