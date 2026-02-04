/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
//admin.controller.ts
import {
  Controller,
  UseGuards,
  Get,
  // Post,
  // Body,
  Param,
  NotFoundException,
  Req,
  // Query,
  // Patch,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';
// import type { SortOrder } from './admin.service.js';
import { Admin as AdminModel } from '../generated/prisma/client.js';
// import { AdminUserSearchDto } from './dto/admin-user-search.dto.js';
import {} from // ChangeEmailDto,
// ChangePhoneDto,
// ChangeStatusDto,
'./dto/admin-user-actions.dto.js';

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

  @Get('admins/:id')
  async getAdminById(@Param('id') id: string): Promise<AdminModel> {
    const admin = await this.adminService.admin({ id });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }
}
