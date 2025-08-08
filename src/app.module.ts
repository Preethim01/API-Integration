import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';


import { ApiController } from './api/api.controller';
import { ApiService } from './api/api.service';
import { ApiModule } from './api/api.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ApiModule,HttpModule],
  controllers: [AppController, ApiController],
  providers: [AppService, ApiService],
})
export class AppModule {}
