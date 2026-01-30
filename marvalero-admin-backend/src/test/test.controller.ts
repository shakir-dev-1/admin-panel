import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get('ping')
  ping() {
    console.log('Ping received!');
    return { message: 'pong' };
  }

  @Get('hello')
  hello() {
    return 'Hello, NestJS is working!';
  }
}
