import { Router } from "express";
import { AuthController } from "../controllsers/authController";

const authController = new AuthController();
const loginRouter = Router();

loginRouter.post('/register', (request, response) => authController.register(request, response));

export default loginRouter;

//module.exports = router;