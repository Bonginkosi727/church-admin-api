import type { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController.js';
import { MemberService } from '../services/MemberService.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

export class MemberController extends BaseController {
  constructor(private memberService: MemberService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        cellId,
        ministryId,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pagination = this.getPagination(Number(page), Number(limit));
      
      const { members, total } = await this.memberService.findAll({
        ...pagination,
        search: search as string,
        cellId: cellId as string,
        ministryId: ministryId as string,
        isActive: isActive === 'true',
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      const response = this.buildPaginatedResponse(members, total, Number(page), Number(limit));
      this.handleSuccess(res, response, 'Members retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const member = await this.memberService.findById(id);
      
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      this.handleSuccess(res, member, 'Member retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const member = await this.memberService.create(memberData);
      this.handleCreated(res, member, 'Member created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const member = await this.memberService.update(id, updateData);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      this.handleSuccess(res, member, 'Member updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const deleted = await this.memberService.delete(id);
      if (!deleted) {
        throw new NotFoundError('Member not found');
      }

      this.handleNoContent(res, 'Member deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  addToMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { ministryId, role = 'member' } = req.body;

      const result = await this.memberService.addToMinistry(id, ministryId, role);
      this.handleSuccess(res, result, 'Member added to ministry successfully');
    } catch (error) {
      next(error);
    }
  };

  removeFromMinistry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, ministryId } = req.params;

      await this.memberService.removeFromMinistry(id, ministryId);
      this.handleNoContent(res, 'Member removed from ministry successfully');
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.memberService.getStats();
      this.handleSuccess(res, stats, 'Member statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getByCellId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cellId } = req.params;
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const pagination = this.getPagination(Number(page), Number(limit));
      
      const { members, total } = await this.memberService.findByCellId(cellId, {
        ...pagination,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      const response = this.buildPaginatedResponse(members, total, Number(page), Number(limit));
      this.handleSuccess(res, response, 'Cell members retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getByMinistryId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ministryId } = req.params;
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const pagination = this.getPagination(Number(page), Number(limit));
      
      const { members, total } = await this.memberService.findByMinistryId(ministryId, {
        ...pagination,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      const response = this.buildPaginatedResponse(members, total, Number(page), Number(limit));
      this.handleSuccess(res, response, 'Ministry members retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  exportMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        format = 'csv',
        cellId,
        ministryId,
        isActive
      } = req.query;

      const exportData = await this.memberService.exportMembers({
        format: format as string,
        cellId: cellId as string,
        ministryId: ministryId as string,
        isActive: isActive === 'true'
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=members.csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=members.json');
      }

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  };
}
