export interface Player {
    playerId: string; // The permanent ID (UUID or similar)
    socketId: string; // The current temporary connection ID
    name: string;
    score: number;
    isOnline: boolean;
}