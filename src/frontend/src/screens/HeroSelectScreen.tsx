// ─── HeroSelectScreen ────────────────────────────────────────────────────────
// Each player selects a hero sequentially. Shows passive ability info.
// In multiplayer per-device mode: polls room state to show taken heroes.

import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { HEROES } from "../data/heroes";
import type { HeroId } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";
import { useHeroSelectionSync } from "../hooks/useGameSync";

interface HeroSelectScreenProps {
  playerCount: number;
  heroSelectStep: number;
  heroSelections: (HeroId | null)[];
  onSelectHero: (heroId: HeroId) => void;
  onConfirm: () => void;
  isAIMode?: boolean;
  /** True when this device is one of several in a multiplayer session */
  isMultiplayerDevice?: boolean;
  /** This device's player index (used in multiplayer mode) */
  localPlayerIndex?: number;
  /** Heroes already chosen by other devices (shown as "En uso") */
  externalTakenHeroes?: HeroId[];
  /** Room code for multiplayer hero sync */
  roomCode?: string | null;
  /** This player's id for multiplayer hero sync */
  myPlayerId?: string | null;
  /** Called when hero selection changes in multiplayer mode (to publish to room) */
  onHeroChange?: (heroId: HeroId) => void;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  Defensa: Shield,
  Utilidad: Zap,
  Soporte: Eye,
  "Soporte/Recuperación": Wrench,
};

const HERO_BG_COLORS: Record<string, string> = {
  green: "from-green-900/30 to-transparent border-green-500/30",
  yellow: "from-yellow-900/30 to-transparent border-yellow-500/30",
  blue: "from-blue-900/30 to-transparent border-blue-500/30",
  purple: "from-purple-900/30 to-transparent border-purple-500/30",
};

const HERO_SELECTED_COLORS: Record<string, string> = {
  green: "border-green-400 shadow-[0_0_20px_oklch(0.75_0.25_145/0.5)]",
  yellow: "border-yellow-400 shadow-[0_0_20px_oklch(0.85_0.22_85/0.5)]",
  blue: "border-blue-400 shadow-[0_0_20px_oklch(0.7_0.22_230/0.5)]",
  purple: "border-purple-400 shadow-[0_0_20px_oklch(0.7_0.18_290/0.5)]",
};

