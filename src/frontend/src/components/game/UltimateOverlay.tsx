// ─── UltimateOverlay ─────────────────────────────────────────────────────────
// Full-screen overlay shown when a hero uses their ultimate ability.
// Animates hero entrance + ability name + effect.

import { type CSSProperties, useEffect, useState } from "react";
import type { HeroDefinition } from "../../game/gameTypes";

interface UltimateOverlayProps {
  hero: HeroDefinition;
  playerName: string;
  abilityName: string;
  abilityEffect: string;
  onDone: () => void;
}

const HERO_COLORS: Record<
  string,
  { primary: string; glow: string; bg: string }
> = {
  pudu: {
    primary: "oklch(0.75 0.25 145)",
    glow: "0 0 60px oklch(0.75 0.25 145 / 0.7), 0 0 120px oklch(0.75 0.25 145 / 0.3)",
    bg: "radial-gradient(circle at center, oklch(0.75 0.25 145 / 0.15) 0%, transparent 70%)",
  },
  zorro: {
    primary: "oklch(0.88 0.22 85)",
    glow: "0 0 60px oklch(0.88 0.22 85 / 0.7), 0 0 120px oklch(0.88 0.22 85 / 0.3)",
    bg: "radial-gradient(circle at center, oklch(0.88 0.22 85 / 0.15) 0%, transparent 70%)",
  },
  lechuza: {
    primary: "oklch(0.75 0.22 230)",
    glow: "0 0 60px oklch(0.75 0.22 230 / 0.7), 0 0 120px oklch(0.75 0.22 230 / 0.3)",
    bg: "radial-gradient(circle at center, oklch(0.75 0.22 230 / 0.15) 0%, transparent 70%)",
  },
  gato: {
    primary: "oklch(0.72 0.25 290)",
    glow: "0 0 60px oklch(0.72 0.25 290 / 0.7), 0 0 120px oklch(0.72 0.25 290 / 0.3)",
    bg: "radial-gradient(circle at center, oklch(0.72 0.25 290 / 0.15) 0%, transparent 70%)",
  },
};

const HERO_ULTIMATE_NAMES: Record<string, string> = {
  pudu: "CIFRADO TOTAL",
  zorro: "DENUNCIA CIUDADANA",
  lechuza: "BACKUP NOCTURNO",
  gato: "REINICIO DEL SISTEMA",
};

export default function UltimateOverlay({
  hero,
  playerName,
  abilityEffect,
  onDone,
}: UltimateOverlayProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const colors = HERO_COLORS[hero.id] ?? HERO_COLORS.pudu;
  const abilityName = HERO_ULTIMATE_NAMES[hero.id] ?? "HABILIDAD DEFINITIVA";

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("hold"), 600);
    const holdTimer = setTimeout(() => setPhase("exit"), 2400);
    const exitTimer = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "oklch(0.04 0.03 240 / 0.96)",
        backdropFilter: "blur(10px)",
        animation:
          phase === "exit"
            ? "ultimate-bg-pulse 0.3s ease-out reverse forwards"
            : "ultimate-bg-pulse 1.5s ease-in-out infinite",
      }}
      data-ocid="game.ultimate_overlay"
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: colors.bg }}
      />

      {/* Battle background faint */}
      <img
        src="/assets/generated/battle-background.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.08 }}
        aria-hidden="true"
      />

      {/* Sweep line */}
      <div
        className="absolute inset-y-0 pointer-events-none sweep-digital"
        style={{
          width: "80px",
          background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
          opacity: 0.6,
          left: 0,
        }}
      />

      {/* Particle ring */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 360;
          const tx = Math.cos((angle * Math.PI) / 180) * 180;
          const ty = Math.sin((angle * Math.PI) / 180) * 180;
          return (
            <div
              key={`up-${angle}`}
              className="absolute w-2 h-2 rounded-full"
              style={
                {
                  left: "50%",
                  top: "50%",
                  background: colors.primary,
                  "--tx": `${tx}px`,
                  "--ty": `${ty}px`,
                  animation: `particles-burst 1s ease-out ${i * 0.04}s forwards`,
                  boxShadow: `0 0 8px ${colors.primary}`,
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        {/* DEFINITIVA label */}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-80"
          style={{ color: colors.primary, animationDelay: "0.1s" }}
        >
          ✨ HABILIDAD DEFINITIVA
        </p>

        {/* Hero image */}
        <div
          className="ultimate-entrance-anim"
          style={{ animationDelay: "0.05s" }}
        >
          <div
            className="rounded-full overflow-hidden relative"
            style={{
              width: 120,
              height: 120,
              border: `3px solid ${colors.primary}`,
              boxShadow: colors.glow,
            }}
          >
            <img
              src={hero.image}
              alt={hero.name}
              className="w-full h-full object-cover object-top"
            />
            {/* Aura overlay */}
            <div
              className="absolute inset-0 rounded-full aura-pulse-anim"
              style={{
                background: `radial-gradient(circle at center, ${colors.primary} / 0.2 0%, transparent 70%)`,
              }}
            />
          </div>
        </div>

        {/* Player name */}
        <div className="turn-slide-in" style={{ animationDelay: "0.15s" }}>
          <p className="text-sm font-bold text-foreground/70">{playerName}</p>
        </div>

        {/* Ability name */}
        <div className="ultimate-text-anim" style={{ animationDelay: "0.2s" }}>
          <h2
            className="text-3xl md:text-5xl font-black font-display"
            style={{
              color: colors.primary,
              textShadow: `0 0 20px ${colors.primary}, 0 0 40px ${colors.primary} / 0.5`,
              letterSpacing: "0.08em",
            }}
          >
            {abilityName}
          </h2>
        </div>

        {/* Effect description */}
        <div
          className="turn-slide-in max-w-xs"
          style={{ animationDelay: "0.35s" }}
        >
          <p
            className="text-xs leading-relaxed px-3 py-2 rounded-xl"
            style={{
              background: `${colors.primary.replace("oklch(", "oklch(").replace(")", " / 0.08)")}`,
              border: `1px solid ${colors.primary.replace("oklch(", "oklch(").replace(")", " / 0.3)")}`,
              color: "oklch(0.9 0.02 240)",
            }}
          >
            {abilityEffect}
          </p>
        </div>
      </div>
    </div>
  );
}
