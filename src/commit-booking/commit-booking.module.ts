import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommitBookingService } from './commit-booking.service';
import { CommitBookingController } from './commit-booking.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [HttpModule, CacheModule.register()],
  providers: [CommitBookingService],
  controllers: [CommitBookingController],
})
export class CommitBookingModule {}
