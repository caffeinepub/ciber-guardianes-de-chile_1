// ─── Game Engine ─────────────────────────────────────────────────────────────
// Pure functions only — no React, no side effects.
// All game logic lives here for easy testing and modification.

import { ALL_CARDS } from "../data/cards";
import { GAME_CONSTANTS, LEVEL_ROUNDS } from "./gameConstants";
import type {
  AttackContext,
  CardDefinition,
  GameLogEntry,
  GameState,
  HeroId,
  PlayerState,
  ServerToken,
} from "./gameTypes";

// ── Utilities ───────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns new shuffled array */
export function shuffleDeck(cards: CardDefinition[]): CardDefinition[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeServers(): ServerToken[] {
  return Array.from({ length: GAME_CONSTANTS.SERVERS_PER_PLAYER }, (_, i) => ({
    index: i,
    status: "healthy" as const,
    animating: false,
  }));
}

export function countHealthyServers(player: PlayerState): number {
  return player.servers.filter((s) => s.status === "healthy").length;
}

function addLog(
  state: GameState,
  type: GameLogEntry["type"],
  message: string,
): GameLogEntry[] {
  const entry: GameLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    message,
  };
  const log = [entry, ...state.log].slice(0, GAME_CONSTANTS.MAX_LOG_ENTRIES);
  return log;
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function createInitialState(
  playerCount: number,
  heroSelections: HeroId[],
  gameLevel: 1 | 2 | 3 = 1,
): GameState {
  const shuffled = shuffleDeck(ALL_CARDS);
  const players: PlayerState[] = Array.from({ length: playerCount }, (_, i) => {
    const hand = shuffled.splice(0, GAME_CONSTANTS.STARTING_HAND_SIZE);
    return {
      id: i,
      name: `Jugador ${i + 1}`,
      heroId: heroSelections[i],
      servers: makeServers(),
      hand,
      isOnline: true,
      isCurrentTurn: i === 0,
      puduShieldUsed: false,
      blockedTurns: 0,
      immuneTurns: 0,
      firewallAguaActive: false,
      monitoreoActive: false,
      handRevealed: false,
      spammedTurns: 0,
    };
  });

  const levelLabels: Record<1 | 2 | 3, string> = {
    1: "Principiante",
    2: "Experto",
    3: "Maestro",
  };

  return {
    screen: "game",
    playerCount,
    players,
    deck: shuffled,
    discard: [],
    currentPlayerIndex: 0,
    currentPhase: "draw",
    turn: 1,
    round: 1,
    log: [
      {
        id: generateId(),
        timestamp: Date.now(),
        type: "system",
        message: `¡Partida iniciada! ${playerCount} jugadores · Nivel ${gameLevel} (${levelLabels[gameLevel]}) · ${LEVEL_ROUNDS[gameLevel]} rondas. ¡Que gane el mejor Ciber-Guardián!`,
      },
    ],
    pendingAttack: null,
    selectedCardIndex: null,
    selectedTargetId: null,
    saberCard: null,
    heroSelectStep: 0,
    heroSelections,
    winnerId: null,
    animatingZoneId: null,
    gameLevel,
    maxRounds: LEVEL_ROUNDS[gameLevel],
    surrenderedPlayerId: null,
    heroActionEvent: null,
    heroUltimateUsed: [],
    turnTransitionActive: false,
    turnTransitionNextPlayer: null,
  };
}

// ── Deck management ──────────────────────────────────────────────────────────

function refillDeckFromDiscard(state: GameState): GameState {
  if (state.deck.length > 0) return state;
  if (state.discard.length === 0) return state;
  const newDeck = shuffleDeck(state.discard);
  return {
    ...state,
    deck: newDeck,
    discard: [],
    log: addLog(
      state,
      "system",
      "♻️ Mazo vacío: el Basurero Digital fue barajado como nuevo mazo.",
    ),
  };
}

function drawCards(
  state: GameState,
  playerId: number,
  count: number,
): GameState {
  let s = refillDeckFromDiscard(state);
  const actualCount = Math.min(count, s.deck.length);
  if (actualCount === 0) return s;

  const drawn = s.deck.slice(0, actualCount);
  const newDeck = s.deck.slice(actualCount);
  const newPlayers = s.players.map((p) =>
    p.id === playerId ? { ...p, hand: [...p.hand, ...drawn] } : p,
  );

  return { ...s, deck: newDeck, players: newPlayers };
}

// ── Phase: Draw ──────────────────────────────────────────────────────────────

export function executeDrawPhase(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.blockedTurns > 0) {
    // Player is blocked — skip draw and play phases entirely
    // Note: blockedTurns is decremented globally at end of turn (executeEndPhase)
    const log = addLog(
      state,
      "system",
      `⚠️ ${currentPlayer.name} está bloqueado (${currentPlayer.blockedTurns} turno(s) restante(s)).`,
    );
    return {
      ...state,
      log,
      currentPhase: "end", // skip play phase too
    };
  }

  const drawCount =
    currentPlayer.heroId === "zorro"
      ? GAME_CONSTANTS.ZORRO_DRAW
      : GAME_CONSTANTS.DEFAULT_DRAW;

  let newState = drawCards(state, currentPlayer.id, drawCount);
  const log = addLog(
    newState,
    "system",
    `📡 ${currentPlayer.name} roba ${drawCount} carta(s). Fase de Conexión completada.`,
  );

  return { ...newState, log, currentPhase: "play" };
}

