/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

interface AdminPayload {
  id: string | number;
  email: string;
}

export type SafeAdmin = Omit<AdminPayload, 'password'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<SafeAdmin> {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    // Check if admin exists
    if (!admin) {
      // Use same error message to prevent email enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password hash exists
    if (!admin.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const passwordValid = await bcrypt.compare(password, admin.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove sensitive data before returning
    const { password: _, ...result } = admin;
    return result;
  }

  login(admin: SafeAdmin) {
    const payload = {
      sub: admin.id,
      isAdmin: true,
    };

    this.logger.debug(`Creating JWT with payload: ${JSON.stringify(payload)}`);

    return {
      accessToken: this.jwtService.sign(payload, {
        secret: process.env.ADMIN_JWT_SECRET,
        expiresIn: '24h',
      }),
      admin: {
        // Add admin info to response
        id: admin.id,
        email: admin.email,
      },
    };
  }
}
