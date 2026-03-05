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
import { ChevronRight, Cpu, Flag, RotateCcw } from "lucide-react";
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
import type { CardDefinition, GameState, HeroId } from "../game/gameTypes";

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
}

function TurnTransitionOverlay({
  nextPlayerName,
  nextPlayerHeroImage,
  nextPlayerHeroName,
  heroColor,
  onDone,
}: TurnTransitionProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [countdown, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "oklch(0.05 0.03 240 / 0.97)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Battle background at 20% */}
      <img
        src="/assets/generated/battle-background.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.2 }}
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

      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
        {/* TURNO DE label */}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground turn-slide-in"
          style={{ animationDelay: "0.05s" }}
        >
          TURNO DE
        </p>

        {/* Hero avatar — larger */}
        <div
          className="w-32 h-32 rounded-full overflow-hidden turn-slide-in"
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
            className="text-4xl md:text-6xl font-black font-display glitch-text"
            style={{
              letterSpacing: "-0.02em",
              color: heroColor,
              textShadow: `0 0 20px ${heroColor}, 0 0 40px ${heroColor} / 0.5`,
            }}
          >
            {nextPlayerName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {nextPlayerHeroName}
          </p>
        </div>

        {/* PASA EL DISPOSITIVO */}
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
            📲 PASA EL DISPOSITIVO
          </div>
        </div>

        {/* Countdown */}
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

        <Button
          onClick={onDone}
          size="sm"
          className="mt-2 font-bold animate-pulse"
          style={{
            background: heroColor,
            color: "oklch(0.08 0.02 240)",
          }}
          data-ocid="game.turn_transition_continue_button"
        >
          Toca para continuar
        </Button>
      </div>
    </div>
  );
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

// ── Component ────────────────────────────────────────────────────────────────

export default function GameScreen({
  playerCount,
  heroSelections,
  onGameOver,
  gameLevel = 1,
}: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(playerCount, heroSelections, gameLevel),
  );

  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    name: string;
    heroImage: string;
    heroName: string;
    heroId: string;
  } | null>(null);

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
      setTransitionData({
        name: nextPlayer.name,
        heroImage: nextHero?.image ?? "",
        heroName: nextHero?.name ?? "",
        heroId: nextPlayer.heroId,
      });
      setShowTurnTransition(true);
      prevPlayerIndexRef.current = state.currentPlayerIndex;
    }
  }, [state.currentPlayerIndex, state.screen, state.players]);

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

  const handleSelectCard = useCallback((idx: number) => {
    dispatch({ type: "SELECT_CARD", index: idx });
  }, []);

  const handleSelectTarget = useCallback((targetId: number) => {
    dispatch({ type: "SELECT_TARGET", targetId });
  }, []);

  const handleDefend = useCallback(
    (card: CardDefinition) => {
      dispatch({ type: "DEFEND", card });
      setDefendingPlayerId(currentPlayer.id);
      setTimeout(() => setDefendingPlayerId(null), 900);
    },
    [currentPlayer.id],
  );

  const handleSkipDefense = useCallback(() => {
    dispatch({ type: "SKIP_DEFENSE" });
  }, []);

  const handleSaberConfirm = useCallback(() => {
    dispatch({ type: "SABER_CONFIRM" });
    setCardsPlayedThisTurn((n) => n + 1);
  }, []);

  const handleSaberSkip = useCallback(() => {
    dispatch({ type: "SABER_SKIP" });
    setCardsPlayedThisTurn((n) => n + 1);
  }, []);

  const handleEndTurn = useCallback(() => {
    dispatch({ type: "END_TURN" });
    setCardsPlayedThisTurn(0);
  }, []);

  const handleSurrender = useCallback(() => {
    dispatch({ type: "SURRENDER", playerId: currentPlayer.id });
  }, [currentPlayer.id]);

  const handleHeroUltimate = useCallback(() => {
    dispatch({ type: "HERO_ULTIMATE", playerId: currentPlayer.id });
  }, [currentPlayer.id]);

  const handleTurnTransitionDone = useCallback(() => {
    setShowTurnTransition(false);
    setTransitionData(null);
  }, []);

  const cardSize = playerCount >= 3 ? "sm" : "md";
  const opponentPlayers = state.players.filter(
    (p) => p.id !== currentPlayer.id,
  );

  const canPlayCards =
    state.currentPhase === "play" &&
    cardsPlayedThisTurn < GAME_CONSTANTS.CARDS_PER_TURN &&
    !currentPlayer.blockedTurns;

  const isSelectingTarget =
    state.selectedCardIndex !== null &&
    currentPlayer.hand[state.selectedCardIndex]?.type === "villain";

  const isSelectingActionTarget =
    state.selectedCardIndex !== null &&
    currentPlayer.hand[state.selectedCardIndex]?.type === "action";

  const heroUltimateUsedByCurrentPlayer = state.heroUltimateUsed.includes(
    currentPlayer.id,
  );

  const roundProgress = Math.min((state.round / state.maxRounds) * 100, 100);

  // Determine which player is the defender (target of pending attack)
  const defenderPlayer = state.pendingAttack
    ? state.players.find((p) => p.id === state.pendingAttack?.targetPlayerId)
    : null;
  const defenderIsCurrentPlayer = defenderPlayer?.id === currentPlayer.id;

  return (
    <div className="relative min-h-screen bg-background flex flex-col p-2 gap-2 max-h-screen overflow-hidden">
      {/* Battle background */}
      <img
        src="/assets/generated/battle-background.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{ opacity: 0.12 }}
        aria-hidden="true"
      />

      {/* Circuit grid overlay */}
      <div className="absolute inset-0 circuit-bg pointer-events-none z-0" />

      {/* All content above bg */}
      <div className="relative z-10 flex flex-col flex-1 gap-2 min-h-0 overflow-hidden">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 backdrop-blur-sm px-3 py-1.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-primary" />
            <div>
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    state.currentPhase === "draw"
                      ? "bg-yellow-400 animate-pulse"
                      : state.currentPhase === "play"
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground"
                  }`}
                />
                <span className="text-xs font-bold text-foreground">
                  {currentPlayer.name}
                  {currentHero && ` · ${currentHero.name.split('"')[1] ?? ""}`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {state.currentPhase === "draw"
                    ? "Fase: Conexión"
                    : state.currentPhase === "play"
                      ? `Fase: Ejecución (${cardsPlayedThisTurn}/${GAME_CONSTANTS.CARDS_PER_TURN})`
                      : "Fase: Sincronización"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {state.currentPhase === "draw" && !showTurnTransition && (
              <Button
                size="sm"
                onClick={() => dispatch({ type: "DRAW_PHASE" })}
                className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30 text-[10px] h-7"
                data-ocid="game.draw_deck_button"
              >
                📡 Robar Carta
              </Button>
            )}
            {(state.currentPhase === "play" ||
              state.currentPhase === "end") && (
              <Button
                size="sm"
                onClick={handleEndTurn}
                className="bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 text-[10px] h-7"
                data-ocid="game.end_turn_button"
              >
                Fin del Turno <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            )}

            {/* Surrender button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] h-7"
                  data-ocid="game.surrender_open_modal_button"
                >
                  <Flag className="w-3 h-3 mr-0.5" />
                  Rendirse
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
                    {currentPlayer.name}, si te rindes todos tus Servidores
                    quedarán Offline y serás eliminado. Esta acción no se puede
                    deshacer.
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
          </div>
        </div>

        {/* ── Main game area ── */}
        <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
          {/* ── Player zones ── */}
          <div className="flex flex-col flex-1 gap-2 min-h-0 overflow-hidden">
            {/* Opponent zones */}
            <div
              className={`grid gap-2 flex-shrink-0 ${opponentPlayers.length === 1 ? "grid-cols-1" : opponentPlayers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
            >
              {opponentPlayers.map((player) => (
                <PlayerZone
                  key={player.id}
                  player={player}
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
              ))}
            </div>

            {/* Center: deck + discard */}
            <div className="flex items-center justify-center gap-4 flex-shrink-0">
              {/* Deck */}
              <div className="flex flex-col items-center gap-0.5">
                <div
                  role={state.currentPhase === "draw" ? "button" : undefined}
                  tabIndex={state.currentPhase === "draw" ? 0 : undefined}
                  className="w-[60px] h-[84px] rounded-lg card-defense-border bg-gradient-to-b from-[oklch(0.12_0.04_240)] to-[oklch(0.08_0.02_240)] flex flex-col items-center justify-center cursor-pointer hover:brightness-110 transition-all"
                  data-ocid="game.draw_deck_button"
                  onClick={
                    state.currentPhase === "draw"
                      ? () => dispatch({ type: "DRAW_PHASE" })
                      : undefined
                  }
                  onKeyDown={
                    state.currentPhase === "draw"
                      ? (e) =>
                          e.key === "Enter" && dispatch({ type: "DRAW_PHASE" })
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

            {/* Current player zone */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <PlayerZone
                player={currentPlayer}
                isCurrentPlayer={true}
                isUnderAttack={
                  state.pendingAttack?.targetPlayerId === currentPlayer.id
                }
                selectedCardIndex={state.selectedCardIndex}
                canSelectCards={canPlayCards}
                isTargetable={false}
                isSelected={false}
                onSelectCard={handleSelectCard}
                onSelectAsTarget={() => {}}
                onDefend={handleDefend}
                onHeroUltimate={handleHeroUltimate}
                heroUltimateUsed={heroUltimateUsedByCurrentPlayer}
                showHeroActivation={
                  state.heroActionEvent?.playerId === currentPlayer.id
                }
                heroActivationMessage={
                  state.heroActionEvent?.playerId === currentPlayer.id
                    ? state.heroActionEvent.message
                    : undefined
                }
                isHit={hitPlayerId === currentPlayer.id}
                isDefending={defendingPlayerId === currentPlayer.id}
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

        {/* ── Regla del Saber popup ── */}
        <DictionaryModal
          card={state.saberCard}
          onConfirm={handleSaberConfirm}
          onSkip={handleSaberSkip}
        />

        {/* ── Mobile log toggle (bottom sheet) ── */}
        {state.log.length > 0 && (
          <div className="md:hidden flex-shrink-0 rounded-lg border border-border bg-card/50 backdrop-blur-sm max-h-20 overflow-hidden">
            <CombatLog entries={state.log.slice(0, 5)} />
          </div>
        )}
      </div>

      {/* ── Defense Timer Overlay (replaces simple attack pending) ── */}
      {state.pendingAttack &&
        defenderIsCurrentPlayer &&
        !showTurnTransition && (
          <DefenseTimerOverlay
            pendingAttack={state.pendingAttack}
            defenseCards={currentPlayer.hand.filter(
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
