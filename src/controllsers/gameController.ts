import { Server, Socket } from "socket.io";
import { GameSession } from "../models/GameSession";
import { Question } from "../models/Question";
import { Player } from "../models/Player";
import { GameState } from "../models/GameState";

export class GameController {
    private sessions: Map<string, GameSession> = new Map();

    private createSession(pin: string, hostSocketId: string, questions: Question[]): GameSession {
        const session = new GameSession(pin, hostSocketId, questions);
        this.sessions.set(pin, session);
        return session;
    }

    registerSocketEvents(io: Server): void {
        io.on("connection", (socket: Socket) => {

            // Host: create a new game session
            socket.on("create-session", (questions: Question[]) => {
                const pin = Math.floor(100000 + Math.random() * 900000).toString();
                this.createSession(pin, socket.id, questions);
                socket.join(pin);
                socket.emit("session-created", { pin });
            });

            // Player: join a session by PIN
            socket.on("join-session", ({ pin, name }: { pin: string; name: string }) => {
                const session = this.sessions.get(pin);
                if (!session || session.state !== GameState.LOBBY) {
                    socket.emit("error", { message: "Session not found or already started" });
                    return;
                }
                const player: Player = {
                    playerId: crypto.randomUUID(),
                    socketId: socket.id,
                    name,
                    score: 0,
                    isOnline: true,
                };
                session.players.set(socket.id, player);
                socket.join(pin);
                socket.emit("joined", { pin });
                io.to(session.hostSocketId).emit("player-joined", { name, socketId: socket.id, total: session.players.size });
            });

            // Host: start the game (LOBBY → QUESTION)
            socket.on("start-game", ({ pin }: { pin: string }) => {
                const session = this.sessions.get(pin);
                if (!session || session.hostSocketId !== socket.id || session.state !== GameState.LOBBY) return;
                this.sendNextQuestion(io, session);
            });

            // Player: submit an answer
            socket.on("submit-answer", ({ pin, answerIndex, responseTime }: { pin: string; answerIndex: number; responseTime: number }) => {
                const session = this.sessions.get(pin);
                if (!session || session.state !== GameState.QUESTION) return;
                if (session.playerAnswers.has(socket.id)) return; // already answered
                session.playerAnswers.set(socket.id, { socketId: socket.id, answerIndex, responseTime });
                io.to(session.hostSocketId).emit("answer-received", {
                    answered: session.playerAnswers.size,
                    total: session.players.size,
                });
            });

            // Host: reveal answers (QUESTION → REVEAL)
            socket.on("reveal-answers", ({ pin }: { pin: string }) => {
                const session = this.sessions.get(pin);
                if (!session || session.hostSocketId !== socket.id || session.state !== GameState.QUESTION) return;
                const question = session.questions[session.currentQuestionIndex];
                // Award points — faster answers get more points
                session.playerAnswers.forEach((answer, socketId) => {
                    if (answer.answerIndex === question.correctIndex) {
                        const player = session.players.get(socketId);
                        if (player) player.score += Math.max(500, 1000 - Math.floor(answer.responseTime / 10));
                    }
                });
                session.state = GameState.REVEAL;
                io.to(pin).emit("answers-revealed", {
                    correctIndex: question.correctIndex,
                    scores: this.getScores(session),
                });
            });

            // Host: next question or end game (REVEAL → QUESTION | FINISHED)
            socket.on("next-question", ({ pin }: { pin: string }) => {
                const session = this.sessions.get(pin);
                if (!session || session.hostSocketId !== socket.id || session.state !== GameState.REVEAL) return;
                if (session.currentQuestionIndex + 1 >= session.questions.length) {
                    session.state = GameState.FINISHED;
                    io.to(pin).emit("game-over", { scores: this.getScores(session) });
                    this.sessions.delete(pin);
                } else {
                    this.sendNextQuestion(io, session);
                }
            });

            // Cleanup on disconnect
            socket.on("disconnect", () => {
                this.sessions.forEach((session, pin) => {
                    if (session.hostSocketId === socket.id) {
                        io.to(pin).emit("host-disconnected");
                        this.sessions.delete(pin);
                    } else {
                        const player = session.players.get(socket.id);
                        if (player) player.isOnline = false;
                    }
                });
            });
        });
    }

    private sendNextQuestion(io: Server, session: GameSession): void {
        session.currentQuestionIndex++;
        session.playerAnswers.clear();
        session.state = GameState.QUESTION;
        const { text, options } = session.questions[session.currentQuestionIndex];
        // correctIndex is intentionally omitted from the broadcast
        io.to(session.pin).emit("question", {
            index: session.currentQuestionIndex,
            total: session.questions.length,
            text,
            options,
        });
    }

    private getScores(session: GameSession): { name: string; score: number }[] {
        return Array.from(session.players.values())
            .map(({ name, score }) => ({ name, score }))
            .sort((a, b) => b.score - a.score);
    }
}