// ─── GameCard Component ──────────────────────────────────────────────────────
// Single card visual. Memoized for performance.
// Props are clean and self-contained — easy to reuse anywhere.

import { Cpu, Shield, Skull, Zap } from "lucide-react";
import React from "react";
import type { CardDefinition } from "../../game/gameTypes";

interface GameCardProps {
  card: CardDefinition;
  isSelected?: boolean;
  isPlayable?: boolean;
  isFaceDown?: boolean;
  isAttacking?: boolean;
  isDefending?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showDidactic?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-[80px] h-[112px]",
  md: "w-[120px] h-[168px]",
  lg: "w-[160px] h-[224px]",
};

const SIZE_TEXT = {
  sm: { name: "text-[7px]", body: "text-[6px]", badge: "text-[8px]" },
  md: { name: "text-[9px]", body: "text-[7px]", badge: "text-[10px]" },
  lg: { name: "text-[11px]", body: "text-[9px]", badge: "text-[12px]" },
};

function getTypeStyle(type: CardDefinition["type"]) {
  switch (type) {
    case "villain":
      return {
        borderClass: "card-villain-border",
        bgGradient:
          "from-[oklch(0.15_0.08_20)] via-[oklch(0.1_0.04_20)] to-[oklch(0.08_0.02_240)]",
        iconColor: "text-red-400",
        Icon: Skull,
        labelColor: "neon-text-red",
        label: "VILLANO",
      };
    case "defense":
      return {
        borderClass: "card-defense-border",
        bgGradient:
          "from-[oklch(0.14_0.06_230)] via-[oklch(0.1_0.04_230)] to-[oklch(0.08_0.02_240)]",
        iconColor: "text-blue-400",
        Icon: Shield,
        labelColor: "neon-text-blue",
        label: "DEFENSA",
      };
    case "action":
      return {
        borderClass: "card-action-border",
        bgGradient:
          "from-[oklch(0.18_0.08_85)] via-[oklch(0.12_0.04_85)] to-[oklch(0.08_0.02_240)]",
        iconColor: "text-yellow-400",
        Icon: Zap,
        labelColor: "neon-text-yellow",
        label: "ACCIÓN",
      };
  }
}

const GameCard = React.memo(function GameCard({
  card,
  isSelected = false,
  isPlayable = false,
  isFaceDown = false,
  isAttacking = false,
  isDefending = false,
  onClick,
  size = "md",
  showDidactic = false,
}: GameCardProps) {
  const style = getTypeStyle(card.type);
  const sizeClass = SIZE_CLASSES[size];
  const textSize = SIZE_TEXT[size];

  const animClass = isAttacking
    ? "card-attacking"
    : isDefending
      ? "card-defending"
      : "";

  if (isFaceDown) {
    return (
      <div
        className={`${sizeClass} rounded-lg card-defense-border bg-gradient-to-b from-[oklch(0.12_0.04_240)] to-[oklch(0.08_0.02_240)] cursor-default flex items-center justify-center flex-shrink-0`}
      >
        <Cpu className="w-1/3 h-1/3 text-primary/40" />
      </div>
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        ${sizeClass} ${style.borderClass} ${animClass}
        rounded-lg bg-gradient-to-b ${style.bgGradient}
        flex flex-col overflow-hidden flex-shrink-0
        transition-all duration-200
        ${isSelected ? "translate-y-[-8px] scale-[1.04] brightness-125" : ""}
        ${isPlayable && !isSelected ? "cursor-pointer hover:-translate-y-1 hover:brightness-110" : ""}
        ${!isPlayable ? "opacity-80" : ""}
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Name banner */}
      <div className="px-1 py-0.5 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <p
          className={`${textSize.name} font-bold text-foreground leading-tight truncate`}
        >
          {card.name}
        </p>
        <p
          className={`${textSize.body} ${style.labelColor} uppercase tracking-wide`}
        >
          {style.label}
        </p>
      </div>

      {/* Power badge (top right) */}
      {card.power !== undefined && (
        <div
          className={
            "absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 border border-red-500/60 flex items-center justify-center"
          }
          style={{
            width: size === "sm" ? 14 : size === "md" ? 18 : 22,
            height: size === "sm" ? 14 : size === "md" ? 18 : 22,
          }}
        >
          <span
            className={`${textSize.badge} font-black neon-text-red leading-none`}
          >
            {card.power}
          </span>
        </div>
      )}

      {/* Illustration */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={card.image}
          alt={card.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
        <style.Icon
          className={`absolute bottom-1 right-1 ${style.iconColor} opacity-70`}
          style={{
            width: size === "sm" ? 10 : size === "md" ? 14 : 18,
            height: size === "sm" ? 10 : size === "md" ? 14 : 18,
          }}
        />
      </div>

      {/* Description */}
      <div className="px-1 py-0.5 bg-black/60 border-t border-white/10">
        <p
          className={`${textSize.body} text-foreground/80 leading-tight`}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: size === "sm" ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.description}
        </p>
        {showDidactic && card.didacticText && size !== "sm" && (
          <>
            <div className="border-t border-dashed border-white/20 my-0.5" />
            <p
              className={`${textSize.body} text-foreground/50 italic leading-tight`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              📚 {card.didacticText}
            </p>
          </>
        )}
      </div>
    </div>
  );
});

export default GameCard;
