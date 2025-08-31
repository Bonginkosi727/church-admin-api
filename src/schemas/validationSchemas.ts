import { z } from 'zod';

// Common validation schemas
export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val)).refine(val => val >= 1, 'Page must be at least 1'),
  limit: z.string().optional().default('10').transform(val => parseInt(val)).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'leader', 'member', 'finance_manager', 'event_coordinator', 'ministry_leader', 'communications_manager', 'asset_manager']),
  isActive: z.boolean().optional().default(true)
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['admin', 'leader', 'member', 'finance_manager', 'event_coordinator', 'ministry_leader', 'communications_manager', 'asset_manager']).optional(),
  isActive: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Member validation schemas
export const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format').optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(500, 'Address is too long').optional(),
  cellId: z.string().uuid('Invalid cell ID').optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  birthDate: z.string().datetime().optional().or(z.date().optional()),
  occupation: z.string().max(255, 'Occupation is too long').optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateMemberSchema = createMemberSchema.partial();

export const memberQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  ministry: z.string().uuid().optional(),
  cell: z.string().uuid().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  ageMin: z.string().transform(val => parseInt(val)).optional(),
  ageMax: z.string().transform(val => parseInt(val)).optional()
});

// Ministry validation schemas
export const createMinistrySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  type: z.enum(['worship', 'children', 'youth', 'adults', 'outreach', 'administration', 'media', 'security', 'hospitality', 'other']),
  leaderId: z.string().uuid('Invalid leader ID').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateMinistrySchema = createMinistrySchema.partial();

export const ministryMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: z.string().min(1, 'Role is required').max(100, 'Role is too long').optional().default('member')
});

// Event validation schemas
export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  type: z.enum(['service', 'meeting', 'conference', 'workshop', 'social', 'outreach', 'training', 'other']),
  date: z.string().datetime().or(z.date()),
  startTime: z.string().datetime().or(z.date()),
  endTime: z.string().datetime().or(z.date()),
  location: z.string().max(255, 'Location is too long').optional(),
  maxAttendees: z.number().int().min(1).optional(),
  registrationRequired: z.boolean().optional().default(false),
  registrationDeadline: z.string().datetime().optional().or(z.date().optional()),
  organizerId: z.string().uuid('Invalid organizer ID'),
  ministryId: z.string().uuid('Invalid ministry ID').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateEventSchema = createEventSchema.partial();

export const eventQuerySchema = paginationSchema.extend({
  type: z.enum(['service', 'meeting', 'conference', 'workshop', 'social', 'outreach', 'training', 'other']).optional(),
  ministry: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  upcoming: z.string().transform(val => val === 'true').optional(),
  past: z.string().transform(val => val === 'true').optional()
});

export const eventRegistrationSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  notes: z.string().max(500, 'Notes are too long').optional()
});

export const attendanceSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  status: z.enum(['present', 'absent', 'late']),
  notes: z.string().max(500, 'Notes are too long').optional()
});

// Contribution validation schemas
export const createContributionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['tithe', 'offering', 'donation', 'fundraising', 'other']),
  date: z.string().datetime().or(z.date()),
  memberId: z.string().uuid('Invalid member ID'),
  description: z.string().max(500, 'Description is too long').optional(),
  method: z.enum(['cash', 'check', 'card', 'bank_transfer', 'mobile_money', 'other']).optional().default('cash'),
  reference: z.string().max(255, 'Reference is too long').optional(),
  isVerified: z.boolean().optional().default(false)
});

export const updateContributionSchema = createContributionSchema.partial();

export const contributionQuerySchema = paginationSchema.extend({
  type: z.enum(['tithe', 'offering', 'donation', 'fundraising', 'other']).optional(),
  member: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  method: z.enum(['cash', 'check', 'card', 'bank_transfer', 'mobile_money', 'other']).optional(),
  verified: z.string().transform(val => val === 'true').optional()
});

// Cell validation schemas
export const createCellSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  number: z.string().max(50, 'Number is too long').optional(),
  description: z.string().max(1000, 'Description is too long').optional(),
  location: z.string().max(255, 'Location is too long').optional(),
  meetingDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  meetingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  leaderId: z.string().uuid('Invalid leader ID').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateCellSchema = createCellSchema.partial();

// Announcement validation schemas
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['general', 'urgent', 'event', 'ministry', 'service']),
  targetAudience: z.enum(['all', 'members', 'leaders', 'ministry', 'cell']),
  ministryId: z.string().uuid('Invalid ministry ID').optional(),
  cellId: z.string().uuid('Invalid cell ID').optional(),
  publishDate: z.string().datetime().or(z.date()).optional(),
  expiryDate: z.string().datetime().or(z.date()).optional(),
  authorId: z.string().uuid('Invalid author ID'),
  isActive: z.boolean().optional().default(true)
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Asset validation schemas
export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  type: z.enum(['equipment', 'furniture', 'vehicle', 'technology', 'property', 'other']),
  value: z.number().positive('Value must be positive').optional(),
  purchaseDate: z.string().datetime().or(z.date()).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']).optional().default('good'),
  location: z.string().max(255, 'Location is too long').optional(),
  assignedTo: z.string().uuid('Invalid user ID').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateAssetSchema = createAssetSchema.partial();

// Budget validation schemas
export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  category: z.enum(['operations', 'ministry', 'facilities', 'staff', 'missions', 'events', 'other']),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  ministryId: z.string().uuid('Invalid ministry ID').optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateBudgetSchema = createBudgetSchema.partial();

// Expense validation schemas
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255, 'Description is too long'),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum(['operations', 'ministry', 'facilities', 'staff', 'missions', 'events', 'other']),
  date: z.string().datetime().or(z.date()),
  budgetId: z.string().uuid('Invalid budget ID').optional(),
  ministryId: z.string().uuid('Invalid ministry ID').optional(),
  approvedBy: z.string().uuid('Invalid user ID').optional(),
  receipt: z.string().max(255, 'Receipt reference is too long').optional(),
  isApproved: z.boolean().optional().default(false)
});

export const updateExpenseSchema = createExpenseSchema.partial();

// Bulk operation schemas
export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid('Invalid ID')).min(1, 'At least one ID is required'),
  updateData: z.record(z.string(), z.any())
});

export const importSchema = z.object({
  validateOnly: z.string().transform(val => val === 'true').optional().default('false')
});

// Export schemas
export const exportSchema = z.object({
  format: z.enum(['xlsx', 'csv', 'pdf']).optional().default('xlsx'),
  fields: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.any().refine(file => file !== undefined, 'File is required')
});

// Activity validation schemas
export const createActivitySchema = z.object({
  type: z.enum(['member_joined', 'member_updated', 'event_created', 'contribution_recorded', 'ministry_updated', 'user_login', 'other']),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  entityType: z.string().max(100, 'Entity type is too long').optional(),
  entityId: z.string().uuid('Invalid entity ID').optional(),
  userId: z.string().uuid('Invalid user ID'),
  metadata: z.record(z.string(), z.any()).optional()
});

export const activityQuerySchema = paginationSchema.extend({
  type: z.enum(['member_joined', 'member_updated', 'event_created', 'contribution_recorded', 'ministry_updated', 'user_login', 'other']).optional(),
  user: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional()
});

