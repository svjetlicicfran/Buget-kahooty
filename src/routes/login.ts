import { Router, Request, Response } from "express";
import { AuthController } from "../controllsers/authController";

const authController = new AuthController();
const loginRouter = Router();

loginRouter.post('/login', (request: Request, response: Response) => authController.login(request, response));

export default loginRouter;

//module.exports = router;