import { Module, Global } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuditInterceptor } from './audit.interceptor.js';
// import { PrismaService } from "../prisma/prisma.service.js";
import { PrismaModule } from '../prisma/prisma.module.js';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
