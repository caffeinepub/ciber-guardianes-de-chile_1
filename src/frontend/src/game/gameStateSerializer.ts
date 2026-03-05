// ─── gameStateSerializer.ts ───────────────────────────────────────────────────
// Utilities for deterministic game seeding and action relay encoding.
// Used for cross-device multiplayer synchronization via the canister name relay.

// ── Deterministic Seeding ────────────────────────────────────────────────────

/** Convert a room code string to a numeric seed for deterministic shuffling */
export function roomCodeToSeed(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1; // ensure non-zero
}

/** Mulberry32 seeded PRNG — returns a function that generates values in [0, 1) */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0; // ensure 32-bit unsigned
  return (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle — deterministic, returns a NEW shuffled array */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = makeRng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Player Name Encoding ─────────────────────────────────────────────────────
// Player names in the canister encode hero and optionally an action relay.
// Format: "DisplayName|heroId" or "DisplayName|heroId||seq:ACTIONJSON"

/** Encode a player name with hero selection: "name|heroId" */
export function encodePlayerName(name: string, heroId: string): string {
  // Sanitize: remove any pipe characters from the raw name
  const safeName = name.replace(/\|/g, "");
  return `${safeName}|${heroId}`;
}

/** Decode a player name to extract display name and heroId */
export function decodePlayerName(encoded: string): {
  name: string;
  heroId: string;
} {
  const doublePipe = encoded.indexOf("||");
  const namePart = doublePipe >= 0 ? encoded.slice(0, doublePipe) : encoded;
  const pipeIdx = namePart.indexOf("|");
  if (pipeIdx < 0) {
    return { name: encoded, heroId: "" };
  }
  return {
    name: namePart.slice(0, pipeIdx),
    heroId: namePart.slice(pipeIdx + 1),
  };
}

/** Encode a player name with an action relay payload */
export function encodePlayerNameWithAction(
  name: string,
  heroId: string,
  seq: number,
  action: object,
): string {
  const safeName = name.replace(/\|/g, "");
  return `${safeName}|${heroId}||${seq}:${JSON.stringify(action)}`;
}

/** Extract the action relay payload from a player name, if present */
export function extractActionFromName(encoded: string): {
  seq: number;
  // biome-ignore lint/suspicious/noExplicitAny: action payload is unknown shape
  action: Record<string, any>;
  name: string;
  heroId: string;
} | null {
  const doublePipe = encoded.indexOf("||");
  if (doublePipe < 0) return null;

  const namePart = encoded.slice(0, doublePipe);
  const actionPart = encoded.slice(doublePipe + 2);

  const colonIdx = actionPart.indexOf(":");
  if (colonIdx < 0) return null;

  const seq = Number.parseInt(actionPart.slice(0, colonIdx), 10);
  if (Number.isNaN(seq)) return null;

  try {
    // biome-ignore lint/suspicious/noExplicitAny: action payload is unknown shape
    const action = JSON.parse(actionPart.slice(colonIdx + 1)) as Record<
      string,
      any
    >;
    const { name, heroId } = decodePlayerName(namePart);
    return { seq, action, name, heroId };
  } catch {
    return null;
  }
}
