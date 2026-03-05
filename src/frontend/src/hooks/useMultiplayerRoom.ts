// ─── useMultiplayerRoom ───────────────────────────────────────────────────────
// Multiplayer room management via ICP canister backend.
// Uses real canister calls to sync state across any device/network.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room as CanisterRoom } from "../backend.d";
import { useActor } from "./useActor";

export type RoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
};

// Local RoomState type — mirrors canister Room but uses regular numbers
export type RoomState = {
  code: string;
  players: RoomPlayer[];
  maxPlayers: 2 | 3 | 4;
  level: 1 | 2 | 3;
  status: "waiting" | "ready" | "starting";
  hostId: string;
  createdAt: number;
};

const POLL_INTERVAL = 1500;
const CHANNEL_NAME = "cgc-rooms";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getMyPlayerId(): string {
  let id = sessionStorage.getItem("cgc_player_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("cgc_player_id", id);
  }
  return id;
}

// Convert canister Room → local RoomState
function toRoomState(r: CanisterRoom): RoomState {
  return {
    code: r.code,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      joinedAt: Number(p.joinedAt),
    })),
    maxPlayers: Math.min(4, Math.max(2, Number(r.maxPlayers))) as 2 | 3 | 4,
    level: Math.min(3, Math.max(1, Number(r.level))) as 1 | 2 | 3,
    status: r.status as "waiting" | "ready" | "starting",
    hostId: r.hostId,
    createdAt: Number(r.createdAt),
  };
}

function broadcastRoomUpdate(room: RoomState): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "ROOM_UPDATE", room });
    channel.close();
  } catch {
    // BroadcastChannel not supported
  }
}

export function useMultiplayerRoom() {
  const { actor } = useActor();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId] = useState(getMyPlayerId);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef = useRef<string | null>(null);

  // Keep roomCodeRef in sync
  useEffect(() => {
    roomCodeRef.current = room?.code ?? null;
  }, [room?.code]);

  // Check URL for ?room=CODE on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomCodeFromUrl(code.toUpperCase());
    }
  }, []);

  // Subscribe to BroadcastChannel for same-browser instant notification
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current.onmessage = (e) => {
        const { type, room: updatedRoom } = e.data as {
          type: string;
          room: RoomState;
        };
        if (
          type === "ROOM_UPDATE" &&
          roomCodeRef.current &&
          updatedRoom.code === roomCodeRef.current
        ) {
          setRoom(updatedRoom);
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      channelRef.current?.close();
    };
  }, []);

  // Poll canister for cross-device real-time sync
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using room?.code to avoid restarting poll on every state update
  useEffect(() => {
    if (!room || !actor) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const code = room.code;
    pollRef.current = setInterval(async () => {
      try {
        const canisterRoom = await actor.getRoomState(code);
        if (canisterRoom) {
          const latest = toRoomState(canisterRoom);
          setRoom((prev) => {
            if (!prev) return latest;
            if (JSON.stringify(prev) !== JSON.stringify(latest)) {
              return latest;
            }
            return prev;
          });
        }
      } catch {
        // ignore transient errors
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [room?.code, actor]);

  const createRoom = useCallback(
    async (
      maxPlayers: 2 | 3 | 4,
      level: 1 | 2 | 3,
    ): Promise<RoomState | null> => {
      if (!actor) return null;
      const code = generateRoomCode();
      try {
        const canisterRoom = await actor.createRoom(
          code,
          myPlayerId,
          "Jugador 1 (Anfitrión)",
          BigInt(maxPlayers),
          BigInt(level),
        );
        const newRoom = toRoomState(canisterRoom);
        broadcastRoomUpdate(newRoom);
        setRoom(newRoom);
        return newRoom;
      } catch {
        return null;
      }
    },
    [actor, myPlayerId],
  );

  const joinRoom = useCallback(
    async (code: string, playerName?: string): Promise<RoomState | null> => {
      if (!actor) return null;
      try {
        const canisterRoom = await actor.joinRoom(
          code.toUpperCase(),
          myPlayerId,
          playerName ?? "Jugador",
        );
        if (!canisterRoom) return null;
        const joined = toRoomState(canisterRoom);
        broadcastRoomUpdate(joined);
        setRoom(joined);
        return joined;
      } catch {
        return null;
      }
    },
    [actor, myPlayerId],
  );

  const leaveRoom = useCallback(async () => {
    if (!room || !actor) return;
    try {
      await actor.leaveRoom(room.code, myPlayerId);
    } catch {
      // best-effort
    }
    setRoom(null);
  }, [room, actor, myPlayerId]);

  const startGame = useCallback(async () => {
    if (!room || !actor) return;
    try {
      await actor.startRoom(room.code, myPlayerId);
      const updated: RoomState = { ...room, status: "starting" };
      broadcastRoomUpdate(updated);
      setRoom(updated);
    } catch {
      // best-effort
    }
  }, [room, actor, myPlayerId]);

  const refreshRoom = useCallback(async () => {
    if (!room || !actor) return;
    try {
      const canisterRoom = await actor.getRoomState(room.code);
      if (canisterRoom) setRoom(toRoomState(canisterRoom));
    } catch {
      // ignore
    }
  }, [room, actor]);

  const getJoinUrl = useCallback((code: string): string => {
    return `${window.location.origin}${window.location.pathname}?room=${code}`;
  }, []);

  const isHost = room?.hostId === myPlayerId;

  return {
    room,
    myPlayerId,
    roomCodeFromUrl,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshRoom,
    getJoinUrl,
  };
}
