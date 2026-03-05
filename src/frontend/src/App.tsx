// ─── App.tsx ─────────────────────────────────────────────────────────────────
// Screen router only — no game logic here.

import { Toaster } from "@/components/ui/sonner";
import React, { useState, useCallback } from "react";
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

  const handleStartGame = useCallback((count: number, level: 1 | 2 | 3) => {
    setPlayerCount(count);
    setGameLevel(level);
    setHeroSelectStep(0);
    setHeroSelections([null, null, null, null]);
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
    if (heroSelectStep < playerCount - 1) {
      setHeroSelectStep((s) => s + 1);
    } else {
      setScreen("game");
    }
  }, [heroSelectStep, playerCount]);

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
  }, []);

  return (
    <>
      {screen === "start" && <StartScreen onStartGame={handleStartGame} />}

      {screen === "heroSelect" && (
        <HeroSelectScreen
          playerCount={playerCount}
          heroSelectStep={heroSelectStep}
          heroSelections={heroSelections}
          onSelectHero={handleSelectHero}
          onConfirm={handleConfirmHero}
        />
      )}

      {screen === "game" && (
        <GameScreen
          playerCount={playerCount}
          heroSelections={heroSelections.slice(0, playerCount) as HeroId[]}
          onGameOver={handleGameOver}
          gameLevel={gameLevel}
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
