// ─── PlayerZone Component ────────────────────────────────────────────────────
// Displays one player's board area with 3 visual variants:
//   "opponent-strip"  — compact horizontal row for opponent section
//   "my-zone"         — full bottom zone for the local player
//   "standard"        — legacy layout (backward compat)

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
  /** Visual layout variant */
  variant?: "opponent-strip" | "my-zone" | "standard";
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
  variant = "standard",
}: PlayerZoneProps) {
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

  const handleCardClick = (card: CardDefinition, idx: number) => {
    const isDefendable = isUnderAttack && !faceDown && card.type === "defense";
    const isPlayable = isCurrentPlayer && canSelectCards && !faceDown;

    if (isDefendable) {
      onDefend(card);
    } else if (isPlayable) {
      onSelectCard(idx);
    } else {
      setDetailCard(card);
    }
  };

  // ── Opponent Strip variant ────────────────────────────────────────────────
  if (variant === "opponent-strip") {
    return (
      <>
        <div
          role={isTargetable ? "button" : undefined}
          tabIndex={isTargetable ? 0 : undefined}
          className={`
            flex items-center justify-between gap-2 w-full h-full px-2 py-1.5
            transition-all duration-300
            ${player.isOnline ? "" : "opacity-40 grayscale pointer-events-none"}
            ${isSelected ? "ring-1 ring-yellow-500/60" : ""}
            ${isUnderAttack ? "ring-1 ring-red-500/70 animate-pulse" : ""}
            ${isTargetable ? "cursor-pointer hover:bg-red-500/10" : ""}
          `}
          onClick={isTargetable ? onSelectAsTarget : undefined}
          onKeyDown={
            isTargetable
              ? (e) => e.key === "Enter" && onSelectAsTarget()
              : undefined
          }
        >
          {/* Left: Hero + Name + Servers */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
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
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-[10px] font-bold text-foreground truncate leading-none">
                {player.name}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {player.blockedTurns > 0 && (
                  <span className="text-[7px] text-red-400 leading-none">
                    🔒 Bloqueado
                  </span>
                )}
                {player.immuneTurns > 0 && (
                  <span className="text-[7px] text-blue-400 leading-none">
                    🕵️ Incógnito
                  </span>
                )}
                {player.firewallAguaActive && (
                  <span className="text-[7px] text-cyan-400 leading-none">
                    💧 Firewall
                  </span>
                )}
                {player.monitoreoActive && (
                  <span className="text-[7px] text-green-400 leading-none">
                    🔍 Monitor
                  </span>
                )}
              </div>
              {/* Servers inline below name */}
              <div className="mt-0.5">
                <ServerTokens
                  servers={player.servers}
                  size="opponent"
                  label={false}
                />
              </div>
            </div>
          </div>

          {/* Right: Face-down card fan */}
          <div className="flex items-center flex-shrink-0">
            {player.hand.length === 0 ? (
              <span className="text-[8px] text-muted-foreground italic">
                Sin cartas
              </span>
            ) : (
              <div className="flex items-center" style={{ gap: 0 }}>
                {player.hand
                  .slice(0, Math.min(player.hand.length, 4))
                  .map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        marginLeft: idx === 0 ? 0 : -10,
                        zIndex: idx,
                        transform: `rotate(${(idx - Math.min(player.hand.length, 4) / 2) * 6}deg) translateY(${Math.abs(idx - 1.5) * 2}px)`,
                      }}
                    >
                      <XsCardBack idx={idx} />
                    </div>
                  ))}
                {player.hand.length > 4 && (
                  <span
                    className="text-[7px] font-bold ml-1 px-1 py-0.5 rounded"
                    style={{
                      background: "oklch(0.18 0.03 240 / 0.8)",
                      color: "oklch(0.55 0.05 240)",
                      border: "1px solid oklch(0.25 0.03 240 / 0.6)",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      position: "relative",
                    }}
                  >
                    +{player.hand.length - 4}
                  </span>
                )}
                <span
                  className="text-[7px] font-mono ml-1 opacity-60"
                  style={{ color: "oklch(0.55 0.05 240)" }}
                >
                  {player.hand.length}
                </span>
              </div>
            )}

            {/* Target indicator */}
            {isTargetable && (
              <span className="ml-2 text-[8px] neon-text-red animate-pulse">
                ▶
              </span>
            )}
          </div>
        </div>

        <CardDetailOverlay
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  // ── My Zone variant ───────────────────────────────────────────────────────
  if (variant === "my-zone") {
    const showWaitingHand = !isCurrentPlayer && !isUnderAttack;

    return (
      <>
        <div
          className={`
            flex flex-col h-full gap-1.5 transition-all duration-300
            ${player.isOnline ? "" : "opacity-40 grayscale pointer-events-none"}
            ${isUnderAttack ? "zone-shake" : ""}
          `}
        >
          {/* Top row: Hero (left) + Status badges + Servers (right) */}
          <div className="flex items-start justify-between gap-2 flex-shrink-0 px-1 pt-1">
            {/* Left: Hero + name + status */}
            <div className="flex items-center gap-2">
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
              <div>
                <p className="text-[11px] font-bold text-foreground leading-tight">
                  {player.name}
                </p>
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {player.blockedTurns > 0 && (
                    <span className="text-[8px] text-red-400">
                      🔒 Bloqueado
                    </span>
                  )}
                  {player.immuneTurns > 0 && (
                    <span className="text-[8px] text-blue-400">
                      🕵️ Incógnito
                    </span>
                  )}
                  {player.firewallAguaActive && (
                    <span className="text-[8px] text-cyan-400">
                      💧 Firewall
                    </span>
                  )}
                  {player.monitoreoActive && (
                    <span className="text-[8px] text-green-400">
                      🔍 Monitor
                    </span>
                  )}
                </div>
                {/* Hero Ultimate button below hero */}
                {showUltimateBtn && onHeroUltimate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onHeroUltimate}
                    className={`text-[8px] h-5 px-1.5 mt-1 ${neonClass} font-bold`}
                    data-ocid="game.hero_ultimate_button"
                  >
                    <Zap className="w-2 h-2 mr-0.5" />⚡ DEFINITIVA
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Miniature server row labeled */}
            <div className="flex-shrink-0">
              <ServerTokens servers={player.servers} size="sm" label={true} />
            </div>
          </div>

          {/* Hand of cards — full width, prominent, scrollable */}
          <div className="flex-1 min-h-0 px-1 pb-1">
            {showWaitingHand && player.hand.length > 0 ? (
              /* Waiting: cards shown face-down beside hero */
              <div className="flex items-center justify-center h-full gap-0">
                {player.hand
                  .slice(0, Math.min(player.hand.length, 7))
                  .map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        marginLeft: idx === 0 ? 0 : -14,
                        zIndex: idx,
                        transform: `rotate(${(idx - Math.min(player.hand.length, 7) / 2) * 5}deg)`,
                      }}
                    >
                      <XsCardBack idx={idx} />
                    </div>
                  ))}
                {player.hand.length > 7 && (
                  <span
                    className="text-[7px] font-bold ml-1 px-1 py-0.5 rounded"
                    style={{
                      background: "oklch(0.18 0.03 240 / 0.8)",
                      color: "oklch(0.55 0.05 240)",
                      border: "1px solid oklch(0.25 0.03 240 / 0.6)",
                      whiteSpace: "nowrap",
                      position: "relative",
                      zIndex: 10,
                    }}
                  >
                    +{player.hand.length - 7}
                  </span>
                )}
              </div>
            ) : (
              /* Active hand: face-up cards scrollable */
              <div
                className={`
                  flex gap-1.5 overflow-x-auto pb-1 items-end h-full
                  ${isCurrentPlayer || isUnderAttack ? "" : "opacity-50 pointer-events-none"}
                `}
                style={{ scrollbarWidth: "thin" }}
              >
                {player.hand.length === 0 ? (
                  <p className="text-[9px] text-muted-foreground italic self-center mx-auto">
                    Sin cartas
                  </p>
                ) : (
                  player.hand.map((card, idx) => {
                    const isCardSelected =
                      isCurrentPlayer && selectedCardIndex === idx;
                    const isDefendable =
                      isUnderAttack && card.type === "defense";
                    const isPlayable = isCurrentPlayer && canSelectCards;

                    return (
                      <div
                        key={card.id}
                        className="relative flex-shrink-0"
                        style={{
                          transform: isCardSelected
                            ? "translateY(-8px)"
                            : undefined,
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <GameCard
                          card={card}
                          isSelected={isCardSelected}
                          isPlayable={isPlayable || isDefendable}
                          isFaceDown={false}
                          size={
                            effectiveCardSize === "xs"
                              ? "sm"
                              : effectiveCardSize
                          }
                          onClick={() => handleCardClick(card, idx)}
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
          </div>

          {/* Defend hint when under attack */}
          {isUnderAttack && defenseCards.length > 0 && (
            <div className="flex justify-center flex-shrink-0 pb-1">
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
        </div>

        <CardDetailOverlay
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  // ── Standard (legacy) variant ─────────────────────────────────────────────
  const showWaitingHand = !faceDown && !isCurrentPlayer && !isUnderAttack;

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

          <ServerTokens
            servers={player.servers}
            size={faceDown ? "md" : "sm"}
            label={faceDown}
          />
        </div>

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

        {faceDown && (
          <div className="flex flex-col gap-1">
            {player.handRevealed && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse"
                style={{
                  background: "oklch(0.25 0.12 25 / 0.7)",
                  color: "oklch(0.75 0.18 25)",
                  border: "1px solid oklch(0.55 0.18 25 / 0.8)",
                  boxShadow: "0 0 8px oklch(0.55 0.18 25 / 0.5)",
                }}
              >
                👁️ MANO REVELADA
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto pb-1 items-end min-h-[40px]">
              {player.hand.length === 0 ? (
                <p className="text-[9px] text-muted-foreground italic self-center mx-auto">
                  Sin cartas
                </p>
              ) : player.handRevealed ? (
                <div className="flex gap-1 flex-wrap">
                  {player.hand.map((card, _idx) => (
                    <div
                      key={card.id}
                      className="relative flex-shrink-0"
                      style={{
                        boxShadow: "0 0 10px oklch(0.55 0.18 25 / 0.8)",
                      }}
                    >
                      <GameCard
                        card={card}
                        isSelected={false}
                        isPlayable={false}
                        isFaceDown={false}
                        size="sm"
                        onClick={undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {player.hand.map((card, _idx) => (
                    <XsCardBack key={card.id} idx={_idx} />
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
          </div>
        )}

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

        {isTargetable && !isCurrentPlayer && (
          <div className="text-center">
            <span className="text-[9px] neon-text-red animate-pulse">
              ▶ Seleccionar objetivo
            </span>
          </div>
        )}
      </div>

      <CardDetailOverlay
        card={detailCard}
        onClose={() => setDetailCard(null)}
      />
    </>
  );
}
