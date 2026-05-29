import { Router, Request, Response } from "express";
import { register } from "../service/registerService";

const registerRouter = Router();

registerRouter.post("/register", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const result = await register(username, password);
    res.status(result.success ? 200 : 400).json(result);
});

export default registerRouter;