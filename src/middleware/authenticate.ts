import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../service/jwtService";

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    try {
        const token = header.slice(7);
        const payload = verifyToken(token);
        res.locals.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
