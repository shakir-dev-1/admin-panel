//admin.controller.ts
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';
import type { UserSortField, SortOrder } from './admin.service.js';
import { Admin as AdminModel } from '../generated/prisma/client.js';
import { AdminUserSearchDto } from './dto/admin-user-search.dto.js';
import {
  ChangeEmailDto,
  ChangePhoneDto,
  ChangeStatusDto,
} from './dto/admin-user-actions.dto.js';

@UseGuards(AdminGuard) // Apply guard globally to this controller
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('ping')
  ping(@Req() req: any) {
    return { message: 'Admin authenticated', adminId: req.user.adminId };
  }

  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('users/recent')
  async getRecentUsers(@Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.adminService.getRecentUsers(limitNum);
  }

  @Get('users/search')
  searchUsers(@Query() query: AdminUserSearchDto) {
    return this.adminService.searchUsers(query);
  }

  @Get('users/all')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users')
  async getUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('type') userType: string,
    @Query('sortBy') sortBy: UserSortField,
    @Query('sortOrder') sortOrder: SortOrder,
  ) {
    const parsedPage = parseInt(page, 10);
    return this.adminService.getUsers({
      page: isNaN(parsedPage) ? 1 : parsedPage,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      userType,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('users/:userId/reset-password')
  resetPassword(@Param('userId') userId: string, @Req() req) {
    return this.adminService.forcePasswordReset(userId, req.user.adminId);
  }

  @Patch('users/:userId/email')
  changeEmail(
    @Param('userId') userId: string,
    @Body() dto: ChangeEmailDto,
    @Req() req,
  ) {
    return this.adminService.changeEmail(userId, dto.email, req.user.adminId);
  }

  @Patch('users/:userId/phone')
  changePhone(
    @Param('userId') userId: string,
    @Body() dto: ChangePhoneDto,
    @Req() req,
  ) {
    return this.adminService.changePhone(userId, dto.phone, req.user.adminId);
  }

  @Patch('users/:userId/status')
  changeStatus(
    @Param('userId') userId: string,
    @Body() dto: ChangeStatusDto,
    @Req() req,
  ) {
    return this.adminService.changeStatus(userId, dto.status, req.user.adminId);
  }

  @Get(':id')
  async getAdminById(@Param('id') id: string): Promise<AdminModel> {
    const admin = await this.adminService.admin({ id });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }
}
