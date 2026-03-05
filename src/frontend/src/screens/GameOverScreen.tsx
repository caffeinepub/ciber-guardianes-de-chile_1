// ─── GameOverScreen ──────────────────────────────────────────────────────────
// Displayed when the game ends. Shows winner, stats, and options to replay.

import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Home, RotateCcw, Shield, Trophy, Zap } from "lucide-react";
import React from "react";
import { getHeroById } from "../data/heroes";
import type { GameState } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";

interface GameOverScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function GameOverScreen({
  gameState,
  onPlayAgain,
  onHome,
}: GameOverScreenProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const winnerHero = winner ? getHeroById(winner.heroId) : null;
  const { actor } = useActor();

  // Save game result
  const { mutate: saveGame, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!actor || !winner) return;
      await actor.saveGame({
        winnerPlayer: { hero: winner.heroId, name: winner.name },
        players: gameState.players.map((p) => ({
          hero: p.heroId,
          name: p.name,
        })),
        winnerPlayerIndex: BigInt(winner.id),
        turnsPlayed: BigInt(gameState.turn),
      });
    },
  });

  // Auto-save on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    saveGame();
  }, [saveGame]);

  return (
    <div className="min-h-screen circuit-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      {/* Trophy */}
      <div className="animate-float-in mb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary shadow-[0_0_30px_oklch(0.75_0.25_145/0.4)] flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black font-display neon-text-green mb-2">
          ¡VICTORIA!
        </h1>
        <p className="text-sm text-muted-foreground">
          Último Ciber-Guardián conectado
        </p>
      </div>

      {/* Winner card */}
      {winner && winnerHero && (
        <div
          className="animate-float-in mb-6 rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-sm p-6 w-full max-w-sm text-center card-hero-border"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary mx-auto mb-3 shadow-[0_0_20px_oklch(0.75_0.25_145/0.5)]">
            <img
              src={winnerHero.image}
              alt={winnerHero.name}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">
            {winner.name}
          </h2>
          <p className="text-sm text-primary">{winnerHero.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {winnerHero.title}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-lg font-bold text-foreground">
                {winner.servers.filter((s) => s.status === "healthy").length}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase">
                Servidores
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {gameState.turn}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase">
                Turnos
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {gameState.round}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase">
                Rondas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other players */}
      <div
        className="animate-float-in mb-6 w-full max-w-sm"
        style={{ animationDelay: "0.15s" }}
      >
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-2 text-center">
          Otros Jugadores
        </h3>
        <div className="flex flex-col gap-2">
          {gameState.players
            .filter((p) => p.id !== gameState.winnerId)
            .map((player) => {
              const hero = getHeroById(player.heroId);
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/30 p-2.5"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border opacity-60">
                    {hero && (
                      <img
                        src={hero.image}
                        alt={hero.name}
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground/60">
                      {player.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {hero?.name}
                    </p>
                  </div>
                  <span className="text-[9px] neon-text-red font-bold">
                    OFFLINE
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Actions */}
      <div
        className="animate-float-in flex flex-col gap-3 w-full max-w-xs"
        style={{ animationDelay: "0.2s" }}
      >
        <Button
          size="lg"
          onClick={onPlayAgain}
          className="bg-primary text-primary-foreground font-bold h-12 rounded-xl"
          data-ocid="gameover.play_again_button"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Jugar de Nuevo
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onHome}
          className="border-border text-foreground/70 hover:bg-card h-12 rounded-xl"
          data-ocid="gameover.home_button"
        >
          <Home className="w-4 h-4 mr-2" />
          Menú Principal
        </Button>
      </div>

      {/* Save status */}
      {isSaving && (
        <p className="mt-3 text-[10px] text-muted-foreground animate-pulse">
          Guardando resultado...
        </p>
      )}
    </div>
  );
}
