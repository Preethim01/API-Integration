// src/commit-booking/commit-booking.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommitBookingService } from './commit-booking.service';
import { CommitBookingController } from './commit-booking.controller';

@Module({
  imports: [HttpModule],
  providers: [CommitBookingService],
  controllers: [CommitBookingController],
})
export class CommitBookingModule {}