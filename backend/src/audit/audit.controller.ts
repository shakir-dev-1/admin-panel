// src/admin/audit/audit.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditService, AuditLogResponse } from './audit.service.js';

@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('search') search?: string,
    @Query('actionType') actionType?: string,
    @Query('adminId') adminId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogResponse> {
    return this.auditService.getAuditLogs({
      page,
      limit,
      search,
      actionType,
      adminId,
      targetUserId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('summary')
  async getAuditSummary() {
    return this.auditService.getAuditSummary();
  }
}