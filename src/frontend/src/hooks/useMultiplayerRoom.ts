// ─── useMultiplayerRoom ───────────────────────────────────────────────────────
// Multiplayer room management via localStorage + BroadcastChannel + URL params.
// Works across tabs in same browser (BroadcastChannel) and across devices on
// same network by polling localStorage (500ms interval).

import { useCallback, useEffect, useRef, useState } from "react";

export type RoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  heroId?: string;
  joinedAt: number;
};

export type RoomState = {
  code: string;
  players: RoomPlayer[];
  maxPlayers: 2 | 3 | 4;
  level: 1 | 2 | 3;
  status: "waiting" | "ready" | "starting";
  hostId: string;
  createdAt: number;
};

const ROOM_PREFIX = "cgc_room_";
const CHANNEL_NAME = "cgc-rooms";
const POLL_INTERVAL = 500;

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

function readRoomFromStorage(code: string): RoomState | null {
  try {
    const raw = localStorage.getItem(`${ROOM_PREFIX}${code}`);
    if (!raw) return null;
    return JSON.parse(raw) as RoomState;
  } catch {
    return null;
  }
}

function writeRoomToStorage(room: RoomState): void {
  localStorage.setItem(`${ROOM_PREFIX}${room.code}`, JSON.stringify(room));
}

function removeRoomFromStorage(code: string): void {
  localStorage.removeItem(`${ROOM_PREFIX}${code}`);
}

function broadcastRoomUpdate(room: RoomState): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "ROOM_UPDATE", room });
    channel.close();
  } catch {
    // BroadcastChannel not supported — polling will handle sync
  }
}

export function useMultiplayerRoom() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId] = useState(getMyPlayerId);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check URL for ?room=CODE on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomCodeFromUrl(code.toUpperCase());
    }
  }, []);

  // Subscribe to BroadcastChannel for real-time updates
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current.onmessage = (e) => {
        const { type, room: updatedRoom } = e.data as {
          type: string;
          room: RoomState;
        };
        if (type === "ROOM_UPDATE" && room && updatedRoom.code === room.code) {
          setRoom(updatedRoom);
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      channelRef.current?.close();
    };
  }, [room]);

  // Poll localStorage for cross-device sync
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using room?.code to avoid re-subscribing on every render
  useEffect(() => {
    if (!room) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const code = room.code;
    pollRef.current = setInterval(() => {
      const latest = readRoomFromStorage(code);
      if (latest) {
        setRoom((prev) => {
          if (!prev) return latest;
          // Only update if the data actually changed
          if (JSON.stringify(prev) !== JSON.stringify(latest)) {
            return latest;
          }
          return prev;
        });
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [room?.code]);

  const createRoom = useCallback(
    (maxPlayers: 2 | 3 | 4, level: 1 | 2 | 3): RoomState => {
      const code = generateRoomCode();
      const hostPlayer: RoomPlayer = {
        id: myPlayerId,
        name: "Jugador 1 (Anfitrión)",
        isHost: true,
        joinedAt: Date.now(),
      };
      const newRoom: RoomState = {
        code,
        players: [hostPlayer],
        maxPlayers,
        level,
        status: "waiting",
        hostId: myPlayerId,
        createdAt: Date.now(),
      };
      writeRoomToStorage(newRoom);
      broadcastRoomUpdate(newRoom);
      setRoom(newRoom);
      return newRoom;
    },
    [myPlayerId],
  );

  const joinRoom = useCallback(
    (code: string, playerName?: string): RoomState | null => {
      const existing = readRoomFromStorage(code.toUpperCase());
      if (!existing) return null;
      if (existing.players.length >= existing.maxPlayers) return null;

      // Check if already joined
      const alreadyJoined = existing.players.some((p) => p.id === myPlayerId);
      if (alreadyJoined) {
        setRoom(existing);
        return existing;
      }

      const newPlayer: RoomPlayer = {
        id: myPlayerId,
        name: playerName ?? `Jugador ${existing.players.length + 1}`,
        isHost: false,
        joinedAt: Date.now(),
      };

      const updatedRoom: RoomState = {
        ...existing,
        players: [...existing.players, newPlayer],
        status:
          existing.players.length + 1 >= 2
            ? existing.players.length + 1 >= existing.maxPlayers
              ? "ready"
              : "waiting"
            : "waiting",
      };

      writeRoomToStorage(updatedRoom);
      broadcastRoomUpdate(updatedRoom);
      setRoom(updatedRoom);
      return updatedRoom;
    },
    [myPlayerId],
  );

  const leaveRoom = useCallback(() => {
    if (!room) return;
    const updated: RoomState = {
      ...room,
      players: room.players.filter((p) => p.id !== myPlayerId),
    };

    if (updated.players.length === 0) {
      removeRoomFromStorage(room.code);
    } else {
      // Transfer host if leaving player was host
      if (room.hostId === myPlayerId && updated.players.length > 0) {
        updated.players[0] = { ...updated.players[0], isHost: true };
        updated.hostId = updated.players[0].id;
      }
      writeRoomToStorage(updated);
      broadcastRoomUpdate(updated);
    }

    setRoom(null);
  }, [room, myPlayerId]);

  const startGame = useCallback(() => {
    if (!room) return;
    const updated: RoomState = { ...room, status: "starting" };
    writeRoomToStorage(updated);
    broadcastRoomUpdate(updated);
    setRoom(updated);
  }, [room]);

  const refreshRoom = useCallback(() => {
    if (!room) return;
    const latest = readRoomFromStorage(room.code);
    if (latest) setRoom(latest);
  }, [room]);

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
