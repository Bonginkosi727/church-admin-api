import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class MinistryController {
  // Get all ministries with optional filtering and pagination
  getMinistries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        isActive = true,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (type) {
        where.type = type as string;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      const [ministries, total] = await Promise.all([
        prisma.ministry.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            leader: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            members: {
              where: { isActive: true },
              select: {
                id: true,
                role: true,
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
                members: {
                  where: { isActive: true }
                },
                events: true
              }
            }
          }
        }),
        prisma.ministry.count({ where })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: ministries,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        message: 'Ministries retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get ministry by ID
  getMinistryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Ministry ID is required');
      }

      const ministry = await prisma.ministry.findUnique({
        where: { id },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          members: {
            where: { isActive: true },
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  age: true,
                  gender: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          },
          events: {
            where: { isActive: true },
            select: {
              id: true,
              title: true,
              type: true,
              date: true,
              location: true
            },
            orderBy: { date: 'desc' },
            take: 10
          },
          _count: {
            select: {
              members: {
                where: { isActive: true }
              },
              events: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!ministry) {
        throw new ApiError(404, 'Ministry not found');
      }

      res.json({
        success: true,
        data: ministry,
        message: 'Ministry retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new ministry
  createMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { name, description, type, leaderId } = req.body;

      // Check if ministry with same name exists
      const existingMinistry = await prisma.ministry.findUnique({
        where: { name }
      });

      if (existingMinistry) {
        throw new ApiError(409, 'Ministry with this name already exists');
      }

      // Verify leader exists if provided
      if (leaderId) {
        const leader = await prisma.member.findUnique({
          where: { id: leaderId }
        });

        if (!leader) {
          throw new ApiError(404, 'Leader not found');
        }
      }

      const ministry = await prisma.ministry.create({
        data: {
          name,
          description,
          type,
          leaderId,
          isActive: true
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              members: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: ministry,
        message: 'Ministry created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update ministry
  updateMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      const { name, description, type, leaderId, isActive } = req.body;

      if (!id) {
        throw new ApiError(400, 'Ministry ID is required');
      }

      // Check if ministry exists
      const existingMinistry = await prisma.ministry.findUnique({
        where: { id }
      });

      if (!existingMinistry) {
        throw new ApiError(404, 'Ministry not found');
      }

      // Check if name is being changed and conflicts with another ministry
      if (name && name !== existingMinistry.name) {
        const duplicateName = await prisma.ministry.findUnique({
          where: { name }
        });

        if (duplicateName) {
          throw new ApiError(409, 'Ministry with this name already exists');
        }
      }

      // Verify leader exists if provided
      if (leaderId) {
        const leader = await prisma.member.findUnique({
          where: { id: leaderId }
        });

        if (!leader) {
          throw new ApiError(404, 'Leader not found');
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (leaderId !== undefined) updateData.leaderId = leaderId;
      if (isActive !== undefined) updateData.isActive = isActive;

      const ministry = await prisma.ministry.update({
        where: { id },
        data: updateData,
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              members: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        data: ministry,
        message: 'Ministry updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete ministry
  deleteMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'Ministry ID is required');
      }

      // Check if ministry exists
      const ministry = await prisma.ministry.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              members: {
                where: { isActive: true }
              },
              events: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!ministry) {
        throw new ApiError(404, 'Ministry not found');
      }

      // Check if ministry has active members or events
      if (ministry._count.members > 0) {
        throw new ApiError(400, 'Cannot delete ministry with active members. Remove all members first.');
      }

      if (ministry._count.events > 0) {
        throw new ApiError(400, 'Cannot delete ministry with active events. Delete or reassign events first.');
      }

      await prisma.ministry.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Ministry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get ministry statistics
  getMinistryStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalMinistries,
        activeMinistries,
        inactiveMinistries,
        typeStats,
        memberStats
      ] = await Promise.all([
        prisma.ministry.count(),
        prisma.ministry.count({ where: { isActive: true } }),
        prisma.ministry.count({ where: { isActive: false } }),
        prisma.ministry.groupBy({
          by: ['type'],
          _count: true,
          where: { isActive: true }
        }),
        prisma.memberMinistry.groupBy({
          by: ['ministryId'],
          _count: true,
          where: { isActive: true }
        })
      ]);

      // Get ministry names for member stats
      const ministryIds = memberStats.map((stat: any) => stat.ministryId);
      const ministries = await prisma.ministry.findMany({
        where: { id: { in: ministryIds } },
        select: { id: true, name: true }
      });

      const stats = {
        total: totalMinistries,
        active: activeMinistries,
        inactive: inactiveMinistries,
        byType: typeStats.map((stat: any) => ({
          type: stat.type,
          count: stat._count
        })),
        membershipStats: memberStats.map((stat: any) => ({
          ministryId: stat.ministryId,
          ministryName: ministries.find((m: any) => m.id === stat.ministryId)?.name || 'Unknown',
          memberCount: stat._count
        })).sort((a: any, b: any) => b.memberCount - a.memberCount)
      };

      res.json({
        success: true,
        data: stats,
        message: 'Ministry statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Add member to ministry
  addMemberToMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params; // ministry ID
      const { memberId, role = 'member' } = req.body;

      if (!id || !memberId) {
        throw new ApiError(400, 'Ministry ID and Member ID are required');
      }

      // Check if ministry exists
      const ministry = await prisma.ministry.findUnique({
        where: { id }
      });

      if (!ministry) {
        throw new ApiError(404, 'Ministry not found');
      }

      // Check if member exists
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      // Check if member is already in ministry
      const existingMembership = await prisma.memberMinistry.findUnique({
        where: {
          memberId_ministryId: {
            memberId,
            ministryId: id
          }
        }
      });

      if (existingMembership && existingMembership.isActive) {
        throw new ApiError(409, 'Member is already active in this ministry');
      }

      // Add or reactivate membership
      let membership;
      if (existingMembership) {
        membership = await prisma.memberMinistry.update({
          where: { id: existingMembership.id },
          data: { isActive: true, role },
          include: {
            member: {
              select: { id: true, name: true }
            },
            ministry: {
              select: { id: true, name: true }
            }
          }
        });
      } else {
        membership = await prisma.memberMinistry.create({
          data: {
            memberId,
            ministryId: id,
            role,
            isActive: true
          },
          include: {
            member: {
              select: { id: true, name: true }
            },
            ministry: {
              select: { id: true, name: true }
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: membership,
        message: 'Member added to ministry successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Remove member from ministry
  removeMemberFromMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, memberId } = req.params; // ministry ID and member ID

      if (!id || !memberId) {
        throw new ApiError(400, 'Ministry ID and Member ID are required');
      }

      // Find the membership
      const membership = await prisma.memberMinistry.findUnique({
        where: {
          memberId_ministryId: {
            memberId,
            ministryId: id
          }
        }
      });

      if (!membership || !membership.isActive) {
        throw new ApiError(404, 'Member is not active in this ministry');
      }

      // Deactivate membership instead of deleting
      await prisma.memberMinistry.update({
        where: { id: membership.id },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Member removed from ministry successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get ministry members
  getMinistryMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        search,
        role
      } = req.query;

      if (!id) {
        throw new ApiError(400, 'Ministry ID is required');
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {
        ministryId: id,
        isActive: true
      };

      if (role) {
        where.role = role as string;
      }

      if (search) {
        where.member = {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        };
      }

      const [members, total] = await Promise.all([
        prisma.memberMinistry.findMany({
          where,
          skip,
          take,
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                age: true,
                gender: true,
                cell: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.memberMinistry.count({ where })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: members,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        message: 'Ministry members retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Add member to ministry
  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params; // ministry ID
      const { memberId, role = 'MEMBER' } = req.body;

      // Check if ministry exists
      const ministry = await prisma.ministry.findUnique({
        where: { id }
      });

      if (!ministry) {
        throw new ApiError(404, 'Ministry not found');
      }

      // Check if member exists
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      // Check if member is already in ministry
      const existingMembership = await prisma.ministryMember.findUnique({
        where: {
          ministryId_memberId: {
            ministryId: id,
            memberId
          }
        }
      });

      if (existingMembership && existingMembership.isActive) {
        throw new ApiError(409, 'Member is already in this ministry');
      }

      // Add or reactivate membership
      let membership;
      if (existingMembership) {
        membership = await prisma.ministryMember.update({
          where: { id: existingMembership.id },
          data: { 
            isActive: true, 
            role,
            joinedAt: new Date()
          },
          include: {
            member: {
              select: { id: true, name: true, email: true }
            },
            ministry: {
              select: { id: true, name: true, type: true }
            }
          }
        });
      } else {
        membership = await prisma.ministryMember.create({
          data: {
            ministryId: id,
            memberId,
            role,
            joinedAt: new Date(),
            isActive: true
          },
          include: {
            member: {
              select: { id: true, name: true, email: true }
            },
            ministry: {
              select: { id: true, name: true, type: true }
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: membership,
        message: 'Member added to ministry successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Remove member from ministry
  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, memberId } = req.params; // ministry ID and member ID

      // Find the membership
      const membership = await prisma.ministryMember.findUnique({
        where: {
          ministryId_memberId: {
            ministryId: id,
            memberId
          }
        }
      });

      if (!membership || !membership.isActive) {
        throw new ApiError(404, 'Member not found in this ministry');
      }

      // Soft delete membership
      await prisma.ministryMember.update({
        where: { id: membership.id },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Member removed from ministry successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update member role in ministry
  updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id, memberId } = req.params; // ministry ID and member ID
      const { role } = req.body;

      // Find the membership
      const membership = await prisma.ministryMember.findUnique({
        where: {
          ministryId_memberId: {
            ministryId: id,
            memberId
          }
        }
      });

      if (!membership || !membership.isActive) {
        throw new ApiError(404, 'Member not found in this ministry');
      }

      // Update role
      const updatedMembership = await prisma.ministryMember.update({
        where: { id: membership.id },
        data: { role },
        include: {
          member: {
            select: { id: true, name: true, email: true }
          },
          ministry: {
            select: { id: true, name: true, type: true }
          }
        }
      });

      res.json({
        success: true,
        data: updatedMembership,
        message: 'Member role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

