// ─── StartScreen ─────────────────────────────────────────────────────────────
// Main menu with tabs: Jugar, Mercado, Mis Cartas, Logros

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Coins,
  Crown,
  Lock,
  Shield,
  ShoppingCart,
  Star,
  Trophy,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import MultiplayerRoomModal from "../components/game/MultiplayerRoomModal";
import { ALL_CARDS } from "../data/cards";
import { HEROES } from "../data/heroes";
import { LEVEL_LABELS, LEVEL_ROUNDS } from "../game/gameConstants";
import type { CardDefinition } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";

interface StartScreenProps {
  onStartGame: (playerCount: number, level: 1 | 2 | 3) => void;
}

const CARD_TYPE_COLORS = {
  villain: "neon-text-red",
  defense: "neon-text-blue",
  action: "neon-text-yellow",
};

const CARD_TYPE_BADGE = {
  villain: "bg-red-500/20 text-red-400 border-red-500/40",
  defense: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  action: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

const CARD_TYPE_LABEL = {
  villain: "Villano",
  defense: "Defensa",
  action: "Acción",
};

const ACHIEVEMENTS = [
  {
    icon: "🏆",
    title: "Primera Victoria",
    desc: "Gana tu primera partida",
    unlocked: false,
  },
  {
    icon: "🛡️",
    title: "Defensa Perfecta",
    desc: "Bloquea 5 ataques en una partida",
    unlocked: false,
  },
  {
    icon: "🎣",
    title: "Maestro del Phishing",
    desc: "Juega El Phisher Pillo 3 veces",
    unlocked: false,
  },
  {
    icon: "⚡",
    title: "Héroe Definitivo",
    desc: "Usa la habilidad definitiva de un héroe",
    unlocked: false,
  },
  {
    icon: "🔒",
    title: "Sin Fisuras",
    desc: "Termina una partida con 5 servidores intactos",
    unlocked: false,
  },
  {
    icon: "💀",
    title: "Eliminador",
    desc: "Deja a un oponente offline",
    unlocked: false,
  },
  {
    icon: "🧠",
    title: "Saber es Poder",
    desc: "Usa la Regla del Saber 10 veces",
    unlocked: false,
  },
  {
    icon: "🌐",
    title: "Ciber-Guardián Supremo",
    desc: "Gana en Nivel 3 (50 rondas)",
    unlocked: false,
  },
];

// Random prices for market cards (seeded by id so stable)
function seedPrice(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return 50 + (Math.abs(hash) % 151); // 50–200
}

export default function StartScreen({ onStartGame }: StartScreenProps) {
  const { actor, isFetching } = useActor();
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [cardFilter, setCardFilter] = useState<
    "all" | "villain" | "defense" | "action"
  >("all");
  const [marketFilter, setMarketFilter] = useState<
    "all" | "villain" | "defense" | "action"
  >("all");
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [showMultiplayerRoom, setShowMultiplayerRoom] = useState(false);

  const { data: totalGames } = useQuery({
    queryKey: ["totalGames"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalGames();
    },
    enabled: !!actor && !isFetching,
  });

  const { data: popularHero } = useQuery({
    queryKey: ["popularHero"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMostPopularHero();
    },
    enabled: !!actor && !isFetching,
  });

  const filteredCards = ALL_CARDS.filter(
    (c) => cardFilter === "all" || c.type === cardFilter,
  );

  const marketCards = ALL_CARDS.filter(
    (c) => marketFilter === "all" || c.type === marketFilter,
  ).slice(0, 12);

  const levelConfigs: {
    level: 1 | 2 | 3;
    emoji: string;
    color: string;
    borderClass: string;
  }[] = [
    {
      level: 1,
      emoji: "🌱",
      color: "text-green-400",
      borderClass: "border-green-500/60 bg-green-500/5 hover:bg-green-500/10",
    },
    {
      level: 2,
      emoji: "⚡",
      color: "text-yellow-400",
      borderClass:
        "border-yellow-500/60 bg-yellow-500/5 hover:bg-yellow-500/10",
    },
    {
      level: 3,
      emoji: "🔥",
      color: "text-red-400",
      borderClass: "border-red-500/60 bg-red-500/5 hover:bg-red-500/10",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden">
      {/* Battle background */}
      <img
        src="/assets/generated/battle-background.dim_1920x1080.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{ opacity: 0.18 }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 circuit-bg pointer-events-none z-0" />

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-blue-500/5 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-2xl px-4 py-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 text-center animate-float-in">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap className="w-7 h-7 text-primary animate-pulse" />
            <h1
              className="text-3xl md:text-5xl font-black font-display tracking-tight neon-text-green animate-neon-flicker"
              style={{ letterSpacing: "-0.02em" }}
            >
              CIBER-GUARDIANES
            </h1>
            <Zap className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <p className="text-base md:text-xl font-display font-bold text-foreground/70 tracking-[0.3em] uppercase">
            de Chile
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-primary/50" />
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Protege tu Identidad Digital
            </p>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="play" className="w-full">
          <TabsList
            className="w-full grid grid-cols-4 mb-4 bg-card/70 backdrop-blur-sm border border-border"
            data-ocid="start.nav_tabs"
          >
            <TabsTrigger
              value="play"
              className="text-xs gap-1"
              data-ocid="start.play_tab"
            >
              ⚔️ Jugar
            </TabsTrigger>
            <TabsTrigger
              value="market"
              className="text-xs gap-1"
              data-ocid="start.market_tab"
            >
              🏪 Mercado
            </TabsTrigger>
            <TabsTrigger
              value="cards"
              className="text-xs gap-1"
              data-ocid="start.cards_tab"
            >
              🃏 Mis Cartas
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="text-xs gap-1"
              data-ocid="start.achievements_tab"
            >
              🏆 Logros
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB: JUGAR ─────────────────────────────────────────── */}
          <TabsContent value="play" className="space-y-4 animate-float-in">
            {/* Level selector */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 text-center">
                Selecciona el Nivel
              </p>
              <div className="grid grid-cols-3 gap-2">
                {levelConfigs.map(({ level, emoji, color, borderClass }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedLevel === level
                        ? `${borderClass} shadow-[0_0_16px_currentColor]`
                        : "border-border bg-card/30 hover:border-border/60"
                    }`}
                    data-ocid={`start.level_${level}_button`}
                    style={
                      selectedLevel === level
                        ? { boxShadow: "0 0 16px oklch(0.75 0.25 145 / 0.3)" }
                        : {}
                    }
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span
                      className={`text-xs font-bold ${selectedLevel === level ? color : "text-foreground/70"}`}
                    >
                      Nivel {level}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {LEVEL_LABELS[level]}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {LEVEL_ROUNDS[level]} rondas
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplayer Room button */}
            <div>
              <Button
                size="lg"
                onClick={() => setShowMultiplayerRoom(true)}
                className="w-full h-12 rounded-xl font-bold text-sm border-2 gap-2"
                style={{
                  borderColor: "oklch(0.75 0.22 230 / 0.7)",
                  background: "oklch(0.14 0.06 230 / 0.3)",
                  color: "oklch(0.75 0.22 230)",
                  boxShadow: "0 0 20px oklch(0.75 0.22 230 / 0.2)",
                }}
                data-ocid="start.multiplayer_room_button"
              >
                <Wifi className="w-4 h-4" />🎮 Sala Multijugador
              </Button>
            </div>

            {/* Player count */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 text-center">
                Número de Jugadores (mismo dispositivo)
              </p>
              <div className="flex flex-col gap-2">
                {([2, 3, 4] as const).map((count) => (
                  <Button
                    key={count}
                    size="lg"
                    onClick={() => onStartGame(count, selectedLevel)}
                    className={`font-bold text-sm h-11 rounded-xl ${
                      count === 2
                        ? "bg-primary text-primary-foreground hover:brightness-110"
                        : "border-primary/50 text-primary hover:bg-primary/10 bg-transparent border"
                    }`}
                    data-ocid={`start.play_${count}p_button`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {count} Jugadores — Nivel {selectedLevel}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Partidas
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {totalGames?.toString() ?? "—"}
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Héroe Popular
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {popularHero ? popularHero[0] : "—"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB: MERCADO ───────────────────────────────────────── */}
          <TabsContent value="market" className="animate-float-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">
                  Mercado de Cartas
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  El mercado completo llega pronto
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">250</span>
                <span className="text-[10px] text-yellow-400/70">
                  CiberMonedas
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {(["all", "villain", "defense", "action"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setMarketFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    marketFilter === f
                      ? "bg-primary/20 border-primary/60 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                  data-ocid={`start.market_filter_${f}_button`}
                >
                  {f === "all"
                    ? "Todos"
                    : f === "villain"
                      ? "Villanos"
                      : f === "defense"
                        ? "Defensas"
                        : "Acciones"}
                </button>
              ))}
            </div>

            <ScrollArea className="h-72">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-2">
                {marketCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-border bg-card/50 p-2 flex flex-col gap-1"
                    data-ocid={`start.market_card.${card.id}`}
                  >
                    <div className="aspect-[4/5] rounded overflow-hidden bg-card">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-foreground leading-tight truncate">
                      {card.name}
                    </p>
                    <Badge
                      className={`text-[8px] px-1.5 py-0 h-4 w-fit ${CARD_TYPE_BADGE[card.type]}`}
                    >
                      {CARD_TYPE_LABEL[card.type]}
                    </Badge>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-yellow-400 font-bold">
                        {seedPrice(card.id)} 💰
                      </span>
                      <button
                        type="button"
                        disabled
                        className="text-[9px] px-1.5 py-0.5 rounded border border-muted text-muted-foreground cursor-not-allowed opacity-50"
                        data-ocid={`start.market_buy_button.${card.id}`}
                        title="Próximamente"
                      >
                        Pronto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── TAB: MIS CARTAS ────────────────────────────────────── */}
          <TabsContent value="cards" className="animate-float-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-display text-foreground">
                Mi Colección
              </h2>
              <span className="text-xs text-muted-foreground bg-card/50 border border-border px-2 py-0.5 rounded-full">
                {ALL_CARDS.length} cartas
              </span>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {(["all", "villain", "defense", "action"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCardFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    cardFilter === f
                      ? "bg-primary/20 border-primary/60 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                  data-ocid={`start.cards_filter_${f}_button`}
                >
                  {f === "all"
                    ? `Todos (${ALL_CARDS.length})`
                    : f === "villain"
                      ? "Villanos (14)"
                      : f === "defense"
                        ? "Defensas (12)"
                        : "Acciones (10)"}
                </button>
              ))}
            </div>

            <ScrollArea className="h-72">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pr-2">
                {filteredCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCard(card)}
                    className="rounded-lg border border-border bg-card/50 p-1.5 flex flex-col gap-1 hover:border-primary/50 hover:bg-card/80 transition-all text-left"
                    data-ocid={`start.collection_card.${card.id}`}
                  >
                    <div className="aspect-[4/5] rounded overflow-hidden bg-card">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-foreground leading-tight line-clamp-2">
                      {card.name}
                    </p>
                    <Badge
                      className={`text-[7px] px-1 py-0 h-3.5 w-fit ${CARD_TYPE_BADGE[card.type]}`}
                    >
                      {CARD_TYPE_LABEL[card.type]}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── TAB: LOGROS ────────────────────────────────────────── */}
          <TabsContent value="achievements" className="animate-float-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-display text-foreground">
                Mis Logros
              </h2>
              <span className="text-xs text-muted-foreground bg-card/50 border border-border px-2 py-0.5 rounded-full">
                0 / {ACHIEVEMENTS.length} desbloqueados
              </span>
            </div>

            <ScrollArea className="h-80">
              <div className="flex flex-col gap-2 pr-2">
                {ACHIEVEMENTS.map((ach, i) => (
                  <div
                    key={ach.title}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      ach.unlocked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card/30 opacity-70"
                    }`}
                    data-ocid={`start.achievement.item.${i + 1}`}
                  >
                    <span className="text-2xl">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        {ach.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ach.desc}
                      </p>
                    </div>
                    {ach.unlocked ? (
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Multiplayer Room Modal ── */}
      <MultiplayerRoomModal
        open={showMultiplayerRoom}
        onOpenChange={setShowMultiplayerRoom}
      />

      {/* ── Card Detail Modal ── */}
      <Dialog
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCard(null)}
      >
        <DialogContent
          className="max-w-sm border-border bg-card"
          data-ocid="start.card_detail_dialog"
        >
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle
                  className={`font-display ${CARD_TYPE_COLORS[selectedCard.type]}`}
                >
                  {selectedCard.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex gap-4">
                <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="w-full aspect-[4/5] object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <Badge
                    className={`text-[9px] w-fit ${CARD_TYPE_BADGE[selectedCard.type]}`}
                  >
                    {CARD_TYPE_LABEL[selectedCard.type]}
                    {selectedCard.power !== undefined &&
                      ` · Poder ${selectedCard.power}`}
                  </Badge>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {selectedCard.description}
                  </p>
                  {selectedCard.didacticText && (
                    <div className="mt-1 p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-1 mb-1">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span className="text-[9px] text-primary font-bold uppercase tracking-wide">
                          Regla del Saber
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        "{selectedCard.didacticText}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="relative z-10 mt-auto pb-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
