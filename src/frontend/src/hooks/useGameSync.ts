// ─── useGameSync ──────────────────────────────────────────────────────────────
// Manages cross-device game action relay for multiplayer sessions.
//
// PROTOCOL:
//   1. When you take a game action, call publishAction().
//      This encodes the action in your player name via leaveRoom + joinRoom.
//   2. Other devices poll getRoomState (1.2s) and detect the "||" separator in
//      player names, extract the action, and dispatch it locally.
//   3. After 2.5s, the publisher cleans their name (removes the action payload).
//
// All devices derive the initial game state from the same seeded deck
// (seed = roomCodeToSeed(roomCode)), so only incremental actions need relay.

import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend.d";
import {
  decodePlayerName,
  encodePlayerName,
  encodePlayerNameWithAction,
  extractActionFromName,
} from "../game/gameStateSerializer";

// biome-ignore lint/suspicious/noExplicitAny: action shape varies by game event
export type RelayAction = Record<string, any>;

export interface RemoteActionEvent {
  fromPlayerId: string;
  playerIndex: number;
  seq: number;
  action: RelayAction;
}

interface UseGameSyncOptions {
  roomCode: string | null;
  myPlayerId: string;
  myDisplayName: string;
  myHeroId: string;
  playerIndex: number; // this device's player index
  // biome-ignore lint/suspicious/noExplicitAny: actor type
  actor: any | null;
  enabled: boolean;
}

const CLEAN_DELAY_MS = 12000; // how long action stays in name before cleanup — longer so polling has multiple chances to catch it
const POLL_INTERVAL_MS = 400; // faster poll to catch actions sooner
const REJOIN_DELAY_MS = 500; // delay between leave and rejoin to avoid backend race

