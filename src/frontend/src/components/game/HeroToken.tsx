// ─── HeroToken Component ─────────────────────────────────────────────────────
// Compact hero display with aura colors, hit/defend/activate animations.

import { Crown } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { HeroDefinition } from "../../game/gameTypes";

// Hero color map (neon colors per hero)
const HERO_NEON: Record<string, string> = {
  pudu: "oklch(0.75 0.25 145)", // neon green
  zorro: "oklch(0.88 0.22 85)", // neon yellow/gold
  lechuza: "oklch(0.75 0.22 230)", // neon blue
  gato: "oklch(0.72 0.25 290)", // neon purple
};

type HeroEvent = "activate" | "hit" | "defend" | null;

interface HeroTokenProps {
  hero: HeroDefinition;
  isCurrentTurn?: boolean;
  isOffline?: boolean;
  size?: "sm" | "md";
  showActivation?: boolean;
  activationMessage?: string;
  isHit?: boolean;
  isDefending?: boolean;
  badgeMessage?: string;
}

export default function HeroToken({
  hero,
  isCurrentTurn = false,
  isOffline = false,
  size = "md",
  showActivation = false,
  activationMessage,
  isHit = false,
  isDefending = false,
  badgeMessage,
}: HeroTokenProps) {
  const imgSize = size === "sm" ? 36 : 48;
  const neonColor = HERO_NEON[hero.id] ?? "oklch(0.75 0.25 145)";

  const [currentEvent, setCurrentEvent] = useState<HeroEvent>(null);
  const [visibleBadge, setVisibleBadge] = useState<string | null>(null);

  // Track animation events
  useEffect(() => {
    if (showActivation) {
      setCurrentEvent("activate");
      setVisibleBadge(activationMessage ?? "⚡ DEFINITIVA");
      const t = setTimeout(() => {
        setCurrentEvent(null);
        setVisibleBadge(null);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [showActivation, activationMessage]);

  useEffect(() => {
    if (isHit) {
      setCurrentEvent("hit");
      setVisibleBadge(badgeMessage ?? "💀 ¡Daño!");
      const t = setTimeout(() => {
        setCurrentEvent(null);
        setVisibleBadge(null);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isHit, badgeMessage]);

  useEffect(() => {
    if (isDefending) {
      setCurrentEvent("defend");
      setVisibleBadge(badgeMessage ?? "🛡️ ¡Bloqueado!");
      const t = setTimeout(() => {
        setCurrentEvent(null);
        setVisibleBadge(null);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isDefending, badgeMessage]);

  const getAnimClass = () => {
    switch (currentEvent) {
      case "activate":
        return "hero-activate-anim";
      case "hit":
        return "hero-hit-anim";
      case "defend":
        return "hero-defend-anim";
      default:
        return "";
    }
  };

  const getBoxShadow = () => {
    switch (currentEvent) {
      case "activate":
        return `0 0 20px ${neonColor}, 0 0 40px ${neonColor}`;
      case "defend":
        return `0 0 25px ${neonColor}, 0 0 50px ${neonColor}, inset 0 0 15px ${neonColor}`;
      case "hit":
        return "0 0 20px oklch(0.7 0.28 20), 0 0 40px oklch(0.65 0.28 20 / 0.5)";
      default:
        return isCurrentTurn ? `0 0 12px ${neonColor} / 0.5` : "none";
    }
  };

  const getBorderColor = () => {
    switch (currentEvent) {
      case "activate":
        return neonColor;
      case "defend":
        return neonColor;
      case "hit":
        return "oklch(0.7 0.28 20)";
      default:
        return isCurrentTurn ? neonColor : "oklch(0.25 0.03 240)";
    }
  };

  const getBadgeColor = () => {
    switch (currentEvent) {
      case "hit":
        return { bg: "oklch(0.65 0.28 20)", text: "#fff" };
      case "defend":
        return { bg: neonColor, text: "oklch(0.08 0.02 240)" };
      default:
        return { bg: neonColor, text: "oklch(0.08 0.02 240)" };
    }
  };

  const badgeColors = getBadgeColor();

  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${isOffline ? "opacity-40 grayscale" : ""}`}
    >
      {/* Aura ring (always present, dim when inactive) */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: imgSize + 12,
          height: imgSize + 12,
          top: -6,
          left: -6,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${neonColor} 0%, transparent 65%)`,
          opacity: currentEvent ? 0.5 : isCurrentTurn ? 0.2 : 0.06,
          transition: "opacity 0.4s ease",
          animation:
            currentEvent || isCurrentTurn
              ? "aura-pulse 2s ease-in-out infinite"
              : "none",
        }}
      />

      {/* Floating badge */}
      {visibleBadge && (
        <div
          className="absolute pointer-events-none z-20 whitespace-nowrap badge-bounce-anim"
          style={{
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: badgeColors.bg,
            color: badgeColors.text,
            fontSize: 8,
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: 4,
            boxShadow: `0 0 10px ${badgeColors.bg}`,
            marginBottom: 4,
          }}
        >
          {visibleBadge}
        </div>
      )}

      <div
        className={`rounded-full overflow-hidden border-2 transition-all duration-300 ${getAnimClass()} ${
          isCurrentTurn && !currentEvent ? "animate-pulse-glow" : ""
        } ${isOffline ? "opacity-50" : ""}`}
        style={{
          width: imgSize,
          height: imgSize,
          borderColor: getBorderColor(),
          boxShadow: getBoxShadow(),
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <img
          src={hero.image}
          alt={hero.name}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="flex items-center gap-0.5">
        {isCurrentTurn && <Crown className="w-2.5 h-2.5 text-primary" />}
        <span className="text-[9px] text-foreground/80 truncate max-w-[60px]">
          {hero.name.split('"')[1] ?? hero.name.split(" ")[0]}
        </span>
      </div>
      {isOffline && (
        <span className="text-[8px] neon-text-red font-bold uppercase">
          OFFLINE
        </span>
      )}
    </div>
  );
}
