
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FareQuoteService } from './farequote.service';
import { FareQuoteController } from './farequote.controller';

@Module({
  imports: [HttpModule],
  controllers: [FareQuoteController],
  providers: [FareQuoteService],
})
export class FareQuoteModule {}