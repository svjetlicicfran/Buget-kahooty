import { Answer } from "./Answer";
import { Player } from "./Player";
import { Question } from "./Question";
import { GameState } from "./GameState";


export class GameSession {
    pin: string;

    hostSocketId: string;

    players: Map<string, Player> = new Map();

    questions: Question[];
    currentQuestionIndex: number = -1;
    playerAnswers: Map<string, Answer> = new Map();
    state: GameState = GameState.LOBBY;

    constructor(pin: string, hostSocketId: string, questions: Question[]) {
        this.pin = pin;
        this.hostSocketId = hostSocketId;
        this.questions = questions;
    }
}