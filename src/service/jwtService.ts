import jwt from "jsonwebtoken";
import { JwtPayload } from "../models/JwtPayload";

const SECRET = process.env.JWT_SECRET!;


export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, SECRET) as JwtPayload;
}

