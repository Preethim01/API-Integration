import { Controller, Post, Body, UsePipes, ValidationPipe ,Get,Query} from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightDto } from './dto/search-flight.dto'; // Import the DTO
import {GetFareQuoteDto} from './dto/fare-quote.dto'
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  searchFlights(@Body() searchFlightDto: SearchFlightDto) {
    return this.flightsService.searchFlights(searchFlightDto);
  }
@Post('farequote')
@UsePipes(new ValidationPipe())
async getFareQuote(@Body() body: GetFareQuoteDto) {
  return this.flightsService.getFareQuote(body.token);
}
}