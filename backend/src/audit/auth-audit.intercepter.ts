// src/audit/auth-audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

// Type for login request body
interface LoginRequestBody {
  email?: string;
  password?: string;
}

// Type for login response data
interface LoginResponseData {
  accessToken?: string;
  admin?: {
    id: string;
    email: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

// Type guard for LoginResponseData - Fixed without using any
function isLoginResponseData(data: unknown): data is LoginResponseData {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  // Helper function to check if a value is a valid user/admin object
  const hasValidIdAndEmail = (
    value: unknown,
  ): value is { id: string; email: string } => {
    if (!value || typeof value !== 'object' || value === null) return false;

    const obj = value as Record<string, unknown>;

    // Check if id exists and is a string
    const hasValidId = 'id' in obj && typeof obj.id === 'string';

    // Check if email exists and is a string (optional for validation)
    const hasValidEmail = 'email' in obj && typeof obj.email === 'string';

    return hasValidId && hasValidEmail;
  };

  // Check admin property
  const hasValidAdmin = 'admin' in obj && hasValidIdAndEmail(obj.admin);

  // Check user property
  const hasValidUser = 'user' in obj && hasValidIdAndEmail(obj.user);

  return hasValidAdmin || hasValidUser;
}

// Type for audit metadata
interface AuthAuditMetadata {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  error?: string;
  stack?: string;
  attemptedEmail?: string;
}

// Helper function to safely convert to Prisma.JsonValue
function toPrismaJson(metadata: AuthAuditMetadata): Prisma.InputJsonValue {
  return metadata as unknown as Prisma.InputJsonValue;
}

// Helper to handle promise in tap
function voidTap<T>(fn: (value: T) => Promise<void>): (value: T) => void {
  return (value) => {
    void fn(value);
  };
}

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthAuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Extract email from request body with type safety
    const body = request.body as LoginRequestBody;
    const email = body.email;

    const startTime = Date.now();
    const ip =
      request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    return next.handle().pipe(
      tap({
        next: voidTap(async (data: unknown) => {
          const duration = Date.now() - startTime;

          let adminId: string | null = null;
          let responseEmail: string | undefined;

          if (isLoginResponseData(data)) {
            // Now TypeScript knows data is LoginResponseData
            if (data.admin) {
              adminId = data.admin.id;
              responseEmail = data.admin.email;
            } else if (data.user) {
              adminId = data.user.id;
              responseEmail = data.user.email;
            }
          }

          const metadata: AuthAuditMetadata = {
            method: request.method,
            path: request.path,
            statusCode: response.statusCode,
            duration,
            timestamp: new Date().toISOString(),
            success: true,
            ip,
            userAgent,
            attemptedEmail: email,
          };

          await this.prisma.adminAuditLog.create({
            data: {
              adminId, // Will be null for failed, actual ID for success
              actionType: 'ADMIN_LOGIN',
              targetUserId: responseEmail || email, // Use email from response if available, otherwise from request
              metadata: toPrismaJson(metadata),
            },
          });

          this.logger.log(`Successful login for ${responseEmail || email}`);
        }),
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;

        // Determine status code with proper type checking
        let statusCode = 500;

        if (error instanceof UnauthorizedException) {
          statusCode = 401;
        } else if (error instanceof HttpException) {
          statusCode = error.getStatus();
        }
        // No need for else if (error instanceof Error) as it's covered by default

        // Safely extract error message
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        // Safely extract stack trace
        const stackTrace =
          error instanceof Error && process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined;

        const metadata: AuthAuditMetadata = {
          method: request.method,
          path: request.path,
          statusCode,
          duration,
          timestamp: new Date().toISOString(),
          success: false,
          ip,
          userAgent,
          error: errorMessage,
          stack: stackTrace,
          attemptedEmail: email,
        };

        // Log the error asynchronously (don't await to avoid blocking)
        this.prisma.adminAuditLog
          .create({
            data: {
              adminId: null, // No admin ID for failed logins
              actionType: 'ADMIN_LOGIN_FAILED',
              targetUserId: email, // Store the email that failed
              metadata: toPrismaJson(metadata),
            },
          })
          .catch((logError: Error) => {
            this.logger.error(`Failed to log audit error: ${logError.message}`);
          });

        this.logger.warn(
          `Failed login attempt for ${email || 'unknown email'}: ${errorMessage}`,
        );

        // Re-throw the error with proper type
        if (error instanceof Error) {
          return throwError(() => error);
        }

        // If it's not an Error instance, wrap it
        return throwError(() => new Error(String(error)));
      }),
    );
  }
}
