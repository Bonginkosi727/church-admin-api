import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { EventController } from '../controllers/EventController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const eventController = new EventController();

// Validation schemas
const createEventValidation = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('type').isIn(['SERVICE', 'CONFERENCE', 'WORKSHOP', 'FELLOWSHIP', 'OUTREACH', 'MEETING', 'OTHER']).withMessage('Invalid event type'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
  body('location').trim().isLength({ min: 2, max: 200 }).withMessage('Location must be between 2 and 200 characters'),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be a positive integer'),
  body('registrationRequired').optional().isBoolean(),
  body('registrationDeadline').optional().isISO8601().withMessage('Valid registration deadline required'),
  body('organizerId').isUUID().withMessage('Valid organizer ID required'),
  body('ministryId').optional().isUUID().withMessage('Valid ministry ID required')
];

const updateEventValidation = [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('type').optional().isIn(['SERVICE', 'CONFERENCE', 'WORKSHOP', 'FELLOWSHIP', 'OUTREACH', 'MEETING', 'OTHER']),
  body('date').optional().isISO8601(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('location').optional().trim().isLength({ min: 2, max: 200 }),
  body('maxAttendees').optional().isInt({ min: 1 }),
  body('registrationRequired').optional().isBoolean(),
  body('registrationDeadline').optional().isISO8601(),
  body('organizerId').optional().isUUID(),
  body('ministryId').optional().isUUID(),
  body('isActive').optional().isBoolean()
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }),
  query('type').optional().isIn(['SERVICE', 'CONFERENCE', 'WORKSHOP', 'FELLOWSHIP', 'OUTREACH', 'MEETING', 'OTHER']),
  query('ministry').optional().isUUID(),
  query('upcoming').optional().isBoolean(),
  query('past').optional().isBoolean(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('sortBy').optional().isIn(['title', 'date', 'type', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
];

const idValidation = [
  param('id').isUUID().withMessage('Valid event ID required')
];

const registrationValidation = [
  param('id').isUUID().withMessage('Valid event ID required'),
  body('memberId').isUUID().withMessage('Valid member ID required'),
  body('notes').optional().trim().isLength({ max: 500 })
];

const attendanceValidation = [
  param('id').isUUID().withMessage('Valid event ID required'),
  body('memberId').isUUID().withMessage('Valid member ID required'),
  body('status').isIn(['PRESENT', 'ABSENT', 'LATE']).withMessage('Invalid attendance status'),
  body('notes').optional().trim().isLength({ max: 500 })
];

// Public routes
router.get('/stats', eventController.getEventStats);

// Protected routes - require authentication
router.use(authenticate);

// GET /events - List all events with filtering and pagination
router.get('/', queryValidation, eventController.getEvents);

// GET /events/:id - Get event by ID
router.get('/:id', idValidation, eventController.getEventById);

// Event organizers and admin routes
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'EVENT_ORGANIZER', 'MINISTRY_LEADER']));

// POST /events - Create new event
router.post('/', createEventValidation, eventController.createEvent);

// PUT /events/:id - Update event
router.put('/:id', [...idValidation, ...updateEventValidation], eventController.updateEvent);

// POST /events/:id/register - Register for event
router.post('/:id/register', registrationValidation, eventController.registerForEvent);

// DELETE /events/:id/register/:memberId - Cancel registration
router.delete('/:id/register/:memberId', [
  param('id').isUUID().withMessage('Valid event ID required'),
  param('memberId').isUUID().withMessage('Valid member ID required')
], eventController.cancelRegistration);

// POST /events/:id/attendance - Record attendance
router.post('/:id/attendance', attendanceValidation, eventController.recordAttendance);

// Super Admin only routes
router.use(authorize(['SUPER_ADMIN']));

// DELETE /events/:id - Delete event
router.delete('/:id', idValidation, eventController.deleteEvent);

export default router;

