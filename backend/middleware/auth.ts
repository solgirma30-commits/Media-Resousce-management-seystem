import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '../firebase-admin';

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const adminApp = getAdminApp();
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
}
