import { Server, Socket } from "socket.io";
import { GameSession } from "../models/GameSession";
import { Player } from "../models/Player";
import { GameState } from "../models/GameState";
import { getQuestionsByQuizId } from "../service/questionService";

export class GameController {
    private sessions: Map<string, GameSession> = new Map();

    private createSession(pin: string, hostSocketId: string): GameSession {
        const session = new GameSession(pin, hostSocketId, []);
        this.sessions.set(pin, session);
        return session;
    }

    registerSocketEvents(io: Server): void {
        io.on("connection", (socket: Socket) => {
            console.log(`[connect] socket=${socket.id}`);

            // Host: create a new game session
            socket.on("create-session", async ({ quizId }: { quizId: number }) => {
                console.log(`[create-session] socket=${socket.id} quizId=${quizId}`);
                try {
                    const questions = await getQuestionsByQuizId(quizId);
                    const pin = Math.floor(100000 + Math.random() * 900000).toString();
                    const session = this.createSession(pin, socket.id);
                    session.questions = questions;
                    socket.join(pin);
                    socket.emit("session-created", { pin });
                    console.log(`[create-session] pin=${pin} created questions=${questions.length}`);
                } catch (err) {
                    console.log(`[create-session] failed quizId=${quizId}`, err);
                    socket.emit("error", { message: "Failed to load quiz questions" });
                }
            });

            // Player: join a session by PIN
            socket.on("join-session", ({ pin, name }: { pin: string; name: string }) => {
                const pinStr = String(pin);
                console.log(`[join-session] socket=${socket.id} pin=${pinStr} name=${name}`);
                const session = this.sessions.get(pinStr);
                if (!session || session.state !== GameState.LOBBY) {
                    console.log(`[join-session] rejected pin=${pinStr} state=${session?.state ?? "not found"}`);
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
                socket.join(pinStr);
                socket.emit("joined", { pin: pinStr });
                io.to(session.hostSocketId).emit("player-joined", { name, socketId: socket.id, total: session.players.size });
                console.log(`[join-session] pin=${pinStr} players=${session.players.size}`);
            });

            // Host: start the game (LOBBY → QUESTION)
            socket.on("start-game", ({ pin }: { pin: string }) => {
                const pinStr = String(pin);
                console.log(`[start-game] socket=${socket.id} pin=${pinStr}`);
                const session = this.sessions.get(pinStr);
                if (!session) { console.log(`[start-game] rejected — session not found pin=${pinStr}`); return; }
                if (session.hostSocketId !== socket.id) { console.log(`[start-game] rejected — not host (expected=${session.hostSocketId} got=${socket.id})`); return; }
                if (session.state !== GameState.LOBBY) { console.log(`[start-game] rejected — wrong state=${session.state}`); return; }
                this.sendNextQuestion(io, session);
            });

            // Player: submit an answer
            socket.on("submit-answer", ({ pin, answerIndex, responseTime }: { pin: string; answerIndex: number; responseTime: number }) => {
                const pinStr = String(pin);
                console.log(`[submit-answer] socket=${socket.id} pin=${pinStr} answerIndex=${answerIndex} responseTime=${responseTime}ms`);
                const session = this.sessions.get(pinStr);
                if (!session || session.state !== GameState.QUESTION) return;
                if (session.playerAnswers.has(socket.id)) {
                    console.log(`[submit-answer] duplicate ignored socket=${socket.id}`);
                    return;
                }
                session.playerAnswers.set(socket.id, { socketId: socket.id, answerIndex, responseTime });
                io.to(session.hostSocketId).emit("answer-received", {
                    answered: session.playerAnswers.size,
                    total: session.players.size,
                });
                console.log(`[submit-answer] pin=${pinStr} answered=${session.playerAnswers.size}/${session.players.size}`);
            });

            // Host: reveal answers (QUESTION → REVEAL)
            socket.on("reveal-answers", ({ pin }: { pin: string }) => {
                const pinStr = String(pin);
                console.log(`[reveal-answers] socket=${socket.id} pin=${pinStr}`);
                const session = this.sessions.get(pinStr);
                if (!session || session.hostSocketId !== socket.id || session.state !== GameState.QUESTION) {
                    console.log(`[reveal-answers] rejected pin=${pinStr}`);
                    return;
                }
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
                console.log(`[reveal-answers] pin=${pinStr} correctIndex=${question.correctIndex}`);
            });

            // Host: next question or end game (REVEAL → QUESTION | FINISHED)
            socket.on("next-question", ({ pin }: { pin: string }) => {
                const pinStr = String(pin);
                console.log(`[next-question] socket=${socket.id} pin=${pinStr}`);
                const session = this.sessions.get(pinStr);
                if (!session || session.hostSocketId !== socket.id || session.state !== GameState.REVEAL) {
                    console.log(`[next-question] rejected pin=${pinStr}`);
                    return;
                }
                if (session.currentQuestionIndex + 1 >= session.questions.length) {
                    session.state = GameState.FINISHED;
                    io.to(pin).emit("game-over", { scores: this.getScores(session) });
                    this.sessions.delete(pin);
                    console.log(`[next-question] pin=${pinStr} game over`);
                } else {
                    this.sendNextQuestion(io, session);
                }
            });

            // Cleanup on disconnect
            socket.on("disconnect", () => {
                console.log(`[disconnect] socket=${socket.id}`);
                this.sessions.forEach((session, pin) => {
                    if (session.hostSocketId === socket.id) {
                        console.log(`[disconnect] host left pin=${pin} — session ended`);
                        io.to(pin).emit("host-disconnected");
                        this.sessions.delete(pin);
                    } else {
                        const player = session.players.get(socket.id);
                        if (player) {
                            player.isOnline = false;
                            console.log(`[disconnect] player=${player.name} offline pin=${pin}`);
                        }
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
        console.log(`[question] pin=${session.pin} index=${session.currentQuestionIndex}/${session.questions.length - 1}`);
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