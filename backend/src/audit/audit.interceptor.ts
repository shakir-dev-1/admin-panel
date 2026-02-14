import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core'; // Add this import
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUDIT_KEY } from './audit.decorator.js';

// Simplified metadata structure - only store what's needed for audit
interface AuditMetadata extends Record<string, any> {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  query?: Record<string, string | string[]>;
  error?: string;
  stack?: string;
  timestamp: string;
  requestBody?: Record<string, unknown> | null;
  responseSummary?: {
    type: string;
    count?: number;
    truncated?: boolean;
  };
}

interface LogActionData {
  adminId?: string;
  actionType: string;
  targetUserId?: string;
  metadata: AuditMetadata;
}

// Helper to convert AuditMetadata to Prisma.InputJsonValue
function toPrismaJson(metadata: AuditMetadata): Prisma.InputJsonValue {
  return metadata as unknown as Prisma.InputJsonValue;
}

// tap's next/error properties expect (value: T) => void, not Promise<void>.
function voidTap<T>(fn: (value: T) => Promise<void>): (value: T) => void {
  return (value) => void fn(value);
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  // Paths to exclude from audit logging
  private readonly excludedPaths = [
    '/admin/health',
    '/admin/metrics',
    '/admin/ping',
    '/favicon.ico',
  ];

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector, // Inject Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { adminId?: string; id?: string } }>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip excluded paths
    if (this.excludedPaths.includes(request.path)) {
      return next.handle();
    }

    // Get audit action from decorator - properly typed
    const auditAction = this.reflector.get<string>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditAction) {
      return next.handle(); // Skip if no audit metadata
    }

    const adminId = request.user?.adminId || request.user?.id;
    const method = request.method;
    const path = request.path;
    const body = this.sanitizeBody(request.body as Record<string, unknown>);
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string | string[]>;

    // Extract targetUserId from various possible locations
    const targetUserId = this.extractTargetUserId(params, body, path);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: voidTap(async (data: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Only log successful actions (2xx status codes)
          if (statusCode >= 200 && statusCode < 300) {
            try {
              await this.logAction({
                adminId,
                targetUserId,
                actionType: auditAction, // Use the decorated action type
                metadata: {
                  method,
                  path,
                  statusCode,
                  duration,
                  query: Object.keys(query).length > 0 ? query : undefined,
                  requestBody: body,
                  responseSummary: this.getResponseSummary(data),
                  timestamp: new Date().toISOString(),
                },
              });
            } catch (error) {
              const err = error as Error;
              this.logger.error(`Failed to log audit: ${err.message}`);
            }
          }
        }),
        error: voidTap(async (error: unknown) => {
          const duration = Date.now() - startTime;
          const err = error as Error & { getStatus?: () => number };
          const statusCode = err.getStatus ? err.getStatus() : 500;

          // Log failed attempts as well
          try {
            await this.logAction({
              adminId,
              targetUserId,
              actionType: auditAction, // Use the decorated action type
              metadata: {
                method,
                path,
                statusCode,
                duration,
                query: Object.keys(query).length > 0 ? query : undefined,
                requestBody: body,
                error: err.message,
                stack:
                  process.env.NODE_ENV === 'development'
                    ? err.stack
                    : undefined,
                timestamp: new Date().toISOString(),
              },
            });
          } catch (logError) {
            const logErr = logError as Error;
            this.logger.error(`Failed to log audit error: ${logErr.message}`);
          }
        }),
      }),
    );
  }

  private async logAction(data: LogActionData): Promise<void> {
    // Skip if no adminId (unauthenticated requests)
    if (!data.adminId) {
      return;
    }

    await this.prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        actionType: data.actionType,
        targetUserId: data.targetUserId || null,
        metadata: toPrismaJson(data.metadata),
      },
    });

    this.logger.log(`Audit Log: ${data.actionType} by admin ${data.adminId}`);
  }

  /**
   * Extract targetUserId from request params or body
   */
  private extractTargetUserId(
    params: Record<string, string>,
    body: Record<string, unknown> | null | undefined,
    path: string,
  ): string | undefined {
    // Check common parameter names for user IDs
    const possibleIdFields = [
      'userId',
      'id',
      'targetUserId',
      'influencerId',
      'businessUserId',
      'adminId',
    ];

    // First check params (route parameters)
    for (const field of possibleIdFields) {
      if (params[field]) {
        return params[field];
      }
    }

    // Extract from path patterns (e.g., /admin/users/123/email)
    const pathParts = path.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      // Look for UUID pattern
      if (
        pathParts[i] &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          pathParts[i],
        )
      ) {
        return pathParts[i];
      }
    }

    // Then check body
    if (body) {
      for (const field of possibleIdFields) {
        const value = body[field];
        if (typeof value === 'string' && value.length > 0) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Create a summary of the response for metadata
   */
  private getResponseSummary(
    data: unknown,
  ): { type: string; count?: number; truncated?: boolean } | undefined {
    if (data === null || data === undefined) {
      return undefined;
    }

    if (Array.isArray(data)) {
      return {
        type: 'array',
        count: data.length,
      };
    }

    if (typeof data === 'object') {
      return {
        type: 'object',
      };
    }

    return {
      type: typeof data,
    };
  }

  private sanitizeBody(
    body: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null | undefined {
    if (!body) return body;

    const sanitized: Record<string, unknown> = { ...body };

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'creditCard',
      'ssn',
      'accessToken',
      'refreshToken',
      'authorization',
      'apiKey',
      'twoFactorSecret',
      'cnic',
      'cnicIv',
      'msisdn',
      'msisdnIv',
      'accountNumber',
      'accountNumberIv',
    ] as const;

    for (const field of sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Remove the actual values but keep the structure
    const json = JSON.stringify(sanitized);
    if (json.length > 2000) {
      return {
        truncated: true,
        fields: Object.keys(sanitized),
      };
    }

    return sanitized;
  }
}
