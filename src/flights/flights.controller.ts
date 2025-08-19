import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { FlightsService } from './search-flight.service';
import { FareQuoteService } from './fare-quote.service';
import { BookingService } from './booking.service';
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService,

    private readonly fareQuoteService: FareQuoteService,
    private readonly bookingService: BookingService
  ) {}

  @Post('search')
  async search(@Body() payload: any) {
    return this.flightsService.searchFlights(payload);
  }

  @Get('by-token/:token')
  async getByToken(@Param('token') token: string) {
    return this.flightsService.getByToken(token);
  }

  @Post('fare-quote')
  async fareQuote(@Body() body: { resultToken: string }) {
    if (!body.resultToken) {
      throw new NotFoundException('Result token is required');
    }
    return this.fareQuoteService.fetchFareQuote(body.resultToken);
  }

  @Post('commit-booking')
  async commitBooking(@Body() payload: any) {
    return this.bookingService.commitBooking(payload);
  }
 
}