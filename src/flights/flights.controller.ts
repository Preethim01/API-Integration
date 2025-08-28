import { Controller, Param } from '@nestjs/common';
import { Post, Body, Get } from '@nestjs/common';
import { FlightSearchDto } from './dtos/flight-search.dto'
import { FlightsApiService } from './flights.service';
import { BookingDto } from './dtos/booking.dto';


@Controller('flights')
export class FlightsApiController {

  constructor(
    private readonly flightApi: FlightsApiService
  ) { }


  @Post('search')
  async search(@Body() body: FlightSearchDto) {
    return this.flightApi.searchFlights(body)
  }


  @Post('fareQuote')
  async FareQuote(@Body() body: any) {
    return this.flightApi.FetchFareQuote(body)
  }

  @Post('commitBooking')
  async CommitBooking(@Body() body: BookingDto) {
    return this.flightApi.CommitBooking(body)
  }


  @Post('AppReference')
  async AppReference() {
    return this.flightApi.GenerateAppRefernce();
  }



  @Post('HoldTicket')
  async HoldTicket(@Body() body: BookingDto) {
    return this.flightApi.HoldTicket(body);
  }

}