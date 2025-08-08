// src/api/api.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';

@Module({
  imports: [HttpModule],         
  controllers: [ApiController],
  providers: [ApiService],
  exports: [ApiService],         
})
export class ApiModule {}
