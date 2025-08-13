// src/commit-booking/commit-booking.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { CommitBookingService } from './commit-booking.service';

@Controller('commit-booking')
export class CommitBookingController {
  constructor(private readonly commitBookingService: CommitBookingService) {}

  @Post()
  async commitBooking(@Body() payload: any) {
    return this.commitBookingService.commitBooking(payload);
  }
}