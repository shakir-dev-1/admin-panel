import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js'; // Import the dependency

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      // FIX: Even if the controller is simple, we should provide a mock 
      // or the actual service to satisfy the dependency graph.
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: () => ({ message: 'Welcome to the API' }), // Mock implementation
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('should return welcome message', () => {
    expect(appController.getRoot()).toEqual({ message: 'Welcome to the API' });
  });
});