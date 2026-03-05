// ─── App.tsx ─────────────────────────────────────────────────────────────────
// Screen router only — no game logic here.

import { Toaster } from "@/components/ui/sonner";
import React, { useState, useCallback, useEffect } from "react";
import { HEROES } from "./data/heroes";
import type { GameState, HeroId } from "./game/gameTypes";
import GameOverScreen from "./screens/GameOverScreen";
import GameScreen from "./screens/GameScreen";
import HeroSelectScreen from "./screens/HeroSelectScreen";
import StartScreen from "./screens/StartScreen";

type AppScreen = "start" | "heroSelect" | "game" | "gameOver";

export default function App() {
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
    setScreen("heroSelect");
  }, []);

  const handleStartMultiplayerGame = useCallback(
    (count: number, level: 1 | 2 | 3) => {
      setPlayerCount(count);
      setGameLevel(level);
      setHeroSelectStep(0);
      setHeroSelections([null, null, null, null]);
      setIsAIMode(false);
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
    } else if (heroSelectStep < playerCount - 1) {
      setHeroSelectStep((s) => s + 1);
    } else {
      setScreen("game");
    }
  }, [heroSelectStep, playerCount, isAIMode, heroSelections]);

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
  }, []);

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
        />
      )}

      {screen === "game" && (
        <GameScreen
          playerCount={playerCount}
          heroSelections={heroSelections.slice(0, playerCount) as HeroId[]}
          onGameOver={handleGameOver}
          gameLevel={gameLevel}
          isAIMode={isAIMode}
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
