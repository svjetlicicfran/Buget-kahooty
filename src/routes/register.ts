import { Router, Request, Response } from 'express';
import { AuthController } from "../controllsers/authController";

const authController = new AuthController();
const registerRouter = Router();

registerRouter.post('/register', (request: Request, response: Response) => authController.register(request, response));

export default registerRouter;

//module.exports = router;