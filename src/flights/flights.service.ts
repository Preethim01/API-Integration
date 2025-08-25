import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  formatAsJourneyList,
  formatFareQuote,
  createAccessToken,
  decodeAccessToken,
} from './flight-formatter';

@Injectable()
export class FlightsService {
  private baseUrl =
    'http://test.services.travelomatix.com/webservices/index.php/flight/service/';
  private headers = {
    'Content-Type': 'application/json',
    'x-Username': 'test245274',
    'x-Password': 'test@245',
    'x-DomainKey': 'TMX3372451534825527',
    'x-System': 'test',
  };

  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async callApi(endpoint: string, payload: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await firstValueFrom(
        this.http.post(url, payload, { headers: this.headers }),
      );

      if (response?.data?.Status !== 1) {
        throw new NotFoundException(
          `API Error: ${response?.data?.Message ?? 'Request failed.'}`,
        );
      }

      return response.data;
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error.message);
      throw new NotFoundException('Error communicating with flight API.');
    }
  }

  /** 🔍 Search Flights */
  public async searchFlights(payload: any) {
    const apiResponse = await this.callApi('Search', payload);
    const formatted = formatAsJourneyList(apiResponse);

    // cache each journey with its ResultToken
    formatted.Search.FlightDataList.JourneyList.forEach(journey =>
      journey.forEach(async flight => {
        await this.cacheManager.set(flight.ResultToken, flight, {
          ttl: 3600,
        } as any);
      }),
    );

    return formatted;
  }

  /** 💰 Fetch FareQuote */
  public async getFareQuote(payload: { ResultToken: string }) {
    const tokenString = payload.ResultToken;
    const decodedToken = decodeAccessToken(tokenString);

    const apiRes = await this.callApi('UpdateFareQuote', {
      ResultToken: decodedToken,
    });

    const formatted = formatFareQuote(apiRes);

    return formatted;
  }
}
