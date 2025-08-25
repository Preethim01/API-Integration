import { Controller, Post, Body, UsePipes, ValidationPipe ,Get,Query} from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightDto } from './dto/search-flight.dto'; // Import the DTO
import {GetFareQuoteDto} from './dto/fare-quote.dto'
import {CommitBookingDto} from './dto/commit-booking.dto'
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
  return this.flightsService.FetchFareQuote({ ResultToken: body.ResultToken });
}
  @Post('generate-app-reference')
  public generateAppReference() {
    const appRef = this.flightsService.GenerateAppRefernce();
    return { AppReference: appRef };
  }

  /** 📑 Commit Booking */
  @Post('commit-booking')
  public async commitBooking(@Body() payload: CommitBookingDto) {
    const bookingResult = await this.flightsService.CommitBooking(payload);
    return bookingResult;
  }

  /** 🛑 Hold Ticket */
  @Post('hold-ticket')
  public async holdTicket(@Body() payload: CommitBookingDto) {
    const holdResult = await this.flightsService.HoldTicket(payload);
    return holdResult;
  }
}

