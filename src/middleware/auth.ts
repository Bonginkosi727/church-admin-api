import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      iat: number;
      exp: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        roles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid token - user not found or inactive');
    }

    // Get primary role (for backwards compatibility)
    const primaryRole = user.roles[0]?.role.name || 'MEMBER';

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    req.user = {
      id: user.id,
      email: user.email,
      role: primaryRole,
      isActive: user.isActive
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (allowedRoles: string[] | string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

// Specific role-based middleware
export const requireAdmin = authorize(['admin']);
export const requireLeader = authorize(['admin', 'leader']);
export const requireFinanceAccess = authorize(['admin', 'finance_manager', 'leader']);
export const requireEventAccess = authorize(['admin', 'event_coordinator', 'leader']);
export const requireMinistryAccess = authorize(['admin', 'ministry_leader', 'leader']);
export const requireCommunicationAccess = authorize(['admin', 'communications_manager', 'leader']);
export const requireAssetAccess = authorize(['admin', 'asset_manager']);

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        roles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (user && user.isActive) {
      const primaryRole = user.roles[0]?.role.name || 'MEMBER';
      req.user = {
        id: user.id,
        email: user.email,
        role: primaryRole,
        isActive: user.isActive
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

