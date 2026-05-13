import { Request, Response, NextFunction } from 'express';

// Simple API key validation (you'll enhance this later)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    
    // For now, just check if key exists
    // Later you'll validate against database
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'API key required' 
        });
    }
    
    // TODO: Validate against database
    next();
};