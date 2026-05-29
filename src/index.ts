import "dotenv/config";
import loginRouter from "./routes/login";
import registerRouter from "./routes/register";

import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { GameController } from "./controllsers/gameController";
import { verifyToken } from "./service/jwtService";

const PORT: number = Number(process.env.PORT) || 8000;

async function main() {
    const app: express.Application = express();
    const server: http.Server = http.createServer(app);

    const io = new Server(server, {
        cors: { origin: "*" },
    });

    io.use((socket, next) => {
        const token = socket.handshake.headers.authorization as string | undefined;
        if (!token) return next(new Error("Authentication required"));
        try {
            const payload = verifyToken(token);
            socket.data.userId = payload.userId;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    app.use(express.json());
    app.use(cors());
    app.use('/auth', loginRouter);
    app.use('/auth', registerRouter);

    const gameController = new GameController();
    gameController.registerSocketEvents(io);

    server.listen(PORT, () => {
        console.log(`Server runing at http://localhost:${PORT}`);
    });
}

main().catch((err) => {
    console.log(err);
});