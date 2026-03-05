// ─── GameCard Component ──────────────────────────────────────────────────────
// Full TCG-style card with type-specific framing, glowing borders, art area,
// power badge, and didactic footer. Memoized for performance.

import { Shield, Skull, Zap } from "lucide-react";
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

// Card frame colors per type
const TYPE_CONFIG = {
  villain: {
    outerBorder: "#e53935",
    innerBorder: "#ff6b6b",
    topGradient:
      "linear-gradient(135deg, #8b0000 0%, #3d0000 50%, #1a0000 100%)",
    artOverlay:
      "linear-gradient(to bottom, transparent 55%, rgba(30,0,0,0.95) 100%)",
    textBoxBg: "rgba(20,0,0,0.92)",
    badgeBg: "#7b0000",
    badgeBorder: "#ff4444",
    badgeText: "#ff9999",
    labelColor: "#ff4444",
    label: "VILLANO",
    Icon: Skull,
    iconColor: "#ff4444",
    cornerAccent: "#ff2222",
    glowColor: "rgba(229,57,53,0.6)",
    headerGradient: "linear-gradient(90deg, #7b0000, #3d0000)",
    foilPattern:
      "radial-gradient(ellipse at 50% 50%, rgba(255,80,80,0.08) 0%, transparent 70%)",
  },
  defense: {
    outerBorder: "#1565c0",
    innerBorder: "#42a5f5",
    topGradient:
      "linear-gradient(135deg, #003087 0%, #001a4a 50%, #000d26 100%)",
    artOverlay:
      "linear-gradient(to bottom, transparent 55%, rgba(0,10,30,0.95) 100%)",
    textBoxBg: "rgba(0,10,30,0.92)",
    badgeBg: "#003087",
    badgeBorder: "#42a5f5",
    badgeText: "#90caf9",
    labelColor: "#42a5f5",
    label: "DEFENSA",
    Icon: Shield,
    iconColor: "#42a5f5",
    cornerAccent: "#2196f3",
    glowColor: "rgba(21,101,192,0.6)",
    headerGradient: "linear-gradient(90deg, #003087, #001a4a)",
    foilPattern:
      "radial-gradient(ellipse at 50% 50%, rgba(66,165,245,0.08) 0%, transparent 70%)",
  },
  action: {
    outerBorder: "#f57f17",
    innerBorder: "#ffca28",
    topGradient:
      "linear-gradient(135deg, #7a4000 0%, #3d2000 50%, #1a0e00 100%)",
    artOverlay:
      "linear-gradient(to bottom, transparent 55%, rgba(20,10,0,0.95) 100%)",
    textBoxBg: "rgba(20,10,0,0.92)",
    badgeBg: "#7a4000",
    badgeBorder: "#ffca28",
    badgeText: "#ffe082",
    labelColor: "#ffca28",
    label: "ACCIÓN",
    Icon: Zap,
    iconColor: "#ffca28",
    cornerAccent: "#ffc107",
    glowColor: "rgba(245,127,23,0.6)",
    headerGradient: "linear-gradient(90deg, #7a4000, #3d2000)",
    foilPattern:
      "radial-gradient(ellipse at 50% 50%, rgba(255,202,40,0.08) 0%, transparent 70%)",
  },
};

