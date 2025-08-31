import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { MinistryController } from '../controllers/MinistryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ministryController = new MinistryController();

// Validation schemas
const createMinistryValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('type').isIn(['WORSHIP', 'YOUTH', 'CHILDREN', 'OUTREACH', 'FELLOWSHIP', 'SERVICE', 'OTHER']).withMessage('Invalid ministry type'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('leaderId').isUUID().withMessage('Valid leader ID required'),
  body('meetingSchedule').optional().trim().isLength({ max: 500 }),
  body('contactInfo').optional().trim().isLength({ max: 500 })
];

const updateMinistryValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('type').optional().isIn(['WORSHIP', 'YOUTH', 'CHILDREN', 'OUTREACH', 'FELLOWSHIP', 'SERVICE', 'OTHER']),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('leaderId').optional().isUUID(),
  body('meetingSchedule').optional().trim().isLength({ max: 500 }),
  body('contactInfo').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }),
  query('type').optional().isIn(['WORSHIP', 'YOUTH', 'CHILDREN', 'OUTREACH', 'FELLOWSHIP', 'SERVICE', 'OTHER']),
  query('isActive').optional().isBoolean(),
  query('sortBy').optional().isIn(['name', 'type', 'createdAt', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
];

const idValidation = [
  param('id').isUUID().withMessage('Valid ministry ID required')
];

const memberActionValidation = [
  param('id').isUUID().withMessage('Valid ministry ID required'),
  body('memberId').isUUID().withMessage('Valid member ID required'),
  body('role').optional().isIn(['MEMBER', 'LEADER', 'ASSISTANT']).withMessage('Invalid role')
];

// Public routes
router.get('/stats', ministryController.getMinistryStats);

// Protected routes - require authentication
router.use(authenticate);

// GET /ministries - List all ministries with filtering and pagination
router.get('/', queryValidation, ministryController.getMinistries);

// GET /ministries/:id - Get ministry by ID
router.get('/:id', idValidation, ministryController.getMinistryById);

// GET /ministries/:id/members - Get ministry members
router.get('/:id/members', idValidation, ministryController.getMinistryMembers);

// Admin/Leader only routes
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'MINISTRY_LEADER']));

// POST /ministries - Create new ministry
router.post('/', createMinistryValidation, ministryController.createMinistry);

// PUT /ministries/:id - Update ministry
router.put('/:id', [...idValidation, ...updateMinistryValidation], ministryController.updateMinistry);

// POST /ministries/:id/members - Add member to ministry
router.post('/:id/members', memberActionValidation, ministryController.addMember);

// DELETE /ministries/:id/members/:memberId - Remove member from ministry
router.delete('/:id/members/:memberId', [
  param('id').isUUID().withMessage('Valid ministry ID required'),
  param('memberId').isUUID().withMessage('Valid member ID required')
], ministryController.removeMember);

// PUT /ministries/:id/members/:memberId - Update member role in ministry
router.put('/:id/members/:memberId', [
  param('id').isUUID().withMessage('Valid ministry ID required'),
  param('memberId').isUUID().withMessage('Valid member ID required'),
  body('role').isIn(['MEMBER', 'LEADER', 'ASSISTANT']).withMessage('Invalid role')
], ministryController.updateMemberRole);

// Super Admin only routes
router.use(authorize(['SUPER_ADMIN']));

// DELETE /ministries/:id - Delete ministry
router.delete('/:id', idValidation, ministryController.deleteMinistry);

export default router;

