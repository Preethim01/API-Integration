import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { SearchFlightService } from './search-flight.service';
import { SearchFlightController } from './search-flight.controller';

@Module({
  imports: [
    HttpModule,
    CacheModule.register(), // Ensure this is configured in your main app.module as well
  ],
  controllers: [SearchFlightController],
  providers: [SearchFlightService],
  exports: [SearchFlightService],
})
export class SearchFlightModule {}