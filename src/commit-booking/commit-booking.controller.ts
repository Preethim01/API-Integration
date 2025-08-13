import { Controller, Post, Body,Param } from '@nestjs/common';
import { CommitBookingService } from './commit-booking.service';

@Controller('commit-booking')
export class CommitBookingController {
  constructor(private readonly commitBookingService: CommitBookingService) {}

@Post(':redisToken')
async commitByRedis(
  @Param('redisToken') redisToken: string,
  @Body() passengers: any
) {
  return this.commitBookingService.commitBookingByRedisToken(redisToken, passengers);
}

}
