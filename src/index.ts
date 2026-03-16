import loginRouter from "./routes/login";
import registerRouter from "./routes/register";

import http from "http";
import express from "express";
import cors from "cors";

const PORT: number = 8000;

async function main() {
    const app: express.Application = express();
    const server: http.Server = http.createServer(app);
    
    app.use(express.json());
    app.use(cors());
    app.use('/auth', loginRouter);
    app.use('/auth', registerRouter);

    //Join connect socket.io sever later

    server.listen(PORT, () =>{
        console.log(`Server runing at http://localhost:${PORT}`);
    });

}

main().catch((err) => {
    console.log(err);
});