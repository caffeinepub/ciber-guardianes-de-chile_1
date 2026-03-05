// ─── StartScreen ─────────────────────────────────────────────────────────────
// Main menu with tabs: Jugar, Mercado, Mis Cartas, Logros, Manual

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
  Bot,
  Coins,
  Crown,
  Key,
  Lock,
  Shield,
  ShoppingCart,
  Star,
  Trophy,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import MultiplayerRoomModal from "../components/game/MultiplayerRoomModal";
import { ALL_CARDS } from "../data/cards";
import { HEROES } from "../data/heroes";
import { LEVEL_LABELS, LEVEL_ROUNDS } from "../game/gameConstants";
import type { CardDefinition } from "../game/gameTypes";
import { useActor } from "../hooks/useActor";

interface StartScreenProps {
  onStartGame: (playerCount: number, level: 1 | 2 | 3) => void;
  onStartAIGame: (level: 1 | 2 | 3) => void;
  onStartMultiplayerGame?: (playerCount: number, level: 1 | 2 | 3) => void;
  initialRoomCode?: string | null;
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

// ── Manual Section component ─────────────────────────────────────────────────
function ManualSection({
  icon,
  title,
  color,
  children,
}: {
  icon: string;
  title: string;
  color: "green" | "blue" | "yellow" | "red";
  children: React.ReactNode;
}) {
  const borderColors = {
    green: "border-green-500/30",
    blue: "border-blue-500/30",
    yellow: "border-yellow-500/30",
    red: "border-red-500/30",
  };
  const titleColors = {
    green: "text-green-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };
  return (
    <div
      className={`rounded-xl border ${borderColors[color]} bg-card/40 backdrop-blur-sm overflow-hidden`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 border-b ${borderColors[color]} bg-card/30`}
      >
        <span className="text-base">{icon}</span>
        <h3 className={`text-sm font-black font-display ${titleColors[color]}`}>
          {title}
        </h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default function StartScreen({
  onStartGame,
  onStartAIGame,
  onStartMultiplayerGame,
  initialRoomCode,
}: StartScreenProps) {
  const { actor, isFetching } = useActor();
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [cardFilter, setCardFilter] = useState<
    "all" | "villain" | "defense" | "action"
  >("all");
  const [marketFilter, setMarketFilter] = useState<
    "all" | "villain" | "defense" | "action"
  >("all");
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [showMultiplayerRoom, setShowMultiplayerRoom] = useState(
    !!initialRoomCode,
  );

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
            className="w-full grid grid-cols-5 mb-4 bg-card/70 backdrop-blur-sm border border-border"
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
              🃏 Cartas
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="text-xs gap-1"
              data-ocid="start.achievements_tab"
            >
              🏆 Logros
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="text-xs gap-1"
              data-ocid="start.manual_tab"
            >
              📖 Manual
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

            {/* AI Mode button */}
            <div>
              <Button
                size="lg"
                onClick={() => onStartAIGame(selectedLevel)}
                className="w-full h-12 rounded-xl font-bold text-sm border-2 gap-2"
                style={{
                  borderColor: "oklch(0.72 0.25 290 / 0.7)",
                  background: "oklch(0.12 0.06 290 / 0.3)",
                  color: "oklch(0.82 0.22 290)",
                  boxShadow: "0 0 20px oklch(0.72 0.25 290 / 0.2)",
                }}
                data-ocid="start.play_ai_button"
              >
                <Bot className="w-4 h-4" />🤖 1 Jugador (vs IA)
              </Button>
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

          {/* ─── TAB: MANUAL ────────────────────────────────────────── */}
          <TabsContent
            value="manual"
            className="animate-float-in"
            data-ocid="start.manual_panel"
          >
            <ScrollArea className="h-[520px]">
              <div className="flex flex-col gap-5 pr-2 pb-4">
                {/* Title */}
                <div className="text-center py-3 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="text-2xl mb-1">📖</div>
                  <h2 className="text-lg font-black font-display neon-text-green tracking-tight">
                    Manual del Juego
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Ciber-Guardianes de Chile — Guía Completa
                  </p>
                </div>

                {/* Objetivo */}
                <ManualSection
                  icon="🎯"
                  title="Objetivo del Juego"
                  color="green"
                >
                  <p className="text-xs text-foreground/85 leading-relaxed">
                    Sé el{" "}
                    <strong className="text-primary">
                      último jugador conectado
                    </strong>
                    . Cada jugador protege{" "}
                    <strong>5 Servidores de Identidad Digital</strong> (sus
                    vidas). Si pierdes todos tus servidores, quedas{" "}
                    <span className="text-red-400 font-bold">Offline</span> y
                    eres eliminado.
                  </p>
                </ManualSection>

                {/* Preparación */}
                <ManualSection icon="⚙️" title="Preparación" color="blue">
                  <ol className="flex flex-col gap-1.5 text-xs text-foreground/85">
                    {[
                      {
                        n: 1,
                        text: "Cada jugador elige uno de los 4 Héroes Guardianes.",
                      },
                      {
                        n: 2,
                        text: "Cada jugador recibe 5 cartas de Servidor boca abajo (sus vidas).",
                      },
                      {
                        n: 3,
                        text: "Se barajan las 36 cartas (Villanos + Defensas + Acciones) y se reparten 4 a cada jugador.",
                      },
                      {
                        n: 4,
                        text: "El resto del mazo va al centro: es la Pila de Datos.",
                      },
                      {
                        n: 5,
                        text: "Se deja un espacio al lado para el Basurero Digital (descarte).",
                      },
                      {
                        n: 6,
                        text: "El jugador más joven comienza la partida.",
                      },
                    ].map((step) => (
                      <li key={step.n} className="flex gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[9px] font-bold flex-shrink-0 flex items-center justify-center">
                          {step.n}
                        </span>
                        <span className="leading-relaxed">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </ManualSection>

                {/* Turno */}
                <ManualSection
                  icon="🔄"
                  title="El Turno (3 Fases)"
                  color="yellow"
                >
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        phase: "Fase 1: Conexión",
                        color: "yellow",
                        desc: "Roba 1 carta del mazo central (o 2 si eres el Zorro Chilla).",
                      },
                      {
                        phase: "Fase 2: Ejecución",
                        color: "red",
                        desc: "Puedes jugar hasta 2 cartas: lanzar un Villano, jugar una Acción o bajar una Defensa.",
                      },
                      {
                        phase: "Fase 3: Sincronización",
                        color: "green",
                        desc: "Si tienes más de 7 cartas, descarta el exceso al Basurero. Luego pasa el turno.",
                      },
                    ].map((f) => (
                      <div
                        key={f.phase}
                        className={`p-2 rounded-lg border text-xs ${
                          f.color === "yellow"
                            ? "border-yellow-500/30 bg-yellow-500/5"
                            : f.color === "red"
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-green-500/30 bg-green-500/5"
                        }`}
                      >
                        <p
                          className={`font-bold mb-0.5 ${
                            f.color === "yellow"
                              ? "text-yellow-400"
                              : f.color === "red"
                                ? "text-red-400"
                                : "text-green-400"
                          }`}
                        >
                          {f.phase}
                        </p>
                        <p className="text-foreground/80 leading-relaxed">
                          {f.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </ManualSection>

                {/* Combate */}
                <ManualSection icon="⚔️" title="Mecánica de Combate" color="red">
                  <div className="flex flex-col gap-2 text-xs text-foreground/85">
                    <p className="leading-relaxed">
                      Cuando juegas un{" "}
                      <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/40 h-4 px-1.5">
                        Villano
                      </Badge>{" "}
                      contra un oponente:
                    </p>
                    <ol className="flex flex-col gap-1.5">
                      {[
                        {
                          n: 1,
                          text: "El jugador atacado puede responder inmediatamente (aunque no sea su turno) jugando una carta de Defensa.",
                        },
                        {
                          n: 2,
                          text: "Si defiende con éxito: ambas cartas van al Basurero.",
                        },
                        {
                          n: 3,
                          text: "Si no tiene Defensa o decide no usarla: voltea uno de sus Servidores (queda dañado).",
                        },
                        {
                          n: 4,
                          text: "Si pierde el último Servidor: queda Offline y es eliminado.",
                        },
                      ].map((step) => (
                        <li key={step.n} className="flex gap-2">
                          <span className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-bold flex-shrink-0 flex items-center justify-center">
                            {step.n}
                          </span>
                          <span className="leading-relaxed">{step.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </ManualSection>

                {/* Tipos de cartas */}
                <ManualSection icon="🃏" title="Tipos de Cartas" color="blue">
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        type: "Villanos",
                        count: "14 cartas",
                        badge: "bg-red-500/20 text-red-400 border-red-500/40",
                        desc: "Se lanzan contra oponentes para dañar sus Servidores.",
                        emoji: "🔴",
                      },
                      {
                        type: "Defensas",
                        count: "12 cartas",
                        badge:
                          "bg-blue-500/20 text-blue-400 border-blue-500/40",
                        desc: "Se juegan fuera de turno cuando eres atacado para anular el ataque.",
                        emoji: "🔵",
                      },
                      {
                        type: "Acciones",
                        count: "10 cartas",
                        badge:
                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
                        desc: "Efectos de campo que modifican las reglas del juego en tu turno.",
                        emoji: "🟡",
                      },
                    ].map((ct) => (
                      <div
                        key={ct.type}
                        className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card/30 text-xs"
                      >
                        <span className="text-base">{ct.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-foreground">
                              {ct.type}
                            </span>
                            <Badge
                              className={`text-[8px] h-3.5 px-1 ${ct.badge}`}
                            >
                              {ct.count}
                            </Badge>
                          </div>
                          <p className="text-foreground/70 leading-relaxed">
                            {ct.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ManualSection>

                {/* Héroes */}
                <ManualSection
                  icon="🦸"
                  title="Los 4 Héroes Guardianes"
                  color="green"
                >
                  <div className="flex flex-col gap-2">
                    {HEROES.map((hero) => (
                      <div
                        key={hero.id}
                        className={`p-2 rounded-lg border text-xs ${
                          hero.color === "green"
                            ? "border-green-500/30 bg-green-500/5"
                            : hero.color === "yellow"
                              ? "border-yellow-500/30 bg-yellow-500/5"
                              : hero.color === "blue"
                                ? "border-blue-500/30 bg-blue-500/5"
                                : "border-purple-500/30 bg-purple-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={hero.image}
                              alt={hero.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div>
                            <p
                              className={`font-bold text-[11px] ${
                                hero.color === "green"
                                  ? "text-green-400"
                                  : hero.color === "yellow"
                                    ? "text-yellow-400"
                                    : hero.color === "blue"
                                      ? "text-blue-400"
                                      : "text-purple-400"
                              }`}
                            >
                              {hero.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {hero.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 pl-1">
                          <p className="text-foreground/80 leading-relaxed">
                            <span className="font-bold text-foreground/90">
                              Pasivo:{" "}
                            </span>
                            {hero.passiveDescription}
                          </p>
                          <p className="text-foreground/80 leading-relaxed">
                            <span className="font-bold text-foreground/90">
                              Definitiva:{" "}
                            </span>
                            {hero.ultimateDescription}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ManualSection>

                {/* Regla del Saber */}
                <ManualSection icon="💡" title="Regla del Saber" color="yellow">
                  <div className="p-2 rounded-lg border border-primary/30 bg-primary/5 text-xs text-foreground/85">
                    <p className="leading-relaxed mb-2">
                      Cuando juegas una carta,{" "}
                      <strong className="text-primary">lee en voz alta</strong>{" "}
                      la definición didáctica que aparece en ella.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 text-lg">⚔️</span>
                        <p>
                          Al <strong>atacar</strong>: tu ataque gana{" "}
                          <strong className="text-primary">+1 de poder</strong>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 text-lg">🛡️</span>
                        <p>
                          Al <strong>defender</strong>: puedes robar{" "}
                          <strong className="text-primary">
                            1 carta extra
                          </strong>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </ManualSection>

                {/* Diccionario */}
                <ManualSection
                  icon="📚"
                  title="Diccionario de Términos"
                  color="blue"
                >
                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        term: "Phishing",
                        def: "Mensaje mentiroso que busca robarte tus secretos (claves o fotos) fingiendo ser alguien confiable.",
                      },
                      {
                        term: "Ransomware",
                        def: "Virus secuestrador: bloquea tus archivos y te pide 'rescate' para devolvértelos.",
                      },
                      {
                        term: "Firewall",
                        def: "El portero de tu computador: decide quién entra y quién se queda fuera de tu red.",
                      },
                      {
                        term: "Doble Factor (MFA)",
                        def: "Como tener dos llaves para una puerta; si te roban una, la otra todavía te protege.",
                      },
                      {
                        term: "Malware",
                        def: "Cualquier programa malvado hecho para dañar, espiar o romper tus dispositivos.",
                      },
                      {
                        term: "Grooming",
                        def: "Cuando un adulto se hace pasar por niño en internet para ganarse tu confianza. ¡Pide ayuda siempre!",
                      },
                      {
                        term: "Huella Digital",
                        def: "El rastro que dejas en internet; todo lo que subes queda guardado para siempre.",
                      },
                      {
                        term: "Contraseña Robusta",
                        def: "Clave fuerte hecha con letras, números y símbolos que es muy difícil de adivinar.",
                      },
                      {
                        term: "Backup",
                        def: "Copia de seguridad de tus cosas importantes guardada en otro lugar seguro.",
                      },
                    ].map((entry) => (
                      <div
                        key={entry.term}
                        className="flex gap-2 p-2 rounded-lg border border-border bg-card/20 text-xs"
                      >
                        <div className="flex-shrink-0">
                          <BookOpen className="w-3 h-3 text-primary mt-0.5" />
                        </div>
                        <div>
                          <span className="font-bold text-primary">
                            {entry.term}:{" "}
                          </span>
                          <span className="text-foreground/80 leading-relaxed">
                            {entry.def}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ManualSection>

                {/* Reglas de Oro */}
                <ManualSection
                  icon="🌟"
                  title="Las Reglas de Oro"
                  color="yellow"
                >
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        icon: "👮",
                        rule: "La Regla del Adulto",
                        desc: "Si un mensaje te asusta o te promete un premio increíble, ¡pausa el juego y llama a un adulto!",
                      },
                      {
                        icon: "🔑",
                        rule: "La Regla de la Llave",
                        desc: "Tus contraseñas son como las llaves de tu casa; no se las prestas ni a tu mejor amigo.",
                      },
                      {
                        icon: "🚫",
                        rule: "La Regla del Desconocido",
                        desc: 'En internet, un "amigo" que no conoces en la vida real es un extraño. No le des tu dirección ni el nombre de tu colegio.',
                      },
                      {
                        icon: "👣",
                        rule: "La Regla de la Huella",
                        desc: "Todo lo que subes a internet se queda ahí para siempre, como una huella de barro que no se puede limpiar.",
                      },
                    ].map((r) => (
                      <div
                        key={r.rule}
                        className="flex gap-2.5 p-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-xs"
                      >
                        <span className="text-xl flex-shrink-0">{r.icon}</span>
                        <div>
                          <p className="font-bold text-yellow-400 mb-0.5">
                            {r.rule}
                          </p>
                          <p className="text-foreground/80 leading-relaxed">
                            {r.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ManualSection>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Multiplayer Room Modal ── */}
      <MultiplayerRoomModal
        open={showMultiplayerRoom}
        onOpenChange={setShowMultiplayerRoom}
        onStartMultiplayerGame={onStartMultiplayerGame}
        initialRoomCode={initialRoomCode}
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
