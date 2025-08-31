import type { Response } from 'express';
import { logger } from '../utils/logger';

export abstract class BaseController {
  protected handleSuccess(res: Response, data: any, message: string = 'Success', statusCode: number = 200): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  protected handleCreated(res: Response, data: any, message: string = 'Resource created successfully'): Response {
    return this.handleSuccess(res, data, message, 201);
  }

  protected handleNoContent(res: Response, message: string = 'Operation completed successfully'): Response {
    return res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  protected handleError(res: Response, error: any, statusCode: number = 500): Response {
    logger.error('Controller Error:', error);
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    });
  }

  protected getPagination(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return {
      skip,
      take: limit,
      page,
      limit
    };
  }

  protected buildPaginatedResponse(data: any[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}

