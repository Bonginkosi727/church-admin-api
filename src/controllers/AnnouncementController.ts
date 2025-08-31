import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class AnnouncementController {
  // Get all announcements with filtering and pagination
  getAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        priority,
        isActive,
        targetAudience,
        publishedOnly = 'true',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (priority) {
        where.priority = priority as string;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (targetAudience) {
        where.targetAudience = targetAudience as string;
      }

      // Show only published announcements by default (for public access)
      if (publishedOnly === 'true') {
        where.isPublished = true;
        where.isActive = true;
        
        // Also check if announcement is within publication period
        const now = new Date();
        where.AND = [
          {
            OR: [
              { publishDate: null },
              { publishDate: { lte: now } }
            ]
          },
          {
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: now } }
            ]
          }
        ];
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.announcement.count({ where })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: announcements,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        message: 'Announcements retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get announcement by ID
  getAnnouncementById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Announcement ID is required');
      }

      const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!announcement) {
        throw new ApiError(404, 'Announcement not found');
      }

      res.json({
        success: true,
        data: announcement,
        message: 'Announcement retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new announcement
  createAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const {
        title,
        content,
        priority = 'normal',
        targetAudience = 'all',
        publishDate,
        expiryDate,
        isPublished = false,
        authorId,
        attachments
      } = req.body;

      // Verify author exists
      const author = await prisma.member.findUnique({
        where: { id: authorId }
      });

      if (!author) {
        throw new ApiError(404, 'Author not found');
      }

      // Validate dates
      if (publishDate && expiryDate) {
        const pubDate = new Date(publishDate);
        const expDate = new Date(expiryDate);
        
        if (pubDate >= expDate) {
          throw new ApiError(400, 'Publish date must be before expiry date');
        }
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          priority,
          targetAudience,
          publishDate: publishDate ? new Date(publishDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isPublished,
          isActive: true,
          authorId,
          attachments: attachments || []
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: announcement,
        message: 'Announcement created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update announcement
  updateAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Announcement ID is required');
      }

      // Check if announcement exists
      const existingAnnouncement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!existingAnnouncement) {
        throw new ApiError(404, 'Announcement not found');
      }

      const {
        title,
        content,
        priority,
        targetAudience,
        publishDate,
        expiryDate,
        isPublished,
        isActive,
        attachments
      } = req.body;

      const updateData: any = {};

      // Build update data
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;
      if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
      if (publishDate !== undefined) {
        updateData.publishDate = publishDate ? new Date(publishDate) : null;
      }
      if (expiryDate !== undefined) {
        updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      }
      if (isPublished !== undefined) updateData.isPublished = isPublished;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (attachments !== undefined) updateData.attachments = attachments;

      // Validate dates if being updated
      if (updateData.publishDate && updateData.expiryDate) {
        if (updateData.publishDate >= updateData.expiryDate) {
          throw new ApiError(400, 'Publish date must be before expiry date');
        }
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: announcement,
        message: 'Announcement updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete announcement
  deleteAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Announcement ID is required');
      }

      // Check if announcement exists
      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        throw new ApiError(404, 'Announcement not found');
      }

      // Soft delete by marking as inactive
      await prisma.announcement.update({
        where: { id },
        data: { 
          isActive: false,
          isPublished: false 
        }
      });

      res.json({
        success: true,
        message: 'Announcement deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Publish announcement
  publishAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Announcement ID is required');
      }

      // Check if announcement exists
      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        throw new ApiError(404, 'Announcement not found');
      }

      if (!announcement.isActive) {
        throw new ApiError(400, 'Cannot publish inactive announcement');
      }

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: { 
          isPublished: true,
          publishDate: announcement.publishDate || new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedAnnouncement,
        message: 'Announcement published successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Unpublish announcement
  unpublishAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Announcement ID is required');
      }

      // Check if announcement exists
      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        throw new ApiError(404, 'Announcement not found');
      }

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: { isPublished: false },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedAnnouncement,
        message: 'Announcement unpublished successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get announcements by priority
  getAnnouncementsByPriority = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { priority } = req.params;
      
      if (!priority || !['low', 'normal', 'high', 'urgent'].includes(priority)) {
        throw new ApiError(400, 'Invalid priority level');
      }

      const announcements = await prisma.announcement.findMany({
        where: {
          priority,
          isPublished: true,
          isActive: true,
          OR: [
            { publishDate: null },
            { publishDate: { lte: new Date() } }
          ],
          AND: [
            {
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: new Date() } }
              ]
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: announcements,
        message: `${priority} priority announcements retrieved successfully`
      });
    } catch (error) {
      next(error);
    }
  };

  // Get announcement statistics
  getAnnouncementStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalAnnouncements,
        publishedAnnouncements,
        activeAnnouncements,
        expiredAnnouncements,
        priorityStats,
        audienceStats
      ] = await Promise.all([
        prisma.announcement.count(),
        prisma.announcement.count({ 
          where: { 
            isPublished: true,
            isActive: true 
          }
        }),
        prisma.announcement.count({ where: { isActive: true } }),
        prisma.announcement.count({ 
          where: { 
            expiryDate: { lt: new Date() },
            isActive: true
          }
        }),
        prisma.announcement.groupBy({
          by: ['priority'],
          where: { isActive: true },
          _count: true
        }),
        prisma.announcement.groupBy({
          by: ['targetAudience'],
          where: { isActive: true },
          _count: true
        })
      ]);

      const stats = {
        total: totalAnnouncements,
        published: publishedAnnouncements,
        active: activeAnnouncements,
        expired: expiredAnnouncements,
        draft: totalAnnouncements - publishedAnnouncements,
        byPriority: priorityStats.map((stat: any) => ({
          priority: stat.priority,
          count: stat._count
        })),
        byAudience: audienceStats.map((stat: any) => ({
          audience: stat.targetAudience,
          count: stat._count
        }))
      };

      res.json({
        success: true,
        data: stats,
        message: 'Announcement statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get recent announcements (for dashboard/home page)
  getRecentAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit = 5, targetAudience } = req.query;

      const where: any = {
        isPublished: true,
        isActive: true,
        OR: [
          { publishDate: null },
          { publishDate: { lte: new Date() } }
        ],
        AND: [
          {
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: new Date() } }
            ]
          }
        ]
      };

      if (targetAudience) {
        where.targetAudience = targetAudience as string;
      }

      const announcements = await prisma.announcement.findMany({
        where,
        take: parseInt(limit as string),
        orderBy: [
          { priority: 'desc' }, // Urgent first
          { createdAt: 'desc' }
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: announcements,
        message: 'Recent announcements retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Search announcements
  searchAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || (q as string).trim().length < 2) {
        throw new ApiError(400, 'Search query must be at least 2 characters long');
      }

      const searchTerm = (q as string).trim();

      const announcements = await prisma.announcement.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { content: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            { isPublished: true },
            { isActive: true },
            {
              OR: [
                { publishDate: null },
                { publishDate: { lte: new Date() } }
              ]
            },
            {
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: new Date() } }
              ]
            }
          ]
        },
        take: parseInt(limit as string),
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: announcements,
        searchTerm,
        count: announcements.length,
        message: 'Search completed successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

