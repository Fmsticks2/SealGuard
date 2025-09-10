import { Request, Response, NextFunction } from 'express';
// import fs from 'fs';
// import path from 'path';

interface LogEntry {
  requestId: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  error?: string;
}

// Generate unique request ID
const generateRequestId = (): string => {
  return require('crypto').randomBytes(16).toString('hex');
};

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to headers
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Create base log entry
  const logEntry: LogEntry = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
  };
  
  // Add user ID if available (will be set by auth middleware)
  if ((req as any).user?.id) {
    logEntry.userId = (req as any).user.id;
  }
  
  // Log request start
  console.log('📥 Request started:', {
    requestId: logEntry.requestId,
    method: logEntry.method,
    url: logEntry.url,
    ip: logEntry.ip,
    userAgent: logEntry.userAgent,
    userId: logEntry.userId,
    timestamp: logEntry.timestamp,
  });
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    const duration = Date.now() - startTime;
    
    // Complete log entry
    logEntry.duration = duration;
    logEntry.statusCode = res.statusCode;
    logEntry.contentLength = res.get('Content-Length') ? parseInt(res.get('Content-Length')!, 10) : 0;
    
    // Determine log level based on status code
    const isError = res.statusCode >= 400;
    const isWarning = res.statusCode >= 300 && res.statusCode < 400;
    
    let logLevel = '📤';
    if (isError) {
      logLevel = '❌';
    } else if (isWarning) {
      logLevel = '⚠️';
    }
    
    // Log response
    console.log(`${logLevel} Request completed:`, {
      requestId: logEntry.requestId,
      method: logEntry.method,
      url: logEntry.url,
      statusCode: logEntry.statusCode,
      duration: `${duration}ms`,
      contentLength: logEntry.contentLength,
      ip: logEntry.ip,
      userId: logEntry.userId,
    });
    
    // Store detailed logs for errors
    if (isError) {
      console.error('🔍 Error details:', {
        requestId: logEntry.requestId,
        method: logEntry.method,
        url: logEntry.url,
        statusCode: logEntry.statusCode,
        headers: req.headers,
        body: req.method !== 'GET' ? req.body : undefined,
        query: req.query,
        params: req.params,
      });
    }
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};

// Security logger for sensitive operations
export const securityLogger = (operation: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const logEntry = {
      operation,
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
      headers: {
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined,
      },
    };
    
    console.log('🔒 Security operation:', logEntry);
    
    next();
  };
};

// Performance logger for slow requests
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any): any {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        console.warn('🐌 Slow request detected:', {
          requestId: req.headers['x-request-id'],
          method: req.method,
          url: req.originalUrl || req.url,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
          timestamp: new Date().toISOString(),
        });
      }
      
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    next();
  };
};

// File operation logger
export const fileOperationLogger = (operation: 'upload' | 'download' | 'delete') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const logEntry = {
      operation: `file_${operation}`,
      requestId: req.headers['x-request-id'],
      userId: (req as any).user?.id,
      fileName: req.body?.filename || req.params?.filename,
      fileSize: req.body?.fileSize || req.headers['content-length'],
      fileType: req.body?.fileType || req.headers['content-type'],
      timestamp: new Date().toISOString(),
    };
    
    console.log('📁 File operation:', logEntry);
    
    next();
  };
};

// Audit logger for compliance
export const auditLogger = (action: string, resource: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auditEntry = {
      action,
      resource,
      requestId: req.headers['x-request-id'],
      userId: (req as any).user?.id,
      userEmail: (req as any).user?.email,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      details: {
        method: req.method,
        url: req.originalUrl || req.url,
        params: req.params,
        query: req.query,
      },
    };
    
    console.log('📋 Audit log:', auditEntry);
    
    // In production, you might want to store audit logs in a separate database
    // or send them to a compliance monitoring service
    
    next();
  };
};

export default requestLogger;