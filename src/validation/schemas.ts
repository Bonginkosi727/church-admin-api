import { z } from 'zod';

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
});

export const updateUserSchema = createUserSchema.partial();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Member schemas
export const createMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format').optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  cellId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  birthDate: z.string().datetime().optional(),
  occupation: z.string().optional(),
  notes: z.string().optional()
});

export const updateMemberSchema = createMemberSchema.partial();

// Ministry schemas
export const createMinistrySchema = z.object({
  name: z.string().min(2, 'Ministry name must be at least 2 characters'),
  type: z.enum(['YOUTH', 'CHILDREN', 'WOMEN', 'MEN', 'MUSIC', 'USHERS', 'MEDIA', 'EVANGELISM', 'PRAYER', 'WORSHIP', 'FINANCE', 'ADMINISTRATION']),
  description: z.string().optional(),
  leaderId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  location: z.string().optional()
});

export const updateMinistrySchema = createMinistrySchema.partial();

// Event schemas
export const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  date: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid end date format').optional(),
  location: z.string().optional(),
  type: z.enum(['SERVICE', 'MEETING', 'OUTREACH', 'CONFERENCE', 'SOCIAL', 'TRAINING', 'PRAYER', 'WORSHIP', 'FELLOWSHIP']).default('SERVICE'),
  capacity: z.number().positive().optional(),
  isPublic: z.boolean().default(true),
  ministryId: z.string().uuid().optional()
});

export const updateEventSchema = createEventSchema.partial();

// Contribution schemas
export const createContributionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['TITHE', 'OFFERING', 'PLEDGE', 'DONATION', 'BUILDING_FUND', 'SPECIAL_COLLECTION', 'MISSIONS']),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.string().datetime('Invalid date format'),
  memberId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'CHECK']).default('CASH'),
  reference: z.string().optional()
});

export const updateContributionSchema = createContributionSchema.partial();

// Cell schemas
export const createCellSchema = z.object({
  name: z.string().min(1, 'Cell name is required'),
  number: z.string().optional(),
  leaderId: z.string().uuid('Valid leader ID is required'),
  location: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  description: z.string().optional()
});

export const updateCellSchema = createCellSchema.partial();

// Announcement schemas
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Announcement title is required'),
  content: z.string().min(1, 'Announcement content is required'),
  type: z.enum(['GENERAL', 'URGENT', 'EVENT', 'MINISTRY', 'ADMINISTRATIVE']).default('GENERAL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format'),
  targetRoles: z.array(z.string()).optional()
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive().max(100)).default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const memberQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  cellId: z.string().uuid().optional(),
  ministryId: z.string().uuid().optional(),
  isActive: z.string().transform(val => val === 'true').optional()
});

export const eventQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  type: z.string().optional(),
  ministryId: z.string().uuid().optional(),
  upcoming: z.string().transform(val => val === 'true').optional()
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

