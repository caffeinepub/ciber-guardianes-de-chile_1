import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    hero: string;
    name: string;
}
export interface Room {
    status: RoomStatus;
    code: string;
    createdAt: bigint;
    level: bigint;
    players: Array<RoomPlayer>;
    hostId: string;
    maxPlayers: bigint;
}
export interface GameResult {
    winnerPlayer: Player;
    players: Array<Player>;
    winnerPlayerIndex: bigint;
    turnsPlayed: bigint;
}
export interface RoomPlayer {
    id: string;
    name: string;
    joinedAt: bigint;
    isHost: boolean;
}
export enum RoomStatus {
    starting = "starting",
    waiting = "waiting",
    ready = "ready"
}
export interface backendInterface {
    createRoom(code: string, hostId: string, hostName: string, maxPlayers: bigint, level: bigint): Promise<Room>;
    getMostPopularHero(): Promise<[string, bigint] | null>;
    getRoomState(code: string): Promise<Room | null>;
    getTop10ByTurns(): Promise<Array<GameResult>>;
    getTotalGames(): Promise<bigint>;
    joinRoom(code: string, playerId: string, playerName: string): Promise<Room | null>;
    leaveRoom(code: string, playerId: string): Promise<boolean>;
    saveGame(gameResult: GameResult): Promise<void>;
    startRoom(code: string, hostId: string): Promise<boolean>;
}