// ── Phase: End Turn ──────────────────────────────────────────────────────────

export function executeEndPhase(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  let newState = { ...state };

  // Discard excess cards
  let newPlayers = newState.players.map((p) => {
    if (
      p.id === currentPlayer.id &&
      p.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE
    ) {
      const _excess = p.hand.slice(GAME_CONSTANTS.MAX_HAND_SIZE);
      return { ...p, hand: p.hand.slice(0, GAME_CONSTANTS.MAX_HAND_SIZE) };
    }
    return p;
  });

  const excessCount =
    currentPlayer.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE
      ? currentPlayer.hand.length - GAME_CONSTANTS.MAX_HAND_SIZE
      : 0;

  let newDiscard = [...newState.discard];
  if (excessCount > 0) {
    const excess = currentPlayer.hand.slice(GAME_CONSTANTS.MAX_HAND_SIZE);
    newDiscard = [...newDiscard, ...excess];
  }

  // Find next alive player
  let nextIdx = (newState.currentPlayerIndex + 1) % newState.playerCount;
  let attempts = 0;
  while (!newPlayers[nextIdx].isOnline && attempts < newState.playerCount) {
    nextIdx = (nextIdx + 1) % newState.playerCount;
    attempts++;
  }

  // Check if new round
  const isNewRound = nextIdx <= newState.currentPlayerIndex;
  const newRound = isNewRound ? newState.round + 1 : newState.round;

  // Check round limit — if new round exceeds maxRounds, find winner by most healthy servers
  if (isNewRound && newRound > newState.maxRounds) {
    const online = newPlayers.filter((p) => p.isOnline);
    const winner = online.reduce((best, p) => {
      const bestServers = best.servers.filter(
        (s) => s.status === "healthy",
      ).length;
      const pServers = p.servers.filter((s) => s.status === "healthy").length;
      return pServers > bestServers ? p : best;
    }, online[0]);
    const winLog = addLog(
      { ...newState, players: newPlayers, log: newState.log },
      "eliminate",
      `⏱️ ¡Tiempo agotado! ${winner.name} gana con más Servidores activos (${winner.servers.filter((s) => s.status === "healthy").length}).`,
    );
    return {
      ...newState,
      players: newPlayers,
      discard: newDiscard,
      currentPlayerIndex: nextIdx,
      currentPhase: "draw",
      turn: newState.turn + 1,
      round: newRound,
      log: winLog,
      winnerId: winner.id,
      screen: "gameOver",
      selectedCardIndex: null,
      selectedTargetId: null,
      animatingZoneId: null,
    };
  }

  // Reset Pudú shield for new round
  if (isNewRound) {
    newPlayers = newPlayers.map((p) => ({ ...p, puduShieldUsed: false }));
  }

  // Decrement immune turns for ALL players on every end-of-turn
  // This ensures abilities like Modo Incógnito never last more than 1-2 turns
  // regardless of player count. Also clear per-turn effects for current player.
  newPlayers = newPlayers.map((p) => {
    const updates: Partial<PlayerState> = {};
    // Decrement immuneTurns for every player (so immunity ends in max 2 turns in any game)
    if (p.immuneTurns > 0) updates.immuneTurns = Math.max(0, p.immuneTurns - 1);
    // Decrement blockedTurns for every player so Ransomware/Spam don't drag on
    if (p.blockedTurns > 0)
      updates.blockedTurns = Math.max(0, p.blockedTurns - 1);
    if (p.spammedTurns > 0)
      updates.spammedTurns = Math.max(0, p.spammedTurns - 1);
    // Clear per-turn effects only for the player who just ended their turn
    if (p.id === currentPlayer.id) {
      updates.firewallAguaActive = false;
      updates.handRevealed = false;
    }
    return { ...p, ...updates };
  });

  // Update turn markers
  newPlayers = newPlayers.map((p) => ({
    ...p,
    isCurrentTurn: p.id === nextIdx,
  }));

  const logMsg =
    excessCount > 0
      ? `🔄 ${currentPlayer.name} descartó ${excessCount} carta(s) extra. Turno de ${newPlayers[nextIdx].name}.`
      : `🔄 Turno de ${newPlayers[nextIdx].name}.`;

  const log = addLog({ ...newState, log: newState.log }, "system", logMsg);

  return {
    ...newState,
    players: newPlayers,
    discard: newDiscard,
    currentPlayerIndex: nextIdx,
    currentPhase: "draw",
    turn: newState.turn + 1,
    round: newRound,
    log,
    selectedCardIndex: null,
    selectedTargetId: null,
    animatingZoneId: null,
    heroActionEvent: null,
    turnTransitionActive: false,
  };
}

