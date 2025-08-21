import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightDto } from './dto/search-flight.dto'; // Import the DTO

@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  searchFlights(@Body() searchFlightDto: SearchFlightDto) {
    return this.flightsService.searchFlights(searchFlightDto);
  }
}