// Size dimensions
const SIZES = {
  sm: {
    w: 80,
    h: 112,
    nameSize: 6.5,
    bodySize: 5.5,
    badgeSize: 10,
    badgeDim: 14,
    borderW: 2,
  },
  md: {
    w: 120,
    h: 168,
    nameSize: 9,
    bodySize: 7,
    badgeSize: 13,
    badgeDim: 20,
    borderW: 2,
  },
  lg: {
    w: 160,
    h: 224,
    nameSize: 11,
    bodySize: 8.5,
    badgeSize: 15,
    badgeDim: 26,
    borderW: 3,
  },
};

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
  const cfg = TYPE_CONFIG[card.type];
  const dim = SIZES[size];

  const animClass = isAttacking
    ? "card-attacking"
    : isDefending
      ? "card-defending"
      : "";

  // ── Face-down back ──────────────────────────────────────────────────────
  if (isFaceDown) {
    return (
      <div
        className={`flex-shrink-0 rounded-lg overflow-hidden ${animClass}`}
        style={{
          width: dim.w,
          height: dim.h,
          border: `${dim.borderW}px solid #1e3a8f`,
          boxShadow: isSelected
            ? "0 0 0 2px #42a5f5, 0 0 20px rgba(66,165,245,0.6)"
            : "0 0 10px rgba(30,58,143,0.5)",
          position: "relative",
          cursor: onClick ? "pointer" : "default",
        }}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        <img
          src="/assets/generated/card-back-design.dim_400x560.png"
          alt="Carta"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // ── Art height proportions ───────────────────────────────────────────────
  const headerH = size === "sm" ? 22 : size === "md" ? 32 : 42;
  const footerH =
    size === "sm" ? 28 : size === "md" ? 44 : showDidactic ? 64 : 52;
  const artH = dim.h - headerH - footerH - dim.borderW * 2;

  return (
    <div
      data-ocid={`card.${card.id}.card`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex-shrink-0 ${animClass}`}
      style={{
        width: dim.w,
        height: dim.h,
        borderRadius: size === "sm" ? 6 : 8,
        border: `${dim.borderW}px solid ${cfg.outerBorder}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${cfg.innerBorder}, 0 0 20px ${cfg.glowColor}, 0 8px 24px rgba(0,0,0,0.8)`
          : isPlayable
            ? `0 0 12px ${cfg.glowColor}, 0 4px 12px rgba(0,0,0,0.6)`
            : "0 2px 8px rgba(0,0,0,0.6)",
        background: "#080808",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transform: isSelected ? "translateY(-8px) scale(1.04)" : undefined,
        opacity: !isPlayable && onClick ? 0.8 : 1,
        transition: "transform 0.18s, box-shadow 0.18s, opacity 0.18s",
        position: "relative",
        flexShrink: 0,
      }}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* ── Foil shimmer overlay ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: cfg.foilPattern,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* ── Inner frame line ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: dim.borderW + 1,
          borderRadius: size === "sm" ? 4 : 6,
          border: `1px solid ${cfg.innerBorder}33`,
          pointerEvents: "none",
          zIndex: 11,
        }}
      />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div
        style={{
          height: headerH,
          background: cfg.headerGradient,
          borderBottom: `1px solid ${cfg.outerBorder}55`,
          padding: size === "sm" ? "2px 3px" : "3px 5px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Circuit line decoration */}
        <div
          style={{
            position: "absolute",
            bottom: 2,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${cfg.cornerAccent}66, transparent)`,
          }}
        />
        <div
          style={{
            fontSize: dim.nameSize,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: size === "sm" ? 0 : 0.3,
            textShadow: `0 0 8px ${cfg.glowColor}`,
          }}
        >
          {card.name}
        </div>
        <div
          style={{
            fontSize: dim.nameSize - 1.5,
            fontWeight: 700,
            color: cfg.labelColor,
            letterSpacing: 1,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {cfg.label}
        </div>
      </div>

      {/* ── ART AREA ────────────────────────────────────────────────────── */}
      <div
        style={{
          height: artH,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          background: cfg.topGradient,
        }}
      >
        <img
          src={card.image}
          alt={card.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
          loading="lazy"
        />
        {/* Art gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: cfg.artOverlay,
          }}
        />
        {/* Type icon bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 3,
            right: 3,
            background: "rgba(0,0,0,0.7)",
            borderRadius: "50%",
            padding: 2,
            border: `1px solid ${cfg.innerBorder}44`,
          }}
        >
          <cfg.Icon
            style={{
              width: dim.w * 0.1,
              height: dim.w * 0.1,
              color: cfg.iconColor,
              opacity: 0.85,
            }}
          />
        </div>
        {/* Power badge (villain only) */}
        {card.power !== undefined && (
          <div
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: dim.badgeDim,
              height: dim.badgeDim,
              borderRadius: "50%",
              background: cfg.badgeBg,
              border: `2px solid ${cfg.badgeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 8px ${cfg.glowColor}`,
              zIndex: 5,
            }}
          >
            <span
              style={{
                fontSize: dim.badgeSize,
                fontWeight: 900,
                color: cfg.badgeText,
                lineHeight: 1,
                textShadow: `0 0 6px ${cfg.glowColor}`,
              }}
            >
              {card.power}
            </span>
          </div>
        )}
      </div>

      {/* ── TEXT BOX ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: cfg.textBoxBg,
          borderTop: `1px solid ${cfg.outerBorder}44`,
          padding: size === "sm" ? "2px 3px" : "3px 5px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: 1,
          overflow: "hidden",
        }}
      >
        <p
          style={{
            fontSize: dim.bodySize,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.35,
            margin: 0,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: size === "sm" ? 3 : 4,
            WebkitBoxOrient: "vertical",
          }}
        >
          {card.description}
        </p>

        {/* Didactic section */}
        {showDidactic && card.didacticText && size !== "sm" && (
          <>
            <div
              style={{
                borderTop: `1px dashed ${cfg.labelColor}44`,
                margin: "2px 0",
              }}
            />
            <p
              style={{
                fontSize: dim.bodySize - 0.5,
                color: cfg.labelColor,
                lineHeight: 1.3,
                margin: 0,
                fontStyle: "italic",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              📚 {card.didacticText}
            </p>
          </>
        )}
      </div>

      {/* ── BOTTOM CIRCUIT DECORATION ─────────────────────────────────── */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${cfg.outerBorder} 20%, ${cfg.innerBorder} 50%, ${cfg.outerBorder} 80%, transparent 100%)`,
          flexShrink: 0,
        }}
      />
    </div>
  );
});

export default GameCard;
