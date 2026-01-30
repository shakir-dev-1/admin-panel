//app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { message: 'Welcome to the API' };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
