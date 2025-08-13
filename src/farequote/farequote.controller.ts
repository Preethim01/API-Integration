// src/farequote/farequote.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { FareQuoteService } from './farequote.service';

@Controller('fare-quote')
export class FareQuoteController {
  constructor(private readonly fareQuoteService: FareQuoteService) {}

  @Post()
  async getFareQuote(@Body() body: { token: string }) {
    return await this.fareQuoteService.FetchFareQuoteFromApi(body.token);
  }
}