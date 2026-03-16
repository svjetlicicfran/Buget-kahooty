import { Request, Response } from "express";
import { AuthService } from "../service/authService";

const authService = new AuthService();

export class AuthController {

    async register(request: Request, response: Response) {

        const { username, password } = request.body;

        const result = await authService.register(username, password);

        if (!result.success) {
            return response.status(400).json(result);
        }

        return response.status(200).json(result);
    }

    async login(request: Request, response: Response) {

        const { username, password } = request.body;

        const result = await authService.login(username, password);

        if (!result.success) {
            return response.status(401).json(result);
        }

        return response.status(200).json(result);
    }
}