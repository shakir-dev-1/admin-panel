// auth/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('admin-jwt') {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.debug('AdminGuard invoked');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug(`AdminGuard handleRequest - user: ${JSON.stringify(user)}, error: ${err}, info: ${info}`);
    
    if (err || !user) {
      this.logger.error(`AdminGuard blocked request: ${err?.message || 'No user'}`);
      throw err || new UnauthorizedException();
    }
    
    this.logger.debug(`AdminGuard passed for admin: ${user.adminId}`);
    return user;
  }
}