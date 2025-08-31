import { Router } from 'express';
import { body } from 'express-validator';
import { NewAuthController } from '../controllers/NewAuthController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();
const authController = new NewAuthController();

// Validation schemas using express-validator
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  body('role').optional().isIn(['ADMIN', 'LEADER', 'MEMBER']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('any'),
  body('dateOfBirth').optional().isISO8601().toDate(),
  body('address').optional().trim().isLength({ max: 500 }),
  body('emergencyContact').optional().trim().isLength({ max: 200 })
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], authController.forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.resetPassword);

// Protected routes
router.use(authenticate);

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidation, authController.updateProfile);
router.post('/change-password', changePasswordValidation, authController.changePassword);
router.post('/refresh-token', authController.refreshToken);

// Optional auth routes (for checking login status)
router.get('/me', optionalAuth, authController.getCurrentUser);

export { router as authRoutes };

