// ─── App.tsx ─────────────────────────────────────────────────────────────────
// Screen router only — no game logic here.

import { Toaster } from "@/components/ui/sonner";
import React, { useState, useCallback, useEffect } from "react";
import { HEROES } from "./data/heroes";
import { roomCodeToSeed } from "./game/gameStateSerializer";
import type { GameState, HeroId } from "./game/gameTypes";
import { useActor } from "./hooks/useActor";
import GameOverScreen from "./screens/GameOverScreen";
import GameScreen from "./screens/GameScreen";
import HeroSelectScreen from "./screens/HeroSelectScreen";
import StartScreen from "./screens/StartScreen";

type AppScreen = "start" | "heroSelect" | "game" | "gameOver";

export default function App() {
  const { actor } = useActor();
  const [screen, setScreen] = useState<AppScreen>("start");
  const [playerCount, setPlayerCount] = useState(2);
  const [gameLevel, setGameLevel] = useState<1 | 2 | 3>(1);
  const [heroSelectStep, setHeroSelectStep] = useState(0);
  const [heroSelections, setHeroSelections] = useState<(HeroId | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [finalGameState, setFinalGameState] = useState<GameState | null>(null);
  const [isAIMode, setIsAIMode] = useState(false);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(null);
  // null = shared screen mode; number = multiplayer per-device (this device's player index)
  const [localPlayerIndex, setLocalPlayerIndex] = useState<number | null>(null);

  // Multiplayer sync state
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState<string | null>(
    null,
  );
  const [multiplayerMyPlayerId, setMultiplayerMyPlayerId] = useState<
    string | null
  >(null);
  const [multiplayerMyDisplayName, setMultiplayerMyDisplayName] =
    useState<string>("Jugador");
  const [multiplayerMyHeroId, setMultiplayerMyHeroId] = useState<string>("");

  // Check URL for ?room= param on mount — auto-show the join modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomCodeFromUrl(code.toUpperCase());
    }
  }, []);

  const handleStartGame = useCallback((count: number, level: 1 | 2 | 3) => {
    setPlayerCount(count);
    setGameLevel(level);
    setHeroSelectStep(0);
    setHeroSelections([null, null, null, null]);
    setIsAIMode(false);
    setLocalPlayerIndex(null); // shared screen
    setMultiplayerRoomCode(null);
    setMultiplayerMyPlayerId(null);
    setScreen("heroSelect");
  }, []);

  const handleStartMultiplayerGame = useCallback(
    (
      count: number,
      level: 1 | 2 | 3,
      localIdx: number,
      roomCode?: string,
      playerId?: string,
      displayName?: string,
    ) => {
      setPlayerCount(count);
      setGameLevel(level);
      setHeroSelectStep(0);
      setHeroSelections([null, null, null, null]);
      setIsAIMode(false);
      setLocalPlayerIndex(localIdx);
      setMultiplayerRoomCode(roomCode ?? null);
      setMultiplayerMyPlayerId(playerId ?? null);
      setMultiplayerMyDisplayName(displayName ?? "Jugador");
      setMultiplayerMyHeroId("");
      // Clear URL param so it doesn't re-open on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
      setRoomCodeFromUrl(null);
      setScreen("heroSelect");
    },
    [],
  );

  const handleStartAIGame = useCallback((level: 1 | 2 | 3) => {
    setPlayerCount(2);
    setGameLevel(level);
    setHeroSelectStep(0);
    setHeroSelections([null, null, null, null]);
    setIsAIMode(true);
    setLocalPlayerIndex(0); // AI mode: local player is always index 0
    setMultiplayerRoomCode(null);
    setMultiplayerMyPlayerId(null);
    setScreen("heroSelect");
  }, []);

  const handleSelectHero = useCallback(
    (heroId: HeroId) => {
      setHeroSelections((prev) => {
        const next = [...prev];
        next[heroSelectStep] = heroId;
        return next;
      });
    },
    [heroSelectStep],
  );

  // When hero is selected in multiplayer mode, update the canister player name
  const handleHeroChangeForMultiplayer = useCallback(
    async (heroId: HeroId) => {
      if (!multiplayerRoomCode || !multiplayerMyPlayerId || !actor) return;
      setMultiplayerMyHeroId(heroId);
      // Encode hero in canister player name
      const { encodePlayerName } = await import("./game/gameStateSerializer");
      const encodedName = encodePlayerName(multiplayerMyDisplayName, heroId);
      try {
        await actor.leaveRoom(multiplayerRoomCode, multiplayerMyPlayerId);
        await actor.joinRoom(
          multiplayerRoomCode,
          multiplayerMyPlayerId,
          encodedName,
        );
      } catch {
        // best-effort
      }
    },
    [
      multiplayerRoomCode,
      multiplayerMyPlayerId,
      actor,
      multiplayerMyDisplayName,
    ],
  );

  const handleConfirmHero = useCallback(() => {
    if (isAIMode) {
      // In AI mode: only player 1 (step 0) selects; then pick a random hero for AI
      const player1Hero = heroSelections[0];
      const availableHeroes = HEROES.filter((h) => h.id !== player1Hero).map(
        (h) => h.id,
      );
      const aiHero =
        availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
      setHeroSelections((prev) => {
        const next = [...prev];
        next[1] = aiHero as HeroId;
        return next;
      });
      setScreen("game");
    } else if (localPlayerIndex !== null) {
      // Multiplayer per-device mode: each device only selects their own hero.
      // CRITICAL: Fill remaining slots deterministically using the room code as seed
      // so that ALL devices produce the EXACT same heroSelections array → identical
      // initial deck shuffle → synchronized game state from turn 1.
      const localHero = heroSelections[localPlayerIndex];
      const allHeroIds = HEROES.map((h) => h.id as HeroId);
      const seed = roomCodeToSeed(multiplayerRoomCode ?? "DEFAULT");

      setHeroSelections((prev) => {
        const next = [...prev];
        // Ensure local player's selection is recorded
        if (localHero) next[localPlayerIndex] = localHero;

        // Build deterministic fill order: sort hero ids consistently, then pick by seed
        const sortedHeroIds = [...allHeroIds].sort();
        const usedHeroes: HeroId[] = next
          .slice(0, playerCount)
          .filter(Boolean) as HeroId[];

        for (let i = 0; i < playerCount; i++) {
          if (next[i] != null) continue;
          const available = sortedHeroIds.filter(
            (id) => !usedHeroes.includes(id),
          );
          // Deterministic pick: use (seed + i) as offset into available list
          const deterministicIdx = (seed + i) % available.length;
          const pick = available[deterministicIdx] ?? available[0];
          next[i] = pick;
          usedHeroes.push(pick);
        }
        return next;
      });
      setScreen("game");
    } else if (heroSelectStep < playerCount - 1) {
      setHeroSelectStep((s) => s + 1);
    } else {
      setScreen("game");
    }
  }, [
    heroSelectStep,
    playerCount,
    isAIMode,
    heroSelections,
    localPlayerIndex,
    multiplayerRoomCode,
  ]);

  const handleGameOver = useCallback((gameState: GameState) => {
    setFinalGameState(gameState);
    setScreen("gameOver");
  }, []);

  const handlePlayAgain = useCallback(() => {
    setScreen("heroSelect");
    setHeroSelectStep(0);
    setHeroSelections([null, null, null, null]);
  }, []);

  const handleHome = useCallback(() => {
    setScreen("start");
    setIsAIMode(false);
    setLocalPlayerIndex(null);
    setMultiplayerRoomCode(null);
    setMultiplayerMyPlayerId(null);
  }, []);

  const isMultiplayerSync =
    localPlayerIndex !== null && !isAIMode && multiplayerRoomCode !== null;

  return (
    <>
      {screen === "start" && (
        <StartScreen
          onStartGame={handleStartGame}
          onStartAIGame={handleStartAIGame}
          onStartMultiplayerGame={handleStartMultiplayerGame}
          initialRoomCode={roomCodeFromUrl}
        />
      )}

      {screen === "heroSelect" && (
        <HeroSelectScreen
          playerCount={playerCount}
          heroSelectStep={heroSelectStep}
          heroSelections={heroSelections}
          onSelectHero={handleSelectHero}
          onConfirm={handleConfirmHero}
          isAIMode={isAIMode}
          isMultiplayerDevice={localPlayerIndex !== null && !isAIMode}
          localPlayerIndex={localPlayerIndex ?? 0}
          roomCode={multiplayerRoomCode}
          myPlayerId={multiplayerMyPlayerId}
          onHeroChange={
            isMultiplayerSync ? handleHeroChangeForMultiplayer : undefined
          }
        />
      )}

      {screen === "game" && (
        <GameScreen
          playerCount={playerCount}
          heroSelections={heroSelections.slice(0, playerCount) as HeroId[]}
          onGameOver={handleGameOver}
          gameLevel={gameLevel}
          isAIMode={isAIMode}
          localPlayerIndex={localPlayerIndex}
          roomCode={multiplayerRoomCode}
          myPlayerId={multiplayerMyPlayerId}
          myDisplayName={multiplayerMyDisplayName}
          myHeroId={multiplayerMyHeroId}
          isMultiplayerSync={isMultiplayerSync}
        />
      )}

      {screen === "gameOver" && finalGameState && (
        <GameOverScreen
          gameState={finalGameState}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}

      <Toaster />
    </>
  );
}
