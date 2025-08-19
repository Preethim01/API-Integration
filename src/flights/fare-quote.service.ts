import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

@Injectable()
export class FareQuoteService {
  private readonly travelomatixHeaders = {
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

  private formatFareQuote(raw: any, customToken: string) {
    const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
    const price = journey?.Price ?? null;

    return {
      Status: raw?.Status ?? 0,
      Message: raw?.Message ?? '',
      UpdateFareQuote: {
        FareQuoteDetails: {
          JourneyList: {
            FlightDetails: {
              Details: (journey?.FlightDetails?.Details ?? []).map((flightArray: any[]) =>
                flightArray.map((flight: any) => ({
                  Origin: {
                    AirportCode: flight?.Origin?.AirportCode ?? null,
                    CityName: flight?.Origin?.CityName ?? null,
                    AirportName: flight?.Origin?.AirportName ?? null,
                    DateTime: flight?.Origin?.DateTime ?? null,
                    Terminal: flight?.Origin?.Terminal ?? null,
                    FDTV: flight?.Origin?.FDTV ?? null,
                  },
                  Destination: {
                    AirportCode: flight?.Destination?.AirportCode ?? null,
                    CityName: flight?.Destination?.CityName ?? null,
                    AirportName: flight?.Destination?.AirportName ?? null,
                    DateTime: flight?.Destination?.DateTime ?? null,
                    Terminal: flight?.Destination?.Terminal ?? null,
                    FDTV: flight?.Destination?.FDTV ?? null,
                  },
                  OperatorCode: flight?.OperatorCode ?? null,
                  DisplayOperatorCode: flight?.DisplayOperatorCode ?? null,
                  ValidatingAirline: flight?.ValidatingAirline ?? null,
                  OperatorName: flight?.OperatorName ?? null,
                  FlightNumber: flight?.FlightNumber ?? null,
                  CabinClass: flight?.CabinClass ?? null,
                  Operatedbyairline: flight?.Operatedbyairline ?? null,
                  Operatedbyairlinename: flight?.Operatedbyairlinename ?? null,
                  Duration: flight?.Duration ?? null,
                  Attr: {
                    Baggage: flight?.Attr?.Baggage ?? null,
                    CabinBaggage: flight?.Attr?.CabinBaggage ?? null,
                  },
                  stop_over: flight?.stop_over ?? null,
                })),
              ),
            },
            Price: {
              Currency: price?.Currency ?? null,
              TotalDisplayFare: price?.TotalDisplayFare ?? null,
              PriceBreakup: {
                BasicFare: price?.PriceBreakup?.BasicFare ?? null,
                Tax: price?.PriceBreakup?.Tax ?? null,
                AgentCommission: price?.PriceBreakup?.AgentCommission ?? null,
                AgentTdsOnCommision: price?.PriceBreakup?.AgentTdsOnCommision ?? null,
              },
              PassengerBreakup: price?.PassengerBreakup ?? {},
            },
            ResultToken: journey?.ResultToken ?? null,
            Attr: {
              IsRefundable: journey?.Attr?.IsRefundable ?? null,
              AirlineRemark: journey?.Attr?.AirlineRemark ?? null,
              FareType: journey?.Attr?.FareType ?? null,
              IsLCC: journey?.Attr?.IsLCC ?? null,
              ExtraBaggage: journey?.Attr?.ExtraBaggage ?? null,
              conditions: journey?.Attr?.conditions ?? null,
            },
            HoldTicket: journey?.HoldTicket ?? false,
          },
        },
      },
      customToken,
    };
  }

  async fetchFareQuote(apiResultToken: string) {
    const cacheKey = apiResultToken.trim();
    const cachedResponse = await this.cacheManager.get(cacheKey);

    if (cachedResponse) {
      console.log('FareQuote cache hit');
      return cachedResponse;
    }

    console.log('FareQuote cache miss, calling API');
    try {
      const apiRes = await firstValueFrom(
        this.http.post(
          'http://test.services.travelomatix.com/webservices/index.php/flight/service/UpdateFareQuote',
          { ResultToken: apiResultToken },
          { headers: this.travelomatixHeaders },
        ),
      );

      const rawData = apiRes?.data;
      if (!rawData) {
        throw new InternalServerErrorException('API response is empty or invalid.');
      }

      const customToken = uuidv4();
      const formatted = this.formatFareQuote(rawData, customToken);

      await this.cacheManager.set(customToken, formatted, { ttl: 3600 } as any);
      
      return formatted;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Axios error fetching fare quote:', error.response?.data?.Message || error.message);
        throw new InternalServerErrorException(error.response?.data?.Message || 'Failed to fetch fare quote.');
      } else {
        console.error('General error fetching fare quote:', error.message);
        throw new InternalServerErrorException('Failed to fetch fare quote.');
      }
    }
  }

  async getFareQuoteByToken(token: string) {
    const cleanToken = token.trim();
    const result = await this.cacheManager.get(cleanToken);
    if (!result) {
      throw new NotFoundException('Results not found for this token');
    }
    return result;
  }
}