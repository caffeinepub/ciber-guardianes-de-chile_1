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
export interface GameResult {
    winnerPlayer: Player;
    players: Array<Player>;
    winnerPlayerIndex: bigint;
    turnsPlayed: bigint;
}
export interface backendInterface {
    getMostPopularHero(): Promise<[string, bigint] | null>;
    getTop10ByTurns(): Promise<Array<GameResult>>;
    getTotalGames(): Promise<bigint>;
    saveGame(gameResult: GameResult): Promise<void>;
}
