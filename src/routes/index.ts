import express  from "express";
import loginRouter from "./register";
import registerRouter from "./register";

const app = express();

app.use(express.json());
app.use(loginRouter);
app.use(registerRouter);

export default app;

//module.exports = app;