import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export class ContributionController {
  // Get all contributions with filtering and pagination
  getContributions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        memberId,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (search) {
        where.OR = [
          { notes: { contains: search as string, mode: 'insensitive' } },
          { 
            member: {
              name: { contains: search as string, mode: 'insensitive' }
            }
          }
        ];
      }

      if (type) {
        where.type = type as string;
      }

      if (memberId) {
        where.memberId = memberId as string;
      }

      // Date filters
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }

      // Amount filters
      if (amountMin || amountMax) {
        where.amount = {};
        if (amountMin) where.amount.gte = parseFloat(amountMin as string);
        if (amountMax) where.amount.lte = parseFloat(amountMax as string);
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      const [contributions, total, totalAmount] = await Promise.all([
        prisma.contribution.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.contribution.count({ where }),
        prisma.contribution.aggregate({
          where,
          _sum: { amount: true }
        })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: contributions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        summary: {
          totalAmount: totalAmount._sum.amount || 0,
          averageAmount: total > 0 ? (totalAmount._sum.amount || 0) / total : 0
        },
        message: 'Contributions retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get contribution by ID
  getContributionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Contribution ID is required');
      }

      const contribution = await prisma.contribution.findUnique({
        where: { id },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!contribution) {
        throw new ApiError(404, 'Contribution not found');
      }

      res.json({
        success: true,
        data: contribution,
        message: 'Contribution retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new contribution
  createContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const {
        amount,
        type,
        date,
        paymentMethod,
        notes,
        memberId,
        isAnonymous = false
      } = req.body;

      // Validate amount
      if (amount <= 0) {
        throw new ApiError(400, 'Amount must be greater than 0');
      }

      // Verify member exists if not anonymous
      if (!isAnonymous && memberId) {
        const member = await prisma.member.findUnique({
          where: { id: memberId }
        });

        if (!member) {
          throw new ApiError(404, 'Member not found');
        }
      }

      const contribution = await prisma.contribution.create({
        data: {
          amount: parseFloat(amount),
          type,
          date: date ? new Date(date) : new Date(),
          paymentMethod,
          notes,
          memberId: isAnonymous ? null : memberId,
          isAnonymous
        },
        include: {
          member: {
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
        data: contribution,
        message: 'Contribution created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update contribution
  updateContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Contribution ID is required');
      }

      // Check if contribution exists
      const existingContribution = await prisma.contribution.findUnique({
        where: { id }
      });

      if (!existingContribution) {
        throw new ApiError(404, 'Contribution not found');
      }

      const {
        amount,
        type,
        date,
        paymentMethod,
        notes,
        memberId,
        isAnonymous
      } = req.body;

      const updateData: any = {};

      // Build update data
      if (amount !== undefined) {
        if (amount <= 0) {
          throw new ApiError(400, 'Amount must be greater than 0');
        }
        updateData.amount = parseFloat(amount);
      }
      if (type !== undefined) updateData.type = type;
      if (date !== undefined) updateData.date = new Date(date);
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (notes !== undefined) updateData.notes = notes;
      if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
      
      // Handle member ID based on anonymous status
      if (isAnonymous !== undefined) {
        if (isAnonymous) {
          updateData.memberId = null;
        } else if (memberId !== undefined) {
          // Verify member exists if setting to specific member
          const member = await prisma.member.findUnique({
            where: { id: memberId }
          });
          if (!member) {
            throw new ApiError(404, 'Member not found');
          }
          updateData.memberId = memberId;
        }
      } else if (memberId !== undefined && !existingContribution.isAnonymous) {
        // Verify member exists if updating member ID for non-anonymous contribution
        const member = await prisma.member.findUnique({
          where: { id: memberId }
        });
        if (!member) {
          throw new ApiError(404, 'Member not found');
        }
        updateData.memberId = memberId;
      }

      const contribution = await prisma.contribution.update({
        where: { id },
        data: updateData,
        include: {
          member: {
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
        data: contribution,
        message: 'Contribution updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete contribution
  deleteContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'Contribution ID is required');
      }

      // Check if contribution exists
      const contribution = await prisma.contribution.findUnique({
        where: { id }
      });

      if (!contribution) {
        throw new ApiError(404, 'Contribution not found');
      }

      await prisma.contribution.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Contribution deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get contribution statistics
  getContributionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { 
        dateFrom, 
        dateTo, 
        groupBy = 'month' // month, quarter, year
      } = req.query;

      // Build date filter
      const where: any = {};
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }

      const [
        totalStats,
        typeStats,
        methodStats,
        periodicStats
      ] = await Promise.all([
        // Overall statistics
        prisma.contribution.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true },
          _max: { amount: true },
          _min: { amount: true }
        }),

        // By type
        prisma.contribution.groupBy({
          by: ['type'],
          where,
          _sum: { amount: true },
          _count: true
        }),

        // By payment method
        prisma.contribution.groupBy({
          by: ['paymentMethod'],
          where,
          _sum: { amount: true },
          _count: true
        }),

        // Periodic trends
        this.getPeriodicStats(where, groupBy as string)
      ]);

      const stats = {
        summary: {
          totalAmount: totalStats._sum.amount || 0,
          totalCount: totalStats._count,
          averageAmount: totalStats._avg.amount || 0,
          maxAmount: totalStats._max.amount || 0,
          minAmount: totalStats._min.amount || 0
        },
        byType: typeStats.map((stat: any) => ({
          type: stat.type,
          totalAmount: stat._sum.amount || 0,
          count: stat._count
        })),
        byPaymentMethod: methodStats.map((stat: any) => ({
          method: stat.paymentMethod,
          totalAmount: stat._sum.amount || 0,
          count: stat._count
        })),
        trends: periodicStats
      };

      res.json({
        success: true,
        data: stats,
        message: 'Contribution statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get member contribution history
  getMemberContributions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { memberId } = req.params;
      const {
        page = 1,
        limit = 10,
        dateFrom,
        dateTo,
        type
      } = req.query;

      if (!memberId) {
        throw new ApiError(400, 'Member ID is required');
      }

      // Verify member exists
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, name: true }
      });

      if (!member) {
        throw new ApiError(404, 'Member not found');
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = { memberId };

      if (type) {
        where.type = type as string;
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }

      const [contributions, total, memberStats] = await Promise.all([
        prisma.contribution.findMany({
          where,
          skip,
          take,
          orderBy: { date: 'desc' }
        }),
        prisma.contribution.count({ where }),
        prisma.contribution.aggregate({
          where: { memberId },
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true }
        })
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        data: {
          member,
          contributions,
          summary: {
            totalAmount: memberStats._sum.amount || 0,
            totalContributions: memberStats._count,
            averageAmount: memberStats._avg.amount || 0
          }
        },
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        },
        message: 'Member contributions retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Export contributions
  exportContributions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        format = 'csv',
        dateFrom,
        dateTo,
        type,
        memberId
      } = req.query;

      if (!['csv', 'excel'].includes(format as string)) {
        throw new ApiError(400, 'Invalid export format. Use csv or excel');
      }

      const where: any = {};

      if (type) where.type = type as string;
      if (memberId) where.memberId = memberId as string;

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }

      const contributions = await prisma.contribution.findMany({
        where,
        include: {
          member: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      // Format data for export
      const exportData = contributions.map((contrib: any) => ({
        Date: contrib.date.toISOString().split('T')[0],
        Amount: contrib.amount,
        Type: contrib.type,
        'Payment Method': contrib.paymentMethod,
        'Member Name': contrib.isAnonymous ? 'Anonymous' : (contrib.member?.name || 'Unknown'),
        'Member Email': contrib.isAnonymous ? '' : (contrib.member?.email || ''),
        Notes: contrib.notes || '',
        'Is Anonymous': contrib.isAnonymous ? 'Yes' : 'No'
      }));

      if (format === 'csv') {
        // Convert to CSV
        const csvHeaders = Object.keys(exportData[0] || {}).join(',');
        const csvRows = exportData.map((row: any) => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          ).join(',')
        );
        const csvContent = [csvHeaders, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="contributions.csv"');
        res.send(csvContent);
      } else {
        // For Excel, we'll return JSON that frontend can convert
        res.json({
          success: true,
          data: exportData,
          filename: 'contributions.xlsx',
          message: 'Export data prepared successfully'
        });
      }
    } catch (error) {
      next(error);
    }
  };

  // Helper method for periodic statistics
  private getPeriodicStats = async (where: any, groupBy: string) => {
    const contributions = await prisma.contribution.findMany({
      where,
      select: {
        date: true,
        amount: true
      },
      orderBy: { date: 'asc' }
    });

    // Group by specified period
    const groupedStats: { [key: string]: { amount: number; count: number } } = {};

    contributions.forEach((contrib: any) => {
      let periodKey: string;
      const date = contrib.date;

      switch (groupBy) {
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          periodKey = String(date.getFullYear());
          break;
        default:
          periodKey = date.toISOString().split('T')[0]; // daily
      }

      if (!groupedStats[periodKey]) {
        groupedStats[periodKey] = { amount: 0, count: 0 };
      }

      groupedStats[periodKey]!.amount += contrib.amount;
      groupedStats[periodKey]!.count += 1;
    });

    return Object.entries(groupedStats).map(([period, stats]) => ({
      period,
      totalAmount: stats.amount,
      count: stats.count,
      averageAmount: stats.amount / stats.count
    }));
  };
}