export function useGameSync({
  roomCode,
  myPlayerId,
  myDisplayName,
  myHeroId,
  playerIndex,
  actor,
  enabled,
}: UseGameSyncOptions) {
  const [remoteAction, setRemoteAction] = useState<RemoteActionEvent | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Track next outgoing sequence number
  const outSeqRef = useRef(0);
  // Track last applied sequence per player id to avoid double-applying
  const lastAppliedSeqRef = useRef<Record<string, number>>({});
  // Track current hero id for name encoding
  const heroIdRef = useRef(myHeroId);
  heroIdRef.current = myHeroId;
  const displayNameRef = useRef(myDisplayName);
  displayNameRef.current = myDisplayName;
  const playerIndexRef = useRef(playerIndex);
  playerIndexRef.current = playerIndex;

  // Cleanup timer ref
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Helper: leave room then rejoin with a specific name, with retry and backoff
  const leaveAndRejoin = useCallback(
    async (
      code: string,
      playerId: string,
      newName: string,
      retries = 4,
    ): Promise<boolean> => {
      if (!actor) return false;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Leave first
          await actor.leaveRoom(code, playerId);
          // Delay so backend processes the leave before the join
          await new Promise((r) => setTimeout(r, REJOIN_DELAY_MS));
          // Rejoin with updated name
          const result = await actor.joinRoom(code, playerId, newName);
          if (result) return true;
        } catch {
          // retry
        }
        if (attempt < retries) {
          // Exponential backoff: 400ms, 800ms, 1200ms, 1600ms
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
      return false;
    },
    [actor],
  );

  // Publish a game action so other devices can consume it
  const publishAction = useCallback(
    async (action: RelayAction): Promise<void> => {
      if (!actor || !roomCode) return;

      // Small pre-publish delay to let local game state settle first
      await new Promise((r) => setTimeout(r, 100));

      const seq = ++outSeqRef.current;
      const encodedName = encodePlayerNameWithAction(
        displayNameRef.current,
        heroIdRef.current,
        seq,
        action,
      );

      setIsSyncing(true);
      let published = false;
      try {
        published = await leaveAndRejoin(roomCode, myPlayerId, encodedName);
      } finally {
        setIsSyncing(false);
      }

      // Verify the action was written — poll once to confirm our name has the seq number
      // If verification fails, retry publishing once more
      if (published) {
        let verified = false;
        const verifyStart = Date.now();
        while (!verified && Date.now() - verifyStart < 3000) {
          await new Promise((r) => setTimeout(r, 400));
          try {
            const canisterRoom = await (actor as backendInterface).getRoomState(
              roomCode,
            );
            if (canisterRoom) {
              const myPlayer = canisterRoom.players.find(
                (p) => p.id === myPlayerId,
              );
              if (myPlayer) {
                const extracted = extractActionFromName(myPlayer.name);
                if (extracted && extracted.seq === seq) {
                  verified = true;
                }
              }
            }
          } catch {
            // ignore verification errors
          }
        }
        // If not verified, attempt one more publish with increased delay
        if (!verified) {
          console.warn(
            `[sync] seq ${seq} not verified in canister, retrying publish...`,
          );
          await new Promise((r) => setTimeout(r, 200));
          try {
            await leaveAndRejoin(roomCode, myPlayerId, encodedName, 2);
          } catch {
            // best-effort retry
          }
        }
      }

      // Schedule name cleanup after delay — keep action in name long enough for
      // multiple polls to catch it (CLEAN_DELAY_MS = 8000ms, POLL_INTERVAL_MS = 600ms
      // means ~13 poll attempts before cleanup)
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(async () => {
        const code = roomCodeRef.current;
        if (!actor || !code) return;
        const cleanName = encodePlayerName(
          displayNameRef.current,
          heroIdRef.current,
        );
        try {
          await leaveAndRejoin(code, myPlayerId, cleanName);
        } catch {
          // best-effort cleanup
        }
      }, CLEAN_DELAY_MS);
    },
    [actor, roomCode, myPlayerId, leaveAndRejoin],
  );

  // Update hero id in canister name (called when hero is selected)
  const updateHeroInRoom = useCallback(
    async (heroId: string): Promise<void> => {
      if (!actor || !roomCode) return;
      heroIdRef.current = heroId;
      const cleanName = encodePlayerName(displayNameRef.current, heroId);
      try {
        await leaveAndRejoin(roomCode, myPlayerId, cleanName);
      } catch {
        // best-effort
      }
    },
    [actor, roomCode, myPlayerId, leaveAndRejoin],
  );

  // Poll for remote actions from other players
  useEffect(() => {
    if (!enabled || !actor || !roomCode) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const canisterRoom = await (actor as backendInterface).getRoomState(
          roomCode,
        );
        if (!canisterRoom) return;

        for (const p of canisterRoom.players) {
          // Skip our own player
          if (p.id === myPlayerId) continue;

          const extracted = extractActionFromName(p.name);
          if (!extracted) continue;

          const { seq, action, heroId } = extracted;
          const lastApplied = lastAppliedSeqRef.current[p.id] ?? -1;

          if (seq > lastApplied) {
            lastAppliedSeqRef.current[p.id] = seq;
            // Find the player index in the room
            const playerIdx = canisterRoom.players.findIndex(
              (rp) => rp.id === p.id,
            );

            setRemoteAction({
              fromPlayerId: p.id,
              playerIndex: playerIdx,
              seq,
              action,
            });
          } else if (seq === lastApplied) {
            // Same seq seen again — already applied, just log for debugging
            // (This is expected because CLEAN_DELAY_MS is long and polling continues)
            console.debug(
              `[sync] seq ${seq} from ${p.id} already applied, skipping`,
            );
          }

          // Keep heroId info accessible (via decodePlayerName for the hero selection sync)
          void heroId; // used by room level for hero blocking
        }
      } catch {
        // ignore transient poll errors
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, actor, roomCode, myPlayerId]);

  // Clear the remote action (call after dispatching it)
  const consumeRemoteAction = useCallback(() => {
    setRemoteAction(null);
  }, []);

  return {
    remoteAction,
    isSyncing,
    publishAction,
    updateHeroInRoom,
    consumeRemoteAction,
  };
}

// ── Hero Selection Sync ───────────────────────────────────────────────────────
// Poll the room state to get hero IDs chosen by other players.
// Returns a map: playerId → heroId (only for players who have chosen)

export function useHeroSelectionSync({
  roomCode,
  myPlayerId,
  actor,
  enabled,
}: {
  roomCode: string | null;
  myPlayerId: string;
  // biome-ignore lint/suspicious/noExplicitAny: actor type
  actor: any | null;
  enabled: boolean;
}) {
  const [takenHeroes, setTakenHeroes] = useState<string[]>([]);
  const [playerHeroMap, setPlayerHeroMap] = useState<Record<string, string>>(
    {},
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !actor || !roomCode) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const canisterRoom = await (actor as backendInterface).getRoomState(
          roomCode,
        );
        if (!canisterRoom) return;

        const heroMap: Record<string, string> = {};
        const taken: string[] = [];

        for (const p of canisterRoom.players) {
          if (p.id === myPlayerId) continue;
          const { heroId } = decodePlayerName(p.name);
          if (heroId) {
            heroMap[p.id] = heroId;
            taken.push(heroId);
          }
        }

        setPlayerHeroMap(heroMap);
        setTakenHeroes(taken);
      } catch {
        // ignore
      }
    }, 1200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, actor, roomCode, myPlayerId]);

  return { takenHeroes, playerHeroMap };
}
