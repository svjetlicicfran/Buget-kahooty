import bcrypt from 'bcrypt';
import type { AuthResponse } from '../models/AuthResponse.ts';
import db from '../db/db';
import { signToken } from './jwtService';

function toAdminFlag(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
}

export class AuthService {

    async register(username: string, password: string): Promise<AuthResponse> {

        if (!username || !password) {
            return { success: false, message: "Username and password required" };
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            await db('users').insert({
                username: username,
                password: hashedPassword // Save the HASH, never the plain text
            });
            return { success: true, message: "User registered successfully" };
        }
        catch (err) {
            console.log(err);
            return { success: false, message: 'User registration failed' };
        }

    }

    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            const user = await db("users")
                .where({ username })
                .first();

            if (!user) {
                return { success: false, message: "Invalid credentials" };
            }

            const validPassword = await bcrypt.compare(password, user.password);
            
            if (!validPassword) {
                return { success: false, message: "Invalid credentials" };
            }

            const isAdmin = toAdminFlag(user.isAdmin);
            const token = signToken({ userId: user.id, isAdmin });

            return {
                success: true,
                message: "Login successful",
                token,
                isAdmin
            };

        } catch (err) {
            console.error(err);
            return { success: false, message: "Login failed" };
        }

    }

}