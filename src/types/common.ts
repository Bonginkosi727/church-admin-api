// Common types used across the application

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResult;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: any[];
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface SearchParams {
  search?: string;
  filters?: FilterParams;
  sort?: SortParams;
}

export interface BulkOperationResult {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: any[];
}

export interface ImportResult extends BulkOperationResult {
  duplicates: number;
  created: number;
  updated: number;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  fields?: string[];
  filters?: FilterParams;
}

// Database query options
export interface QueryOptions {
  include?: string[];
  select?: string[];
  where?: any;
  orderBy?: any;
  skip?: number;
  take?: number;
}

// File upload interface
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface DatabaseError {
  code: string;
  message: string;
  detail?: any;
}

// User role and permission types
export type UserRole = 'admin' | 'leader' | 'member' | 'finance_manager' | 'event_coordinator' | 'ministry_leader' | 'communications_manager' | 'asset_manager';

export interface Permission {
  resource: string;
  action: string;
  conditions?: any;
}

// Date range interface
export interface DateRange {
  start: Date;
  end: Date;
}

// Statistics interface
export interface BaseStats {
  total: number;
  active: number;
  inactive: number;
  growth?: number;
  trends?: Array<{
    period: string;
    value: number;
  }>;
}

