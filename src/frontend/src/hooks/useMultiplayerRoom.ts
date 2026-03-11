// ─── useMultiplayerRoom ───────────────────────────────────────────────────────
// Multiplayer room management via ICP canister backend.
// Uses real canister calls to sync state across any device/network.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room as CanisterRoom } from "../backend.d";
import {
  decodePlayerName,
  encodePlayerName,
} from "../game/gameStateSerializer";
import { useActor } from "./useActor";

export type RoomPlayer = {
  id: string;
  name: string;
  displayName: string; // parsed from encoded name
  heroId: string; // parsed from encoded name
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

const POLL_INTERVAL = 1000;
const CHANNEL_NAME = "cgc-rooms";
const REJOIN_DELAY_MS = 350; // delay between leave and rejoin for backend processing

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
    players: r.players.map((p) => {
      const { name: displayName, heroId } = decodePlayerName(p.name);
      return {
        id: p.id,
        name: p.name,
        displayName: displayName || p.name,
        heroId,
        isHost: p.isHost,
        joinedAt: Number(p.joinedAt),
      };
    }),
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
  const { actor, isFetching, isError, reconnect } = useActor();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId] = useState(getMyPlayerId);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState("Jugador");
  const [myHeroId, setMyHeroIdState] = useState("");
  const [actorError, setActorError] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef = useRef<string | null>(null);

  // Reflect actor error state
  useEffect(() => {
    if (isError) {
      setActorError(
        "No se pudo conectar al servidor. Verifica tu conexión e intenta reconectar.",
      );
    } else if (actor) {
      setActorError(null);
    }
  }, [isError, actor]);

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

  // Helper: leave room then rejoin with a new name, with delay to avoid backend race
  const leaveAndRejoin = useCallback(
    async (
      code: string,
      playerId: string,
      newName: string,
      retries = 2,
    ): Promise<boolean> => {
      if (!actor) return false;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          await actor.leaveRoom(code, playerId);
          // Wait for backend to process the leave before rejoining
          await new Promise((r) => setTimeout(r, REJOIN_DELAY_MS));
          const result = await actor.joinRoom(code, playerId, newName);
          if (result) return true;
        } catch {
          // retry
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
      return false;
    },
    [actor],
  );

  const createRoom = useCallback(
    async (
      maxPlayers: 2 | 3 | 4,
      level: 1 | 2 | 3,
      displayName?: string,
    ): Promise<RoomState | null> => {
      if (!actor) return null;
      const code = generateRoomCode();
      const hostName = displayName ?? "Anfitrión";
      setMyDisplayName(hostName);
      // Encode hero as empty until hero selection happens
      const encodedName = encodePlayerName(hostName, "");
      // Retry up to 4 times with increasing delay
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
          const canisterRoom = await actor.createRoom(
            code,
            myPlayerId,
            encodedName,
            BigInt(maxPlayers),
            BigInt(level),
          );
          const newRoom = toRoomState(canisterRoom);
          broadcastRoomUpdate(newRoom);
          setRoom(newRoom);
          setActorError(null);
          return newRoom;
        } catch (e) {
          console.error(`createRoom attempt ${attempt + 1} failed:`, e);
          if (attempt === 3) {
            setActorError(
              "No se pudo crear la sala. Revisa tu conexión e inténtalo de nuevo.",
            );
          }
        }
      }
      return null;
    },
    [actor, myPlayerId],
  );

  const joinRoom = useCallback(
    async (code: string, playerName?: string): Promise<RoomState | null> => {
      if (!actor) return null;
      const displayName = playerName ?? "Jugador";
      setMyDisplayName(displayName);
      const encodedName = encodePlayerName(displayName, "");
      // Retry up to 4 times
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
          const canisterRoom = await actor.joinRoom(
            code.toUpperCase(),
            myPlayerId,
            encodedName,
          );
          if (!canisterRoom) return null;
          const joined = toRoomState(canisterRoom);
          broadcastRoomUpdate(joined);
          setRoom(joined);
          setActorError(null);
          return joined;
        } catch (e) {
          console.error(`joinRoom attempt ${attempt + 1} failed:`, e);
        }
      }
      return null;
    },
    [actor, myPlayerId],
  );

  /** Update the hero ID in the canister player name (during hero selection) */
  const setMyHeroId = useCallback(
    async (heroId: string): Promise<void> => {
      if (!actor || !room) return;
      setMyHeroIdState(heroId);
      const encodedName = encodePlayerName(myDisplayName, heroId);
      try {
        await leaveAndRejoin(room.code, myPlayerId, encodedName);
        // Refresh room state after update
        const updated = await actor.getRoomState(room.code);
        if (updated) {
          const newState = toRoomState(updated);
          setRoom(newState);
          broadcastRoomUpdate(newState);
        }
      } catch {
        // best-effort
      }
    },
    [actor, room, myPlayerId, myDisplayName, leaveAndRejoin],
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
      // Poll to confirm the status change
      let retries = 5;
      while (retries-- > 0) {
        await new Promise((r) => setTimeout(r, 500));
        const canisterRoom = await actor.getRoomState(room.code);
        if (canisterRoom) {
          const updated = toRoomState(canisterRoom);
          broadcastRoomUpdate(updated);
          setRoom(updated);
          if (updated.status === "starting") break;
        }
      }
    } catch {
      // best-effort — set locally anyway so host transitions
      const updated: RoomState = { ...room, status: "starting" };
      broadcastRoomUpdate(updated);
      setRoom(updated);
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
  // Actor is ready as long as it exists
  const isActorReady = !!actor;

  return {
    room,
    myPlayerId,
    myDisplayName,
    myHeroId,
    roomCodeFromUrl,
    isHost,
    isActorReady,
    actorError,
    isFetchingActor: isFetching,
    isActorError: isError,
    reconnect,
    createRoom,
    joinRoom,
    setMyHeroId,
    leaveRoom,
    startGame,
    refreshRoom,
    getJoinUrl,
    actor,
  };
}
