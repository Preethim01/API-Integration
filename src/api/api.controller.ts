import { Controller, Post, Body } from '@nestjs/common';
import { ApiService } from './api.service';
 
 
@Controller('flight')
export class ApiController {
  constructor(private readonly flightService: ApiService) {}
 
  @Post('search')
async Search(@Body() body: any) {
  return this.flightService.searchFlights(body);
}
 
@Post('fare-Rules')
async fetchFareRules(@Body() body: any) {
  return this.flightService.fetchFareRules(body);
}
 
@Post('fare-Quote')
async fetchFareQuote(@Body() body:any){
    return this.flightService.FetchFareQuote(body)
}

@Post('commit-booking')
async commitBooking(@Body() body: any) {
  return this.flightService.commitBooking(body);
}

}
 

 
 
 
 
 
