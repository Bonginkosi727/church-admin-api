import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { ContributionController } from '../controllers/ContributionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const contributionController = new ContributionController();

// Validation schemas
const createContributionValidation = [
  body('amount').isNumeric().custom(value => value > 0).withMessage('Amount must be greater than 0'),
  body('type').isIn(['TITHE', 'OFFERING', 'SPECIAL', 'BUILDING_FUND', 'MISSION', 'OTHER']).withMessage('Invalid contribution type'),
  body('date').optional().isISO8601().withMessage('Valid date required'),
  body('paymentMethod').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY', 'OTHER']).withMessage('Invalid payment method'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long'),
  body('memberId').optional().isUUID().withMessage('Valid member ID required'),
  body('isAnonymous').optional().isBoolean()
];

const updateContributionValidation = [
  body('amount').optional().isNumeric().custom(value => value > 0),
  body('type').optional().isIn(['TITHE', 'OFFERING', 'SPECIAL', 'BUILDING_FUND', 'MISSION', 'OTHER']),
  body('date').optional().isISO8601(),
  body('paymentMethod').optional().isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY', 'OTHER']),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('memberId').optional().isUUID(),
  body('isAnonymous').optional().isBoolean()
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }),
  query('type').optional().isIn(['TITHE', 'OFFERING', 'SPECIAL', 'BUILDING_FUND', 'MISSION', 'OTHER']),
  query('memberId').optional().isUUID(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('amountMin').optional().isNumeric(),
  query('amountMax').optional().isNumeric(),
  query('sortBy').optional().isIn(['amount', 'date', 'type', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
];

const statsQueryValidation = [
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('groupBy').optional().isIn(['month', 'quarter', 'year'])
];

const exportQueryValidation = [
  query('format').optional().isIn(['csv', 'excel']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('type').optional().isIn(['TITHE', 'OFFERING', 'SPECIAL', 'BUILDING_FUND', 'MISSION', 'OTHER']),
  query('memberId').optional().isUUID()
];

const idValidation = [
  param('id').isUUID().withMessage('Valid contribution ID required')
];

const memberIdValidation = [
  param('memberId').isUUID().withMessage('Valid member ID required')
];

// Public routes
router.get('/stats', statsQueryValidation, contributionController.getContributionStats);

// Protected routes - require authentication
router.use(authenticate);

// GET /contributions - List all contributions with filtering and pagination
router.get('/', queryValidation, contributionController.getContributions);

// GET /contributions/:id - Get contribution by ID
router.get('/:id', idValidation, contributionController.getContributionById);

// GET /contributions/member/:memberId - Get member contribution history
router.get('/member/:memberId', [...memberIdValidation, ...queryValidation], contributionController.getMemberContributions);

// Finance team and admin routes
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'FINANCE', 'TREASURER']));

// POST /contributions - Create new contribution
router.post('/', createContributionValidation, contributionController.createContribution);

// PUT /contributions/:id - Update contribution
router.put('/:id', [...idValidation, ...updateContributionValidation], contributionController.updateContribution);

// GET /contributions/export - Export contributions
router.get('/export', exportQueryValidation, contributionController.exportContributions);

// Super Admin and Treasurer only routes
router.use(authorize(['SUPER_ADMIN', 'TREASURER']));

// DELETE /contributions/:id - Delete contribution
router.delete('/:id', idValidation, contributionController.deleteContribution);

export default router;