// ── Combat ───────────────────────────────────────────────────────────────────

/** Apply damage to a player (lose servers). Returns updated PlayerState. */
function damagePlayer(player: PlayerState, amount: number): PlayerState {
  let remaining = amount;
  const newServers = player.servers.map((s) => {
    if (remaining > 0 && s.status === "healthy") {
      remaining--;
      return { ...s, status: "damaged" as const, animating: true };
    }
    return s;
  });
  const isOnline = newServers.some((s) => s.status === "healthy");
  return { ...player, servers: newServers, isOnline };
}

/** Attempt Gato Colocolo passive: 50% chance to recover a damaged server */
function tryGatoPassive(player: PlayerState): {
  player: PlayerState;
  recovered: boolean;
} {
  if (player.heroId !== "gato") return { player, recovered: false };
  const roll = Math.random();
  if (roll >= 0.5) {
    // Par: recover
    const servers = [...player.servers];
    const damagedIdx = servers.findIndex((s) => s.status === "damaged");
    if (damagedIdx >= 0) {
      servers[damagedIdx] = {
        ...servers[damagedIdx],
        status: "healthy",
        animating: true,
      };
      return {
        player: { ...player, servers, isOnline: true },
        recovered: true,
      };
    }
  }
  return { player, recovered: false };
}

/** Recover a lost/damaged server */
function healServer(player: PlayerState): PlayerState {
  const servers = [...player.servers];
  const targetIdx = servers.findLastIndex((s) => s.status !== "healthy");
  if (targetIdx >= 0) {
    servers[targetIdx] = {
      ...servers[targetIdx],
      status: "healthy",
      animating: true,
    };
  }
  return { ...player, servers, isOnline: true };
}

