import bcrypt from "bcrypt";
import db from "../db/db";
import { AuthResponse } from "../models/AuthResponse";

export async function register(username: string, password: string): Promise<AuthResponse> {
    if (!username || !password) {
        return { success: false, message: "Username and password required" };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db("users").insert({
            username,
            password: hashedPassword,
        });

        return { success: true, message: "User registered successfully" };
    } catch (err) {
        console.error(err);
        return { success: false, message: "User registration failed" };
    }
}
