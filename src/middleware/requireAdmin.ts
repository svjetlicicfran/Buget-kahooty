import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (res.locals.isAdmin !== true) {
        res.status(403).json({ message: "Admin access required" });
        return;
    }

    console.log(`Admin access granted for user ${res.locals.userId}`);

    next();
}