export default function HeroSelectScreen({
  playerCount,
  heroSelectStep,
  heroSelections,
  onSelectHero,
  onConfirm,
  isAIMode = false,
  isMultiplayerDevice = false,
  localPlayerIndex = 0,
  externalTakenHeroes = [],
  roomCode = null,
  myPlayerId = null,
  onHeroChange,
}: HeroSelectScreenProps) {
  const [_hoveredId, setHoveredId] = useState<HeroId | null>(null);
  const { actor } = useActor();

  // Poll for heroes selected by other devices in multiplayer
  const { takenHeroes: syncedTakenHeroes } = useHeroSelectionSync({
    roomCode: isMultiplayerDevice ? (roomCode ?? null) : null,
    myPlayerId: myPlayerId ?? "",
    actor,
    enabled: isMultiplayerDevice && !!roomCode && !!myPlayerId,
  });

  const takenHeroes = heroSelections
    .slice(0, heroSelectStep)
    .filter(Boolean) as HeroId[];

  const currentSelection = heroSelections[heroSelectStep];

  // Merge external taken heroes from props AND from live sync
  const allExternalTaken = [
    ...externalTakenHeroes,
    ...syncedTakenHeroes,
  ] as HeroId[];

  // In AI mode or multiplayer per-device, only show player 1 selection step indicator
  const displayPlayerCount = isAIMode || isMultiplayerDevice ? 1 : playerCount;

  const handleHeroSelect = (heroId: HeroId) => {
    onSelectHero(heroId);
    if (onHeroChange) {
      onHeroChange(heroId);
    }
  };

  return (
    <div className="min-h-screen circuit-bg flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6 animate-float-in">
        <div className="flex items-center justify-center gap-2 mb-1">
          {Array.from({ length: displayPlayerCount }, (_, i) => i).map((i) => (
            <div
              key={`player-step-${i}`}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all
                ${
                  i < heroSelectStep
                    ? "border-primary bg-primary/20 text-primary"
                    : i === heroSelectStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                }`}
            >
              {i < heroSelectStep ? "✓" : i + 1}
            </div>
          ))}
        </div>
        <h2 className="text-2xl md:text-3xl font-black font-display neon-text-green">
          {isAIMode
            ? "¡Elige tu Héroe!"
            : isMultiplayerDevice
              ? `Jugador ${localPlayerIndex + 1} — Elige tu Héroe`
              : `Jugador ${heroSelectStep + 1}`}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isAIMode
            ? "La IA elegirá su héroe automáticamente"
            : isMultiplayerDevice
              ? "Cada jugador elige su héroe en su dispositivo"
              : "Elige tu Héroe Guardián"}
        </p>
        {isAIMode && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1">
            <span>🤖</span>
            <span>Modo 1 Jugador vs IA</span>
          </div>
        )}
        {isMultiplayerDevice && !isAIMode && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1">
            <span>🌐</span>
            <span>
              Partida Multijugador · Dispositivo {localPlayerIndex + 1}
            </span>
          </div>
        )}
        {isMultiplayerDevice && syncedTakenHeroes.length > 0 && (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1">
            <span>🔒</span>
            <span>
              {syncedTakenHeroes.length} héroe(s) tomados por otros jugadores
            </span>
          </div>
        )}
      </div>

      {/* Hero grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 w-full max-w-2xl animate-float-in"
        style={{ animationDelay: "0.1s" }}
      >
        {HEROES.map((hero, idx) => {
          const isTakenLocally = takenHeroes.includes(hero.id);
          const isTakenExternally = allExternalTaken.includes(hero.id);
          const isTaken = isTakenLocally || isTakenExternally;
          const isSelected = currentSelection === hero.id;
          const RoleIcon = ROLE_ICONS[hero.role] ?? Shield;

          return (
            <button
              type="button"
              key={hero.id}
              disabled={isTaken}
              onClick={() => !isTaken && handleHeroSelect(hero.id)}
              onMouseEnter={() => setHoveredId(hero.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                relative flex flex-col rounded-xl border bg-gradient-to-b
                transition-all duration-200 overflow-hidden text-left
                ${HERO_BG_COLORS[hero.color]}
                ${
                  isTaken
                    ? "opacity-40 grayscale cursor-not-allowed"
                    : isSelected
                      ? HERO_SELECTED_COLORS[hero.color]
                      : "hover:scale-[1.02] hover:brightness-110 cursor-pointer border-border/60"
                }
              `}
              data-ocid={`hero_select.hero_card.${idx + 1}`}
            >
              {/* Image */}
              <div className="relative w-full aspect-[3/4] overflow-hidden">
                <img
                  src={hero.image}
                  alt={hero.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Taken overlay — locally taken */}
                {isTakenLocally && !isTakenExternally && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Taken overlay — externally taken (by another device) */}
                {isTakenExternally && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-1">
                    <Lock className="w-6 h-6 text-orange-400" />
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      En uso
                    </span>
                  </div>
                )}

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-5 h-5 text-primary drop-shadow-[0_0_6px_oklch(0.75_0.25_145)]" />
                  </div>
                )}

                {/* Role badge */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <RoleIcon className="w-3 h-3 text-foreground/60" />
                  <span className="text-[9px] text-foreground/60 uppercase tracking-wide">
                    {hero.role}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-[10px] font-bold text-foreground leading-tight">
                  {hero.name}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                  {hero.passiveDescription}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <div
        className="flex flex-col items-center gap-2 animate-float-in"
        style={{ animationDelay: "0.2s" }}
      >
        <Button
          size="lg"
          disabled={!currentSelection}
          onClick={onConfirm}
          className="bg-primary text-primary-foreground font-bold text-base h-12 px-8 rounded-xl disabled:opacity-50"
          data-ocid="hero_select.confirm_button"
        >
          {isAIMode
            ? "¡Jugar vs IA!"
            : isMultiplayerDevice
              ? "¡Confirmar y Entrar!"
              : "Confirmar Héroe"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
        {!currentSelection && (
          <p className="text-[10px] text-muted-foreground">
            Selecciona un héroe para continuar
          </p>
        )}
      </div>
    </div>
  );
}
