import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthToken {
    sub: string;
    name: string;
    email: string;
    iat?: number;
    exp?: number;
}

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
    }
    return process.env.JWT_SECRET;
};

export const verifyJwt = (token: string): AuthToken => {
    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new Error('Invalid token');
    }
    return payload as AuthToken;
};

export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
        verifyJwt(token);
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};
