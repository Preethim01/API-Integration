import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { FareQuoteService } from './farequote.service';

@Controller('fare-quote')
export class FareQuoteController {
  constructor(private readonly fareQuoteService: FareQuoteService) {}

  
  @Post()
async getFareQuote(@Body() body: { token: string }) {
  console.log("Controller called, token:", body.token);
  return await this.fareQuoteService.FetchFareQuoteFromApi(body.token);
}


  
  @Get(':redisToken')
  async getFareQuoteByRedisToken(@Param('redisToken') redisToken: string) {
    return await this.fareQuoteService.GetByRedisToken(redisToken);
  }


}
