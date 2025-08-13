import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class FareQuoteService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getFareQuoteByToken(token: string) {
    const cleanToken = token.trim();

    const cachedFlight = await this.cacheManager.get<any>(cleanToken);

    if (!cachedFlight) {
      throw new NotFoundException('Fare details not found for this token');
    }

    return {
      Price: cachedFlight.Price,
      tmxToken: cachedFlight.tmxToken,
      Attr: cachedFlight.Attr,
      FlightDetails: cachedFlight.FlightDetails,
    };
  }
}
