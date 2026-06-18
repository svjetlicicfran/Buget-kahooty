import bcrypt from "bcrypt";
import db from "../db/db";
import { signToken } from "./jwtService";
import { AuthResponse } from "../models/AuthResponse";

function toAdminFlag(value: unknown): boolean {
    return value === true || value === 1 || value === "1" || value === "true";
}

export async function login(username: string, password: string): Promise<AuthResponse> {
    try {
        const user = await db("users").where({ username }).first();

        if (!user) {
            return { success: false, message: "Invalid credentials" };
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return { success: false, message: "Invalid credentials" };
        }
        
        console.log(`User ${username} logged in successfully with id ${user.id} and isAdmin=${user.isAdmin} and ${toAdminFlag(user.isAdmin)}`);
        
        const isAdmin = toAdminFlag(user.isAdmin);
        const token = signToken({ userId: user.id, isAdmin });
        
        return { success: true, message: "Login successful", token, isAdmin };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Login failed" };
    }
}
