import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel';

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
    }
    return process.env.JWT_SECRET;
};

const createToken = (user: { id: number; name: string; email: string }) =>
    jwt.sign(
        { sub: String(user.id), name: user.name, email: user.email },
        getJwtSecret(),
        { expiresIn: '1d' }
    );

const validPassword = (password: unknown) =>
    typeof password === 'string' &&
    /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

const validCredentials = (name: unknown, email: unknown, password: unknown) =>
    typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100 &&
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    validPassword(password);

const passwordMessage = 'Password must be at least 8 characters and include one capital letter, one number, and one special character';

export class AuthController {
    static async register(req: Request, res: Response) {
        const { name, email, password } = req.body as {
            name?: unknown;
            email?: unknown;
            password?: unknown;
        };

        if (!validCredentials(name, email, password)) {
            return res.status(400).json({
                success: false,
                error: `Name, valid email, and ${passwordMessage.toLowerCase()} are required`
            });
        }

        const normalizedEmail = (email as string).trim().toLowerCase();
        if (await UserModel.findByEmail(normalizedEmail)) {
            return res.status(409).json({ success: false, error: 'Email is already registered' });
        }

        try {
            const user = await UserModel.create(
                (name as string).trim(),
                normalizedEmail,
                await bcrypt.hash(password as string, 12)
            );

            return res.status(201).json({
                success: true,
                data: {
                    token: createToken(user),
                    user: { id: user.id, name: user.name, email: user.email }
                }
            });
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
                return res.status(409).json({ success: false, error: 'Email is already registered' });
            }
            console.error('Registration failed:', error);
            return res.status(500).json({ success: false, error: 'Registration failed' });
        }
    }

    static async login(req: Request, res: Response) {
        const { name, email, password } = req.body as {
            name?: unknown;
            email?: unknown;
            password?: unknown;
        };
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (typeof name !== 'string' || !name.trim() || !normalizedEmail || typeof password !== 'string') {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        }

        const user = await UserModel.findByEmail(normalizedEmail);
        if (!user || !user.is_active || user.name.toLowerCase() !== name.trim().toLowerCase() || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        return res.json({
            success: true,
            data: {
                token: createToken(user),
                user: { id: user.id, name: user.name, email: user.email }
            }
        });
    }
}
