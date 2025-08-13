import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { FareQuoteService } from './farequote.service';
import { FareQuoteController } from './farequote.controller';

@Module({
  imports: [
    CacheModule.register(),
    HttpModule,
  ],
  controllers: [FareQuoteController],
  providers: [FareQuoteService],
})
export class FareQuoteModule {}
