import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FlightsApiModule } from './flights/flights.module';


// Redis store import — note this is a CommonJS module
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      store: redisStore as any,
      host: 'localhost',
      port: 6379,
      ttl: 3600,
      isGlobal:true
    }),
    HttpModule,
    FlightsApiModule
    
  ],
  
})
export class AppModule {}
