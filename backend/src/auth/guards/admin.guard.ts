import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core'; // 1. Import Reflector

interface AdminUser {
  adminId: string;
  email: string;
}

@Injectable()
export class AdminGuard extends AuthGuard('admin-jwt') {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private reflector: Reflector) {
    // 2. Inject Reflector
    super();
  }

  canActivate(context: ExecutionContext) {
    // 3. Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  // 4. Fix ESLint by typing the parameters
  handleRequest<TUser = AdminUser>(
    err: Error | null,
    user: TUser | null,
  ): TUser {
    if (err || !user) {
      this.logger.error(
        `AdminGuard blocked request: ${err instanceof Error ? err.message : 'No user'}`,
      );
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
