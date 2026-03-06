// ─── DefenseTimerOverlay ──────────────────────────────────────────────────────
// Circular countdown timer shown when a pending attack is waiting for defense.
// Colors: green (10-7s) → orange (6-4s) → red (3-0s)
// Auto-resolves if timer reaches 0.
// When no defense cards: shows "Asumiendo daño en X segundos..." with a
// prominent "⚡ Aceptar daño ahora" button.
// When defense cards ARE available: shows timer + cards + quick accept button.

import React, { useEffect, useRef, useState } from "react";
import type { AttackContext, CardDefinition } from "../../game/gameTypes";

interface DefenseTimerOverlayProps {
  pendingAttack: AttackContext;
  defenseCards: CardDefinition[];
  onDefend: (card: CardDefinition) => void;
  onSkipDefense: () => void;
}

const TIMER_DURATION = 10;
const CIRCLE_RADIUS = 44;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function getTimerColor(timeLeft: number): string {
  if (timeLeft >= 7) return "oklch(0.75 0.25 145)"; // green
  if (timeLeft >= 4) return "oklch(0.85 0.22 65)"; // orange
  return "oklch(0.7 0.28 20)"; // red
}

function getTimerTextColor(timeLeft: number): string {
  if (timeLeft >= 7) return "#22c55e";
  if (timeLeft >= 4) return "#f97316";
  return "#ef4444";
}

export default function DefenseTimerOverlay({
  pendingAttack,
  defenseCards,
  onDefend,
  onSkipDefense,
}: DefenseTimerOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const autoResolvedRef = useRef(false);
  const hasDefenseCards = defenseCards.length > 0;

  // Reset timer when a new attack comes in
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — reset on attack change only
  useEffect(() => {
    setTimeLeft(TIMER_DURATION);
    autoResolvedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAttack.card.id, pendingAttack.attackingPlayerId]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!autoResolvedRef.current) {
        autoResolvedRef.current = true;
        onSkipDefense();
      }
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, onSkipDefense]);

  const progress = timeLeft / TIMER_DURATION;
  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  const timerColor = getTimerColor(timeLeft);
  const textColor = getTimerTextColor(timeLeft);
  const isUrgent = timeLeft <= 3;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto"
      style={{
        background: "oklch(0.05 0.04 240 / 0.95)",
        backdropFilter: "blur(12px)",
      }}
      data-ocid="game.defense_timer_overlay"
    >
      {/* Background danger flicker on urgent */}
      {isUrgent && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, oklch(0.65 0.28 20 / 0.12) 0%, transparent 70%)",
            animation: "timer-urgent-pulse 0.4s ease-in-out infinite",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-5 px-3 py-4 w-full max-w-xs">
        {/* Attack info */}
        <div className="text-center">
          <p
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ color: "oklch(0.65 0.28 20)" }}
          >
            ⚔️ ¡ATAQUE ENTRANTE!
          </p>
          <h3 className="text-base md:text-lg font-black font-display text-foreground">
            {pendingAttack.card.name}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {pendingAttack.card.description}
          </p>
        </div>

        {/* Circular timer — smaller on mobile */}
        <div
          className="relative flex items-center justify-center flex-shrink-0"
          style={{ width: 90, height: 90 }}
        >
          <svg
            width="90"
            height="90"
            viewBox="0 0 110 110"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx="55"
              cy="55"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="oklch(0.2 0.02 240)"
              strokeWidth="8"
            />
            <circle
              cx="55"
              cy="55"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={timerColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 0.9s linear, stroke 0.5s ease",
                filter: `drop-shadow(0 0 6px ${timerColor})`,
              }}
            />
          </svg>

          {/* Number */}
          <div className="flex flex-col items-center">
            <span
              className="text-3xl font-black font-mono leading-none"
              style={{
                color: textColor,
                textShadow: `0 0 15px ${textColor}`,
                ...(isUrgent
                  ? {
                      animation: "timer-urgent-pulse 0.4s ease-in-out infinite",
                    }
                  : {}),
              }}
            >
              {timeLeft}
            </span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">
              seg.
            </span>
          </div>
        </div>

        {/* No defense cards: prominent "assuming damage" state */}
        {!hasDefenseCards && (
          <div className="text-center w-full">
            <div
              className="px-3 py-2 rounded-xl border mb-3"
              style={{
                background: "oklch(0.12 0.06 20 / 0.5)",
                borderColor: "oklch(0.65 0.28 20 / 0.4)",
              }}
            >
              <p
                className="text-xs font-bold"
                style={{ color: "oklch(0.75 0.28 20)" }}
              >
                Sin cartas de defensa
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "oklch(0.65 0.28 20 / 0.8)" }}
              >
                Asumiendo daño en {timeLeft} segundo{timeLeft !== 1 ? "s" : ""}
                ...
              </p>
            </div>
            {/* Prominent accept damage button */}
            <button
              type="button"
              onClick={onSkipDefense}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: "oklch(0.55 0.28 20)",
                color: "oklch(0.98 0.01 240)",
                boxShadow: "0 0 20px oklch(0.65 0.28 20 / 0.5)",
                border: "1px solid oklch(0.65 0.28 20 / 0.6)",
              }}
              data-ocid="game.accept_damage_button"
            >
              ⚡ Aceptar daño ahora
            </button>
          </div>
        )}

        {/* Defense cards — scrollable row on mobile */}
        {hasDefenseCards && (
          <div className="w-full">
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mb-1.5">
              Selecciona una defensa
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 justify-start md:justify-center px-1">
              {defenseCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onDefend(card)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: "oklch(0.7 0.22 230)",
                    background: "oklch(0.14 0.06 230 / 0.8)",
                    boxShadow: "0 0 12px oklch(0.7 0.22 230 / 0.4)",
                    minWidth: 60,
                    maxWidth: 80,
                  }}
                  data-ocid={`game.defense_card_button.${card.id}`}
                >
                  <div
                    className="rounded overflow-hidden"
                    style={{ width: 44, height: 58 }}
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p
                    className="text-[8px] font-bold text-center leading-tight"
                    style={{ color: "oklch(0.75 0.22 230)" }}
                  >
                    {card.name}
                  </p>
                </button>
              ))}
            </div>

            {/* Quick accept damage shortcut — available even when cards exist */}
            <button
              type="button"
              onClick={onSkipDefense}
              className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: "oklch(0.55 0.28 20)",
                color: "oklch(0.98 0.01 240)",
                boxShadow: "0 0 16px oklch(0.65 0.28 20 / 0.4)",
                border: "1px solid oklch(0.65 0.28 20 / 0.5)",
              }}
              data-ocid="game.skip_defense_button"
            >
              ⚡ Aceptar daño ahora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
