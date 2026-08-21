import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token is missing or invalid' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Token is invalid or expired' });
      return;
    }

    req.user = decoded as any;
    next();
  });
};
