import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { AnnouncementController } from '../controllers/AnnouncementController';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';

const router = Router();
const announcementController = new AnnouncementController();

// Validation schemas
const createAnnouncementValidation = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('content').trim().isLength({ min: 10, max: 5000 }).withMessage('Content must be between 10 and 5000 characters'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('targetAudience').optional().isIn(['all', 'members', 'leaders', 'youth', 'children', 'women', 'men']).withMessage('Invalid target audience'),
  body('publishDate').optional().isISO8601().withMessage('Valid publish date required'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  body('isPublished').optional().isBoolean(),
  body('authorId').isUUID().withMessage('Valid author ID required'),
  body('attachments').optional().isArray()
];

const updateAnnouncementValidation = [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('content').optional().trim().isLength({ min: 10, max: 5000 }),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('targetAudience').optional().isIn(['all', 'members', 'leaders', 'youth', 'children', 'women', 'men']),
  body('publishDate').optional().isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('isPublished').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('attachments').optional().isArray()
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  query('isActive').optional().isBoolean(),
  query('targetAudience').optional().isIn(['all', 'members', 'leaders', 'youth', 'children', 'women', 'men']),
  query('publishedOnly').optional().isBoolean(),
  query('sortBy').optional().isIn(['title', 'priority', 'createdAt', 'publishDate']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
];

const recentQueryValidation = [
  query('limit').optional().isInt({ min: 1, max: 20 }),
  query('targetAudience').optional().isIn(['all', 'members', 'leaders', 'youth', 'children', 'women', 'men'])
];

const searchValidation = [
  query('q').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('limit').optional().isInt({ min: 1, max: 50 })
];

const idValidation = [
  param('id').isUUID().withMessage('Valid announcement ID required')
];

const priorityValidation = [
  param('priority').isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
];

// Public routes (with optional authentication)
router.get('/recent', optionalAuth, recentQueryValidation, announcementController.getRecentAnnouncements);
router.get('/search', optionalAuth, searchValidation, announcementController.searchAnnouncements);
router.get('/priority/:priority', optionalAuth, priorityValidation, announcementController.getAnnouncementsByPriority);
router.get('/stats', announcementController.getAnnouncementStats);

// Public route for published announcements
router.get('/public', queryValidation, announcementController.getAnnouncements);
router.get('/public/:id', idValidation, announcementController.getAnnouncementById);

// Protected routes - require authentication
router.use(authenticate);

// GET /announcements - List all announcements (including unpublished for admin)
router.get('/', queryValidation, announcementController.getAnnouncements);

// GET /announcements/:id - Get announcement by ID
router.get('/:id', idValidation, announcementController.getAnnouncementById);

// Content creators and admin routes
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'CONTENT_CREATOR', 'COMMUNICATIONS']));

// POST /announcements - Create new announcement
router.post('/', createAnnouncementValidation, announcementController.createAnnouncement);

// PUT /announcements/:id - Update announcement
router.put('/:id', [...idValidation, ...updateAnnouncementValidation], announcementController.updateAnnouncement);

// POST /announcements/:id/publish - Publish announcement
router.post('/:id/publish', idValidation, announcementController.publishAnnouncement);

// POST /announcements/:id/unpublish - Unpublish announcement
router.post('/:id/unpublish', idValidation, announcementController.unpublishAnnouncement);

// Super Admin only routes
router.use(authorize(['SUPER_ADMIN']));

// DELETE /announcements/:id - Delete announcement
router.delete('/:id', idValidation, announcementController.deleteAnnouncement);

export default router;

