import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class SimpleMemberController {
  // Get all members with pagination and filtering
  getMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        cellId,
        ministryId,
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
          { email: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (cellId) {
        where.cellId = cellId as string;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (ministryId) {
        where.ministries = {
          some: {
            ministryId: ministryId as string,
            isActive: true
          }
        };
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            cell: {
              select: {
                id: true,
                name: true
              }
            },
            ministries: {
              where: { isActive: true },
              include: {
                ministry: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        }),
        prisma.member.count({ where })
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
        message: 'Members retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get member by ID
  getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Member ID is required');
      }

      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          cell: {
            select: {
              id: true,
              name: true,
              leader: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          ministries: {
            where: { isActive: true },
            include: {
              ministry: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          contributions: {
            orderBy: { date: 'desc' },
            take: 5
          }
        }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      res.json({
        success: true,
        data: member,
        message: 'Member retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new member
  createMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const {
        name,
        email,
        phone,
        age,
        gender,
        address,
        cellId,
        notes
      } = req.body;

      // Check if email already exists
      if (email) {
        const existingMember = await prisma.member.findFirst({
          where: { email }
        });

        if (existingMember) {
          throw new ApiError(409, 'Member with this email already exists');
        }
      }

      // Verify cell exists if provided
      if (cellId) {
        const cell = await prisma.cell.findUnique({
          where: { id: cellId }
        });

        if (!cell) {
          throw new ApiError(404, 'Cell not found');
        }
      }

      const member = await prisma.member.create({
        data: {
          name,
          email,
          phone,
          age,
          gender,
          address,
          cellId,
          notes,
          isActive: true
        },
        include: {
          cell: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: member,
        message: 'Member created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update member
  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Member ID is required');
      }

      // Check if member exists
      const existingMember = await prisma.member.findUnique({
        where: { id }
      });

      if (!existingMember) {
        throw new ApiError(404, 'Member not found');
      }

      const {
        name,
        email,
        phone,
        age,
        gender,
        address,
        cellId,
        notes,
        isActive
      } = req.body;

      // Check email uniqueness if being updated
      if (email && email !== existingMember.email) {
        const emailExists = await prisma.member.findFirst({
          where: { 
            email,
            id: { not: id }
          }
        });

        if (emailExists) {
          throw new ApiError(409, 'Member with this email already exists');
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (age !== undefined) updateData.age = age;
      if (gender !== undefined) updateData.gender = gender;
      if (address !== undefined) updateData.address = address;
      if (cellId !== undefined) updateData.cellId = cellId;
      if (notes !== undefined) updateData.notes = notes;
      if (isActive !== undefined) updateData.isActive = isActive;

      const member = await prisma.member.update({
        where: { id },
        data: updateData,
        include: {
          cell: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: member,
        message: 'Member updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete member
  deleteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Member ID is required');
      }

      // Check if member exists
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              contributions: true,
              ministries: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      // Check if member has related records
      if (member._count.contributions > 0 || member._count.ministries > 0) {
        // Soft delete by marking as inactive
        await prisma.member.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          success: true,
          message: 'Member deactivated successfully (has existing records)'
        });
      } else {
        // Hard delete if no related records
        await prisma.member.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Member deleted successfully'
        });
      }
    } catch (error) {
      next(error);
    }
  };

  // Get member statistics
  getMemberStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalMembers,
        activeMembers,
        genderStats,
        cellStats,
        ministryStats
      ] = await Promise.all([
        prisma.member.count(),
        prisma.member.count({ where: { isActive: true } }),
        prisma.member.groupBy({
          by: ['gender'],
          where: { isActive: true },
          _count: true
        }),
        prisma.member.groupBy({
          by: ['cellId'],
          where: { isActive: true, cellId: { not: null } },
          _count: true
        }),
        prisma.ministryMember.groupBy({
          by: ['ministryId'],
          where: { isActive: true },
          _count: true
        })
      ]);

      const stats = {
        total: totalMembers,
        active: activeMembers,
        inactive: totalMembers - activeMembers,
        byGender: genderStats.map((stat: any) => ({
          gender: stat.gender || 'Not specified',
          count: stat._count
        })),
        byCells: cellStats.length,
        byMinistries: ministryStats.length
      };

      res.json({
        success: true,
        data: stats,
        message: 'Member statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

