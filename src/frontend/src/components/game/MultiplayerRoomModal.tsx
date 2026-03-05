// ─── MultiplayerRoomModal ─────────────────────────────────────────────────────
// Real multiplayer room modal using localStorage + BroadcastChannel + URL params.
// QR code and shareable link allow players on separate devices to join.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  LogIn,
  PlayCircle,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { RoomState } from "../../hooks/useMultiplayerRoom";
import { useMultiplayerRoom } from "../../hooks/useMultiplayerRoom";

export interface MultiplayerRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartMultiplayerGame?: (playerCount: number, level: 1 | 2 | 3) => void;
  initialRoomCode?: string | null;
}

const HERO_COLORS = {
  pudu: "oklch(0.75 0.25 145)",
  zorro: "oklch(0.88 0.22 85)",
  lechuza: "oklch(0.72 0.22 230)",
  gato: "oklch(0.78 0.25 300)",
};

function getPlayerColor(index: number): string {
  const colors = Object.values(HERO_COLORS);
  return colors[index % colors.length];
}

// ── QR Code image component ──────────────────────────────────────────────────
function QRCodeImage({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    setError(false);
    QRCode.toDataURL(url, {
      width: 180,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <div
        className="w-[180px] h-[180px] flex items-center justify-center rounded-lg bg-white text-center p-3"
        style={{ color: "#000" }}
      >
        <p className="text-[11px] font-mono break-all">{url}</p>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="w-[180px] h-[180px] flex items-center justify-center rounded-lg bg-white/10 border border-border">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="relative p-2 rounded-lg"
      style={{ background: "#fff", display: "inline-block" }}
    >
      <img src={dataUrl} alt="QR Code para unirse" width={180} height={180} />
      {/* Scan line animation */}
      <div
        className="absolute left-2 right-2 pointer-events-none"
        style={{
          height: 2,
          background:
            "linear-gradient(90deg, transparent, oklch(0.75 0.25 145), transparent)",
          animation: "qr-scan 2.5s ease-in-out infinite",
          boxShadow: "0 0 8px oklch(0.75 0.25 145)",
        }}
      />
    </div>
  );
}

// ── Player list row ──────────────────────────────────────────────────────────
function PlayerRow({
  name,
  isHost,
  isOnline,
  index,
}: {
  name: string;
  isHost: boolean;
  isOnline: boolean;
  index: number;
}) {
  const color = getPlayerColor(index);
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all"
      style={{
        borderColor: isOnline
          ? `color-mix(in oklch, ${color} 40%, transparent)`
          : "oklch(0.2 0.02 240)",
        background: isOnline
          ? `color-mix(in oklch, ${color} 5%, transparent)`
          : "transparent",
      }}
      data-ocid={`multiplayer.player.item.${index + 1}`}
    >
      <div className="relative flex-shrink-0">
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5" style={{ color }} />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
        {isOnline && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: color }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold leading-none"
          style={{ color: isOnline ? color : "oklch(0.35 0.02 240)" }}
        >
          {name}
        </p>
        {isHost && isOnline && (
          <p className="text-[9px] text-muted-foreground mt-0.5">Anfitrión</p>
        )}
      </div>
      <span
        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
        style={{
          background: isOnline
            ? `color-mix(in oklch, ${color} 15%, transparent)`
            : "oklch(0.15 0.02 240)",
          color: isOnline ? color : "oklch(0.35 0.02 240)",
        }}
      >
        {isOnline ? "online" : "offline"}
      </span>
    </div>
  );
}

// ── Waiting slot ─────────────────────────────────────────────────────────────
function WaitingSlot({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed"
      style={{ borderColor: "oklch(0.25 0.02 240)" }}
      data-ocid={`multiplayer.waiting_slot.item.${index + 1}`}
    >
      <WifiOff className="w-3.5 h-3.5 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground/40 italic">
        Esperando jugador...
      </p>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
type ModalView = "create" | "configure" | "lobby" | "join" | "waiting";

export default function MultiplayerRoomModal({
  open,
  onOpenChange,
  onStartMultiplayerGame,
  initialRoomCode,
}: MultiplayerRoomModalProps) {
  const {
    room,
    myPlayerId,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    getJoinUrl,
  } = useMultiplayerRoom();

  const [view, setView] = useState<ModalView>(
    initialRoomCode ? "join" : "create",
  );
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [joinCode, setJoinCode] = useState(initialRoomCode ?? "");
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [liveRoom, setLiveRoom] = useState<RoomState | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync external room changes into liveRoom
  useEffect(() => {
    if (room) setLiveRoom(room);
  }, [room]);

  // Poll for room updates (cross-device sync via localStorage)
  useEffect(() => {
    if (!liveRoom || (view !== "lobby" && view !== "waiting")) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(() => {
      try {
        const raw = localStorage.getItem(`cgc_room_${liveRoom.code}`);
        if (raw) {
          const updated = JSON.parse(raw) as RoomState;
          setLiveRoom(updated);
          // If game is starting, trigger callback
          if (updated.status === "starting" && onStartMultiplayerGame) {
            onStartMultiplayerGame(updated.players.length, updated.level);
            onOpenChange(false);
          }
        }
      } catch {
        // ignore parse errors
      }
    }, 500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [liveRoom, view, onStartMultiplayerGame, onOpenChange]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setView(initialRoomCode ? "join" : "create");
      setJoinCode(initialRoomCode ?? "");
      setJoinError("");
      setLiveRoom(null);
    }
  }, [open, initialRoomCode]);

  // Auto-show join view if URL has room code
  useEffect(() => {
    if (initialRoomCode && open) {
      setView("join");
      setJoinCode(initialRoomCode);
    }
  }, [initialRoomCode, open]);

  const joinUrl = liveRoom ? getJoinUrl(liveRoom.code) : "";

  const handleCopyCode = useCallback(() => {
    if (!liveRoom) return;
    navigator.clipboard.writeText(liveRoom.code).catch(() => {});
    setCopied("code");
    setTimeout(() => setCopied(null), 1500);
  }, [liveRoom]);

  const handleCopyLink = useCallback(() => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied("link");
    setTimeout(() => setCopied(null), 1500);
  }, [joinUrl]);

  const handleCreateRoom = useCallback(() => {
    const newRoom = createRoom(maxPlayers, selectedLevel);
    setLiveRoom(newRoom);
    setView("lobby");
  }, [createRoom, maxPlayers, selectedLevel]);

  const handleJoinRoom = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinError("Código debe tener 6 caracteres");
      return;
    }
    const playerName = joinName.trim() || "Jugador";
    const result = joinRoom(code, playerName);
    if (!result) {
      setJoinError("Sala no encontrada o llena. Verifica el código.");
      return;
    }
    setJoinError("");
    setLiveRoom(result);
    setView("waiting");
  }, [joinCode, joinName, joinRoom]);

  const handleStartGame = useCallback(() => {
    if (!liveRoom || !isHost) return;
    startGame();
    if (onStartMultiplayerGame) {
      onStartMultiplayerGame(liveRoom.players.length, liveRoom.level);
    }
    onOpenChange(false);
  }, [liveRoom, isHost, startGame, onStartMultiplayerGame, onOpenChange]);

  const handleLeave = useCallback(() => {
    leaveRoom();
    setLiveRoom(null);
    setView("create");
  }, [leaveRoom]);

  const canStart = (liveRoom?.players.length ?? 0) >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-primary/40 bg-card overflow-y-auto max-h-[90vh]"
        style={{ background: "oklch(0.1 0.03 240)" }}
        data-ocid="multiplayer.room_dialog"
      >
        {/* ── VIEW: CREATE (configure before creating) ── */}
        {view === "create" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display neon-text-green text-lg">
                🎮 Nueva Sala Multijugador
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* Max players */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Jugadores máximos
                </p>
                <div className="flex gap-2">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      className="flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all"
                      style={{
                        borderColor:
                          maxPlayers === n
                            ? "oklch(0.75 0.25 145)"
                            : "oklch(0.25 0.03 240)",
                        background:
                          maxPlayers === n
                            ? "oklch(0.75 0.25 145 / 0.1)"
                            : "transparent",
                        color:
                          maxPlayers === n
                            ? "oklch(0.75 0.25 145)"
                            : "oklch(0.5 0.05 240)",
                      }}
                      data-ocid={`multiplayer.max_players_${n}_button`}
                    >
                      {n} <Users className="w-3 h-3 inline ml-0.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Nivel de juego
                </p>
                <div className="flex gap-2">
                  {[
                    {
                      level: 1 as const,
                      emoji: "🌱",
                      label: "Nivel 1",
                      sub: "20 rondas",
                    },
                    {
                      level: 2 as const,
                      emoji: "⚡",
                      label: "Nivel 2",
                      sub: "35 rondas",
                    },
                    {
                      level: 3 as const,
                      emoji: "🔥",
                      label: "Nivel 3",
                      sub: "50 rondas",
                    },
                  ].map(({ level, emoji, label, sub }) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className="flex-1 py-2 px-1 rounded-xl border-2 text-center transition-all"
                      style={{
                        borderColor:
                          selectedLevel === level
                            ? "oklch(0.75 0.25 145)"
                            : "oklch(0.25 0.03 240)",
                        background:
                          selectedLevel === level
                            ? "oklch(0.75 0.25 145 / 0.1)"
                            : "transparent",
                        color:
                          selectedLevel === level
                            ? "oklch(0.75 0.25 145)"
                            : "oklch(0.5 0.05 240)",
                      }}
                      data-ocid={`multiplayer.level_${level}_button`}
                    >
                      <div className="text-base">{emoji}</div>
                      <div className="text-[9px] font-bold">{label}</div>
                      <div className="text-[8px] opacity-70">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleCreateRoom}
                className="w-full h-12 rounded-xl font-bold text-sm gap-2"
                style={{
                  background: "oklch(0.75 0.25 145)",
                  color: "oklch(0.08 0.02 240)",
                }}
                data-ocid="multiplayer.create_room_button"
              >
                <PlayCircle className="w-5 h-5" />
                Crear Sala
              </Button>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  o
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                variant="outline"
                onClick={() => setView("join")}
                className="w-full h-10 rounded-xl font-bold text-sm gap-2 border-primary/40 text-primary hover:bg-primary/10"
                data-ocid="multiplayer.go_join_button"
              >
                <LogIn className="w-4 h-4" />
                Unirme a una sala existente
              </Button>
            </div>
          </>
        )}

        {/* ── VIEW: LOBBY (host waiting for players) ── */}
        {view === "lobby" && liveRoom && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-display neon-text-green text-lg">
                  🎮 Sala Creada
                </DialogTitle>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  data-ocid="multiplayer.close_room_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Escanea para unirte
                </p>
                <QRCodeImage url={joinUrl} />
              </div>

              {/* Room code */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Código de sala
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="px-4 py-2 rounded-xl border-2 font-mono font-black text-2xl tracking-[0.25em]"
                    style={{
                      borderColor: "oklch(0.75 0.25 145)",
                      color: "oklch(0.75 0.25 145)",
                      background: "oklch(0.75 0.25 145 / 0.06)",
                      textShadow:
                        "0 0 15px oklch(0.75 0.25 145), 0 0 30px oklch(0.75 0.25 145 / 0.5)",
                    }}
                  >
                    {liveRoom.code}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                    title="Copiar código"
                    data-ocid="multiplayer.copy_code_button"
                  >
                    {copied === "code" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Copy link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
                data-ocid="multiplayer.copy_link_button"
              >
                <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground font-mono truncate flex-1 text-left">
                  {joinUrl.replace("https://", "")}
                </span>
                <span
                  className="text-[10px] font-bold flex-shrink-0"
                  style={{ color: "oklch(0.75 0.25 145)" }}
                >
                  {copied === "link" ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    "Copiar"
                  )}
                </span>
              </button>

              {/* Player list */}
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Jugadores ({liveRoom.players.length}/{liveRoom.maxPlayers})
                </p>
                <div className="flex flex-col gap-1.5">
                  {liveRoom.players.map((player, i) => (
                    <PlayerRow
                      key={player.id}
                      name={player.name}
                      isHost={player.isHost}
                      isOnline
                      index={i}
                    />
                  ))}
                  {([2, 3, 4] as const)
                    .slice(liveRoom.players.length, liveRoom.maxPlayers)
                    .map((slotNum) => (
                      <WaitingSlot
                        key={`lobby-slot-${slotNum}`}
                        index={slotNum - 1}
                      />
                    ))}
                </div>
              </div>

              {/* Ready / start */}
              {canStart ? (
                <div className="w-full flex flex-col gap-2">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold"
                    style={{
                      borderColor: "oklch(0.75 0.25 145 / 0.5)",
                      background: "oklch(0.75 0.25 145 / 0.08)",
                      color: "oklch(0.75 0.25 145)",
                    }}
                  >
                    <Check className="w-4 h-4" />
                    ¡Listo para jugar! ({liveRoom.players.length} jugadores)
                  </div>
                  {isHost && (
                    <Button
                      size="lg"
                      onClick={handleStartGame}
                      className="w-full h-12 rounded-xl font-bold text-sm gap-2"
                      style={{
                        background: "oklch(0.75 0.25 145)",
                        color: "oklch(0.08 0.02 240)",
                      }}
                      data-ocid="multiplayer.start_game_button"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Iniciar Partida
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Esperando más jugadores...
                </div>
              )}

              {/* Info note */}
              <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                📱 Funciona mejor cuando todos los jugadores están en la misma
                red
              </p>
            </div>
          </>
        )}

        {/* ── VIEW: JOIN (enter code manually) ── */}
        {view === "join" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-display neon-text-blue text-lg">
                  🔗 Unirse a Sala
                </DialogTitle>
                <button
                  type="button"
                  onClick={() => setView("create")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-[10px] flex items-center gap-1"
                  data-ocid="multiplayer.back_button"
                >
                  ← Volver
                </button>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                  Tu nombre
                </p>
                <Input
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Ej: Jugador2, María..."
                  maxLength={20}
                  className="border-border bg-card/50 text-foreground placeholder:text-muted-foreground/50"
                  data-ocid="multiplayer.player_name_input"
                />
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                  Código de sala
                </p>
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                    setJoinError("");
                  }}
                  placeholder="Ej: X7KP2M"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-[0.3em] uppercase border-border bg-card/50 text-foreground placeholder:text-muted-foreground/50"
                  data-ocid="multiplayer.room_code_input"
                />
                {joinError && (
                  <p
                    className="text-[10px] text-destructive mt-1"
                    data-ocid="multiplayer.join_error_state"
                  >
                    {joinError}
                  </p>
                )}
              </div>

              <Button
                size="lg"
                onClick={handleJoinRoom}
                disabled={joinCode.length !== 6}
                className="w-full h-12 rounded-xl font-bold text-sm gap-2"
                style={{
                  background: "oklch(0.72 0.22 230)",
                  color: "oklch(0.08 0.02 240)",
                }}
                data-ocid="multiplayer.join_room_button"
              >
                <LogIn className="w-5 h-5" />
                Unirse
              </Button>

              <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                Obtén el código del anfitrión o escanea su QR.
              </p>
            </div>
          </>
        )}

        {/* ── VIEW: WAITING (guest waiting for host to start) ── */}
        {view === "waiting" && liveRoom && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-display neon-text-blue text-lg">
                  ⏳ En la Sala
                </DialogTitle>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  data-ocid="multiplayer.leave_room_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
              {/* Room code (read-only) */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Sala
                </p>
                <div
                  className="px-4 py-2 rounded-xl border-2 font-mono font-black text-2xl tracking-[0.25em]"
                  style={{
                    borderColor: "oklch(0.72 0.22 230)",
                    color: "oklch(0.72 0.22 230)",
                    background: "oklch(0.72 0.22 230 / 0.06)",
                    textShadow: "0 0 15px oklch(0.72 0.22 230)",
                  }}
                >
                  {liveRoom.code}
                </div>
              </div>

              {/* Player list */}
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Jugadores conectados ({liveRoom.players.length}/
                  {liveRoom.maxPlayers})
                </p>
                <div className="flex flex-col gap-1.5">
                  {liveRoom.players.map((player, i) => (
                    <PlayerRow
                      key={player.id}
                      name={
                        player.id === myPlayerId
                          ? `${player.name} (Tú)`
                          : player.name
                      }
                      isHost={player.isHost}
                      isOnline
                      index={i}
                    />
                  ))}
                  {([2, 3, 4] as const)
                    .slice(liveRoom.players.length, liveRoom.maxPlayers)
                    .map((slotNum) => (
                      <WaitingSlot
                        key={`wait-slot-${slotNum}`}
                        index={slotNum - 1}
                      />
                    ))}
                </div>
              </div>

              {/* Waiting message */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "oklch(0.72 0.22 230)" }}
                  />
                  <span>Esperando que el anfitrión inicie la partida</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                📱 Funciona mejor cuando todos los jugadores están en la misma
                red
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
