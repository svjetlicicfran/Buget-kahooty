import { GameSession } from "../models/GameSession";
import { Question } from "../models/Question";
import { Player } from "../models/Player";
import { GameState } from "../models/GameState";
import { Answer } from "../models/Answer";

export class GameController{
    private sessions: Map<string, GameSession> = new Map();

    createSession(pin: string, hostSocketId: string, questions: Question[]): GameSession{
        const session = new GameSession(pin, hostSocketId, questions);
        this.sessions.set(pin, session);
        return session;
    }

}