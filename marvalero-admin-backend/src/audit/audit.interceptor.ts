// audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const adminId = request.user?.adminId;
    const method = request.method;
    const url = request.url;
    const body = this.sanitizeBody(request.body);
    const params = request.params;
    const query = request.query;
    
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          try {
            await this.logAction({
              adminId,
              actionType: `${method} ${url}`,
              metadata: {
                url,
                method,
                statusCode,
                duration,
                params,
                query,
                requestBody: body,
                response: this.sanitizeResponse(data),
              },
            });
          } catch (error) {
            // Don't throw, just log the error
            this.logger.error(`Failed to log audit: ${error.message}`);
          }
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.getStatus ? error.getStatus() : 500;
          
          try {
            await this.logAction({
              adminId,
              actionType: `${method} ${url}`,
              metadata: {
                url,
                method,
                statusCode,
                duration,
                params,
                query,
                requestBody: body,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              },
            });
          } catch (logError) {
            this.logger.error(`Failed to log audit error: ${logError.message}`);
          }
        },
      }),
    );
  }

  private async logAction(data: {
    adminId?: string;  // Make optional
    actionType: string;
    metadata: any;
  }) {
    // if (!data.adminId) {
    //   // Could be a public endpoint 
    //   return;
    // }

    console.log('Logging audit action:', data); // For debugging

    await this.prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        actionType: data.actionType,
        metadata: data.metadata,
      },
    });
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data) return data;
    
    // For large responses, just log summary
    if (Array.isArray(data) && data.length > 10) {
      return { count: data.length, type: 'array' };
    }
    
    // Remove sensitive data from response
    const sanitized = this.sanitizeBody(data);
    
    // Stringify if too large
    const json = JSON.stringify(sanitized);
    return json.length > 1000 ? { truncated: true, length: json.length } : sanitized;
  }
}