// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Patch,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { UserSortField, SortOrder } from './users.service.js';
import { Audit } from '../../audit/audit.decorator.js';

// DTOs for request validation
class ChangeEmailDto {
  email: string;
}

class ChangePhoneDto {
  phoneNumber: string;
}

class ChangeStatusDto {
  isBanned: boolean;
}

@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get paginated users with filters and sorting
   */
  @Get()
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'BANNED',
    @Query('sortBy') sortBy?: UserSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
  ) {
    return this.usersService.getUsers({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Get all users (non-paginated, for dropdowns or exports)
   */
  @Get('all')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  /**
   * Get recent users for dashboard
   */
  @Get('recent')
  async getRecentUsers(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getRecentUsers(limit);
  }

  /**
   * Get single user by ID
   */
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.getUserById(userId);
  }

  /**
   * Force password reset for a user
   */
  @Post(':userId/reset-password')
  @Audit('PASSWORD_RESET')
  async resetPassword(@Param('userId') userId: string) {
    return this.usersService.forcePasswordReset(userId);
  }

  /**
   * Change user's email
   */
  @Patch(':userId/email')
  @Audit('EMAIL_CHANGE')
  async changeEmail(
    @Param('userId') userId: string,
    @Body() dto: ChangeEmailDto,
  ) {
    return this.usersService.changeEmail(userId, dto.email);
  }

  /**
   * Change user's phone number
   */
  @Patch(':userId/phone')
  @Audit('PHONE_CHANGE')
  async changePhone(
    @Param('userId') userId: string,
    @Body() dto: ChangePhoneDto,
  ) {
    return this.usersService.changePhone(userId, dto.phoneNumber);
  }

  /**
   * Ban/Unban user
   */
  @Patch(':userId/status')
  @Audit('STATUS_CHANGE')
  async changeStatus(
    @Param('userId') userId: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.usersService.changeStatus(userId, dto.isBanned);
  }

  /**
   * Search users with advanced filters (optional - if you want a dedicated search endpoint)
   */
  @Get('search/advanced')
  async searchUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'BANNED',
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('username') username?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: UserSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
  ) {
    // You could extend the service method to handle more advanced filters
    // For now, using the existing getUsers with search
    return this.usersService.getUsers({
      page,
      limit,
      search: search || email || phone || username,
      status,
      sortBy,
      sortOrder,
    });
  }
}
