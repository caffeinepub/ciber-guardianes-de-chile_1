// ─── GameOverScreen ──────────────────────────────────────────────────────────
// Displayed when the game ends. Shows winner, stats, and options to replay.

import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Home, RotateCcw, Shield, Zap } from "lucide-react";
import React from "react";
import { getHeroById } from "../data/heroes";
import type { GameState } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";

interface GameOverScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
  /** null = shared screen, number = this device's player index in multiplayer */
  localPlayerIndex?: number | null;
}

export default function GameOverScreen({
  gameState,
  onPlayAgain,
  onHome,
  localPlayerIndex = null,
}: GameOverScreenProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const winnerHero = winner ? getHeroById(winner.heroId) : null;
  const { actor } = useActor();

  // Determine if the local player won or lost (for per-device mode)
  const isPerDevice = localPlayerIndex !== null;
  const localPlayer = isPerDevice
    ? gameState.players[localPlayerIndex as number]
    : null;
  const localPlayerWon = isPerDevice
    ? localPlayer?.id === gameState.winnerId
    : null;

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

  // Determine status panel: per-device shows win/loss, shared shows just winner
  // showDefeat=true → this device's player lost; false or null → show victory banner
  const showDefeat = isPerDevice && localPlayerWon === false;

  return (
    <div className="min-h-screen circuit-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Battle background */}
      <img
        src="/assets/generated/battle-arena-bg.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{ opacity: 0.18 }}
        aria-hidden="true"
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: showDefeat
            ? "oklch(0.55 0.28 20 / 0.12)"
            : "oklch(0.75 0.25 145 / 0.10)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* ── Main status banner ── */}
        <div
          className="animate-float-in w-full rounded-2xl border-2 p-5 mb-5 text-center relative overflow-hidden"
          style={
            showDefeat
              ? {
                  borderColor: "oklch(0.6 0.28 20 / 0.7)",
                  background: "oklch(0.1 0.04 20 / 0.85)",
                  boxShadow:
                    "0 0 40px oklch(0.6 0.28 20 / 0.3), inset 0 0 60px oklch(0.1 0.04 20 / 0.5)",
                }
              : {
                  borderColor: "oklch(0.75 0.25 145 / 0.7)",
                  background: "oklch(0.08 0.04 145 / 0.85)",
                  boxShadow:
                    "0 0 40px oklch(0.75 0.25 145 / 0.3), inset 0 0 60px oklch(0.08 0.04 145 / 0.5)",
                }
          }
        >
          {/* Decorative corner lines */}
          <div
            className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 pointer-events-none"
            style={{
              borderColor: showDefeat
                ? "oklch(0.6 0.28 20)"
                : "oklch(0.75 0.25 145)",
            }}
          />
          <div
            className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 pointer-events-none"
            style={{
              borderColor: showDefeat
                ? "oklch(0.6 0.28 20)"
                : "oklch(0.75 0.25 145)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 pointer-events-none"
            style={{
              borderColor: showDefeat
                ? "oklch(0.6 0.28 20)"
                : "oklch(0.75 0.25 145)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 pointer-events-none"
            style={{
              borderColor: showDefeat
                ? "oklch(0.6 0.28 20)"
                : "oklch(0.75 0.25 145)",
            }}
          />

          {/* Status icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={
              showDefeat
                ? {
                    background: "oklch(0.6 0.28 20 / 0.15)",
                    border: "2px solid oklch(0.6 0.28 20 / 0.5)",
                    boxShadow: "0 0 20px oklch(0.6 0.28 20 / 0.3)",
                  }
                : {
                    background: "oklch(0.75 0.25 145 / 0.15)",
                    border: "2px solid oklch(0.75 0.25 145 / 0.5)",
                    boxShadow: "0 0 20px oklch(0.75 0.25 145 / 0.3)",
                  }
            }
          >
            {showDefeat ? (
              <Zap
                className="w-8 h-8"
                style={{ color: "oklch(0.6 0.28 20)" }}
              />
            ) : (
              <Shield
                className="w-8 h-8"
                style={{ color: "oklch(0.75 0.25 145)" }}
              />
            )}
          </div>

          {/* Status title */}
          <h1
            className="text-2xl md:text-3xl font-black font-display tracking-tight mb-1"
            style={
              showDefeat
                ? {
                    color: "oklch(0.7 0.28 20)",
                    textShadow:
                      "0 0 20px oklch(0.6 0.28 20), 0 0 40px oklch(0.6 0.28 20 / 0.5)",
                  }
                : {
                    color: "oklch(0.82 0.22 145)",
                    textShadow:
                      "0 0 20px oklch(0.75 0.25 145), 0 0 40px oklch(0.75 0.25 145 / 0.5)",
                  }
            }
          >
            {showDefeat ? "⚡ SISTEMA COMPROMETIDO" : "✅ SISTEMA RESTAURADO"}
          </h1>

          {/* Status subtitle */}
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{
              color: showDefeat ? "oklch(0.55 0.18 20)" : "oklch(0.6 0.2 145)",
            }}
          >
            {showDefeat
              ? "Identidad Digital Vulnerada"
              : "Identidad Digital Protegida"}
          </p>

          {/* Surrendered info */}
          {gameState.surrenderedPlayerId !== null && (
            <p className="text-[10px] text-muted-foreground mt-2">
              🏳️ Jugador se rindió
            </p>
          )}
        </div>

        {/* ── Winner card ── */}
        {winner && winnerHero && (
          <div
            className="animate-float-in mb-5 rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-sm p-5 w-full text-center"
            style={{
              animationDelay: "0.1s",
              boxShadow: "0 0 20px oklch(0.75 0.25 145 / 0.15)",
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              {isPerDevice && !showDefeat ? "¡Eres el ganador!" : "Ganador"}
            </p>
            <div className="flex items-center gap-3 justify-center mb-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_15px_oklch(0.75_0.25_145/0.4)] flex-shrink-0">
                <img
                  src={winnerHero.image}
                  alt={winnerHero.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold font-display text-foreground leading-tight">
                  {winner.name}
                </h2>
                <p className="text-xs text-primary">{winnerHero.name}</p>
                <p className="text-[9px] text-muted-foreground">
                  {winnerHero.title}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
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

        {/* ── Other players (losers) ── */}
        <div
          className="animate-float-in mb-5 w-full"
          style={{ animationDelay: "0.15s" }}
        >
          <h3 className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2 text-center">
            Otros Jugadores
          </h3>
          <div className="flex flex-col gap-2">
            {gameState.players
              .filter((p) => p.id !== gameState.winnerId)
              .map((player) => {
                const hero = getHeroById(player.heroId);
                const isThisDevice =
                  isPerDevice && player.id === localPlayer?.id;
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 rounded-lg border bg-card/30 p-2.5"
                    style={{
                      borderColor: isThisDevice
                        ? "oklch(0.6 0.28 20 / 0.4)"
                        : "oklch(0.2 0.02 240)",
                      background: isThisDevice
                        ? "oklch(0.12 0.04 20 / 0.4)"
                        : undefined,
                    }}
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
                        {isThisDevice && (
                          <span className="ml-1 text-[9px] text-muted-foreground">
                            (Tú)
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {hero?.name}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: "oklch(0.6 0.28 20)" }}
                    >
                      OFFLINE
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div
          className="animate-float-in flex flex-col gap-3 w-full"
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            size="lg"
            onClick={onPlayAgain}
            className="h-12 rounded-xl font-bold"
            style={{
              background: showDefeat
                ? "oklch(0.6 0.28 20)"
                : "oklch(0.75 0.25 145)",
              color: "oklch(0.08 0.02 240)",
            }}
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
    </div>
  );
}
