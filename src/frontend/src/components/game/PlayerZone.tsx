// ─── PlayerZone Component ────────────────────────────────────────────────────
// Displays one player's entire board area: hero, servers, and hand of cards.
// When it's NOT the player's turn, cards are shown face-down beside the hero.

import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, Zap } from "lucide-react";
import React, { useState } from "react";
import { getHeroById } from "../../data/heroes";
import type { CardDefinition, PlayerState } from "../../game/gameTypes";
import CardDetailOverlay from "./CardDetailOverlay";
import GameCard from "./GameCard";
import HeroToken from "./HeroToken";
import ServerTokens from "./ServerTokens";

// Tiny face-down card for opponent zones or waiting hand (xs size = 32×45px)
function XsCardBack({ idx, rotation = 0 }: { idx: number; rotation?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded overflow-hidden"
      style={{
        width: 32,
        height: 45,
        border: "1.5px solid #1e3a8f",
        boxShadow: "0 0 6px rgba(30,58,143,0.4)",
        position: "relative",
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.2s",
      }}
      aria-label={`Carta ${idx + 1} oculta`}
    >
      <img
        src="/assets/generated/card-back-design.dim_400x560.png"
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loading="lazy"
      />
    </div>
  );
}

// Hero neon color for ultimate button
const HERO_NEON_CLASSES: Record<string, string> = {
  pudu: "border-green-400/70 text-green-400 hover:bg-green-400/10",
  zorro: "border-yellow-400/70 text-yellow-400 hover:bg-yellow-400/10",
  lechuza: "border-blue-400/70 text-blue-400 hover:bg-blue-400/10",
  gato: "border-purple-400/70 text-purple-400 hover:bg-purple-400/10",
};

interface PlayerZoneProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isUnderAttack: boolean;
  selectedCardIndex: number | null;
  canSelectCards: boolean;
  isTargetable: boolean;
  isSelected: boolean;
  onSelectCard: (index: number) => void;
  onSelectAsTarget: () => void;
  onDefend: (card: CardDefinition) => void;
  onHeroUltimate?: () => void;
  heroUltimateUsed?: boolean;
  showHeroActivation?: boolean;
  heroActivationMessage?: string;
  isHit?: boolean;
  isDefending?: boolean;
  faceDown?: boolean;
  cardSize?: "xs" | "sm" | "md" | "lg";
  currentPhase?: string;
}