export function resolveAttack(
  state: GameState,
  attackCtx: AttackContext,
  defenseCard: CardDefinition | null,
): GameState {
  const { attackingPlayerId, targetPlayerId, card, saberBonus } = attackCtx;
  let newState: GameState = { ...state, pendingAttack: null };
  const attacker = newState.players.find((p) => p.id === attackingPlayerId)!;
  const target = newState.players.find((p) => p.id === targetPlayerId)!;

  // Move attack card to discard
  newState = {
    ...newState,
    discard: [...newState.discard, card],
    animatingZoneId: targetPlayerId,
  };

  // ── Defense was played ────────────────────────────────────────────────────
  if (defenseCard) {
    // Remove defense card from target's hand
    let newPlayers = newState.players.map((p) => {
      if (p.id === targetPlayerId) {
        return { ...p, hand: p.hand.filter((c) => c.id !== defenseCard.id) };
      }
      return p;
    });

    // Regla del Saber: draw 1 extra card on successful defense
    if (saberBonus) {
      const stateForDraw: GameState = {
        ...newState,
        players: newPlayers,
        pendingAttack: null,
      };
      const drawnState = drawCards(stateForDraw, targetPlayerId, 1);
      newState = drawnState;
      newPlayers = drawnState.players;
    }

    // Special defense effects
    if (defenseCard.effectTag === "vpn") {
      // Return villain to attacker's hand
      newPlayers = newPlayers.map((p) => {
        if (p.id === attackingPlayerId)
          return { ...p, hand: [...p.hand, card] };
        return p;
      });
      newState = {
        ...newState,
        discard: newState.discard.filter((c) => c.id !== card.id),
      };
    }

    if (defenseCard.effectTag === "block_report") {
      // Attacker discards 2 cards
      newPlayers = newPlayers.map((p) => {
        if (p.id === attackingPlayerId) {
          const _toDiscard = p.hand.slice(-2);
          return { ...p, hand: p.hand.slice(0, -2) };
        }
        return p;
      });
    }

    const defenseLog = addLog(
      { ...newState, players: newPlayers },
      "defense",
      `🛡️ ${target.name} usó "${defenseCard.name}" para bloquear "${card.name}" de ${attacker.name}.`,
    );

    return {
      ...newState,
      players: newPlayers,
      discard: [...newState.discard, defenseCard],
      log: defenseLog,
      selectedCardIndex: null,
      selectedTargetId: null,
    };
  }

  // ── No defense — apply villain effect ────────────────────────────────────

  // Check Pudú passive
  if (target.heroId === "pudu" && !target.puduShieldUsed) {
    const newPlayers = newState.players.map((p) =>
      p.id === targetPlayerId ? { ...p, puduShieldUsed: true } : p,
    );
    const log = addLog(
      { ...newState, players: newPlayers },
      "defense",
      `🛡️ Pudú "Escudo" activó su escudo pasivo y bloqueó el ataque de ${attacker.name}!`,
    );
    return { ...newState, players: newPlayers, log };
  }

  // Check immune
  if (target.immuneTurns > 0) {
    const log = addLog(
      newState,
      "defense",
      `🕵️ ${target.name} está en Modo Incógnito — el ataque no tuvo efecto.`,
    );
    return { ...newState, log };
  }

  let newPlayers = [...newState.players];
  let newDiscard = [...newState.discard];
  let logMsg = "";

  const power = saberBonus ? (card.power ?? 1) + 1 : (card.power ?? 1);

  switch (card.effectTag) {
    case "phisher": {
      const defenses = target.hand.filter((c) => c.type === "defense");
      if (defenses.length > 0) {
        const stolen = defenses[0];
        newPlayers = newPlayers.map((p) => {
          if (p.id === targetPlayerId)
            return { ...p, hand: p.hand.filter((c) => c.id !== stolen.id) };
          return p;
        });
        newDiscard = [...newDiscard, stolen];
        logMsg = `🎣 ${attacker.name} robó "${stolen.name}" de ${target.name} con El Phisher Pillo.`;
      } else {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `💀 ${target.name} no tenía defensas — pierde 1 Servidor por El Phisher Pillo.`;
      }
      break;
    }

    case "malware": {
      const dmg = target.monitoreoActive ? Math.floor(1 / 2) : 1;
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? damagePlayer(p, dmg) : p,
      );
      logMsg = `💀 ${target.name} pierde 1 Servidor por "${card.name}".`;
      break;
    }

    case "virus": {
      // Force discard all defense cards from target's hand
      const defenses = target.hand.filter((c) => c.type === "defense");
      if (defenses.length > 0) {
        newPlayers = newPlayers.map((p) => {
          if (p.id === targetPlayerId)
            return { ...p, hand: p.hand.filter((c) => c.type !== "defense") };
          return p;
        });
        newDiscard = [...newDiscard, ...defenses];
        logMsg = `🦠 Virus Desconocido destruyó ${defenses.length} carta(s) de Defensa de ${target.name}.`;
      } else {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `💀 ${target.name} no tenía defensas — pierde 1 Servidor por Virus Desconocido.`;
      }
      break;
    }

    case "grooming": {
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? { ...p, blockedTurns: 1 } : p,
      );
      logMsg = `⛔ ${target.name} fue bloqueado por El Desconocido Peligroso — saltará su próxima Fase de Ejecución.`;
      break;
    }

    case "bully": {
      // Reveal hand
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? { ...p, handRevealed: true } : p,
      );
      const hasDefense = target.hand.some((c) => c.type === "defense");
      if (!hasDefense) {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `👀 El Ciber-Bully reveló la mano de ${target.name} — sin defensas, pierde 1 Servidor.`;
      } else {
        logMsg = `👀 El Ciber-Bully reveló la mano de ${target.name} — tiene defensas, no pierde Servidor.`;
      }
      break;
    }

    case "ransomware": {
      const hasBackup = target.hand.some((c) => c.effectTag === "backup");
      if (hasBackup) {
        logMsg = `💾 ${target.name} tenía un Backup — el Ransomware fue neutralizado.`;
      } else {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId
            ? { ...p, blockedTurns: GAME_CONSTANTS.RANSOMWARE_BLOCK_TURNS }
            : p,
        );
        logMsg = `🔒 ${target.name} fue atacado por Ransomware — bloqueado por ${GAME_CONSTANTS.RANSOMWARE_BLOCK_TURNS} turnos.`;
      }
      break;
    }

    case "trojan": {
      const defenses = target.hand.filter((c) => c.type === "defense");
      if (defenses.length > 0) {
        const best = defenses.reduce((a, b) =>
          (a.power ?? 0) > (b.power ?? 0) ? a : b,
        );
        newPlayers = newPlayers.map((p) => {
          if (p.id === targetPlayerId)
            return { ...p, hand: p.hand.filter((c) => c.id !== best.id) };
          if (p.id === attackingPlayerId)
            return { ...p, hand: [...p.hand, best] };
          return p;
        });
        logMsg = `🐴 El Troyano Camuflado robó "${best.name}" de ${target.name} para ${attacker.name}.`;
      } else {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `💀 ${target.name} no tenía defensas — pierde 1 Servidor por El Troyano.`;
      }
      break;
    }

    case "troll": {
      const discardCount = Math.min(2, target.hand.length);
      const discarded = target.hand.slice(0, discardCount);
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId
          ? { ...p, hand: p.hand.slice(discardCount) }
          : p,
      );
      newDiscard = [...newDiscard, ...discarded];
      logMsg = `🗑️ El Troll hizo descartar ${discardCount} carta(s) a ${target.name}.`;
      break;
    }

    case "phishing_patas": {
      const defenses = target.hand.filter((c) => c.type === "defense");
      if (defenses.length > 0) {
        const stolen = defenses[0];
        newPlayers = newPlayers.map((p) => {
          if (p.id === targetPlayerId)
            return { ...p, hand: p.hand.filter((c) => c.id !== stolen.id) };
          return p;
        });
        newDiscard = [...newDiscard, stolen];
        logMsg = `🦶 Phishing con Patas robó "${stolen.name}" de ${target.name}.`;
      } else {
        // Backfires
        newPlayers = newPlayers.map((p) =>
          p.id === attackingPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `💀 Phishing con Patas falló — ¡${attacker.name} pierde 1 Servidor por el rebote!`;
      }
      break;
    }

    case "botnet": {
      const rawDmg = card.power ?? 2;
      const dmg = target.monitoreoActive ? Math.floor(rawDmg / 2) : rawDmg;
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? damagePlayer(p, dmg) : p,
      );
      logMsg = `💀 Botnet de Juguete hizo ${dmg} daño a ${target.name}${target.monitoreoActive ? " (monitoreo activo)" : ""}.`;
      break;
    }

    case "spam": {
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? { ...p, spammedTurns: 1 } : p,
      );
      logMsg = `📨 Spam-Bot bloqueó las Acciones de ${target.name} por 1 turno.`;
      break;
    }

    case "brute_force": {
      const hasRobustPassword = target.hand.some(
        (c) => c.effectTag === "robust_password",
      );
      if (hasRobustPassword) {
        logMsg = `🔐 ${target.name} tenía Contraseña Robusta — El Hacker Adivino falló.`;
      } else {
        newPlayers = newPlayers.map((p) =>
          p.id === targetPlayerId ? damagePlayer(p, 1) : p,
        );
        logMsg = `💀 El Hacker Adivino logró adivinar la clave de ${target.name} — pierde 1 Servidor.`;
      }
      break;
    }

    case "spyware": {
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? { ...p, handRevealed: true } : p,
      );
      logMsg = `👁️ Spyware reveló la mano de ${target.name}.`;
      break;
    }

    case "ddos": {
      const dmg = target.monitoreoActive ? Math.floor(1 / 2) : 1;
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? damagePlayer(p, dmg) : p,
      );
      logMsg = `💣 Ataque DDoS causó ${dmg} daño a ${target.name}.`;
      break;
    }

    default: {
      // Generic 1 damage
      const finalDmg = target.monitoreoActive ? Math.floor(power / 2) : 1;
      newPlayers = newPlayers.map((p) =>
        p.id === targetPlayerId ? damagePlayer(p, finalDmg) : p,
      );
      logMsg = `💀 "${card.name}" causó ${finalDmg} daño a ${target.name}.`;
      break;
    }
  }

  // Reset monitoreo after use
  newPlayers = newPlayers.map((p) =>
    p.id === targetPlayerId ? { ...p, monitoreoActive: false } : p,
  );

  // Apply Gato Colocolo passive on server loss
  newPlayers = newPlayers.map((p) => {
    if (p.id !== targetPlayerId) return p;
    const hadServers = target.servers.filter(
      (s) => s.status === "healthy",
    ).length;
    const nowServers = p.servers.filter((s) => s.status === "healthy").length;
    if (nowServers < hadServers && p.heroId === "gato") {
      const { player: healed } = tryGatoPassive(p);
      return healed;
    }
    return p;
  });

  const log = addLog(
    { ...newState, players: newPlayers, discard: newDiscard },
    "attack",
    logMsg,
  );

  // Check win condition
  const _eliminated = newPlayers.filter((p) => !p.isOnline);
  let winnerId = newState.winnerId;
  const online = newPlayers.filter((p) => p.isOnline);
  if (online.length === 1) {
    winnerId = online[0].id;
    const winLog = addLog(
      { ...newState, log },
      "eliminate",
      `🏆 ¡${online[0].name} gana la partida!`,
    );
    return {
      ...newState,
      players: newPlayers,
      discard: newDiscard,
      log: winLog,
      winnerId,
      screen: "gameOver",
      selectedCardIndex: null,
      selectedTargetId: null,
    };
  }

  return {
    ...newState,
    players: newPlayers,
    discard: newDiscard,
    log,
    winnerId,
    selectedCardIndex: null,
    selectedTargetId: null,
  };
}

