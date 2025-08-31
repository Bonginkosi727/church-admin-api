import { PrismaClient } from '../../generated/prisma';
import { MemberRepository } from '../repositories/MemberRepository';
import type { Member } from '../types/Member';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

export interface MemberSearchParams {
  skip: number;
  take: number;
  search?: string;
  cellId?: string;
  ministryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  byCells: { cellId: string; cellName: string; count: number }[];
  byMinistries: { ministryId: string; ministryName: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byAgeGroup: { ageGroup: string; count: number }[];
}

export class MemberService {
  constructor(
    private memberRepo: MemberRepository,
    private prisma: PrismaClient
  ) {}

  async findAll(params: MemberSearchParams): Promise<{ members: Member[]; total: number }> {
    const where: any = {};

    // Build search conditions
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    if (params.cellId) {
      where.cellId = params.cellId;
    }

    if (params.ministryId) {
      where.ministries = {
        some: {
          ministryId: params.ministryId,
          isActive: true
        }
      };
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    // Build order by
    const orderBy: any = {};
    if (params.sortBy) {
      orderBy[params.sortBy] = params.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          cell: {
            select: { id: true, name: true, number: true }
          },
          ministries: {
            where: { isActive: true },
            include: {
              ministry: {
                select: { id: true, name: true, type: true }
              }
            }
          },
          user: {
            select: { id: true, email: true, isActive: true }
          }
        }
      }),
      this.prisma.member.count({ where })
    ]);

    return { members, total };
  }

  async findById(id: string): Promise<Member | null> {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        cell: {
          select: { id: true, name: true, number: true, leader: { select: { name: true } } }
        },
        ministries: {
          where: { isActive: true },
          include: {
            ministry: {
              select: { id: true, name: true, type: true, leader: { select: { name: true } } }
            }
          }
        },
        user: {
          select: { id: true, email: true, isActive: true, lastLogin: true }
        },
        contributions: {
          orderBy: { date: 'desc' },
          take: 10,
          select: { id: true, amount: true, type: true, date: true }
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            event: {
              select: { id: true, title: true, type: true }
            }
          }
        }
      }
    });

    return member;
  }

  async create(data: Partial<Member>): Promise<Member> {
    // Check for duplicate email if provided
    if (data.email) {
      const existingMember = await this.prisma.member.findUnique({
        where: { email: data.email }
      });
      if (existingMember) {
        throw new ConflictError('Member with this email already exists');
      }
    }

    const member = await this.prisma.member.create({
      data: {
        name: data.name!,
        email: data.email,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        address: data.address,
        cellId: data.cellId,
        userId: data.userId,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        occupation: data.occupation,
        notes: data.notes
      },
      include: {
        cell: true,
        user: {
          select: { id: true, email: true, isActive: true }
        }
      }
    });

    return member;
  }

  async update(id: string, data: Partial<Member>): Promise<Member | null> {
    // Check if member exists
    const existingMember = await this.prisma.member.findUnique({
      where: { id }
    });

    if (!existingMember) {
      return null;
    }

    // Check for duplicate email if being updated
    if (data.email && data.email !== existingMember.email) {
      const duplicateEmail = await this.prisma.member.findUnique({
        where: { email: data.email }
      });
      if (duplicateEmail) {
        throw new ConflictError('Member with this email already exists');
      }
    }

    const member = await this.prisma.member.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.cellId !== undefined && { cellId: data.cellId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate ? new Date(data.birthDate) : null }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.notes !== undefined && { notes: data.notes })
      },
      include: {
        cell: true,
        ministries: {
          include: {
            ministry: true
          }
        },
        user: {
          select: { id: true, email: true, isActive: true }
        }
      }
    });

    return member;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.member.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async addToMinistry(memberId: string, ministryId: string, role: string = 'member'): Promise<any> {
    // Check if member exists
    const member = await this.prisma.member.findUnique({
      where: { id: memberId }
    });
    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Check if ministry exists
    const ministry = await this.prisma.ministry.findUnique({
      where: { id: ministryId }
    });
    if (!ministry) {
      throw new NotFoundError('Ministry not found');
    }

    // Check if already a member
    const existingMembership = await this.prisma.memberMinistry.findUnique({
      where: {
        memberId_ministryId: {
          memberId,
          ministryId
        }
      }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictError('Member is already part of this ministry');
      } else {
        // Reactivate membership
        return await this.prisma.memberMinistry.update({
          where: { id: existingMembership.id },
          data: { isActive: true, role }
        });
      }
    }

    // Create new membership
    return await this.prisma.memberMinistry.create({
      data: {
        memberId,
        ministryId,
        role,
        isActive: true
      },
      include: {
        member: { select: { name: true } },
        ministry: { select: { name: true } }
      }
    });
  }

  async removeFromMinistry(memberId: string, ministryId: string): Promise<void> {
    const membership = await this.prisma.memberMinistry.findUnique({
      where: {
        memberId_ministryId: {
          memberId,
          ministryId
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('Member is not part of this ministry');
    }

    await this.prisma.memberMinistry.update({
      where: { id: membership.id },
      data: { isActive: false }
    });
  }

  async findByCellId(cellId: string, params: Omit<MemberSearchParams, 'cellId'>): Promise<{ members: Member[]; total: number }> {
    return this.findAll({ ...params, cellId });
  }

  async findByMinistryId(ministryId: string, params: Omit<MemberSearchParams, 'ministryId'>): Promise<{ members: Member[]; total: number }> {
    return this.findAll({ ...params, ministryId });
  }

  async getStats(): Promise<MemberStats> {
    const [
      total,
      active,
      inactive,
      cellStats,
      ministryStats,
      genderStats,
      ageStats
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { isActive: true } }),
      this.prisma.member.count({ where: { isActive: false } }),
      this.prisma.member.groupBy({
        by: ['cellId'],
        _count: true,
        where: { isActive: true, cellId: { not: null } }
      }),
      this.prisma.memberMinistry.groupBy({
        by: ['ministryId'],
        _count: true,
        where: { isActive: true }
      }),
      this.prisma.member.groupBy({
        by: ['gender'],
        _count: true,
        where: { isActive: true, gender: { not: null } }
      }),
      this.getAgeGroupStats()
    ]);

    // Get cell names
    const cellIds = cellStats.map((stat: any) => stat.cellId!);
    const cells = await this.prisma.cell.findMany({
      where: { id: { in: cellIds } },
      select: { id: true, name: true }
    });

    // Get ministry names
    const ministryIds = ministryStats.map((stat: any) => stat.ministryId);
    const ministries = await this.prisma.ministry.findMany({
      where: { id: { in: ministryIds } },
      select: { id: true, name: true }
    });

    return {
      total,
      active,
      inactive,
      byCells: cellStats.map((stat: any) => ({
        cellId: stat.cellId!,
        cellName: cells.find((c: any) => c.id === stat.cellId)?.name || 'Unknown',
        count: stat._count
      })),
      byMinistries: ministryStats.map((stat: any) => ({
        ministryId: stat.ministryId,
        ministryName: ministries.find((m: any) => m.id === stat.ministryId)?.name || 'Unknown',
        count: stat._count
      })),
      byGender: genderStats.map((stat: any) => ({
        gender: stat.gender || 'Not specified',
        count: stat._count
      })),
      byAgeGroup: ageStats
    };
  }

  async exportMembers(options: { format: string; cellId?: string; ministryId?: string; isActive?: boolean }): Promise<string> {
    const where: any = {};
    
    if (options.cellId) where.cellId = options.cellId;
    if (options.ministryId) {
      where.ministries = {
        some: { ministryId: options.ministryId, isActive: true }
      };
    }
    if (options.isActive !== undefined) where.isActive = options.isActive;

    const members = await this.prisma.member.findMany({
      where,
      include: {
        cell: { select: { name: true } },
        ministries: {
          where: { isActive: true },
          include: { ministry: { select: { name: true } } }
        }
      }
    });

    if (options.format === 'csv') {
      return this.generateCSV(members);
    } else {
      return JSON.stringify(members, null, 2);
    }
  }

  private async getAgeGroupStats(): Promise<{ ageGroup: string; count: number }[]> {
    const members = await this.prisma.member.findMany({
      where: { isActive: true, age: { not: null } },
      select: { age: true }
    });

    const ageGroups = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };

    members.forEach((member: any) => {
      const age = member.age!;
      if (age <= 17) ageGroups['0-17']++;
      else if (age <= 25) ageGroups['18-25']++;
      else if (age <= 35) ageGroups['26-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    return Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count
    }));
  }

  private generateCSV(members: any[]): string {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Age',
      'Gender',
      'Cell',
      'Ministries',
      'Join Date',
      'Status'
    ];

    const rows = members.map(member => [
      member.name,
      member.email || '',
      member.phone || '',
      member.age || '',
      member.gender || '',
      member.cell?.name || '',
      member.ministries.map((m: any) => m.ministry.name).join('; '),
      member.joinDate.toISOString().split('T')[0],
      member.isActive ? 'Active' : 'Inactive'
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Legacy methods for backward compatibility
  async getAllMembers(): Promise<Member[]> {
    const result = await this.findAll({ skip: 0, take: 1000 });
    return result.members;
  }

  async getMemberById(id: string): Promise<Member | null> {
    return this.findById(id);
  }

  async createMember(data: Partial<Member>): Promise<Member> {
    return this.create(data);
  }

  async updateMember(id: string, data: Partial<Member>): Promise<Member> {
    const result = await this.update(id, data);
    if (!result) {
      throw new NotFoundError('Member not found');
    }
    return result;
  }

  async deleteMember(id: string): Promise<void> {
    const deleted = await this.delete(id);
    if (!deleted) {
      throw new NotFoundError('Member not found');
    }
  }
}

