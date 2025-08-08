// src/api/api.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';

@Module({
  imports: [HttpModule],         // ✅ Import HttpModule here
  controllers: [ApiController],
  providers: [ApiService],
  exports: [ApiService],         // (Optional) export if needed elsewhere
})
export class ApiModule {}
