import { Router, Request, Response } from "express";
import { login } from "../service/loginService";

const loginRouter = Router();

loginRouter.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const result = await login(username, password);
    res.status(result.success ? 200 : 401).json(result);
});

export default loginRouter;