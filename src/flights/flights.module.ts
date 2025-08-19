import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { FlightsService } from './search-flight.service';
import { FlightsController } from './flights.controller';
import {FareQuoteService} from './fare-quote.service';
import { BookingService } from './booking.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 3600 * 1000, // 1 hour cache TTL in milliseconds
    }),
  ],
  providers: [FlightsService,FareQuoteService,BookingService],
  controllers: [FlightsController],
})
export class FlightsModule {}