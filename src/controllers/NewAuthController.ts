import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/database';
import { ApiError, ConflictError, UnauthorizedError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class NewAuthController {
  // Register new user
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { email, password, role = 'member' } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = this.generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          user,
          token
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Login user
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          isActive: true
        }
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generate JWT token
      const userForToken = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };
      const token = this.generateToken(userForToken);

      res.json({
        success: true,
        data: {
          user: userForToken,
          token
        },
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get current user profile
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              age: true,
              gender: true,
              cell: {
                select: {
                  id: true,
                  name: true
                }
              },
              ministries: {
                where: { isActive: true },
                include: {
                  ministry: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Helper method to generate JWT token
  private generateToken = (user: { id: string; email: string; role: string }): string => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      } as jwt.SignOptions
    );
  };

  // Get current user (with optional auth)
  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.json({
          success: true,
          data: null,
          message: 'No authenticated user'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          dateOfBirth: true,
          address: true,
          emergencyContact: true,
          isActive: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Current user retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update user profile
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const {
        name,
        phone,
        dateOfBirth,
        address,
        emergencyContact
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
      if (address !== undefined) updateData.address = address;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          dateOfBirth: true,
          address: true,
          emergencyContact: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Change password
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          email: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Refresh token
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Get fresh user data
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found or inactive');
      }

      // Generate new token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          user
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Logout (in a stateless JWT system, this is mainly client-side)
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In a stateless JWT system, logout is primarily handled client-side
      // However, we can log this event or invalidate tokens if using a blacklist
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Don't reveal if email exists or not for security
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });

      // If user exists, generate reset token and send email
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpiry
          }
        });

        // TODO: Send email with reset link
        // await sendPasswordResetEmail(user.email, resetToken);
      }
    } catch (error) {
      next(error);
    }
  };

  // Reset password
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { token, newPassword } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() }
        }
      });

      if (!user) {
        throw new ApiError(400, 'Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

