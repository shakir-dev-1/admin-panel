import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminJwtPayload } from '../interfaces/admin-jwt-payload.js';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private readonly logger = new Logger(AdminJwtStrategy.name);

  constructor() {
    const secret = process.env.ADMIN_JWT_SECRET;

    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false, // Make sure this is false
    });
    
    this.logger.log('AdminJwtStrategy initialized');
  }

  async validate(payload: any) {  // Use `any` first for debugging
    this.logger.debug(`JWT payload received: ${JSON.stringify(payload)}`);
    
    // Debug: Log the actual payload structure
    // console.log('Payload type:', typeof payload.isAdmin);
    // console.log('Payload isAdmin value:', payload.isAdmin);
    // console.log('Payload isAdmin === true:', payload.isAdmin === true);
    // console.log('Payload isAdmin === false:', payload.isAdmin === false);
    
    // Check if isAdmin exists and is true
    if (payload.isAdmin !== true) {
      this.logger.warn(`Unauthorized: isAdmin is not true. Value: ${payload.isAdmin}`);
      throw new UnauthorizedException('Admin access required');
    }

    if (!payload.sub) {
      this.logger.warn('Unauthorized: No sub (adminId) in payload');
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.debug(`Admin authenticated: ${payload.sub}`);
    
    return {
      adminId: payload.sub,
      isAdmin: payload.isAdmin,
    };
  }
}