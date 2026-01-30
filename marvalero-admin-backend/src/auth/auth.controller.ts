import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Strict: Only 3 login attempts per minute per IP
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const admin = await this.authService.validateAdmin(dto.email, dto.password);
    return this.authService.login(admin);
  }

  @Get('test-log')
  testLog() {
    console.log('This is a test log');
    return 'OK';
  }
}
