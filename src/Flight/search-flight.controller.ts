import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SearchFlightService } from './search-flight.service';

@Controller('search-flight')
export class SearchFlightController {
  constructor(private readonly searchFlightService: SearchFlightService) {}

  @Post('search')
  async search(@Body() payload: any) {
    return this.searchFlightService.searchFlights(payload);
  }

  @Get('flight/:redisToken')
  async getFlightByToken(@Param('redisToken') redisToken: string) {
    return this.searchFlightService.getByToken(redisToken);
  }
}
