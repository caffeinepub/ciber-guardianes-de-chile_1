// ─── MultiplayerRoomModal ─────────────────────────────────────────────────────
// Simulated multiplayer room with QR code, room code, and player list.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface MultiplayerRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Simulated QR code as an SVG grid of black/white squares
function SimulatedQRCode({ data }: { data: string }) {
  const size = 21;
  // Deterministic pattern based on data string
  const cells = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );
    // Finder patterns (corners)
    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) grid[row + r][col + c] = true;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);

    // Data pattern based on room code
    let seed = 0;
    for (let i = 0; i < data.length; i++) seed += data.charCodeAt(i) * (i + 1);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder pattern areas
        if (r < 8 && c < 8) continue;
        if (r < 8 && c >= 13) continue;
        if (r >= 13 && c < 8) continue;
        const hash = ((seed * (r * size + c + 1) * 2654435761) >>> 0) % 3;
        grid[r][c] = hash !== 0;
      }
    }
    return grid;
  }, [data]);

  const cellSize = 8;
  const svgSize = size * cellSize;

  return (
    <div
      className="relative p-2 rounded-lg"
      style={{ background: "#fff", display: "inline-block" }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {cells.map((row, r) =>
          row.map(
            (filled, c) =>
              filled && (
                <rect
                  // biome-ignore lint: stable index
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000"
                />
              ),
          ),
        )}
      </svg>
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

const SIMULATED_PLAYERS = [
  {
    name: "Jugador 1",
    hero: "Pudú",
    color: "oklch(0.75 0.25 145)",
    online: true,
  },
  {
    name: "Jugador 2",
    hero: "Zorro",
    color: "oklch(0.88 0.22 85)",
    online: true,
  },
  {
    name: "Esperando...",
    hero: "—",
    color: "oklch(0.4 0.02 240)",
    online: false,
  },
  {
    name: "Esperando...",
    hero: "—",
    color: "oklch(0.4 0.02 240)",
    online: false,
  },
];

export default function MultiplayerRoomModal({
  open,
  onOpenChange,
}: MultiplayerRoomModalProps) {
  const [roomCode] = useState(generateRoomCode);
  const [copied, setCopied] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);

  // Simulate a player joining
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setPlayerCount(2);
    }, 2000);
    return () => clearTimeout(t);
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-primary/40 bg-card"
        style={{ background: "oklch(0.1 0.03 240)" }}
        data-ocid="multiplayer.room_dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display neon-text-green text-lg">
            🎮 Sala Multijugador
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Escanea para unirte
            </p>
            <SimulatedQRCode data={roomCode} />
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
                {roomCode}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                title="Copiar código"
                data-ocid="multiplayer.copy_code_button"
              >
                {copied ? (
                  <span className="text-xs text-primary font-bold">✓</span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Player list */}
          <div className="w-full">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
              Jugadores conectados ({playerCount}/4)
            </p>
            <div className="flex flex-col gap-1.5">
              {SIMULATED_PLAYERS.map((player, i) => {
                const isOnline = i < playerCount;
                return (
                  <div
                    // biome-ignore lint: stable index
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all"
                    style={{
                      borderColor: isOnline
                        ? `${player.color.replace("oklch(", "oklch(").replace(")", " / 0.4)")}`
                        : "oklch(0.2 0.02 240)",
                      background: isOnline
                        ? `${player.color.replace("oklch(", "oklch(").replace(")", " / 0.05)")}`
                        : "transparent",
                    }}
                    data-ocid={`multiplayer.player.item.${i + 1}`}
                  >
                    {/* Online dot */}
                    <div className="relative flex-shrink-0">
                      {isOnline ? (
                        <Wifi
                          className="w-3.5 h-3.5"
                          style={{ color: player.color }}
                        />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                      {isOnline && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: player.color }}
                        />
                      )}
                    </div>

                    {/* Name + hero */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold leading-none"
                        style={{
                          color: isOnline
                            ? player.color
                            : "oklch(0.35 0.02 240)",
                        }}
                      >
                        {isOnline ? player.name : "Esperando..."}
                      </p>
                      {isOnline && player.hero !== "—" && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {player.hero}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                      style={{
                        background: isOnline
                          ? `${player.color.replace("oklch(", "oklch(").replace(")", " / 0.15)")}`
                          : "oklch(0.15 0.02 240)",
                        color: isOnline ? player.color : "oklch(0.35 0.02 240)",
                      }}
                    >
                      {isOnline ? "online" : "offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info note */}
          <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
            Comparte el código o QR con tus amigos.
            <br />
            La sala multijugador en tiempo real estará disponible pronto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
