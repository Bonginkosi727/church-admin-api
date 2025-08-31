import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class EventController {
  // Get all events with optional filtering and pagination
  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        ministry,
        upcoming,
        past,
        dateFrom,
        dateTo,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = { isActive: true };

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { location: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (type) {
        where.type = type as string;
      }

      if (ministry) {
        where.ministryId = ministry as string;
      }

      // Date filters
      const now = new Date();
      if (upcoming === 'true') {
        where.date = { gte: now };
      } else if (past === 'true') {
        where.date = { lt: now };
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            organizer: {
              select: {
                id: true,
                name: true
              }
            },
            ministry: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            _count: {
              select: {
                registrations: {
                  where: { isActive: true }
                },
                attendances: true
              }
            }
          }
        }),
        prisma.event.count({ where })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        message: 'Events retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get event by ID
  getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Event ID is required');
      }

      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          ministry: {
            select: {
              id: true,
              name: true,
              type: true,
              leader: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          registrations: {
            where: { isActive: true },
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          attendances: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              registrations: {
                where: { isActive: true }
              },
              attendances: true
            }
          }
        }
      });

      if (!event) {
        throw new ApiError(404, 'Event not found');
      }

      res.json({
        success: true,
        data: event,
        message: 'Event retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new event
  createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const {
        title,
        description,
        type,
        date,
        startTime,
        endTime,
        location,
        maxAttendees,
        registrationRequired,
        registrationDeadline,
        organizerId,
        ministryId
      } = req.body;

      // Verify organizer exists
      const organizer = await prisma.member.findUnique({
        where: { id: organizerId }
      });

      if (!organizer) {
        throw new ApiError(404, 'Organizer not found');
      }

      // Verify ministry exists if provided
      if (ministryId) {
        const ministry = await prisma.ministry.findUnique({
          where: { id: ministryId }
        });

        if (!ministry) {
          throw new ApiError(404, 'Ministry not found');
        }
      }

      // Validate dates
      const eventDate = new Date(date);
      const eventStartTime = new Date(startTime);
      const eventEndTime = new Date(endTime);

      if (eventStartTime >= eventEndTime) {
        throw new ApiError(400, 'Start time must be before end time');
      }

      if (registrationRequired && registrationDeadline) {
        const regDeadline = new Date(registrationDeadline);
        if (regDeadline >= eventDate) {
          throw new ApiError(400, 'Registration deadline must be before event date');
        }
      }

      const event = await prisma.event.create({
        data: {
          title,
          description,
          type,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          location,
          maxAttendees,
          registrationRequired: registrationRequired || false,
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          organizerId,
          ministryId,
          isActive: true
        },
        include: {
          organizer: {
            select: {
              id: true,
              name: true
            }
          },
          ministry: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update event
  updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Event ID is required');
      }

      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id }
      });

      if (!existingEvent) {
        throw new ApiError(404, 'Event not found');
      }

      const {
        title,
        description,
        type,
        date,
        startTime,
        endTime,
        location,
        maxAttendees,
        registrationRequired,
        registrationDeadline,
        organizerId,
        ministryId,
        isActive
      } = req.body;

      const updateData: any = {};

      // Build update data
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (date !== undefined) updateData.date = new Date(date);
      if (startTime !== undefined) updateData.startTime = new Date(startTime);
      if (endTime !== undefined) updateData.endTime = new Date(endTime);
      if (location !== undefined) updateData.location = location;
      if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees;
      if (registrationRequired !== undefined) updateData.registrationRequired = registrationRequired;
      if (registrationDeadline !== undefined) {
        updateData.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
      }
      if (organizerId !== undefined) updateData.organizerId = organizerId;
      if (ministryId !== undefined) updateData.ministryId = ministryId;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Validate dates if being updated
      if (updateData.startTime && updateData.endTime) {
        if (updateData.startTime >= updateData.endTime) {
          throw new ApiError(400, 'Start time must be before end time');
        }
      }

      const event = await prisma.event.update({
        where: { id },
        data: updateData,
        include: {
          organizer: {
            select: {
              id: true,
              name: true
            }
          },
          ministry: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          _count: {
            select: {
              registrations: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        data: event,
        message: 'Event updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete event
  deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Event ID is required');
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              registrations: {
                where: { isActive: true }
              },
              attendances: true
            }
          }
        }
      });

      if (!event) {
        throw new ApiError(404, 'Event not found');
      }

      // Check if event has registrations or attendance records
      if (event._count.registrations > 0 || event._count.attendances > 0) {
        // Soft delete by marking as inactive
        await prisma.event.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          success: true,
          message: 'Event deactivated successfully (has existing registrations/attendance)'
        });
      } else {
        // Hard delete if no related records
        await prisma.event.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Event deleted successfully'
        });
      }
    } catch (error) {
      next(error);
    }
  };

  // Register for event
  registerForEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params; // event ID
      const { memberId, notes } = req.body;

      if (!id || !memberId) {
        throw new ApiError(400, 'Event ID and Member ID are required');
      }

      // Check if event exists and is active
      const event = await prisma.event.findUnique({
        where: { id, isActive: true },
        include: {
          _count: {
            select: {
              registrations: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!event) {
        throw new ApiError(404, 'Event not found or inactive');
      }

      // Check if registration is required and still open
      if (event.registrationRequired && event.registrationDeadline) {
        if (new Date() > event.registrationDeadline) {
          throw new ApiError(400, 'Registration deadline has passed');
        }
      }

      // Check if event is full
      if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
        throw new ApiError(400, 'Event is full');
      }

      // Check if member exists
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      // Check if already registered
      const existingRegistration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_memberId: {
            eventId: id,
            memberId
          }
        }
      });

      if (existingRegistration && existingRegistration.isActive) {
        throw new ApiError(409, 'Member is already registered for this event');
      }

      // Register or reactivate registration
      let registration;
      if (existingRegistration) {
        registration = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: { isActive: true, notes },
          include: {
            member: {
              select: { id: true, name: true }
            },
            event: {
              select: { id: true, title: true, date: true }
            }
          }
        });
      } else {
        registration = await prisma.eventRegistration.create({
          data: {
            eventId: id,
            memberId,
            notes,
            isActive: true
          },
          include: {
            member: {
              select: { id: true, name: true }
            },
            event: {
              select: { id: true, title: true, date: true }
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: registration,
        message: 'Registered for event successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Cancel event registration
  cancelRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, memberId } = req.params; // event ID and member ID

      if (!id || !memberId) {
        throw new ApiError(400, 'Event ID and Member ID are required');
      }

      // Find the registration
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_memberId: {
            eventId: id,
            memberId
          }
        }
      });

      if (!registration || !registration.isActive) {
        throw new ApiError(404, 'Registration not found or already cancelled');
      }

      // Cancel registration
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Registration cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Record attendance
  recordAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params; // event ID
      const { memberId, status, notes } = req.body;

      if (!id || !memberId || !status) {
        throw new ApiError(400, 'Event ID, Member ID, and status are required');
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id }
      });

      if (!event) {
        throw new ApiError(404, 'Event not found');
      }

      // Check if member exists
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      // Create or update attendance record
      const attendance = await prisma.eventAttendance.upsert({
        where: {
          eventId_memberId: {
            eventId: id,
            memberId
          }
        },
        update: {
          status,
          notes,
          date: new Date()
        },
        create: {
          eventId: id,
          memberId,
          status,
          notes,
          date: new Date()
        },
        include: {
          member: {
            select: { id: true, name: true }
          },
          event: {
            select: { id: true, title: true }
          }
        }
      });

      res.json({
        success: true,
        data: attendance,
        message: 'Attendance recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get event statistics
  getEventStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalEvents,
        activeEvents,
        upcomingEvents,
        pastEvents,
        typeStats,
        monthlyStats
      ] = await Promise.all([
        prisma.event.count(),
        prisma.event.count({ where: { isActive: true } }),
        prisma.event.count({ 
          where: { 
            isActive: true,
            date: { gte: new Date() }
          }
        }),
        prisma.event.count({ 
          where: { 
            isActive: true,
            date: { lt: new Date() }
          }
        }),
        prisma.event.groupBy({
          by: ['type'],
          _count: true,
          where: { isActive: true }
        }),
        this.getMonthlyEventStats()
      ]);

      const stats = {
        total: totalEvents,
        active: activeEvents,
        upcoming: upcomingEvents,
        past: pastEvents,
        byType: typeStats.map((stat: any) => ({
          type: stat.type,
          count: stat._count
        })),
        monthlyTrends: monthlyStats
      };

      res.json({
        success: true,
        data: stats,
        message: 'Event statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Helper method for monthly stats
  private getMonthlyEventStats = async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const events = await prisma.event.findMany({
      where: {
        date: { gte: sixMonthsAgo },
        isActive: true
      },
      select: {
        date: true,
        type: true
      }
    });

    // Group by month
    const monthlyStats: { [key: string]: number } = {};
    events.forEach((event: any) => {
      const monthKey = event.date.toISOString().substring(0, 7); // YYYY-MM
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
    });

    return Object.entries(monthlyStats).map(([month, count]) => ({
      month,
      count
    }));
  };
}