// ── Action effects ────────────────────────────────────────────────────────────

export function resolveAction(
  state: GameState,
  playerId: number,
  card: CardDefinition,
  targetId?: number,
): GameState {
  let newState = { ...state };
  let newPlayers = [...newState.players];
  let newDiscard = [...newState.discard, card];
  let logMsg = "";

  // Remove card from player's hand
  newPlayers = newPlayers.map((p) =>
    p.id === playerId
      ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
      : p,
  );

  switch (card.effectTag) {
    case "update_system": {
      // Pass hands to the right
      const n = newPlayers.length;
      const hands = newPlayers.map((p) => p.hand);
      newPlayers = newPlayers.map((p, i) => ({
        ...p,
        hand: hands[(i + 1) % n],
      }));
      logMsg =
        "🔄 Actualización de Sistema: ¡Todas las manos pasaron a la derecha!";
      break;
    }

    case "incognito": {
      newPlayers = newPlayers.map((p) =>
        p.id === playerId
          ? { ...p, immuneTurns: GAME_CONSTANTS.INCOGNITO_TURNS + 1 }
          : p,
      );
      logMsg = `🕵️ ${newPlayers.find((p) => p.id === playerId)?.name} activó Modo Incógnito — inmune por esta ronda.`;
      break;
    }

    case "backup": {
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? healServer(p) : p,
      );
      logMsg = `💾 ${newPlayers.find((p) => p.id === playerId)?.name} recuperó 1 Servidor con Backup.`;
      break;
    }

    case "force_update": {
      // Pass hands to the left
      const n = newPlayers.length;
      const hands = newPlayers.map((p) => p.hand);
      newPlayers = newPlayers.map((p, i) => ({
        ...p,
        hand: hands[(i - 1 + n) % n],
      }));
      logMsg =
        "🔄 Actualización Forzosa: ¡Todas las manos pasaron a la izquierda!";
      break;
    }

    case "call_admin": {
      const tgt =
        targetId !== undefined
          ? newPlayers.find((p) => p.id === targetId)
          : null;
      if (tgt && tgt.hand.length > 0) {
        const randomIdx = Math.floor(Math.random() * tgt.hand.length);
        const discardedCard = tgt.hand[randomIdx];
        newPlayers = newPlayers.map((p) =>
          p.id === targetId
            ? { ...p, hand: p.hand.filter((_, i) => i !== randomIdx) }
            : p,
        );
        newDiscard = [...newDiscard, discardedCard];
        logMsg = `📞 Llamada al Admin: "${discardedCard.name}" fue descartada de la mano de ${tgt.name}.`;
      } else {
        logMsg = "📞 Llamada al Admin: el objetivo no tiene cartas.";
      }
      break;
    }

    case "trusted_friend": {
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? { ...p, handRevealed: true } : p,
      );
      newState = drawCards(
        { ...newState, players: newPlayers, discard: newDiscard },
        playerId,
        2,
      );
      newPlayers = newState.players;
      newDiscard = newState.discard;
      logMsg = `👥 Amigo de Confianza: ${newPlayers.find((p) => p.id === playerId)?.name} robó 2 cartas y mostró su mano.`;
      break;
    }

    case "water_firewall": {
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? { ...p, firewallAguaActive: true } : p,
      );
      logMsg = `💧 Firewall de Agua activado para ${newPlayers.find((p) => p.id === playerId)?.name}.`;
      break;
    }

    case "privacy_monitor": {
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? { ...p, monitoreoActive: true } : p,
      );
      logMsg =
        "🔍 Monitoreo de Privacidad activado — el próximo ataque será reducido a la mitad.";
      break;
    }

    case "report_user": {
      // Remove top villain from discard
      const lastVillainIdx = [...newDiscard]
        .reverse()
        .findIndex((c) => c.type === "villain");
      if (lastVillainIdx >= 0) {
        const realIdx = newDiscard.length - 1 - lastVillainIdx;
        const removed = newDiscard[realIdx];
        newDiscard = newDiscard.filter((_, i) => i !== realIdx);
        logMsg = `🚨 Reportar Usuario: "${removed.name}" fue eliminado del juego permanentemente.`;
      } else {
        logMsg = "🚨 Reportar Usuario: No hay villanos en el descarte.";
      }
      break;
    }

    case "vulnerability_analysis": {
      // Just log — actual reordering requires UI interaction (simplified: shuffle top 3)
      const top3 = newState.deck.slice(0, 3);
      const shuffled3 = shuffleDeck(top3);
      const newDeck = [...shuffled3, ...newState.deck.slice(3)];
      newState = { ...newState, deck: newDeck };
      logMsg =
        "🔎 Análisis de Vulnerabilidades: las 3 primeras cartas del mazo fueron reordenadas.";
      break;
    }

    default: {
      logMsg = `✨ ${newPlayers.find((p) => p.id === playerId)?.name} jugó "${card.name}".`;
      break;
    }
  }

  const log = addLog(
    { ...newState, players: newPlayers, discard: newDiscard },
    "action",
    logMsg,
  );

  return {
    ...newState,
    players: newPlayers,
    discard: newDiscard,
    log,
    selectedCardIndex: null,
    selectedTargetId: null,
  };
}

