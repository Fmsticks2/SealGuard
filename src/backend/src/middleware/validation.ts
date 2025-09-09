import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  allowedValues?: any[];
}

interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
  headers?: ValidationRule[];
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate a single field
const validateField = (value: any, rule: ValidationRule, fieldPath: string): string[] => {
  const errors: string[] = [];
  
  // Check if field is required
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldPath} is required`);
    return errors;
  }
  
  // Skip validation if field is not required and empty
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return errors;
  }
  
  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldPath} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          errors.push(`${fieldPath} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`${fieldPath} must be a boolean`);
        }
        break;
      case 'email':
        if (typeof value === 'string' && !EMAIL_REGEX.test(value)) {
          errors.push(`${fieldPath} must be a valid email address`);
        }
        break;
      case 'url':
        if (typeof value === 'string' && !URL_REGEX.test(value)) {
          errors.push(`${fieldPath} must be a valid URL`);
        }
        break;
      case 'uuid':
        if (typeof value === 'string' && !UUID_REGEX.test(value)) {
          errors.push(`${fieldPath} must be a valid UUID`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${fieldPath} must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push(`${fieldPath} must be an object`);
        }
        break;
    }
  }
  
  // String length validation
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${fieldPath} must be at least ${rule.minLength} characters long`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${fieldPath} must be no more than ${rule.maxLength} characters long`);
    }
  }
  
  // Number range validation
  if (typeof value === 'number' || (rule.type === 'number' && Number.isFinite(Number(value)))) {
    const numValue = typeof value === 'number' ? value : Number(value);
    if (rule.min !== undefined && numValue < rule.min) {
      errors.push(`${fieldPath} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && numValue > rule.max) {
      errors.push(`${fieldPath} must be no more than ${rule.max}`);
    }
  }
  
  // Array length validation
  if (Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${fieldPath} must contain at least ${rule.minLength} items`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${fieldPath} must contain no more than ${rule.maxLength} items`);
    }
  }
  
  // Pattern validation
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    errors.push(`${fieldPath} format is invalid`);
  }
  
  // Allowed values validation
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    errors.push(`${fieldPath} must be one of: ${rule.allowedValues.join(', ')}`);
  }
  
  // Custom validation
  if (rule.custom) {
    const customResult = rule.custom(value);
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : `${fieldPath} is invalid`);
    }
  }
  
  return errors;
};

// Validate request data
const validateData = (data: any, rules: ValidationRule[], prefix: string = ''): string[] => {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const fieldPath = prefix ? `${prefix}.${rule.field}` : rule.field;
    const value = data[rule.field];
    
    const fieldErrors = validateField(value, rule, fieldPath);
    errors.push(...fieldErrors);
  }
  
  return errors;
};

// Main validation middleware
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    
    // Validate body
    if (schema.body) {
      const bodyErrors = validateData(req.body || {}, schema.body, 'body');
      errors.push(...bodyErrors);
    }
    
    // Validate query parameters
    if (schema.query) {
      const queryErrors = validateData(req.query || {}, schema.query, 'query');
      errors.push(...queryErrors);
    }
    
    // Validate URL parameters
    if (schema.params) {
      const paramErrors = validateData(req.params || {}, schema.params, 'params');
      errors.push(...paramErrors);
    }
    
    // Validate headers
    if (schema.headers) {
      const headerErrors = validateData(req.headers || {}, schema.headers, 'headers');
      errors.push(...headerErrors);
    }
    
    // If there are validation errors, return them
    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }
    
    next();
  };
};

// Common validation schemas
export const commonValidations = {
  // User registration
  userRegistration: {
    body: [
      { field: 'email', required: true, type: 'email' as const, maxLength: 255 },
      { field: 'password', required: true, type: 'string' as const, minLength: 8, maxLength: 128 },
      { field: 'firstName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
      { field: 'lastName', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    ],
  },
  
  // User login
  userLogin: {
    body: [
      { field: 'email', required: true, type: 'email' as const },
      { field: 'password', required: true, type: 'string' as const },
    ],
  },
  
  // File upload
  fileUpload: {
    body: [
      { field: 'filename', required: true, type: 'string' as const, minLength: 1, maxLength: 255 },
      { field: 'fileSize', required: true, type: 'number' as const, min: 1, max: 100 * 1024 * 1024 }, // 100MB max
      { field: 'fileType', required: true, type: 'string' as const },
      { field: 'description', required: false, type: 'string' as const, maxLength: 1000 },
    ],
  },
  
  // Document ID parameter
  documentId: {
    params: [
      { field: 'documentId', required: true, type: 'uuid' as const },
    ],
  },
  
  // Pagination
  pagination: {
    query: [
      { field: 'page', required: false, type: 'number' as const, min: 1 },
      { field: 'limit', required: false, type: 'number' as const, min: 1, max: 100 },
      { field: 'sortBy', required: false, type: 'string' as const, allowedValues: ['createdAt', 'updatedAt', 'filename', 'fileSize'] },
      { field: 'sortOrder', required: false, type: 'string' as const, allowedValues: ['asc', 'desc'] },
    ],
  },
  
  // Payment creation
  paymentCreation: {
    body: [
      { field: 'amount', required: true, type: 'number' as const, min: 0.01 },
      { field: 'currency', required: true, type: 'string' as const, allowedValues: ['FIL', 'USD'] },
      { field: 'description', required: false, type: 'string' as const, maxLength: 500 },
      { field: 'metadata', required: false, type: 'object' as const },
    ],
  },
  
  // PDP verification
  pdpVerification: {
    body: [
      { field: 'documentId', required: true, type: 'uuid' as const },
      { field: 'challengeCount', required: false, type: 'number' as const, min: 1, max: 100 },
    ],
  },
};

// File type validation
export const validateFileType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const fileType = req.body?.fileType || req.headers['content-type'];
    
    if (!fileType) {
      return next(new ValidationError('File type is required'));
    }
    
    if (!allowedTypes.includes(fileType)) {
      return next(new ValidationError(`File type '${fileType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
    
    next();
  };
};

// File size validation
export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const fileSize = req.body?.fileSize || parseInt(req.headers['content-length'] || '0', 10);
    
    if (!fileSize) {
      return next(new ValidationError('File size is required'));
    }
    
    if (fileSize > maxSize) {
      return next(new ValidationError(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes`));
    }
    
    next();
  };
};

export default validate;