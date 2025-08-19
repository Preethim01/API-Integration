import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {SearchFlightModule} from './Flight/search-flight.module'
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios'; 
import { FareQuoteModule } from './farequote/farequote.module';
import { CommitBookingService } from './commit-booking/commit-booking.service';
import { CommitBookingModule } from './commit-booking/commit-booking.module';


@Module({
  imports: [
  SearchFlightModule,
    HttpModule,         
    CacheModule.register(), 
    FareQuoteModule, CommitBookingModule
  ],
  controllers: [AppController],
  providers: [AppService, CommitBookingService ],
})
export class AppModule {}
