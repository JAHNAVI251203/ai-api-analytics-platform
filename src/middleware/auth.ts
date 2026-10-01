import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthToken {
    sub: string;
    name: string;
    email: string;
    jti?: string;
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

export const isTokenRevoked = async (token: AuthToken) => {
    if (!token.jti) return false;
    const { redis } = await import('../config/database');
    return Boolean(await redis.get(`auth:revoked:${token.jti}`));
};

export const revokeJwt = async (token: AuthToken) => {
    if (!token.jti || !token.exp) return;
    const ttl = token.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    const { redis } = await import('../config/database');
    await redis.setex(`auth:revoked:${token.jti}`, ttl, '1');
};

export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
        const auth = verifyJwt(token);
        if (await isTokenRevoked(auth)) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }
        res.locals.auth = auth;
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};

export const isAdminEmail = (email: string, adminEmail = process.env.ADMIN_EMAIL) => {
    const normalizedAdminEmail = adminEmail?.trim().toLowerCase();
    return Boolean(normalizedAdminEmail) && email.toLowerCase() === normalizedAdminEmail;
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.auth as AuthToken | undefined;
    if (!user || !isAdminEmail(user.email)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to access this resource.'
        });
    }
    next();
};
