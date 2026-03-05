// ─── CardDetailOverlay ────────────────────────────────────────────────────────
// Full-screen blur overlay showing a card in detail when tapped/clicked.

import { BookOpen, Shield, Skull, X, Zap } from "lucide-react";
import React from "react";
import type { CardDefinition } from "../../game/gameTypes";

interface CardDetailOverlayProps {
  card: CardDefinition | null;
  onClose: () => void;
}

const TYPE_CONFIG = {
  villain: {
    color: "oklch(0.7 0.28 20)",
    border: "oklch(0.65 0.28 20)",
    bg: "oklch(0.15 0.08 20 / 0.9)",
    label: "VILLANO",
    Icon: Skull,
    glow: "0 0 40px oklch(0.65 0.28 20 / 0.5)",
  },
  defense: {
    color: "oklch(0.75 0.22 230)",
    border: "oklch(0.7 0.22 230)",
    bg: "oklch(0.14 0.06 230 / 0.9)",
    label: "DEFENSA",
    Icon: Shield,
    glow: "0 0 40px oklch(0.7 0.22 230 / 0.5)",
  },
  action: {
    color: "oklch(0.88 0.22 85)",
    border: "oklch(0.85 0.22 85)",
    bg: "oklch(0.18 0.08 85 / 0.9)",
    label: "ACCIÓN",
    Icon: Zap,
    glow: "0 0 40px oklch(0.85 0.22 85 / 0.5)",
  },
};

export default function CardDetailOverlay({
  card,
  onClose,
}: CardDetailOverlayProps) {
  if (!card) return null;

  const cfg = TYPE_CONFIG[card.type];
  const { Icon } = cfg;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        backdropFilter: "blur(12px)",
        background: "oklch(0.05 0.02 240 / 0.8)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-ocid="game.card_detail_overlay"
    >
      <div
        className="relative max-w-xs w-full mx-4 card-blur-in"
        style={{
          borderRadius: 20,
          border: `2px solid ${cfg.border}`,
          background: "oklch(0.1 0.03 240)",
          boxShadow: `${cfg.glow}, 0 20px 60px oklch(0 0 0 / 0.7)`,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-border/80 flex items-center justify-center transition-all"
          data-ocid="game.card_detail_close_button"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Card image */}
        <div
          className="relative rounded-t-[18px] overflow-hidden"
          style={{ height: 200 }}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 40%, oklch(0.1 0.03 240) 100%)",
            }}
          />
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
              style={{
                background: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.border}`,
                boxShadow: `0 0 10px ${cfg.border} / 0.4`,
              }}
            >
              <Icon style={{ width: 10, height: 10 }} />
              {cfg.label}
            </div>
          </div>
          {/* Power badge */}
          {card.power !== undefined && (
            <div
              className="absolute top-3 right-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
              style={{
                background: "oklch(0.65 0.28 20 / 0.9)",
                color: "#fff",
                boxShadow: "0 0 12px oklch(0.65 0.28 20 / 0.7)",
              }}
            >
              {card.power}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="p-4 flex flex-col gap-3">
          {/* Name */}
          <h3
            className="text-xl font-black font-display leading-tight"
            style={{
              color: cfg.color,
              textShadow: `0 0 12px ${cfg.color}`,
            }}
          >
            {card.name}
          </h3>

          {/* Effect */}
          <div
            className="p-3 rounded-xl"
            style={{
              background: "oklch(0.14 0.03 240)",
              border: "1px solid oklch(0.22 0.03 240)",
            }}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-bold">
              Efecto
            </p>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {card.description}
            </p>
          </div>

          {/* Didactic text */}
          {card.didacticText && (
            <div
              className="p-3 rounded-xl"
              style={{
                background: "oklch(0.75 0.25 145 / 0.05)",
                border: "1px solid oklch(0.75 0.25 145 / 0.25)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen
                  className="w-3 h-3"
                  style={{ color: "oklch(0.75 0.25 145)" }}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "oklch(0.75 0.25 145)" }}
                >
                  Dato Didáctico
                </span>
              </div>
              <p
                className="text-[11px] italic leading-relaxed"
                style={{ color: "oklch(0.75 0.22 145)" }}
              >
                "{card.didacticText}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
