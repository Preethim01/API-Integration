import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {FlightsModule} from './flights/flights.module'
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios'; 
@Module({
  imports: [
  FlightsModule,
    HttpModule,         
    CacheModule.register(), 
  ],
  controllers: [AppController],
  providers: [AppService ],
})
export class AppModule {}