export default function PlayerZone({
  player,
  isCurrentPlayer,
  isUnderAttack,
  selectedCardIndex,
  canSelectCards,
  isTargetable,
  isSelected,
  onSelectCard,
  onSelectAsTarget,
  onDefend,
  onHeroUltimate,
  heroUltimateUsed = false,
  showHeroActivation = false,
  heroActivationMessage,
  isHit = false,
  isDefending = false,
  faceDown = false,
  cardSize = "sm",
  currentPhase,
}: PlayerZoneProps) {
  // For opponent (faceDown) zones, use xs size regardless of passed cardSize
  const effectiveCardSize: "xs" | "sm" | "md" | "lg" = faceDown
    ? "xs"
    : cardSize;
  const hero = getHeroById(player.heroId);
  const [detailCard, setDetailCard] = useState<CardDefinition | null>(null);

  if (!hero) return null;

  const defenseCards = player.hand.filter((c) => c.type === "defense");
  const neonClass = HERO_NEON_CLASSES[player.heroId] ?? HERO_NEON_CLASSES.pudu;
  const showUltimateBtn =
    isCurrentPlayer && currentPhase === "play" && !heroUltimateUsed;

  // Cards are shown face-down beside the hero when it's not this player's turn
  // AND it's not an opponent zone (faceDown=true already handles opponent)
  // AND the player is not under attack (so they can still see cards to defend)
  const showWaitingHand = !faceDown && !isCurrentPlayer && !isUnderAttack;

  const handleCardClick = (card: CardDefinition, idx: number) => {
    const isDefendable = isUnderAttack && !faceDown && card.type === "defense";
    const isPlayable = isCurrentPlayer && canSelectCards && !faceDown;

    if (isDefendable) {
      onDefend(card);
    } else if (isPlayable) {
      onSelectCard(idx);
    } else {
      // Show detail for non-playable cards (opponent zone or detail view)
      setDetailCard(card);
    }
  };

  return (
    <>
      <div
        role={isTargetable ? "button" : undefined}
        tabIndex={isTargetable ? 0 : undefined}
        className={`
          flex flex-col gap-1.5 p-2 rounded-xl border transition-all duration-300
          ${player.isOnline ? "" : "opacity-40 grayscale pointer-events-none"}
          ${
            isCurrentPlayer
              ? "border-primary/60 bg-primary/5 shadow-[0_0_20px_oklch(0.75_0.25_145/0.15)]"
              : isSelected
                ? "border-yellow-500/60 bg-yellow-500/5"
                : isUnderAttack
                  ? "border-red-500/70 bg-red-500/10 zone-shake"
                  : isTargetable
                    ? "border-red-400/50 bg-red-400/5 cursor-pointer hover:border-red-400/80"
                    : "border-border bg-card/30"
          }
        `}
        onClick={isTargetable ? onSelectAsTarget : undefined}
        onKeyDown={
          isTargetable
            ? (e) => e.key === "Enter" && onSelectAsTarget()
            : undefined
        }
      >
        {/* Header: hero + servers */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {hero && (
              <HeroToken
                hero={hero}
                isCurrentTurn={isCurrentPlayer}
                isOffline={!player.isOnline}
                size="sm"
                showActivation={showHeroActivation}
                activationMessage={heroActivationMessage}
                isHit={isHit}
                isDefending={isDefending}
                badgeMessage={
                  isHit
                    ? "💀 ¡Daño recibido!"
                    : isDefending
                      ? "🛡️ ¡Ataque Bloqueado!"
                      : undefined
                }
              />
            )}
            <div>
              <p className="text-[10px] font-bold text-foreground">
                {player.name}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {player.blockedTurns > 0 && (
                  <span className="text-[8px] text-red-400">🔒 Bloqueado</span>
                )}
                {player.immuneTurns > 0 && (
                  <span className="text-[8px] text-blue-400">🕵️ Incógnito</span>
                )}
                {player.firewallAguaActive && (
                  <span className="text-[8px] text-cyan-400">💧 Firewall</span>
                )}
                {player.monitoreoActive && (
                  <span className="text-[8px] text-green-400">🔍 Monitor</span>
                )}
              </div>
            </div>

            {/* Waiting hand: face-down cards beside hero when not current turn */}
            {showWaitingHand && player.hand.length > 0 && (
              <div className="flex items-center ml-1" style={{ gap: -6 }}>
                {player.hand
                  .slice(0, Math.min(player.hand.length, 6))
                  .map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        marginLeft: idx === 0 ? 0 : -10,
                        zIndex: idx,
                        transform: `rotate(${(idx - Math.min(player.hand.length, 6) / 2) * 5}deg)`,
                      }}
                    >
                      <XsCardBack idx={idx} />
                    </div>
                  ))}
                {player.hand.length > 6 && (
                  <span
                    className="text-[7px] font-bold ml-0.5 px-1 py-0.5 rounded"
                    style={{
                      background: "oklch(0.18 0.03 240 / 0.8)",
                      color: "oklch(0.55 0.05 240)",
                      border: "1px solid oklch(0.25 0.03 240 / 0.6)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{player.hand.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Servers — more prominent in opponent zones */}
          <ServerTokens
            servers={player.servers}
            size={faceDown ? "md" : "sm"}
            label={faceDown}
          />
        </div>

        {/* Hero Ultimate button (only for current player during play phase) */}
        {showUltimateBtn && onHeroUltimate && (
          <div className="flex">
            <Button
              size="sm"
              variant="outline"
              onClick={onHeroUltimate}
              className={`text-[9px] h-6 px-2 ${neonClass} font-bold`}
              data-ocid="game.hero_ultimate_button"
            >
              <Zap className="w-2.5 h-2.5 mr-0.5" />⚡ DEFINITIVA
            </Button>
          </div>
        )}

        {/* Hand — only shown when it's this player's turn or under attack */}
        {(isCurrentPlayer || isUnderAttack) && !faceDown && (
          <div className="flex gap-1 overflow-x-auto pb-1 items-end min-h-[60px]">
            {player.hand.length === 0 ? (
              <p className="text-[9px] text-muted-foreground italic self-center mx-auto">
                Sin cartas
              </p>
            ) : (
              player.hand.map((card, idx) => {
                const isCardSelected =
                  isCurrentPlayer && selectedCardIndex === idx;
                const isDefendable =
                  isUnderAttack && !faceDown && card.type === "defense";
                const isPlayable =
                  isCurrentPlayer && canSelectCards && !faceDown;

                return (
                  <div key={card.id} className="relative flex-shrink-0">
                    <GameCard
                      card={card}
                      isSelected={isCardSelected}
                      isPlayable={isPlayable || isDefendable}
                      isFaceDown={false}
                      size={
                        effectiveCardSize === "xs" ? "sm" : effectiveCardSize
                      }
                      onClick={
                        faceDown ? undefined : () => handleCardClick(card, idx)
                      }
                    />
                    {isDefendable && (
                      <div className="absolute -top-1 -right-1">
                        <ShieldCheck className="w-3 h-3 text-blue-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Opponent zone (faceDown): show xs back cards */}
        {faceDown && (
          <div className="flex gap-1 overflow-x-auto pb-1 items-end min-h-[40px]">
            {player.hand.length === 0 ? (
              <p className="text-[9px] text-muted-foreground italic self-center mx-auto">
                Sin cartas
              </p>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                {player.hand.map((card, idx) => (
                  <XsCardBack key={card.id} idx={idx} />
                ))}
                <span
                  className="text-[8px] font-bold ml-0.5 px-1 py-0.5 rounded"
                  style={{
                    background: "oklch(0.18 0.03 240 / 0.8)",
                    color: "oklch(0.55 0.05 240)",
                    border: "1px solid oklch(0.25 0.03 240 / 0.6)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {player.hand.length} cartas
                </span>
              </div>
            )}
          </div>
        )}

        {/* Defend button overlay when under attack */}
        {isUnderAttack && !faceDown && defenseCards.length > 0 && (
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] h-6 border-blue-400/60 text-blue-400 hover:bg-blue-400/10 animate-pulse"
              data-ocid="game.defend_button"
            >
              <Shield className="w-2.5 h-2.5 mr-1" />
              ¡Tap una carta de defensa!
            </Button>
          </div>
        )}

        {/* Target indicator */}
        {isTargetable && !isCurrentPlayer && (
          <div className="text-center">
            <span className="text-[9px] neon-text-red animate-pulse">
              ▶ Seleccionar objetivo
            </span>
          </div>
        )}
      </div>

      {/* Card detail overlay — shown when tapping any face-up card in non-playable mode */}
      <CardDetailOverlay
        card={detailCard}
        onClose={() => setDetailCard(null)}
      />
    </>
  );
}
