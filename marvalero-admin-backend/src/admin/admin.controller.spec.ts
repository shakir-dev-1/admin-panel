import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';

import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

describe('AdminController (Unit)', () => {
  let controller: AdminController;
  // Use 'jest.Mocked' or 'any' if the service is very complex,
  // but explicit typing is best for 2026 standards.
  let adminService: Partial<AdminService>;

  beforeEach(async () => {
    adminService = {
      // 1️⃣ Explicitly type the mock: jest.fn<ReturnType, ParameterTypes>()
      admin: jest
        .fn<AdminService['admin']>()
        .mockImplementation(async ({ id }) => ({
          id: id as string,
          email: 'test@example.com',
          password: 'hash',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),

      // 2️⃣ Alternatively, use 'as any' for the mock implementation if you want to skip full object detail
      createAdmin: jest
        .fn<AdminService['createAdmin']>()
        .mockImplementation(async (data: any) => ({
          id: '1',
          ...data,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('ping should return admin info', () => {
    const req = { user: { adminId: '123' } };
    const result = controller.ping(req as any);
    expect(result).toEqual({ message: 'Admin authenticated', adminId: '123' });
  });

  it('getAdminById should return admin', async () => {
    const result = await controller.getAdminById('1');

    // ✅ Use objectContaining to match only the core fields
    expect(result).toEqual(
      expect.objectContaining({
        id: '1',
        email: 'test@example.com',
        password: 'hash',
      }),
    );
  });

  // it('signupAdmin should create admin', async () => {
  //   const data = { email: 'new@example.com', password: 'pass' };
  //   const result = await controller.signupAdmin(data);
  //   expect(result).toEqual({ id: '1', ...data });
  // });
});

// ✅ Notes:

// AdminService is fully mocked.

// AdminGuard is overridden to always allow access.

// Tests controller methods directly without starting the server
