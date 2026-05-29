import bcrypt from "bcrypt";
import db from "../db/db";
import { signToken } from "./jwtService";
import { AuthResponse } from "../models/AuthResponse";

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

        const token = signToken({ userId: user.id });

        return { success: true, message: "Login successful", token };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Login failed" };
    }
}
