import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AuthResponse } from '../models/AuthResponse.ts';
import db from '../db/db'; // Your Knex instance


export const JWT_SECRET = 'your_super_secret_random_key';

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

            const token = jwt.sign(
                { userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

            return {
                success: true,
                message: "Login successful",
                token
            };

        } catch (err) {
            console.error(err);
            return { success: false, message: "Login failed" };
        }

    }

}