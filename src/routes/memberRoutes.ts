import { Router } from 'express';
import { SimpleMemberController } from '../controllers/SimpleMemberController';
import { body, query, param } from 'express-validator';

const router = Router();
const memberController = new SimpleMemberController();

// Validation middleware
const createMemberValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 150 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Valid gender required'),
  body('cellId').optional().isUUID().withMessage('Valid cell ID required')
];

const updateMemberValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 150 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Valid gender required'),
  body('cellId').optional().isUUID().withMessage('Valid cell ID required')
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('cellId').optional().isUUID().withMessage('Valid cell ID required'),
  query('ministryId').optional().isUUID().withMessage('Valid ministry ID required')
];

const idValidation = [
  param('id').isUUID().withMessage('Valid member ID required')
];

// Routes
router.get('/stats', memberController.getMemberStats);
router.get('/', queryValidation, memberController.getMembers);
router.get('/:id', idValidation, memberController.getMemberById);
router.post('/', createMemberValidation, memberController.createMember);
router.put('/:id', [...idValidation, ...updateMemberValidation], memberController.updateMember);
router.delete('/:id', idValidation, memberController.deleteMember);

export default router;