// ── Surrender ────────────────────────────────────────────────────────────────

/** Marks a player as surrendered (all servers damaged) and checks win condition */
export function surrenderPlayer(state: GameState, playerId: number): GameState {
  let newPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const servers = p.servers.map((s) => ({
      ...s,
      status: "damaged" as const,
      animating: true,
    }));
    return { ...p, servers, isOnline: false };
  });

  const surrenderer = state.players.find((p) => p.id === playerId);
  let log = addLog(
    { ...state, players: newPlayers },
    "eliminate",
    `🏳️ ${surrenderer?.name ?? "Jugador"} se rindió.`,
  );

  const online = newPlayers.filter((p) => p.isOnline);
  if (online.length === 1) {
    const winner = online[0];
    log = addLog(
      { ...state, players: newPlayers, log },
      "eliminate",
      `🏆 ¡${winner.name} gana la partida!`,
    );
    return {
      ...state,
      players: newPlayers,
      log,
      surrenderedPlayerId: playerId,
      winnerId: winner.id,
      screen: "gameOver",
    };
  }

  return {
    ...state,
    players: newPlayers,
    log,
    surrenderedPlayerId: playerId,
    pendingAttack: null,
  };
}

// ── Hero Ultimates ────────────────────────────────────────────────────────────

/** Uses the ultimate ability of the current player's hero */
export function activateHeroUltimate(
  state: GameState,
  playerId: number,
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  if (state.heroUltimateUsed.includes(playerId)) return state;

  let newState = { ...state };
  let newPlayers = [...state.players];
  let logMsg = "";
  let actionColor = "#22c55e";

  switch (player.heroId) {
    case "pudu": {
      // Cifrado Total: immune for 2 turns (now decremented globally each turn-end)
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? { ...p, immuneTurns: 2 } : p,
      );
      logMsg = `💚 ¡${player.name} activó Cifrado Total! — Inmune por 2 turnos.`;
      actionColor = "#22c55e";
      break;
    }

    case "zorro": {
      // Denuncia Ciudadana: find opponent with most attack cards and discard all their villains
      const opponents = newPlayers.filter(
        (p) => p.id !== playerId && p.isOnline,
      );
      const mostVillains = opponents.reduce((best, p) => {
        const vc = p.hand.filter((c) => c.type === "villain").length;
        const bc = best
          ? best.hand.filter((c) => c.type === "villain").length
          : -1;
        return vc > bc ? p : best;
      }, opponents[0]);
      if (mostVillains) {
        const discarded = mostVillains.hand.filter((c) => c.type === "villain");
        newPlayers = newPlayers.map((p) => {
          if (p.id === mostVillains.id) {
            return { ...p, hand: p.hand.filter((c) => c.type !== "villain") };
          }
          return p;
        });
        newState = {
          ...newState,
          discard: [...newState.discard, ...discarded],
        };
        logMsg = `🦊 ¡${player.name} activó Denuncia Ciudadana! — ${discarded.length} villanos descartados de ${mostVillains.name}.`;
      } else {
        logMsg = `🦊 ¡${player.name} activó Denuncia Ciudadana! — Sin oponentes con villanos.`;
      }
      actionColor = "#eab308";
      break;
    }

    case "lechuza": {
      // Backup Nocturno: if <= 1 healthy server, heal 2 servers
      const healthy = player.servers.filter(
        (s) => s.status === "healthy",
      ).length;
      if (healthy <= 2) {
        newPlayers = newPlayers.map((p) => {
          if (p.id !== playerId) return p;
          let healed = 0;
          const servers = p.servers.map((s) => {
            if (healed < 2 && s.status !== "healthy") {
              healed++;
              return { ...s, status: "healthy" as const, animating: true };
            }
            return s;
          });
          return { ...p, servers, isOnline: true };
        });
        logMsg = `🦉 ¡${player.name} activó Backup Nocturno! — 2 Servidores recuperados.`;
      } else {
        // Even if not low, still allow use — just heal 1
        newPlayers = newPlayers.map((p) => {
          if (p.id !== playerId) return p;
          let healed = 0;
          const servers = p.servers.map((s) => {
            if (healed < 2 && s.status !== "healthy") {
              healed++;
              return { ...s, status: "healthy" as const, animating: true };
            }
            return s;
          });
          return { ...p, servers, isOnline: true };
        });
        logMsg = `🦉 ¡${player.name} activó Backup Nocturno! — Servidores restaurados.`;
      }
      actionColor = "#3b82f6";
      break;
    }

    case "gato": {
      // Reinicio del Sistema: discard hand, draw 5
      const oldHand = player.hand;
      newState = { ...newState, discard: [...newState.discard, ...oldHand] };
      newPlayers = newPlayers.map((p) =>
        p.id === playerId ? { ...p, hand: [] } : p,
      );
      newState = drawCards({ ...newState, players: newPlayers }, playerId, 5);
      newPlayers = newState.players;
      logMsg = `🐱 ¡${player.name} activó Reinicio del Sistema! — Nueva mano de 5 cartas.`;
      actionColor = "#a855f7";
      break;
    }

    default:
      return state;
  }

  const log = addLog({ ...newState, players: newPlayers }, "action", logMsg);

  return {
    ...newState,
    players: newPlayers,
    log,
    heroUltimateUsed: [...state.heroUltimateUsed, playerId],
    heroActionEvent: { playerId, message: logMsg, color: actionColor },
  };
}

// ── Selectors ────────────────────────────────────────────────────────────────

export function getOnlinePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => p.isOnline);
}

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function canPlayCard(
  state: GameState,
  _playerId: number,
  cardsPlayedThisTurn: number,
): boolean {
  return (
    state.currentPhase === "play" &&
    cardsPlayedThisTurn < GAME_CONSTANTS.CARDS_PER_TURN
  );
}
